[English](README.md) | [Japanese](README-ja.md)

# Repeated Maze

Find the maze configurations that maximize the shortest path length, analogous to the Busy Beaver problem for Turing machines but applied to register machines on repeated tile mazes.

## Overview

A "repeated maze" consists of identical blocks tiled across an infinite 2D grid. Each block has terminals (ports) on its four sides that connect to adjacent blocks. A player navigates from a start state to a goal state through these port connections. The challenge is to find the maze configuration (port assignment) that maximizes the length of the shortest path.

The **main UI** is the browser-based viewer/solver [`index.html`](index.html). Paste a maze string for interactive visualization and solving. From the CLI, the new **atomic-port (*1) maze format** emitted by `hs2maze.py` (with `C` subterminals, the `zero` block type, and `W0-C0` / `C1-W1` bridges) is solved by the Python [solver.py](tools/solver/README.md).

The **maze generator search** that maximizes shortest path length for a given nterm lives at [tools/gen-maze](tools/gen-maze) (C implementation, three strategies: exhaustive enumeration, random sampling, top-down pruning). It is legacy-format only — (*1) mazes are not supported there.

## Documentation

- [Specification](spec.md) — Formal definition of states, blocks, terminals, ports, and the maze optimization problem
- [Maze Constructions](maze/README.md)
  - [Counter Pump System](maze/counter-pump/README.md) — Construction achieving O(n²)~O(n³) path lengths via asymmetric y-coordinate accumulation
    - [nterm=6 Example](maze/counter-pump/6.md) — Counter pump with 6 terminals per side (path length 257)
  - [Minsky Doubling Machine](maze/minsky-doubling/README.md) — Exponential path length O(2^{nterm/12}) via register machine encoding
    - [k=5 Example](maze/minsky-doubling/5.md) — 5-iteration doubling machine (662 steps)
  - [Pentation Maze (penta)](maze/penta/README.md) — Gödel-encoded 2-register Minsky machine with path length Ω(2↑↑↑n) via the §8 fast-growing-function block construction
- [Tools](tools/README.md) — Haskell → maze → solution pipeline
  - [hs2maze](tools/hs2maze/README.md) — Haskell-style state machine to atomic-port (*1) maze converter
  - [nd-to-2d](tools/nd-to-2d/README.md) — *n*-register to 2-register Gödel Haskell compiler
  - [runhs](tools/runhs/README.md) — Haskell state machine execution helper
  - [solver](tools/solver/README.md) — Python BFS solver for the atomic-port (*1) format
- [Formal proofs (Lean)](lean/README.md) — Lean 4 proof that the largest shortest-path length L(n) is not bounded by any computable function

## Visualization (main UI)

Open `index.html` in a browser to visualize and solve mazes interactively.
Both the new (atomic-port (*1)) and the legacy formats are accepted.

## CLI solver (new format)

```bash
python3 tools/solver/solver.py FILE.maze
```

See [tools/solver/README.md](tools/solver/README.md) for details.

## Maze generator search (legacy format only)

Build and run the C implementation under `tools/gen-maze/`:

```bash
cd tools/gen-maze && make

# Solve a maze
./repeated-maze solve '<maze_string>' [--bfs] [-v]

# Exhaustive search
./repeated-maze search <nterm> --max-aport <N> [--min-aport <N>] [--max-len <N>] [--random <seed>] [--bfs] [-v]

# Top-down search
./repeated-maze search <nterm> --topdown [--max-len <N>] [--bfs] [-v]

# Normalize a maze
./repeated-maze norm <nterm> '<maze_string>'
```
