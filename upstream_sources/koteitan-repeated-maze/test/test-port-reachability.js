#!/usr/bin/env node
/**
 * Port reachability test for the maze visualizer.
 * Test A: for each port, walk the subgrid from the src terminal to the dst
 *         terminal and verify BFS reaches it.
 * Test A1: termPos alignment — W[i].y == E[i].y, N[i].x == S[i].x,
 *          E[i].x == cellSize, S[i].y == cellSize.
 */

const fs = require('fs');
const path = require('path');

/* ---- Extract routeBlockPorts from index.html ---- */
const projectRoot = path.resolve(__dirname, '..');
const htmlPath = path.join(projectRoot, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
/* Collect every inline <script>…</script> body (no attributes) and
 * concatenate them — the page has a small head-level darkmode bootstrap
 * before the main script that defines routeBlockPorts. */
const scriptBodies = [];
const scriptRe = /<script>([\s\S]*?)<\/script>/g;
let scriptM;
while ((scriptM = scriptRe.exec(html)) !== null) scriptBodies.push(scriptM[1]);
if (!scriptBodies.length) { console.error('ERROR: no inline <script>'); process.exit(1); }
const jsCode = scriptBodies.join('\n');
const drawIdx = jsCode.indexOf('function draw()');

/* The inline script now calls buildBlockSubgrid (from lee/index_adapter.js).
 * Load the adapter and its lee/ dependencies into globals before eval. */
const leeRoot = path.join(projectRoot, 'lee');
global.buildBlockSubgrid = require(path.join(leeRoot, 'index_adapter.js')).buildBlockSubgrid;

eval(jsCode.substring(0, drawIdx));
if (typeof routeBlockPorts !== 'function') { console.error('ERROR: routeBlockPorts not found'); process.exit(1); }

const CELL = 240;

/* ---- Sub-port direction table ---- */
/* For each shape, which directions does it connect? */
const DIRS = {
  ' ': 0,
  '─': 0b0101,  /* L+R */
  '│': 0b1010,  /* U+D */
  '└': 0b1001,  /* U+R */
  '┘': 0b1100,  /* U+L */
  '┌': 0b0011,  /* D+R */
  '┐': 0b0110,  /* D+L */
  '┼': 0b1111,  /* U+D+L+R */
  '├': 0b1011,  /* U+D+R */
  '┤': 0b1110,  /* U+D+L */
  '┬': 0b0111,  /* D+L+R */
  '┴': 0b1101,  /* U+L+R */
};
const R=0b0001, D=0b0010, L=0b0100, U=0b1000;

/* ---- Test A: Terminal reachability via subgrid walk ---- */
function checkReachability(ports, result) {
  const { subgrid, nR, nC } = result;
  if (!subgrid) return ['subgrid not returned by routeBlockPorts'];
  const fails = [];

  /* Find terminal border cells for each port */
  /* W terminals: col 0. E terminals: col nC-1. N terminals: row 0. S terminals: row nR-1. */
  /* We need to know which cell a port's src/dst terminal occupies.
   * Use the allRoutes grid data to find the first and last cell of each port. */

  /* Alternative: find border cells that have a sub-port connecting inward */
  /* For W border (col 0): cells with R bit set = has a line going right into the block */
  /* For E border (col nC-1): cells with L bit set */
  /* For N border (row 0): cells with D bit set */
  /* For S border (row nR-1): cells with U bit set */

  for (let pi = 0; pi < ports.length; pi++) {
    const p = ports[pi];
    const srcDir = p.src.dir, dstDir = p.dst.dir;

    /* Find src terminal cell on the border */
    const srcCells = findTerminalCells(subgrid, nR, nC, srcDir);
    const dstCells = findTerminalCells(subgrid, nR, nC, dstDir);

    if (srcCells.length === 0) {
      fails.push(`port ${pi} (${srcDir}${p.src.idx}-${dstDir}${p.dst.idx}): no ${srcDir} border cells found`);
      continue;
    }
    if (dstCells.length === 0) {
      fails.push(`port ${pi} (${srcDir}${p.src.idx}-${dstDir}${p.dst.idx}): no ${dstDir} border cells found`);
      continue;
    }

    /* Try to walk from ANY src border cell to ANY dst border cell */
    let reached = false;
    for (const src of srcCells) {
      const visited = walkSubgrid(subgrid, nR, nC, src.r, src.c);
      for (const dst of dstCells) {
        if (visited.has(dst.r + ',' + dst.c)) { reached = true; break; }
      }
      if (reached) break;
    }

    if (!reached) {
      fails.push(`port ${pi} (${srcDir}${p.src.idx}-${dstDir}${p.dst.idx}): cannot reach ${dstDir} from ${srcDir} via subgrid walk`);
    }
  }

  return fails;
}

/* Find all border cells for a given direction that have a sub-port connecting inward */
function findTerminalCells(subgrid, nR, nC, dir) {
  const cells = [];
  if (dir === 'W') {
    for (let r = 0; r < nR; r++) {
      const d = DIRS[subgrid[r][0]] || 0;
      if (d & R) cells.push({r, c: 0}); /* has line going right = connects into block */
    }
  } else if (dir === 'E') {
    for (let r = 0; r < nR; r++) {
      const d = DIRS[subgrid[r][nC-1]] || 0;
      if (d & L) cells.push({r, c: nC-1});
    }
  } else if (dir === 'N') {
    for (let c = 0; c < nC; c++) {
      const d = DIRS[subgrid[0][c]] || 0;
      if (d & D) cells.push({r: 0, c});
    }
  } else { /* S */
    for (let c = 0; c < nC; c++) {
      const d = DIRS[subgrid[nR-1][c]] || 0;
      if (d & U) cells.push({r: nR-1, c});
    }
  }
  return cells;
}

/* BFS/flood-fill through the subgrid following connected sub-ports.
 * Returns a Set of "r,c" strings for all reachable cells. */
function walkSubgrid(subgrid, nR, nC, startR, startC) {
  const visited = new Set();
  const queue = [{r: startR, c: startC}];
  visited.add(startR + ',' + startC);

  while (queue.length > 0) {
    const {r, c} = queue.shift();
    const d = DIRS[subgrid[r][c]] || 0;
    if (!d) continue;

    /* Check each direction: if this cell connects in that direction,
     * AND the neighbor cell connects back, they are linked. */
    const neighbors = [
      { dr: 0, dc: 1, outBit: R, inBit: L },  /* right */
      { dr: 0, dc:-1, outBit: L, inBit: R },  /* left */
      { dr:-1, dc: 0, outBit: U, inBit: D },  /* up */
      { dr: 1, dc: 0, outBit: D, inBit: U },  /* down */
    ];

    for (const n of neighbors) {
      if (!(d & n.outBit)) continue; /* this cell doesn't go that way */
      const nr = r + n.dr, nc = c + n.dc;
      if (nr < 0 || nr >= nR || nc < 0 || nc >= nC) continue;
      const nd = DIRS[subgrid[nr][nc]] || 0;
      if (!(nd & n.inBit)) continue; /* neighbor doesn't connect back */
      const key = nr + ',' + nc;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({r: nr, c: nc});
    }
  }

  return visited;
}

/* ---- TC-A1: E/S alignment ---- */
function checkAlignment(termPos, nterm, cellSize) {
  const fails = [];
  for (let i = 0; i < nterm; i++) {
    const w = termPos['W'+i], e = termPos['E'+i], n = termPos['N'+i], s = termPos['S'+i];
    if (!w||!e||!n||!s) { fails.push(`missing termPos for idx ${i}`); continue; }
    if (Math.abs(e.y - w.y) > 0.01) fails.push(`E${i}.y=${e.y.toFixed(1)} ≠ W${i}.y=${w.y.toFixed(1)}`);
    if (Math.abs(s.x - n.x) > 0.01) fails.push(`S${i}.x=${s.x.toFixed(1)} ≠ N${i}.x=${n.x.toFixed(1)}`);
    if (Math.abs(e.x - cellSize) > 0.01) fails.push(`E${i}.x=${e.x.toFixed(1)} ≠ cellSize`);
    if (Math.abs(s.y - cellSize) > 0.01) fails.push(`S${i}.y=${s.y.toFixed(1)} ≠ cellSize`);
  }
  return fails;
}

/* ---- Run one test case ---- */
function runCase(label, ports, nterm) {
  let result;
  try { result = routeBlockPorts(ports, nterm, CELL); }
  catch(e) { return { label, ok: false, fails: ['EXCEPTION: ' + e.message] }; }
  const fails = [];
  /* Test A: Terminal reachability via subgrid walk */
  const tA = checkReachability(ports, result);
  if (tA.length) fails.push(...tA.map(f => 'A: ' + f));
  /* E/S alignment */
  const a1 = checkAlignment(result.termPos, nterm, CELL);
  if (a1.length) fails.push(...a1.map(f => 'A1: ' + f));
  return { label, ok: fails.length === 0, fails };
}

/* ---- Parse maze string ports (normal block only) ---- */
function parseMazePorts(mazeStr) {
  const normalMatch = mazeStr.match(/normal:\s*([^;]+)/);
  if (!normalMatch) return { ports: [], nterm: 0 };
  const portStrs = normalMatch[1].trim().split(',').map(s => s.trim()).filter(Boolean);
  const ports = [];
  let maxIdx = 0;
  for (const ps of portStrs) {
    const m = ps.match(/([WENS])(\d+)-([WENS])(\d+)/);
    if (!m) continue;
    const src = { dir: m[1], idx: parseInt(m[2]) };
    const dst = { dir: m[3], idx: parseInt(m[4]) };
    ports.push({ src, dst });
    maxIdx = Math.max(maxIdx, src.idx, dst.idx);
  }
  return { ports, nterm: maxIdx + 1 };
}

/* ---- PRNG xoshiro128** ---- */
function mkPRNG(seed) {
  let s = [seed >>> 0, (seed * 1664525 + 1013904223) >>> 0,
           (seed * 214013 + 2531011) >>> 0, (seed * 6364136223846793005 + 1442695040888963407) >>> 0];
  return function() {
    const t = (s[1] << 9) >>> 0;
    s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3];
    s[2] ^= t; s[3] = ((s[3] << 11) | (s[3] >>> 21)) >>> 0;
    return s[0] >>> 0;
  };
}

