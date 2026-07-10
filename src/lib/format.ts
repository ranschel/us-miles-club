const MILES_PER_KM = 0.621371;

export function milesFromKm(km: number): number {
  return km * MILES_PER_KM;
}
export function kmFromMiles(mi: number): number {
  return mi / MILES_PER_KM;
}

export function formatMiles(miles: number): string {
  return `${miles.toLocaleString(undefined, { maximumFractionDigits: 1 })} mi`;
}

export function sportLabel(s: "walk" | "run" | "bike"): string {
  return s === "walk" ? "Walk" : s === "run" ? "Run" : "Bike";
}

export function abbreviateName(fullName: string): string {
  const name = fullName.trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name || "Anonymous";
  const first = parts.slice(0, -1).join(" ");
  const lastInitial = parts.at(-1)![0]?.toUpperCase() ?? "";
  return `${first} ${lastInitial}.`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

// For <input type="datetime-local" step="1"> the value format is
// "YYYY-MM-DDTHH:MM:SS" in the browser's local time (no tz).
export function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function fromDateTimeLocal(v: string): Date {
  // Parses "YYYY-MM-DDTHH:MM:SS" as local time.
  return new Date(v);
}
