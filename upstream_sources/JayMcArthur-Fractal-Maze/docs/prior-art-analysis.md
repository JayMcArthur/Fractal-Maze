# Prior Art Analysis

This document records what the existing Fractal Maze programs imply for Fractal Maze Lab's logic core, solver strategy, editor model, and visual playback.

## Sources Reviewed

- Techtress Alice solver: `https://github.com/Techtress/Alice-and-the-Fractal-Hedge-Maze-Solver`
- Amurielagi web editor/player: `https://github.com/amurielagi/fractal-maze`
- Koteitan Fractal Block Maze: `https://github.com/koteitan/fractalblockmaze`
- Koteitan Fractal Maze Solver: `https://github.com/koteitan/fractal-maze-solver`
- Koteitan Repeated Maze: `https://github.com/koteitan/repeated-maze`
- Sparecycles Mark Wolf player: `https://github.com/sparecycles/fractal-maze`
- Orelcosseron Fractal Maze player: `https://github.com/orelcosseron/Fractal-Maze`
- Previously vendored Python player copy, now superseded by package logic
- iiJetLi Fractal Maze analyzer/solver: `https://github.com/iiJetLi/Fractal-Maze`
- Daedalus overview: `https://www.astrolog.org/labyrnth/daedalus.htm`

The cloned repos live outside this project under `/tmp/fractal_maze_prior_art/` and `/tmp/fractalblockmaze/`.

## Alice Solver

File reviewed:

- `/tmp/fractal_maze_prior_art/alice_solver/MazeSolver.cpp`

Model:

- Uses a finite set of base nodes and section offsets for recursive rooms `A`, `B`, `C`, and `D`.
- Tracks recursion with a `floors` vector.
- A move to an inside node pushes a room section.
- A move to an outside node can pop to the parent only if the current room actually has that node.
- Solver is bounded by max moves and max floor depth.

Important insight:

The solver does not need raw PDA syntax. It uses a compact graph plus stack discipline. This supports our `AddressGraph + PDA stack execution` direction.

Design implications:

- Add solver options for `max_moves`, `max_depth`, and optimality preferences.
- Preserve room-local node existence checks. A pop transition is not valid just because stack top matches; the current room must expose the target terminal.
- Keep solution metrics separate: shortest move count and shallowest max depth can disagree.

## Amurielagi Web Editor And Player

Files reviewed:

- `/tmp/fractal_maze_prior_art/amurielagi_fractal_maze/model.js`
- `/tmp/fractal_maze_prior_art/amurielagi_fractal_maze/game.js`
- `/tmp/fractal_maze_prior_art/amurielagi_fractal_maze/fractal-maze-export.json`

Model:

- `Gate` objects are first-class ports on the outer maze, endpoints, and submazes.
- `MazePath` connects gates through drawn path geometry.
- `SubMaze` creates a recursive child maze from the same source data.
- `GamePosition` stores begin gate, selected end gate, previous/next move, and possible gates.
- A saved game is essentially a sequence of chosen gate ids.
- Editor authoring is gate/path/submaze oriented, not raw PDA oriented.

Important insight:

This strongly supports the port/terminal model. A path connects gates, and movement decisions are gate choices. Visual path geometry is useful for editing and playback but not sufficient as logic by itself.

Design implications:

- Make `Port` / `Terminal` first-class in the source format.
- Store solution steps as transition ids or gate/port ids, not only direction keys.
- Let the editor draw a path, but commit it as a path connecting ports.
- Include path geometry in visual data for animation and hover highlighting.
- Support multi-gate paths, because Amurielagi paths can collect more than two gates.

## Koteitan Fractal Block Maze

Files reviewed:

- `/tmp/fractalblockmaze/main.js`
- `/tmp/fractalblockmaze/mazesolver.js`
- `/tmp/fractalblockmaze/README.md`

Model:

- A generating pattern is a square grid of black and white cells.
- White cells are open at the current depth.
- Black cells recursively contain another generated maze.
- A position is a list of nested cell coordinates.
- Movement is 4-neighbor movement with carry/wrap across nested depths.
- Solver uses iterative deepening over max depth.

Important insight:

This is not a classic PDA over named rooms. It is a symbolic coordinate-address maze with bounded search. It still has recursive descent, but the address is a coordinate path rather than a stack of room labels.

Design implications:

- Keep symbolic addresses general enough to represent coordinate paths.
- Add a `coordinate_path` execution strategy alongside `pda_stack`.
- Support generated neighborhoods, not only enumerated transitions.
- Treat Fractal Block Maze solving as bounded symbolic graph search.
- Keep the current local `fractal_block.py` prototype as the first representative.

## Koteitan Fractal Maze Solver

Files reviewed:

- `/tmp/fractal_maze_prior_art/koteitan_fractal_maze_solver/solver.cpp`
- `/tmp/fractal_maze_prior_art/koteitan_fractal_maze_solver/maze.h`
- `/tmp/fractal_maze_prior_art/koteitan_fractal_maze_solver/maze_koteitan.cpp`

