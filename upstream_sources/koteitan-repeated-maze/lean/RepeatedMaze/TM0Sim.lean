import RepeatedMaze.Macros
import RepeatedMaze.Assemble
import Mathlib.Computability.TuringMachine.PostTuringMachine
import Mathlib.Data.Nat.Bits

/-!
# Simulating a finitely supported Post–Turing machine (`TM0`) by a 3-counter machine

Registers: `0 = L` (left half tape, base `B`), `1 = R` (right half tape), `2 = T` (scratch).
The head symbol and the machine state are kept in the finite control.
The machine first runs a loader that turns `T = m` into the tape
`c0 :: reverse (map cell (bits m))`.
-/

namespace RepeatedMaze
namespace TM0Sim

open CM StateTransition Relation Godel Macros Turing Assemble

/-! ### Numbers for half tapes -/

section code

variable {Γ : Type*} [Inhabited Γ] [Fintype Γ] [DecidableEq Γ]

noncomputable def eqv0 : Γ ≃ Fin (Fintype.card Γ) :=
  (Fintype.equivFin Γ).trans (Equiv.swap (Fintype.equivFin Γ default) ⟨0, Fintype.card_pos⟩)

noncomputable def code (a : Γ) : ℕ := (eqv0 a).val

theorem code_default : code (default : Γ) = 0 := by
  simp [code, eqv0]

theorem code_lt (a : Γ) : code a < Fintype.card Γ := (eqv0 a).2

noncomputable def decode (j : ℕ) : Γ :=
  if h : j < Fintype.card Γ then eqv0.symm ⟨j, h⟩ else default

theorem decode_code (a : Γ) : decode (code a) = a := by
  simp [decode, code, code_lt]

noncomputable def numL : List Γ → ℕ
  | [] => 0
  | a :: l => code a + Fintype.card Γ * numL l

theorem numL_replicate (n : ℕ) : numL (List.replicate n (default : Γ)) = 0 := by
  induction n with
  | zero => rfl
  | succ n ih => simp [List.replicate_succ, numL, ih, code_default]

theorem numL_append_blank (l : List Γ) (n : ℕ) :
    numL (l ++ List.replicate n default) = numL l := by
  induction l with
  | nil => simp [numL_replicate, numL]
  | cons a l ih => simp [numL, ih]

noncomputable def num (L : ListBlank Γ) : ℕ :=
  L.liftOn numL (by rintro a b ⟨n, rfl⟩; rw [numL_append_blank])

theorem num_mk (l : List Γ) : num (ListBlank.mk l) = numL l := rfl

theorem num_cons (a : Γ) (L : ListBlank Γ) :
    num (L.cons a) = code a + Fintype.card Γ * num L := by
  induction L using ListBlank.induction_on with
  | h l => rfl

theorem num_mod (L : ListBlank Γ) : num L % Fintype.card Γ = code L.head := by
  conv_lhs => rw [← ListBlank.cons_head_tail L]
  rw [num_cons, Nat.add_mul_mod_self_left, Nat.mod_eq_of_lt (code_lt _)]

theorem num_div (L : ListBlank Γ) : num L / Fintype.card Γ = num L.tail := by
  conv_lhs => rw [← ListBlank.cons_head_tail L]
  rw [num_cons, Nat.add_mul_div_left _ _ Fintype.card_pos, Nat.div_eq_of_lt (code_lt _),
    zero_add]

theorem decode_num_mod (L : ListBlank Γ) : decode (num L % Fintype.card Γ) = L.head := by
  rw [num_mod, decode_code]

end code

theorem bits_pos (t : ℕ) (ht : 0 < t) : Nat.bits t = decide (t % 2 = 1) :: Nat.bits (t / 2) := by
  rcases Nat.even_or_odd' t with ⟨k, rfl | rfl⟩
  · have hk : k ≠ 0 := by omega
    have h1 : 2 * k % 2 = 0 := by omega
    have h2 : 2 * k / 2 = k := by omega
    rw [Nat.bit0_bits k hk, h1, h2]; rfl
  · have h1 : (2 * k + 1) % 2 = 1 := by omega
    have h2 : (2 * k + 1) / 2 = k := by omega
    rw [Nat.bit1_bits, h1, h2]; rfl

/-! ### The states and the program -/

inductive St (L G : Type*) (N : ℕ) where
  | main (q : L) (a : G)
  | push (q : L) (d : Bool) (a : G) (μ : PushM N)
  | pop (q : L) (d : Bool) (μ : PopM N)
  | l0 | l1 | ldiv (μ : PopM N) | lps (j : Bool) (μ : PushM N) | lfin
  deriving DecidableEq, Fintype

section prog

