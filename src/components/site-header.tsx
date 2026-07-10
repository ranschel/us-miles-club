import { Link, useRouterState } from "@tanstack/react-router";
import { Map as MapIcon, Trophy, User, Plus, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import logoAsset from "@/assets/us-miles-club-logo.png.asset.json";

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

export function SiteHeader() {
  const signedIn = useSession();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();



  const linkCls = (active: boolean) =>
    `inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-all ${
      active
        ? "text-secondary bg-[rgba(94,234,255,0.10)] border border-[rgba(94,234,255,0.35)] shadow-[0_0_18px_rgba(94,234,255,0.25)]"
        : "text-text-secondary border border-transparent hover:text-foreground hover:bg-white/[0.04]"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface backdrop-blur-xl">
      <div className="flex w-full items-center gap-3 px-6 py-3 lg:px-10">
        <Link
          to="/"
          className="flex items-center gap-2.5 pr-3 font-display text-base font-bold tracking-tight"
        >
          <img
            src={logoAsset.url}
            alt="US Miles Club"
            className="h-9 w-9 rounded-lg object-cover"
          />
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:text-foreground hover:border-border-strong hover:bg-white/[0.04]"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
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
