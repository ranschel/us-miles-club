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
    onChange(next.length === 0 ? ["walk", "run", "bike"] : next);
  };

  return (
    <div
      role="group"
      aria-label="Filter map and leaderboards by sport"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1 backdrop-blur-lg"
      style={{ boxShadow: "var(--shadow-panel)" }}
    >
      {OPTIONS.map(({ value: v, label, Icon }) => {
        const active = value.includes(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => toggle(v)}
            aria-pressed={active}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold font-display transition-all ${
              active
                ? "bg-[rgba(94,234,255,0.14)] text-secondary shadow-[0_0_18px_rgba(94,234,255,0.35)]"
                : "text-text-secondary hover:text-foreground"
            }`}
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
