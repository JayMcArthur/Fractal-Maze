import RepeatedMaze.GrowthSpec
import Mathlib.Data.Set.Finite.List
import Mathlib.Data.Set.Finite.Lattice
import Mathlib.Order.ConditionallyCompleteLattice.Basic
import Mathlib.Data.Fintype.EquivFin
import Mathlib.Logic.Relation

/-!
# The sets defining `L n` and `UL n` are bounded

Relabel terminal indices by their position in the list `used m` (which starts with `0, 1`).
This keeps `Step`, `ReachIn`, `dist` (and the undirected versions) and the size, and puts every
index below `2 + 2 * size`.  There are only finitely many such mazes of size `≤ n`.
-/

namespace RepeatedMaze
namespace Relabel

open Relation

def idx : Vert → ℕ
  | .c _ _ i => i
  | .w _ _ i => i
  | .s _ _ i => i

def vmap (g : ℕ → ℕ) : Vert → Vert
  | .c x y i => .c x y (g i)
  | .w x y i => .w x y (g i)
  | .s x y i => .s x y (g i)

def tmap (g : ℕ → ℕ) (t : Term) : Term := ⟨t.side, g t.idx⟩

def pm (g : ℕ → ℕ) (p : Term × Term) : Term × Term := (tmap g p.1, tmap g p.2)

def mmap (g : ℕ → ℕ) (m : Maze) : Maze :=
  ⟨m.normal.map (pm g), m.nx.map (pm g), m.ny.map (pm g), m.zero.map (pm g)⟩

theorem mmap_ports (g : ℕ → ℕ) (m : Maze) (bt : BlockType) :
    (mmap g m).ports bt = (m.ports bt).map (pm g) := by
  cases bt <;> rfl

theorem mmap_size (g : ℕ → ℕ) (m : Maze) : (mmap g m).size = m.size := by
  simp [mmap, Maze.size]

theorem place_tmap (g : ℕ → ℕ) (x y : ℕ) (t : Term) :
    place x y (tmap g t) = vmap g (place x y t) := by
  obtain ⟨s, i⟩ := t
  cases s <;> rfl

theorem idx_place (x y : ℕ) (t : Term) : idx (place x y t) = t.idx := by
  obtain ⟨s, i⟩ := t
  cases s <;> rfl

/-! ### The list of used indices -/

def allPorts (m : Maze) : List (Term × Term) := m.normal ++ m.nx ++ m.ny ++ m.zero

theorem mem_allPorts {m : Maze} {bt : BlockType} {p : Term × Term} (h : p ∈ m.ports bt) :
    p ∈ allPorts m := by
  cases bt <;> simp_all [allPorts, Maze.ports]

def idxs : List (Term × Term) → List ℕ
  | [] => []
  | p :: l => p.1.idx :: p.2.idx :: idxs l

theorem idxs_length (l : List (Term × Term)) : (idxs l).length = 2 * l.length := by
  induction l with
  | nil => rfl
  | cons p l ih => simp [idxs, ih]; omega

theorem mem_idxs {l : List (Term × Term)} {p : Term × Term} (h : p ∈ l) :
    p.1.idx ∈ idxs l ∧ p.2.idx ∈ idxs l := by
  induction l with
  | nil => simp at h
  | cons q l ih =>
    rcases List.mem_cons.1 h with rfl | h
    · simp [idxs]
    · have := ih h; simp [idxs, this]

def used (m : Maze) : List ℕ := 0 :: 1 :: idxs (allPorts m)

theorem used_length (m : Maze) : (used m).length = 2 + 2 * m.size := by
  simp [used, idxs_length, allPorts, Maze.size]; omega

def G (m : Maze) (i : ℕ) : ℕ := (used m).idxOf i

theorem G_zero (m : Maze) : G m 0 = 0 := by simp [G, used]

theorem G_one (m : Maze) : G m 1 = 1 := by
  simp [G, used, List.idxOf_cons_ne _ (show (0 : ℕ) ≠ 1 by decide)]

theorem G_lt (m : Maze) {i : ℕ} (h : i ∈ used m) : G m i < 2 + 2 * m.size := by
  rw [← used_length]; exact List.idxOf_lt_length_iff.2 h

theorem port_used {m : Maze} {bt : BlockType} {p : Term × Term} (h : p ∈ m.ports bt) :
    p.1.idx ∈ used m ∧ p.2.idx ∈ used m := by
  have := mem_idxs (mem_allPorts h)
  simp [used, this]

theorem vmap_start (m : Maze) : vmap (G m) start = start := by
  simp [vmap, start, G_zero]

theorem vmap_goal (m : Maze) : vmap (G m) goal = goal := by
  simp [vmap, goal, G_one]

