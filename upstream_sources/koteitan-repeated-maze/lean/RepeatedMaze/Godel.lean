import RepeatedMaze.CM
import RepeatedMaze.MazeCM
import Mathlib.Data.Nat.Prime.Basic
import Mathlib.Algebra.BigOperators.Group.Finset.Basic
import Mathlib.Data.Fintype.BigOperators
import Mathlib.Tactic.DeriveFintype
import Mathlib.Data.Nat.GCD.BigOperators
import Mathlib.Algebra.Order.BigOperators.GroupWithZero.Finset

/-!
# From `k` counters to two counters (Gödel / Minsky encoding)

A configuration `(s, v)` of a `k`-counter machine is represented by the two-counter
configuration `((s, entry s), x = ∏ p_i ^ v_i, y = 0)`.
-/

namespace RepeatedMaze
namespace Godel

open CM StateTransition Relation MazeCM

/-! ### Arithmetic of the encoding -/

section enc

variable {ι : Type*} [Fintype ι] [DecidableEq ι] (p : ι → ℕ)

def enc (v : ι → ℕ) : ℕ := ∏ i, p i ^ v i

variable {p}

theorem enc_split (v : ι → ℕ) (r : ι) :
    enc p v = p r ^ v r * ∏ i ∈ Finset.univ.erase r, p i ^ v i :=
  (Finset.mul_prod_erase _ _ (Finset.mem_univ r)).symm

theorem prod_erase_update (v : ι → ℕ) (r : ι) (n : ℕ) :
    ∏ i ∈ Finset.univ.erase r, p i ^ (Function.update v r n) i =
      ∏ i ∈ Finset.univ.erase r, p i ^ v i := by
  apply Finset.prod_congr rfl
  intro i hi
  rw [Function.update_of_ne (Finset.ne_of_mem_erase hi)]

theorem enc_update (v : ι → ℕ) (r : ι) (n : ℕ) :
    enc p (Function.update v r n) = p r ^ n * ∏ i ∈ Finset.univ.erase r, p i ^ v i := by
  rw [enc_split _ r, prod_erase_update]; simp

theorem enc_inc (v : ι → ℕ) (r : ι) :
    enc p (Function.update v r (v r + 1)) = p r * enc p v := by
  rw [enc_update, enc_split v r, pow_succ]; ring

theorem enc_dec (v : ι → ℕ) (r : ι) (n : ℕ) (h : v r = n + 1) :
    enc p v = p r * enc p (Function.update v r n) := by
  rw [enc_update, enc_split v r, h, pow_succ]; ring

variable (hp : ∀ i, (p i).Prime) (hinj : Function.Injective p)
include hp

theorem enc_pos (v : ι → ℕ) : 0 < enc p v :=
  Finset.prod_pos fun i _ => pow_pos (hp i).pos _

include hinj in
theorem enc_not_dvd (v : ι → ℕ) (r : ι) (h : v r = 0) : ¬ p r ∣ enc p v := by
  rw [enc_split v r, h, pow_zero, one_mul]
  intro hd
  have hc : Nat.Coprime (p r) (∏ i ∈ Finset.univ.erase r, p i ^ v i) := by
    apply Nat.coprime_prod_right_iff.2
    intro i hi
    apply Nat.Coprime.pow_right
    exact (Nat.coprime_primes (hp r) (hp i)).2 (fun e => Finset.ne_of_mem_erase hi (hinj e).symm)
  have := Nat.Coprime.eq_one_of_dvd hc hd
  exact (hp r).one_lt.ne' this

end enc

/-! ### The two-counter program -/

/-- `i` as an element of `Fin (N+1)` (reduced mod `N+1`). -/
def fc (N i : ℕ) : Fin (N + 1) := ⟨i % (N + 1), Nat.mod_lt _ (Nat.succ_pos _)⟩

theorem fc_val {N i : ℕ} (h : i < N + 1) : (fc N i).val = i := Nat.mod_eq_of_lt h

/-- Micro states of the macros. -/
inductive G (N : ℕ) where
  | mul1 | mulI (i : Fin (N + 1)) | mul2 | mul2I
  | dCnt (j : Fin (N + 1)) | dInc | bk | bkI
  | rs (j : Fin (N + 1)) | rsI (j i : Fin (N + 1)) | rsA (j i : Fin (N + 1))
  | h0 | h1
  deriving DecidableEq, Fintype

section prog

variable {σ ι : Type*} [DecidableEq ι] (P : σ → Instr σ ι) (p : ι → ℕ) (N : ℕ)

def X : Bool := false
def Y : Bool := true

