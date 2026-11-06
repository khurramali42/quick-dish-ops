"""Functional browser test for POS -> receipt -> print CSS and kitchen persistence."""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3000"
OUT = Path("/tmp/receipt-tests")
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as browser_api:
    browser = browser_api.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.add_init_script("window.__printCalls = 0; window.print = () => { window.__printCalls++ };")
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    response = page.goto(BASE + "/pos", wait_until="networkidle")
    assert response and response.status == 200
    page.locator("button.group").first.click()
    page.get_by_role("button", name=re.compile(r"Charge")).click()
    page.get_by_role("button", name="Complete sale").click()
    page.get_by_role("button", name="Print receipt").wait_for(timeout=10000)
    paper = page.locator("#receipt-print-root")
    assert paper.count() == 1, "Dedicated receipt print root not mounted"
    assert paper.locator("table tbody tr").count() > 0
    assert paper.locator("article").inner_text().find("TOTAL") >= 0
    assert paper.get_attribute("data-paper") in ("58mm", "80mm", "A4")
    page.get_by_role("button", name="Print receipt").click()
    assert page.evaluate("window.__printCalls") == 1, "Print button did not call native window.print()"
    page.emulate_media(media="print")
    assert paper.evaluate("(node) => getComputedStyle(node).display") == "block", "Print paper is hidden under print media"
    assert page.locator("#root").evaluate("(node) => getComputedStyle(node).display") == "none", "App chrome still printed"
    page.screenshot(path=str(OUT / "receipt-print-preview.png"), full_page=True)
    page.emulate_media(media="screen")
    page.get_by_role("button", name="Close receipt").click()
    assert paper.count() == 0
    page.goto(BASE + "/kitchen", wait_until="networkidle")
    assert page.get_by_role("button", name="Start preparing").count() >= 1
    page.get_by_role("button", name="Start preparing").first.click()
    page.reload(wait_until="networkidle")
    assert page.get_by_role("button", name="Mark ready").count() >= 1, "Kitchen state lost on refresh"
    page.get_by_role("button", name="Mark ready").first.click()
    page.reload(wait_until="networkidle")
    assert page.get_by_role("button", name="Mark served").count() >= 1
    page.get_by_role("button", name="Mark served").first.click()
    assert "0 active tickets" in page.locator("body").inner_text()
    assert not errors, errors
    print("PASS print action, isolated print-only layout, receipt lifecycle, kitchen persistence and served handoff")
    browser.close()
