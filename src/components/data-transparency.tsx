import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatRelativeTime } from "@/lib/format";

interface Props {
  updatedAt: number | null;
}

export function DataTransparency({ updatedAt }: Props) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const rel = updatedAt ? formatRelativeTime(updatedAt) : "just now";

  return (
    <div className="mono mt-3 flex items-center justify-center gap-1.5 text-center text-[0.7rem] uppercase tracking-[0.18em] text-text-muted max-w-lg">
      <span>Community logged · Updated {rel}</span>
      <Popover>
        <PopoverTrigger
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-colors hover:text-secondary focus-visible:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
          aria-label="About this data"
        >
          <Info size={13} strokeWidth={2} aria-hidden />
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="center"
          className="w-72 border-secondary/40 bg-secondary/10 text-left text-xs normal-case tracking-normal shadow-[0_0_24px_-6px_hsl(var(--secondary)/0.7)] backdrop-blur"
        >
          <p className="font-sans text-sm leading-relaxed text-foreground">
            Miles and workouts are submitted by club members. No fitness tracker
            is required. Rankings reflect the active sport filters and update as
            new workouts are logged.
          </p>
          <Link
            to="/about"
            className="mt-3 inline-flex text-xs font-semibold uppercase tracking-wider text-secondary hover:underline focus-visible:underline"
          >
            How the club works →
          </Link>
        </PopoverContent>
      </Popover>
    </div>
  );
}
