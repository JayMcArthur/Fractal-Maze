# Solver, PDA, And Port Graph Sprint

This sprint owns the underlying maze model only: solver behavior, PDA compilation, port normalization, repeated/tiled maze semantics, and save-file implications. It intentionally excludes UI, image rendering, and editor interaction except where those systems must provide source data to the logic layer.

## Sprint Goal

Build the logic foundation that can represent:

- normal recursive PDA-style mazes
- Wolfram #2-style ambiguous visible path labels
- Cantor/infinite proof steps
- Fractal Block Maze-style coordinate/depth search
- Koteitan Repeated Maze-style infinite tiled port graphs

The key architectural decision is that PDA is no longer the source model. The source model normalizes into ports/terminals first, then compiles into a strategy-specific runtime such as `pda_stack`, `tiled_port_graph`, `coordinate_path`, or `proof_rule`.

## Non-Goals

- no visual editor implementation
- no image-processing pipeline
- no full package schema beyond fields needed to preserve solver semantics
- no attempt to prove general repeated-maze reachability
- no replacement of all existing examples with package fixtures in this sprint

## Workstream Order

1. Promote Port Graph normalization before PDA conversion.
2. Add Repeated/Tiled Port Graph as a first-class maze family.
3. Deepen the Logic Core around execution strategies.
4. Deepen Solver as a strategy module with explicit result types.

This order matters. Port normalization defines the states that PDA compilation consumes. Repeated/tiled mazes then prove the core cannot be PDA-only. Strategy seams and solver result types come after those two concrete pressures are represented.

## Slice 1: Port Graph Normalization Before PDA Conversion

### Problem

Legacy PDA notation uses visible path labels as logical states and inputs. That fails when the same visible move has multiple meanings.

Wolfram #2 example:

```text
3-7 /B
3-7 A/
```

These are not the same transition:

- enter `B` from visible point `3`, arriving at `B.7`
- exit `A` from `A.3`, arriving at parent `7`

If the runtime only sees input `7` at `A.3`, it cannot deterministically know which terminal the player reached.

### Target Contract

Port Graph is the normalized source graph for recursive path-like mazes.

```yaml
ports:
  - id: "3@7:enter_b_from_3_to_7"
    address: "3"
    label: "7"
    kind: enter_terminal
  - id: "A.3@7:exit_a_from_3_to_7"
    address: "A.3"
    label: "7"
    kind: exit_terminal

transitions:
  - id: enter_b_from_3_to_7
    from_port: "3@7:enter_b_from_3_to_7"
    source: "3"
    target: "B.7"
    input: "7"
  - id: exit_a_from_3_to_7
    from_port: "A.3@7:exit_a_from_3_to_7"
    source: "A.3"
    target: "7"
    input: "7"
```

The PDA compiler receives port-aware transitions, not raw visible labels.

### Prototype State

Implemented:

- `src/fractal_maze_lab/port_graph.py`
- `PortGraph.normalize_connections(...)`
- `PortTransition.to_connection()`
- `PortGraph.validation_errors()`
- `PortGraph.compile_pda_stack()`
- test coverage in `PortGraphTests`

Current limitation:

- visual source provenance is not populated yet
- normalization currently derives port ids mechanically from connection ids
- save-file loader currently supports only authored `pda_stack` Port Graph packages

### Implementation Tasks

1. Add explicit `kind` and optional `provenance` fields to `Port`: done in the data model, not yet populated by hand-authored package provenance.
2. Add validation for duplicate port ids and dangling transition ports: started.
3. Add a normalized Wolfram #2 fixture as data, not only code.
4. Add a `compile_pda_stack()` named method or adapter so PDA compilation is explicit: done.
5. Update `graph_from_legacy_pda(...)` to optionally return both raw graph and normalized port graph for comparison.
6. Add the first authored Port Graph package fixture and replay it through the package loader: done for `Skeptic Play #1`.

### Acceptance Tests

