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
}

export async function fetchWorkouts(sports: Sport[]): Promise<WorkoutRow[]> {
  let q = supabase
    .from("workouts")
    .select("id, sport, distance_miles, state_code, county_fips, county_name, city, performed_at")
    .limit(5000);
  if (sports.length > 0 && sports.length < 3) {
    q = q.in("sport", sports);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as WorkoutRow[];
}
