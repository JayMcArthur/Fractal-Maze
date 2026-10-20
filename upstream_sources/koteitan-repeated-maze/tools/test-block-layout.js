#!/usr/bin/env node
/* test-block-layout.js — Verify Lee subgrid layout consistency across
 * normal / nx / ny / zero blocks of a maze, and report shared-edge
 * subterminal coordinate mismatches.
 *
 *   node tools/test-block-layout.js path/to/maze
 *   node tools/test-block-layout.js path/to/maze --termpos
 *   node tools/test-block-layout.js path/to/maze --termpos --subgrid
 *
 * Exit code: 0 if all shared edges match, 1 otherwise.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/* Load Lee modules globally so index_adapter.js's IIFE can pick them
 * up via global.lee_algorithm / global.insert_map. */
global.lee_algorithm = require('../lee/lee_algorithm.js').lee_algorithm;
global.insert_map = require('../lee/insert_map.js').insert_map;
global.__DEBUG_BLOCK_LAYOUT__ = process.env.DEBUG === '1' || process.argv.includes('--debug');
const { buildBlockSubgrid, buildSequentialBlockSubgrids } = require('../lee/index_adapter.js');

function parseMaze(text) {
  text = text.replace(/^maze:\s*/i, '').trim();
  const result = { normal: [], nx: [], ny: [], zero: [] };
  for (const sec of text.split(';')) {
    const t = sec.trim();
    const ci = t.indexOf(':');
    if (ci < 0) continue;
    const type = t.substring(0, ci).trim().toLowerCase();
    const body = t.substring(ci + 1).trim();
    if (body === '(none)' || !body) continue;
    if (!(type in result)) continue;
    for (const raw of body.split(',')) {
      const e = raw.trim();
      if (!e) continue;
      const isDirected = e.includes('->');
      const parts = isDirected ? e.split('->') : e.split('-');
      if (parts.length !== 2) continue;
      const term = (s) => {
        const m = s.trim().match(/^([CWESN])(\d+)$/);
        return m ? { dir: m[1], idx: parseInt(m[2], 10) } : null;
      };
      const src = term(parts[0]);
      const dst = term(parts[1]);
      if (!src || !dst) continue;
      result[type].push({ src, dst, directed: isDirected });
    }
  }
  return result;
}

function detectNterm(maze) {
  let n = 2;
  for (const bt of ['normal', 'nx', 'ny', 'zero']) {
    for (const p of maze[bt]) {
      if (p.src.dir !== 'C') n = Math.max(n, p.src.idx + 1);
      if (p.dst.dir !== 'C') n = Math.max(n, p.dst.idx + 1);
    }
  }
  return n;
}

function fmt(p) {
  return p ? `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})` : '-';
}

