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
  const [light, setLight] = useState<boolean>(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    setLight(saved === "light");
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("light", light);
    localStorage.setItem("theme", light ? "light" : "dark");
  }, [light, ready]);
  return { light, ready, toggle: () => setLight((l) => !l) };
}

export function SiteHeader() {
  const signedIn = useSession();
  const { light, toggle } = useTheme();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const linkCls = (active: boolean) =>
    `inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-all ${
      active
        ? "text-secondary bg-[rgba(94,234,255,0.10)] border border-[rgba(94,234,255,0.35)] shadow-[0_0_18px_rgba(94,234,255,0.25)]"
        : "text-text-secondary border border-transparent hover:text-foreground hover:bg-white/[0.04]"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[rgba(10,11,16,0.7)] backdrop-blur-xl">
      <div className="flex w-full items-center gap-3 px-6 py-3 lg:px-10">
        <Link
          to="/"
          className="flex items-center gap-2.5 pr-3 font-display text-base font-bold tracking-tight"
        >
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow-amber)" }}
          >
            <MapIcon size={16} strokeWidth={2.5} />
          </span>
          <span className="hidden sm:inline">US Miles Club</span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Primary">
          <Link to="/" className={linkCls(path === "/")}>
            <MapIcon size={16} strokeWidth={2} />
            <span className="hidden sm:inline">Home Map</span>
          </Link>
          <Link to="/leaderboards" className={linkCls(path.startsWith("/leaderboards"))}>
            <Trophy size={16} strokeWidth={2} />
            <span className="hidden sm:inline">Leaderboards</span>
          </Link>
          <Link to="/portal" className={linkCls(path.startsWith("/portal"))}>
            <User size={16} strokeWidth={2} />
            <span className="hidden sm:inline">My Portal</span>
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="btn btn-ghost"
            aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
            style={{ minHeight: 40, minWidth: 40, padding: "0 0.6rem", borderRadius: 999 }}
          >
            {light ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
          </button>
          {signedIn === false && (
            <Link to="/auth" className="btn btn-cta">
              Join the Club
            </Link>
          )}
          {signedIn === true && (
            <Link to="/log" className="btn btn-cta">
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">Log workout</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
