export function money(n: number, currency = "PKR") {
  const v = Number.isFinite(n) ? n : 0;
  return `${currency} ${v.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

export function shortId(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function todayISO() {
  return new Date().toISOString();
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
}
