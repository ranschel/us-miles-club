import { supabase } from "@/integrations/supabase/client";

export type Sport = "walk" | "run" | "bike";

export interface WorkoutRow {
  id: string;
  sport: Sport;
  distance_miles: number;
  state_code: string;
  county_fips: string;
  county_name: string;
  city: string;
  performed_at: string;
  user_id: string | null;
  full_name: string | null;
}

export async function fetchWorkouts(sports: Sport[]): Promise<WorkoutRow[]> {
  let q = supabase
    .from("workouts")
    .select("id, sport, distance_miles, state_code, county_fips, county_name, city, performed_at, user_id")
    .limit(5000);
  if (sports.length > 0 && sports.length < 3) {
    q = q.in("sport", sports);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Omit<WorkoutRow, "full_name">[];
  const userIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id))];

  let nameByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);
    if (profilesError) throw new Error(profilesError.message);
    for (const p of profiles ?? []) {
      if (p.full_name) nameByUser.set(p.user_id, p.full_name);
    }
  }

  return rows.map((r) => ({
    ...r,
    full_name: r.user_id ? nameByUser.get(r.user_id) ?? null : null,
  }));
}
