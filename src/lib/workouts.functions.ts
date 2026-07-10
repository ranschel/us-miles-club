import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const WorkoutFields = z.object({
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
  .inputValidator((data: unknown) => WorkoutFields.parse(data))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("workouts")
      .insert({ ...data, user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

const UpdateInput = WorkoutFields.extend({ id: z.string().uuid() });

export const updateWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => UpdateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    const { error } = await context.supabase
      .from("workouts")
      .update(fields)
      .eq("id", id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const IdInput = z.object({ id: z.string().uuid() });

export const getWorkout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => IdInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("workouts")
      .select("id, sport, distance_miles, state_code, county_fips, county_name, city, performed_at")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Workout not found.");
    return row;
  });

export const deleteWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => IdInput.parse(data))
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

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      full_name: data?.full_name ?? "",
      email: (context.claims as { email?: string }).email ?? "",
    };
  });

const NameInput = z.object({
  full_name: z.string().trim().min(1, "Enter your full name.").max(80),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => NameInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .upsert(
        { user_id: context.userId, full_name: data.full_name },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
