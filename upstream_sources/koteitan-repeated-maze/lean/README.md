[← Back](../README.md) | [English](README.md) | [Japanese](README-ja.md)

# Formal proofs about repeated mazes

This directory collects results proved in Lean 4 + Mathlib about pattern-repeating mazes built from four block types (normal / nx / ny / zero).

## Main theorem

**The largest shortest-path length $`L(n)`$ over mazes with at most $`n`$ ports is not bounded above by any computable function.**

```math
\forall f : \mathbb{N} \to \mathbb{N},\quad f \text{ is computable} \;\Longrightarrow\; \exists n \in \mathbb{N},\; L(n) > f(n)
```

Here "computable" means computable by a Turing machine that always halts. $`L(n)`$ is defined below. The proof also shows that $`L(n)`$ is a finite value (a maximum) for every $`n`$.

## Definitions

### Terminals and blocks

Let $`\Sigma = \{W, E, N, S, C\}`$ be the set of sides, and let a terminal be a pair of a side and an index, $`t = (\sigma, i) \in \Sigma \times \mathbb{N}`$. $`\sigma = C`$ is the inside of a block; the others are points on the west / east / north / south edge.

Blocks sit at grid points $`(x, y) \in \mathbb{N}^2`$, and the block type depends only on the position:

```math
\tau(x, y) =
\begin{cases}
\mathrm{zero} & (x = 0,\ y = 0) \cr
\mathrm{nx} & (x = 0,\ y \geq 1) \cr
\mathrm{ny} & (x \geq 1,\ y = 0) \cr
\mathrm{normal} & (x \geq 1,\ y \geq 1)
\end{cases}
```

### Mazes

A maze $`M`$ is a tuple of finite lists of ports $`P_b`$, one for each of the four block types $`b`$:

```math
M = (P_\mathrm{normal},\ P_\mathrm{nx},\ P_\mathrm{ny},\ P_\mathrm{zero}),\qquad P_b \in \big( (\Sigma \times \mathbb{N}) \times (\Sigma \times \mathbb{N}) \big)^{*}
```

A port $`(a, b) \in P_{\tau(x, y)}`$ is a one-way edge from terminal $`a`$ to terminal $`b`$ of block $`(x, y)`$. All blocks of the same type have the same ports.

### Points of the maze

The east edge of block $`(x, y)`$ is the same line as the west edge of block $`(x+1, y)`$, and its north edge is the same line as the south edge of block $`(x, y+1)`$. So the point $`\pi_{x,y}(t)`$ of the maze given by terminal $`t`$ of block $`(x, y)`$ is defined by

```math
\begin{aligned}
\pi_{x,y}(C, i) &= c(x, y, i) \cr
\pi_{x,y}(W, i) &= w(x, y, i) \cr
\pi_{x,y}(E, i) &= w(x+1, y, i) \cr
\pi_{x,y}(S, i) &= s(x, y, i) \cr
\pi_{x,y}(N, i) &= s(x, y+1, i)
\end{aligned}
```

$`c, w, s`$ are three distinct kinds of points; two points are equal only when their kind and arguments are equal.

### One move, start and goal

We write $`u \to_M v`$ when one move takes point $`u`$ to point $`v`$:

```math
u \to_M v \;:\Longleftrightarrow\; \exists x, y \in \mathbb{N},\ \exists (a, b) \in P_{\tau(x, y)},\quad \pi_{x,y}(a) = u \;\land\; \pi_{x,y}(b) = v
```

Start and goal are two points on the west edge of block $`(0, 0)`$:

```math
\mathrm{start} = w(0, 0, 0),\qquad \mathrm{goal} = w(0, 0, 1)
```

### Shortest path length

We write $`\mathrm{Reach}_M(k, v)`$ when $`v`$ is reached from $`\mathrm{start}`$ in exactly $`k`$ moves:

```math
\mathrm{Reach}_M(k, v) \;:\Longleftrightarrow\; \exists v_0, \ldots, v_k,\quad v_0 = \mathrm{start},\ v_k = v,\ \forall j < k,\ v_j \to_M v_{j+1}
```

A maze $`M`$ is **solvable** when $`\exists k,\ \mathrm{Reach}_M(k, \mathrm{goal})`$, and then its shortest path length is

