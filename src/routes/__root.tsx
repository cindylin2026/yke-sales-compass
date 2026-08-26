import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "@/lib/auth/context";
import { CrmProvider } from "@/lib/crm/provider";
import { AppShell } from "@/components/crm/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Record not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page or record doesn&apos;t exist in the Sales OS.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to Sales Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn&apos;t load
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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Yo-Kai Express Sales OS" },
      {
        name: "description",
        content:
          "The Yo-Kai Express Sales Operating System — leads, accounts, pipeline and follow-ups in one workflow.",
      },
      { name: "author", content: "Yo-Kai Express" },
      { property: "og:title", content: "Yo-Kai Express Sales OS" },
      {
        property: "og:description",
        content: "Leads, accounts, pipeline and daily follow-ups for the YKE global sales teams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      { rel: "icon", href: "/yokai-logo.png", type: "image/png" },
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
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** Auth guard — redirect unauthenticated users to /login.
 *  During development / before Supabase migration is run,
 *  set VITE_AUTH_REQUIRED=false in .env.local to bypass auth.
 */
const AUTH_REQUIRED = import.meta.env["VITE_AUTH_REQUIRED"] !== "false";

function AuthGuard({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!AUTH_REQUIRED) return;
    if (!loading && !session && !isLoginPage) {
      void navigate({ to: "/login" });
    }
  }, [loading, session, isLoginPage, navigate]);

  // Skip loading spinner if auth is bypassed
  if (AUTH_REQUIRED && loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-ember font-display text-xs font-bold text-ember-foreground">
              YK
            </span>
            <span className="font-display text-sm font-semibold">Yo-Kai Express Sales OS</span>
          </div>
          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/** Redirects to /set-password whenever a session just arrived via an
 *  invite/recovery link and the user hasn't chosen a password yet —
 *  runs regardless of which branch below is currently rendering. */
function PasswordSetupGuard() {
  const { needsPasswordSetup } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (needsPasswordSetup && pathname !== "/set-password") {
      void navigate({ to: "/set-password" });
    }
  }, [needsPasswordSetup, pathname, navigate]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoginPage = pathname === "/login";
  const isSetPasswordPage = pathname === "/set-password";

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PasswordSetupGuard />
        {isLoginPage || isSetPasswordPage ? (
          <>
            <Outlet />
            <Toaster />
          </>
        ) : (
          <AuthGuard>
            <CrmProvider>
              <AppShell>
                <Outlet />
              </AppShell>
              <Toaster />
            </CrmProvider>
          </AuthGuard>
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}
