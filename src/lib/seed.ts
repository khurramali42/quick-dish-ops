import type { Category, Customer, Order, Product, Settings, Supplier } from "./types";

export const seedCategories: Category[] = [
  { id: "c1", name: "Burgers", icon: "🍔", sortOrder: 1, active: true },
  { id: "c2", name: "Pizza", icon: "🍕", sortOrder: 2, active: true },
  { id: "c3", name: "Biryani", icon: "🍛", sortOrder: 3, active: true },
  { id: "c4", name: "BBQ", icon: "🍢", sortOrder: 4, active: true },
  { id: "c5", name: "Rolls", icon: "🌯", sortOrder: 5, active: true },
  { id: "c6", name: "Fries", icon: "🍟", sortOrder: 6, active: true },
  { id: "c7", name: "Drinks", icon: "🥤", sortOrder: 7, active: true },
  { id: "c8", name: "Desserts", icon: "🍰", sortOrder: 8, active: true },
  { id: "c9", name: "Deals", icon: "🎁", sortOrder: 9, active: true },
];

export const seedProducts: Product[] = [
  { id: "p1", name: "Zinger Burger", categoryId: "c1", sku: "BR-001", price: 650, cost: 280, taxRate: 5, emoji: "🍔", available: true, featured: true, stock: 40, trackStock: true, prepTime: 8,
    variants: [{ id: "v1", name: "Regular", priceDelta: 0 }, { id: "v2", name: "Double", priceDelta: 250 }],
    modifiers: [{ id: "m1", name: "Extra Cheese", price: 80 }, { id: "m2", name: "Extra Sauce", price: 40 }] },
  { id: "p2", name: "Beef Burger", categoryId: "c1", sku: "BR-002", price: 750, cost: 320, taxRate: 5, emoji: "🍔", available: true, featured: false, stock: 30, trackStock: true, prepTime: 10 },
  { id: "p3", name: "Chicken Cheese Burger", categoryId: "c1", sku: "BR-003", price: 700, cost: 300, taxRate: 5, emoji: "🍔", available: true, featured: true, stock: 25, trackStock: true, prepTime: 9 },
  { id: "p4", name: "Fajita Pizza (Medium)", categoryId: "c2", sku: "PZ-001", price: 1450, cost: 620, taxRate: 5, emoji: "🍕", available: true, featured: true, stock: 20, trackStock: true, prepTime: 18,
    variants: [{ id: "v1", name: "Small", priceDelta: -400 }, { id: "v2", name: "Medium", priceDelta: 0 }, { id: "v3", name: "Large", priceDelta: 600 }] },
  { id: "p5", name: "Tikka Pizza", categoryId: "c2", sku: "PZ-002", price: 1550, cost: 660, taxRate: 5, emoji: "🍕", available: true, featured: false, stock: 15, trackStock: true, prepTime: 20 },
  { id: "p6", name: "Chicken Biryani", categoryId: "c3", sku: "BY-001", price: 450, cost: 180, taxRate: 5, emoji: "🍛", available: true, featured: true, stock: 60, trackStock: true, prepTime: 5 },
  { id: "p7", name: "Beef Biryani", categoryId: "c3", sku: "BY-002", price: 550, cost: 240, taxRate: 5, emoji: "🍛", available: true, featured: false, stock: 40, trackStock: true, prepTime: 5 },
  { id: "p8", name: "Chicken Tikka", categoryId: "c4", sku: "BQ-001", price: 480, cost: 210, taxRate: 5, emoji: "🍗", available: true, featured: false, stock: 30, trackStock: true, prepTime: 12 },
  { id: "p9", name: "Seekh Kebab (4 pcs)", categoryId: "c4", sku: "BQ-002", price: 520, cost: 220, taxRate: 5, emoji: "🍢", available: true, featured: true, stock: 35, trackStock: true, prepTime: 10 },
  { id: "p10", name: "Chicken Roll", categoryId: "c5", sku: "RL-001", price: 320, cost: 130, taxRate: 5, emoji: "🌯", available: true, featured: false, stock: 45, trackStock: true, prepTime: 6 },
  { id: "p11", name: "Beef Roll", categoryId: "c5", sku: "RL-002", price: 380, cost: 160, taxRate: 5, emoji: "🌯", available: true, featured: false, stock: 40, trackStock: true, prepTime: 7 },
  { id: "p12", name: "French Fries", categoryId: "c6", sku: "FR-001", price: 250, cost: 90, taxRate: 5, emoji: "🍟", available: true, featured: true, stock: 80, trackStock: true, prepTime: 4,
    variants: [{ id: "v1", name: "Regular", priceDelta: 0 }, { id: "v2", name: "Large", priceDelta: 100 }] },
  { id: "p13", name: "Loaded Fries", categoryId: "c6", sku: "FR-002", price: 420, cost: 170, taxRate: 5, emoji: "🍟", available: true, featured: false, stock: 30, trackStock: true, prepTime: 6 },
  { id: "p14", name: "Coca Cola 500ml", categoryId: "c7", sku: "DR-001", price: 120, cost: 70, taxRate: 5, emoji: "🥤", available: true, featured: false, stock: 100, trackStock: true, prepTime: 1 },
  { id: "p15", name: "Sprite 500ml", categoryId: "c7", sku: "DR-002", price: 120, cost: 70, taxRate: 5, emoji: "🥤", available: true, featured: false, stock: 100, trackStock: true, prepTime: 1 },
  { id: "p16", name: "Fresh Lime", categoryId: "c7", sku: "DR-003", price: 180, cost: 60, taxRate: 5, emoji: "🍹", available: true, featured: true, stock: 40, trackStock: true, prepTime: 3 },
  { id: "p17", name: "Chocolate Lava Cake", categoryId: "c8", sku: "DS-001", price: 320, cost: 130, taxRate: 5, emoji: "🍰", available: true, featured: true, stock: 20, trackStock: true, prepTime: 5 },
  { id: "p18", name: "Ice Cream Scoop", categoryId: "c8", sku: "DS-002", price: 180, cost: 60, taxRate: 5, emoji: "🍨", available: true, featured: false, stock: 50, trackStock: true, prepTime: 2 },
  { id: "p19", name: "Family Deal (2 Burgers + Fries + 2 Drinks)", categoryId: "c9", sku: "DL-001", price: 1650, cost: 720, taxRate: 5, emoji: "🎁", available: true, featured: true, stock: 20, trackStock: true, prepTime: 12 },
  { id: "p20", name: "Lunch Deal (Biryani + Drink)", categoryId: "c9", sku: "DL-002", price: 520, cost: 220, taxRate: 5, emoji: "🎁", available: true, featured: true, stock: 30, trackStock: true, prepTime: 5 },
];

