import { useMemo } from "react";
import type { WorkoutRow, Sport } from "./public-workouts";

export interface Aggregate {
  totalMiles: number;
  count: number;
}
export interface CountyAgg extends Aggregate {
  fips: string;
  name: string;
  state_code: string;
}
export interface StateAgg extends Aggregate {
  code: string;
}
export interface CityAgg extends Aggregate {
  name: string;
  state_code: string;
}
export interface IndividualAgg extends Aggregate {
  user_id: string | null;
  full_name: string | null;
}

export function aggregate(rows: WorkoutRow[]) {
  const byState = new Map<string, StateAgg>();
  const byCounty = new Map<string, CountyAgg>();

  for (const r of rows) {
    const s = byState.get(r.state_code) ?? { code: r.state_code, totalMiles: 0, count: 0 };
    s.totalMiles += Number(r.distance_miles);
    s.count += 1;
    byState.set(r.state_code, s);

    const c = byCounty.get(r.county_fips) ?? {
      fips: r.county_fips,
      name: r.county_name,
      state_code: r.state_code,
      totalMiles: 0,
      count: 0,
    };
    c.totalMiles += Number(r.distance_miles);
    c.count += 1;
    byCounty.set(r.county_fips, c);
  }

  return { byState, byCounty };
}

export function aggregateIndividuals(rows: WorkoutRow[]): IndividualAgg[] {
  const map = new Map<string, IndividualAgg>();
  for (const r of rows) {
    const key = r.user_id ?? "__anon__";
    const existing = map.get(key) ?? {
      user_id: r.user_id ?? null,
      full_name: r.full_name ?? null,
      totalMiles: 0,
      count: 0,
    };
    existing.totalMiles += Number(r.distance_miles);
    existing.count += 1;
    map.set(key, existing);
  }
  return [...map.values()].sort((a, b) => b.totalMiles - a.totalMiles);
}

export function citiesForCounty(rows: WorkoutRow[], countyFips: string): CityAgg[] {
  const byCity = new Map<string, CityAgg>();
  for (const r of rows) {
    if (r.county_fips !== countyFips) continue;
    const key = r.city.trim();
    const c = byCity.get(key) ?? { name: key, totalMiles: 0, count: 0 };
    c.totalMiles += Number(r.distance_miles);
    c.count += 1;
    byCity.set(key, c);
  }
  return [...byCity.values()].sort((a, b) => b.totalMiles - a.totalMiles);
}

export function useHeatLevel(max: number) {
  return useMemo(() => {
    if (max <= 0) return () => 0;
    return (v: number): 0 | 1 | 2 | 3 | 4 | 5 => {
      if (v <= 0) return 0;
      const r = v / max;
      if (r < 0.1) return 1;
      if (r < 0.25) return 2;
      if (r < 0.5) return 3;
      if (r < 0.8) return 4;
      return 5;
    };
  }, [max]);
}

export function filterSports(rows: WorkoutRow[], sports: Sport[]): WorkoutRow[] {
  if (sports.length === 0 || sports.length === 3) return rows;
  const set = new Set(sports);
  return rows.filter((r) => set.has(r.sport));
}
