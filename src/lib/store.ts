import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

// Hosted owner workspaces must never store customer/order data in browser localStorage.
// The hosted backend adapter handles authenticated persistence instead.
const noBrowserStorage: StateStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const hostedConfigPresent = Boolean(import.meta.env?.VITE_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY);
import type {
  CartItem, Category, Customer, Expense, Order, OrderType, PaymentMethod,
  Product, Purchase, Settings, Supplier, SupplierSettlement, ActivityEvent, RefundRequest, ParkedOrder, ParkedOrderStatus, RestaurantTable, TableReservation, ReservationStatus,
} from "./types";
import {
  seedCategories, seedCustomers, seedProducts, seedSettings, seedSuppliers,
} from "./seed";
import { shortId, todayISO } from "./format";

const initialTables: RestaurantTable[] = [
  ...Array.from({ length: 8 }, (_, index) => ({ id: `T${index + 1}`, label: `T${index + 1}`, seats: index < 4 ? 2 : 4, area: "Main Hall" as const, enabled: true })),
  ...Array.from({ length: 4 }, (_, index) => ({ id: `T${index + 9}`, label: `T${index + 9}`, seats: index < 2 ? 4 : 6, area: "Terrace" as const, enabled: true })),
];

function bookingOverlap(aStart: number, aMinutes: number, bStart: number, bMinutes: number) {
  return aStart < bStart + bMinutes * 60_000 && bStart < aStart + aMinutes * 60_000;
}

