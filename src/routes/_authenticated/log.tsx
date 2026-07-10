import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { feature } from "topojson-client";
import countiesTopoRaw from "us-atlas/counties-10m.json";
import type { FeatureCollection, Geometry } from "geojson";
import { Footprints, Bike, PersonStanding, ArrowLeft } from "lucide-react";

import { createWorkout, updateWorkout, getWorkout } from "@/lib/workouts.functions";
import { STATES, stateFipsFromCode } from "@/lib/us-geo";
import { fromDateTimeLocal, kmFromMiles, toDateTimeLocal } from "@/lib/format";

const SearchSchema = z.object({ id: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/log")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: LogWorkout,
  head: () => ({ meta: [{ title: "Log workout — US Miles Club" }] }),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countiesTopo = countiesTopoRaw as any;
const allCounties = feature(
  countiesTopo,
  countiesTopo.objects.counties,
) as unknown as FeatureCollection<Geometry, { name: string }>;

function countiesForState(stateCode: string): { fips: string; name: string }[] {
  const stateFips = stateFipsFromCode(stateCode);
  if (!stateFips) return [];
  return allCounties.features
    .filter((f) => String(f.id).padStart(5, "0").startsWith(stateFips))
    .map((f) => ({
      fips: String(f.id).padStart(5, "0"),
      name: (f.properties as { name?: string })?.name ?? "County",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

type Sport = "walk" | "run" | "bike";
type Unit = "mi" | "km";

const DRAFT_KEY = "miles-club:log-draft:v1";

interface Draft {
  sport: Sport;
  distance: string;
  unit: Unit;
  state: string;
  county: string;
  city: string;
  performed_at: string;
}

function loadDraft(): Draft {
  if (typeof window === "undefined") return defaultDraft();
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...defaultDraft(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultDraft();
}

function defaultDraft(): Draft {
  return {
    sport: "run",
    distance: "",
    unit: "mi",
    state: "CA",
    county: "",
    city: "",
    performed_at: toDateTimeLocal(new Date()),
  };
}

function LogWorkout() {
  const { id: editId } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createWorkout);
  const update = useServerFn(updateWorkout);
  const fetchOne = useServerFn(getWorkout);
  const isEdit = !!editId;

  const [d, setD] = useState<Draft>(defaultDraft);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});

  // Load existing workout when editing; otherwise restore draft
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["workout", editId],
    queryFn: () => fetchOne({ data: { id: editId! } }),
    enabled: isEdit,
  });

  useEffect(() => {
    if (isEdit) {
      if (existing) {
        setD({
          sport: existing.sport,
          distance: String(existing.distance_miles),
          unit: "mi",
          state: existing.state_code,
          county: existing.county_fips,
          city: existing.city,
          performed_at: toDateTimeLocal(new Date(existing.performed_at)),
        });
      }
    } else {
      setD(loadDraft());
    }
  }, [isEdit, existing]);

  // Persist draft (only when creating)
  useEffect(() => {
    if (isEdit) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* ignore */
    }
  }, [d, isEdit]);

  const counties = useMemo(() => countiesForState(d.state), [d.state]);

  useEffect(() => {
    if (!d.county || !counties.some((c) => c.fips === d.county)) {
      setD((prev) => ({ ...prev, county: counties[0]?.fips ?? "" }));
    }
  }, [d.state, counties, d.county]);

  const distanceMiles = useMemo(() => {
    const n = parseFloat(d.distance);
    if (!Number.isFinite(n) || n <= 0) return NaN;
    return d.unit === "mi" ? n : kmFromMiles(n);
  }, [d.distance, d.unit]);

  const validate = (): boolean => {
    const next: Partial<Record<keyof Draft, string>> = {};
    if (!Number.isFinite(distanceMiles) || distanceMiles <= 0)
      next.distance = "Enter a distance greater than zero.";
    else if (distanceMiles > 200) next.distance = "That's over 200 miles — double-check the number.";
    if (!d.state) next.state = "Pick your state.";
    if (!d.county) next.county = "Pick your county.";
    if (!d.city.trim()) next.city = "Tell us your city.";
    else if (d.city.trim().length > 80) next.city = "City name is too long.";
    if (!d.performed_at) next.performed_at = "Pick the date and time.";
    else {
      const when = fromDateTimeLocal(d.performed_at);
      if (Number.isNaN(when.getTime())) next.performed_at = "That date doesn't look right.";
      else if (when.getTime() > Date.now() + 60_000)
        next.performed_at = "The workout can't be in the future.";
      else if (when.getTime() < Date.now() - 1000 * 60 * 60 * 24 * 730)
        next.performed_at = "That was more than two years ago.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const mut = useMutation({
    mutationFn: async () => {
      const county = counties.find((c) => c.fips === d.county)!;
      const performed = fromDateTimeLocal(d.performed_at);
      const payload = {
        sport: d.sport,
        distance_miles: Number(distanceMiles.toFixed(2)),
        state_code: d.state,
        county_fips: d.county,
        county_name: county.name,
        city: d.city.trim().replace(/\s+/g, " ").slice(0, 80),
        performed_at: performed.toISOString(),
      };
      if (isEdit) {
        return update({ data: { id: editId!, ...payload } });
      }
      return create({ data: payload });
    },
    onSuccess: async () => {
      toast.success(
        isEdit
          ? "Workout updated."
          : "Workout saved · pushing your county up the board.",
      );
      if (!isEdit) {
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      }
      // Force refetch so the portal shows fresh totals immediately on arrival.
      await Promise.all([
        qc.refetchQueries({ queryKey: ["my-workouts"] }),
        qc.refetchQueries({ queryKey: ["public-workouts"] }),
        qc.refetchQueries({ queryKey: ["my-rankings"] }),
      ]);
      if (isEdit) qc.invalidateQueries({ queryKey: ["workout", editId] });
      navigate({ to: "/portal" });
    },
    onError: (e: Error) =>
      toast.error(`Couldn't ${isEdit ? "update" : "save"}: ${e.message}`),
  });

  const sports: { v: Sport; label: string; Icon: typeof Footprints }[] = [
    { v: "walk", label: "Walk", Icon: PersonStanding },
    { v: "run", label: "Run", Icon: Footprints },
    { v: "bike", label: "Bike", Icon: Bike },
  ];

  const onBlurValidate = () => validate();

  if (isEdit && loadingExisting) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="skeleton h-96" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 md:py-12">
      <Link to="/portal" className="btn btn-ghost mb-4 -ml-3">
        <ArrowLeft size={16} /> Back to portal
      </Link>

      <div className="card">
        <h1 className="text-3xl font-black">{isEdit ? "Edit workout" : "Log a workout"}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {isEdit
            ? "Correct anything that got logged wrong."
            : "Every mile counts toward your county. Values save as you go."}
        </p>

        <form
          className="mt-6 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (validate()) mut.mutate();
          }}
          noValidate
        >
          <fieldset>
            <legend className="field-label">Sport</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Sport">
              {sports.map(({ v, label, Icon }) => {
                const active = d.sport === v;
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-active={active}
                    className="chip"
                    style={{ minHeight: 44, padding: "0.5rem 1rem" }}
                    onClick={() => setD({ ...d, sport: v })}
                  >
                    <Icon size={18} strokeWidth={2} />
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label className="field-label" htmlFor="distance">
              Distance
            </label>
            <div className="flex gap-2">
              <input
                id="distance"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="field-input"
                value={d.distance}
                aria-invalid={!!errors.distance}
                aria-describedby={errors.distance ? "distance-err" : undefined}
                onChange={(e) => setD({ ...d, distance: e.target.value })}
                onBlur={onBlurValidate}
                placeholder="0.00"
                required
              />
              <div
                className="inline-flex items-center rounded-md border-2 border-border bg-surface p-1"
                role="radiogroup"
                aria-label="Distance unit"
              >
                {(["mi", "km"] as Unit[]).map((u) => (
                  <button
                    type="button"
                    key={u}
                    role="radio"
                    aria-checked={d.unit === u}
                    onClick={() => setD({ ...d, unit: u })}
                    className={`px-3 h-9 rounded-sm text-sm font-bold transition-colors ${
                      d.unit === u
                        ? "bg-primary text-primary-foreground"
                        : "text-text-secondary"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            {errors.distance && (
              <p id="distance-err" className="mt-1 text-sm text-destructive">
                {errors.distance}
              </p>
            )}
            {Number.isFinite(distanceMiles) && d.unit === "km" && (
              <p className="mt-1 text-xs text-text-secondary mono">
                = {distanceMiles.toFixed(2)} mi (stored)
              </p>
            )}
          </div>

          <div>
            <label className="field-label" htmlFor="performed_at">
              Date &amp; time
            </label>
            <input
              id="performed_at"
              type="datetime-local"
              step={1}
              className="field-input"
              value={d.performed_at}
              aria-invalid={!!errors.performed_at}
              aria-describedby={errors.performed_at ? "when-err" : "when-help"}
              onChange={(e) => setD({ ...d, performed_at: e.target.value })}
              onBlur={onBlurValidate}
              required
            />
            <p id="when-help" className="mt-1 text-xs text-text-secondary">
              When did the workout happen? Down to the second.
            </p>
            {errors.performed_at && (
              <p id="when-err" className="mt-1 text-sm text-destructive">
                {errors.performed_at}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="state">
                State
              </label>
              <select
                id="state"
                className="field-input"
                value={d.state}
                onChange={(e) => setD({ ...d, state: e.target.value, county: "" })}
                onBlur={onBlurValidate}
                required
              >
                {STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.state && (
                <p className="mt-1 text-sm text-destructive">{errors.state}</p>
              )}
            </div>
            <div>
              <label className="field-label" htmlFor="county">
                County
              </label>
              <select
                id="county"
                className="field-input"
                value={d.county}
                onChange={(e) => setD({ ...d, county: e.target.value })}
                onBlur={onBlurValidate}
                required
              >
                {counties.map((c) => (
                  <option key={c.fips} value={c.fips}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.county && (
                <p className="mt-1 text-sm text-destructive">{errors.county}</p>
              )}
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="city">
              City
            </label>
            <input
              id="city"
              type="text"
              maxLength={80}
              className="field-input"
              value={d.city}
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? "city-err" : "city-help"}
              onChange={(e) => setD({ ...d, city: e.target.value })}
              onBlur={onBlurValidate}
              placeholder="e.g. Boulder"
              required
            />
            <p id="city-help" className="mt-1 text-xs text-text-secondary">
              We use this to build the city leaderboard for your county.
            </p>
            {errors.city && (
              <p id="city-err" className="mt-1 text-sm text-destructive">
                {errors.city}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={mut.isPending}
            >
              {mut.isPending
                ? (isEdit ? "Updating…" : "Saving…")
                : (isEdit ? "Save changes" : "Save this workout")}
            </button>
            <Link to="/portal" className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
