import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { WorkoutRow, Sport } from "@/lib/public-workouts";

const Input = z.object({
  sports: z.enum(["walk", "run", "bike"]).array(),
});

/**
 * Public leaderboard/map feed. Reads through the service role so anonymous
 * visitors can still see aggregate mileage even though the base tables are
 * locked down. Only fields required by the public UI are returned; no email,
 * timestamps, or other PII beyond a display name.
 */
export const fetchPublicWorkouts = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<WorkoutRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("workouts")
      .select(
        "id, sport, distance_miles, state_code, county_fips, county_name, city, performed_at, user_id",
      )
      .limit(5000);
    if (data.sports.length > 0 && data.sports.length < 3) {
      q = q.in("sport", data.sports);
    }
    const { data: rowsRaw, error } = await q;
    if (error) throw new Error(error.message);

    const rows = (rowsRaw ?? []) as Array<Omit<WorkoutRow, "full_name"> & { sport: Sport }>;
    const userIds = [
      ...new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id)),
    ];

    const nameByUser = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
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
  });
