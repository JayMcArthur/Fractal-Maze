import RepeatedMaze.Godel

/-!
# Two reusable counter-machine macros

* `pushFrag reg tmp B c`: `reg := c + B * reg` (uses `tmp`, which must be `0`).
* `popFrag reg tmp B`: `reg := reg / B`, exit labelled by `reg % B` (uses `tmp = 0`).
-/

namespace RepeatedMaze
namespace Macros

open CM StateTransition Relation Godel

inductive PushM (N : ℕ) where
  | m1 | m1i (i : Fin (N + 1)) | m2 | m2i | add (i : Fin (N + 1))
  deriving DecidableEq, Fintype

inductive PopM (N : ℕ) where
  | cnt (j : Fin (N + 1)) | cntInc | mv (j : Fin (N + 1)) | mvI (j : Fin (N + 1))
  deriving DecidableEq, Fintype

variable {σ ι : Type*} [DecidableEq ι]

def pushFrag (reg tmp : ι) (B c N : ℕ) (emb : PushM N → σ) (exit : σ) : PushM N → Instr σ ι
  | .m1 => .dec reg (emb (if 0 < B then .m1i (fc N 0) else .m1)) (emb .m2)
  | .m1i i => .inc tmp (emb (if i.val + 1 < B then .m1i (fc N (i.val + 1)) else .m1))
  | .m2 => .dec tmp (emb .m2i) (if 0 < c then emb (.add (fc N 0)) else exit)
  | .m2i => .inc reg (emb .m2)
  | .add i => .inc reg (if i.val + 1 < c then emb (.add (fc N (i.val + 1))) else exit)

def popFrag (reg tmp : ι) (B N : ℕ) (emb : PopM N → σ) (exit : ℕ → σ) : PopM N → Instr σ ι
  | .cnt j => .dec reg (emb (if j.val + 1 < B then .cnt (fc N (j.val + 1)) else .cntInc))
      (emb (.mv j))
  | .cntInc => .inc tmp (emb (if 0 < B then .cnt (fc N 0) else .cntInc))
  | .mv j => .dec tmp (emb (.mvI j)) (exit j.val)
  | .mvI j => .inc reg (emb (.mv j))

theorem push_spec (P : σ → Instr σ ι) (reg tmp : ι) (hne : reg ≠ tmp) (B c N : ℕ)
    (hB : B ≤ N) (hc : c ≤ N) (emb : PushM N → σ) (exit : σ)
    (hP : ∀ μ, P (emb μ) = pushFrag reg tmp B c N emb exit μ) :
    ∀ v w : ι → ℕ, v tmp = 0 → w reg = c + B * v reg → w tmp = 0 →
      (∀ k, k ≠ reg → k ≠ tmp → w k = v k) →
      Reaches₁ (step P) ⟨emb .m1, v⟩ ⟨exit, w⟩ := by
  intro v w hv0 hw1 hw2 hw3
  have e1 := CM.mulMove (P := P) reg tmp hne B (emb .m1) (emb .m2)
    (fun i => emb (if i < B then .m1i (fc N i) else .m1))
    (by rw [hP]; simp [pushFrag])
    (by
      intro i hi
      have hi' : i < N + 1 := by omega
      simp only [hi, if_true]
      rw [hP]; simp [pushFrag, fc_val hi'])
    (by rw [if_neg (lt_irrefl _)])
    v (Function.update (Function.update v reg 0) tmp (B * v reg))
    (by simp [hne, Ne.symm hne]) (by simp [hv0]) (fun k h1 h2 => by simp [h1, h2])
  set v1 := Function.update (Function.update v reg 0) tmp (B * v reg)
  have e2 := CM.mulMove (P := P) tmp reg (Ne.symm hne) 1 (emb .m2)
    (if 0 < c then emb (.add (fc N 0)) else exit)
    (fun i => if i < 1 then emb .m2i else emb .m2)
    (by rw [hP]; simp [pushFrag])
    (by
      intro i hi
      have : i = 0 := by omega
      subst this
      rw [if_pos (by omega), hP]; simp [pushFrag])
    (by rw [if_neg (lt_irrefl _)])
    v1 (Function.update (Function.update v1 tmp 0) reg (B * v reg))
    (by simp [hne, Ne.symm hne]) (by simp [v1, hne]) (fun k h1 h2 => by simp [h1, h2])
  set v2 := (Function.update (Function.update v1 tmp 0) reg (B * v reg))
  have e3 := CM.incChain (P := P) reg
    (fun i => if i < c then emb (.add (fc N i)) else exit) c
    (by
      intro i hi
      have hi' : i < N + 1 := by omega
      simp only [hi, if_true]
      rw [hP]; simp [pushFrag, fc_val hi'])
    v2 w (by simp [v2, hw1]; ring) (by
      intro k hk
      by_cases hk2 : k = tmp
      · subst hk2; simp [v2, v1, hk, hw2]
      · simp [v2, v1, hk, hk2, hw3 k hk hk2])
  simp only [lt_irrefl, if_false] at e3
  exact (e1.trans e2).trans_left e3

theorem pop_spec (P : σ → Instr σ ι) (reg tmp : ι) (hne : reg ≠ tmp) (B N : ℕ)
    (hB0 : 0 < B) (hB : B ≤ N) (emb : PopM N → σ) (exit : ℕ → σ)
    (hP : ∀ μ, P (emb μ) = popFrag reg tmp B N emb exit μ) :
    ∀ v w : ι → ℕ, v tmp = 0 → w reg = v reg / B → w tmp = 0 →
      (∀ k, k ≠ reg → k ≠ tmp → w k = v k) →
      Reaches₁ (step P) ⟨emb (.cnt (fc N 0)), v⟩ ⟨exit (v reg % B), w⟩ := by
  intro v w hv0 hw1 hw2 hw3
  have e1 := CM.divMove (P := P) reg tmp hne B hB0
    (fun j => emb (if j < B then .cnt (fc N j) else .cntInc))
    (fun j => emb (.mv (fc N j)))
    (by
      intro j hj
      have hj' : j < N + 1 := by omega
      simp only [hj, if_true]
      rw [hP]; simp [popFrag, fc_val hj'])
    (by simp only [lt_irrefl, if_false]; rw [hP]; simp [popFrag, hB0])
    0 hB0 v (Function.update (Function.update v reg 0) tmp (v reg / B))
    (by simp [hne, Ne.symm hne]) (by simp [hv0]) (fun k h1 h2 => by simp [h1, h2])
  simp only [hB0, if_true, zero_add] at e1
  set v1 := Function.update (Function.update v reg 0) tmp (v reg / B)
  set r := v reg % B
  have hr : r < N + 1 := by have := Nat.mod_lt (v reg) hB0; omega
  have e2 := CM.mulMove (P := P) tmp reg (Ne.symm hne) 1 (emb (.mv (fc N r)))
    (exit r)
    (fun i => if i < 1 then emb (.mvI (fc N r)) else emb (.mv (fc N r)))
    (by rw [hP]; simp [popFrag, fc_val hr])
    (by
      intro i hi
      have : i = 0 := by omega
      subst this
      rw [if_pos (by omega), hP]; simp [popFrag])
    (by rw [if_neg (lt_irrefl _)])
    v1 w (by simp [hw2]) (by simp [v1, hne, hw1]) (fun k h1 h2 => by simp [v1, h1, h2, hw3 k h2 h1])
  exact e1.trans e2

end Macros
end RepeatedMaze
