"""Run real Chromium viewport checks against the production build."""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3000"
OUT = Path("/tmp/pos-ui-screens")
OUT.mkdir(parents=True, exist_ok=True)

def test_pos(browser, width, height, mobile=False):
    page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    response = page.goto(BASE + "/pos", wait_until="networkidle", timeout=30000)
    assert response and response.status == 200, f"/pos returned {response.status if response else None}"
    cards = page.locator("button.group")
    cards.first.wait_for(timeout=15000)
    assert cards.count() >= 14, f"Expected menu products; found {cards.count()}"
    for i in range(14):
        cards.nth(i).click(timeout=10000)
    if mobile:
        page.get_by_role("button", name=re.compile(r"^Order \(")).click()
        page.get_by_role("button", name="Open navigation").click()
        page.get_by_role("button", name="Close navigation").last.click()
    line_list = page.get_by_label("Order line items")
    charge = page.get_by_role("button", name=re.compile("Charge"))
    assert charge.is_visible(), f"Charge action hidden at {width}x{height}"
    before = charge.bounding_box()
    assert before, "Charge action has no viewport rectangle"
    assert before["y"] >= 0 and before["y"] + before["height"] <= height + 1, (width, height, before)
    measurements = line_list.evaluate("""node => ({height: node.clientHeight, scrollHeight: node.scrollHeight, scrollTop: node.scrollTop})""")
    assert measurements["scrollHeight"] > measurements["height"], f"Cart did not overflow at {width}x{height}: {measurements}"
    line_list.evaluate("node => node.scrollTop = node.scrollHeight")
    after = charge.bounding_box()
    assert after and abs(before["y"] - after["y"]) <= 1, f"Charge moved while cart scrolled: {before} -> {after}"
    assert charge.is_visible(), "Charge hidden after list scroll"
    page.screenshot(path=str(OUT / f"pos-{width}x{height}.png"), full_page=False)
    assert not errors, f"Browser JavaScript errors: {errors}"
    print(f"PASS POS {width}x{height}: {measurements}; charge Y={before['y']:.1f}")
    page.close()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    test_pos(browser, 1440, 900)
    test_pos(browser, 1280, 720)
    test_pos(browser, 390, 844, mobile=True)
    for path in ["/", "/orders", "/inventory", "/products"]:
        page = browser.new_page(viewport={"width": 390, "height": 844})
        response = page.goto(BASE + path, wait_until="networkidle", timeout=30000)
        assert response and response.status == 200, f"{path} HTTP error"
        assert not page.get_by_text("Something went wrong").is_visible(), f"Route error: {path}"
        if path == "/orders":
            assert page.locator(".table-scroll").count() == 1
        page.close()
        print("PASS route", path)
    browser.close()