```math
\mathrm{dist}(M) = \min \{\, k \in \mathbb{N} \mid \mathrm{Reach}_M(k, \mathrm{goal}) \,\}
```

(we set $`\mathrm{dist}(M) = 0`$ when $`M`$ is not solvable).

### Maze size and $`L(n)`$

The size $`|M|`$ of a maze is the total number of ports of the four block types:

```math
|M| = |P_\mathrm{normal}| + |P_\mathrm{nx}| + |P_\mathrm{ny}| + |P_\mathrm{zero}|
```

$`L(n)`$ is the largest shortest-path length among solvable mazes of size at most $`n`$:

```math
L(n) = \max \{\, \mathrm{dist}(M) \mid |M| \leq n,\ M \text{ is solvable} \,\}
```

Terminal indices can be arbitrarily large, so there are infinitely many mazes with $`|M| \leq n`$. But relabelling the terminal indices does not change the shortest path length, so this set is finite and the maximum exists.

## Related theorems

The same development also proves the following.

1. **Undecidability of reachability**: no algorithm takes a maze $`M`$ as input and decides whether $`M`$ is solvable.

   $`\neg\, \exists\, \text{algorithm } A,\quad \forall M,\ \big( A(M) = 1 \Longleftrightarrow \exists k,\ \mathrm{Reach}_M(k, \mathrm{goal}) \big)`$

2. **Undirected version**: if ports can be walked both ways (one move is $`u \to_M v \lor v \to_M u`$), the undecidability above and the main theorem still hold.

## Outline of the proof

1. Start from Mathlib's halting problem (whether a program halts cannot be decided).
2. Turn one fixed universal Turing machine into a 3-counter machine, and then, by Gödel numbering, into a 2-counter machine.
3. Turn the 2-counter machine into a maze of the four block types, so that "the maze is solvable ⇔ the machine halts".
4. If some computable $`f`$ satisfied $`L(n) \leq f(n)`$, checking "does the walk reach the goal within $`f(|M|)`$ moves" would decide whether the machine halts, contradicting the halting problem.

## Files

| File | Contents |
|---|---|
| `RepeatedMaze/Basic.lean` | Maze definitions and the undecidability statement |
| `RepeatedMaze/GrowthSpec.lean` | Definitions of $`\mathrm{dist}`$, $`\lvert M \rvert`$, $`L(n)`$ and the main theorem statement |
| `RepeatedMaze/Growth.lean` | Proof of the main theorem |
| `RepeatedMaze/Undecidable.lean` | Proof of undecidability |
| `RepeatedMaze/Relabel.lean` | Relabelling of terminal indices and finiteness of $`L(n)`$ |
| others | Counter machines, Gödel numbering, translation into mazes, etc. |

The proofs contain no `sorry` and use only Lean's standard axioms (`propext`, `Classical.choice`, `Quot.sound`).

# How to verify

## Setup

1. Install elan, the Lean version manager.

   ```sh
   curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | sh
   ```

   The Lean version (v4.33.1) is written in `lean/lean-toolchain`, and elan installs it automatically the first time `lake` runs below.

2. Clone this repository and enter `lean/`.

   ```sh
   git clone https://github.com/koteitan/repeated-maze.git
   cd repeated-maze/lean
   ```

3. Download the prebuilt Mathlib files. Building Mathlib from source takes hours, so use the prebuilt ones.

   ```sh
   lake exe cache get
   ```

## Verify

Run the following in `lean/`.

```sh
lake build
```

On success it ends with the line below, and the exit code is 0.

```
Build completed successfully (1021 jobs).
```

Along the way it prints the axioms used by each of the four theorems. Check that each uses only Lean's three standard axioms (no `sorryAx`).

```
'RepeatedMaze.undirected_undecidable' depends on axioms: [propext, Classical.choice, Quot.sound]
'RepeatedMaze.directed_undecidable' depends on axioms: [propext, Classical.choice, Quot.sound]
'RepeatedMaze.L_not_computably_bounded' depends on axioms: [propext, Classical.choice, Quot.sound]
'RepeatedMaze.UL_not_computably_bounded' depends on axioms: [propext, Classical.choice, Quot.sound]
```

The main theorem is `RepeatedMaze.L_not_computably_bounded`.