def entry (s : σ) : G N :=
  match P s with
  | .inc _ _ => .mul1
  | .dec _ _ _ => .dCnt (fc N 0)
  | .halt => .h0

/-- The two-counter program. -/
def prog : σ × G N → Instr (σ × G N) Bool
  | (s, g) =>
    match P s, g with
    | .inc r _, .mul1 => .dec X (s, if 0 < p r then .mulI (fc N 0) else .mul1) (s, .mul2)
    | .inc r _, .mulI i => .inc Y (s, if i.val + 1 < p r then .mulI (fc N (i.val + 1)) else .mul1)
    | .inc _ q, .mul2 => .dec Y (s, .mul2I) (q, entry P N q)
    | .inc _ _, .mul2I => .inc X (s, .mul2)
    | .dec r _ _, .dCnt j =>
      .dec X (s, if j.val + 1 < p r then .dCnt (fc N (j.val + 1)) else .dInc)
        (s, if j.val = 0 then .bk else .rs (fc N j))
    | .dec _ _ _, .dInc => .inc Y (s, .dCnt (fc N 0))
    | .dec _ q _, .bk => .dec Y (s, .bkI) (q, entry P N q)
    | .dec _ _ _, .bkI => .inc X (s, .bk)
    | .dec r _ z, .rs j =>
      .dec Y (s, if 0 < p r then .rsI j (fc N 0) else .rs j)
        (if 0 < j.val then (s, .rsA j (fc N 0)) else (z, entry P N z))
    | .dec r _ _, .rsI j i =>
      .inc X (s, if i.val + 1 < p r then .rsI j (fc N (i.val + 1)) else .rs j)
    | .dec _ _ z, .rsA j i =>
      .inc X (if i.val + 1 < j.val then (s, .rsA j (fc N (i.val + 1))) else (z, entry P N z))
    | .halt, .h0 => .dec X (s, .h0) (s, .h1)
    | _, _ => .halt

end prog

/-! ### Correctness -/

section correct

variable {σ ι : Type*} [Fintype ι] [DecidableEq ι] (P : σ → Instr σ ι) (p : ι → ℕ) (N : ℕ)
  (hp : ∀ i, (p i).Prime) (hinj : Function.Injective p) (hN : ∀ i, p i ≤ N)

/-- The image of a `k`-counter configuration. -/
def img (a : Cfg σ ι) : Cfg (σ × G N) Bool := ⟨(a.q, entry P N a.q), vv (enc p a.v) 0⟩