/* ---- Test groups ---- */
const results = [];
let pass = 0, fail = 0;

function runAndRecord(label, ports, nterm) {
  const r = runCase(label, ports, nterm);
  results.push(r);
  if (r.ok) pass++;
  else { fail++; console.log(`FAIL [${label}]`); for (const f of r.fails) console.log(`  ${f}`); }
}

/* Fixed cases */
const fixed = [
  { label:'FIX-WN-1', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'N',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'N',idx:0}},{src:{dir:'W',idx:2},dst:{dir:'N',idx:0}}] },
  { label:'FIX-WN-2', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'N',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'N',idx:1}},{src:{dir:'W',idx:2},dst:{dir:'N',idx:2}}] },
  { label:'FIX-WN-3', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'N',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'N',idx:0}},{src:{dir:'W',idx:2},dst:{dir:'N',idx:1}}] },
  { label:'FIX-WS-1', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:2},dst:{dir:'S',idx:0}}] },
  { label:'FIX-WS-2', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'S',idx:1}},{src:{dir:'W',idx:2},dst:{dir:'S',idx:2}}] },
  { label:'FIX-WS-3', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:2},dst:{dir:'S',idx:1}}] },
  { label:'FIX-WE-1', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'E',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'E',idx:0}},{src:{dir:'W',idx:2},dst:{dir:'E',idx:0}}] },
  { label:'FIX-WE-2', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'E',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'E',idx:1}},{src:{dir:'W',idx:2},dst:{dir:'E',idx:2}}] },
  { label:'FIX-WE-3', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'E',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'E',idx:0}},{src:{dir:'W',idx:2},dst:{dir:'E',idx:1}}] },
  { label:'MIX-1', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'N',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:2},dst:{dir:'E',idx:0}}] },
  { label:'MIX-2', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'N',idx:0}},{src:{dir:'E',idx:0},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'E',idx:1}}] },
  { label:'MIX-3', nterm:3, ports:[{src:{dir:'W',idx:0},dst:{dir:'N',idx:0}},{src:{dir:'S',idx:0},dst:{dir:'W',idx:2}},{src:{dir:'W',idx:2},dst:{dir:'S',idx:1}},{src:{dir:'N',idx:1},dst:{dir:'W',idx:1}}] },
  { label:'MIX-4', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'E',idx:2}},{src:{dir:'W',idx:2},dst:{dir:'E',idx:3}},{src:{dir:'W',idx:3},dst:{dir:'S',idx:0}},{src:{dir:'N',idx:0},dst:{dir:'W',idx:0}}] },
  { label:'MIX-5', nterm:4, ports:[{src:{dir:'N',idx:0},dst:{dir:'S',idx:0}},{src:{dir:'N',idx:1},dst:{dir:'S',idx:1}},{src:{dir:'W',idx:0},dst:{dir:'E',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'E',idx:1}}] },
  { label:'MIX-6', nterm:2, ports:[{src:{dir:'W',idx:0},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:0},dst:{dir:'N',idx:0}}] },
  { label:'MIX-7', nterm:2, ports:[{src:{dir:'W',idx:0},dst:{dir:'E',idx:0}},{src:{dir:'W',idx:0},dst:{dir:'E',idx:1}}] },
];
for (const tc of fixed) runAndRecord(tc.label, tc.ports, tc.nterm);

