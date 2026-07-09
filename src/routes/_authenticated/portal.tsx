import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, Plus, Footprints, Bike, PersonStanding, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listMyWorkouts, deleteWorkout } from "@/lib/workouts.functions";
import { formatMiles, formatDateTime, sportLabel } from "@/lib/format";
import { stateName } from "@/lib/us-geo";

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

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["my-workouts"],
    queryFn: () => list(),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Workout deleted.");
      qc.invalidateQueries({ queryKey: ["my-workouts"] });
      qc.invalidateQueries({ queryKey: ["public-workouts"] });
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">My portal</h1>
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

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-bold">History</h2>
          <p className="text-sm text-text-secondary">Newest first. Delete removes it forever.</p>
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
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete this ${sportLabel(w.sport).toLowerCase()}? This can't be undone.`)) {
                      removeMut.mutate(w.id);
                    }
                  }}
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
    </div>
  );
}
