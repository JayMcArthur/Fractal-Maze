import RepeatedMaze.Chain
import RepeatedMaze.Comp
import RepeatedMaze.Undirected

/-!
# Main theorem: reachability in 4-block-type mazes is undecidable

The reduction `mazeOf : ℕ → Maze` is computable and satisfies
`Solvable (mazeOf m) ↔ (fU m).Dom`, where `fU m = eval (ofNat Code m) 0`
has a non-computable domain (Mathlib's halting problem).
-/

namespace RepeatedMaze

open Chain StateTransition CM

noncomputable instance : DecidableEq Chain.Λ0 := Classical.decEq _

/-- The fixed 3-counter program simulating the fixed TM0 machine `M0`. -/
noncomputable def P0 := TM0Sim.prog M0 S0 ss0 c0 cell

/-- The reduction. -/
noncomputable def mazeOf (m : ℕ) : Maze :=
  MazeCM.toMaze (Assemble.finalProg P0 TM0Sim.St.l0 m)

theorem mazeOf_iff (m : ℕ) : Solvable (mazeOf m) ↔ (fU m).Dom := by
  rw [mazeOf, Assemble.solvable_iff, P0, TM0Sim.dom_iff M0 S0 ss0 c0 cell two_le_card m,
    ← input_eq, tm0_dom, cU_dom]

theorem mazeOf_computable : Computable mazeOf :=
  Comp.maze_computable _ _ _

theorem directed_undecidable : DirectedUndecidable := by
  intro h
  exact fU_undec (ComputablePred.computable_of_manyOneReducible
    ⟨mazeOf, mazeOf_computable, fun m => (mazeOf_iff m).symm⟩ h)

theorem undirected_undecidable : UndirectedUndecidable := by
  intro h
  exact fU_undec (ComputablePred.computable_of_manyOneReducible
    ⟨mazeOf, mazeOf_computable, fun m =>
      ((Undirected.usolvable_iff _).trans (mazeOf_iff m)).symm⟩ h)

end RepeatedMaze

#print axioms RepeatedMaze.undirected_undecidable
#print axioms RepeatedMaze.directed_undecidable
