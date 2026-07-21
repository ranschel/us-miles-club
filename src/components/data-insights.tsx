import { Trophy, Sparkles, Network, Activity, Info, ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { Insight, InsightIcon } from "@/lib/insights";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { Sport } from "@/lib/public-workouts";

const ICONS: Record<InsightIcon, typeof Trophy> = {
  trophy: Trophy,
  spark: Sparkles,
  distribution: Network,
  momentum: Activity,
  info: Info,
};

export function DataInsights({
  insights,
  sports,
  loading,
}: {
  insights: Insight[];
  sports: Sport[];
  loading?: boolean;
}) {
  const navigate = useNavigate();

  const go = (state?: string, county?: string) => {
    const search: Record<string, unknown> = { sports };
    if (state) search.state = state;
    if (county) search.county = county;
    navigate({ to: "/", search: search as never });
  };

  return (
    <TooltipProvider>
      <section
        aria-label="Data insights"
        className="glass relative overflow-hidden p-4 md:p-5"
      >
        <div
          className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-[0.12] blur-3xl"
          style={{ backgroundImage: "var(--gradient-primary)" }}
          aria-hidden
        />
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base md:text-lg font-bold tracking-tight">
              What the data says
            </h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="How insights are calculated"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-text-secondary hover:text-secondary transition-colors"
                >
                  <Info size={14} strokeWidth={2} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" align="start" className="max-w-[18rem]">
                Insights compare total mileage, participation, sport mix, and recent seven-day
                trends.
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="mono text-[0.65rem] uppercase tracking-[0.18em] text-text-muted">
            Based on the current filters
          </span>
        </div>

        <div
          aria-live="polite"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-300"
          style={{ opacity: loading ? 0.55 : 1 }}
        >
          {insights.length === 0 ? (
            <div className="col-span-full rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-text-secondary">
              More activity is needed before a reliable pattern emerges.
            </div>
          ) : (
            insights.map((ins) => {
              const Icon = ICONS[ins.icon];
              const trendWord =
                ins.type === "momentum" || ins.type === "local-momentum"
                  ? ins.headline.toLowerCase().includes("slipped")
                    ? " — trending down"
                    : " — trending up"
                  : "";
              return (
                <article
                  key={ins.id}
                  className="group relative flex flex-col rounded-xl border border-white/10 bg-[rgba(94,234,255,0.03)] p-4 transition-colors hover:border-[rgba(94,234,255,0.35)]"
                  aria-label={`${ins.eyebrow}: ${ins.headline}${trendWord}`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[rgba(94,234,255,0.1)] text-secondary">
                      <Icon size={14} strokeWidth={2.2} />
                    </span>
                    <span className="mono text-[0.62rem] uppercase tracking-[0.16em] text-text-secondary">
                      {ins.eyebrow}
                    </span>
                  </div>
                  <p className="font-display text-[0.95rem] font-semibold leading-snug text-foreground">
                    {ins.headline}
                  </p>
                  {ins.supportingText && (
                    <p className="mt-1.5 text-xs text-text-secondary leading-snug">
                      {ins.supportingText}
                    </p>
                  )}
                  {ins.action && (
                    <button
                      type="button"
                      onClick={() => go(ins.action?.state, ins.action?.county)}
                      className="mt-3 inline-flex w-fit items-center gap-1 text-xs font-semibold text-secondary hover:text-secondary/80 transition-colors"
                    >
                      {ins.action.label}
                      <ArrowRight size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    </TooltipProvider>
  );
}
