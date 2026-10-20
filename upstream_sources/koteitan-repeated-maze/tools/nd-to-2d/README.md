[← Back](../README.md) | [English](README.md) | [Japanese](README-ja.md)

# nd-to-2d — n-register to 2-register Gödel-numbering compiler

`nd-to-2d.py` compiles an *n*-register Minsky-style Haskell state machine into a
**2-register Gödel-numbered** Haskell state machine suitable for
`hs2maze.py`. The 2-register form encodes all *n* registers into a single
Gödel number

> *x* = p<sub>0</sub><sup>r<sub>0</sub></sup> · p<sub>1</sub><sup>r<sub>1</sub></sup> · … · p<sub>n−1</sub><sup>r<sub>n−1</sub></sup>

where *p*<sub>0</sub> = 2, *p*<sub>1</sub> = 3, … are the first *n* primes.
The second register *y* is used as a scratch counter for multiplication /
division / divisibility-test subroutines.

## Pipeline

```
(n-register Haskell)
   │  nd-to-2d.py
   ▼
(2-register Haskell)
   │  hs2maze.py
   ▼
(uniform normal + nx + ny maze)
```

## Status

- [x] **Part 1 — Parser**: reads an *n*-register Haskell file and exposes
      its rules as an AST.  `python3 nd-to-2d.py input.hs --parse` dumps the
      parsed rules.
- [x] **Part 2 — Compiler**: emits 2-register Gödel-encoded Haskell on
      stdout and the required nx / ny / bridge ports as a comment block.
      Run with no flag: `python3 nd-to-2d.py input.hs > output_godel.hs`.

## Input grammar

```haskell
FN :: (Int, Int, ..., Int) -> (Int, Int, ..., Int)
FN (pat_0, pat_1, ..., pat_{n-1}, pat_pc) = FN  (rhs_0, ..., rhs_{n-1}, rhs_pc)
FN (...)                                  = (...)     -- HALT (no FN prefix)
```

LHS slot patterns:

| Pattern  | Meaning                               |
|----------|---------------------------------------|
| `var`    | identifier, captures any value        |
| `_`      | wildcard, no capture                  |
| `0`      | zero-test (this register must be 0)   |
| `k` (int)| strict literal test (rarely used)     |

RHS slot expressions:

| Expression    | Meaning                                 |
|---------------|-----------------------------------------|
| `var`         | unchanged                               |
| `var + k`     | increment by *k*                        |
| `var - k`     | decrement by *k*                        |
| `k` (int)     | absolute assignment *r<sub>i</sub> := k*|

The PC slot in both LHS and RHS must be an integer literal.

## Example

```bash
# Parse-only dump
python3 nd-to-2d.py examples/cp_n3.hs --parse

# Compile to 2-register Gödel-encoded Haskell
python3 nd-to-2d.py examples/cp_n3.hs > cp_n3_godel.hs

# Feed into hs2maze (produces the normal-block port list)
python3 ../hs2maze.py cp_n3_godel.hs > cp_n3.maze
```

For the 3-register *n*³ counter pump (`examples/cp_n3.hs`, 15 rules),
the pipeline currently produces:

| Stage | Size |
|---|---|
| `cp_n3.hs` | 15 rules |
| `cp_n3_godel.hs` | 210 pc, 211 main + 34 nx + 25 ny equations |
| `cp_n3.maze` | 403 ports (344 normal + 34 nx + 25 ny), nterm = 254 |

Zero-branch rules (`(0, y, pc) = ...` and `(x, 0, pc) = ...`) in the
2-register Haskell are recognised by the extended `hs2maze.py` and
automatically turned into nx / ny ports plus bridges.  No manual
post-processing is required.

## Directory

- `nd-to-2d.py` — the tool (currently parser-only).
- `examples/cp_n3.hs` — 3-register *n*³ counter pump used for parser
  testing.  (Intended compile target once Part 2 is implemented.)
