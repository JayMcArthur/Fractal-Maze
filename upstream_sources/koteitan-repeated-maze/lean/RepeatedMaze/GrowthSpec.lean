import RepeatedMaze.Basic
import Mathlib.Order.Lattice.Nat

/-!
# Statement: the largest shortest-path length is not computably bounded

DO NOT EDIT: proof files must prove `LNotComputablyBounded` (and, as a
stretch goal, `ULNotComputablyBounded`) exactly as stated here.
-/

namespace RepeatedMaze

/-- Size of a maze: the total number of ports of the four block types. -/
def Maze.size (m : Maze) : ℕ :=
  m.normal.length + m.nx.length + m.ny.length + m.zero.length

/-- `ReachIn m k v`: `v` is reachable from `start` in exactly `k` moves. -/
inductive ReachIn (m : Maze) : ℕ → Vert → Prop
  | zero : ReachIn m 0 start
  | succ {k : ℕ} {u v : Vert} : ReachIn m k u → Step m u v → ReachIn m (k + 1) v

/-- Shortest path length from start to goal (`0` if there is none). -/
noncomputable def dist (m : Maze) : ℕ := by
  classical
  exact if h : ∃ k, ReachIn m k goal then Nat.find h else 0

/-- `L n`: the largest shortest-path length over solvable mazes with at
most `n` ports. -/
noncomputable def L (n : ℕ) : ℕ :=
  sSup {d | ∃ m : Maze, m.size ≤ n ∧ Solvable m ∧ dist m = d}

/-- **Main target.** No computable function bounds `L`. -/
def LNotComputablyBounded : Prop :=
  ∀ f : ℕ → ℕ, Computable f → ¬ ∀ n, L n ≤ f n

/-- Undirected one-move relation. -/
def UStep (m : Maze) (u v : Vert) : Prop := Step m u v ∨ Step m v u

/-- `UReachIn m k v`: undirected, exactly `k` moves. -/
inductive UReachIn (m : Maze) : ℕ → Vert → Prop
  | zero : UReachIn m 0 start
  | succ {k : ℕ} {u v : Vert} : UReachIn m k u → UStep m u v → UReachIn m (k + 1) v

/-- Undirected shortest path length (`0` if there is none). -/
noncomputable def udist (m : Maze) : ℕ := by
  classical
  exact if h : ∃ k, UReachIn m k goal then Nat.find h else 0

/-- Undirected version of `L`. -/
noncomputable def UL (n : ℕ) : ℕ :=
  sSup {d | ∃ m : Maze, m.size ≤ n ∧ USolvable m ∧ udist m = d}

/-- **Stretch target.** No computable function bounds `UL`. -/
def ULNotComputablyBounded : Prop :=
  ∀ f : ℕ → ℕ, Computable f → ¬ ∀ n, UL n ≤ f n

end RepeatedMaze
