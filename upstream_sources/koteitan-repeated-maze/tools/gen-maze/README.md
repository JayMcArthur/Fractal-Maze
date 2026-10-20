[← Back](../README.md) | [English](README.md) | [Japanese](README-ja.md)

# gen-maze — Shortest-path-maximizing maze search (C implementation)

A C command-line tool that searches for **maze configurations that
maximize the shortest path length** for a given nterm. Analogous to
Busy Beaver but on repeated-tile mazes.

Three strategies: exhaustive enumeration, random sampling, top-down
pruning. As a byproduct it also includes a legacy-format maze solver
(IDDFS / BFS).

> **Format compatibility:** This tool handles the legacy maze format
> only (canonical state E/N + nx/ny compression). The new atomic-port
> (*1) format (with `C` subterminals, the `zero` block type, and
> bridges) cannot be solved here. Use [`tools/solver/`](../solver/README.md)
> for the new format.

## Build

```bash
cd tools/gen-maze
make
```

Produces the `repeated-maze` binary in this directory.

## Usage

```bash
# Solve a maze
./repeated-maze solve '<maze_string>' [--bfs] [-v]

# Exhaustive / random search
./repeated-maze search <nterm> --max-aport <N> [--min-aport <N>] [--max-len <N>] [--random <seed>] [--bfs] [-v]

# Top-down search
./repeated-maze search <nterm> --topdown [--max-len <N>] [--bfs] [-v]

# Normalize a maze
./repeated-maze norm <nterm> '<maze_string>'
```

## Files

- `main.c` — CLI entry point
- `maze.h` / `maze.c` — maze data structure, string parse/print, normalization
- `solver.h` / `solver.c` — IDDFS / BFS solvers
- `quizmaster.h` / `quizmaster.c` — shortest-path-maximizing search strategies
- `Makefile` — gcc -O2 build
