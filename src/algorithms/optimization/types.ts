/**
 * Shared types + objective function for the water allocation laboratory.
 *
 * Units: the interface is unit-agnostic. The UI uses million litres per day
 * (MLD). All algorithms consume the same zone descriptors so results are
 * comparable.
 */

export type ZoneType =
  | "residential"
  | "commercial"
  | "industrial"
  | "agricultural"
  | "essential";

export interface DemandZone {
  id: string;
  name: string;
  type: ZoneType;
  /** Demand in MLD (or the scenario's chosen unit). */
  demand: number;
  /** 1 = highest priority. Lower is more important. */
  priority: number;
  /** Optional hard cap on allocation (MLD). Defaults to demand. */
  allocationLimit?: number;
  /** True when the zone is illustrative (no real demand data available). */
  simulated: boolean;
}

export interface AllocationInput {
  zones: DemandZone[];
  /** Total water available to distribute in the same unit as demand. */
  supply: number;
}

export interface ZoneAllocation {
  zoneId: string;
  allocated: number;
  demand: number;
  limit: number;
  unmet: number;
  /** allocated / demand, clamped to [0,1]; 0 when demand is 0. */
  satisfaction: number;
}

export interface AllocationResult {
  algorithm: "greedy" | "knapsack" | "dp";
  allocations: ZoneAllocation[];
  totalDemand: number;
  totalAllocated: number;
  totalUnmet: number;
  /** totalAllocated / totalDemand (0 when demand is 0). */
  satisfaction: number;
  /** Value of the shared concave utility objective. */
  objectiveValue: number;
  executionMs: number;
  stateCount?: number;
  notes?: string;
  /** The algorithm's own objective, which may differ from the shared utility. */
  algorithmObjective?: { label: string; value: number };
}

const DECAY_EXPONENT = 0.85;

/** Priority 1 is worth the most; strictly positive weight. */
export function priorityWeight(priority: number): number {
  const p = Math.max(1, priority);
  return 1 / Math.pow(p, 0.6);
}

/**
 * Concave utility of delivering `units` to a zone. Concavity models the fact
 * that the first units of water (basic need) are more valuable than later
 * units — this is what makes the DP allocation spread water rather than dump
 * it all into the highest-priority zone.
 */
export function zoneUtility(units: number, priority: number): number {
  if (units <= 0) return 0;
  return priorityWeight(priority) * Math.pow(units, DECAY_EXPONENT);
}

export function effectiveLimit(zone: DemandZone): number {
  const limit = zone.allocationLimit ?? zone.demand;
  return Math.max(0, Math.min(limit, zone.demand));
}

export function buildZoneAllocation(
  zone: DemandZone,
  allocated: number,
): ZoneAllocation {
  const limit = effectiveLimit(zone);
  const demand = Math.max(0, zone.demand);
  const clamped = Math.max(0, Math.min(allocated, limit));
  return {
    zoneId: zone.id,
    allocated: clamped,
    demand,
    limit,
    unmet: Math.max(0, demand - clamped),
    satisfaction: demand > 0 ? clamped / demand : 0,
  };
}

export function summarize(
  algorithm: AllocationResult["algorithm"],
  zones: DemandZone[],
  allocations: ZoneAllocation[],
  executionMs: number,
  extras: Partial<AllocationResult> = {},
): AllocationResult {
  const totalDemand = allocations.reduce((s, a) => s + a.demand, 0);
  const totalAllocated = allocations.reduce((s, a) => s + a.allocated, 0);
  const objectiveValue = zones.reduce((s, z) => {
    const a = allocations.find((x) => x.zoneId === z.id);
    return s + zoneUtility(a?.allocated ?? 0, z.priority);
  }, 0);
  return {
    algorithm,
    allocations,
    totalDemand,
    totalAllocated,
    totalUnmet: Math.max(0, totalDemand - totalAllocated),
    satisfaction: totalDemand > 0 ? totalAllocated / totalDemand : 0,
    objectiveValue,
    executionMs,
    ...extras,
  };
}
