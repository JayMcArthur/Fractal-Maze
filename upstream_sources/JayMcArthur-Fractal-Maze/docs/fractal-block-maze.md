# Fractal Block Maze And Grid Mazes

Fractal Block Maze-style puzzles are a separate pressure test for the logic core. They appear to involve adjacent infinite recursive structures, not only nested copies entered through a stack.

This should not be confused with every maze that is drawn on a grid. Inner Frame and Skeptic Play 3 are grid-authored recursive mazes: the grid helps draw paths and walls, but the logic still looks like exits, links, finite blocks, and recursive entry/exit. Those should normalize into the same Port Graph/PDA-style foundation as the hand-authored recursive examples.

Reference:

- `https://koteitan.github.io/fractalblockmaze/`
- `https://github.com/koteitan/fractalblockmaze`
- `https://googology.fandom.com/wiki/User_blog%3AKoteitan/A_history_of_Repeating_Mazes`

## Why This Is Different

Normal recursive mazes can often be represented as:

```yaml
state: "1"
stack: ["ROOT", "A", "B"]
```

A Fractal Block Maze may need to represent position across a recursive grid where neighboring cells can be at different scales or depths.

Possible address shape:

```yaml
address:
  kind: block_coord
  x: 0
  y: 0
  depth: 3
  port: east_terminal
```

or:

```yaml
address:
  kind: symbolic_block
  macro_cell: [X, Y]
  scale: N
  local_cell: [i, j]
  port: boundary_terminal
```

## Candidate Model

Treat Fractal Block Maze movement as local symbolic neighborhood generation over ports.

```yaml
generators:
  - id: block_neighbors
    type: coordinate_rule
    applies_to: block_coord
    transitions:
      - input: north
        from_pattern:
          x: X
          y: Y
          depth: D
          port: north_terminal
        to_pattern:
          x: X
          y: Y - 1
          depth: D
          port: south_terminal
```

The real rules may be more complex. Sprint 1 should not overdesign this before inspecting the implementation and examples closely.

## Prototype Status

The current prototype has two levels.

First, `BlockAddress` and `BlockMoveGenerator` are a minimal coordinate/depth spike:

```python
BlockAddress(x=0, y=0, depth=0, local="center")
```

It supports local moves and explicit `descend` / `ascend` depth changes. This is not yet a Fractal Block Maze solver; it is a test that the logic core can carry coordinate-like symbolic addresses separate from PDA stack addresses. The next version should replace or extend `local` with explicit ports or terminals.

Second, `src/fractal_maze_lab/fractal_block.py` models Koteitan's bundled example from `main.js`.

Koteitan default pattern:

```python
KOTEITAN_DEFAULT_PATTERN = (
    (1, 0, 1, 1),
    (0, 1, 0, 1),
    (1, 0, 1, 1),
    (1, 1, 0, 0),
)
```

Cells follow Koteitan's convention:

- `1`: black cell, recursively contains another generated maze
- `0`: white cell, open at this depth

The solver state is a tuple of nested cell coordinates:

```python
((1, 3), (3, 0), (2, 3))
```

This means the player is in cell `(1, 3)`, then inside that black cell at `(3, 0)`, then inside that black cell at `(2, 3)`.

Prototype commands:

```sh
python3 tools/fractal_block_demo.py --depth 5
python3 tools/fractal_block_demo.py --depth 5 --trace
```

Current default example result at depth 5:

```text
solved=True depth_limit=5 explored=16912 path_length=47 max_depth=5
```

This mirrors the stable repo's v1.11 style: bounded search over white cells in 4-neighbor movement, entering recursively when a move hits a black cell.

The default Koteitan pattern is now also represented as a Source Package:

```text
packages/source/koteitan_fractal_block_default/
  package.yml
  logic.yml
```

That package uses:

```yaml
strategy: coordinate_path
source_model: fractal_block_pattern
```

The package loader can validate it, construct a `FractalBlockMaze`, and run the bounded solver with the package's default depth limit.

## Relationship To PDA

PDA stack execution may still appear inside a Fractal Block Maze, but it is not enough as the only address model.

Likely split:

- symbolic coordinate address for global/block location
- ports or terminals on blocks
- optional stack-like context for nested substructure
- generated physical transitions for local movement between compatible ports
- possible proof rules for unbounded movement or reachability claims

## Grid-Authored Recursive Mazes

Grid-authored package fixtures such as Inner Frame, Skeptic Play 3, Alice, Sierpinski, and the Block Maze are represented as Port Graph packages. Their old tile-grid source has been normalized into package logic.

The old grid concepts map cleanly:

- `EXIT` becomes a terminal on the current maze.
- `LINK block exit row col` becomes an entry port from the parent visual grid into a child block terminal.
- `BLOCK name row col width height` declares a recursive submaze label.
- tile bitmasks and `TELEPORT` entries describe visual traversal between activation points.
- `PLAYER` and `TROPHY` become start/goal anchors.

The package conversion compresses visual movement through ordinary grid tiles into logical traversals between activation points. Intermediate grid cells are visual checkpoints, not logical transitions, unless they branch or trigger a link/exit/proof edge.

Two current stress tests:

- Inner Frame: one recursive block `A`, eight exits, eight links, existing PDA example `inner_frame()` with solution `4215)412`.
- Skeptic Play 3 / Carpet: four recursive blocks `A` through `D`, twelve exits, twenty-four links, existing PDA example `skeptic_play_3()` with a long accepted solution.

This gives us a conservative rule: do not create a separate grid execution strategy for these mazes unless the package Port Graph representation fails to model verified play.

## Sprint 1 Spike

Deliver a small written model of one Fractal Block Maze rule:

1. Inspect the Koteitan implementation and examples.
2. Identify the minimum state needed to describe a player location. Done for the stable solver: nested coordinate path.
3. Identify how neighboring moves are generated. Done for the stable solver: 4-neighbor movement with carry across nested depths, plus recursive entry through black cells.
4. Decide whether the model requires proof transitions.
5. Write one toy transition generator.

## Package Conversion Follow-Up

Before finalizing visual mapping, verify the derived Port Graph packages for the grid-authored recursive examples.

1. Review activation points: player, trophy, exits, links, block boundaries, and path junctions.
2. Confirm compressed logical transitions against play behavior.
3. Add verified solution records where they are missing.
4. Emit a Port Graph package candidate.
5. Compare the generated transitions against `pda_examples.inner_frame()` and `pda_examples.skeptic_play_3()`.

If these grid-authored examples match the existing PDA behavior, keep them in `strategy: pda_stack`. Reserve `coordinate_stack` or generated-coordinate strategies for Koteitan-style Fractal Block Maze behavior.

## Open Questions

- Is depth finite during actual play, or conceptually unbounded?
- Is movement always local, or can it jump across scales?
- Are block identities generated procedurally or selected from a finite alphabet?
- Can the visible viewport be derived from symbolic address state?
- Does solving require reachability over an infinite grid-like graph?
- Are Koteitan terminals enough as the shared abstraction between recursive PDA mazes and Fractal Block Mazes?
