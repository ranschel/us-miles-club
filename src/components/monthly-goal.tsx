import { useState } from "react";
import { Target, Save, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { updateMyGoal } from "@/lib/workouts.functions";
import { formatMiles } from "@/lib/format";

type Workout = { performed_at: string; distance_miles: number | string };

const PRESETS = [10, 25, 50, 100];

export function MonthlyGoal({
  workouts,
  currentGoal,
}: {
  workouts: Workout[];
  currentGoal: number | null;
}) {
  const qc = useQueryClient();
  const save = useServerFn(updateMyGoal);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(currentGoal?.toString() ?? "");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthMiles = workouts.reduce((sum, w) => {
    const t = new Date(w.performed_at).getTime();
    return t >= monthStart ? sum + Number(w.distance_miles) : sum;
  }, 0);

  const goalMut = useMutation({
    mutationFn: (n: number | null) => save({ data: { monthly_goal_miles: n } }),
    onSuccess: () => {
      toast.success("Monthly goal saved.");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      setEditing(false);
    },
    onError: (e: Error) => toast.error(`Couldn't save: ${e.message}`),
  });

  function submitDraft() {
    const n = Math.round(Number(draft));
    if (!Number.isFinite(n) || n <= 0 || n > 10000) {
      toast.error("Enter a goal between 1 and 10,000 miles.");
      return;
    }
    goalMut.mutate(n);
  }

  const pct = currentGoal ? Math.min(100, (monthMiles / currentGoal) * 100) : 0;
  const monthLabel = now.toLocaleString(undefined, { month: "long", year: "numeric" });
  const hit = currentGoal && monthMiles >= currentGoal;

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Target size={16} strokeWidth={2.5} />
            <span className="text-xs font-black uppercase tracking-wide">
              {monthLabel} goal
            </span>
          </div>
          <div className="mono mt-1 text-3xl font-bold">
            {currentGoal ? `${formatMiles(monthMiles)}` : "—"}
          </div>
          <div className="text-xs text-text-secondary">
            {currentGoal
              ? `of ${formatMiles(currentGoal)} goal`
              : "No goal set for this month"}
          </div>
        </div>
        {currentGoal && !editing && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setDraft(currentGoal.toString());
              setEditing(true);
            }}
            aria-label="Edit goal"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {currentGoal && !editing && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                hit ? "bg-primary" : "bg-primary/80"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mono mt-1 flex justify-between text-[10px] uppercase tracking-wide text-text-secondary">
            <span>{pct.toFixed(0)}%</span>
            <span>{hit ? "Goal hit 🎉" : `${formatMiles(currentGoal - monthMiles)} to go`}</span>
          </div>
        </div>
      )}

      {(editing || !currentGoal) && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                  draft === n.toString()
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border text-text-secondary hover:border-primary/60 hover:text-foreground"
                }`}
                onClick={() => setDraft(n.toString())}
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
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={goalMut.isPending}
              onClick={submitDraft}
            >
              <Save size={14} /> Save
            </button>
            {editing && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setDraft(currentGoal?.toString() ?? "");
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