include hN in
theorem mul_macro (s : σ) (r : ι) (q : σ) (hs : P s = .inc r q) (x : ℕ) :
    Reaches₁ (step (prog P p N)) ⟨(s, .mul1), vv x 0⟩ ⟨(q, entry P N q), vv (p r * x) 0⟩ := by
  have e1 := CM.mulMove (P := prog P p N) X Y (by decide) (p r) (s, .mul1) (s, .mul2)
    (fun i => (s, if i < p r then .mulI (fc N i) else .mul1))
    (by simp [prog, hs])
    (by
      intro i hi
      have hi' : i < N + 1 := by have := hN r; omega
      simp [prog, hs, hi, fc_val hi'])
    (by simp)
    (vv x 0) (vv 0 (p r * x)) (by simp [X]) (by simp [X, Y]) (by intro k h1 h2; cases k <;> simp_all [X, Y])
  have e2 := CM.mulMove (P := prog P p N) Y X (by decide) 1 (s, .mul2) (q, entry P N q)
    (fun i => (s, if i < 1 then .mul2I else .mul2))
    (by simp [prog, hs])
    (by intro i hi; have : i = 0 := by omega
        subst this; simp [prog, hs])
    (by simp)
    (vv 0 (p r * x)) (vv (p r * x) 0) (by simp [Y]) (by simp [X, Y]) (by intro k h1 h2; cases k <;> simp_all [X, Y])
  exact e1.trans e2

include hN in
/-- Division test: divisible case. -/
theorem div_macro_dvd (s : σ) (r : ι) (q z : σ) (hs : P s = .dec r q z) (hpr : 0 < p r)
    (x : ℕ) (hx : x % p r = 0) :
    Reaches₁ (step (prog P p N)) ⟨(s, .dCnt (fc N 0)), vv x 0⟩ ⟨(q, entry P N q), vv (x / p r) 0⟩ := by
  have hN' : p r < N + 1 := by have := hN r; omega
  have e1 := CM.divMove (P := prog P p N) X Y (by decide) (p r) hpr
    (fun j => (s, if j < p r then .dCnt (fc N j) else .dInc))
    (fun j => (s, if j = 0 then .bk else .rs (fc N j)))
    (by
      intro j hj
      have hj' : j < N + 1 := by omega
      simp [prog, hs, hj, fc_val hj'])
    (by simp [prog, hs, hpr])
    0 hpr (vv x 0) (vv 0 (x / p r)) (by simp [X]) (by simp [X, Y]) (by intro k h1 h2; cases k <;> simp_all [X, Y])
  simp only [hpr, if_true, zero_add, show vv x 0 X = x from rfl, hx] at e1
  have e2 := CM.mulMove (P := prog P p N) Y X (by decide) 1 (s, .bk) (q, entry P N q)
    (fun i => (s, if i < 1 then .bkI else .bk))
    (by simp [prog, hs])
    (by intro i hi; have : i = 0 := by omega
        subst this; simp [prog, hs])
    (by simp)
    (vv 0 (x / p r)) (vv (x / p r) 0) (by simp [Y]) (by simp [X, Y]) (by intro k h1 h2; cases k <;> simp_all [X, Y])
  exact e1.trans e2

include hN in
/-- Division test: non-divisible case restores `x`. -/
theorem div_macro_ndvd (s : σ) (r : ι) (q z : σ) (hs : P s = .dec r q z) (hpr : 0 < p r)
    (x : ℕ) (hx : x % p r ≠ 0) :
    Reaches₁ (step (prog P p N)) ⟨(s, .dCnt (fc N 0)), vv x 0⟩ ⟨(z, entry P N z), vv x 0⟩ := by
  have hN' : p r < N + 1 := by have := hN r; omega
  have e1 := CM.divMove (P := prog P p N) X Y (by decide) (p r) hpr
    (fun j => (s, if j < p r then .dCnt (fc N j) else .dInc))
    (fun j => (s, if j = 0 then .bk else .rs (fc N j)))
    (by
      intro j hj
      have hj' : j < N + 1 := by omega
      simp [prog, hs, hj, fc_val hj'])
    (by simp [prog, hs, hpr])
    0 hpr (vv x 0) (vv 0 (x / p r)) (by simp [X]) (by simp [X, Y]) (by intro k h1 h2; cases k <;> simp_all [X, Y])
  simp only [hpr, if_true, zero_add, show vv x 0 X = x from rfl, hx, if_false] at e1
  set j := x % p r with hj
  have hjlt : j < p r := Nat.mod_lt _ hpr
  have hj' : j < N + 1 := by omega
  have hj0 : 0 < j := Nat.pos_of_ne_zero hx
  -- restore: x := p * (x / p) + j
  have e2 := CM.mulMove (P := prog P p N) Y X (by decide) (p r) (s, .rs (fc N j)) (s, .rsA (fc N j) (fc N 0))
    (fun i => (s, if i < p r then .rsI (fc N j) (fc N i) else .rs (fc N j)))
    (by simp [prog, hs, hpr, fc_val hj', hj0])
    (by
      intro i hi
      have hi' : i < N + 1 := by omega
      simp [prog, hs, hi, fc_val hi'])
    (by simp)
    (vv 0 (x / p r)) (vv (p r * (x / p r)) 0) (by simp [Y]) (by simp [X, Y])
    (by intro k h1 h2; cases k <;> simp_all [X, Y])
  have e3 := CM.incChain (P := prog P p N) X
    (fun i => if i < j then (s, .rsA (fc N j) (fc N i)) else (z, entry P N z)) j
    (by
      intro i hi
      have hi' : i < N + 1 := by omega
      simp [prog, hs, hi, fc_val hi', fc_val hj'])
    (vv (p r * (x / p r)) 0) (vv x 0)
    (by simp [X, hj, Nat.div_add_mod]) (by intro k h1; cases k <;> simp_all [X, Y])
  simp only [hj0, if_true, Nat.cast_zero, lt_irrefl, if_false] at e3
  exact (e1.trans e2).trans_left e3

theorem halt_loop (s : σ) (hs : P s = .halt) (x : ℕ) :
    Reaches (step (prog P p N)) ⟨(s, .h0), vv x 0⟩ ⟨(s, .h1), vv 0 0⟩ := by
  have hI : prog P p N (s, .h0) = .dec X (s, .h0) (s, .h1) := by simp [prog, hs]
  induction x with
  | zero =>
    exact ReflTransGen.single (step_dec_zero hI (by simp [X]))
  | succ n ih =>
    refine ReflTransGen.head (step_dec_succ (n := n) hI (by simp [X])) ?_
    rw [show X = false from rfl, update_vv_false]
    exact ih

include hp hinj hN in
/-- One step of the `k`-counter machine is simulated. -/
theorem sim_step (a a' : Cfg σ ι) (h : step P a = some a') :
    Reaches₁ (step (prog P p N)) (img P p N a) (img P p N a') := by
  obtain ⟨s, v⟩ := a
  cases hs : P s with
  | halt => simp [step, hs] at h
  | inc r q =>
    simp only [step, hs, Option.some.injEq] at h
    subst h
    have := mul_macro P p N hN s r q hs (enc p v)
    simp only [img, entry, hs]
    rw [enc_inc]
    exact this
  | dec r q z =>
    have hpr : 0 < p r := (hp r).pos
    by_cases hv : v r = 0
    · simp only [step, hs, hv, if_true, Option.some.injEq] at h
      subst h
      have := div_macro_ndvd P p N hN s r q z hs hpr (enc p v)
        (fun e => enc_not_dvd hp hinj v r hv (Nat.dvd_of_mod_eq_zero e))
      simp only [img, entry, hs]
      exact this
    · obtain ⟨n, hn⟩ : ∃ n, v r = n + 1 := ⟨v r - 1, by omega⟩
      simp only [step, hs, hv, if_false, Option.some.injEq] at h
      subst h
      have hd := enc_dec v r n hn (p := p)
      have := div_macro_dvd P p N hN s r q z hs hpr (enc p v)
        (by rw [hd]; simp)
      simp only [img, entry, hs]
      have e : enc p v / p r = enc p (Function.update v r n) := by
        rw [hd, Nat.mul_div_cancel_left _ hpr]
      rw [e] at this
      rw [show v r - 1 = n by omega]
      exact this

/-- The refinement relation. -/
def TR (a : Cfg σ ι) (b : Cfg (σ × G N) Bool) : Prop :=
  (step P a ≠ none ∧ b = img P p N a) ∨ (step P a = none ∧ b = ⟨(a.q, .h1), vv 0 0⟩)

theorem step_eq_none {a : Cfg σ ι} : step P a = none ↔ P a.q = .halt := by
  obtain ⟨s, v⟩ := a
  simp only [step]
  cases P s <;> simp
  split_ifs <;> simp

theorem img_reaches_TR (a : Cfg σ ι) : ∃ b, TR P p N a b ∧ Reaches (step (prog P p N)) (img P p N a) b := by
  by_cases h : step P a = none
  · refine ⟨_, Or.inr ⟨h, rfl⟩, ?_⟩
    have hq := (step_eq_none P).1 h
    simp only [img, entry, hq]
    exact halt_loop P p N a.q hq _
  · exact ⟨_, Or.inl ⟨h, rfl⟩, ReflTransGen.refl⟩

include hp hinj hN in
theorem respects : Respects (step P) (step (prog P p N)) (TR P p N) := by
  intro a b hab
  rcases hab with ⟨hn, rfl⟩ | ⟨hn, rfl⟩
  · rcases ha : step P a with _ | a'
    · exact absurd ha hn
    · obtain ⟨b', hb', hr⟩ := img_reaches_TR P p N a'
      exact ⟨b', hb', (sim_step P p N hp hinj hN a a' ha).trans_left hr⟩
  · rw [hn]
    have hq := (step_eq_none P).1 hn
    simp [step, prog, hq]

include hp hinj hN in
theorem dom_iff (a : Cfg σ ι) :
    (eval (step P) a).Dom ↔ (eval (step (prog P p N)) (img P p N a)).Dom := by
  obtain ⟨b, hb, hr⟩ := img_reaches_TR P p N a
  rw [reaches_eval hr]
  exact (tr_eval_dom (respects P p N hp hinj hN) hb).symm

include hp hinj hN in
/-- If the `k`-counter machine halts, the two-counter machine reaches a `halt` state with both
counters zero, of the form `(s, h1)`. -/
theorem complete (a : Cfg σ ι) (h : (eval (step P) a).Dom) :
    ∃ s, P s = .halt ∧ Reaches (step (prog P p N)) (img P p N a) ⟨(s, .h1), vv 0 0⟩ := by
  obtain ⟨b, hb, hr⟩ := img_reaches_TR P p N a
  obtain ⟨c, hc⟩ : ∃ c, c ∈ eval (step P) a := ⟨_, Part.get_mem h⟩
  obtain ⟨c2, hTR, hc2⟩ := tr_eval (respects P p N hp hinj hN) hb hc
  have hcn : step P c = none := (mem_eval.1 hc).2
  rcases hTR with ⟨hn, _⟩ | ⟨_, rfl⟩
  · exact absurd hcn hn
  · exact ⟨c.q, (step_eq_none P).1 hcn, hr.trans (mem_eval.1 hc2).1⟩

end correct

end Godel
end RepeatedMaze