Model:

- Represents a global location as `(depth, parent, block, port)`.
- Local rules include explicit depth deltas: go down, stay, or go up.
- Up transitions restore the parent block and parent parent pointer.
- Solver runs breadth-like waves under increasing `maxdepth`.

Important insight:

This is a compact operational form of recursive maze execution that is close to a PDA but not written as automata tables. The `parent` pointer is the stack, while `block` and `port` are the active terminal state.

Design implications:

- Keep `block` and `port` separate from stack context in runtime state.
- Store recursive transitions as local port rules with effects, then compile to PDA only when needed.
- Solver traces should retain parent/stack provenance so an answer can be explained as nested locations, not just a flat state id.
- Bounded depth is a solver parameter, not a property of the maze.

## Koteitan Repeated Maze

Files reviewed:

- `/tmp/fractal_maze_prior_art/koteitan_repeated_maze/spec.md`
- `/tmp/fractal_maze_prior_art/koteitan_repeated_maze/tools/gen-maze/maze.c`
- `/tmp/fractal_maze_prior_art/koteitan_repeated_maze/tools/gen-maze/solver.c`
- `/tmp/fractal_maze_prior_art/koteitan_repeated_maze/tools/solver/solver.py`
- `/tmp/fractal_maze_prior_art/koteitan_repeated_maze/tools/hs2maze/README.md`

Model:

- A maze is an infinite first-quadrant grid of repeated blocks.
- Runtime state is `(x, y, terminal)`.
- Terminals are directional edge ports such as `E0`, `W1`, `N2`, `S3`; the newer atomic-port format also uses `C` center terminals during compilation.
- Different block classes (`normal`, `nx`, `ny`, `zero`) provide different port sets for interior, x-boundary, y-boundary, and origin behavior.
- The legacy C solver canonicalizes physical edge terminals into `E/N` states, supports IDDFS and BFS, and includes maze normalization.
- The newer Python solver handles atomic-port maze strings with directed and undirected edges.
- `hs2maze` compiles a Haskell-style 2-register state machine into maze ports.

Important insight:

Repeated/tiled mazes are not PDA mazes. They are port graphs generated over integer coordinates, and they can encode register machines. For these, the save file must preserve both the compiled port maze and, when available, the higher-level source program that generated it.

Design implications:

- Add `tiled_port_graph` or `repeated_grid` as a first-class execution strategy.
- Add block classifiers and generated neighbor lookup to the solver interface.
- Represent solver answers as `solved`, `unsolved_with_bound`, or `unknown_unbounded`; unrestricted reachability may be undecidable for this family.
- Save files should support `source_program`, `compiler`, and `compiled_port_sets` sections.
- Normalization should be a core operation: canonical terminal ids make comparison, fixtures, and regression tests much easier.

## Sparecycles Mark Wolf Player

File reviewed:

- `/tmp/fractal_maze_prior_art/sparecycles_fractal_maze/maze.js`

Model:

- Defines visual `Path` objects using compact geometry specs.
- Defines `Node` objects with north/south/east/west actions.
- Node actions are path traversal, enter subcopy, or exit subcopy.
- Maintains a `traversing` graph of visited subcopies and a current node.
- Auto-progresses through nodes with only one forward choice.
- Records replay actions and can export a solution explanation with enter/exit metadata.

Important insight:

This validates the separation between traversal and logical transition. A user direction may cause automatic traversal through forced paths until the next real decision point. It also shows why replay should record semantic actions, not only raw keypresses.

Design implications:

- Add forced-traversal compression to the runtime: stop at branch/terminal/goal, not every pixel.
- Store replay as semantic transition records with `kind: path | enter | exit | proof`.
- Preserve explanation metadata for enter/exit moves.
- Support visual routes as polylines with interpolation for playback.

## Recursive Grid Player Prior Art

Files reviewed:

- Orelcosseron Fractal Maze player repositories
- `/tmp/fractal_maze_prior_art/orelcosseron_fractal_maze/src/MazeToJSON.tsx`
- `/tmp/fractal_maze_prior_art/orelcosseron_fractal_maze/components/Maze.tsx`

Model:

- The old grid text format mixed tile paths, colors, teleports, blocks, exits, links, player start, and trophies.
- Runtime tracks a `block_stack`.
- Entering a block changes stack/context and uses exit/link mappings.
- The newer web version converts the old grid text into JSON for rendering.

Important insight:

The old grid format was a useful conversion target, but not a clean canonical source. The package layer now carries the normalized logic for those cases.

Design implications:

- Keep the canonical schema centered on package logic, not the old grid format.
- Preserve teleports as physical transitions with visual route metadata.
- Preserve trophies/goals separately from exits.
- Convert `LINK block_path exit row col` into port-level transitions.

## iiJetLi Fractal Maze Analyzer And Solver

