import { Info, X } from "lucide-react";
import { useAppStore } from "@/app/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataBadge } from "@/components/common/section-header";
import type { GeoProperties } from "@/types";

const LABELS: Record<string, string> = {
  objectid: "Object ID",
  wmt_id: "WMT ID",
  ipw_id: "IPW ID",
  wds_id: "WDS ID",
  wtp_id: "WTP ID",
  oww_id: "OWW ID",
  wmdz_id: "Zone ID",
  cbw_id: "CBW ID",
  phb_id: "PHB ID",
  from_id_tapping_point: "From tapping point",
  to_id_inclusion_point: "To inclusion point",
  connecting_from_id: "Connecting from",
  connecting_to_id: "Connecting to",
  road_name: "Road name",
  road_type: "Road type",
  road_width: "Road width (m)",
  se_territory: "Territory",
  area_field: "Area field",
  size_of_pipe_mm: "Pipe size (mm)",
  size_mm: "Pipe size (mm)",
  material_of_pipe: "Material",
  type_of_conduit: "Conduit type",
  type_of_joints: "Joint type",
  nature_of_water: "Water nature",
  nature_pipe: "Pipe nature",
  length_of_main_m: "Length of main (m)",
  length_m: "Length (m)",
  average_depth_of_pipe_m: "Avg. depth (m)",
  status: "Status",
  enabled: "Enabled",
  installed_on: "Installed on",
  installed_date: "Installed date",
  commissioned_on: "Commissioned on",
  repaired_on: "Repaired on",
  date_of_repair_work_carriedout: "Repair date",
  date_of_construction: "Construction date",
  date_of_reconstruction: "Reconstruction date",
  name_of_the_location: "Location",
  name_of_the_chamber: "Chamber",
  name_of_the_wds: "Distribution station",
  name_of_the_wtp: "Treatment plant",
  name_of_the_oww: "Overhead works",
  name_of_the_phb: "PHB",
  quantity: "Quantity",
  flow_meter_type: "Meter type",
  make: "Make",
  model: "Model",
  serial_no: "Serial no.",
  remarks: "Remarks",
  source_name: "Source name",
  route_name: "Route name",
};

function isMissing(v: unknown): boolean {
  return v === undefined || v === null || v === "" || v === "NA" || v === "<Null>";
}

function formatValue(key: string, v: unknown): string {
  if (isMissing(v)) return "—";
  if (typeof v === "number") return v.toLocaleString();
  const s = String(v);
  if ((key.includes("length") || key.includes("width")) && !Number.isNaN(Number(s))) {
    return Number(s).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return s;
}

export function FeatureInspector({ onZoom }: { onZoom?: () => void }) {
  const selection = useAppStore((s) => s.selection);
  const setSelection = useAppStore((s) => s.setSelection);

  if (!selection) {
    return (
      <div className="panel rounded-lg p-4">
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Info className="h-3.5 w-3.5 text-cyan-brand" />
          Select a mapped feature on the map to inspect its recorded attributes.
        </div>
      </div>
    );
  }

  const props: GeoProperties = selection.properties;
  const entries = Object.entries(props).filter(
    ([key]) => !key.startsWith("__") && key !== "styleUrl" && key !== "styleHash" && key !== "styleMapHash",
  );

  return (
    <div className="panel flex max-h-[24rem] flex-col rounded-lg">
      <div className="flex items-start justify-between gap-2 border-b border-white/8 px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-ink">{selection.label}</p>
            <DataBadge kind={selection.simulated ? "simulated" : "real"} />
          </div>
          <p className="mt-0.5 text-2xs text-ink-faint">
            {selection.layer ? `Layer: ${selection.layer}` : "Simulation element"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onZoom ? (
            <Button variant="ghost" size="sm" onClick={onZoom} className="text-cyan-soft">
              Zoom
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSelection(null)}
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="overflow-y-auto px-3 py-2 thin-scroll">
        <dl className="divide-y divide-white/5">
          {entries.map(([key, value]) => (
            <div key={key} className="grid grid-cols-[1fr_1.2fr] gap-2 py-1.5">
              <dt className="text-2xs text-ink-faint">{LABELS[key] ?? key}</dt>
              <dd className="text-right font-mono text-2xs text-ink-muted">{formatValue(key, value)}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-2 flex items-center gap-1.5 pt-2">
          <Badge variant="outline">Source attributes preserved verbatim</Badge>
        </div>
      </div>
    </div>
  );
}