- label-only input at an ambiguous state raises `ExecutionError`
- selected enter port produces `A.B.7`
- selected exit port produces `7`
- validator catches dangling `from_port`
- generated PDA state ids include port ids or stable port-derived names

### Done When

Port Graph is the default intermediate representation for legacy PDA conversion, and `AddressGraph` no longer needs to understand raw path-label ambiguity by itself.

## Slice 2: Repeated/Tiled Port Graph As A First-Class Maze Family

### Problem

Koteitan Repeated Maze is an infinite coordinate grid with repeated block port sets. It can encode register-machine behavior. Treating it as a PDA hides the actual state space and creates false expectations about decidability.

### Target Contract

Repeated/tiled source stores block-class port sets and terminal ids.

```yaml
strategy: tiled_port_graph
start:
  x: 0
  y: 0
  terminal: W0
goals:
  - x: 0
    y: 0
    terminal: W1
blocks:
  zero:
    ports: [W0-E0]
  nx:
    ports: [E0-E1]
  ny:
    ports: [N0-N1]
  normal:
    ports: [W0-N2]
```

Runtime state is:

```text
(x, y, terminal)
```

not:

```text
stack + PDA state
```

### Prototype State

Implemented:

- `src/fractal_maze_lab/tiled_port_graph.py`
- `Terminal`
- `TiledState`
- `TiledPortEdge`
- `TiledPortGraph`
- block classes: `normal`, `nx`, `ny`, `zero`
- boundary crossing from `W/E/N/S`
- BFS via shared solver
- repeated-maze section parser
- basic section text serializer
- directed and undirected edge behavior tests
- `C` terminal intra-block connectivity test

Current limitation:

- no canonical state compression
- `C` center terminals parse and connect through port edges, but have no extra compiler semantics yet
- serializer is good enough for small fixtures but not a full fidelity formatter

### Implementation Tasks

1. Add parser for repeated-maze strings such as: done.

   ```text
   normal: W0-N2; nx: E0-E1; ny: N0-N1; zero: W0-E0
   ```

2. Preserve authored terminal ids and add optional canonical ids for solver comparison.
3. Add hand-authored fixtures from `koteitan/repeated-maze`, starting with a tiny case before larger examples.
4. Add max-state and max-depth policy docs for unbounded repeated-grid searches.
5. Add directed edge tests for `A->B` versus `A-B`: done.

### Acceptance Tests

- tiny repeated/tiled fixture solves through `zero` and one boundary class
- directed edge does not permit reverse travel
- state cap returns `UNSOLVED_WITH_BOUND`
- parser round-trips a small repeated-maze string
- `C` terminals can connect inside a block without crossing boundaries

### Done When

Repeated/tiled mazes can be loaded from a small text fixture, solved with bounded BFS, and reported through `SolverResult` without PDA conversion.

## Slice 3: Logic Core Around Execution Strategies

### Problem

The project now has several real execution models:

- stack addresses for normal recursive mazes
- coordinate/depth paths for Fractal Block Maze
- tiled coordinate ports for Repeated Maze
- proof transitions for Cantor/infinite mazes

One `AddressGraph` cannot own all of that without becoming a catch-all.

### Target Contract

Each execution strategy owns:

- state type
- legal transition generation
- validation rules
- solver compatibility
- history/provenance details

Shared logic owns:

- stable result status
- transition identity
- replay/history shape
- package-level strategy declaration
- validation orchestration

Strategy declaration:

```yaml
logic:
  strategy: pda_stack
```

or:

```yaml
logic:
  strategy: tiled_port_graph
```

### Prototype State

Implemented:

- separate modules for `AddressGraph`, `FractalBlockMaze`, `TiledPortGraph`
- `ExecutionStrategyRegistry` as a small placeholder
- default built-in strategy registry
- proof transitions remain separate from physical transitions

Current limitation:

- no shared strategy protocol yet
- `FractalBlockMaze.solve(...)` still returns its own result class
- package-level strategy declaration is parsed for `pda_stack` Port Graph packages only
- validation is split across modules

### Implementation Tasks

