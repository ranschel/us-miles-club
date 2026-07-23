import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ArrowLeft, Trophy } from "lucide-react";

import { SportFilter } from "@/components/sport-filter";
import { NationalMap, CountyMap } from "@/components/us-map";
import { CityList, LeaderboardList } from "@/components/leaderboard-list";
import { MapLegend } from "@/components/map-legend";
import { DataInsights } from "@/components/data-insights";
import { fetchWorkouts, type Sport } from "@/lib/public-workouts";
import { aggregate, citiesForCounty, computeTrends, filterSports } from "@/lib/aggregate";
import { buildInsights } from "@/lib/insights";
import { STATE_BY_CODE, stateName } from "@/lib/us-geo";
import { formatMiles } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/us-miles-club-logo.png.asset.json";


const SearchSchema = z.object({
  sports: z.array(z.enum(["walk", "run", "bike"])).optional(),
  state: z.string().length(2).optional(),
  county: z.string().length(5).optional(),
  from: z.enum(["leaderboards"]).optional(),
});


export const Route = createFileRoute("/")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: Index,
  head: () => ({
    meta: [
      { title: "US Miles Club — live national mileage map" },
      {
        name: "description",
        content:
          "Watch every walk, run, and ride light up a live US map. Drill from state to county to city — no sign-in required.",
      },
      { property: "og:title", content: "US Miles Club — live national mileage map" },
      {
        property: "og:description",
        content:
          "Watch every walk, run, and ride light up a live US map. Drill from state to county to city — no sign-in required.",
      },
      { property: "og:url", content: "/" },
      { property: "og:image", content: logoAsset.url },
      { name: "twitter:image", content: logoAsset.url },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative min-w-0 overflow-visible pr-1">
      <div
        className="pointer-events-none absolute -inset-3 -z-10 rounded-xl opacity-20 blur-xl"
        style={{ backgroundImage: "var(--gradient-primary)" }}
        aria-hidden
      />
      <div className="mono text-[0.68rem] uppercase tracking-[0.18em] text-text-secondary">
        {label}
      </div>
      <div
        className="mt-1 font-display text-[clamp(0.95rem,3.2vw,1.5rem)] font-black leading-[0.95] tracking-tight tabular-nums bg-clip-text text-transparent whitespace-nowrap overflow-visible"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}

function Index() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const sports: Sport[] = search.sports ?? ["walk", "run", "bike"];
  const stateCode = search.state ?? null;
  const countyFips = search.county ?? null;

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSignedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setSignedIn(!!session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const setSearch = (
    patch: Partial<{ sports: Sport[]; state: string | null; county: string | null }>,
  ) => {
    navigate({
      search: ((prev: Record<string, unknown>) => {
        const next: Record<string, unknown> = { ...prev };
        if ("sports" in patch) next.sports = patch.sports;
        if ("state" in patch) {
          if (patch.state) next.state = patch.state;
          else delete next.state;
          delete next.county;
        }
        if ("county" in patch) {
          if (patch.county) next.county = patch.county;
          else delete next.county;
        }
        return next;
      }) as never,
      replace: true,
    });
  };

  const { data: allRows = [], isLoading } = useQuery({
    queryKey: ["public-workouts"],
    queryFn: () => fetchWorkouts(["walk", "run", "bike"]),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => filterSports(allRows, sports), [allRows, sports]);
  const { byState, byCounty } = useMemo(() => aggregate(filtered), [filtered]);

  const stateTrends = useMemo(() => computeTrends(filtered, (r) => r.state_code), [filtered]);
  const countyTrends = useMemo(() => computeTrends(filtered, (r) => r.county_fips), [filtered]);

  const topStates = useMemo(
    () =>
      [...byState.values()]
        .sort((a, b) => b.totalMiles - a.totalMiles)
        .slice(0, 8)
        .map((s) => ({
          key: s.code,
          label: stateName(s.code),
          miles: s.totalMiles,
          count: s.count,
          trend: stateTrends.get(s.code) ?? "flat",
        })),
    [byState, stateTrends],
  );

  const topCountiesInState = useMemo(() => {
    if (!stateCode) return [];
    return [...byCounty.values()]
      .filter((c) => c.state_code === stateCode)
      .sort((a, b) => b.totalMiles - a.totalMiles)
      .slice(0, 15)
      .map((c) => ({
        key: c.fips,
        label: `${c.name} County`,
        sub: STATE_BY_CODE[c.state_code]?.name,
        miles: c.totalMiles,
        count: c.count,
        trend: countyTrends.get(c.fips) ?? "flat",
      }));
  }, [byCounty, stateCode, countyTrends]);


  const cities = useMemo(
    () => (countyFips ? citiesForCounty(filtered, countyFips) : []),
    [filtered, countyFips],
  );

  const selectedCounty = countyFips ? byCounty.get(countyFips) : undefined;

  const totalMiles = useMemo(
    () => filtered.reduce((sum, r) => sum + Number(r.distance_miles), 0),
    [filtered],
  );

  const insights = useMemo(() => {
    if (!allRows.length) return [];
    if (countyFips) {
      const county = byCounty.get(countyFips);
      return buildInsights({
        allRows,
        sports,
        scope: {
          level: "county",
          stateCode: stateCode ?? countyFips.slice(0, 2),
          countyFips,
          countyName: county?.name ?? "Selected",
        },
      });
    }
    if (stateCode) {
      return buildInsights({ allRows, sports, scope: { level: "state", stateCode } });
    }
    return buildInsights({ allRows, sports, scope: { level: "national" } });
  }, [allRows, sports, stateCode, countyFips, byCounty]);


  return (
    <div className="relative">
      {/* Background flourish */}
      <div className="pointer-events-none absolute inset-0 grid-noise opacity-40" aria-hidden />

      <div className="relative w-full px-4 py-6 sm:px-6 md:py-8 lg:px-10">
        {/* Top layout — Top: top states · Left: hero + stats · Right: map */}
        {!stateCode ? (
          <section className="grid gap-8 lg:grid-cols-[minmax(320px,38%)_1fr] lg:items-stretch lg:min-h-[calc(100vh-5rem)]">
            {/* LEFT */}
            <div className="flex min-w-0 flex-col justify-between py-4 lg:py-8">
              <div className="min-w-0">
                <h1 className="font-display font-bold leading-[0.98] tracking-tight text-[clamp(2.4rem,4vw,4.6rem)] break-words hyphens-auto">
                  Every mile
                  <br />
                  your state
                  <br />
                  climbs,
                  <br />
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: "var(--gradient-primary)" }}
                  >
                    on the map.
                  </span>
                </h1>
                <p className="mt-4 max-w-lg text-[1.05rem] leading-relaxed text-text-secondary">
                  Log a walk, run, or ride and watch your county climb the national board. No
                  trackers, no feeds — just counties and states moving together.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {signedIn ? (
                    <Link to="/portal" className="btn btn-cta">
                      Go to my portal
                    </Link>
                  ) : (
                    <Link to="/auth" className="btn btn-cta">
                      Access the Club
                    </Link>
                  )}
                </div>

                {/* Top states — below the main tagline and CTA */}
                <div className="mt-8 mb-8">
                  <LeaderboardList
                    title="Top states"
                    items={topStates.slice(0, 5)}
                    loading={isLoading}
                    emptyLabel="No miles logged yet."
                    onSelect={(key) => setSearch({ state: key })}
                    clickHint={(it) => `Click to see ${it.label}'s county map and leaderboard.`}
                  />
                </div>
              </div>

              <div className="mt-8 lg:mt-0">
                <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-lg">
                  <Stat
                    label="Miles"
                    value={isLoading ? "…" : formatMiles(totalMiles).replace(" mi", "")}
                  />
                  <Stat label="States" value={isLoading ? "…" : String(byState.size)} />
                  <Stat label="Workouts" value={isLoading ? "…" : String(filtered.length)} />
                </div>
                <div className="stat-divider mt-6 max-w-lg" />
                <p className="mono mt-3 text-center text-[0.7rem] uppercase tracking-[0.18em] text-text-muted max-w-lg">
                  Updated in real time · miles + logs
                </p>
              </div>
            </div>

            {/* RIGHT — map surface */}
            <div id="explore" className="relative flex flex-col gap-4">
              <DataInsights insights={insights} sports={sports} loading={isLoading} />
              <div className="glass relative flex-1 overflow-hidden p-4 md:p-5 flex flex-col">
                {/* Sport filter — floating on the map */}
                <div className="absolute left-1/2 top-6 z-10 -translate-x-1/2">
                  <SportFilter value={sports} onChange={(v) => setSearch({ sports: v })} />
                </div>

                <div className="flex-1 flex items-center justify-center pt-4">
                  <NationalMap
                    byState={byState}
                    selected={null}
                    onSelect={(code) => setSearch({ state: code })}
                  />
                </div>
              </div>

              <MapLegend />
            </div>

          </section>
        ) : (
          <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {search.from === "leaderboards" ? (
                  <Link to="/leaderboards" className="btn btn-ghost">
                    <ArrowLeft size={16} strokeWidth={2} /> Back to leaderboards
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSearch({ state: null, county: null })}
                    className="btn btn-ghost"
                  >
                    <ArrowLeft size={16} strokeWidth={2} /> National map
                  </button>
                )}

                <h3 className="font-display text-2xl font-bold">{stateName(stateCode)}</h3>
                <span className="chip">
                  <Trophy size={12} strokeWidth={2} />
                  {formatMiles(
                    [...byCounty.values()]
                      .filter((c) => c.state_code === stateCode)
                      .reduce((s, c) => s + c.totalMiles, 0),
                  )}
                </span>
              </div>
              <SportFilter value={sports} onChange={(v) => setSearch({ sports: v })} />
            </div>

            <div className="mb-6">
              <DataInsights insights={insights} sports={sports} loading={isLoading} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(320px,38%)_1fr] lg:items-stretch">

              <div className="space-y-6">
                {selectedCounty && (
                  <div className="glass">
                    <CityList
                      countyName={selectedCounty.name}
                      cities={cities}
                      loading={isLoading}
                    />
                  </div>
                )}

                <LeaderboardList
                  title={`Top counties · ${stateName(stateCode)}`}
                  items={topCountiesInState}
                  loading={isLoading}
                  emptyLabel="No miles logged in this state yet."
                  onSelect={(key) => setSearch({ county: key })}
                  clickHint={(it) =>
                    `Click to see ${it.label}'s active cities and local leaderboard.`
                  }
                />
              </div>

              <div className="glass p-4 md:p-5">
                <CountyMap
                  stateCode={stateCode}
                  byCounty={byCounty}
                  selectedFips={countyFips}
                  onSelect={(fips) => setSearch({ county: fips })}
                />
                <p className="mono mt-3 text-center text-[0.7rem] uppercase tracking-[0.16em] text-text-muted">
                  {countyFips
                    ? "Click the same county again to close its city list."
                    : "Click a county to reveal its active cities."}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
