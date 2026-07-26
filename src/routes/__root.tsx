import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/us-miles-club-logo.png.asset.json";
import bgAsset from "@/assets/app-bg.png.asset.json";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex flex-1 items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-7xl font-black text-foreground">404</h1>
          <h2 className="mt-4 text-xl font-bold text-foreground">Page not found</h2>
          <p className="mt-2 text-sm text-text-secondary">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="mt-6">
            <Link to="/" className="btn btn-primary">
              Back to the map
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex flex-1 items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            This page didn't load
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Something went wrong on our end. Try refreshing, or head back to the map.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="btn btn-primary"
            >
              Try again
            </button>
            <a href="/" className="btn btn-secondary">
              Back to the map
            </a>
          </div>
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
      { title: "US Miles Club — Nationwide Mileage Dashboard" },
      {
        name: "description",
        content:
          "The Nationwide Mileage Dashboard — every walk, run, and ride lights up a live US map. Drill from state to county to city, no sign-in required.",
      },
      { name: "author", content: "US Miles Club" },
      { property: "og:title", content: "US Miles Club — Nationwide Mileage Dashboard" },
      {
        property: "og:description",
        content:
          "The Nationwide Mileage Dashboard — every walk, run, and ride lights up a live US map. Drill from state to county to city, no sign-in required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@usmilesclub" },
      { name: "twitter:title", content: "US Miles Club — Nationwide Mileage Dashboard" },
      {
        name: "twitter:description",
        content:
          "The Nationwide Mileage Dashboard — every walk, run, and ride lights up a live US map. Drill from state to county to city, no sign-in required.",
      },

      { name: "theme-color", content: "#f97316" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/xlxgLkJqqiUqxnJhcWL8tlMQSxp1/social-images/social-1783654732720-Gemini_Generated_Image_ipy3qnipy3qnipy3.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/xlxgLkJqqiUqxnJhcWL8tlMQSxp1/social-images/social-1783654732720-Gemini_Generated_Image_ipy3qnipy3qnipy3.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: logoAsset.url },
      { rel: "apple-touch-icon", href: logoAsset.url },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <div
        className="relative flex min-h-screen flex-col text-foreground"
        suppressHydrationWarning
      >
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgAsset.url})` }}
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-background/70"
        />
        <SiteHeader />
        <main className="flex-1" suppressHydrationWarning>
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-surface)",
            color: "var(--color-foreground)",
            border: "1px solid var(--color-border)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
