import { useMemo } from "react";
import { TrendingUp, Sparkles } from "lucide-react";
import { formatMiles } from "@/lib/format";

type Workout = {
  performed_at: string;
  distance_miles: number | string;
};

function startOfWeek(d: Date): Date {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  const day = nd.getDay();
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
  const bestIdx = weeks.reduce((bi, w, i) => (w.miles > weeks[bi].miles ? i : bi), 0);
  const bestWeek = weeks[bestIdx];
  const currentWeek = weeks[weeks.length - 1];
  const priorActive = [...weeks.slice(0, -1)].reverse().find((w) => w.miles > 0);

  let interpretation = "";
  if (currentWeek.miles > 0 && priorActive) {
    const diff = currentWeek.miles - priorActive.miles;
    const pct = Math.round((diff / priorActive.miles) * 100);
    if (pct >= 10) {
      interpretation = `This week you're up ${pct}% — ${formatMiles(currentWeek.miles)} versus ${formatMiles(priorActive.miles)} the week before.`;
    } else if (pct <= -10) {
      interpretation = `This week you're down ${Math.abs(pct)}% — ${formatMiles(currentWeek.miles)} versus ${formatMiles(priorActive.miles)} the week before.`;
    } else {
      interpretation = `Steady week — ${formatMiles(currentWeek.miles)} logged, near your ${formatMiles(priorActive.miles)} the week before.`;
    }
  } else if (currentWeek.miles > 0) {
    interpretation = `New streak — ${formatMiles(currentWeek.miles)} logged this week.`;
  } else if (bestWeek.miles > 0) {
    interpretation = `Your strongest week was ${formatMiles(bestWeek.miles)} on ${fmtWeekLabel(bestWeek.start)}.`;
  }

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
          const isBest = i === bestIdx && w.miles > 0;
          const prior = i > 0 ? weeks[i - 1].miles : 0;
          const diff = prior > 0 ? Math.round(((w.miles - prior) / prior) * 100) : null;
          const tip = `Week of ${fmtWeekLabel(w.start)} — ${formatMiles(w.miles)}${
            diff !== null && w.miles > 0 ? ` (${diff >= 0 ? "+" : ""}${diff}% vs prior)` : ""
          }`;
          return (
            <div key={i} className="relative flex h-full flex-1 flex-col items-center gap-2">
              {isBest && (
                <div
                  className="absolute -top-1 z-10 flex items-center gap-1 rounded-full bg-secondary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-secondary"
                  aria-label={`Strongest week: ${formatMiles(w.miles)}`}
                >
                  <Sparkles size={9} strokeWidth={2.5} />
                  Best
                </div>
              )}
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-md transition-all ${
                    w.miles === 0
                      ? "bg-muted-foreground/10"
                      : isBest
                        ? "bg-secondary"
                        : isCurrent
                          ? "bg-primary"
                          : "bg-primary/40"
                  }`}
                  style={{ height: `${Math.max(pct, w.miles > 0 ? 4 : 2)}%` }}
                  title={tip}
                  aria-label={tip}
                />
              </div>
              <div className="text-[10px] text-text-secondary whitespace-nowrap">
                {fmtWeekLabel(w.start)}
              </div>
            </div>
          );
        })}
      </div>
      {interpretation && (
        <p className="mt-3 text-xs text-text-secondary">{interpretation}</p>
      )}
    </div>
  );
}