1. Define a minimal execution strategy protocol.
2. Register built-in strategies:
   - `pda_stack`
   - `coordinate_path`
   - `tiled_port_graph`
   - `proof_rule`: done for registry support.
3. Add a package-level strategy declaration sketch to docs.
4. Adapt demos to print strategy and solver status.
5. Move cross-strategy validation messages into a consistent shape.

### Acceptance Tests

- unknown strategy id is rejected
- every built-in strategy is registered
- recursive examples still run through `pda_stack`
- tiled fixture runs through `tiled_port_graph`
- proof transitions remain `step_type: proof`, not physical moves

### Done When

New maze families can be added by implementing a strategy seam instead of modifying `AddressGraph` directly.

## Slice 4: Solver Strategy Module With Explicit Result Types

### Problem

Different families have different solver guarantees. A finite recursive example can be solved exactly under a bounded state space. A repeated/tiled example may only be searched under a state cap. Cantor examples may require proof rules. The solver API must not collapse all failures into `False`.

### Target Contract

All solver entry points return:

```yaml
status: solved | unsolved_with_bound | unknown_unbounded | proved
path: []
explored: 0
bound: null
explanation: null
```

Status meanings:

- `solved`: explicit path found
- `unsolved_with_bound`: bounded search did not find a solution, but this is not a global proof
- `unknown_unbounded`: no complete solver is available for the declared strategy/problem
- `proved`: proof rule or theorem produced a valid solution step/result

### Prototype State

Implemented:

- `src/fractal_maze_lab/solver.py`
- `SolveStatus`
- `SolverResult`
- `BreadthFirstSolver`
- `TiledPortGraph.solve_bfs(...)`
- `solve_address_graph_bfs(...)`
- `solve_fractal_block_bounded(...)`
- `solve_with_proof_rule(...)`

Current limitation:

- `AddressGraph.accepts(...)` still returns bool
- `FractalBlockMaze.solve(...)` still uses `FractalBlockSearchResult`; adapter wraps it
- proof-rule application still returns `StepRecord`; adapter wraps it
- no uniform CLI output yet

### Implementation Tasks

1. Add solver adapters:
   - `solve_address_graph_bfs`: done
   - `solve_fractal_block_bounded`: done
   - `solve_with_proof_rule`: done
2. Keep `accepts(...)` as a convenience wrapper, but do not use it as the main solver API.
3. Add `UNKNOWN_UNBOUNDED` tests for a strategy/problem with no complete solver.
4. Add consistent path/history output shape.
5. Update demos to report `status`, `explored`, and `bound`.

### Acceptance Tests

- exact successful search returns `SOLVED`
- capped search returns `UNSOLVED_WITH_BOUND`
- unsupported unbounded search returns `UNKNOWN_UNBOUNDED`
- proof-assisted result can return `PROVED`
- old boolean acceptance tests still pass as compatibility checks

### Done When

All solver-facing code can explain what kind of result it produced and what guarantee that result carries.

## Save-File Implications For Sprint 2

This sprint should leave enough structure for the next data-format sprint.

Required fields implied by this sprint:

```yaml
logic:
  strategy: pda_stack | coordinate_path | tiled_port_graph | proof_rule
  source_model: port_graph | legacy_pda | repeated_tile_ports | proof_rules
  ports: []
  transitions: []
  block_classes: {}
  proofs: []
  provenance:
    authoring_notes: null
    compiler: null
    source_files: []
```

Rules:

- save files preserve authored ports and terminal ids
- compiler/normalizer may add derived canonical ids
- raw PDA tables are generated artifacts, not primary authoring data
- repeated/tiled mazes store block-class port sets
- proof rules store claims and explanation traces separately from physical transitions

Started package shape:

```text
packages/source/<maze_id>/
  package.yml
  logic.yml
  solutions/
    known.yml
```

The first package uses `package.yml` as the manifest, `logic.yml` as the primary authored Port Graph, and `solutions/known.yml` as a logical-first replay. This keeps visual mapping and generated browser artifacts outside the logic source while leaving obvious package-adjacent homes for them later.

