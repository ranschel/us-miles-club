import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SportFilter } from "@/components/sport-filter";
import { LeaderboardList } from "@/components/leaderboard-list";
import { fetchWorkouts, type Sport } from "@/lib/public-workouts";
import { aggregate, aggregateIndividuals, filterSports } from "@/lib/aggregate";
import { STATE_BY_CODE, stateName } from "@/lib/us-geo";
import logoAsset from "@/assets/us-miles-club-logo.png.asset.json";

export const Route = createFileRoute("/leaderboards")({
  component: Leaderboards,
  head: () => ({
    meta: [
      { title: "Leaderboards — US Miles Club" },
      {
        name: "description",
        content:
          "See the top states, counties, cities, and individuals on the US Miles Club leaderboard. Filter by walk, run, or bike.",
      },
      { property: "og:title", content: "US Miles Club leaderboards" },
      {
        property: "og:description",
        content: "Live state, county, city, and individual mileage leaderboards across the US.",
      },
      { property: "og:url", content: "/leaderboards" },
      { property: "og:image", content: logoAsset.url },
      { name: "twitter:image", content: logoAsset.url },
    ],
    links: [{ rel: "canonical", href: "/leaderboards" }],
  }),
});


function Leaderboards() {
  const [sports, setSports] = useState<Sport[]>(["walk", "run", "bike"]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["public-workouts"],
    queryFn: () => fetchWorkouts(["walk", "run", "bike"]),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => filterSports(rows, sports), [rows, sports]);
  const { byState, byCounty } = useMemo(() => aggregate(filtered), [filtered]);

  const topStates = [...byState.values()]
    .sort((a, b) => b.totalMiles - a.totalMiles)
    .map((s) => ({
      key: s.code,
      label: stateName(s.code),
      miles: s.totalMiles,
      count: s.count,
    }));

  const topCounties = [...byCounty.values()]
    .sort((a, b) => b.totalMiles - a.totalMiles)
    .map((c) => ({
      key: c.fips,
      label: `${c.name} County`,
      sub: STATE_BY_CODE[c.state_code]?.name,
      miles: c.totalMiles,
      count: c.count,
    }));

  // Top cities across everything
  const cityMap = new Map<string, { key: string; label: string; sub: string; miles: number; count: number }>();
  for (const r of filtered) {
    const key = `${r.state_code}:${r.county_fips}:${r.city}`;
    const existing = cityMap.get(key) ?? {
      key,
      label: r.city,
      sub: `${r.county_name} County, ${STATE_BY_CODE[r.state_code]?.name ?? r.state_code}`,
      miles: 0,
      count: 0,
    };
    existing.miles += Number(r.distance_miles);
    existing.count += 1;
    cityMap.set(key, existing);
  }
  const topCities = [...cityMap.values()].sort((a, b) => b.miles - a.miles);

  const topIndividuals = useMemo(() => {
    return aggregateIndividuals(filtered).map((p) => ({
      key: p.user_id ?? "__anon__",
      label: p.full_name?.trim() || "Anonymous",
      miles: p.totalMiles,
      count: p.count,
    }));
  }, [filtered]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">Leaderboards</h1>
          <p className="mt-2 text-text-secondary">
            Who's moving where. Filter to see how your sport ranks.
          </p>
        </div>
        <SportFilter value={sports} onChange={setSports} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <LeaderboardList title="States" items={topStates} loading={isLoading} searchable searchPlaceholder="Search states" />
        <LeaderboardList title="Counties" items={topCounties} loading={isLoading} searchable searchPlaceholder="Search counties" />
        <LeaderboardList title="Cities" items={topCities} loading={isLoading} searchable searchPlaceholder="Search cities" />
        <LeaderboardList title="Individuals" items={topIndividuals} loading={isLoading} searchable searchPlaceholder="Search names" />
      </div>
    </div>
  );
}