variable {Γ Λ : Type*} [Inhabited Γ] [Fintype Γ] [DecidableEq Γ] [Inhabited Λ]
  (M : TM0.Machine Γ Λ) (S : Finset Λ) (ss : TM0.Supports M ↑S) (c0 : Γ) (cell : Bool → Γ)

/-- The machine restricted to its support. -/
def M' (q : S) (a : Γ) : Option (S × TM0.Stmt Γ) :=
  (M q.1 a).pmap (fun p hp => (⟨p.1, hp⟩, p.2))
    (fun p hp => ss.2 (show (p.1, p.2) ∈ M q.1 a from hp) q.2)

theorem M'_none {q : S} {a : Γ} (h : M q.1 a = none) : M' M S ss q a = none := by
  simp [M', h]

theorem M'_some {q : S} {a : Γ} {q' : Λ} {st : TM0.Stmt Γ} (h : M q.1 a = some (q', st))
    (hq : q' ∈ S) : M' M S ss q a = some (⟨q', hq⟩, st) := by
  simp [M', h]

abbrev StT := St S Γ (Fintype.card Γ)

/-- The 3-counter program. -/
noncomputable def prog : StT S (Γ := Γ) → Instr (StT S (Γ := Γ)) (Fin 3)
  | .main q a =>
    match M' M S ss q a with
    | none => .halt
    | some (q', .write b) => .dec 2 (.main q' b) (.main q' b)
    | some (q', .move .left) => .dec 2 (.push q' false a .m1) (.push q' false a .m1)
    | some (q', .move .right) => .dec 2 (.push q' true a .m1) (.push q' true a .m1)
  | .push q d a μ =>
    pushFrag (if d then 0 else 1) 2 (Fintype.card Γ) (code a) (Fintype.card Γ) (.push q d a)
      (.pop q d (.cnt (fc (Fintype.card Γ) 0))) μ
  | .pop q d μ =>
    popFrag (if d then 1 else 0) 2 (Fintype.card Γ) (Fintype.card Γ) (.pop q d)
      (fun j => .main q (decode j)) μ
  | .l0 => .dec 2 .l1 .lfin
  | .l1 => .inc 2 (.ldiv (.cnt (fc (Fintype.card Γ) 0)))
  | .ldiv μ => popFrag 2 0 2 (Fintype.card Γ) .ldiv (fun j => .lps (decide (j = 1)) .m1) μ
  | .lps j μ => pushFrag 1 0 (Fintype.card Γ) (code (cell j)) (Fintype.card Γ) (.lps j) .l0 μ
  | .lfin => .dec 2 (.main ⟨default, ss.1⟩ c0) (.main ⟨default, ss.1⟩ c0)

/-! ### Simulation of one TM0 step -/

/-- The refinement relation. -/
def Rel (c : TM0.Cfg Γ Λ) (b : Cfg (StT S (Γ := Γ)) (Fin 3)) : Prop :=
  ∃ h : c.q ∈ S, b = ⟨.main ⟨c.q, h⟩ c.Tape.head, ![num c.Tape.left, num c.Tape.right, 0]⟩

theorem push_run (q : S) (d : Bool) (a : Γ) (v w : Fin 3 → ℕ) (hv : v 2 = 0)
    (hw1 : w (if d then 0 else 1) = code a + Fintype.card Γ * v (if d then 0 else 1))
    (hw2 : w 2 = 0) (hw3 : w (if d then 1 else 0) = v (if d then 1 else 0)) :
    Reaches₁ (step (prog M S ss c0 cell)) ⟨.push q d a .m1, v⟩
      ⟨.pop q d (.cnt (fc (Fintype.card Γ) 0)), w⟩ := by
  apply push_spec (prog M S ss c0 cell) (if d then 0 else 1) 2 (by cases d <;> decide)
    (Fintype.card Γ) (code a) (Fintype.card Γ) le_rfl (code_lt a).le
  · intro μ; rfl
  · exact hv
  · exact hw1
  · exact hw2
  · intro k h1 h2
    cases d <;> fin_cases k <;> simp_all

theorem pop_run (q : S) (d : Bool) (v w : Fin 3 → ℕ) (hv : v 2 = 0)
    (hw1 : w (if d then 1 else 0) = v (if d then 1 else 0) / Fintype.card Γ)
    (hw2 : w 2 = 0) (hw3 : w (if d then 0 else 1) = v (if d then 0 else 1)) :
    Reaches₁ (step (prog M S ss c0 cell)) ⟨.pop q d (.cnt (fc (Fintype.card Γ) 0)), v⟩
      ⟨.main q (decode (v (if d then 1 else 0) % Fintype.card Γ)), w⟩ := by
  apply pop_spec (prog M S ss c0 cell) (if d then 1 else 0) 2 (by cases d <;> decide)
    (Fintype.card Γ) (Fintype.card Γ) Fintype.card_pos le_rfl (.pop q d)
    (fun j => .main q (decode j))
  · intro μ; rfl
  · exact hv
  · exact hw1
  · exact hw2
  · intro k h1 h2
    cases d <;> fin_cases k <;> simp_all

theorem respects : Respects (TM0.step M) (step (prog M S ss c0 cell)) (Rel S) := by
  rintro ⟨q, ⟨a, L, R⟩⟩ b ⟨hq, rfl⟩
  cases hM : M q a with
  | none =>
    simp only [TM0.step, hM, Option.map_none]
    show step _ _ = none
    apply step_halt
    simp [prog, M'_none M S ss (q := ⟨q, hq⟩) hM]
  | some p =>
    obtain ⟨q', st⟩ := p
    have hq' : q' ∈ S := ss.2 (by rw [hM]; rfl) hq
    have hM' := M'_some M S ss (q := ⟨q, hq⟩) hM hq'
    simp only [TM0.step, hM, Option.map_some]
    cases st with
    | write b =>
      refine ⟨⟨St.main ⟨q', hq'⟩ b, ![num L, num R, 0]⟩, ⟨hq', by simp [Tape.write]⟩, ?_⟩
      exact reaches₁_of_step (step_dec_zero (P := prog M S ss c0 cell) (q := St.main ⟨q, hq⟩ a) (r := 2)
        (q' := St.main ⟨q', hq'⟩ b) (z := St.main ⟨q', hq'⟩ b) (by simp [prog, hM']) (by simp))
    | move d =>
      cases d with
      | left =>
        refine ⟨⟨St.main ⟨q', hq'⟩ L.head, ![num L.tail, num (R.cons a), 0]⟩,
          ⟨hq', by simp [Tape.move]⟩, ?_⟩
        have s1 : Reaches₁ (step (prog M S ss c0 cell))
            ⟨St.main ⟨q, hq⟩ a, ![num L, num R, 0]⟩
            ⟨St.push ⟨q', hq'⟩ false a .m1, ![num L, num R, 0]⟩ :=
          reaches₁_of_step (step_dec_zero (P := prog M S ss c0 cell) (q := St.main ⟨q, hq⟩ a) (r := 2)
            (q' := St.push ⟨q', hq'⟩ false a .m1)
            (z := St.push ⟨q', hq'⟩ false a .m1) (by simp [prog, hM']) (by simp))
        have s2 := push_run M S ss c0 cell ⟨q', hq'⟩ false a ![num L, num R, 0]
          ![num L, code a + Fintype.card Γ * num R, 0] rfl (by simp) rfl (by simp)
        have s3 := pop_run M S ss c0 cell ⟨q', hq'⟩ false
          ![num L, code a + Fintype.card Γ * num R, 0]
          ![num L.tail, num (R.cons a), 0] rfl (by simp [num_div]) rfl (by simp [num_cons])
        simp only [Matrix.cons_val_zero, Bool.false_eq_true, if_false, decode_num_mod] at s3
        exact (s1.trans s2).trans s3
      | right =>
        refine ⟨⟨St.main ⟨q', hq'⟩ R.head, ![num (L.cons a), num R.tail, 0]⟩,
          ⟨hq', by simp [Tape.move]⟩, ?_⟩
        have s1 : Reaches₁ (step (prog M S ss c0 cell))
            ⟨St.main ⟨q, hq⟩ a, ![num L, num R, 0]⟩
            ⟨St.push ⟨q', hq'⟩ true a .m1, ![num L, num R, 0]⟩ :=
          reaches₁_of_step (step_dec_zero (P := prog M S ss c0 cell) (q := St.main ⟨q, hq⟩ a) (r := 2)
            (q' := St.push ⟨q', hq'⟩ true a .m1)
            (z := St.push ⟨q', hq'⟩ true a .m1) (by simp [prog, hM']) (by simp))
        have s2 := push_run M S ss c0 cell ⟨q', hq'⟩ true a ![num L, num R, 0]
          ![code a + Fintype.card Γ * num L, num R, 0] rfl (by simp) rfl (by simp)
        have s3 := pop_run M S ss c0 cell ⟨q', hq'⟩ true
          ![code a + Fintype.card Γ * num L, num R, 0]
          ![num (L.cons a), num R.tail, 0] rfl (by simp [num_div]) rfl (by simp [num_cons])
        simp only [Matrix.cons_val_one, Matrix.cons_val_zero, if_true, decode_num_mod] at s3
        exact (s1.trans s2).trans s3

/-! ### The loader -/

theorem loader (h2 : 2 ≤ Fintype.card Γ) (t : ℕ) (acc : List Bool) :
    Reaches (step (prog M S ss c0 cell))
      ⟨.l0, ![0, numL (acc.map cell).reverse, t]⟩
      ⟨.lfin, ![0, numL ((acc ++ Nat.bits t).map cell).reverse, 0]⟩ := by
  induction t using Nat.strong_induction_on generalizing acc with
  | _ t ih =>
    rcases Nat.eq_zero_or_pos t with rfl | ht
    · rw [Nat.zero_bits, List.append_nil]
      apply ReflTransGen.single
      exact step_dec_zero (P := prog M S ss c0 cell) (q := St.l0) (r := 2) (q' := St.l1) (z := St.lfin)
        (v := ![0, numL (acc.map cell).reverse, 0]) (by simp [prog]) rfl
    · obtain ⟨s, rfl⟩ : ∃ s, t = s + 1 := ⟨t - 1, by omega⟩
      set R0 := numL (acc.map cell).reverse
      have e1 : step (prog M S ss c0 cell) ⟨.l0, ![0, R0, s + 1]⟩ = some ⟨.l1, ![0, R0, s]⟩ := by
        rw [step_dec_succ (P := prog M S ss c0 cell) (q := St.l0) (r := 2) (q' := St.l1) (z := St.lfin) (n := s)
          (by simp [prog]) rfl]
        congr 2; funext k; fin_cases k <;> simp
      have e2 : step (prog M S ss c0 cell) ⟨.l1, ![0, R0, s]⟩ =
          some ⟨.ldiv (.cnt (fc (Fintype.card Γ) 0)), ![0, R0, s + 1]⟩ := by
        rw [step_inc (P := prog M S ss c0 cell) (q := St.l1) (r := 2)
          (q' := St.ldiv (.cnt (fc (Fintype.card Γ) 0))) (by simp [prog])]
        congr 2; funext k; fin_cases k <;> simp
      set j := decide ((s + 1) % 2 = 1)
      have e3 := pop_spec (prog M S ss c0 cell) 2 0 (by decide) 2 (Fintype.card Γ) (by omega) h2
        .ldiv (fun j => .lps (decide (j = 1)) .m1) (fun μ => rfl)
        ![0, R0, s + 1] ![0, R0, (s + 1) / 2] rfl (by simp) rfl
        (by intro k h1 h2; fin_cases k <;> simp_all)
      simp only [Matrix.cons_val_two, Matrix.tail_cons, Matrix.head_cons] at e3
      have e4 := push_spec (prog M S ss c0 cell) 1 0 (by decide) (Fintype.card Γ) (code (cell j))
        (Fintype.card Γ) le_rfl (code_lt _).le (.lps j) .l0 (fun μ => rfl)
        ![0, R0, (s + 1) / 2] ![0, code (cell j) + Fintype.card Γ * R0, (s + 1) / 2] rfl
        (by simp) rfl (by intro k h1 h2; fin_cases k <;> simp_all)
      have e5 := ih ((s + 1) / 2) (by omega) (acc ++ [j])
      have hR : numL ((acc ++ [j]).map cell).reverse = code (cell j) + Fintype.card Γ * R0 := by
        simp [R0, numL]
      rw [hR, List.append_assoc, List.singleton_append, ← bits_pos _ (by omega)] at e5
      exact (reaches_of_step e1).trans ((reaches_of_step e2).trans
        ((e3.trans e4).to_reflTransGen.trans e5))

/-! ### Main statement of this layer -/

theorem dom_iff (h2 : 2 ≤ Fintype.card Γ) (m : ℕ) :
    (eval (step (prog M S ss c0 cell)) ⟨.l0, ![0, 0, m]⟩).Dom ↔
      (eval (TM0.step M) (TM0.init (c0 :: ((Nat.bits m).map cell).reverse))).Dom := by
  have hl := loader M S ss c0 cell h2 m []
  simp only [List.map_nil, List.reverse_nil, List.nil_append] at hl
  have hl0 : numL ([] : List Γ) = 0 := rfl
  rw [hl0] at hl
  set rest := ((Nat.bits m).map cell).reverse
  have hf : step (prog M S ss c0 cell) ⟨.lfin, ![0, numL rest, 0]⟩ =
      some ⟨.main ⟨default, ss.1⟩ c0, ![0, numL rest, 0]⟩ :=
    step_dec_zero (P := prog M S ss c0 cell) (q := St.lfin) (r := 2) (q' := St.main ⟨default, ss.1⟩ c0) (z := St.main ⟨default, ss.1⟩ c0)
      (by simp [prog]) (by simp)
  have hrel : Rel S (TM0.init (c0 :: rest)) ⟨.main ⟨default, ss.1⟩ c0, ![0, numL rest, 0]⟩ := by
    refine ⟨ss.1, ?_⟩
    simp [TM0.init, Tape.mk₁, Tape.mk₂, Tape.mk', num_mk, numL]
  rw [reaches_eval (hl.trans (reaches_of_step hf))]
  exact tr_eval_dom (respects M S ss c0 cell) hrel

end prog

end TM0Sim
end RepeatedMaze
