import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { formatMiles } from "@/lib/format";
import { stateName } from "@/lib/us-geo";
import { generateFootprintInsight } from "@/lib/personal-insights";
import type { Sport } from "@/lib/public-workouts";

type Workout = {
  performed_at: string;
  distance_miles: number | string;
  sport: Sport;
  state_code: string;
  county_fips: string;
  county_name: string;
  city: string;
};

interface LocationAgg {
  key: string;
  city: string;
  county_name: string;
  state_code: string;
  miles: number;
  count: number;
  topSport: Sport;
}

export function ActivityFootprint({
  workouts,
  sports,
}: {
  workouts: Workout[];
  sports: Sport[];
}) {
  const filtered = useMemo(() => {
    if (sports.length === 0 || sports.length === 3) return workouts;
    const set = new Set(sports);
    return workouts.filter((w) => set.has(w.sport));
  }, [workouts, sports]);

  const locations = useMemo<LocationAgg[]>(() => {
    const map = new Map<string, LocationAgg & { sports: Record<Sport, number> }>();
    for (const w of filtered) {
      const key = `${w.state_code}|${w.county_fips}|${w.city}`;
      const existing =
        map.get(key) ??
        ({
          key,
          city: w.city,
          county_name: w.county_name,
          state_code: w.state_code,
          miles: 0,
          count: 0,
          topSport: w.sport,
          sports: { walk: 0, run: 0, bike: 0 },
        } as LocationAgg & { sports: Record<Sport, number> });
      existing.miles += Number(w.distance_miles);
      existing.count += 1;
      existing.sports[w.sport] += Number(w.distance_miles);
      map.set(key, existing);
    }
    return [...map.values()]
      .map((l) => {
        const top = (Object.entries(l.sports) as [Sport, number][]).sort(
          (a, b) => b[1] - a[1],
        )[0][0];
        return { ...l, topSport: top };
      })
      .sort((a, b) => b.miles - a.miles);
  }, [filtered]);

  const insight = generateFootprintInsight(filtered);
  const maxMiles = locations.reduce((m, l) => Math.max(m, l.miles), 0);

  return (
    <section className="card mb-6" aria-label="Your activity footprint">
      <div className="mb-2 flex items-center gap-2">
        <MapPin size={18} className="text-primary" />
        <h2 className="text-xl font-bold">Your activity footprint</h2>
      </div>
      <p className="text-sm text-text-secondary">{insight.headline}</p>
      {insight.supportingText && (
        <p className="mt-1 text-xs text-text-secondary">{insight.supportingText}</p>
      )}

      {locations.length === 0 ? (
        <div className="mt-4 rounded-xl bg-muted p-6 text-center text-sm text-text-secondary">
          No locations match the current filter yet.
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {locations.slice(0, 8).map((l) => {
            const share = maxMiles > 0 ? (l.miles / maxMiles) * 100 : 0;
            const sportLabel =
              l.topSport === "walk" ? "walking" : l.topSport === "run" ? "running" : "biking";
            return (
              <li key={l.key} className="relative overflow-hidden rounded-lg bg-muted/60 p-3">
                <div
                  className="absolute inset-y-0 left-0 bg-primary/15"
                  style={{ width: `${share}%` }}
                  aria-hidden
                />
                <div className="relative flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-bold">
                      {l.city}, {stateName(l.state_code)}
                    </div>
                    <div className="truncate text-xs text-text-secondary">
                      {l.county_name} County · mostly {sportLabel}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mono font-bold">{formatMiles(l.miles)}</div>
                    <div className="text-[10px] uppercase tracking-wide text-text-secondary">
                      {l.count} {l.count === 1 ? "workout" : "workouts"}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
