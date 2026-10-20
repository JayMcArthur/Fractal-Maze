import RepeatedMaze.Godel
import Mathlib.Data.Fintype.EquivFin
import Mathlib.Data.Fin.VecNotation
import Mathlib.Algebra.BigOperators.Fin
import Mathlib.Data.List.GetD

/-!
# Assembling a list program: fixed part + input loader

Given a finite-state two-counter program `Q : τ → Instr τ Bool` and a target state `t0`,
`fullProg Q t0 m` is a list program: index `0` jumps to the loader, indices `1..n` hold `Q`
(relabelled by an equivalence `τ ≃ Fin n`), and the loader sets `x := 5^m`, `y := 0` and
jumps to `t0`.
-/

namespace RepeatedMaze
namespace Assemble

open CM StateTransition Relation MazeCM

def Instr.map {σ τ ι : Type*} (f : σ → τ) : Instr σ ι → Instr τ ι
  | .inc r q => .inc r (f q)
  | .dec r q z => .dec r (f q) (f z)
  | .halt => .halt

/-! ### The loader -/

/-- One gadget `x := 5 * x` starting at absolute index `b` (8 instructions). -/
def gI (b j : ℕ) : Instr ℕ Bool :=
  if j = 0 then .dec false (b + 1) (b + 6)
  else if j < 5 then .inc true (b + j + 1)
  else if j = 5 then .inc true b
  else if j = 6 then .dec true (b + 7) (b + 8)
  else .inc false (b + 6)

/-- Loader instruction number `k` (absolute index `base + k`). -/
def ldI (base t m k : ℕ) : Instr ℕ Bool :=
  if k = 0 then .inc false (base + 1)
  else if k < 8 * m + 1 then gI (base + 1 + 8 * ((k - 1) / 8)) ((k - 1) % 8)
  else .dec true t t

def loader (base t m : ℕ) : List (Instr ℕ Bool) := (List.range (8 * m + 2)).map (ldI base t m)

/-! ### The fixed part -/

section fixed

variable {τ : Type*} [Fintype τ] [DecidableEq τ] (Q : τ → Instr τ Bool)

noncomputable def eqv : τ ≃ Fin (Fintype.card τ) := Fintype.equivFin τ

noncomputable def idx (s : τ) : ℕ := (eqv s : ℕ) + 1

noncomputable def fixedPart : List (Instr ℕ Bool) :=
  .dec true (Fintype.card τ + 1) (Fintype.card τ + 1) ::
    List.ofFn (fun i : Fin (Fintype.card τ) => Instr.map idx (Q (eqv.symm i)))

theorem fixedPart_length : (fixedPart Q).length = Fintype.card τ + 1 := by
  simp [fixedPart]

noncomputable def fullProg (t0 : τ) (m : ℕ) : List (Instr ℕ Bool) :=
  fixedPart Q ++ loader (Fintype.card τ + 1) (idx t0) m

variable {Q}

theorem fn_full_lt (t0 : τ) (m k : ℕ) (hk : k < Fintype.card τ + 1) :
    fn (fullProg Q t0 m) k = (fixedPart Q).getD k .halt := by
  simp only [fn, fullProg]
  rw [List.getD_append _ _ _ _ (by rw [fixedPart_length]; exact hk)]

theorem fn_full_idx (t0 : τ) (m : ℕ) (s : τ) :
    fn (fullProg Q t0 m) (idx s) = Instr.map idx (Q s) := by
  have h : idx s < Fintype.card τ + 1 := by simp [idx]
  rw [fn_full_lt t0 m _ h]
  simp [fixedPart, idx]

theorem fn_full_zero (t0 : τ) (m : ℕ) :
    fn (fullProg Q t0 m) 0 = .dec true (Fintype.card τ + 1) (Fintype.card τ + 1) := by
  rw [fn_full_lt t0 m _ (by omega)]
  simp [fixedPart]

theorem fn_full_loader (t0 : τ) (m k : ℕ) (hk : k < 8 * m + 2) :
    fn (fullProg Q t0 m) (Fintype.card τ + 1 + k) = ldI (Fintype.card τ + 1) (idx t0) m k := by
  simp only [fn, fullProg]
  rw [List.getD_append_right _ _ _ _ (by rw [fixedPart_length]; omega)]
  rw [fixedPart_length, Nat.add_sub_cancel_left]
  simp [loader, List.getD_eq_getElem?_getD, hk]

theorem idx_lt_length (t0 : τ) (m : ℕ) (s : τ) : idx s < (fullProg Q t0 m).length := by
  simp [fullProg, fixedPart_length, idx]; omega

theorem idx_inj {s t : τ} (h : idx s = idx t) : s = t := by
  simp only [idx, Nat.add_right_cancel_iff] at h
  exact eqv.injective (Fin.ext h)

/-! ### Loader run -/

