import { useRef, useState } from "react";
import { Share2, Download, Copy, Check, X } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { formatMiles } from "@/lib/format";
import { stateName } from "@/lib/us-geo";
import type { Sport } from "@/lib/public-workouts";

type Rankings = {
  individualRank: number | null;
  cityRank: number | null;
  countyRank: number | null;
  stateRank: number | null;
  cityName: string | null;
  countyName: string | null;
  stateCode: string | null;
  totalIndividuals: number;
  totalCities: number;
  totalCounties: number;
  totalStates: number;
} | undefined;

function sportsLabel(sports: Sport[]): string {
  if (sports.length === 3) return "Walk · Run · Bike";
  return sports
    .map((s) => (s === "walk" ? "Walk" : s === "run" ? "Run" : "Bike"))
    .join(" · ");
}

export function ShareRankCard({
  name,
  totalMiles,
  rankings,
  sports,
}: {
  name: string;
  totalMiles: number;
  rankings: Rankings;
  sports: Sport[];
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const displayName = name?.trim() || "Anonymous";
  const stateFull = rankings?.stateCode ? stateName(rankings.stateCode) : null;
  const sportsText = sportsLabel(sports);

  const summaryText = [
    `${displayName} · US Miles Club`,
    `${formatMiles(totalMiles)} · ${sportsText}`,
    rankings?.individualRank ? `Individual: #${rankings.individualRank} of ${rankings.totalIndividuals.toLocaleString()}` : null,
    rankings?.cityRank && rankings.cityName ? `${rankings.cityName}: #${rankings.cityRank} of ${rankings.totalCities.toLocaleString()}` : null,
    rankings?.countyRank && rankings.countyName ? `${rankings.countyName} County: #${rankings.countyRank} of ${rankings.totalCounties.toLocaleString()}` : null,
    rankings?.stateRank && stateFull ? `${stateFull}: #${rankings.stateRank} of ${rankings.totalStates.toLocaleString()}` : null,
    typeof window !== "undefined" ? window.location.origin : "",
  ]
    .filter(Boolean)
    .join("\n");

  async function copyText() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      toast.success("Copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Try again.");
    }
  }

  async function downloadImage() {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0a0a0b",
      });
      const link = document.createElement("a");
      link.download = `us-miles-club-${displayName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Image downloaded.");
    } catch {
      toast.error("Couldn't generate image.");
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost border border-primary/40 text-primary hover:bg-primary/10"
        onClick={() => setOpen(true)}
      >
        <Share2 size={16} /> Share my rank
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground shadow-lg hover:bg-muted-foreground/20"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div
              ref={cardRef}
              className="overflow-hidden rounded-2xl p-6"
              style={{
                background: "linear-gradient(135deg, #0a0a0b 0%, #14100c 100%)",
                border: "1px solid rgba(249, 115, 22, 0.35)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className="text-[10px] font-black uppercase tracking-[0.2em]"
                    style={{ color: "#f97316" }}
                  >
                    US Miles Club
                  </div>
                  <div
                    className="mt-1 text-2xl font-black tracking-tight"
                    style={{ color: "#ffffff" }}
                  >
                    {displayName}
                  </div>
                </div>
                <div
                  className="text-right text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {sportsText}
                </div>
              </div>

              <div
                className="mt-5 rounded-xl p-4 text-center"
                style={{ background: "rgba(249, 115, 22, 0.12)" }}
              >
                <div
                  className="text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Total miles
                </div>
                <div
                  className="mt-1 text-5xl font-black tracking-tight"
                  style={{ color: "#f97316" }}
                >
                  {formatMiles(totalMiles)}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <RankTile
                  label="Individual"
                  rank={rankings?.individualRank}
                  total={rankings?.totalIndividuals}
                />
                <RankTile
                  label={rankings?.cityName ?? "City"}
                  rank={rankings?.cityRank}
                  total={rankings?.totalCities}
                />
                <RankTile
                  label={rankings?.countyName ? `${rankings.countyName} County` : "County"}
                  rank={rankings?.countyRank}
                  total={rankings?.totalCounties}
                />
                <RankTile
                  label={stateFull ?? "State"}
                  rank={rankings?.stateRank}
                  total={rankings?.totalStates}
                />
              </div>

              <div
                className="mt-5 text-center text-[10px] font-medium uppercase tracking-[0.15em]"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Log miles for your city · usmilesclub
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={downloadImage}
                className="btn btn-primary flex-1"
              >
                <Download size={16} /> Download image
              </button>
              <button
                type="button"
                onClick={copyText}
                className="btn btn-ghost flex-1 border border-border"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy text"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RankTile({
  label,
  rank,
  total,
}: {
  label: string;
  rank: number | null | undefined;
  total: number | undefined;
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      <div
        className="truncate text-[10px] font-bold uppercase tracking-wide"
        style={{ color: "rgba(255,255,255,0.55)" }}
        title={label}
      >
        {label}
      </div>
      <div
        className="mt-1 text-2xl font-black tracking-tight"
        style={{ color: "#ffffff" }}
      >
        {rank ? `#${rank}` : "—"}
      </div>
      {total ? (
        <div
          className="text-[10px]"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          of {total.toLocaleString()}
        </div>
      ) : null}
    </div>
  );
}
