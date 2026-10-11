import RepeatedMaze.Assemble
import Mathlib.Computability.Primrec.List

/-!
# Primitive recursiveness of the reduction

`fun m => toMaze (F ++ loader b t m)` is primitive recursive for constants `F b t`.
-/

namespace RepeatedMaze
namespace Comp

open MazeCM Assemble CM

def instrEquiv : Instr ℕ Bool ≃ (Bool × ℕ) ⊕ ((Bool × ℕ × ℕ) ⊕ Unit) where
  toFun
    | .inc r q => .inl (r, q)
    | .dec r q z => .inr (.inl (r, q, z))
    | .halt => .inr (.inr ())
  invFun
    | .inl (r, q) => .inc r q
    | .inr (.inl (r, q, z)) => .dec r q z
    | .inr (.inr _) => .halt
  left_inv i := by cases i <;> rfl
  right_inv s := by rcases s with ⟨r, q⟩ | ⟨r, q, z⟩ | ⟨⟩ <;> rfl

instance : Primcodable (Instr ℕ Bool) := Primcodable.ofEquiv _ instrEquiv

section helpers

variable {α : Type*} [Primcodable α]

theorem inc_comp {f : α → Bool} {g : α → ℕ} (hf : Primrec f) (hg : Primrec g) :
    Primrec fun a => (Instr.inc (f a) (g a) : Instr ℕ Bool) :=
  ((Primrec.of_equiv_symm (e := instrEquiv)).comp (Primrec.sumInl.comp (hf.pair hg))).of_eq
    fun _ => rfl

theorem dec_comp {f : α → Bool} {g h : α → ℕ} (hf : Primrec f) (hg : Primrec g)
    (hh : Primrec h) :
    Primrec fun a => (Instr.dec (f a) (g a) (h a) : Instr ℕ Bool) :=
  ((Primrec.of_equiv_symm (e := instrEquiv)).comp
    (Primrec.sumInr.comp (Primrec.sumInl.comp (hf.pair (hg.pair hh))))).of_eq fun _ => rfl

theorem term_comp (s : Side) {f : α → ℕ} (hf : Primrec f) :
    Primrec fun a => (⟨s, f a⟩ : Term) :=
  ((Primrec.of_equiv_symm (e := termEquiv)).comp ((Primrec.const s).pair hf)).of_eq
    fun _ => rfl

theorem list2 {β : Type*} [Primcodable β] {x y : α → β} (hx : Primrec x) (hy : Primrec y) :
    Primrec fun a => [x a, y a] :=
  Primrec.list_cons.comp hx (Primrec.list_cons.comp hy (Primrec.const []))

theorem list1 {β : Type*} [Primcodable β] {x : α → β} (hx : Primrec x) :
    Primrec fun a => [x a] :=
  Primrec.list_cons.comp hx (Primrec.const [])

theorem add_c {f : α → ℕ} (hf : Primrec f) (c : ℕ) : Primrec fun a => f a + c :=
  Primrec.nat_add.comp hf (Primrec.const c)

theorem lin {f : α → ℕ} (hf : Primrec f) (c d : ℕ) : Primrec fun a => c * f a + d :=
  Primrec.nat_add.comp (Primrec.nat_mul.comp (Primrec.const c) hf) (Primrec.const d)

theorem eq_c {f : α → ℕ} (hf : Primrec f) (c : ℕ) : PrimrecPred fun a => f a = c :=
  Primrec.eq.comp hf (Primrec.const c)

theorem lt_c {f g : α → ℕ} (hf : Primrec f) (hg : Primrec g) : PrimrecPred fun a => f a < g a :=
  Primrec.nat_lt.comp hf hg

end helpers

/-! ### The loader -/

theorem gI_comp {α : Type*} [Primcodable α] {f g : α → ℕ} (hf : Primrec f) (hg : Primrec g) :
    Primrec fun a => gI (f a) (g a) := by
  unfold gI
  refine Primrec.ite (eq_c hg 0) (dec_comp (Primrec.const false) (add_c hf 1) (add_c hf 6)) ?_
  refine Primrec.ite (lt_c hg (Primrec.const 5))
    (inc_comp (Primrec.const true) (add_c (Primrec.nat_add.comp hf hg) 1)) ?_
  refine Primrec.ite (eq_c hg 5) (inc_comp (Primrec.const true) hf) ?_
  refine Primrec.ite (eq_c hg 6)
    (dec_comp (Primrec.const true) (add_c hf 7) (add_c hf 8)) ?_
  exact inc_comp (Primrec.const false) (add_c hf 6)

