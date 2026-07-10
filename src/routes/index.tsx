import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { ArrowLeft, MapPin, Trophy } from "lucide-react";

import { SportFilter } from "@/components/sport-filter";
import { NationalMap, CountyMap } from "@/components/us-map";
import { CityList, LeaderboardList } from "@/components/leaderboard-list";
import { fetchWorkouts, type Sport } from "@/lib/public-workouts";
import { aggregate, citiesForCounty, filterSports } from "@/lib/aggregate";
import { STATE_BY_CODE, stateName } from "@/lib/us-geo";
import { formatMiles } from "@/lib/format";

const SearchSchema = z.object({
  sports: z.array(z.enum(["walk", "run", "bike"])).optional(),
  state: z.string().length(2).optional(),
  county: z.string().length(5).optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: Index,
  head: () => ({
    meta: [
      { title: "US Miles Club — collective mileage for your county" },
      {
        name: "description",
        content:
          "Explore a live US map of walks, runs, and rides. Drill from state to county to city — no sign-in required.",
      },
    ],
  }),
});

function Index() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const sports: Sport[] = search.sports ?? ["walk", "run", "bike"];
  const stateCode = search.state ?? null;
  const countyFips = search.county ?? null;

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

  const topStates = useMemo(
    () =>
      [...byState.values()]
        .sort((a, b) => b.totalMiles - a.totalMiles)
        .slice(0, 10)
        .map((s) => ({
          key: s.code,
          label: stateName(s.code),
          miles: s.totalMiles,
          count: s.count,
        })),
    [byState],
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
      }));
  }, [byCounty, stateCode]);

  const cities = useMemo(
    () => (countyFips ? citiesForCounty(filtered, countyFips) : []),
    [filtered, countyFips],
  );

  const selectedCounty = countyFips ? byCounty.get(countyFips) : undefined;

  const totalMiles = useMemo(
    () => filtered.reduce((sum, r) => sum + Number(r.distance_miles), 0),
    [filtered],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="chip mb-4" style={{ background: "var(--color-muted)" }}>
          <MapPin size={14} strokeWidth={2} />
          United States · live leaderboard
        </p>
        <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight">
          Every mile your neighborhood moves,{" "}
          <span className="text-primary">on the map</span>.
        </h1>
        <p className="mt-4 text-lg text-text-secondary max-w-xl">
          Log a walk, run, or ride and watch your county climb the national board. No trackers,
          no feeds — just neighbors moving together.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/auth" className="btn btn-cta">
            Join the Club
          </Link>
          <a href="#explore" className="btn btn-secondary">
            Explore the map
          </a>
        </div>
        <dl className="mt-8 grid grid-cols-3 gap-4 max-w-md">
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-secondary">Miles logged</dt>
            <dd className="mono text-2xl font-bold">
              {isLoading ? "…" : formatMiles(totalMiles)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-secondary">Active states</dt>
            <dd className="mono text-2xl font-bold">{isLoading ? "…" : byState.size}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-secondary">Workouts</dt>
            <dd className="mono text-2xl font-bold">{isLoading ? "…" : filtered.length}</dd>
          </div>
        </dl>
      </section>


      {/* Explore section */}
      <section id="explore" className="mt-16 scroll-mt-20">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">Explore the map</h2>
            <p className="mt-1 text-text-secondary">
              Pick a sport, click a state to drill in, then a county to see its cities.
            </p>
          </div>
          <SportFilter value={sports} onChange={(v) => setSearch({ sports: v })} />
        </div>

        {!stateCode ? (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="card p-3 md:p-4">
              <NationalMap
                byState={byState}
                selected={null}
                onSelect={(code) => setSearch({ state: code })}
              />
              <p className="mt-3 text-center text-xs text-text-secondary">
                Darker states = more miles logged. Click a state to zoom in.
              </p>
            </div>
            <LeaderboardList
              title="Top states"
              items={topStates}
              loading={isLoading}
              emptyLabel="No miles logged yet."
            />
          </div>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setSearch({ state: null, county: null })}
                className="btn btn-ghost"
              >
                <ArrowLeft size={16} strokeWidth={2} /> Back to national map
              </button>
              <h3 className="text-2xl font-bold">{stateName(stateCode)}</h3>
              <span className="chip">
                <Trophy size={14} strokeWidth={2} />
                {formatMiles(
                  [...byCounty.values()]
                    .filter((c) => c.state_code === stateCode)
                    .reduce((s, c) => s + c.totalMiles, 0),
                )}
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="card p-3 md:p-4">
                <CountyMap
                  stateCode={stateCode}
                  byCounty={byCounty}
                  selectedFips={countyFips}
                  onSelect={(fips) => setSearch({ county: fips })}
                />
                <p className="mt-3 text-center text-xs text-text-secondary">
                  {countyFips
                    ? "Click the same county again to close its city list."
                    : "Click a county to reveal its active cities."}
                </p>
              </div>

              <div className="space-y-6">
                <LeaderboardList
                  title={`Top counties in ${stateName(stateCode)}`}
                  items={topCountiesInState}
                  loading={isLoading}
                  emptyLabel="No miles logged in this state yet."
                />

                {selectedCounty && (
                  <div className="card">
                    <CityList
                      countyName={selectedCounty.name}
                      cities={cities}
                      loading={isLoading}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
