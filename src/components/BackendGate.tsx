import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Database, LockKeyhole, LogOut, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import {
  backendConfigured, backendConfigError, backendUrl, forgetSession, loadSnapshot,
  loadWorkspace, savedSession, saveSession, signIn, signOut, signUp, watchWorkspace,
  type AuthSession,
} from "@/lib/optional-backend";

type SyncInfo = { status: "saved" | "saving" | "conflict"; message?: string };

export function BackendGate({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"checking" | "login" | "ready">(backendConfigured ? "checking" : "ready");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [sync, setSync] = useState<SyncInfo>({ status: "saved" });
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!backendConfigured) return;
    let cancelled = false;
    async function restore() {
      if (backendConfigError) { setMode("login"); return; }
      const saved = savedSession();
      if (!saved) { setMode("login"); return; }
      try {
        const loaded = await loadWorkspace(saved);
        if (cancelled) return;
        loadSnapshot(loaded.workspace.data);
        setSession(loaded.session);
        saveSession(loaded.session);
        stop.current = watchWorkspace(loaded.session, loaded.workspace.revision, setSync);
        setMode("ready");
      } catch (error) {
        if (cancelled) return;
        forgetSession();
        setMessage(error instanceof Error ? error.message : "Unable to restore backend session.");
        setMode("login");
      }
    }
    void restore();
    return () => { cancelled = true; stop.current?.(); stop.current = null; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || backendConfigError) return;
    setBusy(true);
    setMessage("");
    try {
      if (registering) {
        const immediate = await signUp(email, password);
        setMessage(immediate
          ? "Account created. Sign in to load your private workspace."
          : "Registration submitted. Check your email if confirmation is required, then sign in.");
        setRegistering(false);
      } else {
        const signed = await signIn(email, password);
        const loaded = await loadWorkspace(signed);
        loadSnapshot(loaded.workspace.data);
        setSession(loaded.session);
        saveSession(loaded.session);
        stop.current?.();
        stop.current = watchWorkspace(loaded.session, loaded.workspace.revision, setSync);
        setPassword("");
        setMode("ready");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    stop.current?.();
    stop.current = null;
    const oldSession = session;
    setSession(null);
    setMode("checking");
    try { if (oldSession) await signOut(oldSession); }
    catch { forgetSession(); }
    window.location.reload(); // discard all in-memory business data from the signed-out account
  }

  if (!backendConfigured) return <>{children}</>;
  if (mode === "checking") return <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-sm font-semibold text-muted-foreground"><RefreshCw className="mr-3 h-5 w-5 animate-spin" /> Connecting to your workspace...</div>;
  if (mode !== "ready") {
    return <main className="flex min-h-dvh items-center justify-center bg-[#fff5f0] px-4 py-8 dark:bg-background">
      <form onSubmit={(event) => { void submit(event); }} className="w-full max-w-[410px] space-y-4 rounded-2xl border bg-card p-6 shadow-xl sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-brand"><Database className="h-6 w-6" /></div>
        <div><h1 className="text-xl font-extrabold">Quick Dish Ops</h1><p className="mt-1 text-xs text-muted-foreground">{registering ? "Create your own private database account" : "Sign in to your configured database"}</p></div>
        {backendConfigError ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{backendConfigError}</p> : <>
          <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" /> This installation connects to the database configured by its owner. Each account's workspace is isolated by database row-level security.</p>
          <label className="block space-y-1 text-xs font-semibold">Email
            <input aria-label="Account email" autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-brand/30" />
          </label>
          <label className="block space-y-1 text-xs font-semibold">Password
            <input aria-label="Account password" autoComplete={registering ? "new-password" : "current-password"} type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-brand/30" />
          </label>
          {message && <p role="status" className="rounded-lg border p-3 text-xs text-muted-foreground">{message}</p>}
          <button type="submit" disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-gradient text-sm font-bold text-white disabled:opacity-50"><LockKeyhole className="h-4 w-4" /> {busy ? "Connecting..." : registering ? "Create account" : "Sign in"}</button>
          <button type="button" onClick={() => { setRegistering(!registering); setMessage(""); }} className="w-full text-center text-xs font-semibold text-brand">{registering ? "Already registered? Sign in" : "Need an account? Register"}</button>
        </>}
        <p className="break-all border-t pt-3 text-[10px] text-muted-foreground">Backend: {backendUrl || "not configured"}. Never enter your database service-role key here.</p>
      </form>
    </main>;
  }

  return <div className="min-h-dvh">
    <div className="flex min-h-[30px] items-center justify-between gap-3 border-b bg-slate-950 px-3 py-1 text-[10px] text-white">
      <span className="flex items-center gap-1.5 truncate"><Database className="h-3 w-3 shrink-0 text-orange-300" /> Private workspace · <UserRound className="h-3 w-3 shrink-0" /> {session?.user.email || "Signed in"}</span>
      <span className="flex items-center gap-2">
        <span role="status" className={sync.status === "conflict" ? "font-bold text-red-300" : "text-slate-300"}>{sync.status === "saving" ? "Saving..." : sync.status === "conflict" ? "Sync blocked" : "Synced"}</span>
        <button type="button" disabled={sync.status === "saving"} onClick={() => { void logout(); }} className="flex items-center gap-1 rounded px-2 py-0.5 hover:bg-white/15 disabled:cursor-wait disabled:opacity-50"><LogOut className="h-3 w-3" /> Sign out</button>
      </span>
    </div>
    {sync.status === "conflict" ? <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4">
      <section role="alert" className="w-full max-w-md rounded-xl bg-card p-6 text-foreground shadow-2xl">
        <h2 className="text-lg font-bold">Workspace sync stopped</h2>
        <p className="mt-2 text-sm text-muted-foreground">{sync.message}</p>
        <p className="mt-2 text-xs text-red-600">This browser is not allowed to overwrite newer server data. Reload to restore the current database version. Any unsaved edits in this tab may be lost.</p>
        <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-bold text-white">Reload from database</button>
      </section>
    </div> : null}
    <div className="hosted-app-shell">{children}</div>
  </div>;
}
