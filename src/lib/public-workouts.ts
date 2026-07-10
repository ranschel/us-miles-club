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

// Re-export server fn as fetchWorkouts for a drop-in replacement callable
// with the same (sports) argument used across the client.
import { fetchPublicWorkouts } from "@/lib/public-workouts.functions";

export function fetchWorkouts(sports: Sport[]): Promise<WorkoutRow[]> {
  return fetchPublicWorkouts({ data: { sports } });
}
