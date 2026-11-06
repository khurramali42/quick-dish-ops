import { beforeEach, describe, expect, test } from "bun:test";
import { useStore } from "../src/lib/store";
import { seedProducts, seedCustomers, seedSettings } from "../src/lib/seed";
import type { CartItem } from "../src/lib/types";

const item = (qty = 1, discount = 0): CartItem => ({
  lineId: "test-line",
  productId: "p1",
  name: "Zinger Burger",
  qty,
  unitPrice: 650,
  modifiers: [],
  discount,
  taxRate: 5,
});

beforeEach(() => {
  useStore.setState({
    products: structuredClone(seedProducts),
    customers: structuredClone(seedCustomers),
    settings: { ...seedSettings, serviceChargePct: 0 },
    orders: [],
    cart: [item()],
    billDiscount: 0,
    customerId: "cu1",
    heldOrders: [],
  });
});

describe("checkout integrity", () => {
  test("refuses empty carts and invalid or insufficient payments", () => {
    const store = useStore.getState();
    expect(() => store.checkout(Number.NaN, "cash")).toThrow();
    expect(() => store.checkout(-1, "cash")).toThrow();
    expect(() => store.checkout(1, "cash")).toThrow();
    useStore.setState({ cart: [] });
    expect(() => useStore.getState().checkout(1000, "cash")).toThrow();
    expect(useStore.getState().orders).toHaveLength(0);
  });

  test("rejects stock shortage without writing a sale", () => {
    useStore.setState({ cart: [item(999)] });
    expect(() => useStore.getState().checkout(999999, "cash")).toThrow(/Insufficient stock/);
    expect(useStore.getState().orders).toHaveLength(0);
    expect(useStore.getState().products.find(p => p.id === "p1")?.stock).toBe(40);
  });

  test("saves one sale, then restores stock and customer totals on refund", () => {
    const order = useStore.getState().checkout(700, "cash");
    expect(order.total).toBeGreaterThan(0);
    expect(useStore.getState().orders).toHaveLength(1);
    expect(useStore.getState().products.find(p => p.id === "p1")?.stock).toBe(39);
    useStore.getState().refundOrder(order.id);
    expect(useStore.getState().products.find(p => p.id === "p1")?.stock).toBe(40);
    expect(useStore.getState().orders[0].status).toBe("refunded");
    useStore.getState().refundOrder(order.id);
    expect(useStore.getState().products.find(p => p.id === "p1")?.stock).toBe(40);
  });

  test("caps discounts so taxes and sale total never go negative", () => {
    useStore.setState({ cart: [item(1, 50000)], billDiscount: 50000 });
    const order = useStore.getState().checkout(0, "cash");
    expect(order.total).toBe(0);
    expect(order.tax).toBe(0);
    expect(order.itemDiscount).toBe(650);
    expect(order.billDiscount).toBe(0);
  });

  test("invalid quantities and item discount inputs never enter cart state", () => {
    useStore.getState().updateQty("test-line", Number.NaN);
    expect(useStore.getState().cart[0].qty).toBe(1);
    useStore.getState().updateItemDiscount("test-line", Infinity);
    expect(useStore.getState().cart[0].discount).toBe(0);
    useStore.getState().updateItemDiscount("test-line", 50000);
    expect(useStore.getState().cart[0].discount).toBe(650);
  });
});