/* User-provided maze */
const userMaze = 'normal: W0-E2, W2-E3, W3-S0, N0-W0, E4-W5, W5-N1, S1-W4, W6-E7, W7-E8, W8-S2, N2-W6, E9-W10, W10-N3, S3-W9, W11-E12, W12-E13, W13-S4, N4-W11, E14-W15, W15-N5, S5-W14, W16-S6, N6-W16, S7-W4, S8-W9, S9-W14, S10-W1; nx: E4-E6, E9-E11, E14-E16; ny: N0-N7, N2-N8, N4-N9, N6-N10';
const { ports: userPorts, nterm: userNterm } = parseMazePorts(userMaze);
runAndRecord('USER-MAZE', userPorts, userNterm);

/* Random cases */
const dirs = ['W','E','N','S'];
for (let seed = 42; seed < 1042; seed++) {
  const rng = mkPRNG(seed);
  const nterm = 2 + (rng() % 7);
  const maxPorts = Math.min(20, nterm * 4 * (nterm * 4 - 1) / 2);
  const k = 1 + (rng() % maxPorts);
  const ports = [];
  const seen = new Set();
  let attempts = 0;
  while (ports.length < k && attempts < k * 10) {
    attempts++;
    const sd = dirs[rng() % 4], si = rng() % nterm;
    const dd = dirs[rng() % 4], di = rng() % nterm;
    if (sd === dd && si === di) continue;
    const key = `${sd}${si}-${dd}${di}`;
    const key2 = `${dd}${di}-${sd}${si}`;
    if (seen.has(key) || seen.has(key2)) continue;
    seen.add(key);
    ports.push({ src: { dir: sd, idx: si }, dst: { dir: dd, idx: di } });
  }
  if (ports.length > 0) runAndRecord(`RND-${seed}`, ports, nterm);
}

/* Summary */
const total = pass + fail;
console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${total}  PASS: ${pass}  FAIL: ${fail}`);
console.log(fail === 0 ? 'ALL PASS' : `${fail} FAILURES`);
