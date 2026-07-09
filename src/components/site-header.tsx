import { Link, useRouterState } from "@tanstack/react-router";
import { Map as MapIcon, Trophy, User, Plus, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function useSession() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSignedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSignedIn(!!session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return signedIn;
}

function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

export function SiteHeader() {
  const signedIn = useSession();
  const { dark, toggle } = useTheme();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const linkCls = (active: boolean) =>
    `inline-flex items-center gap-2 min-h-11 px-3 rounded-md text-sm font-bold transition-colors ${
      active ? "text-primary bg-muted" : "text-text-secondary hover:text-foreground hover:bg-muted"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 md:gap-4">
        <Link to="/" className="flex items-center gap-2 pr-2 text-lg font-black tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <MapIcon size={18} strokeWidth={2} />
          </span>
          <span className="hidden sm:inline">US Miles Club</span>
        </Link>

        <nav className="flex items-center gap-1 md:gap-2" aria-label="Primary">
          <Link to="/" className={linkCls(path === "/")}>
            <MapIcon size={18} strokeWidth={1.75} />
            <span className="hidden sm:inline">Home Map</span>
          </Link>
          <Link to="/leaderboards" className={linkCls(path.startsWith("/leaderboards"))}>
            <Trophy size={18} strokeWidth={1.75} />
            <span className="hidden sm:inline">Leaderboards</span>
          </Link>
          <Link to="/portal" className={linkCls(path.startsWith("/portal"))}>
            <User size={18} strokeWidth={1.75} />
            <span className="hidden sm:inline">My Portal</span>
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="btn btn-ghost"
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            style={{ minHeight: 44, minWidth: 44, padding: "0 0.75rem" }}
          >
            {dark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
          </button>
          {signedIn === false && (
            <Link to="/auth" className="btn btn-cta">
              Join the Club
            </Link>
          )}
          {signedIn === true && (
            <Link to="/log" className="btn btn-primary">
              <Plus size={18} strokeWidth={2} />
              <span className="hidden sm:inline">Log workout</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
