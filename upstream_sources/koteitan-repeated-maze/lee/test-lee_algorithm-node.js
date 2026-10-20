// Quick node smoke runner for lee_algorithm — mirrors lee/lee_algorithm.html logic.
// Generates random valid port configurations per plan.md rules, runs lee_algorithm,
// and verifies (1) check_equivalence(Tin, res.T) === true,
// (2) every port is reachable via subports on the final map.
//
// Usage:
//   node lee/test-lee_algorithm-node.js              # random seed (printed at top)
//   node lee/test-lee_algorithm-node.js --seed 12345 # reproducible run with mulberry32(12345)
//
// Port generation rejects pairs with |Δx|==1 or |Δy|==1 — those configs are
// out of scope for the algorithm (noted in plan.md discussion with user).
// lee_algorithm.js looks up `insert_map` on globalThis; load it first.
const { mulberry32 } = require('./prng.js');
const { generateTinP } = require('./lee_algorithm_testgen.js');
const { insert_map: _origInsertMap } = require('./insert_map.js');
// Guard: cap insert_map calls per lee_algorithm invocation so infinite loops
// (e.g. when sx==ex and the BFS goal is blocked by another terminal) surface
// as throws instead of hanging the process.
let _insertCount = 0;
const INSERT_CAP = 200;
globalThis.insert_map = function () {
  _insertCount++;
  if (_insertCount > INSERT_CAP) {
    throw new Error('insert_map call limit ' + INSERT_CAP + ' exceeded — suspected infinite loop');
  }
  return _origInsertMap.apply(null, arguments);
};
const { lee_algorithm } = require('./lee_algorithm.js');
const { check_equivalence_detailed } = require('./check_equivalence.js');

const CH_CROSS = '\u253C';
const CH_DR    = '\u250C';
const CH_DL    = '\u2510';
const CH_UR    = '\u2514';
const CH_UL    = '\u2518';
const CHAR_SIDES = {
  ' ': '', '-': 'LR', '|': 'UD', [CH_CROSS]: 'LRUD',
  [CH_DR]: 'RD', [CH_DL]: 'LD', [CH_UR]: 'RU', [CH_UL]: 'LU',
};
function sidesOf(c, T, x, y) {
  if (c === 'T') {
    const t = T.find(t0 => t0.x === x && t0.y === y);
    if (!t) return '';
    return (t.dx === -1 ? 'L' : t.dx === 1 ? 'R' : t.dy === -1 ? 'U' : t.dy === 1 ? 'D' : '');
  }
  return CHAR_SIDES[c] || '';
}
function reachablePort(m, T, sIdx, eIdx) {
  const s = T[sIdx], e = T[eIdx];
  const W = m.length, H = m[0].length;
  const seen = new Set();
  const key = (x, y) => x + ',' + y;
  const queue = [[s.x, s.y]];
  seen.add(key(s.x, s.y));
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === e.x && y === e.y) return true;
    const sides = sidesOf(m[x][y], T, x, y);
    const tries = [
      { s: 'L', nx: x-1, ny: y, f: 'R' },
      { s: 'R', nx: x+1, ny: y, f: 'L' },
      { s: 'U', nx: x, ny: y-1, f: 'D' },
      { s: 'D', nx: x, ny: y+1, f: 'U' },
    ];
    for (const n of tries) {
      if (sides.indexOf(n.s) < 0) continue;
      if (n.nx < 0 || n.nx >= W || n.ny < 0 || n.ny >= H) continue;
      const k = key(n.nx, n.ny);
      if (seen.has(k)) continue;
      const ns = sidesOf(m[n.nx][n.ny], T, n.nx, n.ny);
      if (ns.indexOf(n.f) < 0) continue;
      seen.add(k);
      queue.push([n.nx, n.ny]);
    }
  }
  return false;
}

// Port-config generator is the shared module — see lee/lee_algorithm_testgen.js.
// HTML harness consumes the same module so seed 42 produces identical Tin/P.

function deepCopyT(T) { return T.map(t => ({ x: t.x, y: t.y, dx: t.dx, dy: t.dy })); }

// --- CLI: optional --seed N ---
let cliSeed = null;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--seed' && i + 1 < argv.length) {
    cliSeed = parseInt(argv[i + 1], 10) | 0;
    i++;
  }
}
const seed = cliSeed !== null ? cliSeed : ((Math.random() * 0x100000000) >>> 0);
const rng = mulberry32(seed);
console.log(`seed: ${seed}${cliSeed !== null ? ' (from --seed)' : ' (random)'}`);

const W = 10, H = 10, NPORTS = 10, NITERS = 10;
let pass = 0, skip = 0, unsolved = 0, eqFail = 0, reachFail = 0, err = 0;
const fails = [];
for (let i = 0; i < NITERS; i++) {
  const cfg = generateTinP(W, H, NPORTS, rng);
  if (!cfg) { skip++; continue; }
  const Tin = cfg.Tin, P = cfg.P;
  const TinCopy = deepCopyT(Tin);
  let res;
  _insertCount = 0;
  try { res = lee_algorithm(TinCopy, P); }
  catch (e) { err++; fails.push({ i, Tin, P, reason: 'throw: ' + e.message }); continue; }
  const eq = check_equivalence_detailed(Tin, res.T);
  let reachAll = true;
  const reaches = [];
  for (const p of P) {
    const r = reachablePort(res.m, res.T, p.s, p.e);
    reaches.push(r);
    if (!r) reachAll = false;
  }
  const uns = !!res.error;
  const ok = !uns && eq.ok && reachAll;
  if (uns) unsolved++;
  if (!eq.ok) eqFail++;
  if (!reachAll) reachFail++;
  if (ok) pass++;
  else fails.push({ i, unsolved: uns, eq: eq.ok ? 'ok' : eq.reason, reach: reaches,
    Tin, P, finalT: res.T });
}
console.log(`lee_algorithm smoke (W=${W}, H=${H}, ports/iter=${NPORTS}, iters=${NITERS}):`);
console.log(`  PASS ${pass}/${NITERS - skip}${skip ? ` (skipped ${skip})` : ''}`);
console.log(`  unsolved=${unsolved}, eq-fail=${eqFail}, reach-fail=${reachFail}, err=${err}`);
if (fails.length) {
  console.log('\nFailures (up to 5 shown):');
  for (const f of fails.slice(0, 5)) console.log(JSON.stringify(f));
}
process.exit(fails.length === 0 ? 0 : 1);