`packages/source/wolfram_2/` is the first ambiguity stress test. It now uses ordered `transition_groups` instead of only a flat transition list. Runtime transitions remain directed, but authoring can declare whether the visual/logical path is `one_way` or `two_way`.

For a two-way path, the group stores `forward` and `reverse` transitions explicitly:

```yaml
transition_groups:
  - id: g_p3_to_mB_p7
    direction: two_way
    forward:
      id: t_p3_to_mB_p7
      from_port: p3_to_mB_p7
      source: p3
      target: mB.p7
      input: "7"
    reverse:
      id: t_mB_p7_to_p3
      from_port: mB_p7_to_p3
      source: mB.p7
      target: p3
      input: "3"
```

For a one-way path, the same shape uses `direction: one_way` and only `forward`; the loader must not synthesize a reverse transition.

The fixture includes both 3-to-7 interpretations as authored ports:

- `p3_to_mB_p7`: entering `B` from visible point `3`, producing a deeper address such as `mA.mB.p7`
- `mA_p3_to_p7`: exiting `A` from `mA.p3`, producing parent point `p7`

The same visible input `"7"` at `mA.p3` is intentionally nondeterministic without a selected port. Solution records choose the port explicitly, so both the legacy long solution and the short repaired solution replay to `pA` without pretending that the two moves are the same logical transition.

## Risks And Decisions To Revisit

### Port Id Stability

Current derived ids include connection ids. That is acceptable for prototypes but package files need stable ids independent of list order.

Decision needed: use user-authored ids when available; otherwise derive from normalized source, target, input, effect, and disambiguator.

### Canonical State Compression

Repeated Maze solvers often canonicalize equivalent physical terminals. The package should preserve authored terminals while the solver may derive canonical states.

Decision needed: canonicalization belongs in a shared normalization module if it affects fixtures and comparisons; otherwise it can stay inside solver strategy code.

### PDA Compilation Scope

Not every strategy compiles to PDA. Repeated/tiled and Fractal Block Maze should not be forced through PDA.

Decision: only `pda_stack` consumes PDA compilation. Other strategies expose their own runtime state.

### Proof Step Semantics

Proof transitions should be available to solver/explanation mode, not normal physical play by default.

Decision needed: package-level setting for whether proof steps are allowed in a given mode.

## Sprint Exit Criteria

- Port Graph is the documented and tested intermediate before PDA conversion.
- Wolfram #2 ambiguity is represented by ports, not a one-off repaired transition.
- Repeated/tiled port graphs have a tested non-PDA execution path.
- Solver results distinguish exact success, bounded failure, unbounded unknown, and proof.
- Sprint 2 has clear save-file fields to encode these choices.
- `python3 -m unittest discover -s tests -v` passes.

## Current Prototype Checklist

- done: `PortGraph` prototype
- done: ambiguous port-selection test
- done: Port Graph validator
- done: explicit `compile_pda_stack()` boundary
- done: `TiledPortGraph` prototype
- done: tiny repeated/tiled BFS test
- done: repeated-maze section parser
- done: directed edge and `C` terminal tests
- done: shared `SolverResult` and `SolveStatus`
- done: default strategy registry tests
- done: solver adapters for `AddressGraph`, `FractalBlockMaze`, and proof rules
- done: sprint plan updated with selected order
- done: first hand-written `Skeptic Play #1` Source Package
- done: minimal package loader for `pda_stack` Port Graph logic
- done: logical Solution Record replay through the Logic Core
- done: normalized Wolfram #2 data fixture with port-selected long and repaired Solution Records
- done: package validation layer for manifest references, logic shape, transition groups, solution transition ids, and opt-in goal replay
- done: optional proof edges for proof-assisted PDA/Port Graph replay
- done: Solution Records can submit a proof edge before using it
- done: countable Infinite Hop and uncountable Cantor Hop package fixtures
- done: formal package schema files for manifest, logic, and solution records
- next: stable package-safe port-id derivation
- next: shared execution strategy protocol
- next: canonical state compression for repeated/tiled fixtures
