import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { money } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Spice Kitchen POS" }] }),
  component: ReportsPage,
});

const COLORS = ["oklch(0.72 0.19 45)", "oklch(0.68 0.16 155)", "oklch(0.55 0.2 260)", "oklch(0.8 0.15 85)", "oklch(0.6 0.22 27)"];

function ReportsPage() {
  const { orders, products, expenses, settings, categories } = useStore();

  const grossSales = orders.filter((o) => o.status !== "refunded").reduce((s, o) => s + o.total, 0);
  const totalCost = orders.filter((o) => o.status !== "refunded").reduce((s, o) =>
    s + o.items.reduce((c, i) => c + (products.find((p) => p.id === i.productId)?.cost ?? 0) * i.qty, 0), 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const totalTax = orders.reduce((s, o) => s + o.tax, 0);
  const totalDiscount = orders.reduce((s, o) => s + o.itemDiscount + o.billDiscount, 0);
  const netProfit = grossSales - totalCost - totalExpense;

  const salesByCat = useMemo(() => categories.map((c) => {
    const revenue = orders.reduce((s, o) => s + o.items.reduce((r, i) => {
      const p = products.find((p) => p.id === i.productId);
      return p?.categoryId === c.id ? r + i.unitPrice * i.qty : r;
    }, 0), 0);
    return { name: c.name, revenue };
  }).filter((x) => x.revenue > 0), [orders, products, categories]);

  const byMethod = useMemo(() => {
    const m: Record<string, number> = {};
    orders.filter((o) => o.status !== "refunded").forEach((o) => { m[o.paymentMethod] = (m[o.paymentMethod] ?? 0) + o.total; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [orders]);

  return (
    <AppLayout>
      <PageHeader title="Reports & Analytics" subtitle="Sales, profit and business health" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Gross Sales" value={money(grossSales, settings.currency)} />
        <Stat label="Cost of Goods" value={money(totalCost, settings.currency)} />
        <Stat label="Expenses" value={money(totalExpense, settings.currency)} />
        <Stat label="Net Profit" value={money(netProfit, settings.currency)} accent />
        <Stat label="Tax Collected" value={money(totalTax, settings.currency)} />
        <Stat label="Discounts Given" value={money(totalDiscount, settings.currency)} />
        <Stat label="Orders" value={String(orders.length)} />
        <Stat label="Avg Ticket" value={money(orders.length ? grossSales / orders.length : 0, settings.currency)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-elevated p-5">
          <h3 className="font-semibold mb-4">Sales by Category</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByCat}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.006 260)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => money(v, settings.currency)} />
                <Bar dataKey="revenue" fill="oklch(0.72 0.19 45)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elevated p-5">
          <h3 className="font-semibold mb-4">Payment Methods</h3>
          <div className="h-72">
            {byMethod.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No sales yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byMethod} dataKey="value" nameKey="name" outerRadius={100} label>
                    {byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => money(v, settings.currency)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card-elevated p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`text-xl md:text-2xl font-semibold mt-1 ${accent ? "text-brand" : ""}`} style={accent ? { color: "oklch(0.65 0.2 25)" } : {}}>{value}</div>
    </div>
  );
}
