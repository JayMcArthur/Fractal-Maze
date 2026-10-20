// lee/random_route_gen.js
// Generate N random non-crossing routes on a blank WxH map for visual testing.
// Spec: lee/plan.md (random_route_gen section).
//
// random_route_gen(W, H, N, rng?) -> { W, H, T, m, P }
//   W, H : map dimensions
//   N    : number of turns to try (each turn may fail and be skipped)
//   rng  : optional () -> [0,1) (default Math.random)
//
// Per turn:
//   - pick a random empty cell as start terminal s
//   - randomly extend a subport one cell at a time (no self-intersection,
//     no crossing existing subports/terminals) until no neighbor is available
//   - that last cell becomes end terminal e
//   - if fewer than 2 non-terminal subports were laid (i.e. path length < 4),
//     revert the turn
//   - s.dx/dy = first step's direction; e.dx/dy = reverse of last step's direction
//     (so each terminal's "departure direction" points to its connected subport)

(function (global) {
  const CH_CROSS = '\u253C';
  const CH_DR    = '\u250C'; // ┌ right + down
  const CH_DL    = '\u2510'; // ┐ left  + down
  const CH_UR    = '\u2514'; // └ right + up
  const CH_UL    = '\u2518'; // ┘ left  + up

  const DIRS = [
    { dx: 1,  dy: 0  },
    { dx: -1, dy: 0  },
    { dx: 0,  dy: 1  },
    { dx: 0,  dy: -1 },
  ];

  function dir_side(dx, dy) {
    if (dx === -1 && dy === 0)  return 'L';
    if (dx ===  1 && dy === 0)  return 'R';
    if (dx ===  0 && dy === -1) return 'U';
    if (dx ===  0 && dy === 1)  return 'D';
    return '?';
  }

  // Pick the subport char for a middle cell entered in (dxIn,dyIn)
  // and exited in (dxOut,dyOut). The cell's two connections are on
  // the opposite side of the incoming direction, and on the outgoing side.
  function subport_from_dirs(dxIn, dyIn, dxOut, dyOut) {
    const a = dir_side(-dxIn, -dyIn);
    const b = dir_side(dxOut, dyOut);
    const has = { L: a === 'L' || b === 'L',
                  R: a === 'R' || b === 'R',
                  U: a === 'U' || b === 'U',
                  D: a === 'D' || b === 'D' };
    if (has.L && has.R) return '-';
    if (has.U && has.D) return '|';
    if (has.L && has.U) return CH_UL;
    if (has.L && has.D) return CH_DL;
    if (has.R && has.U) return CH_UR;
    if (has.R && has.D) return CH_DR;
    throw new Error('subport_from_dirs: invalid dirs');
  }

  function new_empty_map(W, H) {
    const m = new Array(W);
    for (let x = 0; x < W; x++) {
      m[x] = new Array(H).fill(' ');
    }
    return m;
  }

  function random_route_gen(W, H, N, rng) {
    rng = rng || Math.random;
    const m = new_empty_map(W, H);
    const T = [];
    const P = [];

    for (let turn = 0; turn < N; turn++) {
      // Candidate start cells: currently empty AND with at least one empty neighbor.
      const empties = [];
      for (let x = 0; x < W; x++) {
        for (let y = 0; y < H; y++) {
          if (m[x][y] !== ' ') continue;
          let hasNeighbor = false;
          for (const d of DIRS) {
            const nx = x + d.dx, ny = y + d.dy;
            if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
            if (m[nx][ny] === ' ') { hasNeighbor = true; break; }
          }
          if (hasNeighbor) empties.push({ x: x, y: y });
        }
      }
      if (empties.length === 0) break;

      const s0 = empties[Math.floor(rng() * empties.length)];
      const path = [{ x: s0.x, y: s0.y }];
      const pathDirs = [];
      const pathSet = new Set();
      pathSet.add(s0.x + ',' + s0.y);

      while (true) {
        const cur = path[path.length - 1];
        const options = [];
        for (const d of DIRS) {
          const nx = cur.x + d.dx, ny = cur.y + d.dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          if (m[nx][ny] !== ' ') continue;
          if (pathSet.has(nx + ',' + ny)) continue;
          options.push(d);
        }
        if (options.length === 0) break;
        const d = options[Math.floor(rng() * options.length)];
        const nx = cur.x + d.dx, ny = cur.y + d.dy;
        path.push({ x: nx, y: ny });
        pathDirs.push(d);
        pathSet.add(nx + ',' + ny);
      }

      // Need at least 2 non-terminal subports => path.length >= 4.
      if (path.length < 4) continue;

      const sPos = path[0];
      const ePos = path[path.length - 1];
      const firstDir = pathDirs[0];
      const lastDir  = pathDirs[pathDirs.length - 1];

      for (let i = 1; i < path.length - 1; i++) {
        const dIn  = pathDirs[i - 1];
        const dOut = pathDirs[i];
        m[path[i].x][path[i].y] = subport_from_dirs(dIn.dx, dIn.dy, dOut.dx, dOut.dy);
      }
      m[sPos.x][sPos.y] = 'T';
      m[ePos.x][ePos.y] = 'T';

      const sIdx = T.length;
      T.push({ x: sPos.x, y: sPos.y, dx: firstDir.dx, dy: firstDir.dy });
      const eIdx = T.length;
      T.push({ x: ePos.x, y: ePos.y, dx: -lastDir.dx, dy: -lastDir.dy });
      P.push({ s: sIdx, e: eIdx });
    }

    return { W: W, H: H, T: T, m: m, P: P };
  }

  global.random_route_gen   = random_route_gen;
  global.subport_from_dirs  = subport_from_dirs;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { random_route_gen: random_route_gen, subport_from_dirs: subport_from_dirs };
  }
})(typeof window !== 'undefined' ? window : globalThis);
