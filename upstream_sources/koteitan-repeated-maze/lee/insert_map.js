// lee/insert_map.js
// Insert an empty column or row into the subport matrix, preserving existing
// connections by filling the new cells with '-' (for column) or '|' (for row)
// wherever the original neighbours were connected across the seam.
// Spec: lee/plan.md (insert_map section).
//
// insert_map(m, x, y, dir, T?) -> new m  (W+1 x H for 'col', W x H+1 for 'row')
//   m   : subport matrix m[x][y] in [' ', '|', '-', '\u253C', '\u250C', '\u2510',
//                                    '\u2514', '\u2518', 'T']
//   x   : insertion x (used only when dir === 'col'; new column placed at x)
//   y   : insertion y (used only when dir === 'row'; new row placed at y)
//   dir : 'col' or 'row'
//   T   : optional terminal list [{x, y, dx, dy}, ...]. If provided:
//           - terminal positions are shifted in place to match the inserted m
//             (T[i].x += 1 for x >= col index; T[i].y += 1 for y >= row index)
//           - 'T' cells next to the seam are treated as having a connection on
//             their (dx, dy) side so that terminal-to-subport links are bridged
//
// Returns the new, expanded 2D array. Does not mutate the input matrix.

(function (global) {
  const CH_CROSS = '\u253C';
  const CH_DR    = '\u250C';
  const CH_DL    = '\u2510';
  const CH_UR    = '\u2514';
  const CH_UL    = '\u2518';

  // Which sides does this subport char connect on?
  const SIDES = {
    ' ': '',
    '-': 'LR',
    '|': 'UD',
    [CH_CROSS]: 'LRUD',
    [CH_DR]:    'RD',
    [CH_DL]:    'LD',
    [CH_UR]:    'RU',
    [CH_UL]:    'LU',
  };

  function char_has_side(c, side) {
    const s = SIDES[c];
    if (s == null) return false;
    return s.indexOf(side) >= 0;
  }

  function new_2d(W, H, fill) {
    const m = new Array(W);
    for (let x = 0; x < W; x++) m[x] = new Array(H).fill(fill);
    return m;
  }

  function insert_map(m, x, y, dir, T) {
    const W = m.length;
    const H = W > 0 ? m[0].length : 0;

    // Connection test on a side of the pre-insertion cell at (cx, cy).
    function has_conn(cx, cy, side) {
      if (cx < 0 || cx >= W || cy < 0 || cy >= H) return false;
      const c = m[cx][cy];
      if (c === 'T') {
        if (!T) return false;
        for (let i = 0; i < T.length; i++) {
          const t = T[i];
          if (t && t.x === cx && t.y === cy) {
            if (side === 'L' && t.dx === -1) return true;
            if (side === 'R' && t.dx === 1)  return true;
            if (side === 'U' && t.dy === -1) return true;
            if (side === 'D' && t.dy === 1)  return true;
            return false;
          }
        }
        return false;
      }
      return char_has_side(c, side);
    }

    if (dir === 'col') {
      const k = x;
      if (k < 0 || k > W) throw new Error('insert_map: col x out of range: ' + k);
      const newM = new_2d(W + 1, H, ' ');
      for (let ox = 0; ox < W; ox++) {
        const nx = ox < k ? ox : ox + 1;
        for (let oy = 0; oy < H; oy++) {
          newM[nx][oy] = m[ox][oy];
        }
      }
      for (let y0 = 0; y0 < H; y0++) {
        if (has_conn(k - 1, y0, 'R') && has_conn(k, y0, 'L')) {
          newM[k][y0] = '-';
        }
      }
      if (T) {
        for (let i = 0; i < T.length; i++) {
          if (T[i] && T[i].x >= k) T[i].x += 1;
        }
      }
      return newM;
    }

    if (dir === 'row') {
      const k = y;
      if (k < 0 || k > H) throw new Error('insert_map: row y out of range: ' + k);
      const newM = new_2d(W, H + 1, ' ');
      for (let ox = 0; ox < W; ox++) {
        for (let oy = 0; oy < H; oy++) {
          const ny = oy < k ? oy : oy + 1;
          newM[ox][ny] = m[ox][oy];
        }
      }
      for (let x0 = 0; x0 < W; x0++) {
        if (has_conn(x0, k - 1, 'D') && has_conn(x0, k, 'U')) {
          newM[x0][k] = '|';
        }
      }
      if (T) {
        for (let i = 0; i < T.length; i++) {
          if (T[i] && T[i].y >= k) T[i].y += 1;
        }
      }
      return newM;
    }

    throw new Error('insert_map: dir must be "col" or "row"');
  }

  global.insert_map = insert_map;
  global.char_has_side = char_has_side;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { insert_map: insert_map, char_has_side: char_has_side };
  }
})(typeof window !== 'undefined' ? window : globalThis);