theorem vmap_inj {m : Maze} {u w : Vert} (hu : idx u ∈ used m)
    (h : vmap (G m) u = vmap (G m) w) : u = w := by
  cases u <;> cases w <;> simp_all [vmap, idx, G] <;> exact (List.idxOf_inj hu).1 h.2.2

theorem start_used (m : Maze) : idx start ∈ used m := by simp [start, idx, used]
theorem goal_used (m : Maze) : idx goal ∈ used m := by simp [goal, idx, used]

/-! ### Steps -/

theorem step_map {m : Maze} {u v : Vert} (g : ℕ → ℕ) (h : Step m u v) :
    Step (mmap g m) (vmap g u) (vmap g v) := by
  obtain ⟨x, y, a, b, hm, rfl, rfl⟩ := h
  refine ⟨x, y, tmap g a, tmap g b, ?_, place_tmap g x y a, place_tmap g x y b⟩
  rw [mmap_ports]
  exact List.mem_map.2 ⟨(a, b), hm, rfl⟩

theorem step_used {m : Maze} {u v : Vert} (h : Step m u v) : idx u ∈ used m ∧ idx v ∈ used m := by
  obtain ⟨x, y, a, b, hm, rfl, rfl⟩ := h
  rw [idx_place, idx_place]
  exact port_used hm

theorem step_back {m : Maze} {u' v' : Vert} (g : ℕ → ℕ) (h : Step (mmap g m) u' v') :
    ∃ u v, Step m u v ∧ u' = vmap g u ∧ v' = vmap g v := by
  obtain ⟨x, y, a', b', hm, rfl, rfl⟩ := h
  rw [mmap_ports] at hm
  obtain ⟨⟨a, b⟩, hab, he⟩ := List.mem_map.1 hm
  simp only [pm, Prod.mk.injEq] at he
  obtain ⟨rfl, rfl⟩ := he
  exact ⟨_, _, ⟨x, y, a, b, hab, rfl, rfl⟩, place_tmap g x y a, place_tmap g x y b⟩

/-! ### Directed paths -/

theorem reach_iff {m : Maze} {v : Vert} : ReflTransGen (Step m) start v ↔ ∃ k, ReachIn m k v := by
  constructor
  · intro h
    induction h with
    | refl => exact ⟨0, .zero⟩
    | tail _ h2 ih => obtain ⟨k, hk⟩ := ih; exact ⟨k + 1, .succ hk h2⟩
  · rintro ⟨k, hk⟩
    induction hk with
    | zero => exact ReflTransGen.refl
    | succ _ h2 ih => exact ih.tail h2

theorem reachIn_map {m : Maze} {k : ℕ} {v : Vert} (h : ReachIn m k v) :
    ReachIn (mmap (G m) m) k (vmap (G m) v) := by
  induction h with
  | zero => rw [vmap_start]; exact .zero
  | succ _ h2 ih => exact .succ ih (step_map _ h2)

theorem reachIn_used {m : Maze} {k : ℕ} {v : Vert} (h : ReachIn m k v) : idx v ∈ used m := by
  cases h with
  | zero => exact start_used m
  | succ _ h2 => exact (step_used h2).2

theorem reachIn_back {m : Maze} {k : ℕ} {v' : Vert} (h : ReachIn (mmap (G m) m) k v') :
    ∃ v, ReachIn m k v ∧ v' = vmap (G m) v := by
  induction h with
  | zero => exact ⟨start, .zero, (vmap_start m).symm⟩
  | succ _ h2 ih =>
    obtain ⟨u, hu, rfl⟩ := ih
    obtain ⟨u0, v0, hs, he, rfl⟩ := step_back _ h2
    have : u0 = u := vmap_inj (step_used hs).1 he.symm
    subst this
    exact ⟨v0, .succ hu hs, rfl⟩

theorem reachIn_goal_iff (m : Maze) (k : ℕ) :
    ReachIn (mmap (G m) m) k goal ↔ ReachIn m k goal := by
  constructor
  · intro h
    obtain ⟨v, hv, he⟩ := reachIn_back h
    rw [← vmap_goal m] at he
    have := vmap_inj (goal_used m) he
    subst this; exact hv
  · intro h; have := reachIn_map h; rwa [vmap_goal] at this

/-! ### Undirected paths -/

theorem ustep_map {m : Maze} {u v : Vert} (g : ℕ → ℕ) (h : UStep m u v) :
    UStep (mmap g m) (vmap g u) (vmap g v) := by
  rcases h with h | h
  · exact Or.inl (step_map g h)
  · exact Or.inr (step_map g h)

theorem ustep_used {m : Maze} {u v : Vert} (h : UStep m u v) : idx u ∈ used m ∧ idx v ∈ used m := by
  rcases h with h | h
  · exact step_used h
  · exact (step_used h).symm

