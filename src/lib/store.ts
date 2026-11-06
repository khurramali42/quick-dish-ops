import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CartItem, Category, Customer, Expense, Order, OrderType, PaymentMethod,
  Product, Purchase, Settings, Supplier,
} from "./types";
import {
  seedCategories, seedCustomers, seedProducts, seedSettings, seedSuppliers,
} from "./seed";
import { shortId, todayISO } from "./format";

interface State {
  // data
  categories: Category[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  orders: Order[];
  purchases: Purchase[];
  expenses: Expense[];
  settings: Settings;

  // POS session
  cart: CartItem[];
  heldOrders: { id: string; at: string; cart: CartItem[]; orderType: OrderType; table?: string; customerId?: string }[];
  activeCategory: string | "all";
  search: string;
  orderType: OrderType;
  table?: string;
  customerId?: string;
  billDiscount: number;
  currentCashier: string;
  darkMode: boolean;

  // actions
  setSearch: (s: string) => void;
  setCategory: (id: string | "all") => void;
  setOrderType: (t: OrderType) => void;
  setTable: (t?: string) => void;
  setCustomer: (id?: string) => void;
  setBillDiscount: (n: number) => void;
  toggleDark: () => void;

  addToCart: (product: Product, variant?: string) => void;
  updateQty: (lineId: string, qty: number) => void;
  updateItemDiscount: (lineId: string, d: number) => void;
  updateNote: (lineId: string, note: string) => void;
  removeLine: (lineId: string) => void;
  clearCart: () => void;
  replaceCart: (items: CartItem[]) => void;

  holdOrder: () => void;
  recallOrder: (id: string) => void;
  deleteHeld: (id: string) => void;

  checkout: (paid: number, method: PaymentMethod) => Order;

  // CRUD
  upsertProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  upsertCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  upsertCustomer: (c: Customer) => void;
  deleteCustomer: (id: string) => void;
  upsertSupplier: (s: Supplier) => void;
  deleteSupplier: (id: string) => void;
  addPurchase: (p: Omit<Purchase, "id" | "invoiceNo">) => void;
  addExpense: (e: Omit<Expense, "id">) => void;
  updateSettings: (s: Partial<Settings>) => void;
  refundOrder: (id: string) => void;
  setKitchenStatus: (id: string, status: "new" | "preparing" | "ready" | "served") => void;
  resetAll: () => void;
}

export function cartTotals(cart: CartItem[], billDiscount: number, serviceChargePct: number, deliveryCharge = 0) {
  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const itemDiscount = cart.reduce((s, i) => s + Math.min(i.unitPrice * i.qty, Math.max(0, i.discount)), 0);
  const preBill = Math.max(0, subtotal - itemDiscount);
  const appliedBillDiscount = Math.min(preBill, Math.max(0, billDiscount));
  const taxable = Math.max(0, preBill - appliedBillDiscount);
  const tax = cart.reduce((s, i) => {
    const line = Math.max(0, i.unitPrice * i.qty - Math.min(i.unitPrice * i.qty, Math.max(0, i.discount)));
    return s + (line * (preBill > 0 ? taxable / preBill : 0) * Math.max(0, i.taxRate)) / 100;
  }, 0);
  const serviceCharge = (taxable * Math.max(0, serviceChargePct)) / 100;
  const total = Math.max(0, taxable + tax + serviceCharge + Math.max(0, deliveryCharge));
  return { subtotal, itemDiscount, appliedBillDiscount, taxable, tax, serviceCharge, total };
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      categories: seedCategories,
      products: seedProducts,
      customers: seedCustomers,
      suppliers: seedSuppliers,
      orders: [],
      purchases: [],
      expenses: [],
      settings: seedSettings,

      cart: [],
      heldOrders: [],
      activeCategory: "all",
      search: "",
      orderType: "dine-in",
      table: undefined,
      customerId: "cu1",
      billDiscount: 0,
      currentCashier: "Admin",
      darkMode: false,

      setSearch: (s) => set({ search: s }),
      setCategory: (id) => set({ activeCategory: id }),
      setOrderType: (t) => set({ orderType: t }),
      setTable: (t) => set({ table: t }),
      setCustomer: (id) => set({ customerId: id }),
      setBillDiscount: (n) => set({ billDiscount: Number.isFinite(n) ? Math.max(0, n) : 0 }),
      toggleDark: () => {
        const d = !get().darkMode;
        set({ darkMode: d });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", d);
        }
      },

