[Japanese](README-ja.md) | **English**

# Repeated Maze

Find the maze configurations that maximize the shortest path length, analogous to the Busy Beaver problem for Turing machines but applied to register machines on repeated tile mazes.

## Overview

A "repeated maze" consists of identical blocks tiled across an infinite 2D grid. Each block has terminals (ports) on its four sides that connect to adjacent blocks. A player navigates from a start state to a goal state through these port connections. The challenge is to find the maze configuration (port assignment) that maximizes the length of the shortest path.

`repeated-maze` is a C command-line tool that serves as both a **maze solver** and a **maze generator** (quizmaster). The solver finds the shortest path through a given maze using IDDFS or BFS. The quizmaster searches for maze configurations that maximize the shortest path length, using exhaustive enumeration, random sampling, or top-down pruning strategies. An interactive browser-based visualizer (`index.html`) renders mazes and paths.

## Documentation

- [Specification](spec.md) — Formal definition of states, blocks, terminals, ports, and the maze optimization problem
- [Maze Constructions](maze/README.md)
  - [Counter Pump System](maze/counter-pump/README.md) — Construction achieving O(n²)~O(n³) path lengths via asymmetric y-coordinate accumulation
    - [nterm=6 Example](maze/counter-pump/6.md) — Counter pump with 6 terminals per side (path length 257)
  - [Minsky Doubling Machine](maze/minsky-doubling/README.md) — Exponential path length O(2^{nterm/12}) via register machine encoding
    - [k=5 Example](maze/minsky-doubling/5.md) — 5-iteration doubling machine (662 steps)
  - [hs2maze](maze/hs2maze/README.md) — Converter from Haskell-style state machine definitions to maze strings

## Building

```bash
make
```

## Usage

```bash
# Solve a maze
./repeated-maze solve '<maze_string>' [--bfs] [-v]

# Exhaustive search
./repeated-maze search <nterm> --max-aport <N> [--min-aport <N>] [--max-len <N>] [--random <seed>] [--bfs] [-v]

# Top-down search
./repeated-maze search <nterm> --topdown [--max-len <N>] [--bfs] [-v]

# Normalize a maze
./repeated-maze norm <nterm> '<maze_string>'
```

## Visualization

Open `index.html` in a browser to visualize mazes and paths interactively.
