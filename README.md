# AquaMind — Multi-Algorithm Optimization of Sustainable Water Distribution Networks (Chennai)

AquaMind is an interactive decision-support prototype for Chennai's urban water
distribution network. It loads the real geo-referenced pipe network, treats it
as a weighted graph, and applies a battery of classic algorithms — shortest
path, all-pairs paths, minimum spanning trees, resource allocation, and
repair-selection search — with everything verifiable against reproducible
fixtures.

This is an **academic design-and-analysis project**, built as a submission for a
Design and Analysis of Algorithms (DAA) capstone.

## Modules

| Route | Module | What it does |
| --- | --- | --- |
| `/` | Overview | Network-wide metrics, dataset provenance, scenario status. |
| `/network` | Water Network | Interactive MapLibre map of 22,299 features, feature inspector, Dijkstra-based shortest-path routing. |
| `/allocation` | Resource Allocation | Greedy, 0/1 knapsack and dynamic-programming water allocation across demand zones. |
| `/recovery` | Failure & Recovery | Kruskal/Prim minimum spanning trees, edge-failure simulation, branch-and-bound repair selection. |
| `/conservation` | Conservation & Forecasting | Demand trend projection, shortage forecasting, conservation scenario modeling. |
| `/lab` | Algorithm Laboratory | Step-by-step runs of every algorithm on small hand-checkable fixtures, with time/space complexity badges, run traces and measured runtimes. |

## Algorithms

All algorithms live under `src/algorithms/` and are pure TypeScript (no UI
coupling), so they are unit-testable in isolation.

| Algorithm | Paradigm | Complexity | Where used |
| --- | --- | --- | --- |
| Dijkstra (binary-heap) | Greedy / BFS | `O(E log V)` | `src/algorithms/graph/dijkstra.ts` — routing and failure recovery |
| Floyd–Warshall | Dynamic programming | `O(V³)` time, `O(V²)` space | `src/algorithms/graph/floydWarshall.ts` — all-pairs reachability |
| Kruskal (union–find) | Greedy | `O(E log E)` | `src/algorithms/graph/mst.ts` — resilience spine |
| Prim | Greedy | `O(E log V)` | `src/algorithms/graph/mst.ts` — resilience spine |
| Greedy allocation | Greedy | `O(Z log Z)` | `src/algorithms/allocation/greedy.ts` |
| 0/1 Knapsack | Dynamic programming | `O(Z·W)` | `src/algorithms/allocation/knapsack.ts` |
| Top-down DP allocation | Memoized recursion | `O(Z·W)` | `src/algorithms/allocation/dp.ts` |
| Backtracking + branch-and-bound repair | Exhaustive search | `O(2^C )` worst case, pruned | `src/algorithms/backtracking/backtracking.ts` |
| Linear-trend + exponential-growth forecast | Regression | `O(h)` | `src/algorithms/forecasting/forecasting.ts` |

## Data pipeline

`data/*.kml` are the supplied source KML layers (Chennai Metro Water supply
infrastructure). `npm run convert` runs `scripts/convert-kml.ts`, which uses
`@tmcw/togeojson` to produce per-layer GeoJSON files plus a provenance manifest
in `public/data/`.

Generated layers: transmission mains (5,700), interconnection pipes (12,465),
distribution chambers (3,382), overhead tanks (278), underground tanks (148),
flow meters (326) — **22,299 features total**.

### Connectivity rules (important for correctness)

- Features that carry recorded `from`/`to` identifier attributes are treated as
  **confirmed** graph connections.
- Features with no such attributes are joined to nearby nodes within a 5 m
  snap tolerance (`DEFAULT_SNAP_TOLERANCE_M`) as **inferred** connections.
- Visual intersections are **not** treated as junctions unless supported by the
  above; no hydraulic data is fabricated.

### Data provenance caveats

- Geometry and attributes are reproduced verbatim from the source KML; no
  values are invented.
- Presence of a feature does not confirm it is currently operational,
  surveyed recently, or hydraulically valid.
- All demand, supply, priority and forecast figures shown in Allocation,
  Recovery, Conservation and the Lab are clearly labeled **"Simulated"** inputs
  for algorithm demonstration.
- Basemap: CARTO "Dark Matter" raster tiles built on OpenStreetMap data
  (attribution enforced in the map style; `src/components/map/mapConfig.ts`).

## Getting started

```bash
npm install
npm run dev        # start the Vite dev server
npm run convert    # (re)generate GeoJSON + manifest from data/*.kml
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc -b`) + production build |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint (flat config, typescript-eslint) |
| `npm run test` | Vitest unit tests (jsdom) |
| `npm run test:watch` | Vitest watch mode |
| `npm run convert` | KML → GeoJSON pipeline |

## Testing

Tests live in `tests/` and cover every algorithm (`tests/algorithms/`,
`tests/graph/`), the KML converter, the KML→graph builder, and the data loader.
Fixture-edge weights and expected results were derived by hand so the tests
read as auditable examples (shortest A→F = 13 via A→C→B→D→E→F; MST = 13; etc.).

## Project structure

```
src/
  algorithms/        Pure algorithm implementations (graph, allocation, backtracking, forecasting)
  app/               Routing, navigation, app-level state store, reusable fixtures
  components/        UI primitives, layout, charts, map
  hooks/             Data-loading hooks
  modules/           Feature pages (overview, network, allocation, recovery, conservation, lab)
  services/          Data load + graph-builder services
  types/             Shared domain types
scripts/convert-kml.ts
tests/               Vitest suites
data/                Source KML (read-only)
public/data/         Generated GeoJSON + manifest
```

## Limitations

- The graph builder is approximate by design: connectivity is derived from
  recorded IDs plus a 5 m snap tolerance, so paths are route *estimates*.
- Floyd–Warshall is guarded by a node-count cap to avoid impractical `V³` work
  on the raw 22k-feature dataset; the lab runs it on the small sample graph.
- The product is an academic **decision-support prototype**, not operational
  SCADA software — outputs should inform, not command, real investment decisions.