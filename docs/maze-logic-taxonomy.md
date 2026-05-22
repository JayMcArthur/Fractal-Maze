# Maze Logic Taxonomy

Fractal Maze Lab needs to support several related maze families without forcing them all into one narrow model. The shared rule is that maze logic must be independent from drawings and images.

## Core Families

### Normal Recursive Maze

A normal recursive maze has a finite set of decision points and a finite set of recursive submaze labels. Entering a submaze adds context, and exiting removes context.

Examples in this repo:

- `packages/source/alice_and_the_hedge_maze/package.yml`
- `packages/source/skeptic_play_1/package.yml`
- `Maze_Images/Siggy/Skeptic_Play_1.*`

Logic needs:

- symbolic addresses such as `1`, `A.2`, `B.B.A.1`
- ports or terminals when a path label has multiple meanings
- physical transitions that push or pop submaze context
- deterministic play mode
- bounded and unbounded solver modes

This family maps cleanly to PDA-style stack execution.

### Path/Image Maze

A path/image maze is easiest to understand from an existing visual artifact. The important logic is still decision points and transitions, but the primary authoring aid may be an image overlay.

Examples in this repo:

- `Maze_Images/Mark_J_P_Wolf/Wolfram_2.jpg`
- `Maze_Images/Mark_J_P_Wolf/Wolfram_2_-_Wires.png`
- `Maze_Images/Mike_Earnest/Alice_and_the_Hedge_Maze.png`
- `Maze_Images/The_Inner_Frame.pdf`

Logic needs:

- decision points and path labels independent from image pixels
- port-level anchors when the same visible label has multiple logical meanings
- visual anchors over the source image
- optional path geometry for traversal and playback
- conversion notes when a hand-derived PDA is uncertain

This family can still use PDA stack execution when the underlying structure is recursive.

### Grid-Authored Recursive Maze

A grid-authored recursive maze uses a tile grid as the editable drawing surface, but the recursive logic is still a finite set of exits, links, blocks, player/trophy anchors, and paths between meaningful activation points. The grid is not the runtime state machine by itself; it is a source representation that can be normalized into ports and transitions.

Examples in this repo:

- `packages/source/inner_frame/package.yml`
- `packages/source/skeptic_play_3/package.yml`
- `packages/source/alice_and_the_hedge_maze/package.yml`
- `packages/source/skeptic_play_2_sierpinski/package.yml`
- `packages/source/orelcosseron_block_maze/package.yml`

Logic needs:

- tile-path parsing for visual traversal and editor feedback
- exits and links normalized as terminals/ports
- block entries compiled to PDA-style push transitions
- exits from nested blocks compiled to PDA-style pop transitions
- path compression from many visual cells into one logical traversal when no decision point is crossed
- optional visual checkpoints for intermediate grid movement

This family shares the Port Graph/PDA foundation with normal recursive mazes. The current package set proves that grid-authored recursive mazes can normalize into the same logical model before introducing a separate grid runtime.

### Cantor Or Infinite Maze

A Cantor or infinite maze has behavior that cannot always be represented as a finite physical sequence of moves. Some valid solution steps are proof steps over infinitely many nested structures.

Examples in this repo:

- `Maze_Images/Siggy/Simple_Cantor_Maze.svg`
- `Maze_Images/Siggy/First_Cantor.svg`
- `Maze_Images/Siggy/Infinite_Descent.svg`

Logic needs:

- symbolic variables over addresses
- terminal-level claims when a proof depends on a side or boundary
- proof rules
- proof transitions
- explanation traces that can expand a proof step
- solver results that may be `unknown`, `requires_proof`, or `proved`

This family should not be forced into ordinary finite PDA execution.

### Fractal Block Maze

A Fractal Block Maze has adjacent infinite fractal structure, not only nested recursive copies. Movement can expose many depths of structure at once, so stack-only addresses are probably not enough.

Reference:

- `https://koteitan.github.io/fractalblockmaze/`

Logic needs:

- coordinate-like symbolic addresses
- depth or scale parameters
- ports or terminals on blocks
- local adjacency rules
- possibly generated transition neighborhoods
- a way to relate visible blocks to symbolic locations

This family should be treated as a first-class pressure test for symbolic addresses.

### Repeated Or Tiled Port Maze

A repeated or tiled port maze has a finite block rule set repeated over an infinite coordinate grid. Movement happens through terminals on block edges, and different coordinate classes may use different port sets.

References:

- `https://github.com/koteitan/repeated-maze`
- `https://github.com/koteitan/fractal-maze-solver`

Logic needs:

- coordinate states such as `(x, y, W0)`
- terminal/port identities on block sides
- block classifiers such as `normal`, `nx`, `ny`, and `zero`
- generated neighbor rules for crossing block boundaries
- canonicalization of equivalent physical terminals
- solver bounds and `unknown` results for unbounded cases
- optional source-program provenance when ports were compiled from a register machine or state machine

This family should not be compiled through the PDA model first. It should compile into a generated port graph strategy.

## Design Implication

The first core should be symbolic address logic. PDA-style stack execution is the first concrete execution strategy, not the whole model.

```text
Logic Core
  symbolic addresses
  physical transitions
  execution strategies
  proof rules
```

## Sprint 1 Taxonomy Tests

Sprint 1 should prove that the taxonomy is useful by testing one representative from each family:

- Normal recursive: `Skeptic Play #1`
- Hard image/PDA conversion: `Wolfram #2`
- Infinite/Cantor: one small toy proof rule
- Fractal Block Maze: one minimal coordinate/depth address sketch
- Repeated/tiled port maze: one small port-set fixture with `normal`, `nx`, `ny`, and `zero` blocks

## Open Questions

- Are Fractal Block Mazes playable with local finite neighborhoods, or do they require proof transitions too?
- Should every maze declare its logic family explicitly?
- Can one maze combine stack addresses, coordinate addresses, and proof rules?
- What solver guarantees are available per family?
- What package fields preserve compiler provenance for generated repeated mazes?
