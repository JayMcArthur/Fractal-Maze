import Mathlib.Computability.Halting
import Mathlib.Logic.Relation
import Mathlib.Data.Fin.VecNotation
import Mathlib.Tactic.FinCases

/-!
# Pattern-repeating mazes with four block types

This file fixes the *statement* of the main theorem.  It mirrors the maze
format of `article/main.md` §3 and `tools/hs2maze/hs2maze.py`:

* Blocks sit at grid points `(x, y)` with `x y : ℕ`.
* The block type depends only on the position:
  `zero` at `(0,0)`, `nx` on the left column `x = 0, y ≥ 1`,
  `ny` on the bottom row `x ≥ 1, y = 0`, `normal` elsewhere.
* Every block of the same type carries the same finite list of ports.
  A port is a directed edge between two terminals of the block.
* A terminal is a side (`W E N S` on the boundary, `C` inside) and an index.
  The east terminal `E i` of block `(x, y)` is the same point as the west
  terminal `W i` of block `(x+1, y)`; likewise `N i` of `(x, y)` is `S i`
  of `(x, y+1)`.  `Vert` names every point once.
* Start is `W 0` of block `(0,0)`; goal is `W 1` of block `(0,0)`.

DO NOT EDIT: the proof files must prove `DirectedUndecidable` (and, as a
stretch goal, `UndirectedUndecidable`) exactly as stated here.
-/

namespace RepeatedMaze

/-- Side of a terminal inside a block. -/
inductive Side
  | W | E | N | S | C
  deriving DecidableEq, Repr

/-- A terminal of a block: a side and an index. -/
structure Term where
  side : Side
  idx : ℕ
  deriving DecidableEq, Repr

/-- The four block types. -/
inductive BlockType
  | normal | nx | ny | zero
  deriving DecidableEq, Repr

/-- The block type is fixed by the position. -/
def blockType (x y : ℕ) : BlockType :=
  if x = 0 then (if y = 0 then .zero else .nx) else (if y = 0 then .ny else .normal)

/-- A maze: one list of directed ports for each block type. -/
structure Maze where
  normal : List (Term × Term)
  nx : List (Term × Term)
  ny : List (Term × Term)
  zero : List (Term × Term)

/-- The ports of a block type. -/
def Maze.ports (m : Maze) : BlockType → List (Term × Term)
  | .normal => m.normal
  | .nx => m.nx
  | .ny => m.ny
  | .zero => m.zero

/-- Global points of the maze.  `E`/`N` terminals are stored as the
`W`/`S` terminal of the neighbouring block. -/
inductive Vert
  | c (x y i : ℕ)
  | w (x y i : ℕ)
  | s (x y i : ℕ)
  deriving DecidableEq, Repr

/-- The global point of terminal `t` of block `(x, y)`. -/
def place (x y : ℕ) : Term → Vert
  | ⟨.C, i⟩ => .c x y i
  | ⟨.W, i⟩ => .w x y i
  | ⟨.E, i⟩ => .w (x + 1) y i
  | ⟨.S, i⟩ => .s x y i
  | ⟨.N, i⟩ => .s x (y + 1) i

/-- One move along a port of some block. -/
def Step (m : Maze) (u v : Vert) : Prop :=
  ∃ x y : ℕ, ∃ a b : Term,
    (a, b) ∈ m.ports (blockType x y) ∧ place x y a = u ∧ place x y b = v

/-- Start: `W 0` of block `(0,0)`. -/
def start : Vert := .w 0 0 0

/-- Goal: `W 1` of block `(0,0)`. -/
def goal : Vert := .w 0 0 1

/-- Directed reading: ports are one-way. -/
def Solvable (m : Maze) : Prop :=
  Relation.ReflTransGen (Step m) start goal

/-- Undirected reading: every port can be walked both ways. -/
def USolvable (m : Maze) : Prop :=
  Relation.ReflTransGen (fun u v => Step m u v ∨ Step m v u) start goal

/-! ## Encoding mazes as natural numbers -/

/-- `Side ≃ Fin 5`. -/
def sideEquiv : Side ≃ Fin 5 where
  toFun
    | .W => 0 | .E => 1 | .N => 2 | .S => 3 | .C => 4
  invFun i := ![Side.W, Side.E, Side.N, Side.S, Side.C] i
  left_inv s := by cases s <;> rfl
  right_inv i := by fin_cases i <;> rfl

instance : Primcodable Side := Primcodable.ofEquiv _ sideEquiv

/-- `Term ≃ Side × ℕ`. -/
def termEquiv : Term ≃ Side × ℕ where
  toFun t := (t.side, t.idx)
  invFun p := ⟨p.1, p.2⟩
  left_inv _ := rfl
  right_inv _ := rfl

instance : Primcodable Term := Primcodable.ofEquiv _ termEquiv

/-- A maze is four port lists. -/
def mazeEquiv : Maze ≃
    List (Term × Term) × List (Term × Term) × List (Term × Term) × List (Term × Term) where
  toFun m := (m.normal, m.nx, m.ny, m.zero)
  invFun p := ⟨p.1, p.2.1, p.2.2.1, p.2.2.2⟩
  left_inv _ := rfl
  right_inv _ := rfl

instance : Primcodable Maze := Primcodable.ofEquiv _ mazeEquiv

/-! ## The statements to prove -/

/-- **Main target.** No algorithm decides, for a 4-block-type maze,
whether the goal is reachable from the start (directed ports). -/
def DirectedUndecidable : Prop := ¬ ComputablePred Solvable

/-- **Stretch target.** The same for the undirected reading. -/
def UndirectedUndecidable : Prop := ¬ ComputablePred USolvable

end RepeatedMaze
