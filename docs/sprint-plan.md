# Sprint Plan

This plan is foundation-first. Fractal Maze Lab may eventually ship as a static browser workbench or hosted web app, but the current risk is not hosting. The current risk is whether the maze semantics, package format, validation, solving, and proof model are solid enough for any user interface to trust.

## Roadmap Shape

```text
Maze Foundation
  A. Maze Semantics
  B. Maze Package
  C. Foundation CLI / Test Harness

Web Workbench
  D. Static Browser Reader
  E. Editor Surface
  F. Handcrafted Package Archive
```

Python remains the trusted foundation implementation for now. Browser delivery should consume foundation outputs instead of driving the architecture prematurely.

## Foundation Sprint A: Maze Semantics

Goal: define and test the executable maze model across recursive, port-ambiguous, infinite/Cantor, Fractal Block Maze, and repeated/tiled maze families.

Status: in progress. The first executable prototype exists in `src/fractal_maze_lab/`, with tests in `tests/test_logic_core.py` and demo runners in `tools/`.

Deliverables:

- `docs/maze-logic-taxonomy.md`
- `docs/logic-core.md`
- `docs/pda-conversion.md`
- `docs/infinite-and-cantor.md`
- `docs/fractal-block-maze.md`
- `docs/port-transition-model.md`
- `docs/prior-art-analysis.md`
- `docs/solver-pda-port-slices.md`
- executable address-graph/PDA prototype
- Port Graph normalization prototype
- repeated/tiled port graph prototype
- shared solver result prototype
- proof-rule and Cantor proof path examples
- Fractal Block Maze coordinate/depth solver spike
- hand-authored package fixtures for every maze in the curated list

Exit criteria:

- known PDA examples are accepted by tests
- Wolfram #2 ambiguity is represented by ports, not only by a one-off repair
- proof transitions have runtime/history shape
- simplified Cantor proof path validates physical and assumption steps
- Fractal Block Maze requirements are represented by coordinate/depth search
- hand-authored recursive maze packages are tested for Port Graph/PDA normalization before a separate grid runtime is introduced
- repeated/tiled maze logic has a first-class non-PDA path
- solver results distinguish solved, bounded failure, unbounded unknown, and proof
- all prototype commands pass

Prototype commands:

```sh
python3 -m unittest discover -s tests -v
python3 tools/logic_core_demo.py
python3 tools/logic_core_demo.py --example skeptic_play_1 --trace
python3 tools/fractal_block_demo.py --depth 5
```

## Foundation Sprint B: Maze Package

Goal: turn the semantic decisions into stable package files that can be validated, solved, replayed, and later consumed by a browser workbench.

Status: started. The first hand-written Source Package exists at `packages/source/skeptic_play_1/`, and the Python loader can resolve its manifest, load Port Graph logic, compile `pda_stack`, and replay the known logical Solution Record. `packages/source/wolfram_2/` now stress-tests the same shape with an ambiguous port graph and two port-selected Solution Records. `packages/source/infinite_hop_1/` and `packages/source/cantor_proof_1/` prove that a Port Graph package can carry rule-shaped optional proof edges for countable Infinite Hop and uncountable Cantor Hop crossings. `packages/source/koteitan_fractal_block_default/` proves that Koteitan's default Fractal Block Maze pattern can be a `coordinate_path` Source Package and solve through the same package loader. Package validation is now a named layer in `src/fractal_maze_lab/package_validation.py`, with a CLI entry point at `tools/validate_package.py`.

Format decision:

- Source Packages are authored as YAML package manifests.
- Source Packages reference package-adjacent logic, visual mapping, solution record, generated artifact, and provenance files instead of inlining those layers by default.
- Package manifests record independent format versions for each referenced file type.
- Package manifests or referenced subfiles may point to important committed generated artifacts; disposable build outputs can be produced by convention.
- Package manifests and referenced subfiles may each carry scoped provenance for the thing they describe.
- Browser Packages are generated as JSON.
- Python owns validation, normalization, and export from YAML to JSON.
- Commit demo-critical Browser Package JSON fixtures for static loading and regression tests.
- Generate the full Browser Package set on demand to avoid noisy generated-file churn.
- Start with a package envelope plus strategy-specific logic sections.
- Stress-test package fixtures after initial schemas exist to see whether recursive, proof, Fractal Block, and repeated/tiled mazes can converge on a smaller shared port/transition format.
- Visual mappings are package-adjacent files referenced by Source Packages, not inline graphics data.

