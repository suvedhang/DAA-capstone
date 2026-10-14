import { NavLink } from "react-router-dom";
import { Droplets, X } from "lucide-react";
import { NAV_ITEMS } from "@/app/nav";
import { useAppStore } from "@/app/store";
import { cn } from "@/lib/utils";
import { DataBadge } from "@/components/common/section-header";

export function Sidebar() {
  const open = useAppStore((s) => s.sidebarOpen);
  const setOpen = useAppStore((s) => s.setSidebarOpen);

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-abyss/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/8 bg-abyss-100/95 backdrop-blur transition-transform lg:static lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-brand/25 to-aqua/15 ring-1 ring-cyan-brand/40">
              <Droplets className="h-4 w-4 text-cyan-brand" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-ink">AquaMind</p>
              <p className="text-2xs text-ink-faint">Chennai water intelligence</p>
            </div>
          </div>
          <button
            type="button"
            className="text-ink-faint hover:text-ink lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2 thin-scroll" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "group flex items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-cyan-brand/12 text-ink shadow-[inset_0_0_0_1px_rgba(0,200,232,0.28)]"
                    : "text-ink-muted hover:bg-white/[0.04] hover:text-ink",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn("mt-0.5 h-4 w-4 shrink-0", isActive ? "text-cyan-brand" : "text-ink-faint group-hover:text-ink-muted")}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.label}</span>
                      <span className="shrink-0 font-mono text-2xs text-ink-faint">{item.tag}</span>
                    </span>
                    <span className="mt-0.5 block text-2xs leading-snug text-ink-faint">{item.description}</span>
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/8 px-4 py-3">
          <DataBadge kind="real" />
          <p className="mt-2 text-2xs leading-relaxed text-ink-faint">
            Academic decision-support prototype. Not an operational control system for Chennai's water
            infrastructure.
          </p>
        </div>
      </aside>
    </>
  );
}
