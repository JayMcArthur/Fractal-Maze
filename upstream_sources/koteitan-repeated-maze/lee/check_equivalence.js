// lee/check_equivalence.js
// Checks whether an expanded terminal list T preserves the relative
// ordering and departure directions of the initial list Tin.
// Spec: lee/plan.md (check_equivalence section).
//
// check_equivalence(Tin, T) -> boolean
//   For every pair i, j:
//     sign(Tin[i].x - Tin[j].x) === sign(T[i].x - T[j].x)
//     sign(Tin[i].y - Tin[j].y) === sign(T[i].y - T[j].y)
//   For every i:
//     Tin[i].dx === T[i].dx
//     Tin[i].dy === T[i].dy
//
// check_equivalence_detailed(Tin, T) -> { ok, reason, i?, j? }
//   Same check but returns the first failing pair / index for debugging.

(function (global) {
  function sign(v) {
    return v < 0 ? -1 : v > 0 ? 1 : 0;
  }

  function check_equivalence(Tin, T) {
    return check_equivalence_detailed(Tin, T).ok;
  }

  function check_equivalence_detailed(Tin, T) {
    if (!Array.isArray(Tin) || !Array.isArray(T)) {
      return { ok: false, reason: 'inputs must be arrays' };
    }
    if (Tin.length !== T.length) {
      return { ok: false, reason: 'length mismatch: Tin.length=' + Tin.length + ', T.length=' + T.length };
    }

    for (let i = 0; i < Tin.length; i++) {
      const a = Tin[i], b = T[i];
      if (!a || !b) return { ok: false, reason: 'missing terminal', i: i };
      if (a.dx !== b.dx || a.dy !== b.dy) {
        return { ok: false, reason: 'departure direction mismatch', i: i };
      }
    }

    for (let i = 0; i < Tin.length; i++) {
      for (let j = i + 1; j < Tin.length; j++) {
        const sxIn = sign(Tin[i].x - Tin[j].x);
        const sxOut = sign(T[i].x - T[j].x);
        if (sxIn !== sxOut) {
          return { ok: false, reason: 'x-order mismatch', i: i, j: j };
        }
        const syIn = sign(Tin[i].y - Tin[j].y);
        const syOut = sign(T[i].y - T[j].y);
        if (syIn !== syOut) {
          return { ok: false, reason: 'y-order mismatch', i: i, j: j };
        }
      }
    }

    return { ok: true };
  }

  global.check_equivalence = check_equivalence;
  global.check_equivalence_detailed = check_equivalence_detailed;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      check_equivalence: check_equivalence,
      check_equivalence_detailed: check_equivalence_detailed,
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
