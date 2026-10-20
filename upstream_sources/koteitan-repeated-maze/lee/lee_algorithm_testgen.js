// lee/lee_algorithm_testgen.js
// Shared random port-configuration generator for lee_algorithm tests.
// Used by both lee/lee_algorithm.html and lee/test-lee_algorithm-node.js so
// the same (W, H, NPorts, rng) -> same Tin/P in either environment.
//
// Constraints enforced (each rejection `continue`s the try-loop; the rng
// sequence itself is deterministic for a given seed):
//   1. |dx| + |dy| == 1 (valid unit exit direction, picked uniformly)
//   2. No terminal overlaps another terminal's position
//   3. (t.x + t.dx, t.y + t.dy) is inside the map AND not on another terminal
//      (i.e. every terminal has an in-grid exit cell that is not a T)
//
// Earlier versions additionally enforced pair-wise direction-compatibility
// (same-column ⇒ identical horizontal dir, same-row ⇒ identical vertical,
// diff ⇒ each points toward the other), mutual-T-facing rejection, and a
// |Δx|!=1 / |Δy|!=1 adjacency filter. All of those were dropped: dx/dy are
// sampled uniformly over the 4 unit directions and adjacent-by-one pairs
// are now in scope — the new preemptive + incremental + midpoint routing
// handles configurations that the old Lee variant could not.
//
// Deterministic in rng: consuming the same rng() sequence (e.g. mulberry32
// with a fixed seed) produces identical Tin/P.

(function (global) {
  function randIntR(rng, lo, hi) {
    return lo + Math.floor(rng() * (hi - lo + 1));
  }
  function shuffleR(rng, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  const DIRS = [
    { dx:  1, dy:  0 },
    { dx: -1, dy:  0 },
    { dx:  0, dy:  1 },
    { dx:  0, dy: -1 },
  ];

  function generateTinP(W, H, NPorts, rng) {
    const terminals = new Set(); // keys "x,y" for all placed T positions
    const exits     = new Set(); // keys "x,y" for all placed T exit cells
    const Tin = [];
    const P = [];

    function pickExitDir(x, y, excludeX, excludeY) {
      // Uniform random direction such that (x+dx, y+dy) is on the grid,
      // not on an existing terminal, and not on (excludeX, excludeY).
      // Consumes one rng call per swap in the Fisher-Yates shuffle so
      // the seed sequence stays deterministic regardless of how many
      // candidates are rejected.
      const shuffled = shuffleR(rng, DIRS.slice());
      for (const d of shuffled) {
        const nx = x + d.dx, ny = y + d.dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        if (terminals.has(nx + ',' + ny)) continue;
        if (nx === excludeX && ny === excludeY) continue;
        return d;
      }
      return null;
    }

    for (let i = 0; i < NPorts; i++) {
      let made = false;
      for (let tries = 0; tries < 200 && !made; tries++) {
        const sx = randIntR(rng, 0, W - 1), sy = randIntR(rng, 0, H - 1);
        const skey = sx + ',' + sy;
        if (terminals.has(skey) || exits.has(skey)) continue;

        const ex = randIntR(rng, 0, W - 1), ey = randIntR(rng, 0, H - 1);
        if (ex === sx && ey === sy) continue;
        const ekey = ex + ',' + ey;
        if (terminals.has(ekey) || exits.has(ekey)) continue;

        // Pick dirs uniformly; each exit cell must avoid the other endpoint
        // (the other endpoint isn't in `terminals` yet at pick-time, so pass
        // it explicitly).
        const sdir = pickExitDir(sx, sy, ex, ey);
        if (!sdir) continue;
        const edir = pickExitDir(ex, ey, sx, sy);
        if (!edir) continue;

        // Commit: add both terminals and their exit cells to the tracking
        // sets so subsequent ports respect the "exit not on another T" and
        // "T not placed on an existing exit cell" invariants.
        const sIdx = Tin.length;
        Tin.push({ x: sx, y: sy, dx: sdir.dx, dy: sdir.dy });
        const eIdx = Tin.length;
        Tin.push({ x: ex, y: ey, dx: edir.dx, dy: edir.dy });
        P.push({ s: sIdx, e: eIdx });

        terminals.add(skey);
        terminals.add(ekey);
        exits.add((sx + sdir.dx) + ',' + (sy + sdir.dy));
        exits.add((ex + edir.dx) + ',' + (ey + edir.dy));
        made = true;
      }
      if (!made) return null;
    }
    return { Tin: Tin, P: P };
  }

  global.generateTinP = generateTinP;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateTinP: generateTinP };
  }
})(typeof window !== 'undefined' ? window : globalThis);
