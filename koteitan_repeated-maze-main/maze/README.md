[Japanese](README-ja.md) | **English**

# Maze Constructions

Known construction methods for repeated mazes that produce long shortest paths.

## Constructions

- [Counter Pump](counter-pump/README.md) — Uses asymmetric y-coordinate accumulation and release. Achieves O(n²) path length with fixed return width, or O(n³) with return width proportional to nterm.
- [Minsky Doubling Machine](minsky-doubling/README.md) — Encodes a 2-counter Minsky register machine that computes 2^k. Achieves exponential path length O(2^{nterm/12}) but requires nterm = O(k) terminals.

## Tools

- [hs2maze](hs2maze/README.md) — Converts Haskell-style state machine definitions (Minsky register machines, etc.) into repeated-maze port strings.
