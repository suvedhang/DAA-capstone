/**
 * Dynamic-programming water allocation (bounded, integer budget).
 *
 * FORMULATION (documented):
 *   - Discretise supply into integer cells of `quantum` MLD each.
 *   - Zone z may receive k ∈ [0, demandUnits_z] integer cells (bounded).
 *   - Utility of k cells to zone z is the SHARED concave function
 *       U(z, k) = priorityWeight(z) * (k * quantum)^0.85
 *     so the first units delivered are worth more than later units.
 *
 *   State:      dp[z][w] = max utility using the first z zones with a budget
 *               of exactly w cells consumed.
 *   Transition: dp[z][w] = max over k ∈ [0, min(demandUnits_z, w)] of
 *               dp[z-1][w-k] + U(z, k).
 *   Init:       dp[0][w] = 0 for all w.
 *   Reconstruct: remember the k that achieved dp[z][w].
 *
 * Complexity: O(Z * W * K) time, O(Z * W) space, where W = supply/quantum and
 * K = max demand / quantum. A safety cap prevents browser lock-ups.
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

export interface DpOptions {
  quantum?: number;
  maxStateCells?: number;
}

export function dpAllocation(
  input: AllocationInput,
  options: DpOptions = {},
): AllocationResult {
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  const quantum = options.quantum && options.quantum > 0 ? options.quantum : 0.5;
  const maxStateCells = options.maxStateCells ?? 3_000_000;
  const zones = input.zones;
  const supply = Math.max(0, input.supply);

  const W = Math.floor(supply / quantum);
  const stateCells = (zones.length + 1) * (W + 1);

  if (stateCells > maxStateCells) {
    const ended =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    return summarize(
      "dp",
      zones,
      zones.map((z) => buildZoneAllocation(z, 0)),
      ended - started,
      {
        stateCount: stateCells,
        notes: `Skipped: state space (Z+1)×(W+1) = ${zones.length + 1}×${W + 1} exceeds the safety limit. Increase the quantum or reduce supply.`,
      },
    );
  }

  const demandUnits = zones.map((z) => Math.max(0, Math.floor(effectiveLimit(z) / quantum)));
  const weights = zones.map((z) => priorityWeight(z.priority));

  // dp rows: (Z+1) x (W+1)
  const dp: Float64Array[] = Array.from({ length: zones.length + 1 }, () =>
    new Float64Array(W + 1),
  );
  // choice[z][w] = number of units given to zone z (1-indexed) at budget w.
  const choice: Int32Array[] = Array.from({ length: zones.length + 1 }, () =>
    new Int32Array(W + 1),
  );

  for (let z = 1; z <= zones.length; z++) {
    const maxK = demandUnits[z - 1];
    const weight = weights[z - 1];
    const prev = dp[z - 1];
    const curr = dp[z];
    const choiceRow = choice[z];

    for (let w = 0; w <= W; w++) {
      let best = prev[w]; // k = 0
      let bestK = 0;
      const kLimit = Math.min(maxK, w);
      for (let k = 1; k <= kLimit; k++) {
        const unitsHere = k * quantum;
        const value = prev[w - k] + weight * Math.pow(unitsHere, 0.85);
        if (value > best + 1e-12) {
          best = value;
          bestK = k;
        }
      }
      curr[w] = best;
      choiceRow[w] = bestK;
    }
  }

  // Reconstruct
  const units = new Array<number>(zones.length).fill(0);
  let w = W;
  for (let z = zones.length; z >= 1; z--) {
    const k = choice[z][w];
    units[z - 1] = k;
    w -= k;
  }

  const allocations: ZoneAllocation[] = zones.map((zone, i) =>
    buildZoneAllocation(zone, units[i] * quantum),
  );

  const ended =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  return summarize("dp", zones, allocations, ended - started, {
    stateCount: stateCells,
    notes: `Bounded integer allocation at ${quantum} MLD resolution maximising the concave utility objective.`,
  });
}
