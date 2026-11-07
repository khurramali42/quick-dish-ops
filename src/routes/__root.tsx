import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts, useRouter } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { useStore } from "@/lib/store";
import { BackendGate } from "@/components/BackendGate";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-4 text-muted-foreground">Page not found.</p>
        <a href="/" className="mt-6 inline-flex rounded-lg bg-brand-gradient text-brand-foreground px-4 py-2 text-sm font-medium">Go home</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { console.error("Application route error:", error); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-lg bg-brand-gradient text-brand-foreground px-4 py-2 text-sm">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Spice Kitchen POS — Restaurant Point of Sale" },
      { name: "description", content: "Premium restaurant, cafe & fast-food POS. Fast checkout, inventory, kitchen tickets, receipts and reports — built for real operations." },
      { property: "og:title", content: "Spice Kitchen POS" },
      { property: "og:description", content: "A modern desktop POS for restaurants, cafes and fast food." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const darkMode = useStore((s) => s.darkMode);
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", darkMode);
    }
  }, [darkMode]);
  // Cashier safety: wheel scrolling must never change an entered value.
  // Blur a focused value control before the browser can apply its wheel step.
  // Do not preventDefault: normal page/panel scrolling must still work.
  useEffect(() => {
    const protectWheel = () => {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement &&
        (active.type === "number" || active.type === "range")
      ) {
        active.blur();
      } else if (active instanceof HTMLSelectElement) {
        active.blur();
      }
    };
    document.addEventListener("wheel", protectWheel, { capture: true, passive: true });
    return () => document.removeEventListener("wheel", protectWheel, true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BackendGate><Outlet /></BackendGate>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