export const seedCustomers: Customer[] = [
  { id: "cu1", name: "Walk-in", phone: "-", loyaltyPoints: 0, totalSpent: 0, createdAt: new Date().toISOString() },
  { id: "cu2", name: "Ahmed Khan", phone: "0300-1234567", email: "ahmed@example.com", address: "Gulberg, Lahore", loyaltyPoints: 45, totalSpent: 12400, createdAt: new Date().toISOString() },
  { id: "cu3", name: "Sara Ali", phone: "0321-9876543", address: "DHA Phase 5, Karachi", loyaltyPoints: 22, totalSpent: 6800, createdAt: new Date().toISOString() },
];

export const seedSuppliers: Supplier[] = [
  { id: "s1", name: "Metro Cash & Carry", contact: "Bilal", phone: "042-111-222-333", balance: 0 },
  { id: "s2", name: "K&Ns Poultry", contact: "Farhan", phone: "021-111-565-565", balance: 24500 },
  { id: "s3", name: "Fresh Vegetables Co.", contact: "Imran", phone: "0300-4455667", balance: 0 },
];

export const seedSettings: Settings = {
  businessName: "Spice Kitchen POS",
  branchName: "Main Branch — Gulberg",
  address: "MM Alam Road, Gulberg III, Lahore",
  phone: "+92 42 1234 5678",
  taxNumber: "STRN 3277-2024",
  currency: "PKR",
  receiptFooter: "Thank you for dining with us!",
  receiptSize: "80mm",
  defaultTaxRate: 5,
  serviceChargePct: 0,
  logoEmoji: "🍽️",
};

export const seedOrders: Order[] = [];
