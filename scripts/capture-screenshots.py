"""Capture authentic screenshots from the locally running Quick Dish Ops demo.

No mockups, fabricated statistics, AI imagery, personal data, or production credentials.
All visible orders and reservations are created through the actual demo UI.
"""
from pathlib import Path
import re
import os

from playwright.sync_api import sync_playwright

BASE = os.environ.get("SCREENSHOT_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
OUT = Path(os.environ.get("SCREENSHOT_OUT_DIR", "docs/screenshots"))
OUT.mkdir(parents=True, exist_ok=True)


def visit(page, route):
    response = page.goto(BASE + route, wait_until="domcontentloaded", timeout=30000)
    if not response or response.status != 200:
        raise RuntimeError(f"Screenshot route {route} returned {response.status if response else 'no response'}")
    page.locator("body").wait_for(state="visible")
    page.wait_for_timeout(1100)


def capture(page, filename, *, minimum_bytes=7000):
    output = OUT / filename
    page.screenshot(path=str(output), full_page=False, animations="disabled")
    size = output.stat().st_size
    if size < minimum_bytes:
        raise AssertionError(f"Suspiciously small screenshot {output}: {size} bytes")
    print(f"Captured {output}: {size} bytes", flush=True)


def make_sale(page, indices):
    visit(page, "/pos")
    cards = page.locator("article.group")
    cards.first.wait_for(timeout=15000)
    for index in indices:
        cards.nth(index).locator("button").first.click()
    page.get_by_role("button", name="Take Payment").click()
    page.get_by_role("button", name="Complete Payment").click()
    page.wait_for_timeout(400)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1440, "height": 900},
        device_scale_factor=1,
        color_scheme="light",
        reduced_motion="reduce",
        locale="en-US",
        timezone_id="Asia/Karachi",
        accept_downloads=False,
    )
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    # Three genuine demo sales create realistic, non-empty order and kitchen views.
    make_sale(page, [0, 1])
    make_sale(page, [1, 2])
    make_sale(page, [2, 3])

    # Move one kitchen ticket to Ready and another to Preparing using the app.
    visit(page, "/kitchen")
    page.get_by_role("button", name="Start Preparing").first.click()
    prepared = page.get_by_role("button", name=re.compile(r"^Mark .+ prepared$"))
    for button in prepared.all():
        button.click()
    page.get_by_role("button", name="Mark Ready").first.click()
    page.get_by_role("button", name="Start Preparing").first.click()
    visit(page, "/kitchen")
    assert page.get_by_label("Queued").is_visible()
    assert page.get_by_label("Preparing").is_visible()
    assert page.get_by_label("Ready").is_visible()
    capture(page, "kitchen.png")

    visit(page, "/")
    capture(page, "dashboard.png")

    visit(page, "/orders")
    capture(page, "orders.png")

    # Show the latest compact POS with realistic cart rows and a discount.
    visit(page, "/pos")
    cards = page.locator("article.group")
    cards.first.wait_for(timeout=15000)
    for index in [0, 1, 2]:
        cards.nth(index).locator("button").first.click()
    first_options = page.get_by_role("button", name=re.compile(r"^Expand .+ options$")).first
    first_options.click()
    discount = page.get_by_role("spinbutton", name=re.compile(r"^Discount percent for "))
    discount.first.fill("10")
    page.get_by_role("button", name=re.compile(r"^Collapse .+ options$")).first.click()
    capture(page, "pos.png")

    # Tables screen with a real booking made through the visible demo UI.
    visit(page, "/tables")
    page.get_by_text("T1", exact=True).first.click()
    page.get_by_role("button", name="Reserve", exact=True).click()
    page.get_by_placeholder("Guest full name").fill("Demo Guest")
    page.get_by_role("button", name="Confirm Booking").click()
    page.wait_for_timeout(250)
    capture(page, "tables.png")

    for route, filename in [
        ("/inventory", "inventory.png"),
        ("/products", "products.png"),
        ("/purchases", "purchases.png"),
        ("/settings", "settings.png"),
    ]:
        visit(page, route)
        capture(page, filename)

    # Mobile menu and mobile cart are separate genuine responsive captures.
    page.set_viewport_size({"width": 390, "height": 844})
    visit(page, "/pos")
    capture(page, "mobile-pos.png", minimum_bytes=4500)
    order_toggle = page.get_by_role("button", name=re.compile(r"^Order \("))
    order_toggle.click()
    capture(page, "mobile-cart.png", minimum_bytes=4500)

    if errors:
        raise AssertionError(f"Browser errors during screenshot capture: {errors}")
    assert len(list(OUT.glob("*.png"))) >= 11
    browser.close()
