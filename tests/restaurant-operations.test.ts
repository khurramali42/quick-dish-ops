import { beforeEach, describe, expect, test } from "bun:test";
import { useStore } from "../src/lib/store";
import { seedProducts, seedSuppliers, seedCustomers, seedSettings } from "../src/lib/seed";
import type { CartItem } from "../src/lib/types";

const item: CartItem = {
  lineId: "receipt-test", productId: "p1", name: "Zinger Burger",
  qty: 1, unitPrice: 650, modifiers: [], discount: 0, taxRate: 5,
};

beforeEach(() => {
  useStore.setState({
    products: structuredClone(seedProducts),
    suppliers: structuredClone(seedSuppliers),
    customers: structuredClone(seedCustomers),
    settings: { ...seedSettings, serviceChargePct: 0 },
    orders: [], purchases: [], cart: [item], billDiscount: 0, customerId: "cu1",
  });
});

describe("expandable POS line discount calculation", () => {
  test("percentage discount updates line amount and survives quantity changes", () => {
    useStore.getState().updateItemDiscountPercent(item.lineId, 20);
    expect(useStore.getState().cart[0].discount).toBe(130);
    expect(useStore.getState().cart[0].discountPercent).toBe(20);
    useStore.getState().updateQty(item.lineId, 2);
    expect(useStore.getState().cart[0].qty).toBe(2);
    expect(useStore.getState().cart[0].discount).toBe(260);
    expect(useStore.getState().cart[0].discountPercent).toBe(20);
    const order = useStore.getState().checkout(1200, "cash");
    expect(order.itemDiscount).toBe(260);
    expect(order.subtotal).toBe(1300);
    expect(order.total).toBe(1092);
  });

  test("discount stays within 0–100 percent; legacy fixed discount remains valid", () => {
    useStore.getState().updateItemDiscountPercent(item.lineId, 200);
    expect(useStore.getState().cart[0].discount).toBe(650);
    expect(useStore.getState().cart[0].discountPercent).toBe(100);
    useStore.getState().updateItemDiscountPercent(item.lineId, -30);
    expect(useStore.getState().cart[0].discount).toBe(0);
    useStore.getState().updateItemDiscount(item.lineId, 100);
    expect(useStore.getState().cart[0].discountPercent).toBeUndefined();
    useStore.getState().updateQty(item.lineId, 2);
    expect(useStore.getState().cart[0].discount).toBe(100);
  });
});

describe("restaurant kitchen and receiving workflow", () => {
  test("kitchen statuses follow order and survive unrelated store updates", () => {
    const order = useStore.getState().checkout(700, "cash");
    expect(order.kitchenStatus).toBe("new");
    useStore.getState().setKitchenStatus(order.id, "preparing");
    useStore.getState().setKitchenStatus(order.id, "ready");
    expect(useStore.getState().orders[0].kitchenStatus).toBe("ready");
    useStore.getState().updateSettings({ branchName: "Test branch" });
    expect(useStore.getState().orders[0].kitchenStatus).toBe("ready");
    useStore.getState().setKitchenStatus(order.id, "served");
    expect(useStore.getState().orders[0].status).toBe("completed");
    expect(useStore.getState().orders[0].kitchenStatus).toBe("served");
  });

  test("chef station and per-item preparation checklist persist correctly", () => {
    const order = useStore.getState().checkout(700, "cash");
    useStore.getState().assignKitchenChef(order.id, "Head chef");
    useStore.getState().toggleKitchenItem(order.id, item.lineId);
    expect(useStore.getState().orders[0].kitchenDoneLineIds).toBeUndefined();
    useStore.getState().setKitchenStatus(order.id, "preparing");
    useStore.getState().assignKitchenChef(order.id, "Head chef");
    useStore.getState().toggleKitchenItem(order.id, item.lineId);
    expect(useStore.getState().orders[0].kitchenChef).toBe("Head chef");
    expect(useStore.getState().orders[0].kitchenDoneLineIds).toEqual([item.lineId]);
    useStore.getState().toggleKitchenItem(order.id, item.lineId);
    expect(useStore.getState().orders[0].kitchenDoneLineIds).toEqual([]);
    useStore.getState().toggleKitchenItem(order.id, "invalid-line");
    expect(useStore.getState().orders[0].kitchenDoneLineIds).toEqual([]);
    useStore.getState().setKitchenStatus(order.id, "served");
    useStore.getState().toggleKitchenItem(order.id, item.lineId);
    expect(useStore.getState().orders[0].kitchenDoneLineIds).toEqual([]);
  });

  test("refunded sales cannot be moved through kitchen workflow", () => {
    const order = useStore.getState().checkout(700, "cash");
    useStore.getState().refundOrder(order.id);
    useStore.getState().setKitchenStatus(order.id, "ready");
    expect(useStore.getState().orders[0].status).toBe("refunded");
    expect(useStore.getState().orders[0].kitchenStatus).toBe("new");
  });

  test("duplicate receiving lines both increase tracked inventory", () => {
    const supplier = useStore.getState().suppliers[0];
    const product = useStore.getState().products.find((p) => p.id === "p1")!;
    const before = product.stock;
    useStore.getState().addPurchase({
      supplierId: supplier.id, supplierName: supplier.name, date: new Date().toISOString(),
      items: [
        { productId: product.id, name: product.name, qty: 3, cost: 100 },
        { productId: product.id, name: product.name, qty: 5, cost: 100 },
      ],
      total: 800, paid: 800,
    });
    expect(useStore.getState().products.find((p) => p.id === product.id)?.stock).toBe(before + 8);
    expect(useStore.getState().purchases[0].items).toHaveLength(2);
  });

  test("invalid or fraudulent purchase lines do not affect inventory", () => {
    const supplier = useStore.getState().suppliers[0];
    const product = useStore.getState().products[0];
    const before = product.stock;
    const purchase = (qty: number, cost: number, total: number) => ({
      supplierId: supplier.id, supplierName: supplier.name, date: new Date().toISOString(),
      items: [{ productId: product.id, name: product.name, qty, cost }], total, paid: total,
    });
    expect(() => useStore.getState().addPurchase(purchase(-2, 100, -200))).toThrow();
    expect(() => useStore.getState().addPurchase(purchase(1.5, 100, 150))).toThrow();
    expect(() => useStore.getState().addPurchase(purchase(2, 100, 100))).toThrow();
    expect(() => useStore.getState().addPurchase(purchase(2, Infinity, Infinity))).toThrow();
    expect(useStore.getState().purchases).toHaveLength(0);
    expect(useStore.getState().products[0].stock).toBe(before);
  });
});
