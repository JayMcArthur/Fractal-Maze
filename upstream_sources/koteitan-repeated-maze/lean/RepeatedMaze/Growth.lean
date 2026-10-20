import RepeatedMaze.Relabel
import RepeatedMaze.Undecidable

/-!
# `L` (and `UL`) is not bounded by any computable function

If `L ≤ f` with `f` computable, then for the mazes `mazeOf m` of the main reduction the
two-counter machine `finalProg m` halts iff it halts within `f (size (mazeOf m))` steps,
because each machine step costs at least one maze move and in these (functional) mazes
every start–goal path has the same length.  Running the machine for that many steps is
primitive recursive, so the halting set `{m | (fU m).Dom}` would be computable.
-/

namespace RepeatedMaze
namespace Growth

open Relation StateTransition CM MazeCM Chain

/-! ### Paths with a length -/

inductive NP {α : Type*} (r : α → α → Prop) : ℕ → α → α → Prop
  | refl (a : α) : NP r 0 a a
  | tail {n : ℕ} {a b c : α} : NP r n a b → r b c → NP r (n + 1) a c

section np

variable {α : Type*} {r : α → α → Prop}

theorem NP.trans {n k : ℕ} {a b c : α} (h1 : NP r n a b) (h2 : NP r k b c) : NP r (n + k) a c := by
  induction h2 with
  | refl => exact h1
  | tail _ h ih => exact .tail (ih h1) h

theorem NP.single {a b : α} (h : r a b) : NP r 1 a b := .tail (.refl a) h

theorem NP.of_transGen {a b : α} (h : TransGen r a b) : ∃ k, 0 < k ∧ NP r k a b := by
  induction h with
  | single h => exact ⟨1, by omega, .single h⟩
  | tail _ h ih => obtain ⟨k, hk, hp⟩ := ih; exact ⟨k + 1, by omega, .tail hp h⟩

theorem NP.split {a c : α} : ∀ {k j : ℕ}, NP r (k + j) a c → ∃ b, NP r k a b ∧ NP r j b c
  | k, 0, h => ⟨c, h, .refl c⟩
  | k, j + 1, h => by
    cases h with
    | tail h1 h2 =>
      obtain ⟨b, hb1, hb2⟩ := NP.split (k := k) (j := j) h1
      exact ⟨b, hb1, .tail hb2 h2⟩