      addToCart: (product, variantName) => {
        const variant = product.variants?.find((v) => v.name === variantName);
        const unitPrice = product.price + (variant?.priceDelta ?? 0);
        const cart = [...get().cart];
        const key = product.id + "|" + (variantName ?? "");
        const existing = cart.find((c) => c.productId + "|" + (c.variant ?? "") === key && c.modifiers.length === 0);
        if (existing) {
          existing.qty += 1;
        } else {
          cart.push({
            lineId: shortId("L"),
            productId: product.id,
            name: product.name + (variant ? ` (${variant.name})` : ""),
            qty: 1,
            unitPrice,
            variant: variantName,
            modifiers: [],
            discount: 0,
            taxRate: product.taxRate,
          });
        }
        set({ cart });
      },
      updateQty: (lineId, qty) => set({
        cart: get().cart.map((c) => c.lineId === lineId ? { ...c, qty: Number.isFinite(qty) ? Math.max(1, Math.floor(qty)) : c.qty } : c),
      }),
      updateItemDiscount: (lineId, d) => set({
        cart: get().cart.map((c) => c.lineId === lineId ? { ...c, discount: Number.isFinite(d) ? Math.min(c.unitPrice * c.qty, Math.max(0, d)) : c.discount } : c),
      }),
      updateNote: (lineId, note) => set({
        cart: get().cart.map((c) => c.lineId === lineId ? { ...c, note } : c),
      }),
      removeLine: (lineId) => set({ cart: get().cart.filter((c) => c.lineId !== lineId) }),
      clearCart: () => set({ cart: [], billDiscount: 0, table: undefined }),
      replaceCart: (items) => {
        const products = get().products;
        for (const item of items) {
          if (!Number.isInteger(item.qty) || item.qty < 1 || !Number.isFinite(item.discount) || item.discount < 0 || item.discount > item.unitPrice * item.qty) {
            throw new Error("Invalid quantity or discount in order review.");
          }
          const product = products.find((p) => p.id === item.productId);
          if (!product || !product.available) throw new Error(`Item ${item.name} is unavailable.`);
          if (product.trackStock && items.filter((i) => i.productId === product.id).reduce((sum, i) => sum + i.qty, 0) > product.stock) {
            throw new Error(`Insufficient stock for ${product.name}.`);
          }
        }
        set({ cart: items.map((item) => ({ ...item })) });
      },

      holdOrder: () => {
        const { cart, orderType, table, customerId } = get();
        if (!cart.length) return;
        set({
          heldOrders: [...get().heldOrders, { id: shortId("H"), at: todayISO(), cart, orderType, table, customerId }],
          cart: [], billDiscount: 0, table: undefined,
        });
      },
      recallOrder: (id) => {
        const held = get().heldOrders.find((h) => h.id === id);
        if (!held) return;
        set({
          cart: held.cart, orderType: held.orderType, table: held.table, customerId: held.customerId,
          heldOrders: get().heldOrders.filter((h) => h.id !== id),
        });
      },
      deleteHeld: (id) => set({ heldOrders: get().heldOrders.filter((h) => h.id !== id) }),

      checkout: (paid, method) => {
        const { cart, billDiscount, settings, orderType, table, customerId, customers, currentCashier, products } = get();
        const t = cartTotals(cart, billDiscount, settings.serviceChargePct);
        if (cart.length === 0) throw new Error("Add at least one product before checkout.");
        if (!Number.isFinite(paid) || paid < t.total || paid < 0) {
          throw new Error("Payment must cover the total bill.");
        }
        for (const item of cart) {
          if (!Number.isInteger(item.qty) || item.qty < 1 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
            throw new Error("Cart contains an invalid item quantity or price.");
          }
          const product = products.find((p) => p.id === item.productId);
          if (!product || !product.available) throw new Error("A product in the cart is no longer available.");
          if (product.trackStock) {
            const requested = cart.filter((c) => c.productId === product.id).reduce((n, c) => n + c.qty, 0);
            if (requested > product.stock) throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}.`);
          }
        }
        const customer = customers.find((c) => c.id === customerId);
        const order: Order = {
          id: shortId("O"),
          invoiceNo: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${shortId().slice(0, 6)}`,
          createdAt: todayISO(),
          cashier: currentCashier,
          customerId,
          customerName: customer?.name,
          table,
          orderType,
          items: cart,
          subtotal: t.subtotal,
          itemDiscount: t.itemDiscount,
          billDiscount: t.appliedBillDiscount,
          tax: t.tax,
          serviceCharge: t.serviceCharge,
          deliveryCharge: 0,
          total: t.total,
          paid,
          change: Math.max(0, paid - t.total),
          paymentMethod: method,
          status: "completed",
          kitchenStatus: "new",
        };
        // deduct stock
        const nextProducts = products.map((p) => {
          if (!p.trackStock) return p;
          const soldQty = cart.filter((c) => c.productId === p.id).reduce((s, c) => s + c.qty, 0);
          return soldQty ? { ...p, stock: Math.max(0, p.stock - soldQty) } : p;
        });
        // update customer spend
        const nextCustomers = customers.map((c) => c.id === customerId
          ? { ...c, totalSpent: c.totalSpent + t.total, loyaltyPoints: c.loyaltyPoints + Math.floor(t.total / 100) }
          : c);
        set({
          orders: [order, ...get().orders],
          products: nextProducts,
          customers: nextCustomers,
          cart: [], billDiscount: 0, table: undefined,
        });
        return order;
      },

