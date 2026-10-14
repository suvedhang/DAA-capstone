import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function SectionHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="flex items-start gap-2.5">
        {Icon ? (
          <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-cyan-brand/10 text-cyan-brand">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
          {description ? (
            <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-ink-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Distinguishes real mapped data from simulated/synthetic content. */
export function DataBadge({ kind }: { kind: "real" | "simulated" | "inferred" }) {
  if (kind === "real") {
    return <Badge variant="success">Mapped data</Badge>;
  }
  if (kind === "inferred") {
    return <Badge variant="warning">Inferred</Badge>;
  }
  return <Badge variant="warning">Simulated</Badge>;
}
