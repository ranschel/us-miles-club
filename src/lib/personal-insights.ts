import type { Sport } from "./public-workouts";
import { stateName } from "./us-geo";

export type PersonalInsightType = "momentum" | "goal" | "standout";
export type PersonalInsightIcon = "momentum" | "target" | "spark" | "info";

export interface PersonalInsight {
  id: string;
  type: PersonalInsightType;
  eyebrow: string;
  headline: string;
  supportingText?: string;
  icon: PersonalInsightIcon;
}

type Workout = {
  performed_at: string;
  distance_miles: number | string;
  sport: Sport;
  state_code?: string;
  county_fips?: string;
  county_name?: string;
  city?: string;
};

type Rankings = {
  individualRank: number | null;
  cityRank: number | null;
  countyRank: number | null;
  stateRank: number | null;
  cityName: string | null;
  countyName: string | null;
  stateCode: string | null;
  totalIndividuals: number;
  totalCities: number;
  totalCounties: number;
  totalStates: number;
} | undefined;

const fmtMi = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} mi`;

function startOfWeek(d: Date): Date {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  nd.setDate(nd.getDate() - nd.getDay());
  return nd;
}

interface WeekBucket {
  start: Date;
  miles: number;
}

export function weeklyBuckets(workouts: Workout[], weeks = 8): WeekBucket[] {
  const now = new Date();
  const buckets: WeekBucket[] = [];
  const first = startOfWeek(now);
  for (let i = weeks - 1; i >= 0; i--) {
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
}

export function strongestWeekIndex(buckets: WeekBucket[]): number {
  let idx = -1;
  let best = 0;
  buckets.forEach((b, i) => {
    if (b.miles > best) {
      best = b.miles;
      idx = i;
    }
  });
  return idx;
}

function momentumInsight(workouts: Workout[]): PersonalInsight | null {
  if (workouts.length === 0) return null;
  const buckets = weeklyBuckets(workouts, 8);
  const firstWorkoutTime = Math.min(
    ...workouts.map((w) => new Date(w.performed_at).getTime()).filter((n) => !isNaN(n)),
  );
  // Only consider buckets on/after the user's first workout.
  const activeBuckets = buckets.filter(
    (b) => b.start.getTime() + 7 * 86400000 > firstWorkoutTime,
  );
  const activeWeeks = activeBuckets.filter((b) => b.miles > 0).length;
  const bestIdx = strongestWeekIndex(activeBuckets);
  const best = bestIdx >= 0 ? activeBuckets[bestIdx] : null;
  const current = activeBuckets[activeBuckets.length - 1];
  const previousActive = [...activeBuckets.slice(0, -1)].reverse().find((b) => b.miles > 0);

  let headline: string;
  let supportingText: string | undefined;

  if (current && current.miles > 0 && previousActive) {
    const change = (current.miles - previousActive.miles) / previousActive.miles;
    if (change >= 0.1) {
      headline = `You logged ${fmtMi(current.miles)} this week, up ${Math.round(change * 100)}% from ${fmtMi(previousActive.miles)}.`;
    } else if (change <= -0.1) {
      headline = `You logged ${fmtMi(current.miles)} this week, down ${Math.round(Math.abs(change) * 100)}% from ${fmtMi(previousActive.miles)}.`;
    } else {
      headline = `You held steady at ${fmtMi(current.miles)} this week, close to your ${fmtMi(previousActive.miles)} the week before.`;
    }
    supportingText = best
      ? `Strongest week: ${fmtMi(best.miles)} · ${activeWeeks} active weeks in the last 8.`
      : `${activeWeeks} active weeks in the last 8.`;
  } else if (current && current.miles > 0) {
    headline = `You kicked off a new streak with ${fmtMi(current.miles)} this week.`;
    supportingText = best ? `Strongest week to date: ${fmtMi(best.miles)}.` : undefined;
  } else if (best) {
    headline = `Your strongest recent week was ${fmtMi(best.miles)}. A short outing this week keeps momentum alive.`;
    supportingText = `${activeWeeks} active weeks in the last 8.`;
  } else {
    return null;
  }

  return {
    id: "personal-momentum",
    type: "momentum",
    eyebrow: "Your momentum",
    headline,
    supportingText,
    icon: "momentum",
  };
}

function goalInsight(workouts: Workout[], goal: number | null): PersonalInsight | null {
  if (!goal || goal <= 0) return null;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const dayNumber = now.getDate();
  const daysRemaining = Math.max(1, daysInMonth - dayNumber + 1);
  const monthLabel = now.toLocaleString(undefined, { month: "long" });
  const miles = workouts.reduce((sum, w) => {
    const t = new Date(w.performed_at).getTime();
    return t >= monthStart ? sum + Number(w.distance_miles) : sum;
  }, 0);
  const pct = miles / goal;
  const remaining = goal - miles;
  const expectedPct = dayNumber / daysInMonth;

  let headline: string;
  let supportingText: string | undefined;

  if (miles >= goal) {
    headline = `You crushed your ${monthLabel} goal — ${fmtMi(miles)} logged against a ${fmtMi(goal)} target.`;
    supportingText = "Consider raising next month's goal to keep the streak challenging.";
  } else if (pct >= expectedPct) {
    const aheadPct = Math.round((pct - expectedPct) * 100);
    const dailyPace = remaining / daysRemaining;
    headline = `You're ${Math.round(pct * 100)}% of the way to ${fmtMi(goal)} — ${aheadPct}% ahead of a steady pace.`;
    supportingText = `Average ${dailyPace.toFixed(1)} mi per remaining day to finish ${monthLabel}.`;
  } else {
    const dailyPace = remaining / daysRemaining;
    headline = `You're ${Math.round(pct * 100)}% of the way to ${fmtMi(goal)}. Average ${dailyPace.toFixed(1)} mi per remaining day to hit your ${monthLabel} goal.`;
    supportingText = `${fmtMi(remaining)} to go with ${daysRemaining} days left.`;
  }

  return {
    id: "personal-goal",
    type: "goal",
    eyebrow: "Goal pace",
    headline,
    supportingText,
    icon: "target",
  };
}

