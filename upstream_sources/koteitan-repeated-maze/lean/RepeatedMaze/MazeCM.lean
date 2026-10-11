import RepeatedMaze.Basic
import RepeatedMaze.CM

/-!
# Compiling a two-counter machine into a maze

A two-counter program is a list `P : List (CM.Instr ℕ Bool)`; register `false` is `x`,
register `true` is `y`; the start state is `0`; an index outside the list behaves like `halt`.

Block `(x, y)` with `C` terminal `q` stands for the configuration `(q, x, y)`.
Intermediate terminals: `W/E` index `2q+2` (arrival after `x+1`), `2q+3` (arrival after `x-1`),
and the same indices on `S/N` for `y`.  Start `W 0` and goal `W 1` live in block `(0,0)`.
-/

namespace RepeatedMaze
namespace MazeCM

open CM StateTransition Relation

abbrev Prog := List (CM.Instr ℕ Bool)

/-- The program as a function. -/
def fn (P : Prog) (q : ℕ) : CM.Instr ℕ Bool := P.getD q .halt

def xPos : BlockType → Bool
  | .normal => true | .ny => true | _ => false

def yPos : BlockType → Bool
  | .normal => true | .nx => true | _ => false

theorem xPos_blockType (x y : ℕ) : xPos (blockType x y) = decide (x ≠ 0) := by
  unfold blockType; split_ifs <;> simp_all [xPos]

theorem yPos_blockType (x y : ℕ) : yPos (blockType x y) = decide (y ≠ 0) := by
  unfold blockType; split_ifs <;> simp_all [yPos]

theorem blockType_zero_iff (x y : ℕ) : blockType x y = .zero ↔ x = 0 ∧ y = 0 := by
  unfold blockType; split_ifs <;> simp_all

def tC (i : ℕ) : Term := ⟨.C, i⟩
def tW (i : ℕ) : Term := ⟨.W, i⟩
def tE (i : ℕ) : Term := ⟨.E, i⟩
def tS (i : ℕ) : Term := ⟨.S, i⟩
def tN (i : ℕ) : Term := ⟨.N, i⟩

/-- Ports contributed by instruction number `i`. -/
def portsOf (bt : BlockType) (i : ℕ) : CM.Instr ℕ Bool → List (Term × Term)
  | .inc false q => [(tC i, tE (2 * q + 2)), (tW (2 * q + 2), tC q)]
  | .inc true q => [(tC i, tN (2 * q + 2)), (tS (2 * q + 2), tC q)]
  | .dec false q z =>
    [if xPos bt then (tC i, tW (2 * q + 3)) else (tC i, tC z), (tE (2 * q + 3), tC q)]
  | .dec true q z =>
    [if yPos bt then (tC i, tS (2 * q + 3)) else (tC i, tC z), (tN (2 * q + 3), tC q)]
  | .halt => if bt = .zero then [(tC i, tW 1)] else []

def ports (P : Prog) (bt : BlockType) : List (Term × Term) :=
  (if bt = .zero then [(tW 0, tC 0)] else []) ++
    (List.range P.length).flatMap (fun i => portsOf bt i (fn P i))

def toMaze (P : Prog) : Maze := ⟨ports P .normal, ports P .nx, ports P .ny, ports P .zero⟩

theorem toMaze_ports (P : Prog) (bt : BlockType) : (toMaze P).ports bt = ports P bt := by
  cases bt <;> rfl

theorem mem_ports {P : Prog} {bt : BlockType} {p : Term × Term} :
    p ∈ ports P bt ↔ (bt = .zero ∧ p = (tW 0, tC 0)) ∨
      ∃ i < P.length, p ∈ portsOf bt i (fn P i) := by
  unfold ports
  simp only [List.mem_append, List.mem_flatMap, List.mem_range]
  constructor
  · rintro (h | h)
    · split_ifs at h with hb
      · simp at h; exact Or.inl ⟨hb, h⟩
      · simp at h
    · exact Or.inr h
  · rintro (⟨hb, rfl⟩ | h)
    · left; simp [hb]
    · exact Or.inr h

/-- Register valuation from two numbers. -/
def vv (x y : ℕ) : Bool → ℕ := fun b => if b then y else x

