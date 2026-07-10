import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { CityAgg } from "@/lib/aggregate";
import { formatMiles } from "@/lib/format";

export function CityList({
  countyName,
  cities,
  loading,
}: {
  countyName: string;
  cities: CityAgg[];
  loading?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return cities;
    const t = q.trim().toLowerCase();
    return cities.filter((c) => c.name.toLowerCase().includes(t));
  }, [q, cities]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold">Cities in {countyName} County</h3>
        <span className="mono text-xs text-text-secondary">{cities.length} active</span>
      </div>
      <label className="relative block mb-3">
        <span className="sr-only">Search cities</span>
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          aria-hidden
        />
        <input
          type="search"
          className="field-input pl-9"
          placeholder="Search a city"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-14" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-text-secondary">
          No matching cities. Try clearing the search.
        </p>
      ) : (
        <ol className="rounded-lg border border-white/10 overflow-hidden">
          {filtered.map((c, i) => (
            <li
              key={c.name}
              className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04] ${
                i % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"
              }`}
            >
              <span className="mono w-8 shrink-0 text-xs font-semibold text-text-secondary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 font-medium">{c.name}</span>
              <span className="mono text-sm text-foreground">{formatMiles(c.totalMiles)}</span>
              <span className="mono text-xs text-text-secondary hidden sm:inline">
                {c.count} log{c.count === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function LeaderboardList({
  title,
  items,
  loading,
  emptyLabel = "Nothing here yet.",
  onSelect,
}: {
  title: string;
  items: { key: string; label: string; sub?: string; miles: number; count: number }[];
  loading?: boolean;
  emptyLabel?: string;
  onSelect?: (key: string) => void;
}) {
  return (
    <div className="glass-strong p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-display text-lg font-bold leading-[0.98] tracking-tight">{title}</h3>
        <span className="mono text-[0.65rem] uppercase tracking-[0.16em] text-text-secondary">
          Total miles
        </span>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-12" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-secondary">{emptyLabel}</p>
      ) : (
        <ol className="space-y-1">
          {items.map((it, i) => {
            const clickable = !!onSelect;
            const rowCls = `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
              clickable
                ? "hover:bg-[rgba(94,234,255,0.08)] hover:ring-1 hover:ring-[rgba(94,234,255,0.35)] cursor-pointer"
                : "hover:bg-white/[0.04]"
            } ${i % 2 === 0 ? "bg-white/[0.015]" : "bg-transparent"}`;
            const content = (
              <>
                <span className="mono w-8 text-xs font-semibold text-secondary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-display font-bold tracking-tight break-words hyphens-auto"
                    title={it.label}
                  >
                    {it.label}
                  </div>
                  {it.sub && (
                    <div
                      className="text-xs text-text-secondary break-words hyphens-auto"
                      title={it.sub}
                    >
                      {it.sub}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="mono text-sm font-semibold text-foreground">
                    {formatMiles(it.miles)}
                  </div>
                  <div className="mono text-[0.65rem] text-text-secondary">
                    {it.count} log{it.count === 1 ? "" : "s"}
                  </div>
                </div>
              </>
            );
            return (
              <li key={it.key}>
                {clickable ? (
                  <button type="button" className={rowCls} onClick={() => onSelect!(it.key)}>
                    {content}
                  </button>
                ) : (
                  <div className={rowCls}>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