interface State {
  // data
  categories: Category[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  orders: Order[];
  purchases: Purchase[];
  expenses: Expense[];
  activityLog: ActivityEvent[];
  refundRequests: RefundRequest[];
  settings: Settings;
  restaurantTables: RestaurantTable[];
  reservations: TableReservation[];

  // POS session
  cart: CartItem[];
  heldOrders: ParkedOrder[];
  parkedHistory: ParkedOrder[];
  activeKitchenTicket?: Pick<ParkedOrder, "id" | "kitchenStatus" | "kitchenDoneLineIds" | "kitchenChef" | "kitchenDispatchedAt">;
  activeCategory: string | "all";
  search: string;
  orderType: OrderType;
  table?: string;
  customerId?: string;
  billDiscount: number;
  currentCashier: string;
  darkMode: boolean;

  // actions
  addReservation: (input: Omit<TableReservation, "id" | "createdAt" | "status">) => TableReservation;
  updateReservationStatus: (id: string, status: ReservationStatus) => void;
  addRestaurantTable: (input: Pick<RestaurantTable, "label" | "seats" | "area">) => void;
  setTableEnabled: (id: string, enabled: boolean) => void;

  setSearch: (s: string) => void;
  setCategory: (id: string | "all") => void;
  setOrderType: (t: OrderType) => void;
  setTable: (t?: string) => void;
  setCustomer: (id?: string) => void;
  setBillDiscount: (n: number) => void;
  setCurrentCashier: (name: string) => void;
  toggleDark: () => void;

  addToCart: (product: Product, variant?: string) => void;
  updateQty: (lineId: string, qty: number) => void;
  updateItemDiscount: (lineId: string, d: number) => void;
  updateItemDiscountPercent: (lineId: string, percent: number) => void;
  updateNote: (lineId: string, note: string) => void;
  removeLine: (lineId: string) => void;
  clearCart: () => void;
  replaceCart: (items: CartItem[]) => void;

  holdOrder: (status?: "held" | "pending-payment") => void;
  dispatchCartToKitchen: () => void;
  recallOrder: (id: string) => void;
  setParkedStatus: (id: string, status: ParkedOrderStatus, reason?: string) => void;
  removeParkedHistory: (id: string) => void;
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
  settlePurchase: (purchaseId: string, amount: number, method: PaymentMethod, note?: string) => void;
  recordWaste: (productId: string, qty: number, reason: string) => void;
  setRecipe: (productId: string, lines: NonNullable<Product["recipe"]>) => void;
  addExpense: (e: Omit<Expense, "id">) => void;
  updateSettings: (s: Partial<Settings>) => void;
  refundOrder: (id: string) => void;
  requestRefund: (orderId: string, reason: string) => void;
  resolveRefundRequest: (id: string, approve: boolean) => void;
  setKitchenStatus: (id: string, status: "new" | "preparing" | "ready" | "served") => void;
  toggleKitchenItem: (orderId: string, lineId: string) => void;
  assignKitchenChef: (orderId: string, chef: string) => void;
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
      activityLog: [],
      refundRequests: [],
      settings: seedSettings,
      restaurantTables: initialTables,
      reservations: [],

      cart: [],
      heldOrders: [],
      parkedHistory: [],
      activeKitchenTicket: undefined,
      activeCategory: "all",
      search: "",
      orderType: "dine-in",
      table: undefined,
      customerId: "cu1",
      billDiscount: 0,
      currentCashier: "Admin",
      darkMode: false,

      addReservation: (input) => {
        const table = get().restaurantTables.find((t) => t.id === input.tableId && t.enabled);
        if (!table) throw new Error("Select an active table.");
        if (!input.guestName.trim()) throw new Error("Enter the guest name.");
        if (!Number.isInteger(input.guests) || input.guests < 1 || input.guests > table.seats) throw new Error(`This table seats up to ${table.seats} guests.`);
        const starts = Date.parse(input.startAt);
        if (!Number.isFinite(starts) || starts < Date.now() - 60_000) throw new Error("Select a valid future date and time.");
        if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 30 || input.durationMinutes > 240) throw new Error("Invalid reservation duration.");
        if (get().reservations.some((r) => r.tableId === table.id && (r.status === "seated" || (r.status === "booked" && bookingOverlap(starts, input.durationMinutes, Date.parse(r.startAt), r.durationMinutes))))) {
          throw new Error("This table is already booked for the chosen time.");
        }
        if (get().heldOrders.some((o) => o.orderType === "dine-in" && o.table === table.label) || (get().cart.length > 0 && get().orderType === "dine-in" && get().table === table.label)) {
          if (starts < Date.now() + 90 * 60_000) throw new Error("Table currently has an open order. Choose a later time.");
        }
        const reservation: TableReservation = { ...input, guestName: input.guestName.trim(), phone: input.phone.trim(), note: input.note?.trim(), id: shortId("R"), createdAt: new Date().toISOString(), status: "booked" };
        set({ reservations: [reservation, ...get().reservations] });
        return reservation;
      },
      updateReservationStatus: (id, status) => {
        const target = get().reservations.find((r) => r.id === id);
        if (!target) throw new Error("Reservation not found.");
        if (target.status === "cancelled" || target.status === "completed") throw new Error("Closed reservations cannot be changed.");
        if (status === "booked" && target.status !== "booked") throw new Error("Cannot reset an already seated reservation.");
        if (status === "seated" && target.status !== "booked") throw new Error("Only booked reservations can be seated.");
        if (status === "completed" && target.status !== "seated") throw new Error("Only seated reservations can be completed.");
        if (status === "seated") {
          const table = get().restaurantTables.find((t) => t.id === target.tableId);
          if (!table?.enabled) throw new Error("Table is unavailable.");
          if (get().reservations.some((r) => r.id !== id && r.tableId === target.tableId && r.status === "seated")) throw new Error("Another party is seated at this table.");
          if (get().heldOrders.some((o) => o.orderType === "dine-in" && o.table === table.label)) throw new Error("This table already has an open saved order.");
        }
        set({ reservations: get().reservations.map((r) => r.id === id ? { ...r, status } : r) });
      },
      addRestaurantTable: (input) => {
        const label = input.label.trim().toUpperCase();
        if (!/^[A-Z0-9-]{1,12}$/.test(label)) throw new Error("Use 1–12 letters, numbers or hyphens for the table name.");
        if (!Number.isInteger(input.seats) || input.seats < 1 || input.seats > 20) throw new Error("Enter 1–20 seats.");
        if (get().restaurantTables.some((t) => t.label.toUpperCase() === label)) throw new Error("Table name already exists.");
        set({ restaurantTables: [...get().restaurantTables, { id: shortId("T"), label, seats: input.seats, area: input.area, enabled: true }] });
      },
      setTableEnabled: (id, enabled) => {
        const table = get().restaurantTables.find((t) => t.id === id);
        if (!table) throw new Error("Table not found.");
        if (!enabled && (get().reservations.some((r) => r.tableId === id && ["booked", "seated"].includes(r.status) && Date.parse(r.startAt) + r.durationMinutes * 60_000 > Date.now()) || get().heldOrders.some((o) => o.table === table.label) || (get().cart.length > 0 && get().orderType === "dine-in" && get().table === table.label))) {
          throw new Error("Complete or cancel active reservations and orders before disabling this table.");
        }
        set({ restaurantTables: get().restaurantTables.map((t) => t.id === id ? { ...t, enabled } : t) });
      },
      setSearch: (s) => set({ search: s }),
      setCategory: (id) => set({ activeCategory: id }),
      setOrderType: (t) => set({ orderType: t }),
      setTable: (t) => set({ table: t }),
      setCustomer: (id) => set({ customerId: id }),
      setBillDiscount: (n) => set({ billDiscount: Number.isFinite(n) ? Math.max(0, n) : 0 }),
      setCurrentCashier: (name) => { if (!name.trim()) throw new Error("Enter a demo operator name."); set({ currentCashier: name.trim().slice(0, 60) }); },
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
          if (existing.discountPercent !== undefined) existing.discount = existing.unitPrice * existing.qty * existing.discountPercent / 100;
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
            unitCostSnapshot: product.cost,
          });
        }
        set({ cart });
      },
      updateQty: (lineId, qty) => set({
        cart: get().cart.map((c) => {
          if (c.lineId !== lineId || !Number.isFinite(qty)) return c;
          const nextQty = Math.max(1, Math.floor(qty));
          const nextSubtotal = c.unitPrice * nextQty;
          return { ...c, qty: nextQty, discount: c.discountPercent !== undefined
            ? nextSubtotal * c.discountPercent / 100
            : Math.min(nextSubtotal, c.discount) };
        }),
      }),
      updateItemDiscount: (lineId, d) => set({
        cart: get().cart.map((c) => c.lineId === lineId ? {
          ...c,
          discount: Number.isFinite(d) ? Math.min(c.unitPrice * c.qty, Math.max(0, d)) : c.discount,
          discountPercent: undefined,
        } : c),
      }),
      updateItemDiscountPercent: (lineId, percent) => set({
        cart: get().cart.map((c) => {
          if (c.lineId !== lineId || !Number.isFinite(percent)) return c;
          const safePercent = Math.min(100, Math.max(0, percent));
          return { ...c, discountPercent: safePercent, discount: c.unitPrice * c.qty * safePercent / 100 };
        }),
      }),
      updateNote: (lineId, note) => set({
        cart: get().cart.map((c) => c.lineId === lineId ? { ...c, note } : c),
      }),
      removeLine: (lineId) => set({ cart: get().cart.filter((c) => c.lineId !== lineId) }),
      clearCart: () => set({ cart: [], billDiscount: 0, table: undefined, activeKitchenTicket: undefined }),
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

      holdOrder: (status = "held") => {
        const { cart, orderType, table, customerId, billDiscount, currentCashier, heldOrders, activeKitchenTicket } = get();
        if (!cart.length) throw new Error("Add products before parking an order.");
        if (status !== "held" && status !== "pending-payment") throw new Error("Invalid parked order status.");
        const snapshot: ParkedOrder = {
          id: shortId("H"), at: todayISO(), updatedAt: todayISO(),
          cart: cart.map((item) => ({ ...item, modifiers: item.modifiers.map((mod) => ({ ...mod })) })),
          orderType, table, customerId, billDiscount, cashier: currentCashier, status,
          ...(activeKitchenTicket ? { ...activeKitchenTicket, id: activeKitchenTicket.id } : {}),
        };
        set({
          heldOrders: [...heldOrders, snapshot],
          cart: [], billDiscount: 0, table: undefined, activeKitchenTicket: undefined,
        });
      },
      dispatchCartToKitchen: () => {
        if (!get().cart.length) throw new Error("Add products before dispatching to kitchen.");
        if (get().activeKitchenTicket) throw new Error("This ticket is already in kitchen preparation.");
        get().holdOrder("pending-payment");
        const held = get().heldOrders.at(-1)!;
        const now = todayISO();
        set({
          heldOrders: get().heldOrders.map((order) => order.id === held.id ? { ...order, kitchenStatus: "new", kitchenDoneLineIds: [], kitchenDispatchedAt: now } : order),
          activityLog: [{ id: shortId("A"), createdAt: now, operator: get().currentCashier, action: "kitchen.dispatched_unpaid", subjectId: held.id, details: `Prepayment kitchen ticket ${held.id}` }, ...get().activityLog],
        });
      },
      recallOrder: (id) => {
        const { cart, heldOrders } = get();
        if (cart.length) throw new Error("Current cart is not empty. Hold or complete it before resuming another order.");
        const held = heldOrders.find((h) => h.id === id);
        if (!held || (held.status !== undefined && held.status !== "held" && held.status !== "pending-payment")) {
          throw new Error("This order is no longer available to resume.");
        }
        const products = get().products;
        for (const item of held.cart) {
          const product = products.find((p) => p.id === item.productId);
          if (!product || !product.available) throw new Error(`Product ${item.name} is no longer available.`);
          if (product.trackStock && held.cart.filter((i) => i.productId === item.productId).reduce((n, i) => n + i.qty, 0) > product.stock) {
            throw new Error(`Not enough stock for ${item.name}.`);
          }
        }
        set({
          cart: held.cart.map((item) => ({ ...item, modifiers: item.modifiers.map((mod) => ({ ...mod })) })),
          orderType: held.orderType, table: held.table, customerId: held.customerId,
          billDiscount: held.billDiscount ?? 0,
          heldOrders: heldOrders.filter((h) => h.id !== id),
          activeKitchenTicket: held.kitchenStatus ? { id: held.id, kitchenStatus: held.kitchenStatus, kitchenDoneLineIds: held.kitchenDoneLineIds, kitchenChef: held.kitchenChef, kitchenDispatchedAt: held.kitchenDispatchedAt } : undefined,
        });
      },
      setParkedStatus: (id, status, reason) => {
        const { heldOrders, parkedHistory } = get();
        const item = heldOrders.find((h) => h.id === id);
        if (!item) throw new Error("Order was not found in the active queue.");
        if (status === "cancelled" && !(reason ?? "").trim()) throw new Error("Please enter a cancellation reason.");
        if (!["held", "pending-payment", "cancelled", "ignored"].includes(status)) throw new Error("Invalid status.");
        const updated: ParkedOrder = { ...item, status, reason: reason?.trim(), updatedAt: todayISO() };
        if (status === "cancelled" || status === "ignored") {
          set({ heldOrders: heldOrders.filter((h) => h.id !== id), parkedHistory: [updated, ...parkedHistory] });
        } else {
          set({ heldOrders: heldOrders.map((h) => h.id === id ? updated : h) });
        }
      },
      removeParkedHistory: (id) => {
        set({ parkedHistory: get().parkedHistory.filter((h) => h.id !== id) });
      },
      deleteHeld: (id) => {
        // Legacy action: archive rather than silently deleting an order.
        get().setParkedStatus(id, "ignored", "Removed from active queue");
      },

      checkout: (paid, method) => {
        const { cart, billDiscount, settings, orderType, table, customerId, customers, currentCashier, products } = get();
        const t = cartTotals(cart, billDiscount, settings.serviceChargePct);
        if (cart.length === 0) throw new Error("Add at least one product before checkout.");
        if (!["cash", "card", "bank", "easypaisa", "jazzcash"].includes(method)) throw new Error("Invalid payment method.");
        if (orderType === "dine-in" && table && !get().restaurantTables.some((t) => t.label === table && t.enabled)) throw new Error("Selected table is unavailable.");
        if (!Number.isFinite(paid) || paid < t.total || paid < 0) {
          throw new Error("Payment must cover the total bill.");
        }
        const stockDemand = new Map<string, number>();
        for (const item of cart) {
          if (!Number.isInteger(item.qty) || item.qty < 1 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
            throw new Error("Cart contains an invalid item quantity or price.");
          }
          const product = products.find((p) => p.id === item.productId);
          if (!product || !product.available) throw new Error("A product in the cart is no longer available.");
          if (product.recipe?.length) {
            for (const ingredient of product.recipe) {
              stockDemand.set(ingredient.ingredientProductId, (stockDemand.get(ingredient.ingredientProductId) ?? 0) + ingredient.qty * item.qty);
            }
          } else if (product.trackStock) {
            stockDemand.set(product.id, (stockDemand.get(product.id) ?? 0) + item.qty);
          }
        }
        for (const [id, units] of stockDemand) {
          const product = products.find((p) => p.id === id);
          if (!product || !product.trackStock || units > product.stock + 0.000001) throw new Error(`Insufficient stock for ${product?.name ?? "recipe ingredient"}.`);
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
          kitchenTicketId: get().activeKitchenTicket?.id,
          reservationId: orderType === "dine-in" ? get().reservations.find((reservation) =>
            reservation.status === "seated" && get().restaurantTables.some((tableDef) => tableDef.id === reservation.tableId && tableDef.label === table))?.id : undefined,
          items: cart.map((item) => ({ ...item, modifiers: item.modifiers.map((m) => ({ ...m })), unitCostSnapshot: (() => {
            const product = products.find((p) => p.id === item.productId);
            return product?.recipe?.length ? product.recipe.reduce((sum, ingredient) =>
              sum + (products.find((p) => p.id === ingredient.ingredientProductId)?.cost ?? 0) * ingredient.qty, 0)
              : product?.cost ?? item.unitCostSnapshot ?? 0;
          })(), categoryIdSnapshot: products.find((p) => p.id === item.productId)?.categoryId ?? item.categoryIdSnapshot })),
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
          kitchenStatus: get().activeKitchenTicket?.kitchenStatus ?? "new",
          kitchenDoneLineIds: get().activeKitchenTicket?.kitchenDoneLineIds,
          kitchenChef: get().activeKitchenTicket?.kitchenChef,
        };
        // deduct stock
        const nextProducts = products.map((p) => {
          const consumed = stockDemand.get(p.id) ?? 0;
          return consumed > 0 ? { ...p, stock: Math.max(0, p.stock - consumed) } : p;
        });
        // update customer spend
        const nextCustomers = customers.map((c) => c.id === customerId
          ? { ...c, totalSpent: c.totalSpent + t.total, loyaltyPoints: c.loyaltyPoints + Math.floor(t.total / 100) }
          : c);
        set({
          orders: [order, ...get().orders],
          products: nextProducts,
          customers: nextCustomers,
          cart: [], billDiscount: 0, table: undefined, activeKitchenTicket: undefined,
          activityLog: [{ id: shortId("A"), createdAt: todayISO(), operator: currentCashier, action: "sale.completed", subjectId: order.id, details: order.invoiceNo }, ...get().activityLog],
        });
        return order;
      },

      upsertProduct: (p) => {
        const list = get().products;
        const idx = list.findIndex((x) => x.id === p.id);
        set({ products: idx >= 0 ? list.map((x) => x.id === p.id ? p : x) : [...list, p] });
      },
      deleteProduct: (id) => {
        const state = get();
        if (state.cart.some((line) => line.productId === id) || state.heldOrders.some((order) => order.cart.some((line) => line.productId === id)) ||
          state.orders.some((order) => order.items.some((line) => line.productId === id)) || state.purchases.some((purchase) => purchase.items.some((line) => line.productId === id)) || state.products.some((product) => product.recipe?.some((line) => line.ingredientProductId === id))) {
          throw new Error("This product is referenced by orders, stock purchases or an active cart. Mark it unavailable instead.");
        }
        set({ products: state.products.filter((p) => p.id !== id) });
      },
      upsertCategory: (c) => {
        const list = get().categories;
        const idx = list.findIndex((x) => x.id === c.id);
        set({ categories: idx >= 0 ? list.map((x) => x.id === c.id ? c : x) : [...list, c] });
      },
      deleteCategory: (id) => {
        if (get().products.some((p) => p.categoryId === id)) throw new Error("Category contains products. Reassign products before deleting.");
        set({ categories: get().categories.filter((c) => c.id !== id) });
      },
      upsertCustomer: (c) => {
        const list = get().customers;
        const idx = list.findIndex((x) => x.id === c.id);
        set({ customers: idx >= 0 ? list.map((x) => x.id === c.id ? c : x) : [...list, c] });
      },
      deleteCustomer: (id) => {
        if (get().orders.some((order) => order.customerId === id) || get().heldOrders.some((order) => order.customerId === id) || get().customerId === id && get().cart.length > 0) {
          throw new Error("Customer is linked to a completed or active order. Keep the record for history.");
        }
        set({ customers: get().customers.filter((c) => c.id !== id), customerId: get().customerId === id ? undefined : get().customerId });
      },
      upsertSupplier: (s) => {
        const list = get().suppliers;
        const idx = list.findIndex((x) => x.id === s.id);
        set({ suppliers: idx >= 0 ? list.map((x) => x.id === s.id ? s : x) : [...list, s] });
      },
      deleteSupplier: (id) => {
        const supplier = get().suppliers.find((s) => s.id === id);
        if (!supplier) return;
        if (get().purchases.some((p) => p.supplierId === id) || supplier.balance !== 0) {
          throw new Error("Supplier has purchase history or outstanding balance and cannot be deleted.");
        }
        set({ suppliers: get().suppliers.filter((s) => s.id !== id) });
      },

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
        set({ purchases: [purchase, ...get().purchases], products,
          suppliers: get().suppliers.map((supplier) => supplier.id === p.supplierId ? { ...supplier, balance: supplier.balance + (p.total - p.paid) } : supplier),
        });
      },
      settlePurchase: (purchaseId, amount, method, note) => {
        const purchase = get().purchases.find((p) => p.id === purchaseId);
        if (!purchase) throw new Error("Purchase not found.");
        const remaining = purchase.total - purchase.paid;
        if (!Number.isFinite(amount) || amount <= 0 || amount > remaining + 0.001) throw new Error("Enter an amount within the remaining purchase balance.");
        if (!["cash", "card", "bank", "easypaisa", "jazzcash"].includes(method)) throw new Error("Invalid settlement method.");
        const settlement: SupplierSettlement = { id: shortId("SP"), purchaseId, supplierId: purchase.supplierId, amount, method, date: todayISO(), note: note?.slice(0, 250) };
        set({
          purchases: get().purchases.map((p) => p.id === purchaseId ? { ...p, paid: p.paid + amount, settlements: [...(p.settlements ?? []), settlement] } : p),
          suppliers: get().suppliers.map((supplier) => supplier.id === purchase.supplierId ? { ...supplier, balance: Math.max(0, supplier.balance - amount) } : supplier),
          activityLog: [{ id: shortId("A"), createdAt: todayISO(), operator: get().currentCashier, action: "supplier.settlement", subjectId: purchaseId, details: `${amount} via ${method}` }, ...get().activityLog],
        });
      },
      recordWaste: (productId, qty, reason) => {
        const product = get().products.find((p) => p.id === productId);
        if (!product?.trackStock) throw new Error("Choose a tracked inventory item.");
        if (!Number.isInteger(qty) || qty < 1 || qty > product.stock) throw new Error("Waste quantity must be a whole number within available stock.");
        if (!reason.trim()) throw new Error("A waste reason is required.");
        set({
          products: get().products.map((p) => p.id === productId ? { ...p, stock: p.stock - qty } : p),
          activityLog: [{ id: shortId("A"), createdAt: todayISO(), operator: get().currentCashier, action: "inventory.waste", subjectId: productId, details: `${qty} units: ${reason.trim().slice(0,150)}` }, ...get().activityLog],
        });
      },
      setRecipe: (productId, lines) => {
        if (!get().products.some((p) => p.id === productId)) throw new Error("Recipe product not found.");
        if (!Array.isArray(lines) || lines.some((line) => line.ingredientProductId === productId ||
          !get().products.some((p) => p.id === line.ingredientProductId && p.trackStock && !p.recipe?.length) ||
          !Number.isFinite(line.qty) || line.qty <= 0)) throw new Error("Recipe ingredients and positive quantities must refer to tracked stock items.");
        if (lines.length && get().products.some((p) => p.id !== productId && p.recipe?.some((entry) => entry.ingredientProductId === productId))) throw new Error("A recipe ingredient cannot itself have another recipe.");
        set({
          products: get().products.map((p) => p.id === productId ? { ...p, recipe: lines } : p),
          activityLog: [{ id: shortId("A"), createdAt: todayISO(), operator: get().currentCashier, action: "recipe.updated", subjectId: productId, details: `${lines.length} ingredient lines` }, ...get().activityLog],
        });
      },
      addExpense: (e) => set({ expenses: [{ ...e, id: shortId("E") }, ...get().expenses] }),
      updateSettings: (s) => set({ settings: { ...get().settings, ...s } }),
      setKitchenStatus: (id, status) => set({
        heldOrders: get().heldOrders.map((held) => {
          if (held.id !== id || !held.kitchenStatus) return held;
          const steps: Record<string, string> = { new: "preparing", preparing: "ready", ready: "served" };
          if (steps[held.kitchenStatus] !== status) return held;
          if (status === "ready" && held.cart.some((item) => !(held.kitchenDoneLineIds ?? []).includes(item.lineId))) return held;
          return { ...held, kitchenStatus: status };
        }),
        activeKitchenTicket: get().activeKitchenTicket?.id === id
          ? (() => { const ticket = get().activeKitchenTicket!; const steps: Record<string, string> = { new: "preparing", preparing: "ready", ready: "served" };
            if (steps[ticket.kitchenStatus ?? "new"] !== status || status === "ready" && get().cart.some((item) => !(ticket.kitchenDoneLineIds ?? []).includes(item.lineId))) return ticket;
            return { ...ticket, kitchenStatus: status }; })()
          : get().activeKitchenTicket,
        orders: get().orders.map((order) => {
          if (order.id !== id || order.status !== "completed") return order;
          const current = order.kitchenStatus ?? "new";
          const transitions: Record<string, string> = { new: "preparing", preparing: "ready", ready: "served" };
          if (transitions[current] !== status) return order;
          if (status === "ready" && order.items.some((item) => !(order.kitchenDoneLineIds ?? []).includes(item.lineId))) return order;
          return { ...order, kitchenStatus: status };
        }),
      }),
      toggleKitchenItem: (orderId, lineId) => set({
        heldOrders: get().heldOrders.map((ticket) => {
          if (ticket.id !== orderId || ticket.kitchenStatus !== "preparing" || !ticket.cart.some((item) => item.lineId === lineId)) return ticket;
          const completed = ticket.kitchenDoneLineIds ?? [];
          return { ...ticket, kitchenDoneLineIds: completed.includes(lineId) ? completed.filter((id) => id !== lineId) : [...completed, lineId] };
        }),
        activeKitchenTicket: get().activeKitchenTicket?.id === orderId && get().activeKitchenTicket?.kitchenStatus === "preparing" && get().cart.some((item) => item.lineId === lineId)
          ? (() => { const ticket = get().activeKitchenTicket!; const ids = ticket.kitchenDoneLineIds ?? []; return { ...ticket, kitchenDoneLineIds: ids.includes(lineId) ? ids.filter((id) => id !== lineId) : [...ids, lineId] }; })()
          : get().activeKitchenTicket,
        orders: get().orders.map((order) => {
          if (order.id !== orderId || order.status !== "completed" || order.kitchenStatus !== "preparing" || !order.items.some((item) => item.lineId === lineId)) return order;
          const done = order.kitchenDoneLineIds ?? [];
          return { ...order, kitchenDoneLineIds: done.includes(lineId) ? done.filter((id) => id !== lineId) : [...done, lineId] };
        }),
      }),
      assignKitchenChef: (orderId, chef) => set({
        heldOrders: get().heldOrders.map((ticket) => ticket.id === orderId && (ticket.kitchenStatus === "new" || ticket.kitchenStatus === "preparing") ? { ...ticket, kitchenChef: chef.slice(0, 50) } : ticket),
        activeKitchenTicket: get().activeKitchenTicket?.id === orderId && ["new", "preparing"].includes(get().activeKitchenTicket?.kitchenStatus ?? "") ? { ...get().activeKitchenTicket, kitchenChef: chef.slice(0,50) } : get().activeKitchenTicket,
        orders: get().orders.map((order) =>
          order.id === orderId && order.status === "completed" && (order.kitchenStatus === "new" || order.kitchenStatus === "preparing") ?
          { ...order, kitchenChef: chef.slice(0, 50) } : order,
        ),
      }),
      requestRefund: (orderId, reason) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order || order.status !== "completed") throw new Error("Only completed sales may be submitted for refund review.");
        if (!reason.trim()) throw new Error("A refund reason is required.");
        if (get().refundRequests.some((request) => request.orderId === orderId && request.status === "pending")) throw new Error("This sale already has a pending refund request.");
        const eventTime = todayISO();
        set({
          refundRequests: [{ id: shortId("RR"), orderId, reason: reason.trim().slice(0, 300), requestedBy: get().currentCashier, status: "pending", createdAt: eventTime }, ...get().refundRequests],
          activityLog: [{ id: shortId("A"), createdAt: eventTime, operator: get().currentCashier, action: "refund.requested", subjectId: orderId, details: reason.trim().slice(0, 150) }, ...get().activityLog],
        });
      },
      resolveRefundRequest: (id, approve) => {
        const request = get().refundRequests.find((entry) => entry.id === id);
        if (!request || request.status !== "pending") throw new Error("Pending refund request not found.");
        const order = get().orders.find((entry) => entry.id === request.orderId);
        if (!order || order.status !== "completed") throw new Error("This sale is no longer eligible for a refund.");
        // Demo approval workflow, NOT server-side authorization.
        if (approve) get().refundOrder(request.orderId);
        const now = todayISO();
        set({
          refundRequests: get().refundRequests.map((entry) => entry.id === id ? { ...entry, status: approve ? "approved" : "rejected", resolvedBy: get().currentCashier, resolvedAt: now } : entry),
          activityLog: [{ id: shortId("A"), createdAt: now, operator: get().currentCashier, action: approve ? "refund.approved_demo" : "refund.rejected_demo", subjectId: request.orderId, details: request.reason }, ...get().activityLog],
        });
      },
      refundOrder: (id) => {
        const { orders, products, customers } = get();
        const order = orders.find((o) => o.id === id);
        if (!order || order.status === "refunded") return;
        // Mark refunded sale void; food already prepared or consumed is not automatically restockable.
        // Manual stock adjustments are handled by Inventory when physical goods are returned.
        const nextProducts = products;
        const nextCustomers = customers.map((c) => c.id === order.customerId
          ? { ...c, totalSpent: Math.max(0, c.totalSpent - order.total), loyaltyPoints: Math.max(0, c.loyaltyPoints - Math.floor(order.total / 100)) }
          : c);
        set({
          products: nextProducts,
          customers: nextCustomers,
          orders: orders.map((o) => o.id === id ? { ...o, status: "refunded" } : o),
          activityLog: [{ id: shortId("A"), createdAt: todayISO(), operator: get().currentCashier, action: "sale.refunded", subjectId: id, details: order.invoiceNo }, ...get().activityLog],
        });
      },
      resetAll: () => {
        if (hostedConfigPresent) throw new Error("Hosted workspace cannot be reset from the browser. Use account-owned database backups and administrator tooling.");
        localStorage.removeItem("spice-pos-v1");
        location.reload();
      },
    }),
    { name: "spice-pos-v1", storage: createJSONStorage(() =>
      typeof window !== "undefined" && !hostedConfigPresent ? window.localStorage : noBrowserStorage,
    ) },
  ),
);

export function useCartTotals() {
  const { cart, billDiscount, settings } = useStore();
  return cartTotals(cart, billDiscount, settings.serviceChargePct);
}
