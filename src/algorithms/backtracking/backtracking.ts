/**
 * Backtracking with branch-and-bound for constrained repair selection.
 *
 * Problem (documented): given a set of candidate repairs, each with a cost and
 * a set of network nodes it would restore, choose a subset whose total cost is
 * within a repair budget that maximises the number of restored nodes.
 *
 *   - Decision: for each candidate, include or exclude (binary branch).
 *   - Constraint: Σ cost <= budget.
 *   - Objective: maximise |union of restored nodes|.
 *   - Pruning: (a) drop branches over budget; (b) best-first bound — if the
 *     current coverage plus every remaining candidate's distinct nodes cannot
 *     beat the incumbent, prune the whole subtree.
 *
 * Worst-case time: O(2^N) — exponential. Branch-and-bound makes practical
 * instances tractable. `exploredStates` and `prunedStates` are reported so the
 * cost of the search is visible. `optimal` is false when the state budget was
 * hit before the search finished.
 */
export interface RepairCandidate {
  id: string;
  cost: number;
  restores: string[];
}

export interface BacktrackingInput {
  candidates: RepairCandidate[];
  budget: number;
  /** Hard cap on explored states to keep the UI responsive. */
  maxStates?: number;
  /** Optional known lower bound (coverage of an incumbent) to seed pruning. */
}

export interface BacktrackingResult {
  selected: string[];
  coveredNodes: string[];
  totalCost: number;
  exploredStates: number;
  prunedStates: number;
  executionMs: number;
  optimal: boolean;
  reason?: string;
}

export function selectRepairs(input: BacktrackingInput): BacktrackingResult {
  const started =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const maxStates = input.maxStates ?? 200_000;
  const budget = Math.max(0, input.budget);
  const candidates = input.candidates.slice().sort((a, b) => b.restores.length - a.restores.length);

  let bestCovered: string[] = [];
  let bestSelection: string[] = [];
  let bestCost = 0;
  let explored = 0;
  let pruned = 0;
  let aborted = false;

  // Suffix union sizes for optimistic bound (not exact — upper bound).
  const suffixUnion: number[] = new Array(candidates.length + 1).fill(0);
  {
    const seen = new Set<string>();
    for (let i = candidates.length - 1; i >= 0; i--) {
      for (const n of candidates[i].restores) seen.add(n);
      suffixUnion[i] = seen.size;
    }
  }

  const covered = new Set<string>();
  const selection: string[] = [];

  const recurse = (index: number, cost: number): void => {
    if (aborted) return;
    explored++;
    if (explored > maxStates) {
      aborted = true;
      return;
    }

    if (covered.size > bestCovered.length) {
      bestCovered = Array.from(covered);
      bestSelection = selection.slice();
      bestCost = cost;
    }

    if (index >= candidates.length) return;

    // Optimistic bound: cannot exceed covered + all distinct nodes available
    // from the current candidate onwards (suffixUnion[index] deliberately
    // includes candidate `index`, whose include/exclude decision is still open
    // when this check runs).
    const optimistic = covered.size + suffixUnion[index];
    if (optimistic <= bestCovered.length) {
      pruned++;
      return;
    }

    const cand = candidates[index];
    if (cost + cand.cost <= budget) {
      const newlyAdded: string[] = [];
      for (const n of cand.restores) {
        if (!covered.has(n)) {
          covered.add(n);
          newlyAdded.push(n);
        }
      }
      selection.push(cand.id);
      recurse(index + 1, cost + cand.cost);
      selection.pop();
      for (const n of newlyAdded) covered.delete(n);
    } else {
      pruned++;
    }

    recurse(index + 1, cost);
  };

  recurse(0, 0);

  const ended =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    selected: bestSelection,
    coveredNodes: bestCovered,
    totalCost: bestCost,
    exploredStates: explored,
    prunedStates: pruned,
    executionMs: ended - started,
    optimal: !aborted,
    reason: aborted
      ? `Search stopped after ${maxStates.toLocaleString()} explored states; result is a strong incumbent, not proven optimal.`
      : undefined,
  };
}
