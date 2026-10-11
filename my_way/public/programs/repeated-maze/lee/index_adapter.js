/* lee/index_adapter.js
 * Adapter: index.html's routeBlockPorts -> diagonal.md + lee_algorithm.
 *
 * Internal coord convention: CANVAS-style.
 *   x+ = east, y+ = south (y=0 is the TOP row).
 *   N subterms at y=0, S at y=H-1, W at x=0, E at x=W-1.
 *
 * This matches Lee's internal char labels (Lee's 'D' side = y+1 = visual
 * down, so Lee-produced corner chars (┌┐└┘) render correctly in the
 * canvas without any y-flip.
 */
(function (global) {
  const require_lee = typeof require !== 'undefined';
  const LEE = require_lee
    ? {
        lee_algorithm: require('./lee_algorithm.js').lee_algorithm,
        insert_map: require('./insert_map.js').insert_map,
      }
    : {
        lee_algorithm: global.lee_algorithm,
        insert_map: global.insert_map,
      };

  /* Map a connect[W/E/N/S] (0/1) to a subport char.
   * Bit encoding used by test-v2.js DIRS: bit0=R, bit1=D, bit2=L, bit3=U.
   * With canvas coords: N-up is 'U' in Lee's labels (matches visually).
   */
  const SHAPE_BY_BITS = {
    0b0000: ' ',
    0b0101: '─', 0b1010: '│',
    0b1001: '└', 0b1100: '┘', 0b0011: '┌', 0b0110: '┐',
    0b1011: '├', 0b1110: '┤', 0b0111: '┬', 0b1101: '┴',
    0b1111: '┼',
    0b0001: '─', 0b0100: '─', 0b1000: '│', 0b0010: '│',
  };
  function connectToChar(conn) {
    const bits = (conn.E ? 1 : 0) | (conn.S ? 2 : 0) | (conn.W ? 4 : 0) | (conn.N ? 8 : 0);
    return SHAPE_BY_BITS[bits] || '?';
  }

  function buildBlockSubgrid(ports, nterm, cellSize, opts) {
    opts = opts || {};
    /* ---- 1. Count subterminals per (dir, terminal-idx) ----
     * `ownNsub` is THIS block's actual counts (used for connectToChar
     * painting in step 8 — only the slots this block uses get
     * subport bits and subterm-edge fill).
     * `nsub` drives the layout (cell row/col placement of subterm
     * cells).  When the caller passes `nsubOverride` (sequential
     * multi-block routing), every sibling shares one layout — the
     * max counts across all four block-types — so subterm cells line
     * up at the same (col, row) in every block.  Otherwise nsub
     * defaults to ownNsub for the legacy single-block path. */
    const ownNsub = { W: [], E: [], N: [], S: [] };
    for (let i = 0; i < nterm; i++) {
      ownNsub.W.push(0); ownNsub.E.push(0); ownNsub.N.push(0); ownNsub.S.push(0);
    }
    for (const p of ports) {
      ownNsub[p.src.dir][p.src.idx]++;
      ownNsub[p.dst.dir][p.dst.idx]++;
    }
    const nsub = opts.nsubOverride || ownNsub;

    /* ---- 2. Grid size (diagonal.md §39-40) ---- */
    let Hcore = 0, Wcore = 0;
    for (let t = 0; t < nterm; t++) {
      Hcore += Math.max(nsub.W[t], nsub.E[t]);
      Wcore += Math.max(nsub.N[t], nsub.S[t]);
    }
    /* Reserve at least one interior row/column: when Wcore=0 or Hcore=0 the
     * literal +2 would place W/E (or N/S) terminals in directly adjacent
     * cells, and insert_map's bridge detection would then auto-connect
     * them even when they belong to different ports. */
    let H = Math.max(Hcore + 2, 3);
    let W = Math.max(Wcore + 2, 3);

    /* ---- 3. Subterminal placement (canvas convention) ----
     * W/E: y ∈ [1, H-2] (top=1 to bottom=H-2, avoiding corners).
     * S/N: x ∈ [1, W-2].
     *
     * diagonal.md §44-50 says "y=0, t=0 に初期化, y をインクリメント". We
     * start y=1 to leave corner (0,0) empty.  The spec's order t=0, t=1,
     * ... is preserved: the t=0 subterminals come first in the subgrid's
     * y range, closest to the top (y=1, 2, ...).
     */
    const wY = [], eY = [], nX = [], sX = [];
    for (let t = 0; t < nterm; t++) { wY.push([]); eY.push([]); nX.push([]); sX.push([]); }
    {
      let y = 1;
      for (let t = 0; t < nterm; t++) {
        const maxWE = Math.max(nsub.W[t], nsub.E[t]);
        for (let s = 0; s < maxWE; s++) {
          if (s < nsub.W[t]) wY[t].push(y);
          if (s < nsub.E[t]) eY[t].push(y);
          y++;
        }
      }
    }
    {
      let x = 1;
      for (let t = 0; t < nterm; t++) {
        const maxSN = Math.max(nsub.N[t], nsub.S[t]);
        for (let s = 0; s < maxSN; s++) {
          if (s < nsub.S[t]) sX[t].push(x);
          if (s < nsub.N[t]) nX[t].push(x);
          x++;
        }
      }
    }

    /* ---- 4. Tin: dx/dy points INTO block interior (canvas conv) ----
     *   W at (0, y)     : dx=+1, dy=0
     *   E at (W-1, y)   : dx=-1
     *   N at (x, 0)     : dx=0, dy=+1  (down into block)
     *   S at (x, H-1)   : dy=-1
     */
    const Tin = [];
    const tinKeyByIdx = [];
    const tinIdxByKey = {};
    function addTerm(dir, t, s, x, y, dx, dy) {
      const key = dir + t + '-' + s;
      tinIdxByKey[key] = Tin.length;
      tinKeyByIdx.push(key);
      Tin.push({ x, y, dx, dy });
    }
    for (let t = 0; t < nterm; t++) {
      for (let s = 0; s < wY[t].length; s++) addTerm('W', t, s, 0, wY[t][s], +1, 0);
      for (let s = 0; s < eY[t].length; s++) addTerm('E', t, s, W - 1, eY[t][s], -1, 0);
      for (let s = 0; s < nX[t].length; s++) addTerm('N', t, s, nX[t][s], 0, 0, +1);
      for (let s = 0; s < sX[t].length; s++) addTerm('S', t, s, sX[t][s], H - 1, 0, -1);
    }

    /* ---- 5. Build P from (src, dst), first-come s order ---- */
    const used = { W: [], E: [], N: [], S: [] };
    for (let i = 0; i < nterm; i++) { used.W.push(0); used.E.push(0); used.N.push(0); used.S.push(0); }
    const P = [];
    const portSubKeys = [];  /* [{srcKey, dstKey}, ...] for later per-port termPos lookup */
    for (const p of ports) {
      const sKey = p.src.dir + p.src.idx + '-' + (used[p.src.dir][p.src.idx]++);
      const eKey = p.dst.dir + p.dst.idx + '-' + (used[p.dst.dir][p.dst.idx]++);
      P.push({ s: tinIdxByKey[sKey], e: tinIdxByKey[eKey] });
      portSubKeys.push({ srcKey: sKey, dstKey: eKey });
    }

    if (Tin.length === 0) return emptyResult(nterm, cellSize);

    /* `ownedKey` flags each Tin slot as actually used by THIS block's
     * own ports.  In sequential multi-block routing the layout slot
     * may exist (so sibling blocks share coords) but only owned slots
     * become 'T' in m and only owned slots get connectToChar painting
     * in step 8 — unused slots stay blank so unrelated lines do not
     * leak across blocks. */
    const owned = new Array(Tin.length).fill(false);
    for (let t = 0; t < nterm; t++) {
      for (let s = 0; s < ownNsub.W[t]; s++) { const k = 'W' + t + '-' + s; if (tinIdxByKey[k] != null) owned[tinIdxByKey[k]] = true; }
      for (let s = 0; s < ownNsub.E[t]; s++) { const k = 'E' + t + '-' + s; if (tinIdxByKey[k] != null) owned[tinIdxByKey[k]] = true; }
      for (let s = 0; s < ownNsub.N[t]; s++) { const k = 'N' + t + '-' + s; if (tinIdxByKey[k] != null) owned[tinIdxByKey[k]] = true; }
      for (let s = 0; s < ownNsub.S[t]; s++) { const k = 'S' + t + '-' + s; if (tinIdxByKey[k] != null) owned[tinIdxByKey[k]] = true; }
    }

    /* ---- 6. Run Lee ----
     * Pre-build the initial W×H grid (with 'T' only at OWNED subterm
     * slots) and hand it to lee_algorithm via opts.  In sequential
     * multi-block mode the caller may supply `externalLeeResult` —
     * already-finalised m and T from an outer driver that ran Lee on
     * this block while mirroring inserts to siblings.  In that case
     * skip Lee entirely and reuse the supplied state. */
    let m, curW, curH, T;
    if (opts.externalLeeResult) {
      m = opts.externalLeeResult.m;
      T = opts.externalLeeResult.T;
      curW = m.length;
      curH = m[0] ? m[0].length : 0;
      /* Tin entries reflect the layout but may have been shifted by
       * inserts in the external driver.  Sync Tin coords to T. */
      for (let i = 0; i < Tin.length; i++) {
        if (T[i]) { Tin[i].x = T[i].x; Tin[i].y = T[i].y; }
      }
      W = curW; H = curH;
    } else {
      const TinCopy = Tin.map(t => ({ x: t.x, y: t.y, dx: t.dx, dy: t.dy }));
      const m0 = new Array(W);
      for (let x = 0; x < W; x++) m0[x] = new Array(H).fill(' ');
      for (let i = 0; i < Tin.length; i++) {
        if (owned[i]) m0[Tin[i].x][Tin[i].y] = 'T';
      }
      const leeRes = LEE.lee_algorithm(TinCopy, P, { W, H, m: m0 });
      if (leeRes.error) {
        console.warn('lee_algorithm error:', leeRes.error, 'failedPort:', leeRes.failedPort);
      }
      m = leeRes.m;
      curW = leeRes.W;
      curH = leeRes.H;
      T = leeRes.T;
      for (let i = 0; i < Tin.length; i++) {
        Tin[i].x = T[i].x;
        Tin[i].y = T[i].y;
      }

      /* ---- 7. Square the grid (diagonal.md §53-57) ----
       * Insert row at canvas y=1 (just below top-row N terminals); this
       * corresponds to spec's "H'-2" position after shift. Insert col at
       * x=W-1 (just inside the right-edge E terminals).
       *
       * Skipped when externalLeeResult is supplied — the sequential
       * driver has already squared the shared grid for every block. */
      while (curW < curH) {
        m = LEE.insert_map(m, curW - 1, 0, 'col', T);
        curW++;
      }
      while (curH < curW) {
        m = LEE.insert_map(m, 0, 1, 'row', T);
        curH++;
      }
    }

    /* Normalize Lee's ASCII '-' / '|' to Unicode box-drawing chars. */
    for (let x = 0; x < curW; x++) {
      for (let y = 0; y < curH; y++) {
        const ch = m[x][y];
        if (ch === '-') m[x][y] = '─';
        else if (ch === '|') m[x][y] = '│';
      }
    }

    /* ---- 8. Compute connect[] for each subterminal & overwrite 'T'
     * Only owned subterm slots get conns / connectToChar painting.
     * Unused (sibling-only) slots in the shared layout stay blank. */
    const entriesByKey = {};
    for (let i = 0; i < Tin.length; i++) {
      if (!owned[i]) continue;
      const key = tinKeyByIdx[i];
      const m_ = /^([WENS])(\d+)-(\d+)$/.exec(key);
      if (!m_) continue;
      const dir = m_[1], tN = +m_[2], sN = +m_[3];
      const gk = dir + tN;
      (entriesByKey[gk] = entriesByKey[gk] || []).push({ idx: i, s: sN, key, dir, t: tN });
    }
    for (const k in entriesByKey) entriesByKey[k].sort((a, b) => a.s - b.s);

    const conns = new Array(Tin.length).fill(null);
    for (const k in entriesByKey) {
      const list = entriesByKey[k];
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        const c = { W: 0, E: 0, N: 0, S: 0 };
        /* Outward (toward terminal outside the block) — only s=0 per
         * diagonal.md §63 "Dt-0 の connect[D]". */
        if (e.s === 0) c[e.dir] = 1;
        /* Inward (Lee-routed subport) */
        if (e.dir === 'W') c.E = 1;
        if (e.dir === 'E') c.W = 1;
        if (e.dir === 'N') c.S = 1;
        if (e.dir === 'S') c.N = 1;
        /* Neighbors on the same edge (branch line).
         * W/E edges: subterms stacked vertically. In canvas conv, s=0 sits
         * at smaller y (closer to top). prev (smaller s) is N of current. */
        const hasPrev = i > 0;
        const hasNext = i < list.length - 1;
        if (e.dir === 'W' || e.dir === 'E') {
          if (hasPrev) c.N = 1;
          if (hasNext) c.S = 1;
        } else {
          if (hasPrev) c.W = 1;
          if (hasNext) c.E = 1;
        }
        conns[e.idx] = c;
        const tp = T[e.idx];
        if (m[tp.x] && m[tp.x][tp.y] === 'T') {
          m[tp.x][tp.y] = connectToChar(c);
        }
      }
    }

    /* ---- 8b. Fill gaps between adjacent subterminals on the same edge
     * (Lee's row/col insertions may have spread subterms apart). */
    for (const k in entriesByKey) {
      const list = entriesByKey[k];
      if (list.length < 2) continue;
      const dir = list[0].dir;
      for (let i = 0; i < list.length - 1; i++) {
        const a = T[list[i].idx], b = T[list[i + 1].idx];
        if (dir === 'W' || dir === 'E') {
          const x = a.x;
          const y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
          for (let y = y1 + 1; y < y2; y++) {
            const ch = m[x][y];
            if (ch === ' ') m[x][y] = '│';
            else if (ch === '─') m[x][y] = '┼';
          }
        } else {
          const y = a.y;
          const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
          for (let x = x1 + 1; x < x2; x++) {
            const ch = m[x][y];
            if (ch === ' ') m[x][y] = '─';
            else if (ch === '│') m[x][y] = '┼';
          }
        }
      }
    }

    /* ---- 9. subgrid[r][c] = m[c][r] (no flip; canvas convention) ---- */
    const nR = curH, nC = curW;
    const subgrid = new Array(nR);
    for (let r = 0; r < nR; r++) {
      const row = new Array(nC);
      for (let c = 0; c < nC; c++) row[c] = m[c][r];
      subgrid[r] = row;
    }

    const cellW = cellSize / nC, cellH = cellSize / nR;

    /* ---- 10. termPos (block-local pixel coords, canvas convention) ----
     * Fill all idx ∈ [0, nterm-1] in each direction. For used terminals,
     * use first subterm's cross-axis center. Alignment W[i].y = E[i].y
     * and N[i].x = S[i].x is guaranteed by the shared-y/x placement.
     */
    const termPos = {};
    for (let t = 0; t < nterm; t++) {
      let yCanvas;
      if (wY[t].length > 0 || eY[t].length > 0) {
        const key = (wY[t].length > 0 ? 'W' : 'E') + t + '-0';
        const pos = T[tinIdxByKey[key]];
        yCanvas = (pos.y + 0.5) * cellH;
      } else {
        yCanvas = cellSize * (t + 1) / (nterm + 1);
      }
      termPos['W' + t] = { x: 0, y: yCanvas };
      termPos['E' + t] = { x: cellSize, y: yCanvas };

      let xCanvas;
      if (nX[t].length > 0 || sX[t].length > 0) {
        const key = (nX[t].length > 0 ? 'N' : 'S') + t + '-0';
        const pos = T[tinIdxByKey[key]];
        xCanvas = (pos.x + 0.5) * cellW;
      } else {
        xCanvas = cellSize * (t + 1) / (nterm + 1);
      }
      termPos['N' + t] = { x: xCanvas, y: 0 };
      termPos['S' + t] = { x: xCanvas, y: cellSize };
    }

    /* ---- 10b. Subterminal-specific positions (block-local pixel) for
     * each sub-key like "W0-1", "E2-0" etc. Used by drawNormal to draw
     * the answer-path line at the exact terminal position each port
     * actually uses, instead of always anchoring to the first subterm. */
    function subtermPos(key) {
      const i = tinIdxByKey[key];
      if (i == null) return null;
      const t = T[i];
      const m_ = /^([WENS])(\d+)-(\d+)$/.exec(key);
      const dir = m_[1];
      if (dir === 'W') return { x: 0, y: (t.y + 0.5) * cellH };
      if (dir === 'E') return { x: cellSize, y: (t.y + 0.5) * cellH };
      if (dir === 'N') return { x: (t.x + 0.5) * cellW, y: 0 };
      return { x: (t.x + 0.5) * cellW, y: cellSize };
    }
    for (const key in tinIdxByKey) {
      const p = subtermPos(key);
      if (p) termPos[key] = p;
    }
    /* Trace the cell path each port traverses in the final subgrid so
     * the answer path can be drawn on top of the exact Lee subport. */
    const SIDES_OF = {
      '─': 'LR', '│': 'UD',
      '└': 'UR', '┘': 'UL', '┌': 'DR', '┐': 'DL',
      '┼': 'LRUD',
      '├': 'UDR', '┤': 'UDL', '┬': 'LRD', '┴': 'LRU',
    };
    const DIR_DELTA = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] };
    const OPP_DIR = { E: 'W', W: 'E', N: 'S', S: 'N' };
    const SIDE_OF_DIR = { E: 'R', W: 'L', N: 'U', S: 'D' };
    const OPP_SIDE = { L: 'R', R: 'L', U: 'D', D: 'U' };
    function tracePortCells(srcIdx, dstIdx, srcDir) {
      const src = T[srcIdx], dst = T[dstIdx];
      const cells = [{ x: src.x, y: src.y }];
      let prevDir = srcDir;                /* direction we came FROM (outward) */
      let cx = src.x, cy = src.y;
      const maxSteps = (m.length + (m[0] ? m[0].length : 0)) * 4;
      for (let step = 0; step < maxSteps; step++) {
        if (cx === dst.x && cy === dst.y && step > 0) return cells;
        const inSide = SIDE_OF_DIR[prevDir];
        const shape = m[cx] && m[cx][cy];
        const conn = SIDES_OF[shape];
        let outSide = null;
        if (conn) {
          const outs = conn.split('').filter(s => s !== inSide);
          if (outs.length === 1) outSide = outs[0];
          else if (outs.length > 1) {
            const opp = OPP_SIDE[inSide];
            outSide = outs.includes(opp) ? opp : outs[0];
          }
        }
        if (!outSide) return null;
        const exitDir = { L: 'W', R: 'E', U: 'N', D: 'S' }[outSide];
        const d = DIR_DELTA[exitDir];
        cx += d[0]; cy += d[1];
        cells.push({ x: cx, y: cy });
        prevDir = OPP_DIR[exitDir];
      }
      return null;
    }

    /* Inward offset (block-local pixel) by half a subblock, used for the
     * answer-path branch-subport detour on ports that enter / exit at a
     * non-first subterminal: (terminal_edge) → mt (half sub-block inward)
     * → st (sub-cell centre) → … (Lee cells) → mt_dst → (terminal_edge).
     * Spec: diagonal.md §branch subport answer-path drawing rule. */
    const HALF = { W: [cellW / 2, 0], E: [-cellW / 2, 0], N: [0, cellH / 2], S: [0, -cellH / 2] };

    const portInfo = portSubKeys.map(({ srcKey, dstKey }, idx) => {
      const sIdx = tinIdxByKey[srcKey];
      const dIdx = tinIdxByKey[dstKey];
      const srcDir = ports[idx].src.dir;
      const dstDir = ports[idx].dst.dir;
      const srcIdx = ports[idx].src.idx;
      const dstIdx = ports[idx].dst.idx;
      const srcSub = parseInt(srcKey.split('-')[1], 10);
      const dstSub = parseInt(dstKey.split('-')[1], 10);
      const cells = tracePortCells(sIdx, dIdx, srcDir);
      const srcP = subtermPos(srcKey);
      const dstP = subtermPos(dstKey);
      let cellPath = null;
      /* answerSegments: array of polylines. When a branch-subport detour
       * is present on an endpoint, the polyline is split so the red
       * trail stops at "st" (sub-cell centre) on the branch side rather
       * than continuing through the sub-terminal cell's Lee subport.
       *
       * Per diagonal.md answer-path rule on a branch subport:
       *   A) terminal_edge → mt (half sub-block inward from terminal rep)
       *   B) subterm_edge → st (half sub-block inward from sub-edge)
       *   C) mt → st (perpendicular)
       * Line A + Line C appear as a stand-alone segment, Line B as a
       * branchStub, and the main Lee cell-path is drawn separately. */
      const answerSegments = [];
      const answerSegmentsGrid = [];
      const answerSegmentsLabels = [];
      const answerSegmentsKind = [];   /* 'src-branch' | 'main' | 'dst-branch' */
      const branchStubs = [];
      const branchStubsGrid = [];
      const branchStubsKind = [];      /* 'src-branch' | 'dst-branch' */
      if (cells) {
        cellPath = [srcP];
        for (let ci = 0; ci < cells.length; ci++) {
          const c = cells[ci];
          cellPath.push({ x: (c.x + 0.5) * cellW, y: (c.y + 0.5) * cellH });
        }
        cellPath.push(dstP);

        /* Subgrid (c, r) for each cellPath point. Edge points (the
         * subterm pixel at index 0 and len-1) are assigned to the
         * adjacent subterm cell so "line for sb(c,r)" labels map to a
         * real subblock. */
        const cellsGrid = [];
        cellsGrid.push({ c: cells[0].x, r: cells[0].y });
        for (const cc of cells) cellsGrid.push({ c: cc.x, r: cc.y });
        cellsGrid.push({ c: cells[cells.length - 1].x, r: cells[cells.length - 1].y });

        const srcTerm = termPos[srcDir + srcIdx];
        const dstTerm = termPos[dstDir + dstIdx];
        const srcBranch = srcSub > 0 && srcTerm;
        const dstBranch = dstSub > 0 && dstTerm;
        const srcCell = cellsGrid[0];
        const dstCell = cellsGrid[cellsGrid.length - 1];

        if (srcBranch) {
          const d = HALF[srcDir];
          const poly = [
            { x: srcTerm.x, y: srcTerm.y },                       /* A start (terminal rep edge) */
            { x: srcTerm.x + d[0], y: srcTerm.y + d[1] },         /* mt */
            cellPath[1],                                          /* st (sub-cell centre) */
          ];
          const polyGrid = [srcCell, srcCell, srcCell];
          const polyLabels = ['t', 'sp'];
          /* Line B bridge: extend the polyline to cellPath[2] so (t)(sp)(st)
           * are drawn as one continuous polyline via drawSeg. */
          if (cellPath.length >= 3) {
            poly.push(cellPath[2]);
            polyGrid.push(cellsGrid[2]);
            polyLabels.push('st');
          }
          answerSegments.push(poly);
          answerSegmentsGrid.push(polyGrid);
          answerSegmentsLabels.push(polyLabels);
          answerSegmentsKind.push('src-branch');
        }
        /* Main Lee cell-path, trimmed of endpoints taken by the branch
         * detours above so the red trail doesn't re-enter the sub-cell. */
        const mainStart = srcBranch ? 2 : 0;
        const mainEnd   = dstBranch ? cellPath.length - 2 : cellPath.length;
        if (mainEnd - mainStart >= 2) {
          const main = cellPath.slice(mainStart, mainEnd);
          answerSegments.push(main);
          answerSegmentsGrid.push(cellsGrid.slice(mainStart, mainEnd));
          answerSegmentsLabels.push(new Array(main.length - 1).fill('polyline'));
          answerSegmentsKind.push('main');
        }
        if (dstBranch) {
          const d = HALF[dstDir];
          const last = cellPath.length - 1;
          const poly = [];
          const polyGrid = [];
          const polyLabels = [];
          /* Line B bridge: include (prevCell → st) so the dst-branch
           * polyline has (st)(sp)(t) contiguously as drawSeg segments. */
          if (cellPath.length >= 3) {
            poly.push(cellPath[last - 2]);
            polyGrid.push(cellsGrid[last - 2]);
            polyLabels.push('st');
          }
          poly.push(cellPath[last - 1]);                          /* st (sub-cell centre) */
          poly.push({ x: dstTerm.x + d[0], y: dstTerm.y + d[1] });/* mt */
          poly.push({ x: dstTerm.x, y: dstTerm.y });              /* terminal rep edge */
          polyGrid.push(dstCell);
          polyGrid.push(dstCell);
          polyGrid.push(dstCell);
          polyLabels.push('sp', 't');
          answerSegments.push(poly);
          answerSegmentsGrid.push(polyGrid);
          answerSegmentsLabels.push(polyLabels);
          answerSegmentsKind.push('dst-branch');
        }
      }
      return {
      srcDir, srcIdx, srcSub,
      dstDir, dstIdx, dstSub,
      src: srcP,
      dst: dstP,
      cellPath,
      answerSegments,
      answerSegmentsGrid,
      answerSegmentsLabels,
      answerSegmentsKind,
      branchStubs,
      branchStubsGrid,
      branchStubsKind,
      };
    });

    /* ---- 11. Junctions ---- */
    const junctions = [];
    for (let i = 0; i < Tin.length; i++) {
      const c = conns[i];
      if (!c) continue;
      const sum = c.W + c.E + c.N + c.S;
      if (sum > 2) {
        const tp = T[i];
        junctions.push({
          x: (tp.x + 0.5) * cellW,
          y: (tp.y + 0.5) * cellH,
        });
      }
    }

    return {
      routes: [], spines: [], junctions, termPos, overlaps: [],
      subgrid, nR, nC, portInfo,
    };
  }

  function emptyResult(nterm, cellSize) {
    const termPos = {};
    for (let i = 0; i < nterm; i++) {
      const t = cellSize * (i + 1) / (nterm + 1);
      termPos['W' + i] = { x: 0, y: t };
      termPos['E' + i] = { x: cellSize, y: t };
      termPos['N' + i] = { x: t, y: 0 };
      termPos['S' + i] = { x: t, y: cellSize };
    }
    return {
      routes: [], spines: [], junctions: [], termPos, overlaps: [],
      subgrid: [[' ']], nR: 1, nC: 1,
    };
  }

  /* Sequential multi-block routing: route normal -> nx -> ny -> zero
   * one block at a time, mirroring every Lee insert_map back onto
   * already-routed blocks' m and T arrays so all four blocks finish
   * with identical grid dimensions and identical subterminal coords.
   * Each block's own m carries only its own port lines, so per-block
   * BFS reachability stays clean.
   *
   * Per-block init: when a later block (nx) starts, it COPIES the
   * already-routed normal block's T (terminal coords) and stamps 'T'
   * only at the slots THIS block uses, on a freshly blank m of the
   * current shared (W, H).  Lee then routes nx's ports inside that m.
   * Inserts that Lee triggers fire onInsert, which insert_maps the
   * same (x, y, dir) into every older block's m and T.
   */
  function buildSequentialBlockSubgrids(blockPortsByType, nterm, cellSize) {
    /* ---- A. Dedupe ports per block, accumulate nsubAll ---- */
    const blockDeduped = { normal: [], nx: [], ny: [], zero: [] };
    const nsubAll = { W: [], E: [], N: [], S: [] };
    for (let i = 0; i < nterm; i++) {
      nsubAll.W.push(0); nsubAll.E.push(0); nsubAll.N.push(0); nsubAll.S.push(0);
    }
    for (const bt of ['normal', 'nx', 'ny', 'zero']) {
      const seen = new Set();
      const blockNsub = { W: [], E: [], N: [], S: [] };
      for (let i = 0; i < nterm; i++) {
        blockNsub.W.push(0); blockNsub.E.push(0); blockNsub.N.push(0); blockNsub.S.push(0);
      }
      for (const port of (blockPortsByType[bt] || [])) {
        if (port.src.dir === 'C' || port.dst.dir === 'C') continue;
        const k1 = port.src.dir + port.src.idx + ',' + port.dst.dir + port.dst.idx;
        const k2 = port.dst.dir + port.dst.idx + ',' + port.src.dir + port.src.idx;
        if (seen.has(k2)) continue;
        seen.add(k1);
        blockDeduped[bt].push(port);
        blockNsub[port.src.dir][port.src.idx]++;
        blockNsub[port.dst.dir][port.dst.idx]++;
      }
      for (let i = 0; i < nterm; i++) {
        for (const d of ['W', 'E', 'N', 'S']) {
          if (blockNsub[d][i] > nsubAll[d][i]) nsubAll[d][i] = blockNsub[d][i];
        }
      }
    }

    /* ---- B. Compute initial shared layout (Tin, W, H, ownedByBt) ---- */
    let Hcore = 0, Wcore = 0;
    for (let t = 0; t < nterm; t++) {
      Hcore += Math.max(nsubAll.W[t], nsubAll.E[t]);
      Wcore += Math.max(nsubAll.N[t], nsubAll.S[t]);
    }
    let H = Math.max(Hcore + 2, 3);
    let W = Math.max(Wcore + 2, 3);

    const wY = [], eY = [], nX = [], sX = [];
    for (let t = 0; t < nterm; t++) { wY.push([]); eY.push([]); nX.push([]); sX.push([]); }
    {
      let y = 1;
      for (let t = 0; t < nterm; t++) {
        const maxWE = Math.max(nsubAll.W[t], nsubAll.E[t]);
        for (let s = 0; s < maxWE; s++) {
          if (s < nsubAll.W[t]) wY[t].push(y);
          if (s < nsubAll.E[t]) eY[t].push(y);
          y++;
        }
      }
    }
    {
      let x = 1;
      for (let t = 0; t < nterm; t++) {
        const maxSN = Math.max(nsubAll.N[t], nsubAll.S[t]);
        for (let s = 0; s < maxSN; s++) {
          if (s < nsubAll.S[t]) sX[t].push(x);
          if (s < nsubAll.N[t]) nX[t].push(x);
          x++;
        }
      }
    }

    const Tin = [];
    const tinKeyByIdx = [];
    const tinIdxByKey = {};
    function addTerm(dir, t, s, x, y, dx, dy) {
      const key = dir + t + '-' + s;
      tinIdxByKey[key] = Tin.length;
      tinKeyByIdx.push(key);
      Tin.push({ x, y, dx, dy });
    }
    for (let t = 0; t < nterm; t++) {
      for (let s = 0; s < wY[t].length; s++) addTerm('W', t, s, 0, wY[t][s], +1, 0);
      for (let s = 0; s < eY[t].length; s++) addTerm('E', t, s, W - 1, eY[t][s], -1, 0);
      for (let s = 0; s < nX[t].length; s++) addTerm('N', t, s, nX[t][s], 0, 0, +1);
      for (let s = 0; s < sX[t].length; s++) addTerm('S', t, s, sX[t][s], H - 1, 0, -1);
    }

    /* ownedByBt[bt][i] = true if block bt actually uses Tin slot i */
    const ownedByBt = { normal: [], nx: [], ny: [], zero: [] };
    for (const bt of ['normal', 'nx', 'ny', 'zero']) {
      const own = new Array(Tin.length).fill(false);
      const blockNsub = { W: [], E: [], N: [], S: [] };
      for (let i = 0; i < nterm; i++) {
        blockNsub.W.push(0); blockNsub.E.push(0); blockNsub.N.push(0); blockNsub.S.push(0);
      }
      for (const port of blockDeduped[bt]) {
        blockNsub[port.src.dir][port.src.idx]++;
        blockNsub[port.dst.dir][port.dst.idx]++;
      }
      for (let t = 0; t < nterm; t++) {
        for (let s = 0; s < blockNsub.W[t]; s++) { const k = 'W' + t + '-' + s; if (tinIdxByKey[k] != null) own[tinIdxByKey[k]] = true; }
        for (let s = 0; s < blockNsub.E[t]; s++) { const k = 'E' + t + '-' + s; if (tinIdxByKey[k] != null) own[tinIdxByKey[k]] = true; }
        for (let s = 0; s < blockNsub.N[t]; s++) { const k = 'N' + t + '-' + s; if (tinIdxByKey[k] != null) own[tinIdxByKey[k]] = true; }
        for (let s = 0; s < blockNsub.S[t]; s++) { const k = 'S' + t + '-' + s; if (tinIdxByKey[k] != null) own[tinIdxByKey[k]] = true; }
      }
      ownedByBt[bt] = own;
    }

    /* ---- C. Sequential Lee, mirroring inserts back to older blocks ---- */
    const orderBt = ['normal', 'nx', 'ny', 'zero'];
    const mByBt = { normal: null, nx: null, ny: null, zero: null };
    const TByBt = { normal: null, nx: null, ny: null, zero: null };
    /* `routedSoFar` tracks which blocks have been processed (mirror
     * targets when the next block triggers an insert).  We mirror to
     * EVERY already-routed block plus the active block itself; Lee
     * handles the active block's m/T directly via its own state, so
     * onInsert only needs to update the OTHER routed blocks. */
    const routedSoFar = [];
    for (const bt of orderBt) {
      const ports = blockDeduped[bt];
      /* Build P (port indices into Tin) using shared layout */
      const used = { W: [], E: [], N: [], S: [] };
      for (let i = 0; i < nterm; i++) { used.W.push(0); used.E.push(0); used.N.push(0); used.S.push(0); }
      const P = [];
      for (const p of ports) {
        const sKey = p.src.dir + p.src.idx + '-' + (used[p.src.dir][p.src.idx]++);
        const eKey = p.dst.dir + p.dst.idx + '-' + (used[p.dst.dir][p.dst.idx]++);
        const sIdx = tinIdxByKey[sKey], eIdx = tinIdxByKey[eKey];
        if (sIdx != null && eIdx != null) P.push({ s: sIdx, e: eIdx });
      }

      /* Init this block's m/T from the current shared (W, H).  When
       * routedSoFar is non-empty, copy T from the last routed block —
       * those have shared coords by construction (every prior insert
       * fired onInsert into all routed blocks). */
      let m_bt = new Array(W);
      for (let x = 0; x < W; x++) m_bt[x] = new Array(H).fill(' ');
      let T_bt;
      if (routedSoFar.length > 0) {
        const ref = TByBt[routedSoFar[routedSoFar.length - 1]];
        T_bt = ref.map(t => ({ x: t.x, y: t.y, dx: t.dx, dy: t.dy }));
      } else {
        T_bt = Tin.map(t => ({ x: t.x, y: t.y, dx: t.dx, dy: t.dy }));
      }
      const own = ownedByBt[bt];
      for (let i = 0; i < T_bt.length; i++) {
        if (own[i]) {
          const t = T_bt[i];
          if (t.x >= 0 && t.x < W && t.y >= 0 && t.y < H) m_bt[t.x][t.y] = 'T';
        }
      }

      /* onInsert: when Lee inserts into m_bt at (x, y, dir), apply the
       * SAME insert into every already-routed sibling's m and T so
       * grid sizes and subterm coords stay locked. */
      const onInsert = (x, y, dir) => {
        for (const sibBt of routedSoFar) {
          mByBt[sibBt] = LEE.insert_map(mByBt[sibBt], x, y, dir, TByBt[sibBt]);
        }
        if (dir === 'col') W += 1; else H += 1;
      };

      if (P.length > 0) {
        const leeRes = LEE.lee_algorithm(T_bt, P, { W, H, m: m_bt, onInsert });
        if (leeRes.error) {
          console.warn(`buildSequentialBlockSubgrids: ${bt} ${leeRes.error} failedPort=${leeRes.failedPort}`);
        }
        m_bt = leeRes.m;
        T_bt = leeRes.T;
      }
      mByBt[bt] = m_bt;
      TByBt[bt] = T_bt;
      routedSoFar.push(bt);
    }

    /* ---- D. Square the shared grid (post all blocks) ---- */
    let curW = mByBt.normal ? mByBt.normal.length : W;
    let curH = mByBt.normal && mByBt.normal[0] ? mByBt.normal[0].length : H;
    while (curW < curH) {
      for (const bt of orderBt) {
        mByBt[bt] = LEE.insert_map(mByBt[bt], curW - 1, 0, 'col', TByBt[bt]);
      }
      curW++;
    }
    while (curH < curW) {
      for (const bt of orderBt) {
        mByBt[bt] = LEE.insert_map(mByBt[bt], 0, 1, 'row', TByBt[bt]);
      }
      curH++;
    }

    /* ---- E. Per-block post-processing via buildBlockSubgrid ---- */
    const out = {};
    for (const bt of orderBt) {
      out[bt] = buildBlockSubgrid(blockDeduped[bt], nterm, cellSize, {
        nsubOverride: nsubAll,
        externalLeeResult: { m: mByBt[bt], T: TByBt[bt] },
      });
    }
    return out;
  }

  global.buildBlockSubgrid = buildBlockSubgrid;
  global.buildSequentialBlockSubgrids = buildSequentialBlockSubgrids;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildBlockSubgrid, buildSequentialBlockSubgrids };
  }
})(typeof window !== 'undefined' ? window : globalThis);