theorem NP.det (hf : ∀ u v v', r u v → r u v' → v = v') {a : α} :
    ∀ {k : ℕ} {b c : α}, NP r k a b → NP r k a c → b = c
  | 0, b, c, h1, h2 => by cases h1; cases h2; rfl
  | k + 1, b, c, h1, h2 => by
    cases h1 with
    | tail h1 s1 =>
      cases h2 with
      | tail h2 s2 =>
        have := NP.det hf h1 h2
        subst this
        exact hf _ _ _ s1 s2

/-- In a functional relation, all paths from `a` to a sink `b` have the same length. -/
theorem NP.len_unique (hf : ∀ u v v', r u v → r u v' → v = v') {a b : α} (hb : ∀ v, ¬ r b v)
    {k k' : ℕ} (h1 : NP r k a b) (h2 : NP r k' a b) : k = k' := by
  have key : ∀ {k k'}, k < k' → NP r k a b → NP r k' a b → False := by
    intro k k' hlt h1 h2
    obtain ⟨j, rfl⟩ : ∃ j, k' = k + (j + 1) := ⟨k' - k - 1, by omega⟩
    obtain ⟨x, hx1, hx2⟩ := NP.split h2
    have := NP.det hf h1 hx1
    subst this
    obtain ⟨y, hy1, _⟩ := NP.split (k := 1) (j := j) (by rwa [Nat.add_comm] at hx2)
    cases hy1 with
    | tail h0 s => cases h0; exact hb _ s
  rcases lt_trichotomy k k' with h | h | h
  · exact (key h h1 h2).elim
  · exact h
  · exact (key h h2 h1).elim

/-- In a functional relation, an undirected path to a sink gives a directed path that is not
longer. -/
theorem NP.undirected (hf : ∀ u v v', r u v → r u v' → v = v') {a b : α} (hb : ∀ v, ¬ r b v)
    {k : ℕ} (h : NP (fun u v => r u v ∨ r v u) k a b) : ∃ i ≤ k, NP r i a b := by
  have key : ∀ {k a c}, NP (fun u v => r u v ∨ r v u) k a c →
      ∃ w i j, i + j ≤ k ∧ NP r i a w ∧ NP r j c w := by
    intro k a c h
    induction h with
    | refl a => exact ⟨a, 0, 0, le_rfl, .refl a, .refl a⟩
    | @tail n a c d _ hcd ih =>
      obtain ⟨w, i, j, hij, haw, hcw⟩ := ih
      rcases hcd with hcd | hdc
      · rcases j with _ | j
        · cases hcw
          exact ⟨d, i + 1, 0, by omega, .tail haw hcd, .refl d⟩
        · obtain ⟨e, he1, he2⟩ := NP.split (k := 1) (j := j) (by rwa [Nat.add_comm] at hcw)
          cases he1 with
          | tail h0 s =>
            cases h0
            have := hf _ _ _ s hcd
            subst this
            exact ⟨w, i, j, by omega, haw, he2⟩
      · exact ⟨w, i, j + 1, by omega, haw, by
          have := NP.trans (NP.single hdc) hcw; rwa [Nat.add_comm] at this⟩
  obtain ⟨w, i, j, hij, haw, hbw⟩ := key h
  rcases j with _ | j
  · cases hbw; exact ⟨i, by omega, haw⟩
  · obtain ⟨e, he1, _⟩ := NP.split (k := 1) (j := j) (by rwa [Nat.add_comm] at hbw)
    cases he1 with
    | tail h0 s => cases h0; exact (hb _ s).elim

end np

theorem reachIn_iff_NP {m : Maze} {k : ℕ} {v : Vert} : ReachIn m k v ↔ NP (Step m) k start v := by
  constructor
  · intro h; induction h with
    | zero => exact .refl _
    | succ _ h2 ih => exact .tail ih h2
  · intro h
    have : ∀ {k a v}, NP (Step m) k a v → a = start → ReachIn m k v := by
      intro k a v h ha
      induction h with
      | refl => subst ha; exact .zero
      | tail _ h2 ih => exact .succ (ih ha) h2
    exact this h rfl

theorem ureachIn_iff_NP {m : Maze} {k : ℕ} {v : Vert} :
    UReachIn m k v ↔ NP (fun u v => Step m u v ∨ Step m v u) k start v := by
  constructor
  · intro h; induction h with
    | zero => exact .refl _
    | succ _ h2 ih => exact .tail ih h2
  · intro h
    have : ∀ {k a v}, NP (fun u v => Step m u v ∨ Step m v u) k a v → a = start →
        UReachIn m k v := by
      intro k a v h ha
      induction h with
      | refl => subst ha; exact .zero
      | tail _ h2 ih => exact .succ (ih ha) h2
    exact this h rfl

/-! ### One machine step is at least one maze move -/

section sim

variable (P : Prog)

theorem sim_step₁ {a b : CM.Cfg ℕ Bool} (h : step (fn P) a = some b) :
    TransGen (Step (toMaze P)) (vtx a) (vtx b) := by
  obtain ⟨i, v⟩ := a
  obtain ⟨x, y, rfl⟩ : ∃ x y, v = vv x y := ⟨v false, v true, (vv_eta v).symm⟩
  have hi : i < P.length := by
    apply fn_lt; intro h'; simp [step, h'] at h
  cases hI : fn P i with
  | halt => simp [step, hI] at h
  | inc r q =>
    simp only [step, hI, Option.some.injEq] at h
    subst h
    cases r
    · rw [update_vv_false]
      have h1 := step_mem P (x := x) (y := y) (a := tC i) (b := tE (2 * q + 2)) hi
        (by rw [hI]; simp [portsOf])
      have h2 := step_mem P (x := x + 1) (y := y) (a := tW (2 * q + 2)) (b := tC q) hi
        (by rw [hI]; simp [portsOf])
      exact TransGen.head h1 (TransGen.single h2)
    · rw [update_vv_true]
      have h1 := step_mem P (x := x) (y := y) (a := tC i) (b := tN (2 * q + 2)) hi
        (by rw [hI]; simp [portsOf])
      have h2 := step_mem P (x := x) (y := y + 1) (a := tS (2 * q + 2)) (b := tC q) hi
        (by rw [hI]; simp [portsOf])
      exact TransGen.head h1 (TransGen.single h2)
  | dec r q z =>
    cases r
    · rcases Nat.eq_zero_or_eq_succ_pred x with hx | hx
      · subst hx
        simp only [step, hI, vv_false, if_true, Option.some.injEq] at h
        subst h
        exact TransGen.single (step_mem P (x := 0) (y := y) (a := tC i) (b := tC z) hi
          (by rw [hI]; simp [portsOf, xPos_blockType]))
      · set x' := x.pred
        rw [hx] at h ⊢
        simp only [step, hI, vv_false, Nat.succ_ne_zero, if_false, Option.some.injEq] at h
        subst h
        rw [update_vv_false]
        have h1 := step_mem P (x := x' + 1) (y := y) (a := tC i) (b := tW (2 * q + 3)) hi
          (by rw [hI]; simp [portsOf, xPos_blockType])
        have h2 := step_mem P (x := x') (y := y) (a := tE (2 * q + 3)) (b := tC q) hi
          (by rw [hI]; simp [portsOf])
        exact TransGen.head h1 (TransGen.single h2)
    · rcases Nat.eq_zero_or_eq_succ_pred y with hy | hy
      · subst hy
        simp only [step, hI, vv_true, if_true, Option.some.injEq] at h
        subst h
        exact TransGen.single (step_mem P (x := x) (y := 0) (a := tC i) (b := tC z) hi
          (by rw [hI]; simp [portsOf, yPos_blockType]))
      · set y' := y.pred
        rw [hy] at h ⊢
        simp only [step, hI, vv_true, Nat.succ_ne_zero, if_false, Option.some.injEq] at h
        subst h
        rw [update_vv_true]
        have h1 := step_mem P (x := x) (y := y' + 1) (a := tC i) (b := tS (2 * q + 3)) hi
          (by rw [hI]; simp [portsOf, yPos_blockType])
        have h2 := step_mem P (x := x) (y := y') (a := tN (2 * q + 3)) (b := tC q) hi
          (by rw [hI]; simp [portsOf])
        exact TransGen.head h1 (TransGen.single h2)

/-! ### The machine on triples -/

def stp (c : ℕ × ℕ × ℕ) : ℕ × ℕ × ℕ :=
  match fn P c.1 with
  | .inc false q => (q, c.2.1 + 1, c.2.2)
  | .inc true q => (q, c.2.1, c.2.2 + 1)
  | .dec false q z => if c.2.1 = 0 then (z, c.2.1, c.2.2) else (q, c.2.1 - 1, c.2.2)
  | .dec true q z => if c.2.2 = 0 then (z, c.2.1, c.2.2) else (q, c.2.1, c.2.2 - 1)
  | .halt => c

def toC (c : ℕ × ℕ × ℕ) : CM.Cfg ℕ Bool := ⟨c.1, vv c.2.1 c.2.2⟩

theorem toC_inj {c d : ℕ × ℕ × ℕ} (h : toC c = toC d) : c = d := by
  obtain ⟨q, x, y⟩ := c
  obtain ⟨q', x', y'⟩ := d
  simp only [toC, CM.Cfg.mk.injEq] at h
  obtain ⟨rfl, h⟩ := h
  have h1 := congrFun h false
  have h2 := congrFun h true
  simp at h1 h2
  subst h1; subst h2; rfl

theorem stp_spec (c : ℕ × ℕ × ℕ) :
    step (fn P) (toC c) = some (toC (stp P c)) ∨
      (step (fn P) (toC c) = none ∧ stp P c = c ∧ fn P c.1 = .halt) := by
  obtain ⟨q, x, y⟩ := c
  cases hI : fn P q with
  | halt => right; simp [step, toC, stp, hI]
  | inc r q' =>
    left; cases r <;> simp [step, toC, stp, hI, update_vv_false, update_vv_true]
  | dec r q' z =>
    left
    cases r
    · by_cases hx : x = 0
      · simp [step, toC, stp, hI, hx]
      · simp [step, toC, stp, hI, hx, update_vv_false]
    · by_cases hy : y = 0
      · simp [step, toC, stp, hI, hy]
      · simp [step, toC, stp, hI, hy, update_vv_true]

theorem iter_reaches (a : ℕ × ℕ × ℕ) (n : ℕ) :
    Reaches (step (fn P)) (toC a) (toC ((stp P)^[n] a)) := by
  induction n with
  | zero => exact ReflTransGen.refl
  | succ n ih =>
    rw [Function.iterate_succ_apply']
    rcases stp_spec P ((stp P)^[n] a) with h | ⟨_, h, _⟩
    · exact ih.tail h
    · rw [h]; exact ih

theorem iter_stable (a : ℕ × ℕ × ℕ) {n : ℕ} (h : fn P ((stp P)^[n] a).1 = .halt) :
    ∀ N, n ≤ N → (stp P)^[N] a = (stp P)^[n] a := by
  intro N hN
  obtain ⟨d, rfl⟩ : ∃ d, N = n + d := ⟨N - n, by omega⟩
  induction d with
  | zero => rfl
  | succ d ih =>
    rw [← Nat.add_assoc, Function.iterate_succ_apply', ih (by omega)]
    rcases stp_spec P ((stp P)^[n] a) with h' | ⟨_, h', _⟩
    · simp [step, toC, h] at h'
    · exact h'

/-- Counting: a run of `n` machine steps gives a maze path of length `≥ n`. -/
theorem count (a : ℕ × ℕ × ℕ) {c : CM.Cfg ℕ Bool} (h : Reaches (step (fn P)) (toC a) c) :
    ∃ n k, toC ((stp P)^[n] a) = c ∧ n ≤ k ∧ NP (Step (toMaze P)) k (vtx (toC a)) (vtx c) := by
  induction h with
  | refl => exact ⟨0, 0, rfl, le_rfl, .refl _⟩
  | @tail c c' _ hcc ih =>
    obtain ⟨n, k, hc, hnk, hp⟩ := ih
    have hcc' : step (fn P) c = some c' := hcc
    rcases stp_spec P ((stp P)^[n] a) with h' | ⟨h', _, _⟩
    · rw [hc, hcc'] at h'
      obtain ⟨k', hk', hp'⟩ := NP.of_transGen (sim_step₁ P hcc')
      refine ⟨n + 1, k + k', ?_, by omega, hp.trans hp'⟩
      rw [Function.iterate_succ_apply']
      exact (Option.some.inj h').symm
    · rw [hc, hcc'] at h'; cases h'

end sim

/-! ### Functional mazes -/

theorem functional (P : Prog) : ∀ u v v', Step (toMaze P) u v → Step (toMaze P) u v' → v = v' :=
  fun _ _ _ h1 h2 => Option.some.inj ((Undirected.step_tau P h1).symm.trans
    (Undirected.step_tau P h2))

theorem goal_sink (P : Prog) : ∀ v, ¬ Step (toMaze P) goal v := by
  intro v hv
  have := Undirected.step_tau P hv
  simp [Undirected.tau, goal] at this

/-- If `P` halts with zero counters, after `j` steps (`j` = any start–goal path length of
`toMaze P`) the machine sits at a `halt` with both counters zero. -/
theorem halts_within (P : Prog) (h : HaltsZ P) {j : ℕ} (hj : ReachIn (toMaze P) j goal) :
    ∃ q, q < P.length ∧ fn P q = .halt ∧ (stp P)^[j] (0, 0, 0) = (q, 0, 0) := by
  obtain ⟨q, hq, hh, hr⟩ := h
  have hr' : Reaches (step (fn P)) (toC (0, 0, 0)) (toC (q, 0, 0)) := hr
  obtain ⟨n, k, hc, hnk, hp⟩ := count P (0, 0, 0) hr'
  have hc' := toC_inj hc
  have h0 : Step (toMaze P) start (.c 0 0 0) :=
    ⟨0, 0, tW 0, tC 0, by rw [toMaze_ports, mem_ports]; left; simp [blockType], rfl, rfl⟩
  have h1 : Step (toMaze P) (.c 0 0 q) goal :=
    ⟨0, 0, tC q, tW 1, by
      rw [toMaze_ports, mem_ports]; right
      exact ⟨q, hq, by rw [hh]; simp [portsOf, blockType]⟩, rfl, rfl⟩
  have hfull : NP (Step (toMaze P)) (1 + k + 1) start goal :=
    .tail ((NP.single h0).trans hp) h1
  have hlen := NP.len_unique (functional P) (goal_sink P) (reachIn_iff_NP.1 hj) hfull
  refine ⟨q, hq, hh, ?_⟩
  rw [iter_stable P (0, 0, 0) (n := n) (by rw [hc']; exact hh) j (by omega), hc']

/-! ### The bounded check is primitive recursive -/

def chk (P : Prog) (c : ℕ × ℕ × ℕ) : Bool :=
  decide (c.1 < P.length) && decide (Comp.instrEquiv (fn P c.1) = .inr (.inr ())) &&
    decide (c.2.1 = 0) && decide (c.2.2 = 0)

theorem chk_iff (P : Prog) (c : ℕ × ℕ × ℕ) :
    chk P c = true ↔ c.1 < P.length ∧ fn P c.1 = .halt ∧ c.2.1 = 0 ∧ c.2.2 = 0 := by
  have : Comp.instrEquiv (fn P c.1) = .inr (.inr ()) ↔ fn P c.1 = .halt := by
    constructor
    · intro h; exact Comp.instrEquiv.injective (by rw [h]; rfl)
    · intro h; rw [h]; rfl
  simp [chk, this, and_assoc]

/-- `stp` through the sum encoding of instructions. -/
def stp' (I : (Bool × ℕ) ⊕ ((Bool × ℕ × ℕ) ⊕ Unit)) (c : ℕ × ℕ × ℕ) : ℕ × ℕ × ℕ :=
  Sum.casesOn I
    (fun rq => bif rq.1 then (rq.2, c.2.1, c.2.2 + 1) else (rq.2, c.2.1 + 1, c.2.2))
    (fun s => Sum.casesOn s
      (fun rqz => bif rqz.1 then
          (if c.2.2 = 0 then (rqz.2.2, c.2.1, c.2.2) else (rqz.2.1, c.2.1, c.2.2 - 1))
        else (if c.2.1 = 0 then (rqz.2.2, c.2.1, c.2.2) else (rqz.2.1, c.2.1 - 1, c.2.2)))
      (fun _ => c))

theorem stp_eq (P : Prog) (c : ℕ × ℕ × ℕ) : stp P c = stp' (Comp.instrEquiv (fn P c.1)) c := by
  unfold stp
  cases fn P c.1 with
  | inc r q => cases r <;> rfl
  | dec r q z => cases r <;> rfl
  | halt => rfl

abbrev SI := (Bool × ℕ) ⊕ ((Bool × ℕ × ℕ) ⊕ Unit)

theorem stp'_primrec : Primrec₂ stp' := by
  unfold Primrec₂ stp'
  apply Primrec.sumCasesOn Primrec.fst
  · unfold Primrec₂
    have hc : Primrec fun p : (SI × (ℕ × ℕ × ℕ)) × (Bool × ℕ) => p.1.2 :=
      Primrec.snd.comp Primrec.fst
    have hx := Primrec.fst.comp (Primrec.snd.comp hc)
    have hy := Primrec.snd.comp (Primrec.snd.comp hc)
    have hr : Primrec fun p : (SI × (ℕ × ℕ × ℕ)) × (Bool × ℕ) => p.2.1 :=
      Primrec.fst.comp Primrec.snd
    have hq : Primrec fun p : (SI × (ℕ × ℕ × ℕ)) × (Bool × ℕ) => p.2.2 :=
      Primrec.snd.comp Primrec.snd
    exact Primrec.cond hr (hq.pair (hx.pair (Comp.add_c hy 1)))
      (hq.pair ((Comp.add_c hx 1).pair hy))
  · unfold Primrec₂
    apply Primrec.sumCasesOn Primrec.snd
    · unfold Primrec₂
      have hc : Primrec fun p : ((SI × (ℕ × ℕ × ℕ)) × ((Bool × ℕ × ℕ) ⊕ Unit)) ×
          (Bool × ℕ × ℕ) => p.1.1.2 := Primrec.snd.comp (Primrec.fst.comp Primrec.fst)
      have hx := Primrec.fst.comp (Primrec.snd.comp hc)
      have hy := Primrec.snd.comp (Primrec.snd.comp hc)
      have hr : Primrec fun p : ((SI × (ℕ × ℕ × ℕ)) × ((Bool × ℕ × ℕ) ⊕ Unit)) ×
          (Bool × ℕ × ℕ) => p.2.1 := Primrec.fst.comp Primrec.snd
      have hq : Primrec fun p : ((SI × (ℕ × ℕ × ℕ)) × ((Bool × ℕ × ℕ) ⊕ Unit)) ×
          (Bool × ℕ × ℕ) => p.2.2.1 := Primrec.fst.comp (Primrec.snd.comp Primrec.snd)
      have hz : Primrec fun p : ((SI × (ℕ × ℕ × ℕ)) × ((Bool × ℕ × ℕ) ⊕ Unit)) ×
          (Bool × ℕ × ℕ) => p.2.2.2 := Primrec.snd.comp (Primrec.snd.comp Primrec.snd)
      have hy1 := Primrec.nat_sub.comp hy (Primrec.const 1)
      have hx1 := Primrec.nat_sub.comp hx (Primrec.const 1)
      exact Primrec.cond hr
        (Primrec.ite (Comp.eq_c hy 0) (hz.pair (hx.pair hy)) (hq.pair (hx.pair hy1)))
        (Primrec.ite (Comp.eq_c hx 0) (hz.pair (hx.pair hy)) (hq.pair (hx1.pair hy)))
    · unfold Primrec₂
      exact Primrec.snd.comp (Primrec.fst.comp Primrec.fst)

theorem stp_primrec : Primrec₂ stp := by
  have h1 : Primrec fun p : Prog × (ℕ × ℕ × ℕ) => fn p.1 p.2.1 :=
    (Primrec.list_getD (CM.Instr.halt : CM.Instr ℕ Bool)).comp Primrec.fst
      (Primrec.fst.comp Primrec.snd)
  exact (stp'_primrec.comp ((Primrec.of_equiv (e := Comp.instrEquiv)).comp h1) Primrec.snd).of_eq
    fun p => (stp_eq p.1 p.2).symm

theorem chk_primrec : Primrec₂ chk := by
  unfold Primrec₂ chk
  have hP : Primrec fun p : Prog × (ℕ × ℕ × ℕ) => p.1 := Primrec.fst
  have hq : Primrec fun p : Prog × (ℕ × ℕ × ℕ) => p.2.1 := Primrec.fst.comp Primrec.snd
  have hx : Primrec fun p : Prog × (ℕ × ℕ × ℕ) => p.2.2.1 :=
    Primrec.fst.comp (Primrec.snd.comp Primrec.snd)
  have hy : Primrec fun p : Prog × (ℕ × ℕ × ℕ) => p.2.2.2 :=
    Primrec.snd.comp (Primrec.snd.comp Primrec.snd)
  have h1 : Primrec fun p : Prog × (ℕ × ℕ × ℕ) => fn p.1 p.2.1 :=
    (Primrec.list_getD (CM.Instr.halt : CM.Instr ℕ Bool)).comp hP hq
  have d1 := (Comp.lt_c hq (Primrec.list_length.comp hP)).decide
  have d2 := (Primrec.eq.comp ((Primrec.of_equiv (e := Comp.instrEquiv)).comp h1)
    (Primrec.const (Sum.inr (Sum.inr ()) : SI))).decide
  have d3 := (Comp.eq_c hx 0).decide
  have d4 := (Comp.eq_c hy 0).decide
  exact Primrec.and.comp (Primrec.and.comp (Primrec.and.comp d1 d2) d3) d4

theorem size_primrec : Primrec Maze.size := by
  have h := Primrec.of_equiv (e := mazeEquiv)
  have h1 := Primrec.list_length.comp (Primrec.fst.comp h)
  have h2 := Primrec.list_length.comp (Primrec.fst.comp (Primrec.snd.comp h))
  have h3 := Primrec.list_length.comp (Primrec.fst.comp (Primrec.snd.comp (Primrec.snd.comp h)))
  have h4 := Primrec.list_length.comp (Primrec.snd.comp (Primrec.snd.comp (Primrec.snd.comp h)))
  exact (Primrec.nat_add.comp (Primrec.nat_add.comp (Primrec.nat_add.comp h1 h2) h3) h4).of_eq
    fun m => rfl

/-! ### The reduction family -/

noncomputable def Pm (m : ℕ) : Prog := Assemble.finalProg P0 TM0Sim.St.l0 m

theorem mazeOf_eq (m : ℕ) : mazeOf m = toMaze (Pm m) := rfl

theorem Pm_primrec : Primrec Pm :=
  (Primrec.list_append.comp (Primrec.const _) (Comp.loader_primrec _ _)).of_eq fun _ => rfl

attribute [local irreducible] Pm

theorem haltsZ_iff (m : ℕ) : HaltsZ (Pm m) ↔ (fU m).Dom :=
  (MazeCM.solvable_iff _).symm.trans (by rw [← mazeOf_eq]; exact mazeOf_iff m)

theorem key (B : ℕ → ℕ)
    (hB : ∀ m, Solvable (mazeOf m) → ∃ j ≤ B m, ReachIn (mazeOf m) j goal) (m : ℕ) :
    (fU m).Dom ↔ chk (Pm m) ((stp (Pm m))^[B m] (0, 0, 0)) = true := by
  rw [chk_iff]
  constructor
  · intro h
    have hz := (haltsZ_iff m).2 h
    obtain ⟨j, hjB, hj⟩ := hB m (by rw [mazeOf_eq]; exact MazeCM.complete _ hz)
    rw [mazeOf_eq] at hj
    obtain ⟨q, hq, hh, hit⟩ := halts_within (Pm m) hz hj
    rw [iter_stable (Pm m) (0, 0, 0) (n := j) (by rw [hit]; exact hh) (B m) hjB, hit]
    exact ⟨hq, hh, rfl, rfl⟩
  · rintro ⟨hq, hh, hx, hy⟩
    apply (haltsZ_iff m).1
    refine ⟨_, hq, hh, ?_⟩
    have := iter_reaches (Pm m) (0, 0, 0) (B m)
    set c := (stp (Pm m))^[B m] (0, 0, 0)
    have hc : toC c = ⟨c.1, vv 0 0⟩ := by simp [toC, hx, hy]
    rw [hc] at this
    exact this

theorem hit_primrec :
    Primrec fun p : ℕ × ℕ => chk (Pm p.1) ((stp (Pm p.1))^[p.2] (0, 0, 0)) := by
  have h1 : Primrec₂ fun (p : ℕ × ℕ) (c : ℕ × ℕ × ℕ) => stp (Pm p.1) c :=
    stp_primrec.comp (Pm_primrec.comp (Primrec.fst.comp Primrec.fst)) Primrec.snd
  have h2 : Primrec fun p : ℕ × ℕ => (fun c => stp (Pm p.1) c)^[p.2] (0, 0, 0) :=
    Primrec.nat_iterate Primrec.snd (Primrec.const _) h1
  exact chk_primrec.comp (Pm_primrec.comp Primrec.fst) h2

theorem bool_eq_decide (b : Bool) (p : Prop) [Decidable p] (h : p ↔ b = true) : b = decide p := by
  cases b <;> simp_all

theorem decidable_of_bound (B : ℕ → ℕ) (hBc : Computable B)
    (hB : ∀ m, Solvable (mazeOf m) → ∃ j ≤ B m, ReachIn (mazeOf m) j goal) :
    ComputablePred fun m => (fU m).Dom := by
  have hc0 := hit_primrec.to_comp.comp (Computable.id.pair hBc)
  refine ⟨Classical.decPred _, hc0.of_eq fun m => ?_⟩
  show chk (Pm m) ((stp (Pm m))^[B m] (0, 0, 0)) = _
  exact @bool_eq_decide _ ((fU m).Dom) (Classical.decPred (fun m => (fU m).Dom) m) (key B hB m)

end Growth

open Growth

theorem L_not_computably_bounded : LNotComputablyBounded := by
  intro f hf hL
  apply Chain.fU_undec
  refine decidable_of_bound (fun m => f (mazeOf m).size)
    (hf.comp (size_primrec.to_comp.comp mazeOf_computable)) ?_
  intro m hs
  exact ⟨dist (mazeOf m), (Relabel.dist_le_L _ hs).trans (hL _),
    (Relabel.dist_spec (Relabel.reach_iff.1 hs)).1⟩

theorem UL_not_computably_bounded : ULNotComputablyBounded := by
  intro f hf hL
  apply Chain.fU_undec
  refine decidable_of_bound (fun m => f (mazeOf m).size)
    (hf.comp (size_primrec.to_comp.comp mazeOf_computable)) ?_
  intro m hs
  have hu : USolvable (mazeOf m) := (Undirected.usolvable_iff _).2 hs
  have hud := (Relabel.udist_spec (Relabel.ureach_iff.1 hu)).1
  obtain ⟨i, hi, hp⟩ := NP.undirected (functional (Pm m)) (goal_sink (Pm m))
    (ureachIn_iff_NP.1 hud)
  exact ⟨i, hi.trans ((Relabel.udist_le_UL _ hu).trans (hL _)), reachIn_iff_NP.2 hp⟩

end RepeatedMaze

#print axioms RepeatedMaze.L_not_computably_bounded
#print axioms RepeatedMaze.UL_not_computably_bounded
