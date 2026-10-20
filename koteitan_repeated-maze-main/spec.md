[Japanese](spec-ja.md) | **English**

# purpose
Find the register machines that runs a long long time and halts like busy beaver of the turing machine.

# Terminology
## States
- A state consists of a 3-tuple of integers (x,y,t).
  - x,y are the zero or positive integers.
  - t is "terminal", which is a combination of a direction {W,E,S,N}, and integer 0<=t<nterm.

## blocks
- "block" has 3 types: "nx", "ny", "normal".
  - "nx" blocks are at (0,y) (y>0).
  - "ny" blocks are at (x,0) (x>0).
  - "normal" blocks are at (x,y) (x>0,y>0)

## Terminals
- nx blocks has nterm terminals E[0]--E[nterm-1].
- ny blocks has nterm terminals N[0]--N[nterm-1].
- normal blocks has 4*nterm terminals.
  - The terminal W[n] at (x,y) is identical to E[n] at (x-1,y).
  - The terminal S[n] at (x,y) is identical to N[n] at (x,y-1).
  - the string representation of the terminal is the direction followed by the integer, for example "E0", "N1", "W2", "S3".

## Ports
- the ports are the directional connections between terminals in the blocks.
- normal blocks has (4*nterm)x(4*nterm) ports.
- nx blocks has (nterm)x(nterm-1) ports.
- ny blocks has (nterm)x(nterm-1) ports.
- the string representation of the port is the two terminals connected by the port, for example "E0->N1", "N2->W3", "E0->E1", "N0->N1".

So, the total number of ports is (4*nterm)x(4*nterm) + 2*(nterm)x(nterm-1).

## Player
- The player can move from a terminal to another terminal if there is a port connecting them.

## Initial state
- The initial state is (1,1,W0).

## Goal state
- The goal state is (1,1,W1).

## Mazes
- A maze can be represented as a set of available ports.
  - so the number of mazes is 2^((4*nterm)x(4*nterm) + 2*(nterm)x(nterm-1)).
  - the string representation of the maze is the list of available ports for each type of block:
    - for example "normal: E0->N1, N2->W3; nx: E0->E1; ny: N0->N1".

## Paths
- A path is a sequence of terminals from the initial state to the goal state via the available ports in the maze.
- the string representation of the path is the list of a 3-tuples of the form (x,y,terminal), for example "(1,1,W0) -> (1,1,E0) -> (1,2,N0) -> (1,2,N1) -> (1,1,W1)".

## Minimal path of the maze M
- min_path(M) is the minimal path from the initial state to the goal state in the maze M.

## Solver
- A solver input a maze M and searches for min_path(M).

## Maximal minimal path of N
- max_min_path(N) is the maximal min_path(M) for all mazes M with nterm=N.

## Quizmaster
- A quizmaster input N and searches for a maze that has a maximal path using solvers.

# the goal of the project
- The goal of the project is to find the maze with the longest minimal path for a given nterm, and to find the length of that path.

# implementation

## language
- the program shall be in C language.
- the program shall be compiled with gcc and run on linux.
- the program shall be efficient and optimized for performance to handle large mazes and long paths.

## application structure

### Source files

| File | Role |
|---|---|
| `main.c` | CLI entry point. Dispatches subcommands: `solve`, `search`, `norm`. Parses options (`--bfs`, `--topdown`, `--max-aport`, etc.). |
| `maze.h` / `maze.c` | Maze data structure (port arrays for normal/nx/ny blocks), port accessors (typed and flat-index), string parsing/printing, randomization, normalization. |
| `solver.h` / `solver.c` | Shortest path solvers. `solve()` uses IDDFS with transposition table. `solve_bfs()` uses BFS with parent tracking for path reconstruction. `solve_bfs_len()` is a lightweight BFS returning length only. State canonicalization collapses W/S into E/N. |
| `quizmaster.h` / `quizmaster.c` | Search strategies for finding the maze that maximizes shortest path length. `quizmaster_search()`: exhaustive enumeration over port combinations. `quizmaster_random_search()`: random sampling with configurable seed. `quizmaster_topdown_search()`: starts from fully-connected maze and removes ports, using priority stacks and normalization pruning. |
| `index.html` | Browser-based visualizer. Renders maze port structure and path on canvas. Supports normal view (full graph with port arrows) and x,y-only view (simple motion lines). |
| `Makefile` | Build configuration. `make` compiles to `repeated-maze` binary with gcc -O2. |

### Subcommands

| Subcommand | Description |
|---|---|
| `solve <maze_string>` | Parse a maze and find the shortest path. Options: `--bfs` (use BFS instead of IDDFS), `-v` (verbose transition log). Auto-detects nterm from the maze string. |
| `search <nterm> --max-aport <N>` | Exhaustive or random search for the maze with the longest shortest path. Options: `--min-aport`, `--max-len`, `--random <seed>`, `--topdown`, `--bfs`, `-v`. |
| `norm <nterm> <maze_string>` | Normalize terminal indices to canonical form (first-appearance order). |