Deliverables:

- one hand-written baseline package fixture before loader implementation: done for `Skeptic Play #1`
- minimal loader/validator skeleton after the baseline fixture: done for `pda_stack` Port Graph packages
- remaining hand-authored package fixtures added as schema stress tests after the loader skeleton
- package schema: done in `schemas/package.schema.json`
- Package Manifest schema: done in `schemas/package.schema.json`
- Source Package YAML schema: done through JSON Schema applied to parsed YAML
- Browser Package JSON export shape
- schema convergence stress-test notes across the first package fixtures
- logic schema: done in `schemas/logic.schema.json`
- referenced Visual Mapping schema
- solution/history schema: done in `schemas/solution.schema.json`
- proof/explanation schema
- one packaged `Skeptic Play #1`
- one packaged `Skeptic Play #1` known Solution Record
- one packaged Wolfram #2 port-graph fixture: done
- one packaged Cantor/infinite proof fixture: done for `infinite_hop_1` and `cantor_proof_1`
- one packaged Fractal Block Maze fixture: done for Koteitan default pattern
- one packaged grid-authored recursive fixture, hand-authored from the source maze
- one tiny repeated/tiled port-graph fixture
- one real Koteitan repeated-maze fixture after the tiny fixture works
- validators for required fields, broken references, unknown strategies, invalid ports, solution transition references, and opt-in known-good goal replay: started
- convergence stress-test across:
  - normal recursive/PDA
  - ambiguous port recursive
  - Cantor/infinite proof
  - Fractal Block Maze
  - hand-authored package for a grid-authored recursive maze
  - repeated/tiled port graph

Exit criteria:

- first package file shape is proven by a hand-written `Skeptic Play #1` fixture before loader code hardens it: done
- baseline recursive fixture uses Port Graph, not raw Address Graph: done
- package fixtures prefer stable readable ids over mechanically long ids where ambiguity does not require extra detail
- Point IDs are canonical in logic; visual labels are display-only
- Wolfram #2 stress-tests ambiguous recursive ports after the baseline: done
- repeated/tiled, Cantor, and Fractal Block fixtures stress-test the loader shape after recursive packages: started for Cantor, Infinite Hop, and Koteitan Fractal Block Maze
- package can load without images: done for baseline
- package manifest can load and resolve referenced logic without visual files: done for baseline
- package declares its strategy and source model: done for baseline
- Source Package declares one Primary Authoring Representation: done for baseline
- Source Package may preserve additional authored representations for provenance and migration
- package preserves authored ports/terminals separately from generated runtime ids
- package transition authoring distinguishes `one_way` and `two_way`; reverse moves are explicit, never assumed
- package proof edges are optional proof-assisted transitions; physical mode does not enable them, and proof-assisted solutions submit the proof before using the edge
- Infinite Hop proof validation checks convergence obligations; Cantor Hop proof validation checks presupposition-backed chains
- package and subfile provenance can distinguish archive source, logic conversion, visual tracing, and solution origin
- generated normalized/runtime/browser artifacts live beside Source Packages, not inside them by default
- solutions, replays, and proof paths are package-adjacent Solution Record files referenced by the Source Package: started with `solutions/known.yml`, `solutions/current_long.yml`, and `solutions/short_repaired.yml`
- Solution Records are logical-first, with optional Visual Checkpoints for playback and explanation: started without visual checkpoints
- Solution Record schema supports optional Visual Checkpoints immediately, but baseline fixtures may omit them until Visual Mapping files exist
- graphics and visual geometry are package-adjacent Visual Mapping files
- solution can replay through the Logic Core: done for baseline and Wolfram #2 port-selected replays
- validation reports useful errors: started for schema shape, manifest/logic references, unknown formats, unknown strategies, invalid ports, malformed transition groups, solution transition references, and `expects_goal` replay failures
- package fixtures are used by tests instead of only Python constructors: started
- schema convergence review answers whether the families can share a smaller port/transition schema without losing clarity or validation power

