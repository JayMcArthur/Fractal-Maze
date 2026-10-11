// Quick node sanity runner for check_equivalence — mirrors deterministic cases
// from the HTML harness. Not used by the user; tester-only smoke check.
const { check_equivalence, check_equivalence_detailed } = require('./check_equivalence.js');

function shift_terminals(T, k, dir) {
  for (const t of T) {
    if (dir === 'col' && t.x >= k) t.x += 1;
    if (dir === 'row' && t.y >= k) t.y += 1;
  }
}
function deepCopyT(T) { return T.map(t => ({ x: t.x, y: t.y, dx: t.dx, dy: t.dy })); }

const cases = [];
function addCase(name, Tin, T, expected) { cases.push({ name, Tin, T, expected }); }

// A
addCase('A1 empty', [], [], true);
addCase('A2 single-identical', [{x:0,y:0,dx:1,dy:0}], [{x:0,y:0,dx:1,dy:0}], true);
addCase('A4 translation',
  [{x:0,y:0,dx:1,dy:0},{x:2,y:1,dx:-1,dy:0}],
  [{x:5,y:3,dx:1,dy:0},{x:7,y:4,dx:-1,dy:0}], true);
addCase('A7 preserved-ties',
  [{x:1,y:0,dx:0,dy:1},{x:1,y:3,dx:0,dy:-1}],
  [{x:5,y:0,dx:0,dy:1},{x:5,y:7,dx:0,dy:-1}], true);

// AR (shift-based)
function ar(tin, ops) {
  const T = deepCopyT(tin);
  for (const op of ops) shift_terminals(T, op.k, op.dir);
  return T;
}
{
  const Tin = [{x:1,y:1,dx:1,dy:0},{x:3,y:2,dx:-1,dy:0}];
  addCase('AR1 col-shift-before', Tin, ar(Tin, [{k:0,dir:'col'}]), true);
  addCase('AR2 col-shift-between', Tin, ar(Tin, [{k:2,dir:'col'}]), true);
  addCase('AR3 col-shift-after-all', Tin, ar(Tin, [{k:5,dir:'col'}]), true);
}
{
  const Tin = [{x:1,y:2,dx:0,dy:1},{x:3,y:2,dx:0,dy:-1}];
  addCase('AR4 row-shift-at-tie', Tin, ar(Tin, [{k:2,dir:'row'}]), true);
}

// B
addCase('B1 swapped-x',
  [{x:0,y:0,dx:1,dy:0},{x:2,y:0,dx:-1,dy:0}],
  [{x:5,y:0,dx:1,dy:0},{x:3,y:0,dx:-1,dy:0}], false);
addCase('B3 equal-became-different-x',
  [{x:1,y:0,dx:0,dy:1},{x:1,y:2,dx:0,dy:-1}],
  [{x:1,y:0,dx:0,dy:1},{x:2,y:2,dx:0,dy:-1}], false);
addCase('B7 dx-flipped',
  [{x:0,y:0,dx:1,dy:0}], [{x:0,y:0,dx:-1,dy:0}], false);

// BR (shift then swap)
{
  const Tin = [{x:0,y:0,dx:1,dy:0},{x:2,y:1,dx:-1,dy:0},{x:4,y:2,dx:0,dy:1}];
  const T = deepCopyT(Tin);
  [T[0].x, T[2].x] = [T[2].x, T[0].x];
  addCase('BR1 swap-x-head-tail', Tin, T, false);
}

// C
addCase('C1 length-mismatch', [{x:0,y:0,dx:1,dy:0}], [], false);
addCase('C2 single-dx-changed',
  [{x:0,y:0,dx:1,dy:0}], [{x:0,y:0,dx:-1,dy:0}], false);

let pass = 0;
for (const c of cases) {
  const actual = check_equivalence(c.Tin, c.T);
  const ok = actual === c.expected;
  if (ok) pass++;
  const d = check_equivalence_detailed(c.Tin, c.T);
  const reason = d.ok ? '' : ` [${d.reason}${d.i != null ? ' i=' + d.i : ''}${d.j != null ? ' j=' + d.j : ''}]`;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}  expected=${c.expected} actual=${actual}${reason}`);
}
console.log(`\nResult: ${pass}/${cases.length} PASS`);
process.exit(pass === cases.length ? 0 : 1);
