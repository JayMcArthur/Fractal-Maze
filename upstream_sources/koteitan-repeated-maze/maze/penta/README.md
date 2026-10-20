[← Back](../README.md) | [English](README.md) | [Japanese](README-ja.md)

# penta — Gödel-encoded Pentation Maze

Generator for a **uniform 4-block-type** (normal + nx + ny + zero) pattern-
repeating maze implementing penta.md's pentation computation, via Gödel
encoding into a 2-register Minsky machine.

## Overview

[pentation maze](https://googology.fandom.com/ja/wiki/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%83%96%E3%83%AD%E3%82%B0:Koteitan/%E3%83%9A%E3%83%B3%E3%83%86%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E8%BF%B7%E8%B7%AF) uses 23 block types and position-dependent rules for density.
This generator takes the same 2-register Gödel-encoded Minsky machine from
§「コインシステムの５次元迷路レジスタマシンのゲーデル数システムを２次元迷路レジスタマシンに…」
and lowers it fully into normal/nx/ny/zero primitives, producing a **uniform**
maze where all normal blocks have identical ports.

## Files

- `make_penta.py`: Python generator. Produces `penta.hs` on stdout.
- `penta.hs`: Generated Haskell state machine (~6000 lines, ~5350 pc values
  at default initial_a=1).

## Usage

```bash
python3 make_penta.py [initial_a] > penta.hs
python3 ../../tools/hs2maze/hs2maze.py penta.hs > penta.maze
# hs2maze auto-distributes ports into normal/nx/ny/zero — no manual editing.
```

`initial_a` controls the input x = 2^initial_a (set up via 2^initial_a INC x
rules at pc=0..):
- 0: x = 1, immediate HALT (Rule 1 fires since 2∤1 and 5∤1)
- 1: x = 2, result 3^2 = 9 (Rule 2 → Rule 1)
- 2: x = 4, result 3^(2↑↑↑2) = 3^(2^16) = 3^65536 (already huge)
- 3+: result 3^(2↑↑↑initial_a)

## Maze convention

The current `hs2maze.py` / `solver.py` convention:
- start = `(0, 0, W, 0)` via bridge `W0 -> C0` (Haskell pc = 0)
- goal  = `(0, 0, W, 1)` via bridge `C1 -> W1` (Haskell pc = 1, HALT)
- initial registers (x = 0, y = 0); block (0, 0) is the `zero` block

Zero-branch rules use Haskell first-match patterns (`penta (0, y, pc) = ...`
and `penta (x, 0, pc) = ...`).  `hs2maze.py` reads the literal `0` LHS to
route those ports into nx/zero or ny/zero respectively, with catch-all
rules going to all four block-type sets.

## Algorithm

14 Fractran-style rules from penta.md, applied in first-match order:

| Rule | Condition (p∤x) | Action |
|---|---|---|
| 1 | 2, 5 | HALT |
| 2 | 3, 5, 13 | ×9/2 |
| 3 | 5, 7, 13 | ×25/3 |
| 4 | 3, 13 | ×13/2 |
| 5 | 7, 11, 13 | ×49/5 |
| 6 | 5, 13 | ×17/3 |
| 7 | 7, 13 | ×19/5 |
| 8 | 13 | ×121/7 |
| 9 | 5, 17 | ×1/13 |
| 10 | 17 | ×3/5 |
| 11 | 7, 19 | ×1/17 |
| 12 | 19 | ×5/7 |
| 13 | 11 | ×1/19 |
| 14 | (default) | ×7/11 |

Each rule is lowered into:
- **test_ndiv(p)** (non-destructive divisibility test, O(p²) pc)
- **div_p** / **mul_p** (single-constant divide/multiply, O(p) pc each)

## Scale (initial_a=1)

- 5350 unique pc values
- ~5350 catch-all rules + ~360 zb='x' + ~270 zb='y' Haskell lines
- Uniform 4 block-types: all normal blocks have the same port layout, etc.

Initial_a=1 is solvable in BFS (path length ~390 in directed mode) since
the Gödel result is only x=9.  initial_a >= 2 is uncomputable in this
universe because the intermediate Gödel numbers blow up pentation-fast.
