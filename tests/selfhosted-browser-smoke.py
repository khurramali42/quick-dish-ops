"""Browser integration smoke for developer-configured own-Supabase mode.

The fake database/API below exists only in this test. No third-party keys
or accounts are contacted; real production RLS still requires provider testing.
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3000"
BACKEND = "https://example.supabase.co"
HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "apikey,authorization,content-type,prefer",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json",
}

accounts = {}
data_by_account = {}
active_user_id = None
rpc_writes = []


def handler(route):
    global active_user_id
    request = route.request
    url = request.url
    if request.method == "OPTIONS":
        route.fulfill(status=204, headers=HEADERS)
        return
    if "/auth/v1/token?grant_type=password" in url:
        body = request.post_data_json
        email = body["email"]
        user_id = "demo-" + email.replace("@", "-").replace(".", "-")
        active_user_id = user_id
        accounts[user_id] = email
        route.fulfill(status=200, headers=HEADERS, body=json.dumps({
            "access_token": "test-token", "refresh_token": "test-refresh",
            "expires_in": 3600, "user": {"id": user_id, "email": email},
        }))
        return
    if "/auth/v1/user" in url:
        route.fulfill(status=200, headers=HEADERS, body=json.dumps({"id": active_user_id, "email": accounts[active_user_id]}))
        return
    if "/rest/v1/pos_workspaces?" in url and request.method == "GET":
        value = data_by_account.get(active_user_id)
        route.fulfill(status=200, headers=HEADERS, body=json.dumps([value] if value else []))
        return
    if "/rest/v1/pos_workspaces" in url and request.method == "POST":
        entry = request.post_data_json
        assert entry["owner_id"] == active_user_id
        data_by_account[active_user_id] = {"revision": 0, "data": entry["data"]}
        route.fulfill(status=201, headers=HEADERS, body=json.dumps([data_by_account[active_user_id]]))
        return
    if "/rest/v1/rpc/update_pos_workspace" in url:
        value = request.post_data_json
        workspace = data_by_account[active_user_id]
        assert value["expected_revision"] == workspace["revision"]
        workspace["revision"] += 1
        workspace["data"] = value["next_data"]
        rpc_writes.append(value)
        route.fulfill(status=200, headers=HEADERS, body=json.dumps(workspace["revision"]))
        return
    if "/auth/v1/logout" in url:
        route.fulfill(status=204, headers=HEADERS)
        return
    route.fulfill(status=404, headers=HEADERS, body=json.dumps({"message": "Unexpected mocked API request: " + url}))


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    page.route(BACKEND + "/**", handler)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    page.goto(BASE + "/", wait_until="domcontentloaded", timeout=30000)
    page.get_by_role("heading", name="Quick Dish Ops").wait_for(timeout=10000)
    assert not page.get_by_role("heading", name="Dashboard").is_visible(), "Unauthenticated business UI visible"
    page.get_by_label("Account email").fill("alice@example.test")
    page.get_by_label("Account password").fill("example-password")
    page.get_by_role("button", name="Sign in", exact=True).click()
    page.get_by_role("heading", name="Dashboard").wait_for(timeout=15000)
    assert active_user_id == "demo-alice-example-test"
    assert data_by_account[active_user_id]["revision"] == 0

    page.goto(BASE + "/pos", wait_until="domcontentloaded", timeout=30000)
    page.locator("article.group").first.locator("button").first.click()
    page.wait_for_function("() => document.body.innerText.includes('Synced') && !document.body.innerText.includes('Saving...')", timeout=12000)
    page.wait_for_timeout(700)
    assert len(rpc_writes) >= 1, "POS state was not saved to own backend"
    assert len(data_by_account[active_user_id]["data"]["cart"]) == 1

    # Auth state is only per-tab; no customer/business JSON in localStorage.
    assert page.evaluate("localStorage.getItem('spice-pos-v1')") is None

    # A reload reads the same account-owned cloud workspace, including its cart.
    page.reload(wait_until="domcontentloaded", timeout=30000)
    page.get_by_role("button", name="Take Payment").wait_for(timeout=12000)
    assert page.get_by_role("button", name="Take Payment").is_enabled()
    assert not errors, f"Unexpected browser errors: {errors}"
    print("PASS self-hosted login, private workspace, autosave, reload and no localStorage copy")
    page.screenshot(path="/tmp/selfhosted-auth-demo.png", full_page=False)
    browser.close()
