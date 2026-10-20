[Japanese](README-ja.md) | **English**

# Counter Pump System

A maze construction method for repeated-maze that maximizes shortest path length.
Uses the y-coordinate as a counter with slow accumulation and fast release asymmetry,
producing O(n²)~O(n³) path lengths from O(n) resources (nterm = n).

## Overview

The path consists of three phases:

```
Forward   ───→  Slowly accumulate y while moving east
Descent   ───→  Rapidly consume y via N0→S0 (1 step per y)
Return    ───→  Move west back to the goal
```

The asymmetry between accumulation rate ((n-2) gain / (n+2) steps) and release rate
(1y / 1 step) produces quadratic path length growth.

## Port Structure

For nterm = n (n ≥ 4), the following ports are set in the normal block.

### Forward Cycle Ports

Accumulate y via N/S terminal chains and bounce via E/W terminals.

```
W0 → N0          # Enter block from east, go to N0
N0 → N(n-2)      # Jump to high index
S(n-2) → N(n-3)  # y+1 (boundary cross)
S(n-3) → N(n-4)  # y+1
  ...
S2 → N1          # y+1
S1 → E(n-1)      # y+1, switch to E direction
E(n-1) → W(n-2)  # Go to west block (x-1)
W(n-2) → E0      # Return to east block (x+1)
```

Displacement per cycle: **(+1, +(n-2))**, steps: **n+2**

### Descent Ports

```
N0 → S0           # y-1 (within same block, to south wall)
```

### Return Ports (width w)

Westward chain to recover x, with S1 reducing y by 1.

```
N1 → W0           # x-1
E0 → W(n-1)       # x-1
E(n-1) → W(n-2)   # x-1 (shared with forward)
E(n-2) → W(n-3)   # x-1 (when w ≥ 4)
  ...
E(n-w+1) → W(n-w) # x-1 (last westward hop)
```

End of each sub-cycle:
- **Non-final**: `E(n-w) → S1` (y-1, continue to next sub-cycle)
- **Final**: `W(n-w) → W1` (reach goal, W1 = E1 at western block)

Displacement per sub-cycle: **(-w, -1)**, steps: **w+1**

### nx / ny Ports

```
nx: (none)
ny: (none)
```

## Examples

- [nterm=6, w=5](6.md) — 6 terminals per side, return width 5, path length 257
- [cp6.hs](cp6.hs) — Haskell BFS maze solver for the nterm=6 counter pump
- [cp6.txt](cp6.txt) — Maze string and path data

## nterm=5 Examples

### w=3 (path length 96)

```
normal: E0->W4, E4->W3, W0->N0, W3->E0, W3->W1, W3->W2,
        N0->N3, N0->S0, N1->E1, N1->W0,
        S0->E2, S1->E4, S2->N1, S3->N2, S3->W1, S3->W2, E3->S1;
nx: (none); ny: (none)
```

### w=4 (path length 129)

```
normal: W0->N0, N0->N3, N0->S0, S3->N2, S2->N1, S1->E4,
        E4->W3, W3->E0, N1->W0, E0->W4,
        E3->W2, E2->S1, W2->W1;
nx: (none); ny: (none)
```

## Diophantine Equations

### Displacement Vectors

| Phase | Displacement (Δx, Δy) | Steps | Count |
|---|---|---|---|
| Forward cycle | (+1, +(n-2)) | n+2 | f |
| Transition (E0→N0) | (+1, 0) | 1 | 1 |
| Descent | (0, -1) | 1 | d |
| Climb | (0, +(n-3)) | n-2 | 1 |
| Return (non-final) | (-w, -1) | w+1 | r |
| Return (final) | (-w, 0) | w+1 | 1 |

### Closure Conditions

From start (0,1) to goal (0,1), total displacement = (0,0):

```
x:  f + 1 - wr - w = 0            →  f = w(r + 1) - 1    ... (I)
y:  (n-2)f - d + (n-3) - r = 0    →  d = (n-2)f + (n-3) - r  ... (II)
```

### Boundary Conditions

y ≥ 1 after descent (y=0 is ny block, dead end):

```
d ≤ (n-2)f  →  (n-3) - r ≤ 0  →  r ≥ n - 3              ... (III)
```

### Total Steps

```
T = (n+2)f + 1 + d + (n-2) + (w+1)r + (w+1)
```

Substituting (I)(II) and simplifying:

```
T = w(2n² - 3n - 2) - 3
```

### Minimal Solution (minimized at r = n-3)

| Parameter | Value |
|---|---|
| r | n - 3 |
| f | w(n-2) - 1 |
| d | (n-2)²w - (n-2) |

## Path Length Table

| n | w=3 | w=4 | w=n-1 |
|---|---|---|---|
| 4 | 51 | 84 | 84 |
| 5 | 96 | 129 | 129 |
| 6 | 153 | 198 | 246 |
| 7 | 222 | 285 | 369 |
| 8 | 303 | 390 | 522 |
| 10 | 501 | 648 | 918 |

### Growth Order

```
w = 3 (fixed)   →  T = 6n² - 9n - 9  = Θ(n²)
w = Θ(n)        →  T = Θ(n³)
```

## Why Shortcuts Don't Occur

Widening w makes return ports (e.g., E3→W2) available during the forward phase.
However, using return ports during the forward phase causes **y-coordinate inconsistency**,
preventing arrival at the goal.

When attempting an early return from mid-forward cycle k (position near (k, 4+3k)):

```
Goal condition: x = 0, y = 1
Early return arrival: x = k - f(m), y = g(k, m)
```

The absence of integer solutions (k, m) satisfying the goal coordinates
eliminates shortcuts (non-integer solutions to the Diophantine equation).

## Design Principles

1. **Keep forward x-gain minimal (a=1)** — Increasing x reduces forward cycles, decreasing y accumulation
2. **Maximize forward y-gain (b=n-2)** — Use N/S chains to full extent
3. **Widen return width w** — w=3 gives Θ(n²), w=Θ(n) gives Θ(n³)
4. **Don't add unnecessary ports** — More ports make it easier for BFS to find shortcuts
5. **nx/ny ports are (none)** — Make boundary blocks dead ends to prevent escape to y<1 or x<1