      upsertProduct: (p) => {
        const list = get().products;
        const idx = list.findIndex((x) => x.id === p.id);
        set({ products: idx >= 0 ? list.map((x) => x.id === p.id ? p : x) : [...list, p] });
      },
      deleteProduct: (id) => set({ products: get().products.filter((p) => p.id !== id) }),
      upsertCategory: (c) => {
        const list = get().categories;
        const idx = list.findIndex((x) => x.id === c.id);
        set({ categories: idx >= 0 ? list.map((x) => x.id === c.id ? c : x) : [...list, c] });
      },
      deleteCategory: (id) => set({ categories: get().categories.filter((c) => c.id !== id) }),
      upsertCustomer: (c) => {
        const list = get().customers;
        const idx = list.findIndex((x) => x.id === c.id);
        set({ customers: idx >= 0 ? list.map((x) => x.id === c.id ? c : x) : [...list, c] });
      },
      deleteCustomer: (id) => set({ customers: get().customers.filter((c) => c.id !== id) }),
      upsertSupplier: (s) => {
        const list = get().suppliers;
        const idx = list.findIndex((x) => x.id === s.id);
        set({ suppliers: idx >= 0 ? list.map((x) => x.id === s.id ? s : x) : [...list, s] });
      },
      deleteSupplier: (id) => set({ suppliers: get().suppliers.filter((s) => s.id !== id) }),

      addPurchase: (p) => {
        if (!p.items.length || !p.items.every((item) => item.productId && Number.isInteger(item.qty) && item.qty > 0 && Number.isFinite(item.cost) && item.cost >= 0 && get().products.some((product) => product.id === item.productId))) {
          throw new Error("Select valid products and positive whole-number purchase quantities.");
        }
        if (!get().suppliers.some((supplier) => supplier.id === p.supplierId)) throw new Error("Select a valid supplier.");
        if (!Number.isFinite(p.total) || p.total < 0 || !Number.isFinite(p.paid) || p.paid < 0 || p.paid > p.total) {
          throw new Error("Invalid purchase totals or paid amount.");
        }
        const calculated = p.items.reduce((sum, item) => sum + item.qty * item.cost, 0);
        if (Math.abs(calculated - p.total) > 0.01) throw new Error("Purchase total does not match line items.");
        const purchase: Purchase = { ...p, id: shortId("P"), invoiceNo: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${shortId().slice(0, 6)}` };
        // increase stock
        const products = get().products.map((prod) => {
          const received = p.items.filter((i) => i.productId === prod.id).reduce((sum, i) => sum + i.qty, 0);
          return received ? { ...prod, stock: prod.stock + received } : prod;
        });
        set({ purchases: [purchase, ...get().purchases], products });
      },
      addExpense: (e) => set({ expenses: [{ ...e, id: shortId("E") }, ...get().expenses] }),
      updateSettings: (s) => set({ settings: { ...get().settings, ...s } }),
      setKitchenStatus: (id, status) => set({
        orders: get().orders.map((order) =>
          order.id === id && order.status === "completed" ? { ...order, kitchenStatus: status } : order,
        ),
      }),
      refundOrder: (id) => {
        const { orders, products, customers } = get();
        const order = orders.find((o) => o.id === id);
        if (!order || order.status === "refunded") return;
        const nextProducts = products.map((p) => {
          if (!p.trackStock) return p;
          const returned = order.items.filter((item) => item.productId === p.id).reduce((sum, item) => sum + item.qty, 0);
          return returned ? { ...p, stock: p.stock + returned } : p;
        });
        const nextCustomers = customers.map((c) => c.id === order.customerId
          ? { ...c, totalSpent: Math.max(0, c.totalSpent - order.total), loyaltyPoints: Math.max(0, c.loyaltyPoints - Math.floor(order.total / 100)) }
          : c);
        set({
          products: nextProducts,
          customers: nextCustomers,
          orders: orders.map((o) => o.id === id ? { ...o, status: "refunded" } : o),
        });
      },
      resetAll: () => {
        localStorage.removeItem("spice-pos-v1");
        location.reload();
      },
    }),
    { name: "spice-pos-v1" },
  ),
);

export function useCartTotals() {
  const { cart, billDiscount, settings } = useStore();
  return cartTotals(cart, billDiscount, settings.serviceChargePct);
}
