// lee/lee_algorithm.js
// Routes the list of ports P on the initial (W, H, m, Tin) state by BFS
// with row/column insertions as prescribed in lee/plan.md (Lee algorithm).
//
// lee_algorithm(Tin, P, opts?) -> { W, H, T, m, error? }
//   Tin : initial terminals [{x, y, dx, dy}, ...]
//   P   : ports [{s, e}, ...] indexing Tin
//   opts: { W, H, m }  optional initial map state (W, H integers; m[x][y] matrix
//         of ' '/'#'/'T'). If omitted, W/H are taken to span Tin bounds and m
//         is an empty grid with 'T' at each Tin position.
//
// Return value:
//   W, H : final expanded dimensions
//   T    : expanded terminals (deep copy of Tin with shifted x, y; dx, dy preserved)
//   m    : final subport matrix
//   error: present (= 'unsolved') iff a port could not be routed even after
//          both a row and column insertion were attempted for it (stt === 'both').
//
// Depends on lee/insert_map.js (`insert_map`).

(function (global) {
  const CH_CROSS = '\u253C';
  const CH_DR    = '\u250C';
  const CH_DL    = '\u2510';
  const CH_UR    = '\u2514';
  const CH_UL    = '\u2518';

  const DIRS = [
    { dx: 1,  dy: 0  },
    { dx: -1, dy: 0  },
    { dx: 0,  dy: 1  },
    { dx: 0,  dy: -1 },
  ];

  // Sides each subport char connects on (and reverse lookup).
  const SIDES = {
    ' ': '',
    '-': 'LR',
    '|': 'UD',
    '\u253C': 'LRUD',
    '\u250C': 'RD',
    '\u2510': 'LD',
    '\u2514': 'RU',
    '\u2518': 'LU',
  };
  const CHAR_BY_KEY = {
    '':     ' ',
    'LR':   '-',
    'UD':   '|',
    'LRUD': '\u253C',
    'LU':   '\u2518',
    'LD':   '\u2510',
    'RU':   '\u2514',
    'RD':   '\u250C',
  };

  // Compute the final char in a cell after a traversal needs the (cfSide,
  // outSide) pair to be a legal passage there. Returns null if invalid.
  //
  // A single port's traversal through a cell is STRICT:
  //   ' '     : any (cf,out) pair with cf≠out — place the corresponding
  //             2-side subport char.
  //   '-'     : only L↔R (pass through unchanged); or U↔D which overlays to
  //             '┼' (the new port's crossing, orthogonal to the existing
  //             horizontal passage). Any mixed-axis pair (e.g. L↔U) would be
  //             a turn at a crossing and is REJECTED — even though '┼' has
  //             all 4 sides, a port that physically turns at a crossing
  //             symbol would render wrong.
  //   '|'     : symmetric to '-'.
  //   '┼'     : only L↔R or U↔D (pure crossing). Turns REJECTED.
  //   corners : only the corner's specific 2-side pair. No modifications.
  //   'T'/'#' : invalid.
  function cell_traverse_char(existing, cfSide, outSide) {
    if (cfSide === outSide) return null;
    if (existing === 'T' || existing === '#') return null;

    const cfAxis = (cfSide === 'L' || cfSide === 'R') ? 'H' : 'V';
    const outAxis = (outSide === 'L' || outSide === 'R') ? 'H' : 'V';
    const straightH = (cfAxis === 'H' && outAxis === 'H'); // L↔R
    const straightV = (cfAxis === 'V' && outAxis === 'V'); // U↔D

    if (existing === ' ') {
      const sides = { L: false, R: false, U: false, D: false };
      sides[cfSide] = true;
      sides[outSide] = true;
      const key = (sides.L ? 'L' : '') + (sides.R ? 'R' : '') +
                  (sides.U ? 'U' : '') + (sides.D ? 'D' : '');
      return CHAR_BY_KEY[key] || null;
    }
    if (existing === '-') {
      if (straightH) return '-';
      if (straightV) return '\u253C';
      return null;
    }
    if (existing === '|') {
      if (straightV) return '|';
      if (straightH) return '\u253C';
      return null;
    }
    if (existing === '\u253C') {
      if (straightH || straightV) return '\u253C';
      return null;
    }
    // Corners: traversal must match the corner's exact two sides.
    const existingSides = SIDES[existing];
    if (existingSides == null) return null;
    if (existingSides.indexOf(cfSide) >= 0 && existingSides.indexOf(outSide) >= 0) {
      return existing;
    }
    return null;
  }

  // Order outgoing directions so "straight" is tried first. This biases BFS
  // shortest-path tie-breaking toward paths whose start/end cells become '|' or
  // '-' (which are overlay-friendly via '┼') rather than L-corners (which
  // cannot be overlaid and would block later ports sharing a subport cell).
  function dir_order_from(inDx, inDy) {
    if (Math.abs(inDx) + Math.abs(inDy) !== 1) return DIRS;
    return [
      { dx: inDx,   dy: inDy   }, // straight
      { dx: -inDy,  dy: inDx   }, // perpendicular (CW)
      { dx: inDy,   dy: -inDx  }, // perpendicular (CCW)
      { dx: -inDx,  dy: -inDy  }, // backward (always yields same-side char, dropped)
    ];
  }

  function dir_side(dx, dy) {
    if (dx === -1 && dy === 0)  return 'L';
    if (dx ===  1 && dy === 0)  return 'R';
    if (dx ===  0 && dy === -1) return 'U';
    if (dx ===  0 && dy === 1)  return 'D';
    return null;
  }

  // Char produced by entering a cell with (inDx,inDy) and leaving with (outDx,outDy).
  // Returns null if the traversal is invalid (same side used twice, e.g. reversing).
  function subport_char(inDx, inDy, outDx, outDy) {
    const a = dir_side(-inDx, -inDy);
    const b = dir_side(outDx, outDy);
    if (!a || !b || a === b) return null;
    const has = { L: false, R: false, U: false, D: false };
    has[a] = true;
    has[b] = true;
    if (has.L && has.R) return '-';
    if (has.U && has.D) return '|';
    if (has.L && has.U) return CH_UL;
    if (has.L && has.D) return CH_DL;
    if (has.R && has.U) return CH_UR;
    if (has.R && has.D) return CH_DR;
    return null;
  }

  // Can we lay `desired` on a cell currently containing `existing`?
  // desired is one of the 6 non-cross subport chars (never '\u253C' directly,
  // because we promote to '\u253C' only via overlay during apply).
  function can_place(existing, desired) {
    if (existing === ' ') return true;
    if (existing === 'T' || existing === '#') return false;
    if (existing === CH_CROSS) return false;
    if (existing === CH_DR || existing === CH_DL ||
        existing === CH_UR || existing === CH_UL) return false;
    if (existing === '-') return desired === '|';   // overlay -> ┼
    if (existing === '|') return desired === '-';   // overlay -> ┼
    return false;
  }

  function clone_map(m) {
    const W = m.length;
    const out = new Array(W);
    for (let x = 0; x < W; x++) out[x] = m[x].slice();
    return out;
  }

  function derive_initial_state(Tin, opts) {
    if (opts && opts.W != null && opts.H != null && opts.m) {
      return { W: opts.W, H: opts.H, m: clone_map(opts.m) };
    }
    let W = 0, H = 0;
    for (let i = 0; i < Tin.length; i++) {
      const t = Tin[i];
      if (t.x + 1 > W) W = t.x + 1;
      if (t.y + 1 > H) H = t.y + 1;
    }
    const m = new Array(W);
    for (let x = 0; x < W; x++) m[x] = new Array(H).fill(' ');
    for (let i = 0; i < Tin.length; i++) {
      const t = Tin[i];
      if (t.x >= 0 && t.x < W && t.y >= 0 && t.y < H) m[t.x][t.y] = 'T';
    }
    return { W: W, H: H, m: m };
  }

  // BFS from the cell adjacent to s (in direction s.dx/dy) to the cell adjacent
  // to e (in direction e.dx/dy), respecting subport passability rules.
  // Returns an array of placements [{x, y, char}, ...] (one per traversed cell,
  // in path order), or null if no path.
  function bfs_route(m, s, e) {
    const W = m.length;
    if (W === 0) return null;
    const H = m[0].length;

    const startX = s.x + s.dx;
    const startY = s.y + s.dy;
    const endX   = e.x + e.dx;
    const endY   = e.y + e.dy;

    if (startX < 0 || startX >= W || startY < 0 || startY >= H) return null;
    if (endX   < 0 || endX   >= W || endY   < 0 || endY   >= H) return null;

    const outGoal = { dx: -e.dx, dy: -e.dy };

    const visited = new Map(); // key -> { prevKey, inDx, inDy, x, y }
    function key(x, y, dx, dy) { return x + ',' + y + ',' + dx + ',' + dy; }

    const startKey = key(startX, startY, s.dx, s.dy);
    visited.set(startKey, { prev: null, x: startX, y: startY, inDx: s.dx, inDy: s.dy });
    const queue = [startKey];

    let foundKey = null;
    let foundChar = null;

    const outGoalSide = dir_side(outGoal.dx, outGoal.dy);

    while (queue.length > 0) {
      const curKey = queue.shift();
      const cur = visited.get(curKey);
      const cfSide = dir_side(-cur.inDx, -cur.inDy);
      const existing = m[cur.x][cur.y];

      // Goal check: traversal from came-from to outGoal side must be valid.
      if (cur.x === endX && cur.y === endY) {
        const ch = cell_traverse_char(existing, cfSide, outGoalSide);
        if (ch) {
          foundKey = curKey;
          foundChar = ch;
          break;
        }
      }

      const dirOrder = dir_order_from(cur.inDx, cur.inDy);
      for (let di = 0; di < dirOrder.length; di++) {
        const d = dirOrder[di];
        const outSide = dir_side(d.dx, d.dy);
        const ch = cell_traverse_char(existing, cfSide, outSide);
        if (!ch) continue;
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const nKey = key(nx, ny, d.dx, d.dy);
        if (visited.has(nKey)) continue;
        visited.set(nKey, { prev: curKey, x: nx, y: ny, inDx: d.dx, inDy: d.dy });
        queue.push(nKey);
      }
    }

    if (!foundKey) return null;

    // Reconstruct path.
    const stack = [];
    let k = foundKey;
    while (k) {
      stack.push(visited.get(k));
      k = visited.get(k).prev;
    }
    stack.reverse();

    const placements = new Array(stack.length);
    for (let i = 0; i < stack.length; i++) {
      const st = stack[i];
      const cfSide = dir_side(-st.inDx, -st.inDy);
      let outSide;
      if (i === stack.length - 1) {
        // Last cell uses the exit direction toward e.
        outSide = outGoalSide;
      } else {
        const nxt = stack[i + 1];
        outSide = dir_side(nxt.x - st.x, nxt.y - st.y);
      }
      const existing = m[st.x][st.y];
      placements[i] = {
        x: st.x,
        y: st.y,
        char: cell_traverse_char(existing, cfSide, outSide),
      };
    }
    // Sanity: goal cell char must match what the goal check chose.
    if (placements.length > 0 && placements[placements.length - 1].char !== foundChar) {
      placements[placements.length - 1].char = foundChar;
    }
    return placements;
  }

  function apply_placements(m, placements) {
    // p.char is the full final char for the cell (computed by
    // cell_traverse_char); assign directly. No-op if unchanged.
    for (let i = 0; i < placements.length; i++) {
      const p = placements[i];
      m[p.x][p.y] = p.char;
    }
  }

  function lee_algorithm(Tin, P, opts) {
    const T = Tin.map(function (t) {
      return { x: t.x, y: t.y, dx: t.dx, dy: t.dy };
    });

    let state = derive_initial_state(Tin, opts);
    let m = state.m;

    const real_insert_map = global.insert_map;
    if (typeof real_insert_map !== 'function') {
      throw new Error('lee_algorithm: insert_map is not available; load lee/insert_map.js first');
    }
    /* Wrap insert_map so callers can mirror every grid expansion onto
     * sibling-block grids in lock-step (sequential multi-block routing
     * in lee/index_adapter.js).  When supplied, `onInsert(x, y, dir)`
     * fires AFTER the wrap completes its own state update; callers are
     * expected to apply the same insert_map to their own m/T pairs. */
    const onInsert = (opts && typeof opts.onInsert === 'function') ? opts.onInsert : null;
    function insert_map(mArg, x, y, dir, Targ) {
      const newM = real_insert_map(mArg, x, y, dir, Targ);
      if (onInsert) onInsert(x, y, dir);
      return newM;
    }

    // Per-port routing: preemptive clear of blocked departure cells, then BFS
    // with incremental inserts (s_clear → e_clear → one-shot midpoint).
    //
    // For a terminal at coord c with direction d (±1), the insertion index
    // that lands between the terminal and its facing cell is
    //   k = max(c, c+d)  == c + (d > 0 ? 1 : 0).
    // (Plain c+d is off-by-one for d<0: it would shift the blocking cell
    // along with the terminal, leaving the blockage adjacent.)
    const clamp = function (v, lim) { return v < 0 ? 0 : v > lim ? lim : v; };
    const colK = function (t) {
      return clamp(t.x + (t.dx > 0 ? 1 : 0), m.length);
    };
    const rowK = function (t) {
      return clamp(t.y + (t.dy > 0 ? 1 : 0), m.length > 0 ? m[0].length : 0);
    };
    const insertAtTerminal = function (t) {
      if (t.dx !== 0) return insert_map(m, colK(t), 0, 'col', T);
      return insert_map(m, 0, rowK(t), 'row', T);
    };
    const isBlocked = function (t) {
      const ax = t.x + t.dx;
      const ay = t.y + t.dy;
      const W = m.length;
      const H = W > 0 ? m[0].length : 0;
      if (ax < 0 || ax >= W || ay < 0 || ay >= H) return false;
      return m[ax][ay] !== ' ';
    };

    for (let pIdx = 0; pIdx < P.length; pIdx++) {
      let s_clear = false;
      let e_clear = false;
      let midpoint_tried = false;

      // 1. Preemptive clear: if a departure cell is blocked, open it first.
      if (isBlocked(T[P[pIdx].s])) {
        m = insertAtTerminal(T[P[pIdx].s]);
        s_clear = true;
      }
      if (isBlocked(T[P[pIdx].e])) {
        m = insertAtTerminal(T[P[pIdx].e]);
        e_clear = true;
      }

      // 2. BFS loop: on failure, add the next incremental insert. Iter bound
      // is a belt-and-suspenders guard; worst case is 4 iters (s_clear, then
      // e_clear, then midpoint, then unsolved).
      let solved = false;
      let done = false;
      for (let iter = 0; iter < 8 && !done; iter++) {
        const s = T[P[pIdx].s];
        const e = T[P[pIdx].e];
        const placements = bfs_route(m, s, e);
        if (placements) {
          apply_placements(m, placements);
          solved = true;
          break;
        }
        if (!s_clear) {
          m = insertAtTerminal(s);
          s_clear = true;
        } else if (!e_clear) {
          m = insertAtTerminal(e);
          e_clear = true;
        } else if (!midpoint_tried) {
          // Midpoint cut on the axis PERPENDICULAR to s's exit direction.
          if (s.dx !== 0) {
            const ym = Math.floor((s.y + e.y) / 2);
            m = insert_map(m, 0, clamp(ym, m.length > 0 ? m[0].length : 0), 'row', T);
          } else if (s.dy !== 0) {
            const xm = Math.floor((s.x + e.x) / 2);
            m = insert_map(m, clamp(xm, m.length), 0, 'col', T);
          }
          midpoint_tried = true;
        } else {
          done = true;
        }
      }
      if (!solved) {
        return {
          W: m.length,
          H: m.length > 0 ? m[0].length : 0,
          T: T,
          m: m,
          error: 'unsolved',
          failedPort: pIdx,
        };
      }
    }

    return {
      W: m.length,
      H: m.length > 0 ? m[0].length : 0,
      T: T,
      m: m,
    };
  }

  global.lee_algorithm = lee_algorithm;
  global.lee_bfs_route = bfs_route;
  global.lee_subport_char = subport_char;
  global.lee_can_place = can_place;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      lee_algorithm: lee_algorithm,
      bfs_route: bfs_route,
      subport_char: subport_char,
      can_place: can_place,
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
