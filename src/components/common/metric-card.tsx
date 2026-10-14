import * as React from "react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "good" | "warn" | "bad" | "cyan";
  className?: string;
}) {
  const toneClass = {
    default: "text-ink",
    cyan: "text-cyan-soft",
    good: "text-aqua-soft",
    warn: "text-amber-brand",
    bad: "text-coral-soft",
  }[tone];

  return (
    <div className={cn("panel rounded-lg p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xs font-medium uppercase tracking-wider text-ink-faint">{label}</span>
        {Icon ? <Icon className="h-3.5 w-3.5 text-ink-faint" /> : null}
      </div>
      <div className={cn("mt-1.5 font-mono text-xl font-medium leading-none", toneClass)}>
        {value}
        {unit ? <span className="ml-1 text-xs text-ink-faint">{unit}</span> : null}
      </div>
      {hint ? <p className="mt-1.5 text-2xs leading-snug text-ink-faint">{hint}</p> : null}
    </div>
  );
}
