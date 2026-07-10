import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aggregate, aggregateCities, aggregateIndividuals, mostMilesBy } from "@/lib/aggregate";
import type { WorkoutRow } from "@/lib/public-workouts";

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRecoveryCode(): string {
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += RECOVERY_ALPHABET[bytes[i] % RECOVERY_ALPHABET.length];
    if (i % 4 === 3 && i !== 15) out += "-";
  }
  return out;
}

function normalizeRecoveryCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function hashRecoveryCode(raw: string): string {
  return createHash("sha256").update(normalizeRecoveryCode(raw)).digest("hex");
}


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
      .select("id, sport, distance_miles, state_code, county_fips, county_name, city, performed_at")
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
      .select("full_name, monthly_goal_miles")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      full_name: data?.full_name ?? "",
      monthly_goal_miles: data?.monthly_goal_miles ?? null,
      email: (context.claims as { email?: string }).email ?? "",
    };
  });

const GoalInput = z.object({
  monthly_goal_miles: z.number().int().positive().max(10000).nullable(),
});

export const updateMyGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => GoalInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .upsert(
        { user_id: context.userId, monthly_goal_miles: data.monthly_goal_miles },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });


const RankingsInput = z.object({
  sports: z.enum(["walk", "run", "bike"]).array(),
});

export const getMyRankings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RankingsInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: allWorkouts, error: allError } = await supabaseAdmin
      .from("workouts")
      .select("id, sport, distance_miles, state_code, county_fips, county_name, city, performed_at, user_id")
      .limit(5000);
    if (allError) throw new Error(allError.message);

    const userIds = [
      ...new Set(
        (allWorkouts ?? [])
          .map((r: { user_id: string | null }) => r.user_id)
          .filter((id: string | null): id is string => !!id),
      ),
    ];
    let nameByUser = new Map<string, string>();
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

    const rows = (allWorkouts ?? []).map((r: { user_id: string | null; full_name?: string }) => ({
      ...r,
      full_name: r.user_id ? nameByUser.get(r.user_id) ?? null : null,
    })) as WorkoutRow[];

    const { data: myWorkouts, error: myError } = await context.supabase
      .from("workouts")
      .select("state_code, county_fips, county_name, city, distance_miles, sport")
      .eq("user_id", context.userId);
    if (myError) throw new Error(myError.message);

    const sportSet = new Set(data.sports);
    const filteredRows = rows.filter((r) => sportSet.has(r.sport));
    const filteredMyWorkouts = (myWorkouts ?? []).filter((w) => sportSet.has(w.sport));

    const individuals = aggregateIndividuals(filteredRows);
    const cities = aggregateCities(filteredRows);
    const { byState, byCounty } = aggregate(filteredRows);
    const states = [...byState.values()].sort((a, b) => b.totalMiles - a.totalMiles);
    const counties = [...byCounty.values()].sort((a, b) => b.totalMiles - a.totalMiles);

    if (filteredMyWorkouts.length === 0) {
      return {
        individualRank: null,
        cityRank: null,
        countyRank: null,
        stateRank: null,
        cityName: null,
        countyName: null,
        stateCode: null,
        totalIndividuals: individuals.length,
        totalCities: cities.length,
        totalCounties: counties.length,
        totalStates: states.length,
      };
    }

    const primaryState = mostMilesBy(filteredMyWorkouts, (r) => r.state_code);
    const primaryCounty = mostMilesBy(filteredMyWorkouts, (r) => r.county_fips);
    const primaryCity = mostMilesBy(filteredMyWorkouts, (r) => `${r.state_code}|${r.city}`);

    const individualRank = individuals.findIndex((i) => i.user_id === context.userId) + 1;
    const stateRank = states.findIndex((s) => s.code === primaryState) + 1;
    const countyRank = counties.findIndex((c) => c.fips === primaryCounty) + 1;
    const cityRank = cities.findIndex((c) => `${c.state_code}|${c.name}` === primaryCity) + 1;

    const cityName = primaryCity?.split("|")[1] ?? null;
    const countyName = filteredMyWorkouts.find((w) => w.county_fips === primaryCounty)?.county_name ?? null;
    const stateCode = primaryState;

    return {
      individualRank,
      cityRank,
      countyRank,
      stateRank,
      cityName,
      countyName,
      stateCode,
      totalIndividuals: individuals.length,
      totalCities: cities.length,
      totalCounties: counties.length,
      totalStates: states.length,
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

/**
 * Generates and stores a hashed one-time recovery code the very first time
 * this is called for a user. Returns the plaintext code ONCE; subsequent
 * calls return `{ code: null }`.
 */
export const ensureRecoveryCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: existing, error: readErr } = await context.supabase
      .from("profiles")
      .select("recovery_code_hash")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (existing?.recovery_code_hash) return { code: null as string | null };

    const code = generateRecoveryCode();
    const hash = hashRecoveryCode(code);
    const { error } = await context.supabase
      .from("profiles")
      .upsert(
        {
          user_id: context.userId,
          recovery_code_hash: hash,
          recovery_code_set_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { code };
  });

const RedeemInput = z.object({
  email: z.string().trim().email().max(255),
  code: z.string().trim().min(10).max(40),
  newEmail: z.string().trim().email().max(255),
});

/**
 * Public endpoint. Verifies a recovery code for the given email and, on
 * success, replaces the auth account's email with `newEmail`. The recovery
 * code is single-use and cleared after redemption.
 */
export const redeemRecoveryCode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => RedeemInput.parse(data))
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const newEmail = data.newEmail.trim().toLowerCase();
    if (email === newEmail) {
      throw new Error("New email must be different from your current email.");
    }
    const codeHash = hashRecoveryCode(data.code);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Look up the auth user by email via the admin REST endpoint.
    const lookup = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );
    // Generic error on any failure — don't reveal which field was wrong.
    const genericError = "Recovery failed. Check the email and code and try again.";
    if (!lookup.ok) throw new Error(genericError);
    const body = (await lookup.json()) as {
      users?: Array<{ id: string; email?: string | null }>;
    };
    const user = body.users?.find((u) => (u.email ?? "").toLowerCase() === email);
    if (!user) throw new Error(genericError);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("recovery_code_hash")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.recovery_code_hash || profile.recovery_code_hash !== codeHash) {
      throw new Error(genericError);
    }

    // Make sure the new address isn't already in use by another account.
    const existingCheck = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(newEmail)}`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );
    if (existingCheck.ok) {
      const existingBody = (await existingCheck.json()) as {
        users?: Array<{ id: string; email?: string | null }>;
      };
      const conflict = existingBody.users?.find(
        (u) => (u.email ?? "").toLowerCase() === newEmail,
      );
      if (conflict) throw new Error("That email is already tied to another account.");
    }

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email: newEmail,
      email_confirm: true,
    });
    if (updErr) throw new Error(updErr.message);

    await supabaseAdmin
      .from("profiles")
      .update({ recovery_code_hash: null, recovery_code_set_at: null })
      .eq("user_id", user.id);

    return { ok: true, newEmail };
  });
