import RepeatedMaze.MazeCM

/-!
# Undirected reading for compiled mazes

Every vertex of `toMaze P` has at most one successor, and `goal` has none.
In such a graph an undirected start–goal path gives a directed one.
-/

namespace RepeatedMaze
namespace Undirected

open Relation MazeCM CM

/-- In a functional relation, undirected reachability of a sink is directed reachability. -/
theorem functional_reach {α : Type*} (r : α → α → Prop)
    (hf : ∀ u v v', r u v → r u v' → v = v') {a b : α} (hb : ∀ v, ¬ r b v)
    (h : ReflTransGen (fun u v => r u v ∨ r v u) a b) : ReflTransGen r a b := by
  have key : ∀ c, ReflTransGen (fun u v => r u v ∨ r v u) a c →
      ∃ w, ReflTransGen r a w ∧ ReflTransGen r c w := by
    intro c hc
    induction hc with
    | refl => exact ⟨a, ReflTransGen.refl, ReflTransGen.refl⟩
    | @tail c d _ hcd ih =>
      obtain ⟨w, haw, hcw⟩ := ih
      rcases hcd with hcd | hdc
      · rcases ReflTransGen.cases_head hcw with rfl | ⟨e, hce, hew⟩
        · exact ⟨d, haw.tail hcd, ReflTransGen.refl⟩
        · have := hf _ _ _ hce hcd
          subst this
          exact ⟨w, haw, hew⟩
      · exact ⟨w, haw, ReflTransGen.head hdc hcw⟩
  obtain ⟨w, haw, hbw⟩ := key b h
  rcases ReflTransGen.cases_head hbw with rfl | ⟨e, hbe, _⟩
  · exact haw
  · exact absurd hbe (hb e)

variable (P : Prog)

/-- The unique successor of a vertex (if any). -/
def tau : Vert → Option Vert
  | .c x y i =>
    match fn P i with
    | .inc false q => some (.w (x + 1) y (2 * q + 2))
    | .inc true q => some (.s x (y + 1) (2 * q + 2))
    | .dec false q z => if x ≠ 0 then some (.w x y (2 * q + 3)) else some (.c x y z)
    | .dec true q z => if y ≠ 0 then some (.s x y (2 * q + 3)) else some (.c x y z)
    | .halt => if x = 0 ∧ y = 0 then some goal else none
  | .w x y j =>
    if j = 0 then (if x = 0 ∧ y = 0 then some (.c 0 0 0) else none)
    else if j % 2 = 0 then some (.c x y ((j - 2) / 2))
    else if 3 ≤ j ∧ 1 ≤ x then some (.c (x - 1) y ((j - 3) / 2)) else none
  | .s x y j =>
    if j % 2 = 0 then (if 2 ≤ j then some (.c x y ((j - 2) / 2)) else none)
    else if 3 ≤ j ∧ 1 ≤ y then some (.c x (y - 1) ((j - 3) / 2)) else none

theorem step_tau {u v : Vert} (h : Step (toMaze P) u v) : tau P u = some v := by
  obtain ⟨X, Y, a, b, hm, rfl, rfl⟩ := h
  rw [toMaze_ports, mem_ports] at hm
  rcases hm with ⟨hb, he⟩ | ⟨i, _, hm⟩
  · rw [blockType_zero_iff] at hb
    obtain ⟨rfl, rfl⟩ := hb
    simp only [Prod.mk.injEq] at he
    obtain ⟨rfl, rfl⟩ := he
    simp [tau, place, tW, tC]
  cases hI : fn P i with
  | halt =>
    rw [hI] at hm
    simp only [portsOf] at hm
    split_ifs at hm with hb
    · simp only [List.mem_singleton, Prod.mk.injEq] at hm
      obtain ⟨rfl, rfl⟩ := hm
      rw [blockType_zero_iff] at hb
      obtain ⟨rfl, rfl⟩ := hb
      simp [tau, place, tC, tW, hI, goal]
    · simp at hm
  | inc r q =>
    rw [hI] at hm
    cases r <;> simp only [portsOf, List.mem_cons, List.not_mem_nil, or_false,
      Prod.mk.injEq] at hm <;> rcases hm with ⟨rfl, rfl⟩ | ⟨rfl, rfl⟩
    · simp [tau, place, tC, tE, hI]
    · simp [tau, place, tW, tC]
    · simp [tau, place, tC, tN, hI]
    · simp [tau, place, tS, tC]
  | dec r q z =>
    rw [hI] at hm
    cases r <;> simp only [portsOf, List.mem_cons, List.not_mem_nil, or_false] at hm <;>
      rcases hm with hm | hm
    · rw [xPos_blockType] at hm
      by_cases hX : X = 0
      · simp only [hX, ne_eq, not_true_eq_false, decide_false, Bool.false_eq_true, if_false,
          Prod.mk.injEq] at hm
        obtain ⟨rfl, rfl⟩ := hm
        simp [tau, place, tC, hI, hX]
      · simp only [hX, ne_eq, not_false_eq_true, decide_true, if_true, Prod.mk.injEq] at hm
        obtain ⟨rfl, rfl⟩ := hm
        simp [tau, place, tC, tW, hI, hX]
    · simp only [Prod.mk.injEq] at hm
      obtain ⟨rfl, rfl⟩ := hm
      simp [tau, place, tE, tC]
    · rw [yPos_blockType] at hm
      by_cases hY : Y = 0
      · simp only [hY, ne_eq, not_true_eq_false, decide_false, Bool.false_eq_true, if_false,
          Prod.mk.injEq] at hm
        obtain ⟨rfl, rfl⟩ := hm
        simp [tau, place, tC, hI, hY]
      · simp only [hY, ne_eq, not_false_eq_true, decide_true, if_true, Prod.mk.injEq] at hm
        obtain ⟨rfl, rfl⟩ := hm
        simp [tau, place, tC, tS, hI, hY]
    · simp only [Prod.mk.injEq] at hm
      obtain ⟨rfl, rfl⟩ := hm
      simp [tau, place, tN, tC]

theorem usolvable_iff : USolvable (toMaze P) ↔ Solvable (toMaze P) := by
  constructor
  · intro h
    apply functional_reach (Step (toMaze P))
    · intro u v v' h1 h2
      have := (step_tau P h1).symm.trans (step_tau P h2)
      exact Option.some.inj this
    · intro v hv
      have := step_tau P hv
      simp [tau, goal] at this
    · exact h
  · intro h
    unfold Solvable at h; unfold USolvable
    exact ReflTransGen.mono (fun u v huv => Or.inl huv) _ _ h

end Undirected
end RepeatedMaze
