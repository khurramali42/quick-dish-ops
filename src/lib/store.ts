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
  resetAll: () => void;
}

function cartTotals(cart: CartItem[], billDiscount: number, serviceChargePct: number, deliveryCharge = 0) {
  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const itemDiscount = cart.reduce((s, i) => s + i.discount, 0);
  const taxable = cart.reduce((s, i) => s + Math.max(0, i.unitPrice * i.qty - i.discount), 0) - billDiscount;
  const tax = cart.reduce((s, i) => {
    const line = Math.max(0, i.unitPrice * i.qty - i.discount);
    return s + (line * i.taxRate) / 100;
  }, 0);
  const serviceCharge = ((subtotal - itemDiscount - billDiscount) * serviceChargePct) / 100;
  const total = Math.max(0, subtotal - itemDiscount - billDiscount + tax + serviceCharge + deliveryCharge);
  return { subtotal, itemDiscount, taxable, tax, serviceCharge, total };
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
      setBillDiscount: (n) => set({ billDiscount: Math.max(0, n) }),
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
        cart: get().cart.map((c) => c.lineId === lineId ? { ...c, qty: Math.max(1, qty) } : c),
      }),
      updateItemDiscount: (lineId, d) => set({
        cart: get().cart.map((c) => c.lineId === lineId ? { ...c, discount: Math.max(0, d) } : c),
      }),
      updateNote: (lineId, note) => set({
        cart: get().cart.map((c) => c.lineId === lineId ? { ...c, note } : c),
      }),
      removeLine: (lineId) => set({ cart: get().cart.filter((c) => c.lineId !== lineId) }),
      clearCart: () => set({ cart: [], billDiscount: 0, table: undefined }),

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
        const customer = customers.find((c) => c.id === customerId);
        const order: Order = {
          id: shortId("O"),
          invoiceNo: "INV-" + Date.now().toString().slice(-8),
          createdAt: todayISO(),
          cashier: currentCashier,
          customerId,
          customerName: customer?.name,
          table,
          orderType,
          items: cart,
          subtotal: t.subtotal,
          itemDiscount: t.itemDiscount,
          billDiscount,
          tax: t.tax,
          serviceCharge: t.serviceCharge,
          deliveryCharge: 0,
          total: t.total,
          paid,
          change: Math.max(0, paid - t.total),
          paymentMethod: method,
          status: "completed",
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
        const purchase: Purchase = { ...p, id: shortId("P"), invoiceNo: "PO-" + Date.now().toString().slice(-8) };
        // increase stock
        const products = get().products.map((prod) => {
          const item = p.items.find((i) => i.productId === prod.id);
          return item ? { ...prod, stock: prod.stock + item.qty } : prod;
        });
        set({ purchases: [purchase, ...get().purchases], products });
      },
      addExpense: (e) => set({ expenses: [{ ...e, id: shortId("E") }, ...get().expenses] }),
      updateSettings: (s) => set({ settings: { ...get().settings, ...s } }),
      refundOrder: (id) => set({
        orders: get().orders.map((o) => o.id === id ? { ...o, status: "refunded" } : o),
      }),
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
