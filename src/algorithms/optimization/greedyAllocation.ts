/**
 * Greedy water allocation.
 *
 * RULE (documented + deterministic):
 *   1. Order zones by priority (1 = highest). Ties are broken by the largest
 *      remaining demand, then by zone id for determinism.
 *   2. Give each zone as much as it can take (min of demand and its allocation
 *      limit) until the remaining supply is exhausted.
 *   3. Residual supply that exceeds a zone's limit spills to the next zone.
 *
 * This is a fast, explainable baseline. It respects priority but does NOT
 * optimise the concave utility objective — that is the DP formulation's job.
 */
import {
  buildZoneAllocation,
  effectiveLimit,
  summarize,
  type AllocationInput,
  type AllocationResult,
  type ZoneAllocation,
} from "./types";

export function greedyAllocation(input: AllocationInput): AllocationResult {
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  const supply = Math.max(0, input.supply);
  const ordered = input.zones.slice().sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (b.demand !== a.demand) return b.demand - a.demand;
    return a.id.localeCompare(b.id);
  });

  let remaining = supply;
  const byId = new Map<string, ZoneAllocation>();
  for (const zone of ordered) {
    const limit = effectiveLimit(zone);
    const take = Math.min(limit, remaining);
    remaining -= take;
    byId.set(zone.id, buildZoneAllocation(zone, take));
  }

  const allocations = input.zones.map((z) => byId.get(z.id)!);
  const ended =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  return summarize("greedy", input.zones, allocations, ended - started, {
    notes:
      "Priority-ordered fill up to each zone's limit. Deterministic, does not optimise the concave utility objective.",
  });
}
