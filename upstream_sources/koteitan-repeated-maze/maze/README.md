[Japanese](README-ja.md) | **English**

# Maze Constructions

Known construction methods for repeated mazes that produce long shortest paths.

## Constructions

- [Counter Pump (cp2)](counter-pump/README.md) — 2-register Minsky machine that accumulates and drains the y coordinate up to n². O(n²) path length with fixed return width.
- [Counter Pump 3-stage (cp3)](counter-pump-3/) — 3-register triple-nested loop. Generate the 3-register Haskell with `make-cp3.py`, then pipe through `nd-to-2d.py` → `hs2maze.py` for O(n³).
- [Minsky Doubling Machine](minsky-doubling/README.md) — Repeats y ↦ 2y+1 for k cycles, implementing the doubling via x↔y transfer. O(2^k) path length.
- [Pentation Maze (penta)](penta/README.md) — 2-register Gödel-encoded Minsky machine that computes pentation via 14 Fractran-style rules. Ω(2↑↑↑n) path length on uniform 4-block-types.

## Building blocks used by each construction

Each construction is a register machine; at the rule level all of them only need `INC` / `DEC` and a zero-test branch (the Minsky primitives). The difference is in *what they ultimately compute* and *how they implement it* (loop depth, register-transfer pattern, Gödel encoding).

| Construction | INC/DEC ±1 | Zero test (=0 branch) | Nested loops | x↔y transfer | Arithmetic (× p / ÷ p / mod p) | What it computes | Path length |
|---|---|---|---|---|---|---|---|
| counter-pump (cp2)         | ✓ | ✓ | 2-level     | –                | –                | accumulates y up to n²      | O(n²) |
| counter-pump-3 (cp3)       | ✓ | ✓ | 3-level     | –                | –                | fires inner DEC z exactly n³ times | O(n³) |
| minsky-doubling (md)       | ✓ | ✓ | k iterations | ✓                | –                | applies y ↦ 2y+1 k times (= 2^{k+1}−1) | O(2^k) |
| pentation (penta)          | ✓ | ✓ | (Fractran loop) | ✓ | ✓ (via Gödel encoding) | computes 2↑↑↑n via 14 Fractran-style rules on Gödel-encoded x | Ω(2↑↑↑n) |
| nd-to-2d (output)          | ✓ | ✓ | (depends on input) | ✓ | ✓ (via Gödel encoding) | re-encodes an n-register Minsky machine into a 2-register Gödel form | (depends on input) |

`nd-to-2d` itself is not a construction but a **compiler** that lowers an n-register Minsky Haskell source into a 2-register Gödel-encoded form (the input format hs2maze accepts). In the compiled output, every original `INC r_i` / `DEC r_i` / LHS-zero pattern `(... 0 ...)` macro-expands into x := x · p_i / x := x ÷ p_i / a divisibility test x mod p_i = 0 respectively, where p_i is the i-th prime (2, 3, 5, …). The "nd-to-2d (output)" row above describes that macro layer.

## Tools

- [hs2maze](../tools/hs2maze/README.md) — Converts Haskell-style state machine definitions (Minsky register machines, etc.) into repeated-maze port strings.
- [nd-to-2d](../tools/nd-to-2d/README.md) — Compiles n-register Minsky Haskell sources into the 2-register Gödel-encoded form (produces the "nd-to-2d (output)" row of the table above).
- [runhs](../tools/runhs/README.md) — Wrapper that runs `hs2maze` / `nd-to-2d` style Haskell files under `runghc` (with HALT-aware tracing).
