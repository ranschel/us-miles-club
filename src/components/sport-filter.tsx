import { Footprints, Bike, PersonStanding } from "lucide-react";
import type { Sport } from "@/lib/public-workouts";

const OPTIONS: { value: Sport; label: string; Icon: typeof Footprints }[] = [
  { value: "walk", label: "Walk", Icon: PersonStanding },
  { value: "run", label: "Run", Icon: Footprints },
  { value: "bike", label: "Bike", Icon: Bike },
];

export function SportFilter({
  value,
  onChange,
}: {
  value: Sport[];
  onChange: (v: Sport[]) => void;
}) {
  const toggle = (s: Sport) => {
    const has = value.includes(s);
    const next = has ? value.filter((v) => v !== s) : [...value, s];
    // Never allow zero-selected (would mean no data). Fall back to all three.
    onChange(next.length === 0 ? ["walk", "run", "bike"] : next);
  };

  return (
    <div
      role="group"
      aria-label="Filter map and leaderboards by sport"
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-sm font-bold text-text-secondary mr-1">Showing:</span>
      {OPTIONS.map(({ value: v, label, Icon }) => {
        const active = value.includes(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => toggle(v)}
            data-active={active}
            aria-pressed={active}
            className="chip"
            style={{ minHeight: 36 }}
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
