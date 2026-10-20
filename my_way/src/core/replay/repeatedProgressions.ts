/** Exact intersection of finite translated point sequences; no route expansion. */
export interface RepeatedProgression {
  x: number
  y: number
  dx: number
  dy: number
  count: number
}

function floor(a: bigint, b: bigint): bigint {
  const q = a / b,
    r = a % b
  return r && r > 0n !== b > 0n ? q - 1n : q
}
function bounds(start: bigint, step: bigint, count: bigint): [bigint, bigint] {
  const low = -start,
    high = count - 1n - start
  return step > 0n
    ? [-floor(-low, step), floor(high, step)]
    : [-floor(-high, step), floor(low, step)]
}
function bezout(a: bigint, b: bigint): [bigint, bigint, bigint] {
  let x = 1n,
    y = 0n,
    u = 0n,
    v = 1n
  while (b) {
    const q = a / b
    ;[a, b] = [b, a - q * b]
    ;[x, u] = [u, x - q * u]
    ;[y, v] = [v, y - q * v]
  }
  return [a, x, y]
}
function contains(sequence: RepeatedProgression, point: RepeatedProgression): boolean {
  const x = BigInt(point.x) - BigInt(sequence.x),
    y = BigInt(point.y) - BigInt(sequence.y)
  const dx = BigInt(sequence.dx),
    dy = BigInt(sequence.dy)
  if (!dx && !dy) return !x && !y
  const difference = dx ? x : y,
    stride = dx || dy
  if (difference % stride) return false
  const k = difference / stride
  return k >= 0n && k < BigInt(sequence.count) && k * dx === x && k * dy === y
}

function parallelIntersection(
  u: bigint,
  v: bigint,
  difference: bigint,
  countA: number,
  countB: number
): boolean {
  const [gcd, coefficientA, coefficientB] = bezout(u < 0n ? -u : u, v < 0n ? -v : v)
  if (difference % gcd) return false
  const factor = difference / gcd
  const initialA = coefficientA * (u < 0n ? -factor : factor)
  const initialB = coefficientB * (v > 0n ? -factor : factor)
  const [lowA, highA] = bounds(initialA, v / gcd, BigInt(countA))
  const [lowB, highB] = bounds(initialB, u / gcd, BigInt(countB))
  return (lowA > lowB ? lowA : lowB) <= (highA < highB ? highA : highB)
}

export function repeatedProgressionsIntersect(
  a: RepeatedProgression,
  b: RepeatedProgression
): boolean {
  if (!a.dx && !a.dy) return contains(b, a)
  if (!b.dx && !b.dy) return contains(a, b)
  const ax = BigInt(a.dx),
    ay = BigInt(a.dy),
    bx = BigInt(b.dx),
    by = BigInt(b.dy)
  const x = BigInt(b.x) - BigInt(a.x),
    y = BigInt(b.y) - BigInt(a.y)
  const determinant = ax * by - ay * bx
  if (determinant) {
    const numeratorA = x * by - y * bx,
      numeratorB = x * ay - y * ax
    if (numeratorA % determinant || numeratorB % determinant) return false
    const i = numeratorA / determinant,
      j = numeratorB / determinant
    return i >= 0n && i < BigInt(a.count) && j >= 0n && j < BigInt(b.count)
  }
  if (x * ay !== y * ax) return false
  return parallelIntersection(ax || ay, ax ? bx : by, ax ? x : y, a.count, b.count)
}
