/**
 * 0/1 Knapsack water allocation.
 *
 * FORMULATION (documented):
 *   - Each zone is either FULLY served (weight = its effective limit in MLD)
 *     or not served at all: x_z ∈ {0, 1}.
 *   - Value of serving zone z = priorityWeight(z) * limit(z).
 *   - Capacity = total available supply.
 *   - Maximise Σ value_z * x_z subject to Σ limit_z * x_z <= supply.
 *
 * This models "which zones can we completely cover with the water we have" and
 * is solved with the classic O(Z * W) dynamic program over MLD rounded to a
 * fixed quantum so the capacity dimension is a finite integer.
 *
 * It is NOT the same objective as the concave marginal-utility DP allocation:
 * 0/1 knapsack never partially serves a zone.
 */
import {
  buildZoneAllocation,
  effectiveLimit,
  priorityWeight,
  summarize,
  type AllocationInput,
  type AllocationResult,
  type ZoneAllocation,
} from "./types";

export interface KnapsackOptions {
  /** MLD per integer capacity cell. Smaller = more accurate, slower. */
  quantum?: number;
  /** Safety cap on the DP table size (Z * capacity). */
  maxCapacityCells?: number;
}

export function knapsackAllocation(
  input: AllocationInput,
  options: KnapsackOptions = {},
): AllocationResult {
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  const quantum = options.quantum && options.quantum > 0 ? options.quantum : 0.5;
  const maxCapacityCells = options.maxCapacityCells ?? 4_000_000;
  const supply = Math.max(0, input.supply);
  const zones = input.zones;

  const capacity = Math.floor(supply / quantum);
  if (zones.length * (capacity + 1) > maxCapacityCells) {
    const ended =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    return summarize("knapsack", zones, zones.map((z) => buildZoneAllocation(z, 0)), ended - started, {
      notes: `Skipped: DP table Z×W = ${zones.length}×${capacity + 1} exceeds the safety limit. Increase the quantum or reduce supply.`,
    });
  }

  const weights = zones.map((z) => Math.max(0, Math.round(effectiveLimit(z) / quantum)));
  const values = zones.map((z) => priorityWeight(z.priority) * effectiveLimit(z));

  // dp[w] = best value achievable with capacity w.
  const dp = new Float64Array(capacity + 1);
  const take: boolean[][] = zones.map(() => new Array<boolean>(capacity + 1).fill(false));

  for (let z = 0; z < zones.length; z++) {
    const w = weights[z];
    const v = values[z];
    if (w <= 0) continue;
    // iterate capacity downward for 0/1 semantics
    for (let c = capacity; c >= w; c--) {
      const candidate = dp[c - w] + v;
      if (candidate > dp[c] + 1e-9) {
        dp[c] = candidate;
        take[z][c] = true;
      }
    }
  }

  // Reconstruct chosen set.
  const chosen = new Array<boolean>(zones.length).fill(false);
  let c = capacity;
  for (let z = zones.length - 1; z >= 0; z--) {
    if (take[z][c]) {
      chosen[z] = true;
      c -= weights[z];
    }
  }

  const allocations: ZoneAllocation[] = zones.map((z, i) =>
    buildZoneAllocation(z, chosen[i] ? effectiveLimit(z) : 0),
  );

  const ended =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const knapsackValue = dp[capacity];

  return summarize("knapsack", zones, allocations, ended - started, {
    stateCount: zones.length * (capacity + 1),
    notes: `0/1 knapsack at ${quantum} MLD resolution. Full zones only; does not partially serve a zone.`,
    algorithmObjective: { label: "Knapsack value", value: knapsackValue },
  });
}
