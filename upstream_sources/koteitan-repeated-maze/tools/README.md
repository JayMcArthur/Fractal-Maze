[← Back](../README.md) | [English](README.md) | [Japanese](README-ja.md)

# tools — Maze Compilation Toolchain

Python utilities for compiling Haskell-style state machines into
repeated-maze port strings and for executing them.

## Subtools

- [hs2maze](hs2maze/README.md) — Convert a 2-register Haskell state
  machine into an atomic-port (*1) maze string
  (`normal: ...; nx: ...; ny: ...; zero: ...`).
- [nd-to-2d](nd-to-2d/README.md) — Compile an *n*-register Haskell
  state machine into a 2-register Gödel-numbered Haskell, ready to be
  fed through `hs2maze`.
- [runhs](runhs/README.md) — Run a Haskell state machine (any arity)
  by wrapping it with a `main` driver and invoking `runghc`.
- [solver](solver/README.md) — Python BFS solver for the atomic-port
  (*1) format. The only solver that supports the new format.
- [gen-maze](gen-maze/README.md) — Search for maze configurations that
  maximize the shortest path length for a given nterm (C
  implementation, legacy format only). Also exposes legacy IDDFS / BFS
  solvers as a byproduct.

## Typical pipeline

```
(n-register Haskell)
   │  nd-to-2d/nd-to-2d.py
   ▼
(2-register Gödel Haskell)
   │  hs2maze/hs2maze.py
   ▼
(maze string: normal / nx / ny / zero)
   │  solver/solver.py
   ▼
(shortest path / HALT)
```

`runhs/runhs.py` is an orthogonal helper for quickly executing either
the *n*-register or 2-register Haskell and watching it halt.
