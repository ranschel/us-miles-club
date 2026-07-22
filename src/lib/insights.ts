import type { WorkoutRow, Sport } from "./public-workouts";
import { STATE_BY_CODE } from "./us-geo";
import { computeTrends, filterSports } from "./aggregate";

export type InsightType =
  | "leader"
  | "efficiency"
  | "concentration"
  | "sport-skew"
  | "momentum"
  | "close-race"
  | "local-leader"
  | "local-concentration"
  | "local-momentum"
  | "low-data";

export type InsightIcon = "trophy" | "spark" | "distribution" | "momentum" | "info";

export interface InsightAction {
  label: string;
  state?: string;
  county?: string;
}

export interface Insight {
  id: string;
  type: InsightType;
  eyebrow: string;
  headline: string;
  supportingText?: string;
  icon: InsightIcon;
  importance: number;
  action?: InsightAction;
}

export type Scope =
  | { level: "national" }
  | { level: "state"; stateCode: string }
  | { level: "county"; stateCode: string; countyFips: string; countyName: string };

const fmtMi = (n: number) =>
  `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} mi`;
const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

const SPORT_LABEL: Record<Sport, string> = { walk: "walking", run: "running", bike: "biking" };

interface RegionAgg {
  key: string;
  label: string;
  miles: number;
  count: number;
  contributors: Set<string>;
}

