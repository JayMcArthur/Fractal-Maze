import Mathlib.Computability.StateTransition
import Mathlib.Logic.Function.Basic
import Mathlib.Logic.Relation
import Mathlib.Tactic.Ring

/-!
# Counter machines

A generic deterministic counter machine over a state type `σ` and a register type `ι`.
Instructions: `inc r q`, `dec r q z` (if `r = 0` go to `z`, else decrement and go to `q`),
and `halt`.  We also prove generic specifications of three loop macros:
`incChain`, `mulMove`, `divMove`.
-/

namespace RepeatedMaze
namespace CM

open StateTransition Relation

inductive Instr (σ ι : Type*) where
  | inc (r : ι) (q : σ)
  | dec (r : ι) (q z : σ)
  | halt

structure Cfg (σ ι : Type*) where
  q : σ
  v : ι → ℕ

variable {σ ι : Type*} [DecidableEq ι]

def step (P : σ → Instr σ ι) : Cfg σ ι → Option (Cfg σ ι)
  | ⟨q, v⟩ => match P q with
    | .inc r q' => some ⟨q', Function.update v r (v r + 1)⟩
    | .dec r q' z => if v r = 0 then some ⟨z, v⟩ else some ⟨q', Function.update v r (v r - 1)⟩
    | .halt => none

variable {P : σ → Instr σ ι}

theorem step_inc {q q' : σ} {r : ι} (h : P q = .inc r q') (v : ι → ℕ) :
    step P ⟨q, v⟩ = some ⟨q', Function.update v r (v r + 1)⟩ := by
  simp [step, h]

theorem step_dec_zero {q q' z : σ} {r : ι} (h : P q = .dec r q' z) {v : ι → ℕ} (hv : v r = 0) :
    step P ⟨q, v⟩ = some ⟨z, v⟩ := by
  simp [step, h, hv]

theorem step_dec_succ {q q' z : σ} {r : ι} (h : P q = .dec r q' z) {v : ι → ℕ} {n : ℕ}
    (hv : v r = n + 1) : step P ⟨q, v⟩ = some ⟨q', Function.update v r n⟩ := by
  simp [step, h, hv]

theorem step_halt {q : σ} (h : P q = .halt) (v : ι → ℕ) : step P ⟨q, v⟩ = none := by
  simp [step, h]

theorem reaches₁_of_step {a b : Cfg σ ι} (h : step P a = some b) : Reaches₁ (step P) a b :=
  TransGen.single h

