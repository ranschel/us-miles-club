import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateInput = z.object({
  sport: z.enum(["walk", "run", "bike"]),
  distance_miles: z.number().positive().max(200),
  state_code: z.string().length(2),
  county_fips: z.string().length(5),
  county_name: z.string().min(1).max(80),
  city: z.string().min(1).max(80),
  performed_at: z.string().datetime(),
});

export const createWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("workouts")
      .insert({ ...data, user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

const DeleteInput = z.object({ id: z.string().uuid() });

export const deleteWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DeleteInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workouts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyWorkouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workouts")
      .select("id, sport, distance_miles, state_code, county_name, city, performed_at")
      .eq("user_id", context.userId)
      .order("performed_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data;
  });