theorem ldI_primrec (b t : ℕ) : Primrec₂ (ldI b t) := by
  unfold Primrec₂ ldI
  have hm : Primrec fun p : ℕ × ℕ => p.1 := Primrec.fst
  have hk : Primrec fun p : ℕ × ℕ => p.2 := Primrec.snd
  have hk1 : Primrec fun p : ℕ × ℕ => p.2 - 1 := Primrec.nat_sub.comp hk (Primrec.const 1)
  refine Primrec.ite (eq_c hk 0) (inc_comp (Primrec.const false) (Primrec.const (b + 1))) ?_
  refine Primrec.ite (lt_c hk (lin hm 8 1)) ?_
    (dec_comp (Primrec.const true) (Primrec.const t) (Primrec.const t))
  apply gI_comp
  · exact Primrec.nat_add.comp (Primrec.const (b + 1))
      (Primrec.nat_mul.comp (Primrec.const 8) (Primrec.nat_div.comp hk1 (Primrec.const 8)))
  · exact Primrec.nat_mod.comp hk1 (Primrec.const 8)

theorem loader_primrec (b t : ℕ) : Primrec fun m => loader b t m :=
  Primrec.list_map (Primrec.list_range.comp (lin Primrec.id 8 2)) (ldI_primrec b t)

/-! ### The maze -/

/-- `portsOf` on the sum-encoding of instructions. -/
def portsOf' (bt : BlockType) (i : ℕ) (s : (Bool × ℕ) ⊕ ((Bool × ℕ × ℕ) ⊕ Unit)) :
    List (Term × Term) :=
  Sum.casesOn s
    (fun rq => bif rq.1 then [(tC i, tN (2 * rq.2 + 2)), (tS (2 * rq.2 + 2), tC rq.2)]
      else [(tC i, tE (2 * rq.2 + 2)), (tW (2 * rq.2 + 2), tC rq.2)])
    (fun s' => Sum.casesOn s'
      (fun rqz => bif rqz.1 then
          [bif yPos bt then (tC i, tS (2 * rqz.2.1 + 3)) else (tC i, tC rqz.2.2),
            (tN (2 * rqz.2.1 + 3), tC rqz.2.1)]
        else
          [bif xPos bt then (tC i, tW (2 * rqz.2.1 + 3)) else (tC i, tC rqz.2.2),
            (tE (2 * rqz.2.1 + 3), tC rqz.2.1)])
      (fun _ => bif decide (bt = .zero) then [(tC i, tW 1)] else []))

theorem portsOf_eq (bt : BlockType) (i : ℕ) (I : Instr ℕ Bool) :
    portsOf bt i I = portsOf' bt i (instrEquiv I) := by
  cases I with
  | inc r q => cases r <;> rfl
  | dec r q z => cases r <;> cases bt <;> rfl
  | halt => cases bt <;> rfl