theorem reaches_of_step {σ ι : Type*} [DecidableEq ι] {P : σ → Instr σ ι} {a b : Cfg σ ι}
    (h : step P a = some b) : Reaches (step P) a b := ReflTransGen.single h

theorem loader_gadget (t0 : τ) (m i : ℕ) (hi : i < m) (x : ℕ) :
    Reaches₁ (step (fn (fullProg Q t0 m)))
      ⟨Fintype.card τ + 1 + (1 + 8 * i), vv x 0⟩
      ⟨Fintype.card τ + 1 + (1 + 8 * (i + 1)), vv (5 * x) 0⟩ := by
  obtain ⟨b, hb⟩ : ∃ b, b = Fintype.card τ + 1 + (1 + 8 * i) := ⟨_, rfl⟩
  rw [← hb, show Fintype.card τ + 1 + (1 + 8 * (i + 1)) = b + 8 by omega]
  have hf : ∀ j < 8, fn (fullProg Q t0 m) (b + j) = gI b j := by
    intro j hj
    have := fn_full_loader (Q := Q) t0 m (1 + 8 * i + j) (by omega)
    rw [show Fintype.card τ + 1 + (1 + 8 * i + j) = b + j by omega] at this
    rw [this, ldI, if_neg (by omega), if_pos (by omega)]
    congr 1
    · have : (1 + 8 * i + j - 1) / 8 = i := by omega
      rw [this]; omega
    · omega
  have e1 := CM.mulMove (P := fn (fullProg Q t0 m)) false true (by decide) 5 b (b + 6)
    (fun j => if j < 5 then b + 1 + j else b)
    (by have := hf 0 (by omega); simpa [gI] using this)
    (by
      intro j hj
      have := hf (j + 1) (by omega)
      simp only [if_pos hj]
      rw [show b + 1 + j = b + (j + 1) by omega, this]
      by_cases h4 : j + 1 < 5
      · simp [gI, h4, show j + 1 ≠ 0 by omega]; omega
      · have : j = 4 := by omega
        subst this; simp [gI])
    (by simp)
    (vv x 0) (vv 0 (5 * x)) (by simp) (by simp) (by intro k h1 h2; cases k <;> simp_all)
  have e2 := CM.mulMove (P := fn (fullProg Q t0 m)) true false (by decide) 1 (b + 6) (b + 8)
    (fun j => if j < 1 then b + 7 else b + 6)
    (by have := hf 6 (by omega); simpa [gI] using this)
    (by
      intro j hj
      have : j = 0 := by omega
      subst this
      have := hf 7 (by omega); simpa [gI] using this)
    (by simp)
    (vv 0 (5 * x)) (vv (5 * x) 0) (by simp) (by simp) (by intro k h1 h2; cases k <;> simp_all)
  exact e1.trans e2