Files reviewed:

- `/tmp/fractal_maze_prior_art/iijetli_fractal_maze/README.md`
- `/tmp/fractal_maze_prior_art/iijetli_fractal_maze/tools/CrackMaze/CrackMaze.cpp`
- `/tmp/fractal_maze_prior_art/iijetli_fractal_maze/tools/CrackMaze/CrackMaze.hpp`
- `/tmp/fractal_maze_prior_art/iijetli_fractal_maze/mazes/fractal.jpg/fractal.jpg.ana`
- `/tmp/fractal_maze_prior_art/iijetli_fractal_maze/mazes/fractal.jpg/fractal.jpg.loc`

Model:

- Image analysis outputs `.ana` connection groups and `.loc` pin locations.
- Logical pins include outer pins `P*`, submaze pins like `A2`, and named terminals such as `Cathode` and `Anode`.
- Solver builds connection sets from `.ana`, expands subchips dynamically, and uses a BFS-style queue with per-chip visited flags.
- GUI keeps visual pin locations separate from connection logic.

Important insight:

This is the strongest evidence that image-derived mazes should compile into the same port graph as hand-authored mazes. The image analyzer is an importer, not the logic model.

Design implications:

- Treat image pin detection as provenance attached to ports and paths.
- Save files need optional `visual_anchors` for pin coordinates and source-image references.
- The solver core should accept the compiled connection graph without depending on image-processing output.
- The package format should be able to store both raw imported artifacts (`.ana`, `.loc`) and normalized logic.

## Daedalus

Source reviewed:

- `https://www.astrolog.org/labyrnth/daedalus.htm`

Model:

- General maze workbench: create, solve, analyze, view, and walk through mazes.
- Supports many geometry families: standard, nested fractal, recursive fractal, 3D/4D/5D, hypermaze, picture, and more.
- Has multiple solving and analysis algorithms.
- Includes macro/scripting support.

Important insight:

Daedalus is not specific to fractal mazes, but it reinforces the product direction: Fractal Maze Lab should be a workbench, not only a player. It also shows that maze type taxonomy and algorithm selection matter.

Design implications:

- Keep solver strategy pluggable by maze family.
- Keep analysis features separate from gameplay.
- Avoid overfitting visuals to square grids.
- Treat "fractal-looking generated maze" separately from "recursive fractal maze."

## Cross-Cutting Conclusions

### 1. Ports/Terminals Are The Correct Primitive

Amurielagi's gates, Sparecycles' node actions, Orelcosseron's exits/links, Koteitan's boundary entry behavior, Repeated Maze's atomic ports, and iiJetLi's pins all point to the same abstraction: movement happens through terminals or ports.

The source model should therefore be:

```text
ports + paths + substructures + execution strategy
```

not:

```text
path labels only
```

### 2. PDA Is One Execution Strategy

Alice, Orelcosseron, and Koteitan's older recursive solver fit PDA-style stack execution well. Fractal Block Maze does not fit as cleanly because its stack symbols are coordinate cells generated from a pattern. Repeated Maze is a tiled coordinate port graph, not a PDA. Cantor examples need proof rules.

The logic core should support:

- `pda_stack`
- `coordinate_path`
- `tiled_port_graph`
- `proof_rule`
- future generated or higher-dimensional strategies

### 3. Solving Needs Multiple Modes

Solver modes should include:

- bounded DFS by moves and depth
- BFS or uniform-cost search over symbolic states
- iterative deepening by depth
- forced-traversal compression
- proof-rule assisted search
- tiled-grid BFS/IDDFS with canonical states and normalization
- `unknown` when symbolic reasoning is required but unavailable

### 4. Runtime History Should Be Semantic

A step should identify what happened:

```yaml
step:
  kind: enter
  transition_id: enter_A_from_gate_3
  from_port: "root.3"
  to_port: "A.3"
  stack_before: [ROOT]
  stack_after: [ROOT, A]
```

Do not store only player keypresses. Keypresses are UI input, not stable solution data.

### 5. Editor Should Be Gate/Path First

The editor should let users:

- place ports/gates
- draw paths connecting ports
- place recursive substructures
- annotate stack/coordinate/proof behavior
- inspect generated PDA/transition data

Raw PDA editing should remain an advanced view.

## Concrete Backlog Additions

1. Add `Port` and `Terminal` objects to the source schema.
2. Add a normalized port graph before compiling to PDA transitions.
3. Add solver configuration: `max_depth`, `max_moves`, `strategy`.
4. Add forced traversal compression.
5. Add semantic solution record format.
6. Verify the derived grid-authored package fixtures and add missing solution records.
7. Add Amurielagi JSON/package conversion notes as a gate/path source.
8. Keep Koteitan `coordinate_path` solver separate from PDA stack executor.
9. Add repeated/tiled port graph support with `normal`, `nx`, `ny`, and `zero` block classifiers.
10. Add source-program and compiler provenance fields to maze packages.
