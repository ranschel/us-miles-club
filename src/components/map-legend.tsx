export function MapLegend() {
  return (
    <div className="glass mx-auto flex w-full max-w-md flex-col gap-2 px-4 py-3">
      <div
        className="h-2.5 w-full rounded-full"
        style={{
          background:
            "linear-gradient(to right, var(--map-empty) 0%, var(--map-1) 16%, var(--map-2) 38%, var(--map-3) 60%, var(--map-4) 82%, var(--map-5) 100%)",
        }}
        aria-hidden
      />
      <div className="flex justify-between font-mono text-[0.7rem] uppercase tracking-wider text-text-secondary">
        <span>No logged miles</span>
        <span>Lower miles</span>
        <span>Higher miles</span>
      </div>
    </div>
  );
}
