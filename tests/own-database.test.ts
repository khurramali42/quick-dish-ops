import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  BackendError, loadSnapshot, loadWorkspace, saveWorkspace,
  signIn, snapshot, validateSnapshot,
} from "../src/lib/optional-backend";
import { useStore } from "../src/lib/store";

const originalFetch = globalThis.fetch;
beforeEach(() => { globalThis.fetch = originalFetch; });
afterEach(() => { globalThis.fetch = originalFetch; });

const session = {
  user: { id: "user-123", email: "dev@example.test" },
  access_token: "example-token",
  refresh_token: "example-refresh",
  expires_at: Date.now() + 3_600_000,
};

describe("own-database credential adapter", () => {
  test("exports data, not store actions, password or auth session secrets", () => {
    const data = snapshot();
    expect(Array.isArray(data.products)).toBe(true);
    expect(Array.isArray(data.orders)).toBe(true);
    expect(data.checkout).toBeUndefined();
    expect(data.access_token).toBeUndefined();
    expect(data.refresh_token).toBeUndefined();
    expect(data.password).toBeUndefined();
    expect(data).toHaveProperty("reservations");
    expect(data).toHaveProperty("refundRequests");
  });

  test("rejects malformed cloud state before applying any fields", () => {
    expect(() => validateSnapshot({ products: [], orders: [] })).toThrow(/missing valid/);
    expect(() => loadSnapshot({ products: "bad", orders: [] })).toThrow(BackendError);
  });

  test("cloud snapshot never overwrites actions or imports undocumented fields", () => {
    const original = snapshot();
    const copy = { ...original, currentCashier: "New Operator", checkout: "bad action", access_token: "bad" };
    loadSnapshot(copy);
    expect(useStore.getState().currentCashier).toBe("New Operator");
    expect(typeof useStore.getState().checkout).toBe("function");
    expect((useStore.getState() as unknown as Record<string, unknown>).access_token).toBeUndefined();
    loadSnapshot(original);
  });

  test("password login returns an authenticated account session", async () => {
    let request: { url?: string; body?: unknown } = {};
    globalThis.fetch = (async (url: string, opts: RequestInit) => {
      request = { url, body: JSON.parse(String(opts.body)) };
      return new Response(JSON.stringify({
        user: session.user, access_token: session.access_token,
        refresh_token: session.refresh_token, expires_in: 3600,
      }), { status: 200 });
    }) as typeof fetch;
    const result = await signIn("  dev@example.test ", "example-password");
    expect(result.user.id).toBe("user-123");
    expect(request.url).toContain("/auth/v1/token?grant_type=password");
    expect(request.body).toEqual({ email: "dev@example.test", password: "example-password" });
  });

  test("new account is seeded from clean defaults, not another account's cart", async () => {
    const old = snapshot();
    useStore.setState({ cart: [{ lineId: "foreign", productId: "p1", name: "Private cart", qty: 2, unitPrice: 10, modifiers: [], discount: 0, taxRate: 0 }] });
    let posted: Record<string, unknown> | undefined;
    globalThis.fetch = (async (url: string, opts: RequestInit) => {
      if (url.includes("?select=revision,data")) return new Response("[]", { status: 200 });
      posted = JSON.parse(String(opts.body));
      return new Response(JSON.stringify([{ revision: 0, data: posted?.data }]), { status: 201 });
    }) as typeof fetch;
    const result = await loadWorkspace(session);
    expect(result.workspace.revision).toBe(0);
    expect((posted?.data as { cart: unknown[] }).cart).toEqual([]);
    useStore.setState(old);
  });

  test("revision checked save succeeds and server conflict is not ignored", async () => {
    globalThis.fetch = (async () => new Response("4", { status: 200 })) as typeof fetch;
    const result = await saveWorkspace(session, 3, snapshot());
    expect(result.revision).toBe(4);
    globalThis.fetch = (async () => new Response(JSON.stringify({ message: "Workspace revision conflict" }), {
      status: 409, headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
    await expect(saveWorkspace(session, 3, snapshot())).rejects.toThrow(/revision conflict/);
  });
});
