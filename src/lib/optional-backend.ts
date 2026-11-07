import { useStore } from "./store";

/**
 * Optional, owner-scoped Supabase backend. Developers supply their OWN project
 * URL and publishable/anon key at build time. Never use service_role keys.
 *
 * No configured backend => the original, explicitly local-only demo remains.
 * One authenticated account owns one workspace, protected by Postgres RLS.
 * Saves use optimistic concurrency through an invoker-rights SQL RPC.
 */
export const backendUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
export const backendKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
export const backendConfigured = Boolean(backendUrl || backendKey);
export const backendConfigError = !backendConfigured ? "" :
  !backendUrl || !backendKey ? "Both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required." :
  !/^https:\/\//.test(backendUrl) && !/^http:\/\/localhost(?::\d+)?$/.test(backendUrl) ?
    "Backend URL must use HTTPS (or localhost for development)." :
  /^(sb_secret_|service_role)/i.test(backendKey) ?
    "Secret/service-role keys must NEVER be used in browser configuration." : "";

const sessionKey = "quick-dish-backend-session";
const stateFields = [
  "categories", "products", "customers", "suppliers", "orders",
  "purchases", "expenses", "activityLog", "refundRequests", "settings",
  "restaurantTables", "reservations", "cart", "heldOrders", "parkedHistory",
  "activeKitchenTicket", "orderType", "table", "customerId",
  "billDiscount", "currentCashier",
] as const;

type Snapshot = Record<string, unknown>;
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email?: string };
}
interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id: string; email?: string };
  error_description?: string;
  msg?: string;
}
export interface Workspace { revision: number; data: Snapshot }
export class BackendError extends Error {
  constructor(message: string, public readonly status: number = 0) { super(message); }
}

function headers(token?: string): Record<string, string> {
  return { apikey: backendKey, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function api(path: string, options: RequestInit = {}, token?: string): Promise<unknown> {
  const response = await fetch(backendUrl + path, { ...options, headers: { ...headers(token), ...(options.headers as Record<string, string> ?? {}) }, cache: "no-store" });
  if (response.status === 204) return null;
  const text = await response.text();
  let payload: unknown;
  try { payload = JSON.parse(text); } catch { payload = text; }
  if (!response.ok) {
    const info = payload as { message?: string; msg?: string; error_description?: string; details?: string } | null;
    throw new BackendError(info?.error_description || info?.message || info?.msg || `Backend returned HTTP ${response.status}`, response.status);
  }
  return payload;
}
function normalizeAuth(value: AuthResponse): AuthSession {
  if (!value.access_token || !value.refresh_token || !value.user?.id) throw new BackendError("Sign-in did not return an authenticated session. Confirm your email if required.");
  return { access_token: value.access_token, refresh_token: value.refresh_token, expires_at: Date.now() + (value.expires_in ?? 3600) * 1000, user: value.user };
}
export async function signIn(email: string, password: string): Promise<AuthSession> {
  return normalizeAuth(await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) }) as AuthResponse);
}
export async function signUp(email: string, password: string): Promise<boolean> {
  const value = await api("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) }) as AuthResponse;
  return Boolean(value.access_token);
}
export function saveSession(session: AuthSession) {
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem(sessionKey, JSON.stringify(session));
}
export function savedSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(sessionKey);
    if (!raw) return null;
    const data = JSON.parse(raw) as AuthSession;
    return data?.user?.id && data?.refresh_token ? data : null;
  } catch { return null; }
}
export function forgetSession() { if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(sessionKey); }
export async function ensureSession(session: AuthSession): Promise<AuthSession> {
  if (session.expires_at > Date.now() + 90_000) return session;
  const next = normalizeAuth(await api("/auth/v1/token?grant_type=refresh_token", {
    method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }),
  }) as AuthResponse);
  if (next.user.id !== session.user.id) throw new BackendError("Session identity changed. Please sign in again.");
  saveSession(next);
  return next;
}
export async function signOut(session: AuthSession) {
  try { await api("/auth/v1/logout", { method: "POST" }, session.access_token); }
  finally { forgetSession(); }
}

