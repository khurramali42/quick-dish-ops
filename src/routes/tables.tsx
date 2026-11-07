import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import type { RestaurantTable, ReservationStatus } from "@/lib/types";
import { toast } from "sonner";
import { CalendarDays, Users, Utensils, Plus, Clock3, Search, CheckCircle2, Ban, Armchair, ArrowRight, MapPin, X, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/tables")({
  head: () => ({ meta: [{ title: "Tables & Reservations — Spice Kitchen" }] }),
  component: TablesPage,
});

function localTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function statusColor(status: string) {
  return status === "occupied" ? "border-orange-300 bg-orange-50/80 text-orange-700 dark:bg-orange-950/20 dark:text-orange-200"
    : status === "reserved" ? "border-sky-300 bg-sky-50/80 text-sky-700 dark:bg-sky-950/20 dark:text-sky-200"
      : status === "disabled" ? "border-border bg-muted/50 text-muted-foreground" : "border-emerald-200 bg-emerald-50/40 text-emerald-700 dark:bg-emerald-950/10 dark:text-emerald-300";
}
type TableStatus = "available" | "occupied" | "reserved" | "disabled";

function TablesPage() {
  const navigate = useNavigate();
  const { restaurantTables, reservations, heldOrders, cart, table: currentTable, orderType, setOrderType, setTable, addReservation, updateReservationStatus, addRestaurantTable, setTableEnabled } = useStore();
  const [area, setArea] = useState("All Areas");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RestaurantTable | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [newTableOpen, setNewTableOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState(2);
  const [startAt, setStartAt] = useState(localTimeInput(new Date(Date.now() + 60 * 60_000)));
  const [duration, setDuration] = useState(90);
  const [note, setNote] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newSeats, setNewSeats] = useState(4);
  const [newArea, setNewArea] = useState<RestaurantTable["area"]>("Main Hall");
  const [bookingFilter, setBookingFilter] = useState("Upcoming");
  const now = Date.now();
  const validReservation = (r: typeof reservations[number]) => ["booked", "seated"].includes(r.status) && Date.parse(r.startAt) + r.durationMinutes * 60_000 > now;
  const statusFor = (t: RestaurantTable): TableStatus => {
    if (!t.enabled) return "disabled";
    if (reservations.some((r) => r.tableId === t.id && r.status === "seated") || heldOrders.some((o) => o.orderType === "dine-in" && o.table === t.label) || (cart.length > 0 && orderType === "dine-in" && currentTable === t.label)) return "occupied";
    if (reservations.some((r) => r.tableId === t.id && r.status === "booked" && Date.parse(r.startAt) <= now + 90 * 60_000 && Date.parse(r.startAt) + r.durationMinutes * 60_000 > now)) return "reserved";
    return "available";
  };
  const visible = restaurantTables.filter((t) => (area === "All Areas" || t.area === area) && (t.label.toLowerCase().includes(query.trim().toLowerCase()) || t.area.toLowerCase().includes(query.trim().toLowerCase())));
  const stats = {
    available: restaurantTables.filter((t) => statusFor(t) === "available").length,
    occupied: restaurantTables.filter((t) => statusFor(t) === "occupied").length,
    reserved: restaurantTables.filter((t) => statusFor(t) === "reserved").length,
    disabled: restaurantTables.filter((t) => statusFor(t) === "disabled").length,
  };
  const chosen = selected && restaurantTables.find((t) => t.id === selected.id);
  const chosenStatus = chosen ? statusFor(chosen) : "available";
  const chosenBookings = useMemo(() => reservations.filter((r) => r.tableId === selected?.id && r.status !== "cancelled").sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)), [reservations, selected?.id]);
  const displayedBookings = reservations
    .filter((r) => bookingFilter === "All" || (bookingFilter === "Upcoming" ? ["booked", "seated"].includes(r.status) && Date.parse(r.startAt) + r.durationMinutes * 60_000 > now : r.status === bookingFilter.toLowerCase()))
    .sort((a, b) => bookingFilter === "Upcoming" ? Date.parse(a.startAt) - Date.parse(b.startAt) : Date.parse(b.startAt) - Date.parse(a.startAt)).slice(0, 25);

  const startOrder = (t: RestaurantTable) => {
    if (cart.length && (currentTable !== t.label || orderType !== "dine-in")) {
      toast.error("Current cart has items. Complete or save it before switching tables.");
      return;
    }
    if (heldOrders.some((o) => o.table === t.label && o.orderType === "dine-in")) {
      toast.error("This table has a saved order. Resume it from the POS order list.");
      navigate({ to: "/pos" });
      return;
    }
    setOrderType("dine-in");
    setTable(t.label);
    navigate({ to: "/pos" });
  };
  const openBooking = (t?: RestaurantTable) => {
    if (t) setSelected(t);
    setGuestName(""); setPhone(""); setNote(""); setGuests(Math.min(2, t?.seats ?? chosen?.seats ?? 2));
    setStartAt(localTimeInput(new Date(Date.now() + 60 * 60_000)));
    setBookingOpen(true);
  };
  const saveBooking = () => {
    if (!chosen) return;
    try {
      addReservation({ tableId: chosen.id, guestName, phone, guests, startAt: new Date(startAt).toISOString(), durationMinutes: duration, note });
      toast.success("Table reservation saved");
      setBookingOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save reservation."); }
  };
  const changeStatus = (id: string, status: ReservationStatus) => {
    try { updateReservationStatus(id, status); toast.success(status === "seated" ? "Guests seated" : `Reservation ${status}`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not update reservation"); }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1540px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><div className="flex items-center gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-brand dark:bg-accent"><Armchair className="h-5 w-5" /></span><h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Tables & Reservations</h1></div><p className="mt-1 text-sm text-muted-foreground">Manage your floor, reserve seats and start dine-in orders from one screen</p></div>
          <div className="flex gap-2"><button onClick={() => setNewTableOpen(true)} className="rounded-lg border bg-card px-3 py-2.5 text-xs font-semibold hover:bg-accent"><Plus className="mr-1 inline h-4 w-4" /> Add Table</button><button onClick={() => { const t = chosen ?? restaurantTables.find((item) => item.enabled); if (!t) return toast.error("Add an active table first."); openBooking(t); }} className="rounded-lg bg-brand-gradient px-3 py-2.5 text-xs font-bold text-brand-foreground"><CalendarDays className="mr-1 inline h-4 w-4" /> New Booking</button></div>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {([["Available", stats.available, "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"], ["Occupied", stats.occupied, "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300"], ["Reserved Soon", stats.reserved, "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300"], ["Out of Service", stats.disabled, "bg-muted text-muted-foreground"]] as const).map(([label, count, color]) => <div key={label} className="rounded-xl border bg-card p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-muted-foreground">{label}</span><span className={`h-2.5 w-2.5 rounded-full ${color.split(" ")[0]}`} /></div><p className="mt-2 text-2xl font-extrabold tabular-nums">{count.toString().padStart(2, "0")}</p></div>)}
        </div>
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 overflow-hidden rounded-2xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5"><div><h2 className="text-base font-extrabold">Restaurant Floor</h2><p className="text-xs text-muted-foreground">Select a table to view bookings or start service</p></div><div className="relative"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find table" placeholder="Find table..." className="h-9 w-40 rounded-lg border bg-background pl-8 pr-2 text-xs" /></div></div>
            <div className="flex flex-wrap gap-2 border-b px-4 py-3 sm:px-5">{["All Areas", "Main Hall", "Terrace", "Private"].map((item) => <button key={item} onClick={() => setArea(item)} aria-pressed={area === item} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${area === item ? "bg-brand-gradient text-brand-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{item}</button>)}</div>
            <div className="grid grid-cols-2 gap-3 bg-muted/20 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-4 2xl:grid-cols-5">
              {visible.map((t) => { const status = statusFor(t); return <button key={t.id} onClick={() => setSelected(t)} aria-pressed={selected?.id === t.id} className={`group flex min-h-36 flex-col items-center justify-center rounded-2xl border-2 p-3 text-center transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring ${statusColor(status)} ${selected?.id === t.id ? "ring-2 ring-brand ring-offset-2" : ""}`}>
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-card/75 shadow-sm"><Utensils className="h-5 w-5" /></div>
                <span className="text-lg font-extrabold">{t.label}</span><span className="mt-1 text-[11px] font-semibold capitalize">{status === "reserved" ? "Reserved soon" : status === "disabled" ? "Out of service" : status}</span><span className="mt-1 flex items-center gap-1 text-[11px] opacity-75"><Users className="h-3 w-3" /> {t.seats} seats</span>
              </button>; })}
              {visible.length === 0 && <div className="col-span-full py-14 text-center text-sm text-muted-foreground">No matching tables.</div>}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t px-5 py-3 text-[11px] text-muted-foreground">{[["Available", "bg-emerald-500"], ["Occupied", "bg-orange-500"], ["Reserved", "bg-sky-500"], ["Unavailable", "bg-slate-400"]].map(([label, color]) => <span key={label} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>)}</div>
          </section>
          <aside className="overflow-hidden rounded-2xl border bg-card">
            <div className="border-b p-4"><h2 className="text-base font-extrabold">Table Details</h2><p className="mt-1 text-xs text-muted-foreground">Bookings and available actions</p></div>
            {chosen ? <div className="space-y-4 p-4">
              <div className="rounded-xl bg-muted/45 p-4"><div className="flex items-center justify-between"><span className="text-2xl font-extrabold">{chosen.label}</span><span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${statusColor(chosenStatus)}`}>{chosenStatus}</span></div><div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{chosen.seats} guests</span><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{chosen.area}</span></div></div>
              <div className="grid grid-cols-2 gap-2"><button disabled={!chosen.enabled} onClick={() => openBooking(chosen)} className="rounded-lg border px-2 py-2.5 text-xs font-bold hover:bg-accent disabled:opacity-40"><CalendarDays className="mr-1 inline h-3.5 w-3.5" /> Reserve</button><button disabled={!chosen.enabled || chosenStatus === "occupied" && !((currentTable === chosen.label) && orderType === "dine-in")} onClick={() => startOrder(chosen)} className="rounded-lg bg-brand-gradient px-2 py-2.5 text-xs font-bold text-brand-foreground disabled:opacity-40"><ArrowRight className="mr-1 inline h-3.5 w-3.5" /> Open POS</button></div>
              <div><h3 className="mb-2 text-xs font-extrabold">Reservations</h3><div className="max-h-72 space-y-2 overflow-y-auto">{chosenBookings.length ? chosenBookings.slice(0, 8).map((r) => <div key={r.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold">{r.guestName}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize">{r.status}</span></div><p className="mt-1 text-[11px] text-muted-foreground">{new Date(r.startAt).toLocaleString()} · {r.guests} guests</p>{r.note && <p className="mt-1 text-[11px]">{r.note}</p>}<div className="mt-2 flex flex-wrap gap-1.5">{r.status === "booked" && <><button onClick={() => changeStatus(r.id, "seated")} className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Seat guests</button><button onClick={() => changeStatus(r.id, "cancelled")} className="rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-700">Cancel</button></>}{r.status === "seated" && <button onClick={() => changeStatus(r.id, "completed")} className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold">Finish visit</button>}</div></div>) : <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">No bookings for this table</div>}</div></div>
              <button onClick={() => { try { setTableEnabled(chosen.id, !chosen.enabled); toast.success(chosen.enabled ? "Table out of service" : "Table enabled"); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update table"); } }} className="w-full border-t pt-3 text-left text-xs text-muted-foreground hover:text-foreground">{chosen.enabled ? "Mark table out of service" : "Enable table for bookings"}</button>
            </div> : <div className="px-5 py-16 text-center text-sm text-muted-foreground"><Armchair className="mx-auto mb-3 h-10 w-10 opacity-30" />Choose a table from the floor map to view details</div>}
          </aside>
        </div>
        <section className="mt-5 overflow-hidden rounded-2xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5"><div><h2 className="text-base font-extrabold">Reservation Schedule</h2><p className="text-xs text-muted-foreground">Bookings are saved in this browser</p></div><div className="flex gap-1 rounded-lg bg-muted p-1">{["Upcoming", "All", "Completed", "Cancelled"].map((f) => <button key={f} onClick={() => setBookingFilter(f)} className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${bookingFilter === f ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{f}</button>)}</div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-muted/40 text-muted-foreground"><tr><th className="px-5 py-3">Guest</th><th className="px-3 py-3">Table</th><th className="px-3 py-3">Date & Time</th><th className="px-3 py-3">Party</th><th className="px-3 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y">{displayedBookings.map((r) => <tr key={r.id} className="hover:bg-muted/20"><td className="px-5 py-3"><div className="font-semibold">{r.guestName}</div><div className="text-[11px] text-muted-foreground">{r.phone || "No phone"}</div></td><td className="px-3 py-3 font-bold">{restaurantTables.find((t) => t.id === r.tableId)?.label ?? "—"}</td><td className="px-3 py-3">{new Date(r.startAt).toLocaleString()}</td><td className="px-3 py-3">{r.guests}</td><td className="px-3 py-3"><span className="rounded-full bg-muted px-2 py-1 font-semibold capitalize">{r.status}</span></td><td className="px-5 py-3 text-right">{r.status === "booked" ? <button onClick={() => changeStatus(r.id, "seated")} className="font-bold text-brand">Seat guest <ChevronRight className="inline h-3 w-3" /></button> : r.status === "seated" ? <button onClick={() => changeStatus(r.id, "completed")} className="font-bold text-brand">Complete</button> : <span className="text-muted-foreground">—</span>}</td></tr>)}{displayedBookings.length === 0 && <tr><td colSpan={6} className="py-14 text-center text-sm text-muted-foreground">No reservations in this view. Create a booking to begin.</td></tr>}</tbody></table></div>
        </section>
      </div>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Reserve {chosen?.label ?? "Table"}</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-3 text-sm"><label className="col-span-2 space-y-1 text-xs font-semibold">Guest name<input autoFocus value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={80} placeholder="Guest full name" className="h-10 w-full rounded-lg border bg-background px-3 text-sm" /></label><label className="space-y-1 text-xs font-semibold">Phone (optional)<input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} placeholder="03xx..." className="h-10 w-full rounded-lg border bg-background px-3 text-sm" /></label><label className="space-y-1 text-xs font-semibold">Guests<input type="number" min={1} max={chosen?.seats ?? 20} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="h-10 w-full rounded-lg border bg-background px-3 text-sm" /></label><label className="col-span-2 space-y-1 text-xs font-semibold">Reservation date & time<input type="datetime-local" min={localTimeInput(new Date())} value={startAt} onChange={(e) => setStartAt(e.target.value)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm" /></label><label className="col-span-2 space-y-1 text-xs font-semibold">Duration<select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">{[60,90,120,150,180,240].map((v) => <option key={v} value={v}>{v} minutes</option>)}</select></label><label className="col-span-2 space-y-1 text-xs font-semibold">Notes (optional)<textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={240} rows={2} className="w-full rounded-lg border bg-background p-3 text-sm" placeholder="Special requests..." /></label></div><p className="text-xs text-muted-foreground">Bookings with overlapping times for the same table are rejected automatically.</p><div className="flex justify-end gap-2"><button onClick={() => setBookingOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button onClick={saveBooking} className="rounded-lg bg-brand-gradient px-4 py-2 text-sm font-bold text-brand-foreground">Confirm Booking</button></div></DialogContent></Dialog>
      <Dialog open={newTableOpen} onOpenChange={setNewTableOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Add Restaurant Table</DialogTitle></DialogHeader><div className="space-y-3"><label className="block space-y-1 text-xs font-semibold">Table name<input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} maxLength={12} placeholder="e.g. T13" className="h-10 w-full rounded-lg border bg-background px-3 text-sm" /></label><label className="block space-y-1 text-xs font-semibold">Number of seats<input type="number" min={1} max={20} value={newSeats} onChange={(e) => setNewSeats(Number(e.target.value))} className="h-10 w-full rounded-lg border bg-background px-3 text-sm" /></label><label className="block space-y-1 text-xs font-semibold">Area<select value={newArea} onChange={(e) => setNewArea(e.target.value as RestaurantTable["area"])} className="h-10 w-full rounded-lg border bg-background px-3 text-sm"><option>Main Hall</option><option>Terrace</option><option>Private</option></select></label></div><button onClick={() => { try { addRestaurantTable({ label: newLabel, seats: newSeats, area: newArea }); setNewTableOpen(false); setNewLabel(""); toast.success("Table added"); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to add table."); } }} className="h-11 rounded-lg bg-brand-gradient text-sm font-bold text-brand-foreground">Add Table</button></DialogContent></Dialog>
    </AppLayout>
  );
}
