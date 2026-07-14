import { useMemo } from "react";
import { geoAlbersUsa, geoPath, geoAlbers } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import statesTopoRaw from "us-atlas/states-10m.json";
import countiesTopoRaw from "us-atlas/counties-10m.json";
import { STATE_BY_FIPS, stateCodeFromFips, stateFipsFromCode } from "@/lib/us-geo";
import { useHeatLevel, type StateAgg, type CountyAgg } from "@/lib/aggregate";
import { formatMiles } from "@/lib/format";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

// us-atlas ships TopoJSON; feature() only needs .objects[key], not full typing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const statesTopo = statesTopoRaw as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countiesTopo = countiesTopoRaw as any;

type Feat = FeatureCollection<Geometry, { name: string }>["features"][number];

const stateFeatures: Feat[] = (
  feature(statesTopo, statesTopo.objects.states) as unknown as FeatureCollection<
    Geometry,
    { name: string }
  >
).features;

const countyFeaturesByState = new Map<string, Feat[]>();
{
  const all = feature(
    countiesTopo,
    countiesTopo.objects.counties,
  ) as unknown as FeatureCollection<Geometry, { name: string }>;
  for (const f of all.features) {
    const fips = String(f.id).padStart(5, "0");
    const stateFips = fips.slice(0, 2);
    const list = countyFeaturesByState.get(stateFips) ?? [];
    list.push(f);
    countyFeaturesByState.set(stateFips, list);
  }
}

const usaProjection = geoAlbersUsa().scale(1200).translate([487.5, 305]);
const usaPath = geoPath(usaProjection);

export function NationalMap({
  byState,
  selected,
  onSelect,
}: {
  byState: Map<string, StateAgg>;
  selected: string | null;
  onSelect: (code: string | null) => void;
}) {
  const maxMiles = useMemo(() => {
    let m = 0;
    for (const s of byState.values()) if (s.totalMiles > m) m = s.totalMiles;
    return m;
  }, [byState]);
  const level = useHeatLevel(maxMiles);

  return (
    <TooltipProvider>
      <svg
        viewBox="0 0 975 610"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Interactive US map. Click a state to explore its counties and leaderboard."
        className="w-full h-auto"
      >
        <g>
          {stateFeatures.map((f) => {
            const fips = String(f.id).padStart(2, "0");
            const info = STATE_BY_FIPS[fips];
            const code = info?.code;
            const agg = code ? byState.get(code) : undefined;
            const miles = agg?.totalMiles ?? 0;
            const lvl = level(miles);
            const d = usaPath(f) ?? "";
            const isSelected = selected != null && selected === code;
            const label = info ? info.name : "Unknown region";
            const stats = agg
              ? `${formatMiles(miles)} across ${agg.count} workouts`
              : "no miles logged yet";
            const hint = code
              ? `Click to see ${label}'s county map, top counties, and city rankings.`
              : "";
            const tooltip = `${label} — ${stats}.${hint ? ` ${hint}` : ""}`;
            return (
              <Tooltip key={fips}>
                <TooltipTrigger asChild>
                  <path
                    d={d}
                    className="map-region"
                    data-level={lvl}
                    data-selected={isSelected}
                    tabIndex={0}
                    role="button"
                    aria-label={tooltip}
                    onClick={() => code && onSelect(code === selected ? null : code)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && code) {
                        e.preventDefault();
                        onSelect(code === selected ? null : code);
                      }
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" align="center" className="max-w-[16rem] text-center">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </g>
      </svg>
    </TooltipProvider>
  );
}

export function CountyMap({
  stateCode,
  byCounty,
  selectedFips,
  onSelect,
}: {
  stateCode: string;
  byCounty: Map<string, CountyAgg>;
  selectedFips: string | null;
  onSelect: (fips: string | null) => void;
}) {
  const stateFips = stateFipsFromCode(stateCode);
  const features = stateFips ? (countyFeaturesByState.get(stateFips) ?? []) : [];
  const stateFeature = stateFeatures.find((f) => String(f.id).padStart(2, "0") === stateFips);

  const { path, width, height } = useMemo(() => {
    if (!stateFeature) return { path: geoPath(geoAlbers()), width: 800, height: 500 };
    const w = 800;
    const h = 500;
    const proj = geoAlbers().fitSize([w, h], stateFeature);
    return { path: geoPath(proj), width: w, height: h };
  }, [stateFeature]);

  // County max within state for local heat scale.
  const maxMiles = useMemo(() => {
    let m = 0;
    for (const c of byCounty.values()) {
      if (c.state_code === stateCode && c.totalMiles > m) m = c.totalMiles;
    }
    return m;
  }, [byCounty, stateCode]);
  const level = useHeatLevel(maxMiles);

  if (!stateFeature) return null;

  return (
    <TooltipProvider>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`County map for ${STATE_BY_FIPS[stateFips!]?.name}. Click a county to see its active cities and local leaderboard.`}
        className="w-full h-auto"
      >
        <g>
          {features.map((f) => {
            const fips = String(f.id).padStart(5, "0");
            const agg = byCounty.get(fips);
            const miles = agg?.totalMiles ?? 0;
            const lvl = level(miles);
            const isSelected = selectedFips === fips;
            const name = (f.properties as GeoJsonProperties & { name?: string })?.name ?? "County";
            const stats = agg
              ? `${formatMiles(miles)} across ${agg.count} workouts`
              : "no miles logged yet";
            const hint = `Click to see ${name} County's active cities and local leaderboard.`;
            const tooltip = `${name} County — ${stats}. ${hint}`;
            return (
              <Tooltip key={fips}>
                <TooltipTrigger asChild>
                  <path
                    d={path(f) ?? ""}
                    className="map-region"
                    data-level={lvl}
                    data-selected={isSelected}
                    tabIndex={0}
                    role="button"
                    aria-label={tooltip}
                    onClick={() => onSelect(fips === selectedFips ? null : fips)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(fips === selectedFips ? null : fips);
                      }
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" align="center" className="max-w-[16rem] text-center">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </g>
      </svg>
    </TooltipProvider>
  );
}

export { stateCodeFromFips };