/** All business data, but never action functions, browser credentials or tokens. */
export function snapshot(source: unknown = useStore.getState()): Snapshot {
  const state = source as Record<string, unknown>;
  return Object.fromEntries(stateFields.map((field) => [field, state[field] ?? null]));
}
export function validateSnapshot(data: unknown): asserts data is Snapshot {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new BackendError("Workspace data is invalid.");
  const src = data as Record<string, unknown>;
  for (const field of ["categories", "products", "orders", "customers", "suppliers", "purchases", "expenses", "restaurantTables", "reservations", "heldOrders", "cart"]) {
    if (!Array.isArray(src[field])) throw new BackendError(`Workspace is missing valid ${field}. Restore from a verified backup.`);
  }
  if (!src.settings || typeof src.settings !== "object") throw new BackendError("Workspace settings are missing.");
}
export function loadSnapshot(data: Snapshot) {
  validateSnapshot(data);
  // Never import actions, session tokens or fields not explicitly whitelisted.
  const selected: Snapshot = {};
  for (const field of stateFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) selected[field] = data[field];
  }
  useStore.setState(selected);
}

export async function loadWorkspace(session: AuthSession): Promise<{ session: AuthSession; workspace: Workspace }> {
  const current = await ensureSession(session);
  // The RLS policy scopes this read to auth.uid(), independent of query filtering.
  const result = await api("/rest/v1/pos_workspaces?select=revision,data&limit=1", { method: "GET" }, current.access_token) as Workspace[];
  if (!Array.isArray(result)) throw new BackendError("Unexpected workspace response.");
  if (result[0]) {
    validateSnapshot(result[0].data);
    return { session: current, workspace: result[0] };
  }
  // First login only: the new account receives an isolated demo workspace.
  const initial = snapshot(useStore.getInitialState());
  const created = await api("/rest/v1/pos_workspaces", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ owner_id: current.user.id, revision: 0, data: initial }),
  }, current.access_token) as Workspace[];
  if (!Array.isArray(created) || !created[0]) throw new BackendError("Could not create user workspace. Apply the self-host SQL setup first.");
  return { session: current, workspace: created[0] };
}

export async function saveWorkspace(session: AuthSession, expectedRevision: number, data: Snapshot): Promise<{ session: AuthSession; revision: number }> {
  const current = await ensureSession(session);
  validateSnapshot(data);
  const revision = await api("/rest/v1/rpc/update_pos_workspace", {
    method: "POST",
    body: JSON.stringify({ expected_revision: expectedRevision, next_data: data }),
  }, current.access_token);
  if (typeof revision !== "number" || !Number.isInteger(revision) || revision !== expectedRevision + 1)
    throw new BackendError("Workspace save failed or conflicted. Reload your current workspace.");
  return { session: current, revision };
}

export function watchWorkspace(session: AuthSession, initialRevision: number, notify: (info: { status: "saved" | "saving" | "conflict"; message?: string }) => void) {
  let current = session;
  let revision = initialRevision;
  let dirty = false;
  let running = false;
  let stopped = false;
  let locked = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let previous = JSON.stringify(snapshot());
  const sync = async () => {
    if (stopped || locked || running || !dirty) return;
    running = true;
    dirty = false;
    const outbound = snapshot();
    notify({ status: "saving" });
    try {
      const result = await saveWorkspace(current, revision, outbound);
      if (stopped) return;
      current = result.session;
      revision = result.revision;
      notify({ status: "saved" });
    } catch (error) {
      if (stopped) return;
      locked = true;
      notify({ status: "conflict", message: error instanceof Error ? error.message : "Backend connection failed. Reload safely before continuing." });
    } finally {
      running = false;
      if (dirty && !locked && !stopped) queue();
    }
  };
  const queue = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void sync(); }, 450);
  };
  // Warn against closing the tab while changes are not yet confirmed by the server.
  const warnBeforeUnload = (event: BeforeUnloadEvent) => {
    if (dirty || running) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  if (typeof window !== "undefined") window.addEventListener("beforeunload", warnBeforeUnload);
  const unsubscribe = useStore.subscribe(() => {
    if (stopped || locked) return;
    const value = JSON.stringify(snapshot());
    if (value !== previous) {
      previous = value;
      dirty = true;
      queue();
    }
  });
  return () => { stopped = true; if (timer) clearTimeout(timer); unsubscribe(); if (typeof window !== "undefined") window.removeEventListener("beforeunload", warnBeforeUnload); };
}
