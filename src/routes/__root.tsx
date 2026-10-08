import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "../components/ui/sonner";
import { AuthProvider, useAuth } from "../hooks/use-auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

// A dev server can throw a variety of transient "stale module" errors right
// after it silently re-bundles dependencies in the background (e.g. after
// `npm install`) - a fresh page load always fixes these, and the exact error
// text/shape isn't reliable enough to pattern-match (it varies by where the
// mismatch surfaces: hydration, a hook call, a dynamic import). So instead we
// auto-heal once for *any* error that reaches this top-level boundary; a
// genuine, persistent bug will simply show the same error again after that
// one retry (see the loop guard below), rather than hide it.
const AUTO_RELOAD_GUARD_KEY = "techpro-auto-reload-at";

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });

    if (typeof window === "undefined") return;
    // Guard against a reload loop: only auto-heal once per 10s window. If the
    // same error keeps coming back right after a reload, it's a real bug, so
    // we fall through to the normal error screen instead of looping forever.
    const lastReload = Number(sessionStorage.getItem(AUTO_RELOAD_GUARD_KEY) ?? 0);
    if (Date.now() - lastReload > 10_000) {
      sessionStorage.setItem(AUTO_RELOAD_GUARD_KEY, String(Date.now()));
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "TechPro Inventory Console" },
      {
        name: "description",
        content: "Track TechPro tool types, quantities, balances and low-stock thresholds.",
      },
      { property: "og:title", content: "TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Track TechPro tool types, quantities, balances and low-stock thresholds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#121212" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "TechPro" },
      { name: "format-detection", content: "telephone=no" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // Belt-and-braces for the same "stale dev module" class of error the root
  // errorComponent auto-heals from (see there for the full explanation).
  // That one only works once React has mounted enough to render an error
  // boundary; some of these errors happen earlier than that (during initial
  // script evaluation/hydration) and surface as Vite's own raw dev overlay
  // instead, which React never gets a chance to catch. A plain window error
  // listener, registered before anything else loads, catches those too.
  // Shares the same session-storage guard key so the two mechanisms don't
  // both fire and double-reload for one underlying error.
  const devReloadGuardScript = import.meta.env.DEV
    ? `(() => {
    var KEY = 'techpro-auto-reload-at';
    var tryReload = () => {
      try {
        var last = Number(sessionStorage.getItem(KEY) || 0);
        if (Date.now() - last > 10000) {
          sessionStorage.setItem(KEY, String(Date.now()));
          location.reload();
        }
      } catch (_) {}
    };
    window.addEventListener('error', tryReload);
    window.addEventListener('unhandledrejection', tryReload);
  })();`
    : "";

  const themeScript = `(() => {
    try {
      const saved = localStorage.getItem('techpro-theme');
      const night = saved === 'night' || (!saved && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', night);
      document.documentElement.style.colorScheme = night ? 'dark' : 'light';
    } catch (_) {}
  })();`;

  const swScript = `(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  })();`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {devReloadGuardScript && <script dangerouslySetInnerHTML={{ __html: devReloadGuardScript }} />}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </AuthGate>
      </AuthProvider>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isLoginRoute = pathname === "/login";

  useEffect(() => {
    if (status === "signed-out" && !isLoginRoute) {
      navigate({ to: "/login", search: { redirect: pathname } });
    }
  }, [status, isLoginRoute, pathname, navigate]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (status === "signed-out" && !isLoginRoute) {
    return null;
  }

  return <>{children}</>;
}