@[simp] theorem vv_false (x y : ℕ) : vv x y false = x := rfl
@[simp] theorem vv_true (x y : ℕ) : vv x y true = y := rfl

theorem update_vv_false (x y n : ℕ) : Function.update (vv x y) false n = vv n y := by
  funext b; cases b <;> simp [vv]

theorem update_vv_true (x y n : ℕ) : Function.update (vv x y) true n = vv x n := by
  funext b; cases b <;> simp [vv]

theorem vv_eta (v : Bool → ℕ) : vv (v false) (v true) = v := by
  funext b; cases b <;> rfl

/-- Reachable configuration of the program from `(0, 0, 0)`. -/
def R (P : Prog) (q x y : ℕ) : Prop :=
  Reaches (step (fn P)) ⟨0, vv 0 0⟩ ⟨q, vv x y⟩

/-- Halting with both counters zero at an in-range `halt` instruction. -/
def HaltsZ (P : Prog) : Prop :=
  ∃ q, q < P.length ∧ fn P q = .halt ∧ R P q 0 0

theorem fn_lt {P : Prog} {q : ℕ} (h : fn P q ≠ .halt) : q < P.length := by
  by_contra hq
  apply h
  simp [fn, List.getD_eq_getElem?_getD, List.getElem?_eq_none (by omega : P.length ≤ q)]

/-! ### Completeness: a halting run gives a maze path -/

section complete

variable (P : Prog)

def vtx (a : CM.Cfg ℕ Bool) : Vert := .c (a.v false) (a.v true) a.q

theorem step_mem {x y i : ℕ} {a b : Term} (hi : i < P.length)
    (h : (a, b) ∈ portsOf (blockType x y) i (fn P i)) :
    Step (toMaze P) (place x y a) (place x y b) :=
  ⟨x, y, a, b, by rw [toMaze_ports, mem_ports]; exact Or.inr ⟨i, hi, h⟩, rfl, rfl⟩