function main() {
  const args = process.argv.slice(2);
  let mazePath = null;
  const flags = new Set();
  for (const a of args) {
    if (a.startsWith('--')) flags.add(a);
    else if (!mazePath) mazePath = a;
  }
  if (!mazePath) {
    console.error('Usage: node tools/test-block-layout.js MAZE [--termpos] [--subgrid]');
    process.exit(2);
  }
  const text = fs.readFileSync(mazePath, 'utf8');
  const maze = parseMaze(text);
  const nterm = detectNterm(maze);
  const CELL = 100;

  /* Sequential per-block routing (normal -> nx -> ny -> zero) with
   * insert mirroring back to older blocks. */
  const grs = buildSequentialBlockSubgrids(maze, nterm, CELL);

  console.log('=== sizes (after Pass 2) ===');
  for (const bt of ['normal', 'nx', 'ny', 'zero']) {
    console.log(`  ${bt}: nC=${grs[bt].nC}, nR=${grs[bt].nR}`);
  }

  if (flags.has('--termpos')) {
    console.log('=== termPos per block ===');
    for (const bt of ['normal', 'nx', 'ny', 'zero']) {
      const tp = grs[bt].termPos;
      const lines = [];
      for (let i = 0; i < nterm; i++) {
        for (const d of ['W', 'E', 'N', 'S']) {
          const k = d + i;
          if (tp[k]) lines.push(`${k}=${fmt(tp[k])}`);
        }
      }
      console.log(`  ${bt}: ` + lines.join(', '));
    }
  }

  if (flags.has('--subgrid')) {
    console.log('=== subgrid (full) ===');
    for (const bt of ['normal', 'nx', 'ny', 'zero']) {
      console.log(`-- ${bt} --`);
      const g = grs[bt].subgrid;
      for (let r = 0; r < g.length; r++) {
        console.log('  ' + g[r].map(c => c === ' ' ? '.' : c).join(''));
      }
    }
  }

  console.log('=== shared-edge checks (subterm coords) ===');
  const edges = [
    { btA: 'zero',   btB: 'nx',     dirA: 'N', dirB: 'S', axis: 'x',
      label: '(0,0).N <-> (0,1).S' },
    { btA: 'ny',     btB: 'normal', dirA: 'N', dirB: 'S', axis: 'x',
      label: '(x>0,0).N <-> (x>0,1).S' },
    { btA: 'zero',   btB: 'ny',     dirA: 'E', dirB: 'W', axis: 'y',
      label: '(0,0).E <-> (1,0).W' },
    { btA: 'nx',     btB: 'normal', dirA: 'E', dirB: 'W', axis: 'y',
      label: '(0,y>0).E <-> (1,y>0).W' },
  ];
  let total = 0;
  for (const e of edges) {
    let mism = 0;
    for (let i = 0; i < nterm; i++) {
      const pA = grs[e.btA].termPos[e.dirA + i];
      const pB = grs[e.btB].termPos[e.dirB + i];
      if (!pA || !pB) continue;
      const vA = pA[e.axis], vB = pB[e.axis];
      if (Math.abs(vA - vB) > 0.01) {
        mism++;
        console.log(`  [MISMATCH ${e.label}] idx=${i}: ${e.btA}.${e.dirA}${i}.${e.axis}=${vA.toFixed(2)} vs ${e.btB}.${e.dirB}${i}.${e.axis}=${vB.toFixed(2)}`);
      }
    }
    console.log(`  ${e.label}: ${mism} mismatch(es)`);
    total += mism;
  }

  /* Boundary-cell line continuity: at every cell on the shared edge,
   * either both blocks' cell extends a line into the boundary, or
   * neither does.  A one-sided extension means the line visually dies
   * mid-edge — the user-visible "途切れ". */
  console.log('=== boundary-cell line continuity ===');
  const DIRS = {
    ' ': 0, '.': 0, '-': 0b0101, '|': 0b1010,
    '─': 0b0101, '│': 0b1010,
    '└': 0b1001, '┘': 0b1100,
    '┌': 0b0011, '┐': 0b0110,
    '┼': 0b1111, '├': 0b1011, '┤': 0b1110,
    '┬': 0b0111, '┴': 0b1101,
    'T': 0b1111,
  };
  const R = 0b0001, D = 0b0010, L = 0b0100, U = 0b1000;
  let cont = 0;
  for (const e of edges) {
    let bad = 0;
    const grA = grs[e.btA], grB = grs[e.btB];
    const sgA = grA.subgrid, sgB = grB.subgrid;
    const nRA = grA.nR, nCA = grA.nC;
    const nRB = grB.nR, nCB = grB.nC;
    if (nRA !== nRB || nCA !== nCB) {
      console.log(`  ${e.label}: subgrid size mismatch ${nCA}x${nRA} vs ${nCB}x${nRB}`);
      continue;
    }
    /* Gather subterminal coords on the shared edge from termPos so we
     * only check cells that actually represent a subterminal in either
     * block.  Non-subterm border cells may carry incidental line bits
     * from Lee's interior routing — those are not user-visible gaps. */
    /* Only check cells where the SAME terminal idx has both an A-side
     * and a B-side termPos and at least one of the blocks has at
     * least one port using that subterminal — otherwise it is a
     * non-subterm border cell and incidental line bits are not gaps. */
    const subtermCols = new Set();
    const subtermRows = new Set();
    const usesA = new Set(), usesB = new Set();
    for (const port of (maze[e.btA] || [])) {
      if (port.src.dir === e.dirA) usesA.add(port.src.idx);
      if (port.dst.dir === e.dirA) usesA.add(port.dst.idx);
    }
    for (const port of (maze[e.btB] || [])) {
      if (port.src.dir === e.dirB) usesB.add(port.src.idx);
      if (port.dst.dir === e.dirB) usesB.add(port.dst.idx);
    }
    if (e.dirA === 'N') {
      const cellW = CELL / nCA;
      for (let i = 0; i < nterm; i++) {
        if (!usesA.has(i) && !usesB.has(i)) continue;
        const pA = grA.termPos[e.dirA + i];
        const pB = grB.termPos[e.dirB + i];
        if (pA && pB) subtermCols.add(Math.round(pA.x / cellW - 0.5));
      }
    } else {
      const cellH = CELL / nRA;
      for (let i = 0; i < nterm; i++) {
        if (!usesA.has(i) && !usesB.has(i)) continue;
        const pA = grA.termPos[e.dirA + i];
        const pB = grB.termPos[e.dirB + i];
        if (pA && pB) subtermRows.add(Math.round(pA.y / cellH - 0.5));
      }
    }
    if (e.dirA === 'N') {
      const rowA = sgA[0];
      const rowB = sgB[nRB - 1];
      for (const c of subtermCols) {
        const aReach = ((DIRS[rowA[c]] || 0) & U) !== 0;
        const bReach = ((DIRS[rowB[c]] || 0) & D) !== 0;
        if (aReach !== bReach) {
          bad++;
          if (bad <= 6) console.log(`  [GAP ${e.label}] col=${c}: ${e.btA}=${aReach ? 'line' : 'gap'} ${e.btB}=${bReach ? 'line' : 'gap'}  (${rowA[c]} / ${rowB[c]})`);
        }
      }
    } else {
      const colAIdx = nCA - 1;
      for (const r of subtermRows) {
        const aReach = ((DIRS[sgA[r][colAIdx]] || 0) & R) !== 0;
        const bReach = ((DIRS[sgB[r][0]] || 0) & L) !== 0;
        if (aReach !== bReach) {
          bad++;
          if (bad <= 6) console.log(`  [GAP ${e.label}] row=${r}: ${e.btA}=${aReach ? 'line' : 'gap'} ${e.btB}=${bReach ? 'line' : 'gap'}  (${sgA[r][colAIdx]} / ${sgB[r][0]})`);
        }
      }
    }
    console.log(`  ${e.label}: ${bad} gap(s)`);
    cont += bad;
  }
  /* Per-block port reachability: for every port in maze[bt], walk
   * the corresponding block's subgrid and confirm BFS reaches dst
   * from src.  This catches the failure mode where the line for a
   * port exists in pieces but is not continuously connected. */
  console.log('=== per-block port reachability ===');
  let pbFail = 0;
  for (const bt of ['normal', 'nx', 'ny', 'zero']) {
    const ports = (maze[bt] || []).filter(
      p => p.src.dir !== 'C' && p.dst.dir !== 'C'
    );
    if (!ports.length) {
      console.log(`  ${bt}: 0 ports (skip)`);
      continue;
    }
    const fails = checkReachability(ports, grs[bt]);
    if (fails.length) {
      pbFail += fails.length;
      console.log(`  ${bt}: ${fails.length} unreachable port(s)`);
      for (const f of fails.slice(0, 5)) console.log(`    ${f}`);
    } else {
      console.log(`  ${bt}: ${ports.length} ports all reachable`);
    }
  }
  console.log(`=== total mismatches: ${total}, total gaps: ${cont}, total unreachable: ${pbFail} ===`);
  process.exit((total === 0 && cont === 0 && pbFail === 0) ? 0 : 1);
}

