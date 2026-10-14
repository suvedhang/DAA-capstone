/**
 * Illustrative fixtures for the algorithm modules.
 *
 * IMPORTANT: none of the values below are official Chennai data. They are
 * clearly-labelled *simulated* inputs used to exercise the algorithms because
 * the supplied dataset contains infrastructure geometry, not demand, supply,
 * consumption history, or hydraulic parameters.
 */
import type { DemandZone } from "@/algorithms/optimization/types";
import type { AlgorithmEdge } from "@/algorithms/graph/graph";
import type { RepairCandidate } from "@/algorithms/backtracking/backtracking";

/** Simulated demand zones (MLD). Units are illustrative. */
export const DEMAND_ZONES: DemandZone[] = [
  { id: "z-north-res", name: "North Chennai Residential", type: "residential", demand: 210, priority: 1, simulated: true },
  { id: "z-central-res", name: "Central Chennai Residential", type: "residential", demand: 265, priority: 1, simulated: true },
  { id: "z-hospital", name: "Essential Services (Hospitals)", type: "essential", demand: 60, priority: 1, simulated: true },
  { id: "z-south-res", name: "South Chennai Residential", type: "residential", demand: 230, priority: 2, simulated: true },
  { id: "z-commercial", name: "Commercial Corridors", type: "commercial", demand: 150, priority: 3, simulated: true },
  { id: "z-industrial", name: "Industrial Estate", type: "industrial", demand: 180, priority: 4, simulated: true },
  { id: "z-agri", name: "Peri-urban Agriculture", type: "agricultural", demand: 160, priority: 5, simulated: true },
];

export const DEFAULT_SUPPLY_MLD = 900;

/** Simulated monthly demand history (MLD) — a gently rising trend + seasonality. */
export const CONSERVATION_SERIES: { month: string; demand: number }[] = [
  { month: "2021-01", demand: 792 },
  { month: "2021-02", demand: 806 },
  { month: "2021-03", demand: 834 },
  { month: "2021-04", demand: 858 },
  { month: "2021-05", demand: 871 },
  { month: "2021-06", demand: 849 },
  { month: "2021-07", demand: 828 },
  { month: "2021-08", demand: 826 },
  { month: "2021-09", demand: 833 },
  { month: "2021-10", demand: 841 },
  { month: "2021-11", demand: 826 },
  { month: "2021-12", demand: 815 },
  { month: "2022-01", demand: 819 },
  { month: "2022-02", demand: 833 },
  { month: "2022-03", demand: 862 },
  { month: "2022-04", demand: 887 },
  { month: "2022-05", demand: 901 },
  { month: "2022-06", demand: 877 },
  { month: "2022-07", demand: 856 },
  { month: "2022-08", demand: 854 },
  { month: "2022-09", demand: 861 },
  { month: "2022-10", demand: 869 },
  { month: "2022-11", demand: 854 },
  { month: "2022-12", demand: 842 },
  { month: "2023-01", demand: 848 },
  { month: "2023-02", demand: 862 },
  { month: "2023-03", demand: 892 },
  { month: "2023-04", demand: 918 },
  { month: "2023-05", demand: 932 },
  { month: "2023-06", demand: 907 },
  { month: "2023-07", demand: 885 },
  { month: "2023-08", demand: 883 },
  { month: "2023-09", demand: 891 },
  { month: "2023-10", demand: 899 },
  { month: "2023-11", demand: 883 },
  { month: "2023-12", demand: 871 },
];

export interface ConservationIntervention {
  id: string;
  name: string;
  /** Fractional reduction of demand if fully adopted (0..1). */
  savingRate: number;
  /** Relative implementation cost score (arbitrary units). */
  cost: number;
  description: string;
}

export const CONSERVATION_INTERVENTIONS: ConservationIntervention[] = [
  { id: "leak", name: "Distribution leak repair", savingRate: 0.12, cost: 3, description: "Reduce non-revenue water lost through leaking mains and joints." },
  { id: "meter", name: "Universal metering + billing", savingRate: 0.08, cost: 4, description: "Consumption feedback and volumetric tariffs reduce demand." },
  { id: "rain", name: "Rainwater harvesting mandates", savingRate: 0.06, cost: 2, description: "On-site capture offsets municipal supply demand." },
  { id: "reuse", name: "Greywater reuse (large sites)", savingRate: 0.05, cost: 3, description: "Reuse of treated greywater for flushing and landscaping." },
  { id: "fixtures", name: "Low-flow fixture retrofit", savingRate: 0.04, cost: 1, description: "Efficient taps, showers and dual-flush toilets." },
  { id: "recycle", name: "Industrial water recycling", savingRate: 0.07, cost: 5, description: "Closed-loop cooling and process-water recycling in industry." },
];

/**
 * Small undirected weighted fixture used by Floyd–Warshall / MST demos in the
 * lab, where a tiny graph with a hand-checkable answer is more instructive than
 * the full network.
 */
export const SAMPLE_GRAPH_EDGES: AlgorithmEdge[] = [
  { id: "ab", from: "A", to: "B", weight: 4 },
  { id: "ac", from: "A", to: "C", weight: 2 },
  { id: "bc", from: "B", to: "C", weight: 1 },
  { id: "bd", from: "B", to: "D", weight: 5 },
  { id: "cd", from: "C", to: "D", weight: 8 },
  { id: "ce", from: "C", to: "E", weight: 10 },
  { id: "de", from: "D", to: "E", weight: 2 },
  { id: "df", from: "D", to: "F", weight: 6 },
  { id: "ef", from: "E", to: "F", weight: 3 },
];

/** Simulated repair candidates for the backtracking demo (Module 3). */
export const REPAIR_CANDIDATES: RepairCandidate[] = [
  { id: "R1", cost: 4, restores: ["N1", "N2", "N3"] },
  { id: "R2", cost: 6, restores: ["N3", "N4"] },
  { id: "R3", cost: 3, restores: ["N5", "N6"] },
  { id: "R4", cost: 5, restores: ["N1", "N4", "N5"] },
  { id: "R5", cost: 7, restores: ["N2", "N6", "N7"] },
  { id: "R6", cost: 2, restores: ["N7"] },
];
