import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Trash2, Plus, Footprints, Bike, PersonStanding, MapPin, Pencil, Save, ShieldCheck, Copy, Check } from "lucide-react";
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
  listMyWorkouts,
  deleteWorkout,
  getMyProfile,
  updateMyProfile,
  getMyRankings,
  ensureRecoveryCode,
} from "@/lib/workouts.functions";
import { formatMiles, formatDateTime, sportLabel } from "@/lib/format";
import { stateName } from "@/lib/us-geo";
import type { Sport } from "@/lib/public-workouts";

export const Route = createFileRoute("/_authenticated/portal")({
  component: Portal,
  head: () => ({ meta: [{ title: "My portal — US Miles Club" }] }),
});

const SportIcon = ({ s }: { s: "walk" | "run" | "bike" }) =>
  s === "walk" ? <PersonStanding size={18} strokeWidth={2} />
  : s === "run" ? <Footprints size={18} strokeWidth={2} />
  : <Bike size={18} strokeWidth={2} />;

function Portal() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listMyWorkouts);
  const del = useServerFn(deleteWorkout);
  const getProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);
  const getRankings = useServerFn(getMyRankings);
  const ensureCode = useServerFn(ensureRecoveryCode);
  const [sportFilter, setSportFilter] = useState<Sport[]>(["walk", "run", "bike"]);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureCode()
      .then((res) => {
        if (!cancelled && res?.code) setRecoveryCode(res.code);
      })
      .catch(() => {
        /* non-blocking */
      });
    return () => {
      cancelled = true;
    };
  }, [ensureCode]);


  const { data = [], isLoading, error } = useQuery({
    queryKey: ["my-workouts"],
    queryFn: () => list(),
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getProfile(),
  });

  const { data: rankings } = useQuery({
    queryKey: ["my-rankings", sportFilter],
    queryFn: () => getRankings({ data: { sports: sportFilter } }),
  });

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

  const total = data.reduce((s, r) => s + Number(r.distance_miles), 0);
  const greeting = profile?.full_name?.trim() ? profile.full_name.split(" ")[0] : null;

  const needsName = !profile?.full_name?.trim();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">
            {greeting ? `Hi, ${greeting}` : "My portal"}
          </h1>
          <p className="mt-1 text-text-secondary">
            Your logged miles and their impact on your county.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/log" className="btn btn-primary">
            <Plus size={18} /> Log workout
          </Link>
          <button type="button" onClick={signOut} className="btn btn-ghost">
            Sign out
          </button>
        </div>
      </div>

      {needsName && (
        <div className="card mb-6 border-primary/40 ring-2 ring-primary/30 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.6)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <Pencil size={18} strokeWidth={2.5} />
                <span className="text-sm font-black uppercase tracking-wide">One quick thing</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">Add your name to the leaderboards</h2>
              <p className="mt-1 text-text-secondary">
                Your name is how your miles show up when your city or county climbs the rankings.
                Without it, your effort is anonymous.
              </p>
            </div>
          </div>
          <form
            className="mt-5 flex flex-col gap-2 sm:flex-row"
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
              className="field-input flex-1 text-lg"
              placeholder="Your full name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              aria-label="Full name"
            />
            <button
              type="submit"
              className="btn btn-primary text-base"
              disabled={nameMut.isPending}
            >
              <Save size={18} /> {nameMut.isPending ? "Saving…" : "Save my name"}
            </button>
          </form>
        </div>
      )}


      {/* Profile card */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold">Account</h2>
        <p className="text-sm text-text-secondary">
          Your name shows up on your portal and — if your city or county reaches the top —
          the leaderboards.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="profile-name">Full name</label>
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
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  {profile?.full_name?.trim() ? profile.full_name : (
                    <span className="text-text-secondary italic">No name set yet</span>
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
            <label className="field-label" htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              type="email"
              readOnly
              disabled
              value={profile?.email ?? ""}
              className="field-input"
            />
            <p className="mt-1 text-xs text-text-secondary">
              Your email is locked. Contact support to change it.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-text-secondary">Total miles</div>
          <div className="mono text-3xl font-bold mt-1">{formatMiles(total)}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-text-secondary">Workouts</div>
          <div className="mono text-3xl font-bold mt-1">{data.length}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-text-secondary">Last logged</div>
          <div className="mono text-lg font-bold mt-1">
            {data[0] ? formatDateTime(data[0].performed_at) : "—"}
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Your rankings</h2>
            <p className="text-sm text-text-secondary">
              Based on where you've logged the most miles.
            </p>
          </div>
          <SportFilter value={sportFilter} onChange={setSportFilter} />
        </div>
        {rankings ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-muted p-4">
              <div className="text-xs uppercase tracking-wide text-text-secondary">Individual</div>
              <div className="mt-1 text-3xl font-black tracking-tight">
                {rankings.individualRank ? `#${rankings.individualRank}` : "—"}
              </div>
              <div className="mt-1 text-xs text-text-secondary">
                of {rankings.totalIndividuals.toLocaleString()} people
              </div>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <div className="text-xs uppercase tracking-wide text-text-secondary">City</div>
              <div className="mt-1 text-3xl font-black tracking-tight">
                {rankings.cityRank ? `#${rankings.cityRank}` : "—"}
              </div>
              <div className="mt-1 text-xs text-text-secondary">
                of {rankings.totalCities.toLocaleString()} cities
              </div>
              {rankings.cityName && (
                <div className="mt-1 truncate text-xs font-medium text-foreground">{rankings.cityName}</div>
              )}
            </div>
            <div className="rounded-xl bg-muted p-4">
              <div className="text-xs uppercase tracking-wide text-text-secondary">County</div>
              <div className="mt-1 text-3xl font-black tracking-tight">
                {rankings.countyRank ? `#${rankings.countyRank}` : "—"}
              </div>
              <div className="mt-1 text-xs text-text-secondary">
                of {rankings.totalCounties.toLocaleString()} counties
              </div>
              {rankings.countyName && (
                <div className="mt-1 truncate text-xs font-medium text-foreground">{rankings.countyName} County</div>
              )}
            </div>
            <div className="rounded-xl bg-muted p-4">
              <div className="text-xs uppercase tracking-wide text-text-secondary">State</div>
              <div className="mt-1 text-3xl font-black tracking-tight">
                {rankings.stateRank ? `#${rankings.stateRank}` : "—"}
              </div>
              <div className="mt-1 text-xs text-text-secondary">
                of {rankings.totalStates.toLocaleString()} states
              </div>
              {rankings.stateCode && (
                <div className="mt-1 truncate text-xs font-medium text-foreground">{stateName(rankings.stateCode)}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-muted p-4">
                <div className="skeleton mb-2 h-3 w-20" />
                <div className="skeleton h-8 w-16" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-bold">History</h2>
          <p className="text-sm text-text-secondary">Newest first. Edit to correct, delete to remove.</p>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16" />
            ))}
          </div>
        ) : error ? (
          <p className="p-4 text-sm text-destructive">
            Couldn't load your workouts. Try refreshing.
          </p>
        ) : data.length === 0 ? (
          <div className="p-8 text-center">
            <MapPin
              size={32}
              strokeWidth={1.75}
              className="mx-auto text-text-secondary mb-3"
            />
            <p className="font-bold">No workouts yet.</p>
            <p className="text-sm text-text-secondary mt-1">
              Log your first walk, run, or ride to put your county on the board.
            </p>
            <Link to="/log" className="btn btn-primary mt-4">
              <Plus size={18} /> Log workout
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((w) => (
              <li key={w.id} className="flex items-center gap-3 p-4 transition-colors hover:bg-muted">
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary"
                  aria-hidden
                >
                  <SportIcon s={w.sport} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold">
                    {sportLabel(w.sport)} · {formatMiles(Number(w.distance_miles))}
                  </div>
                  <div className="text-xs text-text-secondary truncate">
                    {w.city}, {w.county_name} County, {stateName(w.state_code)}
                  </div>
                  <div className="mono text-xs text-text-secondary mt-0.5">
                    {formatDateTime(w.performed_at)}
                  </div>
                </div>
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
              </li>
            ))}
          </ul>
        )}
      </div>

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
          // Block dismiss until the user confirms they saved it.
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
                  Write this code down or save it in a password manager. If you ever
                  lose access to your email, this is the <strong>only</strong> way to
                  recover your account.
                </p>
                <div className="rounded-lg border border-border bg-muted p-4 text-center">
                  <div className="mono text-2xl font-bold tracking-widest break-all">
                    {recoveryCode}
                  </div>
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
                  We only store a one-way hash of this code, so we can't show it to
                  you again. Treat it like a password.
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
