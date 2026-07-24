import { formatMiles } from "@/lib/format";

export interface BarItem {
  key: string;
  label: string;
  sub?: string;
  miles: number;
}

export function LeaderboardBars({
  title,
  items,
  loading,
  highlightedKey,
  onHighlight,
  onSelect,
  emptyLabel = "No data yet.",
}: {
  title: string;
  items: BarItem[];
  loading?: boolean;
  highlightedKey?: string | null;
  onHighlight?: (key: string | null) => void;
  onSelect?: (key: string) => void;
  emptyLabel?: string;
}) {
  const max = items.reduce((m, it) => Math.max(m, it.miles), 0);

  return (
    <div className="glass-strong h-full p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-display text-lg font-bold leading-[0.98] tracking-tight">{title}</h3>
        <span className="mono text-[0.65rem] uppercase tracking-[0.16em] text-text-secondary">
          Miles
        </span>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="skeleton h-8" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-secondary">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const pct = max > 0 ? Math.max(4, (it.miles / max) * 100) : 0;
            const isHi = highlightedKey === it.key;
            return (
              <li
                key={it.key}
                onMouseEnter={onHighlight ? () => onHighlight(it.key) : undefined}
                onMouseLeave={onHighlight ? () => onHighlight(null) : undefined}
                onClick={onSelect ? () => onSelect(it.key) : undefined}
                className={`cursor-${onSelect ? "pointer" : "default"} rounded-md px-2 py-1.5 transition-colors ${
                  isHi ? "bg-[rgba(94,234,255,0.08)]" : ""
                }`}
              >
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span
                    className="truncate text-xs font-semibold text-foreground"
                    title={it.label}
                  >
                    {it.label}
                  </span>
                  <span className="mono text-[0.7rem] tabular-nums text-text-secondary">
                    {formatMiles(it.miles)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      background: isHi
                        ? "linear-gradient(to right, rgba(94,234,255,0.9), rgba(94,234,255,0.5))"
                        : "var(--gradient-primary)",
                      boxShadow: isHi ? "0 0 12px rgba(94,234,255,0.5)" : undefined,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
