import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Plus,
  Footprints,
  Bike,
  PersonStanding,
  MapPin,
  Pencil,
  Save,
  ShieldCheck,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Home,
  Settings,
  LogOut,
  Target,
  Trophy,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SportFilter } from "@/components/sport-filter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listMyWorkouts,
  deleteWorkout,
  getMyProfile,
  updateMyProfile,
  updateMyGoal,
  getMyRankings,
  ensureRecoveryCode,
} from "@/lib/workouts.functions";
import { formatMiles, formatDateTime, sportLabel } from "@/lib/format";
import { stateName } from "@/lib/us-geo";
import { WorkoutChart } from "@/components/workout-chart";
import { BadgesPanel } from "@/components/badges-panel";
import { ShareRankCard } from "@/components/share-rank-card";
import { PersonalInsights } from "@/components/personal-insights";
import { ActivityFootprint } from "@/components/activity-footprint";
import { generatePersonalInsights } from "@/lib/personal-insights";
import type { Sport } from "@/lib/public-workouts";

export const Route = createFileRoute("/_authenticated/portal")({
  component: Portal,
  head: () => ({ meta: [{ title: "My portal — US Miles Club" }] }),
});

function maskEmail(email: string): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const first = local.charAt(0);
  return `${first}${"•".repeat(3)}@${domain}`;
}

const SportIcon = ({ s }: { s: "walk" | "run" | "bike" }) =>
  s === "walk" ? (
    <PersonStanding size={18} strokeWidth={2} />
  ) : s === "run" ? (
    <Footprints size={18} strokeWidth={2} />
  ) : (
    <Bike size={18} strokeWidth={2} />
  );

type WorkoutRow = {
  id: string;
  performed_at: string;
  distance_miles: number | string;
  sport: Sport;
  state_code: string;
  county_fips: string;
  county_name: string;
  city: string;
};

function currentWeekMiles(workouts: WorkoutRow[]): number {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const startT = start.getTime();
  return workouts.reduce((s, w) => {
    const t = new Date(w.performed_at).getTime();
    return t >= startT ? s + Number(w.distance_miles) : s;
  }, 0);
}

function strongestRecentWeek(workouts: WorkoutRow[]): { miles: number; label: string } | null {
  if (workouts.length === 0) return null;
  const now = new Date();
  const firstStart = new Date(now);
  firstStart.setHours(0, 0, 0, 0);
  firstStart.setDate(firstStart.getDate() - firstStart.getDay() - 7 * 7);
  const buckets: { start: Date; miles: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const s = new Date(firstStart);
    s.setDate(s.getDate() + i * 7);
    buckets.push({ start: s, miles: 0 });
  }
  const base = firstStart.getTime();
  for (const w of workouts) {
    const t = new Date(w.performed_at).getTime();
    if (t < base) continue;
    const idx = Math.floor((t - base) / (7 * 86400000));
    if (idx >= 0 && idx < 8) buckets[idx].miles += Number(w.distance_miles);
  }
  let best = buckets[0];
  for (const b of buckets) if (b.miles > best.miles) best = b;
  if (best.miles <= 0) return null;
  return {
    miles: best.miles,
    label: best.start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  };
}

type BestRank = {
  rank: number;
  scope: "Individual" | "City" | "County" | "State";
  place: string;
} | null;

function pickBestRanking(rankings: {
  individualRank: number | null;
  cityRank: number | null;
  countyRank: number | null;
  stateRank: number | null;
  cityName: string | null;
  countyName: string | null;
  stateCode: string | null;
} | undefined): BestRank {
  if (!rankings) return null;
  const opts: BestRank[] = [];
  if (rankings.stateRank && rankings.stateCode)
    opts.push({ rank: rankings.stateRank, scope: "State", place: stateName(rankings.stateCode) });
  if (rankings.countyRank && rankings.countyName)
    opts.push({ rank: rankings.countyRank, scope: "County", place: `${rankings.countyName} County` });
  if (rankings.cityRank && rankings.cityName)
    opts.push({ rank: rankings.cityRank, scope: "City", place: rankings.cityName });
  if (rankings.individualRank)
    opts.push({ rank: rankings.individualRank, scope: "Individual", place: "individuals" });
  if (opts.length === 0) return null;
  opts.sort((a, b) => a!.rank - b!.rank);
  return opts[0];
}

