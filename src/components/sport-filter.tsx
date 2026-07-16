import { useState, useId } from "react";
import { Footprints, Bike, PersonStanding } from "lucide-react";
import type { Sport } from "@/lib/public-workouts";

const OPTIONS: { value: Sport; label: string; Icon: typeof Footprints }[] = [
  { value: "walk", label: "Walk", Icon: PersonStanding },
  { value: "run", label: "Run", Icon: Footprints },
  { value: "bike", label: "Bike", Icon: Bike },
];

const HINTS: Record<Sport, string> = {
  walk: "Toggle walking miles on the map and leaderboards",
  run: "Toggle running miles on the map and leaderboards",
  bike: "Toggle biking miles on the map and leaderboards",
};

function SportButtonTooltip({
  label,
  hint,
  active,
  onClick,
  children,
}: {
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={hint}
        aria-describedby={open ? id : undefined}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold font-display transition-all ${
          active
            ? "bg-[rgba(94,234,255,0.14)] text-secondary shadow-[0_0_18px_rgba(94,234,255,0.35)]"
            : "text-text-secondary hover:text-foreground"
        }`}
      >
        {children}
        {label}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[16rem] -translate-x-1/2 rounded-md border border-secondary/35 bg-secondary px-3 py-1.5 text-center text-xs text-secondary-foreground shadow-[0_0_18px_rgba(94,234,255,0.25)]"
        >
          {hint}
        </span>
      )}
    </span>
  );
}

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
      {OPTIONS.map(({ value: v, label, Icon }) => (
        <SportButtonTooltip
          key={v}
          label={label}
          hint={HINTS[v]}
          active={value.includes(v)}
          onClick={() => toggle(v)}
        >
          <Icon size={16} strokeWidth={2} />
        </SportButtonTooltip>
      ))}
    </div>
  );
}
