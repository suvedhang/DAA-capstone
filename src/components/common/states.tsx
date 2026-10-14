import * as React from "react";
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 px-6 py-10 text-center",
        className,
      )}
    >
      <Icon className="h-6 w-6 text-ink-faint" />
      <p className="text-sm font-medium text-ink-muted">{title}</p>
      {description ? <p className="max-w-sm text-xs text-ink-faint">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border border-coral/25 bg-coral/[0.06] px-4 py-3",
        className,
      )}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-coral-soft" />
        <p className="text-sm font-medium text-coral-soft">{title}</p>
      </div>
      {description ? <p className="text-xs leading-relaxed text-ink-muted">{description}</p> : null}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-ink-muted">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-brand" />
      {label}
    </div>
  );
}