theorem sim_step {a b : CM.Cfg ℕ Bool} (h : step (fn P) a = some b) :
    ReflTransGen (Step (toMaze P)) (vtx a) (vtx b) := by
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
      exact ReflTransGen.head h1 (ReflTransGen.single h2)
    · rw [update_vv_true]
      have h1 := step_mem P (x := x) (y := y) (a := tC i) (b := tN (2 * q + 2)) hi
        (by rw [hI]; simp [portsOf])
      have h2 := step_mem P (x := x) (y := y + 1) (a := tS (2 * q + 2)) (b := tC q) hi
        (by rw [hI]; simp [portsOf])
      exact ReflTransGen.head h1 (ReflTransGen.single h2)
  | dec r q z =>
    cases r
    · rcases Nat.eq_zero_or_eq_succ_pred x with hx | hx
      · subst hx
        simp only [step, hI, vv_false, if_true, Option.some.injEq] at h
        subst h
        apply ReflTransGen.single
        have := step_mem P (x := 0) (y := y) (a := tC i) (b := tC z) hi
          (by rw [hI]; simp [portsOf, xPos_blockType])
        exact this
      · set x' := x.pred
        rw [hx] at h ⊢
        simp only [step, hI, vv_false, Nat.succ_ne_zero, if_false, Option.some.injEq] at h
        subst h
        rw [update_vv_false]
        have h1 := step_mem P (x := x' + 1) (y := y) (a := tC i) (b := tW (2 * q + 3)) hi
          (by rw [hI]; simp [portsOf, xPos_blockType])
        have h2 := step_mem P (x := x') (y := y) (a := tE (2 * q + 3)) (b := tC q) hi
          (by rw [hI]; simp [portsOf])
        exact ReflTransGen.head h1 (ReflTransGen.single h2)
    · rcases Nat.eq_zero_or_eq_succ_pred y with hy | hy
      · subst hy
        simp only [step, hI, vv_true, if_true, Option.some.injEq] at h
        subst h
        apply ReflTransGen.single
        have := step_mem P (x := x) (y := 0) (a := tC i) (b := tC z) hi
          (by rw [hI]; simp [portsOf, yPos_blockType])
        exact this
      · set y' := y.pred
        rw [hy] at h ⊢
        simp only [step, hI, vv_true, Nat.succ_ne_zero, if_false, Option.some.injEq] at h
        subst h
        rw [update_vv_true]
        have h1 := step_mem P (x := x) (y := y' + 1) (a := tC i) (b := tS (2 * q + 3)) hi
          (by rw [hI]; simp [portsOf, yPos_blockType])
        have h2 := step_mem P (x := x) (y := y') (a := tN (2 * q + 3)) (b := tC q) hi
          (by rw [hI]; simp [portsOf])
        exact ReflTransGen.head h1 (ReflTransGen.single h2)

theorem sim_reaches {a b : CM.Cfg ℕ Bool} (h : Reaches (step (fn P)) a b) :
    ReflTransGen (Step (toMaze P)) (vtx a) (vtx b) := by
  induction h with
  | refl => exact ReflTransGen.refl
  | tail _ h2 ih => exact ih.trans (sim_step P h2)

theorem complete (h : HaltsZ P) : Solvable (toMaze P) := by
  obtain ⟨q, hq, hh, hr⟩ := h
  have h0 : Step (toMaze P) start (.c 0 0 0) :=
    ⟨0, 0, tW 0, tC 0, by rw [toMaze_ports, mem_ports]; left; simp [blockType], rfl, rfl⟩
  have h1 : Step (toMaze P) (.c 0 0 q) goal :=
    ⟨0, 0, tC q, tW 1, by
      rw [toMaze_ports, mem_ports]; right
      exact ⟨q, hq, by rw [hh]; simp [portsOf, blockType]⟩, rfl, rfl⟩
  have := sim_reaches P hr
  simp only [vtx, vv_false, vv_true] at this
  exact ReflTransGen.head h0 (this.tail h1)

end complete

/-! ### Soundness: a maze path gives a halting run -/

section sound

variable (P : Prog)

/-- Vertices reachable from the start, described through reachable configurations. -/
def Good (u : Vert) : Prop :=
  u = start ∨
  (∃ q x y, R P q x y ∧ u = .c x y q) ∨
  (∃ q x y, R P q x y ∧ 1 ≤ x ∧ u = .w x y (2 * q + 2)) ∨
  (∃ q x y, R P q x y ∧ u = .w (x + 1) y (2 * q + 3)) ∨
  (∃ q x y, R P q x y ∧ 1 ≤ y ∧ u = .s x y (2 * q + 2)) ∨
  (∃ q x y, R P q x y ∧ u = .s x (y + 1) (2 * q + 3)) ∨
  (u = goal ∧ HaltsZ P)

variable {P}

theorem good_c {x y i : ℕ} (h : Good P (.c x y i)) : R P i x y := by
  rcases h with h | ⟨q, x', y', hr, h⟩ | ⟨q, x', y', hr, _, h⟩ | ⟨q, x', y', hr, h⟩ |
    ⟨q, x', y', hr, _, h⟩ | ⟨q, x', y', hr, h⟩ | ⟨h, _⟩ <;>
    simp_all [start, goal]

theorem good_w {x y j : ℕ} (h : Good P (.w x y j)) :
    (∃ q, j = 2 * q + 2 ∧ 1 ≤ x ∧ R P q x y) ∨
    (∃ q x', x = x' + 1 ∧ j = 2 * q + 3 ∧ R P q x' y) ∨
    (j = 1 ∧ x = 0 ∧ y = 0 ∧ HaltsZ P) ∨ (j = 0 ∧ x = 0 ∧ y = 0) := by
  rcases h with h | ⟨q, x', y', hr, h⟩ | ⟨q, x', y', hr, h1, h⟩ | ⟨q, x', y', hr, h⟩ |
    ⟨q, x', y', hr, _, h⟩ | ⟨q, x', y', hr, h⟩ | ⟨h, hh⟩
  · simp [start] at h; omega
  · simp at h
  · simp at h; obtain ⟨rfl, rfl, rfl⟩ := h; exact Or.inl ⟨q, rfl, h1, hr⟩
  · simp at h; obtain ⟨rfl, rfl, rfl⟩ := h; exact Or.inr (Or.inl ⟨q, x', rfl, rfl, hr⟩)
  · simp at h
  · simp at h
  · simp [goal] at h; obtain ⟨rfl, rfl, rfl⟩ := h; exact Or.inr (Or.inr (Or.inl ⟨rfl, rfl, rfl, hh⟩))

theorem good_s {x y j : ℕ} (h : Good P (.s x y j)) :
    (∃ q, j = 2 * q + 2 ∧ 1 ≤ y ∧ R P q x y) ∨
    (∃ q y', y = y' + 1 ∧ j = 2 * q + 3 ∧ R P q x y') := by
  rcases h with h | ⟨q, x', y', hr, h⟩ | ⟨q, x', y', hr, h1, h⟩ | ⟨q, x', y', hr, h⟩ |
    ⟨q, x', y', hr, h1, h⟩ | ⟨q, x', y', hr, h⟩ | ⟨h, hh⟩
  · simp [start] at h
  · simp at h
  · simp at h
  · simp at h
  · simp at h; obtain ⟨rfl, rfl, rfl⟩ := h; exact Or.inl ⟨q, rfl, h1, hr⟩
  · simp at h; obtain ⟨rfl, rfl, rfl⟩ := h; exact Or.inr ⟨q, y', rfl, rfl, hr⟩
  · simp [goal] at h

theorem R_step {q x y q' x' y' : ℕ} (h : R P q x y)
    (hs : step (fn P) ⟨q, vv x y⟩ = some ⟨q', vv x' y'⟩) : R P q' x' y' :=
  ReflTransGen.tail h hs

theorem good_step {u v : Vert} (hu : Good P u) (h : Step (toMaze P) u v) : Good P v := by
  obtain ⟨X, Y, a, b, hm, rfl, rfl⟩ := h
  rw [toMaze_ports, mem_ports] at hm
  rcases hm with ⟨hb, he⟩ | ⟨i, hi, hm⟩
  · rw [blockType_zero_iff] at hb
    obtain ⟨rfl, rfl⟩ := hb
    simp only [Prod.mk.injEq] at he
    obtain ⟨rfl, rfl⟩ := he
    exact Or.inr (Or.inl ⟨0, 0, 0, ReflTransGen.refl, rfl⟩)
  cases hI : fn P i with
  | halt =>
    rw [hI] at hm
    simp only [portsOf] at hm
    split_ifs at hm with hb
    · simp only [List.mem_singleton, Prod.mk.injEq] at hm
      obtain ⟨rfl, rfl⟩ := hm
      rw [blockType_zero_iff] at hb
      obtain ⟨rfl, rfl⟩ := hb
      have := good_c hu
      exact Or.inr (Or.inr (Or.inr (Or.inr (Or.inr (Or.inr ⟨rfl, i, hi, hI, this⟩)))))
    · simp at hm
  | inc r q =>
    rw [hI] at hm
    cases r <;> simp only [portsOf, List.mem_cons, List.not_mem_nil,
      or_false, Prod.mk.injEq] at hm <;> rcases hm with ⟨rfl, rfl⟩ | ⟨rfl, rfl⟩
    · have hr := good_c hu
      have : R P q (X + 1) Y := R_step hr (by rw [step_inc hI, update_vv_false]; rfl)
      exact Or.inr (Or.inr (Or.inl ⟨q, X + 1, Y, this, by omega, rfl⟩))
    · rcases good_w hu with ⟨q', hq, _, hr⟩ | ⟨q', x', _, hq, _⟩ | ⟨hq, _⟩ | ⟨hq, _⟩
      · have : q' = q := by omega
        subst this
        exact Or.inr (Or.inl ⟨q', X, Y, hr, rfl⟩)
      all_goals omega
    · have hr := good_c hu
      have : R P q X (Y + 1) := R_step hr (by rw [step_inc hI, update_vv_true]; rfl)
      exact Or.inr (Or.inr (Or.inr (Or.inr (Or.inl ⟨q, X, Y + 1, this, by omega, rfl⟩))))
    · rcases good_s hu with ⟨q', hq, _, hr⟩ | ⟨q', y', _, hq, _⟩
      · have : q' = q := by omega
        subst this
        exact Or.inr (Or.inl ⟨q', X, Y, hr, rfl⟩)
      all_goals omega
  | dec r q z =>
    rw [hI] at hm
    cases r
    · simp only [portsOf, List.mem_cons, List.not_mem_nil,
        or_false] at hm
      rcases hm with hm | hm
      · rw [xPos_blockType] at hm
        have hr := good_c (by
          split_ifs at hm <;> simp only [Prod.mk.injEq] at hm <;> obtain ⟨rfl, _⟩ := hm <;>
            exact hu)
        by_cases hX : X = 0
        · subst hX
          simp only [ne_eq, not_true_eq_false, decide_false, Bool.false_eq_true, if_false,
            Prod.mk.injEq] at hm
          obtain ⟨rfl, rfl⟩ := hm
          have : R P z 0 Y := R_step hr (step_dec_zero hI (by simp))
          exact Or.inr (Or.inl ⟨z, 0, Y, this, rfl⟩)
        · simp only [ne_eq, hX, not_false_eq_true, decide_true, if_true, Prod.mk.injEq] at hm
          obtain ⟨rfl, rfl⟩ := hm
          obtain ⟨X', rfl⟩ : ∃ X', X = X' + 1 := ⟨X - 1, by omega⟩
          have : R P q X' Y := R_step hr (by rw [step_dec_succ (n := X') hI (by simp), update_vv_false])
          exact Or.inr (Or.inr (Or.inr (Or.inl ⟨q, X', Y, this, rfl⟩)))
      · simp only [Prod.mk.injEq] at hm
        obtain ⟨rfl, rfl⟩ := hm
        rcases good_w hu with ⟨q', hq, _, hr⟩ | ⟨q', x', hx, hq, hr⟩ | ⟨hq, _⟩ | ⟨hq, _⟩
        · omega
        · have : q' = q := by omega
          subst this
          have : x' = X := by omega
          subst this
          exact Or.inr (Or.inl ⟨q', x', Y, hr, rfl⟩)
        all_goals omega
    · simp only [portsOf, List.mem_cons, List.not_mem_nil,
        or_false] at hm
      rcases hm with hm | hm
      · rw [yPos_blockType] at hm
        have hr := good_c (by
          split_ifs at hm <;> simp only [Prod.mk.injEq] at hm <;> obtain ⟨rfl, _⟩ := hm <;>
            exact hu)
        by_cases hY : Y = 0
        · subst hY
          simp only [ne_eq, not_true_eq_false, decide_false, Bool.false_eq_true, if_false,
            Prod.mk.injEq] at hm
          obtain ⟨rfl, rfl⟩ := hm
          have : R P z X 0 := R_step hr (step_dec_zero hI (by simp))
          exact Or.inr (Or.inl ⟨z, X, 0, this, rfl⟩)
        · simp only [ne_eq, hY, not_false_eq_true, decide_true, if_true, Prod.mk.injEq] at hm
          obtain ⟨rfl, rfl⟩ := hm
          obtain ⟨Y', rfl⟩ : ∃ Y', Y = Y' + 1 := ⟨Y - 1, by omega⟩
          have : R P q X Y' := R_step hr (by rw [step_dec_succ (n := Y') hI (by simp), update_vv_true])
          exact Or.inr (Or.inr (Or.inr (Or.inr (Or.inr (Or.inl ⟨q, X, Y', this, rfl⟩)))))
      · simp only [Prod.mk.injEq] at hm
        obtain ⟨rfl, rfl⟩ := hm
        rcases good_s hu with ⟨q', hq, _, hr⟩ | ⟨q', y', hy, hq, hr⟩
        · omega
        · have : q' = q := by omega
          subst this
          have : y' = Y := by omega
          subst this
          exact Or.inr (Or.inl ⟨q', X, y', hr, rfl⟩)

theorem sound (h : Solvable (toMaze P)) : HaltsZ P := by
  have : ∀ v, ReflTransGen (Step (toMaze P)) start v → Good P v := by
    intro v hv
    induction hv with
    | refl => exact Or.inl rfl
    | tail _ h2 ih => exact good_step ih h2
  rcases good_w (this goal h) with ⟨q, hq, _⟩ | ⟨q, x', _, hq, _⟩ | ⟨_, _, _, hh⟩ | ⟨hq, _⟩
  · omega
  · omega
  · exact hh
  · omega

end sound

theorem solvable_iff (P : Prog) : Solvable (toMaze P) ↔ HaltsZ P :=
  ⟨sound, complete P⟩

end MazeCM
end RepeatedMaze