theorem loader_run (t0 : τ) (m : ℕ) :
    Reaches (step (fn (fullProg Q t0 m))) ⟨0, vv 0 0⟩ ⟨idx t0, vv (5 ^ m) 0⟩ := by
  set base := Fintype.card τ + 1
  have s0 : step (fn (fullProg Q t0 m)) ⟨0, vv 0 0⟩ = some ⟨base, vv 0 0⟩ :=
    step_dec_zero (fn_full_zero t0 m) (by simp)
  have s1 : step (fn (fullProg Q t0 m)) ⟨base, vv 0 0⟩ = some ⟨base + (1 + 8 * 0), vv 1 0⟩ := by
    have := fn_full_loader (Q := Q) t0 m 0 (by omega)
    rw [Nat.add_zero] at this
    have hI : fn (fullProg Q t0 m) base = .inc false (base + (1 + 8 * 0)) := by
      rw [this]; simp [ldI, base]
    rw [step_inc hI, update_vv_false]
    simp
  have gs : ∀ i ≤ m, Reaches (step (fn (fullProg Q t0 m)))
      ⟨base + (1 + 8 * 0), vv 1 0⟩ ⟨base + (1 + 8 * i), vv (5 ^ i) 0⟩ := by
    intro i hi
    induction i with
    | zero => exact ReflTransGen.refl
    | succ i ih =>
      refine (ih (by omega)).trans ?_
      have := loader_gadget (Q := Q) t0 m i (by omega) (5 ^ i)
      rw [← pow_succ'] at this
      exact this.to_reflTransGen
  have s2 : step (fn (fullProg Q t0 m)) ⟨base + (1 + 8 * m), vv (5 ^ m) 0⟩ =
      some ⟨idx t0, vv (5 ^ m) 0⟩ := by
    have := fn_full_loader (Q := Q) t0 m (1 + 8 * m) (by omega)
    exact step_dec_zero (by rw [this, ldI, if_neg (by omega), if_neg (by omega)]) (by simp)
  exact (reaches_of_step s0).trans ((reaches_of_step s1).trans
    ((gs m le_rfl).trans (reaches_of_step s2)))

/-! ### Relabelling -/

noncomputable def rl (c : Cfg τ Bool) : Cfg ℕ Bool := ⟨idx c.q, c.v⟩

theorem step_rl (t0 : τ) (m : ℕ) (c : Cfg τ Bool) :
    step (fn (fullProg Q t0 m)) (rl c) = (step Q c).map rl := by
  obtain ⟨s, v⟩ := c
  simp only [rl, step, fn_full_idx]
  cases Q s with
  | inc r q => simp [Instr.map, rl]
  | dec r q z =>
    simp only [Instr.map]
    by_cases h : v r = 0 <;> simp [h, rl]
  | halt => simp [Instr.map]

theorem rl_respects (t0 : τ) (m : ℕ) :
    Respects (step Q) (step (fn (fullProg Q t0 m))) (fun a b => rl a = b) := by
  rw [fun_respects]
  intro c
  rcases h : step Q c with _ | c'
  · show _ = none
    rw [step_rl, h]; rfl
  · show Reaches₁ _ _ _
    exact TransGen.single (by rw [step_rl, h]; rfl)

theorem rl_reaches (t0 : τ) (m : ℕ) {a b : Cfg τ Bool} (h : Reaches (step Q) a b) :
    Reaches (step (fn (fullProg Q t0 m))) (rl a) (rl b) := by
  obtain ⟨b', hb, hr⟩ := tr_reaches (rl_respects (Q := Q) t0 m) rfl h
  rw [← hb] at hr; exact hr

end fixed

/-! ### Putting the Gödel layer and the loader together -/

section main

variable {σ : Type*} [Fintype σ] [DecidableEq σ] (P : σ → Instr σ (Fin 3)) (s0 : σ)

def primes : Fin 3 → ℕ := ![2, 3, 5]

theorem primes_prime : ∀ i, (primes i).Prime := by
  intro i
  fin_cases i <;> simp [primes] <;>
    first | exact Nat.prime_two | exact Nat.prime_three | exact Nat.prime_five

theorem primes_inj : Function.Injective primes := by
  intro i j h; fin_cases i <;> fin_cases j <;> simp_all [primes]

theorem primes_le : ∀ i, primes i ≤ 5 := by
  intro i; fin_cases i <;> simp [primes]

/-- The two-counter program from the `3`-counter program `P`. -/
def Q2 : σ × Godel.G 5 → Instr (σ × Godel.G 5) Bool := Godel.prog P primes 5

/-- The final list program for input `m`. -/
noncomputable def finalProg (m : ℕ) : List (Instr ℕ Bool) :=
  fullProg (Q2 P) (s0, Godel.entry P 5 s0) m

theorem enc_init (m : ℕ) : Godel.enc primes ![0, 0, m] = 5 ^ m := by
  simp [Godel.enc, Fin.prod_univ_three, primes]

theorem haltsZ_iff (m : ℕ) :
    HaltsZ (finalProg P s0 m) ↔ (eval (step P) ⟨s0, ![0, 0, m]⟩).Dom := by
  set a0 : Cfg σ (Fin 3) := ⟨s0, ![0, 0, m]⟩
  have himg : Godel.img P primes 5 a0 = ⟨(s0, Godel.entry P 5 s0), vv (5 ^ m) 0⟩ := by
    simp [Godel.img, a0, enc_init]
  have hload : Reaches (step (fn (finalProg P s0 m))) ⟨0, vv 0 0⟩
      (rl (Godel.img P primes 5 a0)) := by
    rw [himg]; exact loader_run (Q := Q2 P) _ m
  constructor
  · rintro ⟨q, _, hq, hr⟩
    have hdom : (eval (step (fn (finalProg P s0 m))) ⟨0, vv 0 0⟩).Dom :=
      Part.dom_iff_mem.2 ⟨_, mem_eval.2 ⟨hr, by simp [step, hq]⟩⟩
    rw [reaches_eval hload] at hdom
    rw [Godel.dom_iff P primes 5 primes_prime primes_inj primes_le a0]
    exact (tr_eval_dom (rl_respects (Q := Q2 P) _ m) rfl).1 hdom
  · intro h
    obtain ⟨s, hs, hr⟩ := Godel.complete P primes 5 primes_prime primes_inj primes_le a0 h
    have hr' := rl_reaches (Q := Q2 P) (s0, Godel.entry P 5 s0) m hr
    refine ⟨idx (s, Godel.G.h1), idx_lt_length _ _ _, ?_, hload.trans hr'⟩
    rw [finalProg, fn_full_idx]
    simp [Q2, Godel.prog, hs, Instr.map]

theorem solvable_iff (m : ℕ) :
    Solvable (toMaze (finalProg P s0 m)) ↔ (eval (step P) ⟨s0, ![0, 0, m]⟩).Dom :=
  (MazeCM.solvable_iff _).trans (haltsZ_iff P s0 m)

end main

end Assemble
end RepeatedMaze