theorem portsOf'_primrec (bt : BlockType) : Primrec₂ (portsOf' bt) := by
  unfold Primrec₂ portsOf'
  have hi : Primrec fun p : ℕ × ((Bool × ℕ) ⊕ ((Bool × ℕ × ℕ) ⊕ Unit)) => p.1 := Primrec.fst
  apply Primrec.sumCasesOn Primrec.snd
  · -- inc
    unfold Primrec₂
    have hi' : Primrec fun p : (ℕ × ((Bool × ℕ) ⊕ ((Bool × ℕ × ℕ) ⊕ Unit))) × (Bool × ℕ) => p.1.1 :=
      Primrec.fst.comp Primrec.fst
    have hr : Primrec fun p : (ℕ × ((Bool × ℕ) ⊕ ((Bool × ℕ × ℕ) ⊕ Unit))) × (Bool × ℕ) => p.2.1 :=
      Primrec.fst.comp Primrec.snd
    have hq : Primrec fun p : (ℕ × ((Bool × ℕ) ⊕ ((Bool × ℕ × ℕ) ⊕ Unit))) × (Bool × ℕ) => p.2.2 :=
      Primrec.snd.comp Primrec.snd
    refine Primrec.cond hr ?_ ?_
    · exact list2 ((term_comp .C hi').pair (term_comp .N (lin hq 2 2)))
        ((term_comp .S (lin hq 2 2)).pair (term_comp .C hq))
    · exact list2 ((term_comp .C hi').pair (term_comp .E (lin hq 2 2)))
        ((term_comp .W (lin hq 2 2)).pair (term_comp .C hq))
  · unfold Primrec₂
    apply Primrec.sumCasesOn Primrec.snd
    · -- dec
      unfold Primrec₂
      have hi' : Primrec fun p : ((ℕ × ((Bool × ℕ) ⊕ ((Bool × ℕ × ℕ) ⊕ Unit))) ×
          ((Bool × ℕ × ℕ) ⊕ Unit)) × (Bool × ℕ × ℕ) => p.1.1.1 :=
        Primrec.fst.comp (Primrec.fst.comp Primrec.fst)
      have hr : Primrec fun p : ((ℕ × ((Bool × ℕ) ⊕ ((Bool × ℕ × ℕ) ⊕ Unit))) ×
          ((Bool × ℕ × ℕ) ⊕ Unit)) × (Bool × ℕ × ℕ) => p.2.1 := Primrec.fst.comp Primrec.snd
      have hq : Primrec fun p : ((ℕ × ((Bool × ℕ) ⊕ ((Bool × ℕ × ℕ) ⊕ Unit))) ×
          ((Bool × ℕ × ℕ) ⊕ Unit)) × (Bool × ℕ × ℕ) => p.2.2.1 :=
        Primrec.fst.comp (Primrec.snd.comp Primrec.snd)
      have hz : Primrec fun p : ((ℕ × ((Bool × ℕ) ⊕ ((Bool × ℕ × ℕ) ⊕ Unit))) ×
          ((Bool × ℕ × ℕ) ⊕ Unit)) × (Bool × ℕ × ℕ) => p.2.2.2 :=
        Primrec.snd.comp (Primrec.snd.comp Primrec.snd)
      refine Primrec.cond hr ?_ ?_
      · refine list2 (Primrec.cond (Primrec.const _) ?_ ?_)
          ((term_comp .N (lin hq 2 3)).pair (term_comp .C hq))
        · exact (term_comp .C hi').pair (term_comp .S (lin hq 2 3))
        · exact (term_comp .C hi').pair (term_comp .C hz)
      · refine list2 (Primrec.cond (Primrec.const _) ?_ ?_)
          ((term_comp .E (lin hq 2 3)).pair (term_comp .C hq))
        · exact (term_comp .C hi').pair (term_comp .W (lin hq 2 3))
        · exact (term_comp .C hi').pair (term_comp .C hz)
    · -- halt
      unfold Primrec₂
      have hi' : Primrec fun p : ((ℕ × ((Bool × ℕ) ⊕ ((Bool × ℕ × ℕ) ⊕ Unit))) ×
          ((Bool × ℕ × ℕ) ⊕ Unit)) × Unit => p.1.1.1 :=
        Primrec.fst.comp (Primrec.fst.comp Primrec.fst)
      exact Primrec.cond (Primrec.const _)
        (list1 ((term_comp .C hi').pair (term_comp .W (Primrec.const 1)))) (Primrec.const [])

theorem ports_primrec (bt : BlockType) : Primrec fun P : Prog => ports P bt := by
  unfold ports
  refine Primrec.list_append.comp (Primrec.const _) ?_
  refine Primrec.list_flatMap (Primrec.list_range.comp Primrec.list_length) ?_
  unfold Primrec₂
  have h1 : Primrec fun p : Prog × ℕ => fn p.1 p.2 :=
    (Primrec.list_getD (Instr.halt : Instr ℕ Bool)).comp Primrec.fst Primrec.snd
  have h2 := (portsOf'_primrec bt).comp Primrec.snd ((Primrec.of_equiv (e := instrEquiv)).comp h1)
  exact h2.of_eq fun p => (portsOf_eq bt p.2 (fn p.1 p.2)).symm

theorem toMaze_primrec : Primrec toMaze :=
  ((Primrec.of_equiv_symm (e := mazeEquiv)).comp
    ((ports_primrec .normal).pair ((ports_primrec .nx).pair
      ((ports_primrec .ny).pair (ports_primrec .zero))))).of_eq fun _ => rfl

theorem maze_computable (F : Prog) (b t : ℕ) :
    Computable fun m => toMaze (F ++ loader b t m) :=
  (toMaze_primrec.comp (Primrec.list_append.comp (Primrec.const F) (loader_primrec b t))).to_comp

end Comp
end RepeatedMaze