/-- Rewriting the register valuation of the target of a reachability statement. -/
theorem reaches₁_congr {a : Cfg σ ι} {q : σ} {w w' : ι → ℕ} (h : Reaches₁ (step P) a ⟨q, w⟩)
    (e : ∀ k, w k = w' k) : Reaches₁ (step P) a ⟨q, w'⟩ := by
  have : w = w' := funext e
  subst this; exact h

theorem reaches_congr {a : Cfg σ ι} {q : σ} {w w' : ι → ℕ} (h : Reaches (step P) a ⟨q, w⟩)
    (e : ∀ k, w k = w' k) : Reaches (step P) a ⟨q, w'⟩ := by
  have : w = w' := funext e
  subst this; exact h

/-- A chain of `n` increments of register `r`. -/
theorem incChain (r : ι) (e : ℕ → σ) (n : ℕ) (h : ∀ i < n, P (e i) = .inc r (e (i + 1)))
    (v w : ι → ℕ) (hw : w r = v r + n) (ho : ∀ k, k ≠ r → w k = v k) :
    Reaches (step P) ⟨e 0, v⟩ ⟨e n, w⟩ := by
  induction n generalizing w with
  | zero =>
    apply reaches_congr ReflTransGen.refl
    intro k; by_cases hk : k = r
    · subst hk; omega
    · exact (ho k hk).symm
  | succ n ih =>
    have h1 := ih (fun i hi => h i (by omega)) (Function.update v r (v r + n))
      (by simp) (fun k hk => by simp [hk])
    refine h1.tail ?_
    show _ = _
    rw [step_inc (h n (by omega))]
    congr 2
    funext k; by_cases hk : k = r
    · subst hk; simp [hw]; omega
    · simp [hk, ho k hk]

/-- `mulMove src dst B`: `dst += B * src; src := 0`. -/
theorem mulMove (src dst : ι) (hsd : src ≠ dst) (B : ℕ) (loop exit : σ) (incT : ℕ → σ)
    (h1 : P loop = .dec src (incT 0) exit)
    (h2 : ∀ i < B, P (incT i) = .inc dst (incT (i + 1)))
    (h3 : incT B = loop) :
    ∀ v w : ι → ℕ, w src = 0 → w dst = v dst + B * v src → (∀ k, k ≠ src → k ≠ dst → w k = v k) →
      Reaches₁ (step P) ⟨loop, v⟩ ⟨exit, w⟩ := by
  intro v
  induction hn : v src generalizing v with
  | zero =>
    intro w hw1 hw2 hw3
    apply reaches₁_congr (reaches₁_of_step (step_dec_zero h1 hn))
    intro k
    by_cases hk1 : k = src
    · subst hk1; omega
    by_cases hk2 : k = dst
    · subst hk2; simp [hw2, hn]
    · exact (hw3 k hk1 hk2).symm
  | succ n ih =>
    intro w hw1 hw2 hw3
    have s1 := reaches₁_of_step (step_dec_succ h1 hn)
    set v1 := Function.update v src n
    have s2 := incChain (P := P) dst incT B h2 v1 (Function.update v1 dst (v1 dst + B)) (by simp)
      (fun k hk => by simp [hk])
    rw [h3] at s2
    have s3 := ih (Function.update v1 dst (v1 dst + B)) (by simp [v1, hsd, Ne.symm hsd]) w hw1
      (by simp [v1, Ne.symm hsd, hw2, hn]; ring) (fun k hk1 hk2 => by simp [v1, hk1, hk2, hw3 k hk1 hk2])
    exact (s1.trans_left s2).trans s3

/-- `divMove src dst B`: `dst += src / B; src := 0`, exit labelled by `src % B`. -/
theorem divMove (src dst : ι) (hsd : src ≠ dst) (B : ℕ) (hB : 0 < B) (cnt exit : ℕ → σ)
    (h1 : ∀ j < B, P (cnt j) = .dec src (cnt (j + 1)) (exit j))
    (h2 : P (cnt B) = .inc dst (cnt 0)) :
    ∀ j < B, ∀ v w : ι → ℕ, w src = 0 → w dst = v dst + (j + v src) / B →
      (∀ k, k ≠ src → k ≠ dst → w k = v k) →
      Reaches₁ (step P) ⟨cnt j, v⟩ ⟨exit ((j + v src) % B), w⟩ := by
  intro j hj v
  induction hn : v src generalizing v j with
  | zero =>
    intro w hw1 hw2 hw3
    rw [Nat.add_zero, Nat.mod_eq_of_lt hj]
    apply reaches₁_congr (reaches₁_of_step (step_dec_zero (h1 j hj) hn))
    intro k
    by_cases hk1 : k = src
    · subst hk1; omega
    by_cases hk2 : k = dst
    · subst hk2; simp [hw2, Nat.div_eq_of_lt hj]
    · exact (hw3 k hk1 hk2).symm
  | succ n ih =>
    intro w hw1 hw2 hw3
    have s1 := reaches₁_of_step (step_dec_succ (h1 j hj) hn)
    set v1 := Function.update v src n
    by_cases hjB : j + 1 < B
    · have s2 := ih (j + 1) hjB v1 (by simp [v1]) w hw1
        (by simp [v1, Ne.symm hsd, hw2]; rw [show j + 1 + n = j + (n + 1) by omega])
        (fun k hk1 hk2 => by simp [v1, hk1, hw3 k hk1 hk2])
      have e : j + 1 + n = j + (n + 1) := by omega
      rw [e] at s2
      exact s1.trans s2
    · have hjB' : j + 1 = B := by omega
      rw [hjB'] at s1
      have s2 := reaches₁_of_step (P := P) (step_inc h2 v1)
      set v2 := Function.update v1 dst (v1 dst + 1)
      have s3 := ih 0 hB v2 (by simp [v2, v1, hsd]) w hw1
        (by
          simp [v2, v1, Ne.symm hsd, hw2]
          rw [show j + (n + 1) = n + 1 * B by omega, Nat.add_mul_div_right _ _ hB]; ring)
        (fun k hk1 hk2 => by simp [v2, v1, hk1, hk2, hw3 k hk1 hk2])
      have e : (0 + n) % B = (j + (n + 1)) % B := by
        rw [show j + (n + 1) = n + 1 * B by omega, Nat.add_mul_mod_self_right]; simp
      rw [e] at s3
      exact (s1.trans s2).trans s3

end CM
end RepeatedMaze