Current package-loader boundary:

- Supported now: `fmaze-package-v0` manifests, `fmaze-logic-v0` logic files, `source_model: port_graph`, `strategy: pda_stack`, flat directed transitions, grouped `one_way`/`two_way` transitions, optional proof edges with proof bodies, `source_model: fractal_block_pattern`, `strategy: coordinate_path`, bounded Koteitan Fractal Block solving, `fmaze-solution-v0` logical/proof-assisted replay for PDA packages, `fmaze-visual-v0` Visual Mapping files, full Skeptic Play #1 Authored Vector View coverage, visual replay tracing through Visual Routes, formal schemas for manifests/logic/solutions/visual mappings, and CLI package validation.
- Not supported yet: Browser Package JSON export, Wolfram #2 visual ambiguity fixture, richer proof obligation generation, generalized coordinate/depth Fractal Block variants beyond the Koteitan default-pattern fixture, and the full hand-authored package set.

## Foundation Sprint C: Foundation CLI / Test Harness

Goal: make the Maze Foundation usable without a UI: load, validate, solve, replay, and explain package files from the command line.

Status: started. The first CLI lives at `tools/fmaze.py` with implementation in
`src/fractal_maze_lab/cli.py`. It supports `validate`, `solve`, `replay`, and
`explain` for the currently implemented package strategies. Port Graph solving
is bounded and transition-selected; long recursive examples may still be better
verified by authored Solution Record replay until solver heuristics improve.

Deliverables:

- `validate` command: started
- `solve` command: started
- `replay` command: started
- `explain` command for proof and port decisions: started
- fixture regression suite
- text output for logical runtime state, stack/address, solver status, and proof steps

Exit criteria:

- a package can be validated and solved from a command
- `Skeptic Play #1` can replay a known solution
- Wolfram #2 can show the port decision that resolves ambiguity
- a repeated/tiled fixture reports bounded solver status
- proof transitions are reported as proof transitions, not physical moves

## Workbench Sprint D: Static Browser Reader

Goal: build the first browser workbench slice by consuming Maze Package artifacts. This is not an editor yet.

Prerequisite: design and validate the Visual Mapping layer before Browser
Package JSON export. Visual Mapping and export should be shaped together so the
browser artifact can carry reviewed anchors, activation points, and playback
hooks without making visuals authoritative for logic. See
`docs/visual-mapping-plan.md`.

Deliverables:

- static browser app shell
- package loader for committed package artifacts
- graph or simple logical view
- player controls for one package
- solution playback for one package
- display of logical runtime state and solver status

Exit criteria:

- the browser can load a package without a server
- user can play or replay one maze
- logical runtime state is visible
- visual state is clearly separate from logical state
- no Python runtime is required in the browser

## Workbench Sprint E: Editor Surface

Goal: let users create and repair maze packages through multiple representations.

Deliverables:

- address/port graph editor
- structured transition forms
- package validation panel
- visual anchor placement
- optional image overlay tracing
- generated runtime/PDA/proof inspection

Exit criteria:

- user can create a small recursive maze without hand-editing raw YAML
- user can repair a port ambiguity
- editor output validates as a Maze Package
- user can inspect generated runtime transitions

## Workbench Sprint F: Handcrafted Package Archive

Goal: make the existing repo collection useful inside Fractal Maze Lab through explicit hand-authored package files before visual mapping work starts.

Deliverables:

- hand-authored Source Package for each maze in the curated list
- hand-authored logic file for each playable or partially modeled maze
- package records for reference-only mazes when logic is not yet modeled
- archive metadata
- source image references
- modeling status per maze
- known solution records where available

Exit criteria:

- repo mazes have package records
- hand-authored packages declare limitations
- archive distinguishes playable, partially modeled, and reference-only mazes

## Cross-Sprint Rules

- Maze Foundation comes before browser delivery.
- Maze logic is not owned by visuals.
- Raw PDA is not the primary authoring format.
- Visual navigation state is separate from logical runtime state.
- Proof transitions must be visible as proof transitions.
- Python can remain the trusted tooling layer even if the workbench ships as static browser files.
- New features should be tested against at least one real maze from the repo.
