// Quick node sanity runner for insert_map D1–D4 (324-case matrix).
// Mirrors the logic in lee/insert-map.html for smoke-testing in node.
const { insert_map } = require('./insert_map.js');

const CH_CROSS = '\u253C';
const CH_DR    = '\u250C';
const CH_DL    = '\u2510';
const CH_UR    = '\u2514';
const CH_UL    = '\u2518';
const SUBPORTS = [' ', '|', '-', CH_CROSS, CH_DR, CH_DL, CH_UR, CH_UL, 'T'];
const CHAR_SIDES = {
  ' ': '', '-': 'LR', '|': 'UD', [CH_CROSS]: 'LRUD',
  [CH_DR]: 'RD', [CH_DL]: 'LD', [CH_UR]: 'RU', [CH_UL]: 'LU',
};
function hasSide(c, side, T, pos) {
  if (c === 'T') {
    if (!T || !pos) return false;
    const t = T.find(t0 => t0.x === pos.x && t0.y === pos.y);
    if (!t) return false;
    if (side === 'L' && t.dx === -1) return true;
    if (side === 'R' && t.dx ===  1) return true;
    if (side === 'U' && t.dy === -1) return true;
    if (side === 'D' && t.dy ===  1) return true;
    return false;
  }
  return (CHAR_SIDES[c] || '').indexOf(side) >= 0;
}
function tOrientationTowardSeam(role, direction) {
  if (role === 'sp1') {
    if (direction === 'ABOVE') return { dx: 0, dy: -1 };
    if (direction === 'BELOW') return { dx: 0, dy:  1 };
    if (direction === 'LEFT')  return { dx: -1, dy: 0 };
    if (direction === 'RIGHT') return { dx:  1, dy: 0 };
  } else {
    if (direction === 'ABOVE') return { dx: 0, dy:  1 };
    if (direction === 'BELOW') return { dx: 0, dy: -1 };
    if (direction === 'LEFT')  return { dx:  1, dy: 0 };
    if (direction === 'RIGHT') return { dx: -1, dy: 0 };
  }
}
function emptyMap(W, H) {
  const m = new Array(W);
  for (let x = 0; x < W; x++) m[x] = new Array(H).fill(' ');
  return m;
}

let pass = 0, total = 0;
const failures = [];

for (const direction of ['ABOVE', 'BELOW', 'LEFT', 'RIGHT']) {
  for (const sp1 of SUBPORTS) {
    for (const sp2 of SUBPORTS) {
      total++;
      const m = emptyMap(5, 5);
      const sp1Pos = { x: 2, y: 2 };
      let sp2Pos, insertArgs, seamOrigPos, expectedBridge, insertDir, ssp1, ssp2;
      if (direction === 'ABOVE') {
        sp2Pos = {x:2,y:1}; insertArgs = [2,'row']; insertDir='row';
        seamOrigPos = {x:2,y:2}; ssp1='U'; ssp2='D'; expectedBridge='|';
      } else if (direction === 'BELOW') {
        sp2Pos = {x:2,y:3}; insertArgs = [3,'row']; insertDir='row';
        seamOrigPos = {x:2,y:3}; ssp1='D'; ssp2='U'; expectedBridge='|';
      } else if (direction === 'LEFT') {
        sp2Pos = {x:1,y:2}; insertArgs = [2,'col']; insertDir='col';
        seamOrigPos = {x:2,y:2}; ssp1='L'; ssp2='R'; expectedBridge='-';
      } else {
        sp2Pos = {x:3,y:2}; insertArgs = [3,'col']; insertDir='col';
        seamOrigPos = {x:3,y:2}; ssp1='R'; ssp2='L'; expectedBridge='-';
      }
      m[sp1Pos.x][sp1Pos.y] = sp1;
      m[sp2Pos.x][sp2Pos.y] = sp2;
      const T = [];
      if (sp1 === 'T') { const o = tOrientationTowardSeam('sp1', direction);
        T.push({x:sp1Pos.x,y:sp1Pos.y,dx:o.dx,dy:o.dy}); }
      if (sp2 === 'T') { const o = tOrientationTowardSeam('sp2', direction);
        T.push({x:sp2Pos.x,y:sp2Pos.y,dx:o.dx,dy:o.dy}); }

      // Compute expected BEFORE insert_map mutates T in place.
      const conn1 = hasSide(sp1, ssp1, T, sp1Pos);
      const conn2 = hasSide(sp2, ssp2, T, sp2Pos);
      const expected = (conn1 && conn2) ? expectedBridge : ' ';

      let newM;
      try {
        if (insertDir === 'col') newM = insert_map(m, insertArgs[0], 0, 'col', T);
        else newM = insert_map(m, 0, insertArgs[0], 'row', T);
      } catch (e) {
        failures.push({ direction, sp1, sp2, reason: 'threw: ' + e.message });
        continue;
      }
      let actual;
      if (insertDir === 'col') actual = newM[insertArgs[0]][seamOrigPos.y];
      else actual = newM[seamOrigPos.x][insertArgs[0]];

      if (actual === expected) pass++;
      else failures.push({ direction, sp1: JSON.stringify(sp1), sp2: JSON.stringify(sp2),
        expected: JSON.stringify(expected), actual: JSON.stringify(actual) });
    }
  }
}

console.log(`D1–D4: ${pass}/${total} PASS`);
if (failures.length) {
  console.log('\nFailures (up to 40 shown):');
  for (const f of failures.slice(0, 40)) console.log(JSON.stringify(f));
  if (failures.length > 40) console.log(`... and ${failures.length - 40} more`);
}
process.exit(pass === total ? 0 : 1);
