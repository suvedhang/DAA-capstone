import {
  Activity,
  FlaskConical,
  LayoutDashboard,
  Network,
  TrendingDown,
  Waves,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  short: string;
  icon: LucideIcon;
  description: string;
  /** SDG / module tag shown in the sidebar. */
  tag: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    path: "/",
    label: "Overview",
    short: "Overview",
    icon: LayoutDashboard,
    description: "Network-wide metrics, dataset provenance and scenario status.",
    tag: "SDG 6",
  },
  {
    path: "/network",
    label: "Water Network",
    short: "Network",
    icon: Network,
    description: "Interactive map, feature inspection, and shortest-path routing.",
    tag: "Module 1",
  },
  {
    path: "/allocation",
    label: "Resource Allocation",
    short: "Allocation",
    icon: Waves,
    description: "Greedy, knapsack and dynamic-programming demand allocation.",
    tag: "Module 2",
  },
  {
    path: "/recovery",
    label: "Failure & Recovery",
    short: "Recovery",
    icon: Activity,
    description: "Minimum spanning trees, failure simulation and repair search.",
    tag: "Module 3",
  },
  {
    path: "/conservation",
    label: "Conservation & Forecasting",
    short: "Conservation",
    icon: TrendingDown,
    description: "Demand trends, shortage projections and conservation scenarios.",
    tag: "SDG 12·13",
  },
  {
    path: "/lab",
    label: "Algorithm Laboratory",
    short: "Lab",
    icon: FlaskConical,
    description: "Step-by-step runs of every algorithm on reproducible fixtures.",
    tag: "DAA",
  },
];
