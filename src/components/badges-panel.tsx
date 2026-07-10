import { useMemo } from "react";
import { Award, Lock, Footprints, Trophy, Medal, Map, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Workout = {
  performed_at: string;
  distance_miles: number | string;
  county_fips: string;
};

type Badge = {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  earned: boolean;
  progress?: string;
};

function computeStreak(workouts: Workout[]): number {
  if (workouts.length === 0) return 0;
  const days = new Set<string>();
  for (const w of workouts) {
    const d = new Date(w.performed_at);
    d.setHours(0, 0, 0, 0);
    days.add(d.toISOString().slice(0, 10));
  }
  let best = 0;
  let cur = 0;
  const sorted = [...days].sort();
  let prev: Date | null = null;
  for (const key of sorted) {
    const d = new Date(key);
    if (prev && (d.getTime() - prev.getTime()) === 86400000) {
      cur += 1;
    } else {
      cur = 1;
    }
    if (cur > best) best = cur;
    prev = d;
  }
  return best;
}

export function BadgesPanel({ workouts }: { workouts: Workout[] }) {
  const badges = useMemo<Badge[]>(() => {
    const total = workouts.reduce((s, w) => s + Number(w.distance_miles), 0);
    const counties = new Set(workouts.map((w) => w.county_fips)).size;
    const streak = computeStreak(workouts);
    return [
      {
        id: "first-mile",
        name: "First Mile Logged",
        desc: "Log your first workout.",
        icon: Footprints,
        earned: workouts.length >= 1,
      },
      {
        id: "ten-club",
        name: "10 Mile Club",
        desc: "Log 10 total miles.",
        icon: Medal,
        earned: total >= 10,
        progress: total < 10 ? `${total.toFixed(1)} / 10 mi` : undefined,
      },
      {
        id: "fifty-club",
        name: "50 Mile Club",
        desc: "Log 50 total miles.",
        icon: Trophy,
        earned: total >= 50,
        progress: total < 50 ? `${total.toFixed(1)} / 50 mi` : undefined,
      },
      {
        id: "explorer",
        name: "County Explorer",
        desc: "Log workouts in 3+ counties.",
        icon: Map,
        earned: counties >= 3,
        progress: counties < 3 ? `${counties} / 3 counties` : undefined,
      },
      {
        id: "streak",
        name: "7-Day Streak",
        desc: "Log a workout 7 days in a row.",
        icon: Flame,
        earned: streak >= 7,
        progress: streak < 7 ? `${streak} / 7 days` : undefined,
      },
    ];
  }, [workouts]);

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="card mb-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Award size={18} className="text-primary" />
            <h2 className="text-xl font-bold">Badges</h2>
          </div>
          <p className="text-sm text-text-secondary">Milestones earned from your workouts.</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-text-secondary">Earned</div>
          <div className="mono text-lg font-bold">
            {earnedCount} / {badges.length}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {badges.map((b) => {
          const Icon = b.earned ? b.icon : Lock;
          return (
            <div
              key={b.id}
              className={`rounded-xl border p-4 text-center transition-all ${
                b.earned
                  ? "border-primary/40 bg-primary/10 ring-1 ring-primary/30"
                  : "border-border bg-muted opacity-60"
              }`}
              title={b.desc}
            >
              <div
                className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full ${
                  b.earned ? "bg-primary/20 text-primary" : "bg-muted-foreground/10 text-text-secondary"
                }`}
              >
                <Icon size={24} strokeWidth={2} />
              </div>
              <div className="text-sm font-bold leading-tight">{b.name}</div>
              <div className="mt-1 text-xs text-text-secondary">{b.desc}</div>
              {b.progress && (
                <div className="mono mt-2 text-[10px] uppercase tracking-wide text-text-secondary">
                  {b.progress}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