/* Re-implementation of test-port-reachability's subgrid BFS. */
function checkReachability(ports, result) {
  const DIRS_TBL = {
    ' ': 0, '.': 0,
    '─': 0b0101, '│': 0b1010,
    '└': 0b1001, '┘': 0b1100, '┌': 0b0011, '┐': 0b0110,
    '┼': 0b1111, '├': 0b1011, '┤': 0b1110, '┬': 0b0111, '┴': 0b1101,
    'T': 0b1111,
    '-': 0b0101, '|': 0b1010,
  };
  const R = 0b0001, D = 0b0010, L = 0b0100, U = 0b1000;
  const { subgrid, nR, nC } = result;
  const fails = [];
  function findTerm(dir) {
    const cells = [];
    if (dir === 'W') {
      for (let r = 0; r < nR; r++) if ((DIRS_TBL[subgrid[r][0]] || 0) & R) cells.push({ r, c: 0 });
    } else if (dir === 'E') {
      for (let r = 0; r < nR; r++) if ((DIRS_TBL[subgrid[r][nC-1]] || 0) & L) cells.push({ r, c: nC - 1 });
    } else if (dir === 'N') {
      for (let c = 0; c < nC; c++) if ((DIRS_TBL[subgrid[0][c]] || 0) & D) cells.push({ r: 0, c });
    } else {
      for (let c = 0; c < nC; c++) if ((DIRS_TBL[subgrid[nR-1][c]] || 0) & U) cells.push({ r: nR - 1, c });
    }
    return cells;
  }
  function walk(startR, startC) {
    const visited = new Set();
    const queue = [{ r: startR, c: startC }];
    visited.add(startR + ',' + startC);
    while (queue.length) {
      const { r, c } = queue.shift();
      const d = DIRS_TBL[subgrid[r][c]] || 0;
      const neigh = [
        { dr: 0, dc: 1, ob: R, ib: L },
        { dr: 0, dc:-1, ob: L, ib: R },
        { dr:-1, dc: 0, ob: U, ib: D },
        { dr: 1, dc: 0, ob: D, ib: U },
      ];
      for (const n of neigh) {
        if (!(d & n.ob)) continue;
        const nr = r + n.dr, nc = c + n.dc;
        if (nr < 0 || nr >= nR || nc < 0 || nc >= nC) continue;
        if (!((DIRS_TBL[subgrid[nr][nc]] || 0) & n.ib)) continue;
        const k = nr + ',' + nc;
        if (visited.has(k)) continue;
        visited.add(k);
        queue.push({ r: nr, c: nc });
      }
    }
    return visited;
  }
  for (let pi = 0; pi < ports.length; pi++) {
    const p = ports[pi];
    const sCells = findTerm(p.src.dir);
    const dCells = findTerm(p.dst.dir);
    if (!sCells.length || !dCells.length) continue;
    let reached = false;
    for (const s of sCells) {
      const v = walk(s.r, s.c);
      for (const d of dCells) if (v.has(d.r + ',' + d.c)) { reached = true; break; }
      if (reached) break;
    }
    if (!reached) {
      fails.push(`port ${pi} (${p.src.dir}${p.src.idx}->${p.dst.dir}${p.dst.idx}): no subgrid path`);
    }
  }
  return fails;
}

main();