function Portal() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listMyWorkouts);
  const del = useServerFn(deleteWorkout);
  const getProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);
  const saveGoal = useServerFn(updateMyGoal);
  const getRankings = useServerFn(getMyRankings);
  const ensureCode = useServerFn(ensureRecoveryCode);
  const [sportFilter, setSportFilter] = useState<Sport[]>(["walk", "run", "bike"]);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    ensureCode()
      .then((res) => {
        if (!cancelled && res?.code) setRecoveryCode(res.code);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ensureCode]);

  const {
    data = [],
    isLoading,
    error,
    refetch: refetchWorkouts,
  } = useQuery({
    queryKey: ["my-workouts"],
    queryFn: () => list(),
  });

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getProfile(),
  });

  const { data: rankings } = useQuery({
    queryKey: ["my-rankings", sportFilter],
    queryFn: () => getRankings({ data: { sports: sportFilter } }),
  });

  const initialLoading = profileLoading || isLoading;
  const initialError = profileError || error;

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!initialLoading) {
      setTimedOut(false);
      return;
    }
    const id = window.setTimeout(() => setTimedOut(true), 10_000);
    return () => window.clearTimeout(id);
  }, [initialLoading]);

  const pendingDelete = pendingDeleteId ? data.find((w) => w.id === pendingDeleteId) : null;

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  useEffect(() => {
    if (profile) setNameDraft(profile.full_name);
  }, [profile]);

  const nameMut = useMutation({
    mutationFn: (full_name: string) => saveProfile({ data: { full_name } }),
    onSuccess: () => {
      toast.success("Name updated.");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      setEditingName(false);
    },
    onError: (e: Error) => toast.error(`Couldn't save: ${e.message}`),
  });

  const goalMut = useMutation({
    mutationFn: (n: number | null) => saveGoal({ data: { monthly_goal_miles: n } }),
    onSuccess: () => {
      toast.success("Monthly goal saved.");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      setEditingGoal(false);
    },
    onError: (e: Error) => toast.error(`Couldn't save: ${e.message}`),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Workout deleted.");
      qc.invalidateQueries({ queryKey: ["my-workouts"] });
      qc.invalidateQueries({ queryKey: ["public-workouts"] });
      qc.invalidateQueries({ queryKey: ["my-rankings"] });
    },
    onError: (e: Error) => toast.error(`Couldn't delete: ${e.message}`),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const total = useMemo(
    () => data.reduce((s, r) => s + Number(r.distance_miles), 0),
    [data],
  );
  const greeting = profile?.full_name?.trim() ? profile.full_name.split(" ")[0] : null;
  const needsName = !profile?.full_name?.trim();

  const now = new Date();
  const monthLabel = now.toLocaleString(undefined, { month: "long", year: "numeric" });
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1);
  const monthMiles = useMemo(
    () =>
      data.reduce(
        (s, w) =>
          new Date(w.performed_at).getTime() >= monthStart ? s + Number(w.distance_miles) : s,
        0,
      ),
    [data, monthStart],
  );
  const goal = profile?.monthly_goal_miles ?? null;
  const goalPct = goal ? Math.min(100, (monthMiles / goal) * 100) : 0;
  const goalRemaining = goal ? Math.max(0, goal - monthMiles) : 0;
  const goalAvgPerDay = goal ? goalRemaining / daysRemaining : 0;
  const goalHit = !!goal && monthMiles >= goal;

  const weekMiles = useMemo(() => currentWeekMiles(data), [data]);
  const strongestWeek = useMemo(() => strongestRecentWeek(data), [data]);
  const bestRank = useMemo(() => pickBestRanking(rankings), [rankings]);

  const recent = useMemo(() => (showAllActivity ? data : data.slice(0, 3)), [data, showAllActivity]);

  function submitGoalDraft() {
    const n = Math.round(Number(goalDraft));
    if (!Number.isFinite(n) || n <= 0 || n > 10000) {
      toast.error("Enter a goal between 1 and 10,000 miles.");
      return;
    }
    goalMut.mutate(n);
  }

  if (initialError || timedOut) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div role="alert" className="card border-destructive/40 text-center ring-2 ring-destructive/20">
          <AlertTriangle size={36} strokeWidth={1.75} className="mx-auto mb-3 text-destructive" aria-hidden />
          <h1 className="text-2xl font-black tracking-tight">We couldn't load your portal</h1>
          <p className="mt-2 text-text-secondary">Your workout data is safe — please try again.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setTimedOut(false);
                refetchProfile();
                refetchWorkouts();
              }}
            >
              <RefreshCw size={16} /> Try again
            </button>
            <Link to="/" className="btn btn-ghost">
              <Home size={16} /> Return to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (initialLoading || !profile) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div role="status" aria-live="polite" className="mb-6 flex items-center gap-3">
          <RefreshCw size={18} strokeWidth={2} className="animate-spin text-primary" aria-hidden />
          <span className="text-base font-semibold text-foreground">Loading your portal…</span>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton mt-3 h-8 w-20" />
            </div>
          ))}
        </div>
        <div className="card">
          <div className="skeleton h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      {/* ============= 1. HEADER ============= */}
      <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-black tracking-tight sm:text-4xl">
            {greeting ? `Hi, ${greeting}` : "My portal"}
          </h1>
          <p className="mt-1 text-text-secondary">
            Your logged miles and their impact on your county.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:border-border-strong hover:text-foreground"
            aria-label="Account settings"
            title="Account settings"
          >
            <Settings size={18} />
          </button>
          <Link to="/log" className="btn btn-primary">
            <Plus size={18} /> Log workout
          </Link>
        </div>
      </header>

      {needsName && (
        <div className="card mb-8 border-primary/40 ring-2 ring-primary/30">
          <div className="flex items-center gap-2 text-primary">
            <Pencil size={16} strokeWidth={2.5} />
            <span className="text-xs font-black uppercase tracking-wide">One quick thing</span>
          </div>
          <h2 className="mt-1 text-xl font-black tracking-tight">Add your name to the leaderboards</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Your name is how your miles show up when your city or county climbs the rankings.
          </p>
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              const v = nameDraft.trim().replace(/\s+/g, " ");
              if (v.length < 1) {
                toast.error("Enter your full name.");
                return;
              }
              nameMut.mutate(v);
            }}
          >
            <input
              type="text"
              maxLength={80}
              autoFocus
              className="field-input flex-1"
              placeholder="Your full name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              aria-label="Full name"
            />
            <button type="submit" className="btn btn-primary" disabled={nameMut.isPending}>
              <Save size={16} /> {nameMut.isPending ? "Saving…" : "Save my name"}
            </button>
          </form>
        </div>
      )}

      {/* ============= 2. OVERVIEW ============= */}
      <section aria-label="Overview" className="mb-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Goal card — prominent, spans 2 cols on desktop, first on mobile */}
          <div className="order-first sm:col-span-2 lg:col-span-2 lg:row-span-1">
            <div className="card h-full border-primary/40 bg-[linear-gradient(135deg,rgba(249,115,22,0.10),rgba(249,115,22,0.02))] ring-1 ring-primary/25">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-primary">
                    <Target size={16} strokeWidth={2.5} />
                    <span className="text-xs font-black uppercase tracking-wide">
                      {monthLabel} goal
                    </span>
                  </div>
                  {goal ? (
                    <>
                      <div className="mono mt-2 text-4xl font-black tracking-tight">
                        {formatMiles(monthMiles)}
                        <span className="ml-2 text-lg font-bold text-text-secondary">
                          of {formatMiles(goal)}
                        </span>
                      </div>
                      <div className="mono text-xs uppercase tracking-wide text-text-secondary">
                        {goalPct.toFixed(0)}% {goalHit ? "· Goal hit 🎉" : "complete"}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mono mt-2 text-3xl font-black">— </div>
                      <div className="text-xs text-text-secondary">No goal set for this month</div>
                    </>
                  )}
                </div>
                {goal && !editingGoal && (
                  <button
                    type="button"
                    onClick={() => {
                      setGoalDraft(goal.toString());
                      setEditingGoal(true);
                    }}
                    className="btn btn-ghost"
                    aria-label="Edit goal"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>

              {goal && (
                <div className="mt-4">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${goalPct}%` }}
                    />
                  </div>
                </div>
              )}

              {goal && !editingGoal && (
                <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border/60 pt-4">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                      To go
                    </dt>
                    <dd className="mono mt-1 text-lg font-bold">
                      {goalHit ? "0 mi" : formatMiles(goalRemaining)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                      Days left
                    </dt>
                    <dd className="mono mt-1 text-lg font-bold">{daysRemaining}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                      Avg / day
                    </dt>
                    <dd className="mono mt-1 text-lg font-bold">
                      {goalHit ? "—" : `${goalAvgPerDay.toFixed(1)} mi`}
                    </dd>
                  </div>
                </dl>
              )}

              {(editingGoal || !goal) && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {[10, 25, 50, 100].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                          goalDraft === n.toString()
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border text-text-secondary hover:border-primary/60 hover:text-foreground"
                        }`}
                        onClick={() => setGoalDraft(n.toString())}
                      >
                        {n} mi
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      inputMode="numeric"
                      className="field-input flex-1"
                      placeholder="Custom miles"
                      value={goalDraft}
                      onChange={(e) => setGoalDraft(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={goalMut.isPending}
                      onClick={submitGoalDraft}
                    >
                      <Save size={14} /> Save
                    </button>
                    {editingGoal && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          setGoalDraft(goal?.toString() ?? "");
                          setEditingGoal(false);
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <StatCard
            label="Total miles"
            value={formatMiles(total)}
            hint={`${data.length} ${data.length === 1 ? "workout" : "workouts"}`}
          />

          <StatCard
            label={weekMiles > 0 ? "This week" : "Strongest recent week"}
            value={
              weekMiles > 0
                ? formatMiles(weekMiles)
                : strongestWeek
                  ? formatMiles(strongestWeek.miles)
                  : "—"
            }
            hint={
              weekMiles > 0
                ? "Miles logged so far"
                : strongestWeek
                  ? `Week of ${strongestWeek.label}`
                  : "Log a workout to start"
            }
            icon={<TrendingUp size={14} />}
          />

          <StatCard
            label="Best ranking"
            value={bestRank ? `#${bestRank.rank}` : "—"}
            hint={bestRank ? `${bestRank.scope} · ${bestRank.place}` : "Log more to rank"}
            icon={<Trophy size={14} />}
            accent
          />
        </div>
      </section>

      {/* ============= 3. PROGRESS & INSIGHTS ============= */}
      <section aria-label="Progress" className="mb-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <WorkoutChart workouts={data} />
          </div>
          <div className="lg:col-span-1">
            <PersonalInsights
              insights={generatePersonalInsights({
                workouts: data,
                rankings,
                monthlyGoal: goal,
              })}
            />
          </div>
        </div>
      </section>

      {/* ============= 4. RANKINGS ============= */}
      <section aria-label="Rankings" className="mb-10">
        <div className="card">
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold">Your rankings</h2>
              <p className="text-sm text-text-secondary">
                Based on where you've logged the most miles.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <SportFilter value={sportFilter} onChange={setSportFilter} context="rankings" />
              <ShareRankCard
                name={profile?.full_name ?? ""}
                totalMiles={total}
                rankings={rankings}
                sports={sportFilter}
              />
            </div>
          </div>
          {rankings ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <RankingCard
                label="Individual"
                rank={rankings.individualRank}
                total={rankings.totalIndividuals}
                totalLabel="people"
                highlight={bestRank?.scope === "Individual"}
              />
              <RankingCard
                label="City"
                rank={rankings.cityRank}
                total={rankings.totalCities}
                totalLabel="cities"
                place={rankings.cityName}
                highlight={bestRank?.scope === "City"}
              />
              <RankingCard
                label="County"
                rank={rankings.countyRank}
                total={rankings.totalCounties}
                totalLabel="counties"
                place={rankings.countyName ? `${rankings.countyName} County` : null}
                highlight={bestRank?.scope === "County"}
              />
              <RankingCard
                label="State"
                rank={rankings.stateRank}
                total={rankings.totalStates}
                totalLabel="states"
                place={rankings.stateCode ? stateName(rankings.stateCode) : null}
                highlight={bestRank?.scope === "State"}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl bg-muted p-4">
                  <div className="skeleton mb-2 h-3 w-20" />
                  <div className="skeleton h-8 w-16" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============= 5. PLACES & ACHIEVEMENTS ============= */}
      <section aria-label="Places and achievements" className="mb-10">
        <h2 className="sr-only">Places & achievements</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <ActivityFootprint workouts={data} sports={sportFilter} />
          </div>
          <div>
            <BadgesPanel workouts={data} />
          </div>
        </div>
      </section>

      {/* ============= 6. RECENT ACTIVITY ============= */}
      <section aria-label="Recent activity" className="mb-10">
        <div className="card p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div>
              <h2 className="text-xl font-bold">Recent activity</h2>
              <p className="text-sm text-text-secondary">
                {data.length === 0
                  ? "Nothing here yet."
                  : showAllActivity
                    ? `Showing all ${data.length} ${data.length === 1 ? "workout" : "workouts"}.`
                    : `Showing latest ${Math.min(3, data.length)} of ${data.length}.`}
              </p>
            </div>
          </div>

          {data.length === 0 ? (
            <div className="p-8 text-center">
              <MapPin size={32} strokeWidth={1.75} className="mx-auto text-text-secondary mb-3" />
              <p className="font-bold">No workouts yet.</p>
              <p className="text-sm text-text-secondary mt-1">
                Log your first walk, run, or ride to put your county on the board.
              </p>
              <Link to="/log" className="btn btn-primary mt-4">
                <Plus size={18} /> Log workout
              </Link>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {recent.map((w) => (
                  <li
                    key={w.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 transition-colors hover:bg-muted"
                  >
                    <span
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary"
                      aria-hidden
                    >
                      <SportIcon s={w.sport} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-bold">
                        {sportLabel(w.sport)} · {formatMiles(Number(w.distance_miles))}
                      </div>
                      <div className="truncate text-xs text-text-secondary">
                        {w.city}, {w.county_name} County · {stateName(w.state_code)}
                      </div>
                      <div className="mono mt-0.5 text-xs text-text-secondary">
                        {formatDateTime(w.performed_at)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Link
                        to="/log"
                        search={{ id: w.id }}
                        className="btn btn-ghost"
                        aria-label="Edit workout"
                        style={{ minWidth: 44 }}
                      >
                        <Pencil size={18} strokeWidth={1.75} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(w.id)}
                        className="btn btn-ghost"
                        aria-label="Delete workout"
                        style={{ minWidth: 44 }}
                      >
                        <Trash2 size={18} strokeWidth={1.75} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {data.length > 3 && (
                <div className="border-t border-border p-3 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllActivity((v) => !v)}
                    className="btn btn-ghost text-sm"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${showAllActivity ? "rotate-180" : ""}`}
                    />
                    {showAllActivity ? "Show fewer" : `View all activity (${data.length})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ============= ACCOUNT SETTINGS MODAL ============= */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Account settings</DialogTitle>
            <DialogDescription>
              Update how your name appears across your portal and the leaderboards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="field-label" htmlFor="profile-name">
                Full name
              </label>
              {editingName ? (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = nameDraft.trim().replace(/\s+/g, " ");
                    if (v.length < 1) {
                      toast.error("Enter your full name.");
                      return;
                    }
                    nameMut.mutate(v);
                  }}
                >
                  <input
                    id="profile-name"
                    type="text"
                    maxLength={80}
                    autoFocus
                    className="field-input"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" disabled={nameMut.isPending}>
                    <Save size={16} /> Save
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setNameDraft(profile?.full_name ?? "");
                      setEditingName(false);
                    }}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">
                    {profile?.full_name?.trim() ? (
                      profile.full_name
                    ) : (
                      <span className="italic text-text-secondary">No name set yet</span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setEditingName(true)}
                    aria-label="Edit full name"
                  >
                    <Pencil size={16} /> Edit
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="field-label" htmlFor="profile-email">
                Email
              </label>
              <input
                id="profile-email"
                type="text"
                readOnly
                disabled
                value={maskEmail(profile?.email ?? "")}
                className="field-input"
              />
              <p className="mt-1 text-xs text-text-secondary">
                Email is tied to your account and can't be edited here.
              </p>
            </div>
            <div className="border-t border-border pt-4">
              <button type="button" onClick={signOut} className="btn btn-ghost w-full">
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => {
          if (!open && !removeMut.isPending) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workout?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `This ${sportLabel(pendingDelete.sport).toLowerCase()} of ${formatMiles(Number(pendingDelete.distance_miles))} will be removed from your history and the leaderboards. This can't be undone.`
                : "This workout will be removed from your history and the leaderboards. This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!pendingDeleteId) return;
                const id = pendingDeleteId;
                removeMut.mutate(id, {
                  onSettled: () => setPendingDeleteId(null),
                });
              }}
            >
              {removeMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!recoveryCode}
        onOpenChange={(open) => {
          if (!open && !confirmedSaved) return;
          if (!open) {
            setRecoveryCode(null);
            setConfirmedSaved(false);
            setCopied(false);
          }
        }}
      >
        <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="text-primary" size={22} />
              Save your recovery code
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p>
                  Write this code down or save it in a password manager. If you ever lose access to your email, this is
                  the <strong>only</strong> way to recover your account.
                </p>
                <div className="rounded-lg border border-border bg-muted p-4 text-center">
                  <div className="mono text-2xl font-bold tracking-widest break-all">{recoveryCode}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost w-full"
                  onClick={async () => {
                    if (!recoveryCode) return;
                    try {
                      await navigator.clipboard.writeText(recoveryCode);
                      setCopied(true);
                      toast.success("Copied to clipboard.");
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      toast.error("Couldn't copy. Select and copy the code manually.");
                    }
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied" : "Copy code"}
                </button>
                <p className="text-xs text-text-secondary">
                  We only store a one-way hash of this code, so we can't show it to you again. Treat it like a password.
                </p>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={confirmedSaved}
                    onChange={(e) => setConfirmedSaved(e.target.checked)}
                    className="mt-1"
                  />
                  <span>I've saved my recovery code somewhere safe.</span>
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              disabled={!confirmedSaved}
              onClick={() => {
                setRecoveryCode(null);
                setConfirmedSaved(false);
                setCopied(false);
              }}
            >
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`card h-full ${
        accent ? "border-secondary/40 ring-1 ring-secondary/25" : ""
      }`}
    >
      <div
        className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${
          accent ? "text-secondary" : "text-text-secondary"
        }`}
      >
        {icon}
        <span>{label}</span>
      </div>
      <div className="mono mt-2 text-3xl font-black tracking-tight">{value}</div>
      {hint && <div className="mt-1 truncate text-xs text-text-secondary">{hint}</div>}
    </div>
  );
}

function RankingCard({
  label,
  rank,
  total,
  totalLabel,
  place,
  highlight,
}: {
  label: string;
  rank: number | null;
  total: number;
  totalLabel: string;
  place?: string | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl p-4 transition-all ${
        highlight
          ? "bg-[linear-gradient(135deg,rgba(94,234,255,0.10),rgba(94,234,255,0.02))] ring-2 ring-secondary/50"
          : "bg-muted"
      }`}
    >
      {highlight && (
        <span className="mono absolute right-2 top-2 rounded-full bg-secondary/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-secondary">
          Best
        </span>
      )}
      <div className="text-xs uppercase tracking-wide text-text-secondary">{label}</div>
      <div
        className={`mt-1 text-3xl font-black tracking-tight ${
          highlight ? "text-secondary" : ""
        }`}
      >
        {rank ? `#${rank}` : "—"}
      </div>
      <div className="mt-1 text-xs text-text-secondary">
        of {total.toLocaleString()} {totalLabel}
      </div>
      {place && (
        <div className="mt-1 truncate text-xs font-medium text-foreground">{place}</div>
      )}
    </div>
  );
}