theorem ustep_back {m : Maze} {u' v' : Vert} (g : ℕ → ℕ) (h : UStep (mmap g m) u' v') :
    ∃ u v, UStep m u v ∧ u' = vmap g u ∧ v' = vmap g v := by
  rcases h with h | h
  · obtain ⟨u, v, hs, rfl, rfl⟩ := step_back g h
    exact ⟨u, v, Or.inl hs, rfl, rfl⟩
  · obtain ⟨u, v, hs, rfl, rfl⟩ := step_back g h
    exact ⟨v, u, Or.inr hs, rfl, rfl⟩

theorem ureach_iff {m : Maze} {v : Vert} :
    ReflTransGen (fun u v => Step m u v ∨ Step m v u) start v ↔ ∃ k, UReachIn m k v := by
  constructor
  · intro h
    induction h with
    | refl => exact ⟨0, .zero⟩
    | tail _ h2 ih => obtain ⟨k, hk⟩ := ih; exact ⟨k + 1, .succ hk h2⟩
  · rintro ⟨k, hk⟩
    induction hk with
    | zero => exact ReflTransGen.refl
    | succ _ h2 ih => exact ih.tail h2

theorem ureachIn_map {m : Maze} {k : ℕ} {v : Vert} (h : UReachIn m k v) :
    UReachIn (mmap (G m) m) k (vmap (G m) v) := by
  induction h with
  | zero => rw [vmap_start]; exact .zero
  | succ _ h2 ih => exact .succ ih (ustep_map _ h2)

theorem ureachIn_back {m : Maze} {k : ℕ} {v' : Vert} (h : UReachIn (mmap (G m) m) k v') :
    ∃ v, UReachIn m k v ∧ v' = vmap (G m) v := by
  induction h with
  | zero => exact ⟨start, .zero, (vmap_start m).symm⟩
  | succ _ h2 ih =>
    obtain ⟨u, hu, rfl⟩ := ih
    obtain ⟨u0, v0, hs, he, rfl⟩ := ustep_back _ h2
    have : u0 = u := vmap_inj (ustep_used hs).1 he.symm
    subst this
    exact ⟨v0, .succ hu hs, rfl⟩

theorem ureachIn_goal_iff (m : Maze) (k : ℕ) :
    UReachIn (mmap (G m) m) k goal ↔ UReachIn m k goal := by
  constructor
  · intro h
    obtain ⟨v, hv, he⟩ := ureachIn_back h
    rw [← vmap_goal m] at he
    have := vmap_inj (goal_used m) he
    subst this; exact hv
  · intro h; have := ureachIn_map h; rwa [vmap_goal] at this

/-! ### `dist` only depends on the set of path lengths -/

theorem dist_spec {m : Maze} (h : ∃ k, ReachIn m k goal) :
    ReachIn m (dist m) goal ∧ ∀ k, ReachIn m k goal → dist m ≤ k := by
  classical
  unfold dist
  rw [dif_pos h]
  exact ⟨Nat.find_spec h, fun k hk => Nat.find_min' h hk⟩

theorem udist_spec {m : Maze} (h : ∃ k, UReachIn m k goal) :
    UReachIn m (udist m) goal ∧ ∀ k, UReachIn m k goal → udist m ≤ k := by
  classical
  unfold udist
  rw [dif_pos h]
  exact ⟨Nat.find_spec h, fun k hk => Nat.find_min' h hk⟩

theorem dist_mmap (m : Maze) (h : Solvable m) : dist (mmap (G m) m) = dist m := by
  have h1 : ∃ k, ReachIn m k goal := reach_iff.1 h
  have h2 : ∃ k, ReachIn (mmap (G m) m) k goal := by
    obtain ⟨k, hk⟩ := h1; exact ⟨k, (reachIn_goal_iff m k).2 hk⟩
  apply le_antisymm
  · exact (dist_spec h2).2 _ ((reachIn_goal_iff m _).2 (dist_spec h1).1)
  · exact (dist_spec h1).2 _ ((reachIn_goal_iff m _).1 (dist_spec h2).1)

theorem udist_mmap (m : Maze) (h : USolvable m) : udist (mmap (G m) m) = udist m := by
  have h1 : ∃ k, UReachIn m k goal := ureach_iff.1 h
  have h2 : ∃ k, UReachIn (mmap (G m) m) k goal := by
    obtain ⟨k, hk⟩ := h1; exact ⟨k, (ureachIn_goal_iff m k).2 hk⟩
  apply le_antisymm
  · exact (udist_spec h2).2 _ ((ureachIn_goal_iff m _).2 (udist_spec h1).1)
  · exact (udist_spec h1).2 _ ((ureachIn_goal_iff m _).1 (udist_spec h2).1)

/-! ### Finiteness -/

instance : Fintype Side := Fintype.ofEquiv (Fin 5) sideEquiv.symm

