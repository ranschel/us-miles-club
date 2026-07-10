import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { formatMiles } from "@/lib/format";

type Workout = {
  performed_at: string;
  distance_miles: number | string;
};

function startOfWeek(d: Date): Date {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  const day = nd.getDay(); // 0 Sun .. 6 Sat
  nd.setDate(nd.getDate() - day);
  return nd;
}

function fmtWeekLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function WorkoutChart({ workouts }: { workouts: Workout[] }) {
  const weeks = useMemo(() => {
    const now = new Date();
    const buckets: { start: Date; miles: number }[] = [];
    const first = startOfWeek(now);
    // Last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const s = new Date(first);
      s.setDate(s.getDate() - i * 7);
      buckets.push({ start: s, miles: 0 });
    }
    const firstStart = buckets[0].start.getTime();
    for (const w of workouts) {
      const t = new Date(w.performed_at).getTime();
      if (t < firstStart) continue;
      const idx = Math.floor((t - firstStart) / (7 * 24 * 60 * 60 * 1000));
      if (idx >= 0 && idx < buckets.length) {
        buckets[idx].miles += Number(w.distance_miles);
      }
    }
    return buckets;
  }, [workouts]);

  const max = Math.max(1, ...weeks.map((w) => w.miles));
  const total8w = weeks.reduce((s, w) => s + w.miles, 0);

  if (workouts.length === 0) {
    return (
      <div className="card mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          <h2 className="text-xl font-bold">Miles over time</h2>
        </div>
        <div className="mt-4 rounded-xl bg-muted p-8 text-center">
          <p className="font-bold">No progress to plot yet.</p>
          <p className="mt-1 text-sm text-text-secondary">
            Log your first workout and your weekly miles will start showing up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="text-xl font-bold">Miles over time</h2>
          </div>
          <p className="text-sm text-text-secondary">Last 8 weeks, grouped by week.</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-text-secondary">8-week total</div>
          <div className="mono text-lg font-bold">{formatMiles(total8w)}</div>
        </div>
      </div>
      <div className="mt-5 flex h-40 gap-2">
        {weeks.map((w, i) => {
          const pct = (w.miles / max) * 100;
          const isCurrent = i === weeks.length - 1;
          return (
            <div key={i} className="flex h-full flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-md transition-all ${
                    w.miles === 0
                      ? "bg-muted-foreground/10"
                      : isCurrent
                        ? "bg-primary"
                        : "bg-primary/40"
                  }`}
                  style={{ height: `${Math.max(pct, w.miles > 0 ? 4 : 2)}%` }}
                  title={`${formatMiles(w.miles)} — week of ${fmtWeekLabel(w.start)}`}
                />
              </div>
              <div className="text-[10px] text-text-secondary whitespace-nowrap">
                {fmtWeekLabel(w.start)}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