function standoutInsight(
  workouts: Workout[],
  rankings: Rankings,
): PersonalInsight | null {
  if (workouts.length === 0) return null;

  // Sport dominance
  const sportMiles: Record<Sport, number> = { walk: 0, run: 0, bike: 0 };
  let total = 0;
  for (const w of workouts) {
    sportMiles[w.sport] += Number(w.distance_miles);
    total += Number(w.distance_miles);
  }
  const sportEntries = (Object.entries(sportMiles) as [Sport, number][]).sort(
    (a, b) => b[1] - a[1],
  );
  const dominantSport = sportEntries[0];
  const dominantShare = total > 0 ? dominantSport[1] / total : 0;

  // Distinct counties
  const counties = new Set<string>();
  for (const w of workouts) if (w.county_fips) counties.add(w.county_fips);

  // Geographic vs individual contrast
  if (rankings?.individualRank && rankings.stateRank && rankings.stateCode) {
    const stateBetter = rankings.stateRank * 5 < rankings.individualRank;
    if (stateBetter && rankings.stateRank <= 15) {
      return {
        id: "personal-standout",
        type: "standout",
        eyebrow: "Your standout",
        headline: `Your geographic standing is your standout: you rank #${rankings.stateRank} in ${stateName(rankings.stateCode)}, compared with #${rankings.individualRank} individually.`,
        supportingText: rankings.countyRank && rankings.countyName
          ? `Also #${rankings.countyRank} in ${rankings.countyName} County.`
          : undefined,
        icon: "spark",
      };
    }
    if (rankings.countyRank && rankings.countyRank <= 5 && rankings.countyName) {
      return {
        id: "personal-standout",
        type: "standout",
        eyebrow: "Your standout",
        headline: `You're #${rankings.countyRank} in ${rankings.countyName} County — a stronger local finish than your #${rankings.individualRank} individual rank.`,
        icon: "spark",
      };
    }
  }

  // County explorer proximity
  if (counties.size === 2) {
    return {
      id: "personal-standout",
      type: "standout",
      eyebrow: "Your standout",
      headline: `You've logged miles in 2 counties. One more unlocks the County Explorer badge.`,
      icon: "spark",
    };
  }

  // Sport concentration
  if (dominantShare >= 0.6 && total > 0) {
    const sportLabel = dominantSport[0] === "walk" ? "walking" : dominantSport[0] === "run" ? "running" : "biking";
    return {
      id: "personal-standout",
      type: "standout",
      eyebrow: "Your standout",
      headline: `${sportLabel.charAt(0).toUpperCase() + sportLabel.slice(1)} is your signature — ${Math.round(dominantShare * 100)}% of your ${fmtMi(total)} logged.`,
      supportingText: "Mix in another sport to earn a Cross-Train badge.",
      icon: "spark",
    };
  }

  // Fallback: total miles milestone
  const milestones = [10, 25, 50, 100, 250, 500, 1000];
  const nextMilestone = milestones.find((m) => m > total);
  if (nextMilestone) {
    return {
      id: "personal-standout",
      type: "standout",
      eyebrow: "Your standout",
      headline: `You're at ${fmtMi(total)} lifetime. ${fmtMi(nextMilestone - total)} to your next milestone at ${nextMilestone} mi.`,
      icon: "spark",
    };
  }

  return null;
}

export function generatePersonalInsights({
  workouts,
  rankings,
  monthlyGoal,
}: {
  workouts: Workout[];
  rankings: Rankings;
  monthlyGoal: number | null;
}): PersonalInsight[] {
  const out: PersonalInsight[] = [];
  const m = momentumInsight(workouts);
  if (m) out.push(m);
  const g = goalInsight(workouts, monthlyGoal);
  if (g) out.push(g);
  const s = standoutInsight(workouts, rankings);
  if (s) out.push(s);
  return out;
}

export function generateFootprintInsight(workouts: Workout[]): {
  headline: string;
  supportingText?: string;
} {
  const counties = new Set<string>();
  const states = new Set<string>();
  const cities = new Set<string>();
  for (const w of workouts) {
    if (w.county_fips) counties.add(w.county_fips);
    if (w.state_code) states.add(w.state_code);
    if (w.city && w.state_code) cities.add(`${w.state_code}|${w.city}`);
  }
  if (workouts.length === 0) {
    return {
      headline: "No footprint yet — log your first workout to light up a county on your map.",
    };
  }
  if (counties.size === 1) {
    return {
      headline: `Your footprint spans 1 county across ${cities.size} ${cities.size === 1 ? "city" : "cities"}.`,
      supportingText: "Log a workout in a neighboring county to expand your reach.",
    };
  }
  if (counties.size === 2) {
    return {
      headline: `You've logged miles in 2 counties. Explore one more to earn County Explorer.`,
    };
  }
  return {
    headline: `Your footprint covers ${counties.size} counties across ${states.size} ${states.size === 1 ? "state" : "states"}.`,
    supportingText: `${cities.size} ${cities.size === 1 ? "city" : "cities"} on the map.`,
  };
}
