import type { TooltipProps } from "recharts";

export const CHART_COLORS = {
  cyan: "#00C8E8",
  aqua: "#2DD4A7",
  amber: "#F5A524",
  coral: "#FF5C6C",
  violet: "#8B7BFF",
  slate: "#4D8BA6",
  grid: "rgba(148,178,194,0.12)",
  axis: "#5C7484",
};

export const AXIS_PROPS = {
  stroke: CHART_COLORS.axis,
  tick: { fill: CHART_COLORS.axis, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: CHART_COLORS.grid },
} as const;

export function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-white/12 bg-abyss-200/95 px-2.5 py-2 text-xs shadow-xl">
      {label !== undefined ? <p className="mb-1 font-medium text-ink">{String(label)}</p> : null}
      <ul className="space-y-0.5">
        {payload.map((entry, i) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-ink-muted">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-mono text-ink">
              {typeof entry.value === "number" ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : String(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
