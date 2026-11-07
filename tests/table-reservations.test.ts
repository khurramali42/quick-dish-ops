import { beforeEach, describe, expect, test } from "bun:test";
import { useStore } from "../src/lib/store";
import type { RestaurantTable } from "../src/lib/types";

const tables: RestaurantTable[] = [
  { id: "T1", label: "T1", seats: 2, area: "Main Hall", enabled: true },
  { id: "T2", label: "T2", seats: 4, area: "Main Hall", enabled: true },
];

beforeEach(() => {
  useStore.setState({
    restaurantTables: structuredClone(tables),
    reservations: [],
    cart: [],
    heldOrders: [],
    table: undefined,
    orderType: "dine-in",
  });
});

const booking = (minutesFromNow = 120, tableId = "T1") => ({
  tableId,
  guestName: "Demo Guest",
  phone: "03000000000",
  guests: 2,
  startAt: new Date(Date.now() + minutesFromNow * 60_000).toISOString(),
  durationMinutes: 90,
  note: "Near window",
});

describe("table reservation integrity", () => {
  test("blocks overlapping reservations and over-capacity bookings", () => {
    useStore.getState().addReservation(booking());
    expect(() => useStore.getState().addReservation(booking(150))).toThrow(/already booked/);
    expect(() => useStore.getState().addReservation({ ...booking(300), guests: 3 })).toThrow(/seats/);
    expect(useStore.getState().reservations).toHaveLength(1);
  });

  test("allows nonoverlapping times and different tables", () => {
    useStore.getState().addReservation(booking());
    useStore.getState().addReservation(booking(220));
    useStore.getState().addReservation(booking(120, "T2"));
    expect(useStore.getState().reservations).toHaveLength(3);
  });

  test("seating keeps a table blocked until visit is completed", () => {
    const reservation = useStore.getState().addReservation(booking());
    useStore.getState().updateReservationStatus(reservation.id, "seated");
    expect(() => useStore.getState().addReservation(booking(500))).toThrow(/already booked/);
    useStore.getState().updateReservationStatus(reservation.id, "completed");
    useStore.getState().addReservation(booking(500));
    expect(useStore.getState().reservations.filter((r) => r.status === "booked")).toHaveLength(1);
  });

  test("occupied tables cannot be disabled", () => {
    const reservation = useStore.getState().addReservation(booking());
    expect(() => useStore.getState().setTableEnabled("T1", false)).toThrow(/active reservations/);
    useStore.getState().updateReservationStatus(reservation.id, "cancelled");
    useStore.getState().setTableEnabled("T1", false);
    expect(() => useStore.getState().addReservation(booking())).toThrow(/active table/);
  });

  test("table names must be unique and seating capacity valid", () => {
    expect(() => useStore.getState().addRestaurantTable({ label: "t1", seats: 4, area: "Terrace" })).toThrow(/already exists/);
    useStore.getState().addRestaurantTable({ label: "VIP-1", seats: 8, area: "Private" });
    expect(useStore.getState().restaurantTables.some((t) => t.label === "VIP-1")).toBe(true);
  });
});