function aggregateBy(
  rows: WorkoutRow[],
  keyFn: (r: WorkoutRow) => string,
  labelFn: (r: WorkoutRow) => string,
): RegionAgg[] {
  const map = new Map<string, RegionAgg>();
  for (const r of rows) {
    const key = keyFn(r);
    const a = map.get(key) ?? {
      key,
      label: labelFn(r),
      miles: 0,
      count: 0,
      contributors: new Set<string>(),
    };
    a.miles += Number(r.distance_miles);
    a.count += 1;
    if (r.user_id) a.contributors.add(r.user_id);
    map.set(key, a);
  }
  return [...map.values()].sort((a, b) => b.miles - a.miles);
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function sportsLabelForFilter(sports: Sport[]): string {
  if (sports.length === 0 || sports.length === 3) return "all activity";
  if (sports.length === 1) return SPORT_LABEL[sports[0]];
  return sports.map((s) => SPORT_LABEL[s]).join(" & ");
}

function concentrationBand(share: number): "widely distributed" | "moderately concentrated" | "highly concentrated" {
  if (share < 0.35) return "widely distributed";
  if (share <= 0.55) return "moderately concentrated";
  return "highly concentrated";
}

export interface GenerateInput {
  allRows: WorkoutRow[]; // unfiltered (all sports)
  filteredRows: WorkoutRow[]; // after sport filter (and geo scope for local)
  sports: Sport[];
  scope: Scope;
}

export function generateInsights(input: GenerateInput): Insight[] {
  const { filteredRows, allRows, sports, scope } = input;
  const filterLabel = sportsLabelForFilter(sports);
  const candidates: Insight[] = [];

  if (filteredRows.length < 5) {
    return [
      {
        id: "low-data",
        type: "low-data",
        eyebrow: "Not enough data",
        headline: "More activity is needed before a reliable pattern emerges.",
        supportingText: `${filteredRows.length} logged ${filteredRows.length === 1 ? "activity" : "activities"} matches the current filters.`,
        icon: "info",
        importance: 0,
      },
    ];
  }

  const totalMiles = filteredRows.reduce((s, r) => s + Number(r.distance_miles), 0);

  if (scope.level === "national") {
    const byState = aggregateBy(
      filteredRows,
      (r) => r.state_code,
      (r) => STATE_BY_CODE[r.state_code]?.name ?? r.state_code,
    );

    let leaderKey: string | null = null;

    // 1. Volume leader
    if (byState.length > 0) {
      const first = byState[0];
      const second = byState[1];
      leaderKey = first.key;
      let headline = `${first.label} leads ${filterLabel === "all activity" ? "the country" : filterLabel} with ${fmtMi(first.miles)} across ${first.count} logged ${first.count === 1 ? "activity" : "activities"}.`;
      let close = false;
      if (second) {
        const lead = (first.miles - second.miles) / Math.max(second.miles, 1);
        if (lead < 0.05) {
          headline = `${first.label} narrowly leads ${second.label} — ${fmtMi(first.miles)} to ${fmtMi(second.miles)}.`;
          close = true;
        } else if (sports.length === 1) {
          headline = `${first.label} leads ${filterLabel} volume with ${fmtMi(first.miles)}, ${fmtPct(lead)} ahead of ${second.label}.`;
        }
      }
      candidates.push({
        id: "leader",
        type: close ? "close-race" : "leader",
        eyebrow: close ? "Close race" : "Volume leader",
        headline,
        icon: "trophy",
        importance: close ? 85 : 100,
        action: { label: `Explore ${first.label}`, state: first.key },
      });
    }

    // 2. Per-logger standout — always distinct users, min 5 loggers, exclude volume leader.
    const hasContributors = byState.some((s) => s.contributors.size > 0);
    if (hasContributors) {
      const eligibleAll = byState.filter((s) => s.contributors.size >= 5);
      const per = (s: RegionAgg) => s.miles / s.contributors.size;
      if (eligibleAll.length >= 3) {
        const med = median(eligibleAll.map(per));
        // Exclude the volume leader from the standout unless nothing else qualifies.
        const withoutLeader = eligibleAll.filter((s) => s.key !== leaderKey);
        const pool = withoutLeader.length > 0 ? withoutLeader : eligibleAll;
        const ranked = [...pool].sort((a, b) => per(b) - per(a));
        const top = ranked[0];
        const ratio = per(top) / Math.max(med, 0.0001);
        if (ratio >= 1.4) {
          const rankInMiles = byState.findIndex((s) => s.key === top.key) + 1;
          const rankSuffix =
            rankInMiles > 0 && rankInMiles <= 10
              ? `${top.label} ranks #${rankInMiles} in total miles but`
              : `${top.label}`;
          const headline = `${rankSuffix} records ${per(top).toFixed(1)} mi per active logger — ${ratio.toFixed(1)}× the national median of ${med.toFixed(1)} mi.`;
          const supporting = `${top.contributors.size} active loggers · ${fmtMi(top.miles)} total.`;
          candidates.push({
            id: "efficiency",
            type: "efficiency",
            eyebrow: "Per-logger standout",
            headline,
            supportingText: supporting,
            icon: "spark",
            importance: 70 + Math.min(20, (ratio - 1.4) * 20),
            action: { label: `Explore ${top.label}`, state: top.key },
          });
        }
      }
    }

    // 3. Concentration
    if (byState.length >= 3 && totalMiles > 0) {
      const topThree = byState.slice(0, 3).reduce((s, r) => s + r.miles, 0);
      const share = topThree / totalMiles;
      const band = concentrationBand(share);
      const activity = filterLabel === "all activity" ? "Activity" : filterLabel.charAt(0).toUpperCase() + filterLabel.slice(1);
      const headline = `${activity} is ${band}: the top three states account for ${fmtPct(share)} of all ${filterLabel === "all activity" ? "logged miles" : `${filterLabel} miles`}.`;
      candidates.push({
        id: "concentration",
        type: "concentration",
        eyebrow: "Activity pattern",
        headline,
        supportingText: byState
          .slice(0, 3)
          .map((s) => s.label)
          .join(", "),
        icon: "distribution",
        importance: 55 + (share > 0.55 ? 20 : share < 0.35 ? 10 : 0),
      });
    }

    // 4. Sport skew (only when a single sport is active)
    if (sports.length === 1) {
      const activeSport = sports[0];
      const nationalAll = allRows.reduce((s, r) => s + Number(r.distance_miles), 0);
      const nationalSport = allRows
        .filter((r) => r.sport === activeSport)
        .reduce((s, r) => s + Number(r.distance_miles), 0);
      const nationalShare = nationalAll > 0 ? nationalSport / nationalAll : 0;

      const stateAllMiles = new Map<string, number>();
      const stateSportMiles = new Map<string, number>();
      for (const r of allRows) {
        stateAllMiles.set(
          r.state_code,
          (stateAllMiles.get(r.state_code) ?? 0) + Number(r.distance_miles),
        );
        if (r.sport === activeSport) {
          stateSportMiles.set(
            r.state_code,
            (stateSportMiles.get(r.state_code) ?? 0) + Number(r.distance_miles),
          );
        }
      }
      let bestCode: string | null = null;
      let bestShare = 0;
      let bestSportMiles = 0;
      for (const [code, sportM] of stateSportMiles) {
        const all = stateAllMiles.get(code) ?? 0;
        if (all < 50 || sportM < 20) continue;
        const share = sportM / all;
        if (share > bestShare) {
          bestShare = share;
          bestCode = code;
          bestSportMiles = sportM;
        }
      }
      if (bestCode && bestShare > nationalShare + 0.15) {
        const name = STATE_BY_CODE[bestCode]?.name ?? bestCode;
        candidates.push({
          id: "sport-skew",
          type: "sport-skew",
          eyebrow: "Sport skew",
          headline: `${SPORT_LABEL[activeSport].charAt(0).toUpperCase() + SPORT_LABEL[activeSport].slice(1)} makes up ${fmtPct(bestShare)} of ${name}'s mileage, versus ${fmtPct(nationalShare)} nationally.`,
          supportingText: `${fmtMi(bestSportMiles)} of ${SPORT_LABEL[activeSport]} logged in ${name}.`,
          icon: "spark",
          importance: 78,
          action: { label: `Explore ${name}`, state: bestCode },
        });
      }
    }

    // 5. Momentum — exclude the volume leader unless it's the only qualifier.
    const trends = computeTrends(filteredRows, (r) => r.state_code);
    const stateChange = new Map<
      string,
      { pct: number; recentMiles: number; priorMiles: number; recentCount: number }
    >();
    {
      let maxT = 0;
      for (const r of filteredRows) {
        const t = new Date(r.performed_at).getTime();
        if (!isNaN(t) && t > maxT) maxT = t;
      }
      const now = maxT || Date.now();
      const dayMs = 86400000;
      const recentStart = now - 7 * dayMs;
      const priorStart = now - 14 * dayMs;
      const recent = new Map<string, number>();
      const recentCount = new Map<string, number>();
      const prior = new Map<string, number>();
      for (const r of filteredRows) {
        const t = new Date(r.performed_at).getTime();
        if (isNaN(t)) continue;
        const k = r.state_code;
        if (t >= recentStart && t <= now) {
          recent.set(k, (recent.get(k) ?? 0) + Number(r.distance_miles));
          recentCount.set(k, (recentCount.get(k) ?? 0) + 1);
        } else if (t >= priorStart && t < recentStart) {
          prior.set(k, (prior.get(k) ?? 0) + Number(r.distance_miles));
        }
      }
      for (const k of new Set([...recent.keys(), ...prior.keys()])) {
        const a = recent.get(k) ?? 0;
        const b = prior.get(k) ?? 0;
        const denom = Math.max(b, 1);
        stateChange.set(k, {
          pct: (a - b) / denom,
          recentMiles: a,
          priorMiles: b,
          recentCount: recentCount.get(k) ?? 0,
        });
      }
    }
    type MomentumPick = { code: string; pct: number; recentMiles: number; priorMiles: number };
    const pickBest = (dir: "up" | "down", excludeKey: string | null): MomentumPick | null => {
      let best: MomentumPick | null = null;
      for (const [code, m] of stateChange) {
        if (excludeKey && code === excludeKey) continue;
        if (m.recentCount < 5) continue;
        if (Math.abs(m.pct) < 0.1 && m.priorMiles > 0) continue;
        if (trends.get(code) !== dir) continue;
        if (dir === "up" && (!best || m.pct > best.pct)) {
          best = { code, pct: m.pct, recentMiles: m.recentMiles, priorMiles: m.priorMiles };
        }
        if (dir === "down" && (!best || m.pct < best.pct)) {
          best = { code, pct: m.pct, recentMiles: m.recentMiles, priorMiles: m.priorMiles };
        }
      }
      return best;
    };
    const bestUp = pickBest("up", leaderKey) ?? pickBest("up", null);
    const bestDown = !bestUp ? pickBest("down", leaderKey) ?? pickBest("down", null) : null;

    if (bestUp) {
      const name = STATE_BY_CODE[bestUp.code]?.name ?? bestUp.code;
      const headline =
        bestUp.priorMiles > 0
          ? `${name} logged ${fmtMi(bestUp.recentMiles)} in the last 7 days, up ${fmtPct(bestUp.pct)} from ${fmtMi(bestUp.priorMiles)} the previous 7 days.`
          : `${name} returned to activity with ${fmtMi(bestUp.recentMiles)} in the last 7 days after a quiet prior week.`;
      candidates.push({
        id: "momentum-up",
        type: "momentum",
        eyebrow: "Recent momentum",
        headline,
        icon: "momentum",
        importance: 68 + Math.min(15, bestUp.pct * 30),
        action: { label: `Explore ${name}`, state: bestUp.code },
      });
    } else if (bestDown) {
      const name = STATE_BY_CODE[bestDown.code]?.name ?? bestDown.code;
      candidates.push({
        id: "momentum-down",
        type: "momentum",
        eyebrow: "Recent momentum",
        headline: `${name} logged ${fmtMi(bestDown.recentMiles)} in the last 7 days, down ${fmtPct(Math.abs(bestDown.pct))} from ${fmtMi(bestDown.priorMiles)} the previous 7 days.`,
        icon: "momentum",
        importance: 60,
        action: { label: `Explore ${name}`, state: bestDown.code },
      });
    }
  }


  if (scope.level === "state") {
    const stateName = STATE_BY_CODE[scope.stateCode]?.name ?? scope.stateCode;
    const stateRows = filteredRows.filter((r) => r.state_code === scope.stateCode);
    if (stateRows.length < 5) {
      return [
        {
          id: "low-data",
          type: "low-data",
          eyebrow: "Not enough data",
          headline: `More ${filterLabel} activity is needed in ${stateName} before a reliable pattern emerges.`,
          icon: "info",
          importance: 0,
        },
      ];
    }
    const stateTotal = stateRows.reduce((s, r) => s + Number(r.distance_miles), 0);
    const byCounty = aggregateBy(
      stateRows,
      (r) => r.county_fips,
      (r) => `${r.county_name} County`,
    );

    // Local leader
    if (byCounty.length > 0) {
      const first = byCounty[0];
      const second = byCounty[1];
      let headline = `${first.label} leads ${stateName} with ${fmtMi(first.miles)} across ${first.count} logged ${first.count === 1 ? "activity" : "activities"}.`;
      if (second) {
        const lead = (first.miles - second.miles) / Math.max(second.miles, 1);
        if (lead >= 0.05) {
          headline = `${first.label} leads ${stateName} with ${fmtMi(first.miles)}, ${fmtPct(lead)} ahead of ${second.label}.`;
        }
      }
      candidates.push({
        id: "local-leader",
        type: "local-leader",
        eyebrow: "County leader",
        headline,
        icon: "trophy",
        importance: 100,
        action: {
          label: `Open ${first.label}`,
          state: scope.stateCode,
          county: first.key,
        },
      });
    }

    // Local concentration
    if (byCounty.length >= 3 && stateTotal > 0) {
      const topThreeShare = byCounty.slice(0, 3).reduce((s, c) => s + c.miles, 0) / stateTotal;
      const band = concentrationBand(topThreeShare);
      candidates.push({
        id: "local-concentration",
        type: "local-concentration",
        eyebrow: "Activity pattern",
        headline: `${stateName}'s mileage is ${band}: the top three counties account for ${fmtPct(topThreeShare)} of state totals.`,
        supportingText: byCounty
          .slice(0, 3)
          .map((c) => c.label)
          .join(", "),
        icon: "distribution",
        importance: 60,
      });
    } else if (byCounty.length >= 1 && stateTotal > 0) {
      const top = byCounty[0];
      const share = top.miles / stateTotal;
      if (share > 0.5) {
        candidates.push({
          id: "local-dominant",
          type: "local-concentration",
          eyebrow: "Activity pattern",
          headline: `${top.label} accounts for ${fmtPct(share)} of ${stateName}'s recorded mileage.`,
          icon: "distribution",
          importance: 65,
          action: {
            label: `Open ${top.label}`,
            state: scope.stateCode,
            county: top.key,
          },
        });
      }
    }

    // Local momentum — fastest-growing county in this state
    {
      let maxT = 0;
      for (const r of stateRows) {
        const t = new Date(r.performed_at).getTime();
        if (!isNaN(t) && t > maxT) maxT = t;
      }
      const now = maxT || Date.now();
      const dayMs = 86400000;
      const recentStart = now - 7 * dayMs;
      const priorStart = now - 14 * dayMs;
      const recent = new Map<string, { miles: number; count: number }>();
      const prior = new Map<string, number>();
      for (const r of stateRows) {
        const t = new Date(r.performed_at).getTime();
        if (isNaN(t)) continue;
        const k = r.county_fips;
        if (t >= recentStart && t <= now) {
          const cur = recent.get(k) ?? { miles: 0, count: 0 };
          cur.miles += Number(r.distance_miles);
          cur.count += 1;
          recent.set(k, cur);
        } else if (t >= priorStart && t < recentStart) {
          prior.set(k, (prior.get(k) ?? 0) + Number(r.distance_miles));
        }
      }
      let best: { fips: string; pct: number } | null = null;
      for (const [fips, { miles, count }] of recent) {
        if (count < 5) continue;
        const b = prior.get(fips) ?? 0;
        const pct = (miles - b) / Math.max(b, 1);
        if (pct >= 0.1 && (!best || pct > best.pct)) best = { fips, pct };
      }
      if (best) {
        const c = byCounty.find((c) => c.key === best!.fips);
        const leader = byCounty[0];
        if (c && leader && leader.key !== c.key) {
          candidates.push({
            id: "local-momentum",
            type: "local-momentum",
            eyebrow: "Recent momentum",
            headline: `${leader.label} leads ${stateName}, but ${c.label} is growing fastest this week (+${fmtPct(best.pct)}).`,
            icon: "momentum",
            importance: 72,
            action: { label: `Open ${c.label}`, state: scope.stateCode, county: c.key },
          });
        } else if (c) {
          candidates.push({
            id: "local-momentum",
            type: "local-momentum",
            eyebrow: "Recent momentum",
            headline: `${c.label} is growing fastest in ${stateName}, up ${fmtPct(best.pct)} from the previous seven days.`,
            icon: "momentum",
            importance: 70,
            action: { label: `Open ${c.label}`, state: scope.stateCode, county: c.key },
          });
        }
      }
    }
  }

  if (scope.level === "county") {
    const countyRows = filteredRows.filter((r) => r.county_fips === scope.countyFips);
    if (countyRows.length < 5) {
      return [
        {
          id: "low-data",
          type: "low-data",
          eyebrow: "Not enough data",
          headline: `More ${filterLabel} activity is needed in ${scope.countyName} County before a reliable pattern emerges.`,
          icon: "info",
          importance: 0,
        },
      ];
    }
    const total = countyRows.reduce((s, r) => s + Number(r.distance_miles), 0);
    const cities = aggregateBy(countyRows, (r) => r.city.trim(), (r) => r.city.trim());
    if (cities.length > 0) {
      const first = cities[0];
      const share = first.miles / total;
      if (share > 0.5) {
        candidates.push({
          id: "local-dominant-city",
          type: "local-concentration",
          eyebrow: "City concentration",
          headline: `${first.label} contributes ${fmtPct(share)} of ${scope.countyName} County's recorded mileage.`,
          icon: "distribution",
          importance: 90,
        });
      } else {
        candidates.push({
          id: "local-leader-city",
          type: "local-leader",
          eyebrow: "City leader",
          headline: `${first.label} leads ${scope.countyName} County with ${fmtMi(first.miles)} across ${first.count} logged ${first.count === 1 ? "activity" : "activities"}.`,
          icon: "trophy",
          importance: 85,
        });
      }
    }
    if (cities.length >= 3) {
      const topThreeShare = cities.slice(0, 3).reduce((s, c) => s + c.miles, 0) / total;
      const band = concentrationBand(topThreeShare);
      candidates.push({
        id: "county-concentration",
        type: "local-concentration",
        eyebrow: "Activity pattern",
        headline: `Activity across ${scope.countyName} County is ${band}: the top three cities account for ${fmtPct(topThreeShare)} of local mileage.`,
        supportingText: cities.slice(0, 3).map((c) => c.label).join(", "),
        icon: "distribution",
        importance: 55,
      });
    }
  }

  // Dedupe by type — keep the highest-importance per type
  const bestByType = new Map<InsightType, Insight>();
  for (const c of candidates) {
    const existing = bestByType.get(c.type);
    if (!existing || c.importance > existing.importance) bestByType.set(c.type, c);
  }
  return [...bestByType.values()]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3);
}

// Convenience wrapper used by callers with the raw workout dataset.
export function buildInsights({
  allRows,
  sports,
  scope,
}: {
  allRows: WorkoutRow[];
  sports: Sport[];
  scope: Scope;
}): Insight[] {
  const filteredRows = filterSports(allRows, sports);
  return generateInsights({ allRows, filteredRows, sports, scope });
}
