[← Back](../README.md) | [English](README.md) | [Japanese](README-ja.md)

# hs2maze — State Machine to Maze Converter

Converts a Haskell-style state machine definition into a repeated-maze port string.
This provides a systematic way to encode any 2-register Minsky machine
(or similar state machine) as a repeated maze.

## Usage

```bash
python3 hs2maze.py [input.hs]          # maze string to stdout
python3 hs2maze.py input.hs 2>/dev/null | xargs -I{} \
  ../gen-maze/repeated-maze solve '{}' --bfs -v  # legacy-format only
```

Reads from stdin if no file is given. Diagnostics go to stderr.

## Input Format

```haskell
myfunc :: (Int, Int, Int) -> (Int, Int, Int)
myfunc (x, y, 0) = myfunc (x+1, y,   2)  -- x+1
myfunc (x, y, 2) = myfunc (x,   y+3, 3)  -- y+3
myfunc (x, y, 3) = myfunc (x-1, y,   1)  -- x-1, reach goal
```

Each line defines a transition `(x, y, pc_src) → (x', y', pc_dst)`:

- `x`, `y`: coordinate variables. Use `x+k`, `x-k`, `y+k`, `y-k`, or `_` (unchanged).
- `pc`: program counter (integer literal).
- Only **one** of dx, dy may be nonzero per line.
- `--` comments and `::` type signatures are ignored.

### Reserved PC Values

| PC | Role |
|---|---|
| 0 | Start state. Maps to W0@(1,1) = E0@(0,1). |
| 1 | Goal state. Maps to W1@(1,1) = E1@(0,1). |
| 2+ | User-defined states. |

The state machine must reach pc=1 with coordinates (0, 1) for the maze to have a solution.

## Minsky Register Machine

A **Minsky register machine** (counter machine) has:

- A finite set of **states** (program counter values) pc ∈ {0, 1, ..., n}
- Two non-negative integer **registers** x, y
- Each state has one instruction of the form:

| Instruction | Effect |
|---|---|
| INC(r, pc') | Increment register r by 1, go to state pc' |
| DEC(r, pc', pc'') | If r > 0: decrement r, go to pc'. If r = 0: go to pc'' |
| HALT | Stop execution |

Minsky proved that 2-register machines are **Turing complete** — they can compute
any computable function. This means the shortest path problem in repeated mazes
is undecidable in general.

### Encoding in hs2maze Format

INC and unconditional jumps map directly to transitions:

```haskell
-- INC x: x += 1
machine (x, y, 3) = machine (x+1, y, 4)

-- INC y: y += 1
machine (x, y, 5) = machine (x, y+1, 6)

-- DEC x (nonzero branch): x -= 1
machine (x, y, 7) = machine (x-1, y, 8)
```

**Zero-testing** (DEC with zero branch) requires nx/ny boundary blocks,
which hs2maze does not currently generate. For zero tests, add nx/ny ports manually
or design the state machine so that registers are never zero when decremented
(as in the [counter pump](../counter-pump/README.md)).

## Conversion Principle

### Canonical State Mapping

Every user state `(x, y, pc)` maps to the canonical maze state `(x, y, E, pc)`:

```
User state:  (x, y, pc)
Maze state:  (x, y, E, pc)   — E-type canonical state
Physical:    E[pc] @ block (x, y)  =  W[pc] @ block (x+1, y)
```

All user pc values occupy the **E/W terminal index** namespace.
The **N/S terminal index** namespace is used for intermediate states during y-movement.

### Movement Translation

Each state machine transition is translated into a chain of maze ports:

#### x+k (k maze steps)

Chain of W→E hops. Each hop crosses one block boundary eastward.

```
W[pc₀] → E[t₁],  W[t₁] → E[t₂],  ...,  W[tₖ₋₁] → E[pc_dst]
```

Example: x+1 from pc=0 to pc=2

```
Port: W0 → E2
Path: (0,1,E0) --[W0→E2]--> (1,1,E2)
```

#### x-k (k maze steps)

Chain of E→W hops. Each hop crosses one block boundary westward.

```
E[pc₀] → W[t₁],  E[t₁] → W[t₂],  ...,  E[tₖ₋₁] → W[pc_dst]
```

#### y+k (k+1 maze steps)

Requires switching from E/W boundary to N/S boundary and back.
Intermediate states use N/S terminal indices (separate namespace from E/W).

```
W[pc₀] → N[n₁],   S[n₁] → N[n₂],  ...,  S[nₖ] → W[pc_dst]
 (E→N switch)        (y+1 hops)            (N→E switch)
```

The path goes: east into a block, then north through k blocks, then west back.
Net displacement: (0, +k). The eastward and westward components cancel.

```
  block(x+1, y+k)
      ↑  ← S[nₖ]→W[dst] (exit west)
      |
  block(x+1, y+1)
      ↑  ← S[n₁]→N[n₂] (continue north)
      |
  block(x+1, y)
      ↑  ← W[src]→N[n₁] (enter, exit north)
      |
  block(x, y)   ← start: E[src] here
```

#### y-k (k+1 maze steps)

Same idea but southward:

```
W[pc₀] → S[n₁],   N[n₁] → S[n₂],  ...,  N[nₖ] → W[pc_dst]
```

#### noop / dx=0, dy=0 (2 maze steps)

Bounce east then west:

```
W[pc₀] → E[tmp],   E[tmp] → W[pc_dst]
```

### Step Cost Summary

| Movement | Maze steps | Port chain |
|---|---|---|
| x+k | k | W→E × k |
| x-k | k | E→W × k |
| y+k | k+1 | W→N, S→N × (k-1), S→W |
| y-k | k+1 | W→S, N→S × (k-1), N→W |
| noop | 2 | W→E, E→W |

### Terminal Index Allocation

- **E/W indices** 0, 1, ..., max_pc: user-defined pc values
- **E/W indices** max_pc+1, ...: intermediates for x-chains and noops
- **N/S indices** 0, 1, ...: intermediates for y-chains

The output nterm = max(max_ew_index + 1, max_ns_index + 1).

### Why All Entries Use the W-Side

Every transition's first port uses a `W[src]→...` entry (entering from the west side
of block (x+1, y)). This avoids the nx boundary block at x=0, where only E→E ports
exist. Since x+1 ≥ 1 always, the W-side entry is always in a normal block.

For x-k, the `E[src]→W[...]` port is used from block (x, y) as E-side entry.
This requires x > 0, which is guaranteed as long as the state machine doesn't
attempt negative x values.
