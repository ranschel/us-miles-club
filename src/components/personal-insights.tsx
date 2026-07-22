import { Activity, Sparkles, Target, Info } from "lucide-react";
import type { PersonalInsight, PersonalInsightIcon } from "@/lib/personal-insights";

const ICONS: Record<PersonalInsightIcon, typeof Activity> = {
  momentum: Activity,
  target: Target,
  spark: Sparkles,
  info: Info,
};

export function PersonalInsights({ insights }: { insights: PersonalInsight[] }) {
  if (insights.length === 0) return null;
  return (
    <section aria-label="Personal insights" className="card mb-6">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-xl font-bold">What your data says</h2>
        <span className="mono text-[0.62rem] uppercase tracking-[0.16em] text-text-secondary">
          Based on your history
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((ins) => {
          const Icon = ICONS[ins.icon];
          return (
            <article
              key={ins.id}
              className="rounded-xl border border-white/10 bg-[rgba(94,234,255,0.03)] p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[rgba(94,234,255,0.1)] text-secondary">
                  <Icon size={14} strokeWidth={2.2} />
                </span>
                <span className="mono text-[0.62rem] uppercase tracking-[0.16em] text-text-secondary">
                  {ins.eyebrow}
                </span>
              </div>
              <p className="font-display text-[0.95rem] font-semibold leading-snug">
                {ins.headline}
              </p>
              {ins.supportingText && (
                <p className="mt-1.5 text-xs text-text-secondary leading-snug">
                  {ins.supportingText}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
