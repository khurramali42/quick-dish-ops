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
    cards = page.locator("article.group")
    cards.first.wait_for(timeout=15000)
    assert cards.count() >= 14, f"Expected menu products; found {cards.count()}"
    # Verify reference-style menu geometry rather than only checking a successful build.
    assert page.locator("body").evaluate("el => el.scrollWidth <= window.innerWidth + 2"), f"Unexpected horizontal overflow at {width}px"
    card_boxes = [cards.nth(i).bounding_box() for i in range(3)]
    assert all(card_boxes), f"Missing menu card bounds at {width}px"
    if width >= 768:
        assert max(box["y"] for box in card_boxes) - min(box["y"] for box in card_boxes) <= 3, f"Menu is not three-column at {width}px: {card_boxes}"
        assert card_boxes[0]["x"] < card_boxes[1]["x"] < card_boxes[2]["x"], f"Menu columns are misaligned: {card_boxes}"
        summary = page.get_by_label("Current order")
        assert summary.is_visible(), f"Bill summary hidden at {width}px"
        header = page.locator("header:visible").first
        assert abs(header.bounding_box()["height"] - 52) <= 2, f"Header differs from compact reference at {width}px"
    else:
        assert page.get_by_role("button", name="Menu", exact=True).is_visible()

    if width >= 900:
        card_height = card_boxes[0]["height"]
        assert card_height < 220, f"POS product cards are still oversized at {width}px: {card_height}px"
    for i in range(14):
        cards.nth(i).locator("button").first.click(timeout=10000)
    if mobile:
        page.get_by_role("button", name=re.compile(r"^Order \(")).click()
        page.get_by_role("button", name="Open navigation").click()
        page.get_by_role("button", name="Close navigation").last.click()
    if width >= 1280:
        assert page.locator("article.group").count() >= 14
        assert page.get_by_role("button", name="New Order").is_visible()
        page.get_by_title("Toggle order list").click()
        assert page.get_by_role("heading", name="Order List").is_visible()
        page.get_by_role("button", name="Close order list").click()
    # The compact item list must expand to editable quantity, discount and notes.
    item_editor = page.get_by_role("button", name="Expand Zinger Burger options")
    item_editor.click()
    discount_field = page.get_by_role("spinbutton", name="Discount percent for Zinger Burger")
    assert discount_field.is_visible(), "Line discount editor missing"
    discount_field.fill("20")
    assert discount_field.input_value() == "20"
    assert page.get_by_text("Line discount").is_visible()
    page.get_by_role("button", name="Collapse Zinger Burger options").click()
    assert not discount_field.is_visible(), "Expanded controls still visible after collapse"
    line_list = page.get_by_label("Order line items")
    charge = page.get_by_role("button", name="Take Payment")
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
    test_pos(browser, 900, 800)
    test_pos(browser, 390, 844, mobile=True)
    # End-to-end kitchen state progression: checkout -> queue -> preparing -> ready -> served.
    kitchen_page = browser.new_page(viewport={"width": 1440, "height": 900})
    browser_errors = []
    kitchen_page.on("pageerror", lambda error: browser_errors.append(str(error)))
    kitchen_page.goto(BASE + "/pos", wait_until="networkidle")
    kitchen_page.locator("article.group").first.locator("button").first.click()
    kitchen_page.get_by_role("button", name="Take Payment").click()
    assert kitchen_page.get_by_role("heading", name="Order Summary").is_visible()
    assert kitchen_page.get_by_text("Items ordered").is_visible()
    assert kitchen_page.get_by_text("Bill breakdown").is_visible()
    assert kitchen_page.get_by_role("heading", name="Payment Method").is_visible()
    assert kitchen_page.get_by_role("heading", name="Amount Received").is_visible()
    kitchen_page.get_by_role("button", name="Card Debit / credit").click()
    assert kitchen_page.get_by_role("button", name="Card Debit / credit").get_attribute("aria-pressed") == "true"
    kitchen_page.locator("#pos-payment-amount").fill("0")
    assert kitchen_page.get_by_text("Amount remaining").is_visible()
    assert kitchen_page.get_by_role("button", name="Complete Payment").is_disabled()
    kitchen_page.get_by_role("button", name="Exact amount").click()
    assert kitchen_page.get_by_role("button", name="Complete Payment").is_enabled()
    kitchen_page.get_by_role("button", name="Complete Payment").click()
    kitchen_page.goto(BASE + "/kitchen", wait_until="networkidle")
    assert kitchen_page.get_by_role("heading", name="Kitchen Display").is_visible()
    assert kitchen_page.get_by_label("Queued").is_visible()
    assert kitchen_page.get_by_label("Preparing").is_visible()
    assert kitchen_page.get_by_label("Ready").is_visible()
    kitchen_page.get_by_role("button", name="Start Preparing").click()
    assert kitchen_page.get_by_role("button", name="Mark Ready").is_disabled()
    prep_buttons = kitchen_page.get_by_role("button", name=re.compile(r"^Mark .+ prepared$"))
    assert prep_buttons.count() >= 1
    for item_button in prep_buttons.all():
        item_button.click()
    kitchen_page.get_by_role("button", name="Mark Ready").click()
    kitchen_page.get_by_role("button", name="Mark Served").click()
    assert kitchen_page.get_by_role("button", name="Start Preparing").count() == 0
    assert not browser_errors, f"Kitchen browser errors: {browser_errors}"
    kitchen_page.screenshot(path=str(OUT / "kitchen-1440x900.png"), full_page=False)
    kitchen_page.close()
    print("PASS kitchen ticket lifecycle")

    # Kitchen can receive unpaid orders before checkout, without double-counting a sale.
    unpaid_page = browser.new_page(viewport={"width": 1280, "height": 800})
    unpaid_page.goto(BASE + "/pos", wait_until="networkidle")
    unpaid_page.locator("article.group").first.locator("button").first.click()
    unpaid_page.get_by_role("button", name="Send to Kitchen (unpaid)").click()
    pending_state = unpaid_page.evaluate("JSON.parse(localStorage.getItem('spice-pos-v1')).state")
    assert len(pending_state["orders"]) == 0, "Dispatch must not create a paid sale"
    assert any(item.get("kitchenStatus") == "new" for item in pending_state["heldOrders"]), "Unpaid kitchen ticket missing"
    unpaid_page.goto(BASE + "/kitchen", wait_until="networkidle")
    assert unpaid_page.get_by_text("Awaiting payment · Local kitchen ticket").first.is_visible()
    unpaid_page.get_by_role("button", name="Start Preparing").first.click()
    unpaid_page.get_by_role("button", name=re.compile(r"^Mark .+ prepared$")).first.click()
    unpaid_page.get_by_role("button", name="Mark Ready").first.click()
    unpaid_page.screenshot(path=str(OUT / "kitchen-unpaid-1280x800.png"), full_page=False)
    unpaid_page.close()
    print("PASS unpaid kitchen dispatch")

    # Audit the previously disconnected purchase->supplier and settings->backup UI paths.
    audit_page = browser.new_page(viewport={"width": 1280, "height": 800}, accept_downloads=True)
    audit_page.goto(BASE + "/purchases", wait_until="networkidle")
    audit_page.get_by_role("button", name="New purchase").click()
    audit_page.get_by_role("spinbutton", name="Purchase paid amount").fill("0")
    audit_page.get_by_role("button", name="Save purchase").click()
    recorded_state = audit_page.evaluate("JSON.parse(localStorage.getItem('spice-pos-v1')).state")
    assert recorded_state["purchases"], "Purchase did not persist"
    assert recorded_state["purchases"][0]["paid"] == 0, "Purchase partial payment was not saved"
    selected_supplier = recorded_state["suppliers"][0]
    assert selected_supplier["balance"] > 0, "Supplier payable was not updated"
    audit_page.get_by_role("button", name="Pay balance").first.click()
    assert audit_page.get_by_role("heading", name="Supplier Payment").is_visible()
    audit_page.get_by_role("spinbutton", name="Supplier settlement amount").fill("50")
    audit_page.get_by_role("button", name="Record Payment").click()
    settlement_state = audit_page.evaluate("JSON.parse(localStorage.getItem('spice-pos-v1')).state")
    assert settlement_state["purchases"][0]["paid"] == 50, "Supplier settlement was not recorded"
    assert settlement_state["purchases"][0]["settlements"][0]["amount"] == 50, "Settlement details missing"
    assert any(event["action"] == "supplier.settlement" for event in settlement_state["activityLog"]), "Missing supplier activity event"

    audit_page.goto(BASE + "/settings", wait_until="networkidle")
    assert audit_page.get_by_text("Demo Operator Profile").is_visible()
    audit_page.get_by_placeholder("Demo operator").fill("Audit Operator")
    audit_page.get_by_role("button", name="Save changes").click()
    with audit_page.expect_download() as download_event:
        audit_page.get_by_role("button", name="Export backup (JSON)").click()
    download = download_event.value
    import json
    backup_content = json.loads(Path(download.path()).read_text())
    assert backup_content["version"] == 2, "Expected current backup version"
    assert all(key in backup_content["data"] for key in ["restaurantTables", "reservations", "heldOrders", "parkedHistory", "purchases", "currentCashier"]), "Missing linked backup records"
    assert backup_content["data"]["currentCashier"] == "Audit Operator", "Operator display name was not saved"
    assert "activityLog" in backup_content["data"], "Activity history not included in backup"
    audit_page.close()
    print("PASS audit: supplier payable, demo operator and linked JSON backup")

    for width, height in [(1440, 900), (900, 800), (390, 844)]:
        page = browser.new_page(viewport={"width": width, "height": height})
        error_log = []
        page.on("pageerror", lambda error: error_log.append(str(error)))
        response = page.goto(BASE + "/", wait_until="networkidle", timeout=30000)
        assert response and response.status == 200, f"Dashboard HTTP failure at {width}"
        assert page.get_by_role("heading", name="Dashboard").is_visible()
        assert page.get_by_role("heading", name="Sales Overview").is_visible()
        assert page.get_by_role("heading", name="Recent Orders").is_visible()
        assert page.get_by_text("Today's Sales").first.is_visible()
        assert page.get_by_text("Est. Profit").first.is_visible()
        assert page.locator("body").evaluate("el => el.scrollWidth <= window.innerWidth + 2"), f"Horizontal page overflow at {width}px"
        if width == 390:
            page.get_by_role("button", name="Open navigation").click()
            page.get_by_role("button", name="Close navigation").last.click()
        page.screenshot(path=str(OUT / f"dashboard-{width}x{height}.png"), full_page=False)
        assert not error_log, error_log
        page.close()
        print("PASS dashboard", width, height)
    for path in ["/", "/orders", "/inventory", "/products"]:
        page = browser.new_page(viewport={"width": 390, "height": 844})
        response = page.goto(BASE + path, wait_until="networkidle", timeout=30000)
        assert response and response.status == 200, f"{path} HTTP error"
        assert not page.get_by_text("Something went wrong").is_visible(), f"Route error: {path}"
        if path == "/orders":
            assert page.locator(".table-scroll").count() == 1
        page.close()
        print("PASS route", path)
    # Table booking route: floor map, reservation dialog and responsive layout.
    for width, height in [(1440, 900), (390, 844)]:
        page = browser.new_page(viewport={"width": width, "height": height})
        browser_errors = []
        page.on("pageerror", lambda error: browser_errors.append(str(error)))
        response = page.goto(BASE + "/tables", wait_until="networkidle", timeout=30000)
        assert response and response.status == 200, f"/tables HTTP failure at {width}"
        assert page.get_by_role("heading", name="Tables & Reservations").is_visible()
        assert page.get_by_role("heading", name="Restaurant Floor").is_visible()
        assert page.get_by_text("T1", exact=True).first.is_visible()
        assert page.locator("body").evaluate("el => el.scrollWidth <= window.innerWidth + 2"), f"Table map overflow at {width}px"
        page.get_by_text("T1", exact=True).first.click()
        page.get_by_role("button", name="Reserve", exact=True).click()
        page.get_by_placeholder("Guest full name").fill("Viewport Test Guest")
        page.get_by_role("button", name="Confirm Booking").click()
        assert page.get_by_text("Viewport Test Guest").first.is_visible(), "Reservation was not saved"
        assert not browser_errors, f"Table booking browser errors at {width}: {browser_errors}"
        page.screenshot(path=str(OUT / f"tables-{width}x{height}.png"), full_page=False)
        page.close()
        print("PASS tables", width, height)
    browser.close()
