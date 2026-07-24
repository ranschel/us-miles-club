import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { SportFilter } from "@/components/sport-filter";
import { LeaderboardList } from "@/components/leaderboard-list";
import { LeaderboardBars } from "@/components/leaderboard-bars";
import { NationalMap } from "@/components/us-map";
import { MapLegend } from "@/components/map-legend";
import { DataInsights } from "@/components/data-insights";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchWorkouts, type Sport } from "@/lib/public-workouts";
import { aggregate, computeTrends, filterSports } from "@/lib/aggregate";
import { buildInsights } from "@/lib/insights";
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
  const navigate = useNavigate();
  const [sports, setSports] = useState<Sport[]>(["walk", "run", "bike"]);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const goToState = (code: string) =>
    navigate({ to: "/", search: { state: code, from: "leaderboards" } as never });
  const goToCounty = (fips: string) => {
    const state = fips.slice(0, 2);
    navigate({ to: "/", search: { state, county: fips, from: "leaderboards" } as never });
  };
  const goToCity = (key: string) => {
    // key format: "SS:FFFFF:City"
    const [state, county] = key.split(":");
    navigate({ to: "/", search: { state, county, from: "leaderboards" } as never });
  };


  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["public-workouts"],
    queryFn: () => fetchWorkouts(["walk", "run", "bike"]),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => filterSports(rows, sports), [rows, sports]);
  const { byState, byCounty } = useMemo(() => aggregate(filtered), [filtered]);

  const stateTrends = useMemo(() => computeTrends(filtered, (r) => r.state_code), [filtered]);
  const countyTrends = useMemo(() => computeTrends(filtered, (r) => r.county_fips), [filtered]);
  const cityTrends = useMemo(
    () => computeTrends(filtered, (r) => `${r.state_code}:${r.county_fips}:${r.city}`),
    [filtered],
  );

  const topStates = [...byState.values()]
    .sort((a, b) => b.totalMiles - a.totalMiles)
    .map((s) => ({
      key: s.code,
      label: stateName(s.code),
      miles: s.totalMiles,
      count: s.count,
      trend: stateTrends.get(s.code) ?? ("flat" as const),
    }));

  const topCounties = [...byCounty.values()]
    .sort((a, b) => b.totalMiles - a.totalMiles)
    .map((c) => ({
      key: c.fips,
      label: `${c.name} County`,
      sub: STATE_BY_CODE[c.state_code]?.name,
      miles: c.totalMiles,
      count: c.count,
      trend: countyTrends.get(c.fips) ?? ("flat" as const),
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
  const topCities = [...cityMap.values()]
    .sort((a, b) => b.miles - a.miles)
    .map((c) => ({ ...c, trend: cityTrends.get(c.key) ?? ("flat" as const) }));

  const insights = useMemo(
    () => (rows.length ? buildInsights({ allRows: rows, sports, scope: { level: "national" } }) : []),
    [rows, sports],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">Leaderboards</h1>
          <p className="mt-2 text-text-secondary">
            Who's moving where. Filter to see how your sport ranks.
          </p>
        </div>
        <SportFilter value={sports} onChange={setSports} context="leaderboards" />
      </div>

      <div className="mb-6">
        <DataInsights insights={insights} sports={sports} loading={isLoading} />
      </div>

      <Tabs defaultValue="states" className="w-full">

        <TabsList className="mb-6">
          <TabsTrigger value="states">States</TabsTrigger>
          <TabsTrigger value="counties">Counties</TabsTrigger>
          <TabsTrigger value="cities">Cities</TabsTrigger>
        </TabsList>
        <TabsContent value="states">
          <div className="max-w-2xl">
            <LeaderboardList
              title="Top 10 States"
              items={topStates}
              loading={isLoading}
              searchable
              searchPlaceholder="Search states"
              topN={10}
              onSelect={goToState}
              clickHint={(it) => `Click to open ${it.label}'s county map and cities.`}
            />
          </div>
        </TabsContent>
        <TabsContent value="counties">
          <div className="max-w-2xl">
            <LeaderboardList
              title="Top 10 Counties"
              items={topCounties}
              loading={isLoading}
              searchable
              searchPlaceholder="Search counties"
              topN={10}
              onSelect={goToCounty}
              clickHint={(it) => `Click to open the ${it.label} map and city rankings.`}
            />
          </div>
        </TabsContent>
        <TabsContent value="cities">
          <div className="max-w-2xl">
            <LeaderboardList
              title="Top 10 Cities"
              items={topCities}
              loading={isLoading}
              searchable
              searchPlaceholder="Search cities"
              topN={10}
              onSelect={goToCity}
              clickHint={(it) => `Click to open ${it.label} on its county map.`}
            />
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}


