import { Menu, Database, CircleDashed, TriangleAlert } from "lucide-react";
import { useAppStore } from "@/app/store";
import { useDataset } from "@/hooks/useDataset";
import { CommandSearch } from "./CommandSearch";
import { Badge } from "@/components/ui/badge";

export function Topbar() {
  const setOpen = useAppStore((s) => s.setSidebarOpen);
  const scenarioName = useAppStore((s) => s.scenarioName);
  const { manifest, manifestError, loading, graphStats, graphLoading } = useDataset();

  const totalFeatures = manifest?.layers.reduce((s, l) => s + l.featureCount, 0) ?? 0;

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/8 bg-abyss-100/70 px-3 backdrop-blur lg:px-4">
      <button
        type="button"
        className="rounded-md p-1.5 text-ink-muted hover:bg-white/[0.05] hover:text-ink lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden items-center gap-2 sm:flex">
        <span className="text-xs text-ink-faint">Workspace</span>
        <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs font-medium text-ink">
          {scenarioName}
        </span>
      </div>

      <div className="flex flex-1 justify-center">
        <CommandSearch />
      </div>

      <div className="flex items-center gap-2">
        {loading ? (
          <Badge variant="muted" className="hidden sm:inline-flex">
            <CircleDashed className="h-3 w-3 animate-spin" /> Loading dataset
          </Badge>
        ) : manifestError ? (
          <Badge variant="danger" className="hidden sm:inline-flex">
            <TriangleAlert className="h-3 w-3" /> Dataset unavailable
          </Badge>
        ) : (
          <Badge variant="success" className="hidden sm:inline-flex" title="Converted from the supplied Chennai KML files">
            <Database className="h-3 w-3" />
            {totalFeatures.toLocaleString()} mapped features
          </Badge>
        )}
        <Badge variant={graphLoading ? "muted" : "default"} className="hidden md:inline-flex" title="Graph nodes / edges derived from recorded connectivity plus endpoint snapping">
          {graphLoading
            ? "Building graph…"
            : graphStats
              ? `${graphStats.nodeCount.toLocaleString()} nodes · ${graphStats.edgeCount.toLocaleString()} edges`
              : "No graph"}
        </Badge>
      </div>
    </header>
  );
}
