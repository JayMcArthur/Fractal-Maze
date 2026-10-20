import RepeatedMaze.TM0Sim
import Mathlib.Computability.TuringMachine.ToPartrec
import Mathlib.Computability.Halting
import Mathlib.Computability.PartrecBasis
import Mathlib.Computability.Reduce
import Mathlib.Data.Num.Lemmas

/-!
# The chain from Mathlib's halting problem to a fixed TM0 machine

* `fU m := eval (ofNat Code m) 0`; its domain is not computable.
* `cU`: a `ToPartrec.Code` with `cU.eval [m] = pure <$> fU m`.
* `PartrecToTM2`, `TM2to1`, `TM1to0` give a finitely supported `TM0` machine `M0`
  that halts on `trInit main (trList [m])` iff `fU m` is defined.
-/

namespace RepeatedMaze
namespace Chain

open Turing StateTransition

/-! ### An undecidable domain -/

def fU (m : ℕ) : Part ℕ := Nat.Partrec.Code.eval (Denumerable.ofNat Nat.Partrec.Code m) 0

theorem fU_partrec : Partrec fU :=
  Nat.Partrec.Code.eval_part.comp (Computable.ofNat _) (Computable.const 0)

theorem fU_undec : ¬ ComputablePred (fun m => (fU m).Dom) := by
  intro h
  apply ComputablePred.halting_problem 0
  refine ComputablePred.computable_of_manyOneReducible ⟨Encodable.encode, Computable.encode, ?_⟩ h
  intro c
  simp [fU]

/-! ### A `ToPartrec` code -/

theorem exists_cU : ∃ c : ToPartrec.Code, ∀ v : List.Vector ℕ 1,
    c.eval v.1 = pure <$> fU v.head :=
  ToPartrec.Code.exists_code (Nat.Partrec'.part_iff₁.2 fU_partrec)

noncomputable def cU : ToPartrec.Code := Classical.choose exists_cU

theorem cU_dom (m : ℕ) : (cU.eval [m]).Dom ↔ (fU m).Dom := by
  have := Classical.choose_spec exists_cU ⟨[m], rfl⟩
  simp only [List.Vector.head] at this
  change (cU.eval [m]).Dom ↔ _
  rw [show cU.eval [m] = pure <$> fU m from this]
  simp

/-! ### TM2 -/

open PartrecToTM2

/-- Labels of the TM2 machine, with the start label as default. -/
def Lab : Type := PartrecToTM2.Λ'

noncomputable instance : Inhabited Lab := ⟨trNormal cU Cont'.halt⟩

instance : Fintype K' :=
  ⟨{K'.main, K'.rev, K'.aux, K'.stack}, by intro x; cases x <;> simp⟩

noncomputable def M2 : Lab → TM2.Stmt (fun _ : K' => Γ') Lab (Option Γ') := PartrecToTM2.tr

theorem ss2 : TM2.Supports M2 (codeSupp cU Cont'.halt) := tr_supports cU Cont'.halt

theorem init_eq (v : List ℕ) :
    PartrecToTM2.init cU v = TM2.init (Λ := Lab) (σ := Option Γ') K'.main (trList v) := by
  simp only [PartrecToTM2.init, TM2.init]
  congr 1
  funext k
  cases k <;> rfl

theorem tm2_dom (v : List ℕ) : (TM2.eval M2 K'.main (trList v)).Dom ↔ (cU.eval v).Dom := by
  have := PartrecToTM2.tr_eval cU v
  rw [init_eq] at this
  simp only [TM2.eval, Part.map_Dom]
  change (StateTransition.eval (TM2.step PartrecToTM2.tr) _).Dom ↔ _
  rw [this]; simp

/-! ### TM1 and TM0 -/

abbrev Γ0 : Type := TM2to1.Γ' K' (fun _ : K' => Γ')

instance : Fintype Γ0 := inferInstanceAs (Fintype (Bool × (K' → Option Γ')))
instance : DecidableEq Γ0 := inferInstanceAs (DecidableEq (Bool × (K' → Option Γ')))

noncomputable def M1 := TM2to1.tr M2

noncomputable def S1 := TM2to1.trSupp M2 (codeSupp cU Cont'.halt)

theorem ss1 : TM1.Supports M1 S1 := TM2to1.tr_supports M2 ss2

noncomputable def M0 := TM1to0.tr M1

abbrev Λ0 := TM1to0.Λ' M1

noncomputable def S0 : Finset Λ0 := TM1to0.trStmts M1 S1

theorem ss0 : TM0.Supports M0 ↑S0 := TM1to0.tr_supports M1 ss1

theorem tm0_dom (v : List ℕ) :
    (StateTransition.eval (TM0.step M0) (TM0.init (TM2to1.trInit K'.main (trList v)))).Dom ↔
      (cU.eval v).Dom := by
  rw [← tm2_dom, ← TM2to1.tr_eval_dom]
  have := TM1to0.tr_eval M1 (TM2to1.trInit K'.main (trList v))
  change _ ↔ (TM1.eval M1 _).Dom
  rw [← this]
  simp only [TM0.eval, Part.map_Dom]
  rfl

/-! ### The input tape in the form expected by `TM0Sim` -/

def bitSym (b : Bool) : Γ' := if b then Γ'.bit1 else Γ'.bit0

theorem trPosNum_eq (p : PosNum) : trPosNum p = (Nat.bits p).map bitSym := by
  induction p with
  | one => simp [trPosNum, bitSym]
  | bit1 p ih =>
    rw [trPosNum, ih, PosNum.cast_bit1, show (p : ℕ) + p + 1 = 2 * p + 1 by ring,
      Nat.bit1_bits]
    simp [bitSym]
  | bit0 p ih =>
    have hp : (p : ℕ) ≠ 0 := (PosNum.cast_pos p).ne'
    rw [trPosNum, ih, PosNum.cast_bit0, show (p : ℕ) + p = 2 * p by ring, Nat.bit0_bits _ hp]
    simp [bitSym]

theorem trNum_eq (n : Num) : trNum n = (Nat.bits n).map bitSym := by
  cases n with
  | zero => simp [trNum]
  | pos p => simp [trNum, trPosNum_eq]

theorem trNat_eq (m : ℕ) : trNat m = (Nat.bits m).map bitSym := by
  rw [trNat, trNum_eq, Num.to_of_nat]

def cellOf (a : Γ') : Γ0 := (false, Function.update (fun _ => none) K'.main (some a))

def c0 : Γ0 := (true, Function.update (fun _ => none) K'.main (some Γ'.cons))

def cell (b : Bool) : Γ0 := cellOf (bitSym b)

theorem trInit_snoc (l : List Γ') (x : Γ') :
    TM2to1.trInit K'.main (l ++ [x]) =
      ((true, (cellOf x).2) : Γ0) :: (l.reverse.map cellOf : List Γ0) := by
  simp only [TM2to1.trInit, List.reverse_append]
  rfl

theorem input_eq (m : ℕ) :
    TM2to1.trInit K'.main (trList [m]) = c0 :: ((Nat.bits m).map cell).reverse := by
  have : trList [m] = trNat m ++ [Γ'.cons] := by simp [trList]
  rw [this, trInit_snoc, trNat_eq, List.map_reverse, List.map_map]
  rfl

theorem two_le_card : 2 ≤ Fintype.card Γ0 := by
  have : Fintype.card Bool ≤ Fintype.card Γ0 :=
    Fintype.card_le_of_injective (fun b : Bool => ((b, fun _ => none) : Γ0))
      (by intro a b h; simpa using congrArg Prod.fst h)
  simpa using this

end Chain
end RepeatedMaze
