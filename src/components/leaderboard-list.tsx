import { useMemo, useState } from "react";
import { Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Trend } from "@/lib/aggregate";

import type { CityAgg } from "@/lib/aggregate";
import { formatMiles } from "@/lib/format";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

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
        <h3 className="font-display text-lg font-bold">Top Cities - {countyName} County</h3>
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
        <p className="text-sm text-text-secondary">No matching cities. Try clearing the search.</p>
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
  clickHint,
  searchable = false,
  searchPlaceholder = "Search",
  topN = 20,
  highlightedKey,
  onHighlight,
}: {
  title: string;
  items: { key: string; label: string; sub?: string; miles: number; count: number; trend?: Trend }[];
  loading?: boolean;
  emptyLabel?: string;
  onSelect?: (key: string) => void;
  clickHint?: (item: { key: string; label: string; sub?: string }) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  topN?: number;
  highlightedKey?: string | null;
  onHighlight?: (key: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = query
    ? items.filter(
        (it) =>
          it.label.toLowerCase().includes(query) || (it.sub ?? "").toLowerCase().includes(query),
      )
    : items.slice(0, topN);

  const defaultHint = (it: { label: string }) => `Click to view ${it.label}.`;

  return (
    <TooltipProvider>
      <div className="glass-strong p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="font-display text-lg font-bold leading-[0.98] tracking-tight">{title}</h3>
          <span className="mono text-[0.65rem] uppercase tracking-[0.16em] text-text-secondary">
            Total miles
          </span>
        </div>
        {searchable && (
          <label className="relative mb-3 block">
            <span className="sr-only">{searchPlaceholder}</span>
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              aria-hidden
            />
            <input
              type="search"
              className="field-input pl-8 text-sm"
              placeholder={searchPlaceholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        )}
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {query ? "No matches. Try a different search." : emptyLabel}
          </p>
        ) : (
          <ol className="space-y-1">
            {filtered.map((it, i) => {
              const rank = query ? items.indexOf(it) + 1 : i + 1;
              const clickable = !!onSelect;
              const rowCls = `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                clickable
                  ? "hover:bg-[rgba(94,234,255,0.08)] hover:ring-1 hover:ring-[rgba(94,234,255,0.35)] cursor-pointer"
                  : "hover:bg-white/[0.04]"
              } ${i % 2 === 0 ? "bg-white/[0.015]" : "bg-transparent"}`;
              const content = (
                <>
                  <span className="mono w-8 text-xs font-semibold text-secondary">
                    {String(rank).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-display font-bold tracking-tight truncate"
                      title={it.label}
                    >
                      {it.label}
                    </div>
                    {it.sub && (
                      <div className="text-xs text-text-secondary truncate" title={it.sub}>
                        {it.sub}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="mono text-sm font-semibold text-foreground flex items-center justify-end gap-1.5">
                      {it.trend === "up" && (
                        <TrendingUp
                          size={14}
                          className="text-emerald-400"
                          aria-label="Trending up over the last 7 days"
                        />
                      )}
                      {it.trend === "down" && (
                        <TrendingDown
                          size={14}
                          className="text-rose-400"
                          aria-label="Trending down over the last 7 days"
                        />
                      )}
                      {it.trend === "flat" && (
                        <Minus
                          size={14}
                          className="text-text-secondary"
                          aria-label="No recent change"
                        />
                      )}
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={rowCls}
                          onClick={() => onSelect!(it.key)}
                          aria-label={clickHint ? clickHint(it) : defaultHint(it)}
                        >
                          {content}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="center"
                        className="max-w-[16rem] text-center"
                      >
                        {clickHint ? clickHint(it) : defaultHint(it)}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className={rowCls}>{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </TooltipProvider>
  );
}
