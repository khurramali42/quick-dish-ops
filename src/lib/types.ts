export type OrderType = "dine-in" | "takeaway" | "delivery" | "pickup";
export type OrderStatus = "pending" | "in-kitchen" | "ready" | "completed" | "cancelled" | "refunded";
export type PaymentMethod = "cash" | "card" | "bank" | "easypaisa" | "jazzcash";

export interface RestaurantTable {
  id: string;
  label: string;
  seats: number;
  area: "Main Hall" | "Terrace" | "Private";
  enabled: boolean;
}

export type ReservationStatus = "booked" | "seated" | "completed" | "cancelled";
export interface TableReservation {
  id: string;
  tableId: string;
  guestName: string;
  phone: string;
  guests: number;
  startAt: string;
  durationMinutes: number;
  note?: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  active: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  priceDelta: number;
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  sku: string;
  price: number;
  cost: number;
  taxRate: number; // percent
  image?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  imageMimeType?: string;
  imageFileSize?: number;
  imageAltText?: string;
  imageUploadedAt?: string;
  emoji?: string;
  available: boolean;
  featured: boolean;
  stock: number; // simple product stock (units)
  trackStock: boolean;
  prepTime: number; // minutes
  recipe?: { ingredientProductId: string; qty: number }[]; // quantity per sold unit; use ingredient stock rather than finished-product stock
  variants?: ProductVariant[];
  modifiers?: Modifier[];
  description?: string;
  isDeal?: boolean;
}

export interface CartItem {
  lineId: string;
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  variant?: string;
  modifiers: Modifier[];
  note?: string;
  discount: number; // absolute monetary discount on entire line
  discountPercent?: number; // optional 0-100%; retains percentage when quantity changes
  unitCostSnapshot?: number; // cost at time of sale, for historical profit calculations
  categoryIdSnapshot?: string; // category at time of sale for historical reporting
  taxRate: number;
}

export type ParkedOrderStatus = "held" | "pending-payment" | "cancelled" | "ignored";

export interface ParkedOrder {
  id: string;
  at: string;
  updatedAt?: string;
  cart: CartItem[];
  orderType: OrderType;
  table?: string;
  customerId?: string;
  billDiscount?: number;
  status?: ParkedOrderStatus; // Legacy held orders have no status.
  reason?: string;
  cashier?: string;
  kitchenStatus?: "new" | "preparing" | "ready" | "served";
  kitchenDoneLineIds?: string[];
  kitchenChef?: string;
  kitchenDispatchedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  totalSpent: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email?: string;
  balance: number;
}

export interface Order {
  id: string;
  invoiceNo: string;
  createdAt: string;
  cashier: string;
  customerId?: string;
  customerName?: string;
  table?: string;
  orderType: OrderType;
  items: CartItem[];
  subtotal: number;
  itemDiscount: number;
  billDiscount: number;
  tax: number;
  serviceCharge: number;
  deliveryCharge: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  kitchenStatus?: "new" | "preparing" | "ready" | "served";
  kitchenDoneLineIds?: string[];
  kitchenChef?: string;
  note?: string;
}

export interface SupplierSettlement {
  id: string;
  purchaseId: string;
  supplierId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  note?: string;
}

export interface ActivityEvent {
  id: string;
  createdAt: string;
  action: string;
  subjectId: string;
  operator: string;
  details: string;
}

export interface Purchase {
  id: string;
  invoiceNo: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: { productId: string; name: string; qty: number; cost: number }[];
  total: number;
  paid: number;
  settlements?: SupplierSettlement[];
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  paidTo?: string;
  method: PaymentMethod;
  note?: string;
}

export interface Settings {
  businessName: string;
  branchName: string;
  address: string;
  phone: string;
  taxNumber: string;
  currency: string;
  receiptFooter: string;
  receiptSize: "58mm" | "80mm" | "A4";
  defaultTaxRate: number;
  serviceChargePct: number;
  logoEmoji: string;
}