/-- Mazes of size `≤ n` with all indices `< N`. -/
def Small (n N : ℕ) : Set Maze :=
  {m | m.size ≤ n ∧ ∀ p ∈ allPorts m, p.1.idx < N ∧ p.2.idx < N}

theorem finite_lists {β : Type*} (s : Set β) (hs : s.Finite) (n : ℕ) :
    {l : List β | l.length ≤ n ∧ ∀ x ∈ l, x ∈ s}.Finite := by
  haveI := hs.to_subtype
  refine ((List.finite_length_le (↥s) n).image (List.map Subtype.val)).subset ?_
  rintro l ⟨hl, hls⟩
  refine ⟨l.pmap Subtype.mk hls, by simpa using hl, ?_⟩
  simp [List.map_pmap]

theorem small_finite (n N : ℕ) : (Small n N).Finite := by
  set T : Set Term := {t | t.idx < N}
  have hT : T.Finite := by
    refine (Set.finite_range (fun p : Side × Fin N => (⟨p.1, p.2⟩ : Term))).subset ?_
    intro t ht
    exact ⟨(t.side, ⟨t.idx, ht⟩), rfl⟩
  set LS := {l : List (Term × Term) | l.length ≤ n ∧ ∀ x ∈ l, x ∈ T ×ˢ T}
  have hLS : LS.Finite := finite_lists _ (hT.prod hT) n
  refine (((hLS.prod (hLS.prod (hLS.prod hLS))).image mazeEquiv.symm)).subset ?_
  rintro m ⟨hs, hi⟩
  refine ⟨mazeEquiv m, ?_, mazeEquiv.symm_apply_apply m⟩
  simp only [Maze.size] at hs
  have hmem : ∀ p, p ∈ m.normal ∨ p ∈ m.nx ∨ p ∈ m.ny ∨ p ∈ m.zero → p ∈ T ×ˢ T := by
    intro p hp
    have := hi p (by simp only [allPorts, List.mem_append]; tauto)
    exact ⟨this.1, this.2⟩
  refine ⟨⟨by simp [mazeEquiv]; omega, fun x hx => hmem x (Or.inl hx)⟩,
    ⟨by simp [mazeEquiv]; omega, fun x hx => hmem x (Or.inr (Or.inl hx))⟩,
    ⟨by simp [mazeEquiv]; omega, fun x hx => hmem x (Or.inr (Or.inr (Or.inl hx)))⟩,
    ⟨by simp [mazeEquiv]; omega, fun x hx => hmem x (Or.inr (Or.inr (Or.inr hx)))⟩⟩

theorem mmap_small (m : Maze) {n : ℕ} (hn : m.size ≤ n) :
    mmap (G m) m ∈ Small n (2 + 2 * n) := by
  refine ⟨by rw [mmap_size]; exact hn, ?_⟩
  intro p hp
  simp only [allPorts, mmap, List.mem_append, List.mem_map] at hp
  have key : ∀ q ∈ allPorts m, (pm (G m) q).1.idx < 2 + 2 * n ∧ (pm (G m) q).2.idx < 2 + 2 * n := by
    intro q hq
    have hu := mem_idxs hq
    have h1 : q.1.idx ∈ used m := by simp [used, hu.1]
    have h2 : q.2.idx ∈ used m := by simp [used, hu.2]
    exact ⟨lt_of_lt_of_le (G_lt m h1) (by omega), lt_of_lt_of_le (G_lt m h2) (by omega)⟩
  rcases hp with ((⟨q, hq, rfl⟩ | ⟨q, hq, rfl⟩) | ⟨q, hq, rfl⟩) | ⟨q, hq, rfl⟩ <;>
    exact key q (by simp [allPorts, hq])

theorem bdd_L (n : ℕ) : BddAbove {d | ∃ m : Maze, m.size ≤ n ∧ Solvable m ∧ dist m = d} := by
  refine (((small_finite n (2 + 2 * n)).image dist).subset ?_).bddAbove
  rintro d ⟨m, hn, hs, rfl⟩
  exact ⟨_, mmap_small m hn, dist_mmap m hs⟩

theorem bdd_UL (n : ℕ) : BddAbove {d | ∃ m : Maze, m.size ≤ n ∧ USolvable m ∧ udist m = d} := by
  refine (((small_finite n (2 + 2 * n)).image udist).subset ?_).bddAbove
  rintro d ⟨m, hn, hs, rfl⟩
  exact ⟨_, mmap_small m hn, udist_mmap m hs⟩

theorem dist_le_L (m : Maze) (h : Solvable m) : dist m ≤ L m.size :=
  le_csSup (bdd_L _) ⟨m, le_rfl, h, rfl⟩

theorem udist_le_UL (m : Maze) (h : USolvable m) : udist m ≤ UL m.size :=
  le_csSup (bdd_UL _) ⟨m, le_rfl, h, rfl⟩

end Relabel
end RepeatedMaze
