import type { BlockRecursiveDefinition } from '../model/blockRecursive'
import type { DirectionBit } from '../model/squareRecursive'

/** Exact radix coordinates, with an optional half-cell offset at the final digit. */
export interface BlockAxis { digits: number[]; half: boolean }
export interface RecursiveBlockPosition { x: BlockAxis; y: BlockAxis }

export function radixIndex(digits: number[], unit: number): bigint {
  return digits.reduce((index, digit) => index * BigInt(unit) + BigInt(digit), 0n)
}
export function radixDigits(index: bigint, unit: number, depth: number): number[] {
  const digits = Array<number>(depth), base = BigInt(unit)
  for (let i = depth - 1; i >= 0; i--) { digits[i] = Number(index % base); index /= base }
  return digits
}
const numerator = (axis: BlockAxis, unit: number) => 2n * radixIndex(axis.digits, unit) + (axis.half ? 1n : 0n)

export function blockAxisIndex(axis: BlockAxis, unit: number, detail: number): bigint {
  const value = numerator(axis, unit), base = BigInt(unit)
  return detail >= axis.digits.length
    ? value * base ** BigInt(detail - axis.digits.length) / 2n
    : value / (2n * base ** BigInt(axis.digits.length - detail))
}
function coordinate(value: bigint, unit: number, detail: number): BlockAxis {
  const base = BigInt(unit)
  while (detail > 1 && value % base === 0n) { value /= base; detail-- }
  return { digits: radixDigits(value / 2n, unit, detail), half: value % 2n === 1n }
}
export function gridBlockPosition(unit: number, cell: number, depth: number): RecursiveBlockPosition {
  const width = unit ** depth
  return { x: coordinate(2n * BigInt(cell % width) + 1n, unit, depth),
    y: coordinate(2n * BigInt(Math.floor(cell / width)) + 1n, unit, depth) }
}
export function initialBlockPosition(def: BlockRecursiveDefinition, detail: number): RecursiveBlockPosition | null {
  if (!def.start || def.pattern[def.start[1] * def.unit + def.start[0]]) return null
  const scale = BigInt(def.unit) ** BigInt(detail - 1)
  const axis = (cell: number) => coordinate(2n * (BigInt(2 * cell + 1) * scale / 2n) + 1n, def.unit, detail)
  return { x: axis(def.start[0]), y: axis(def.start[1]) }
}

/** Black prefix cells are the copy stack; its first white cell is the current open region. */
export function recursiveBlockAddress(def: BlockRecursiveDefinition, position: RecursiveBlockPosition) {
  // After these digits, each rational axis has a constant radix tail. A black tail is a limit point.
  const detail = Math.max(position.x.digits.length, position.y.digits.length) + 2
  const x = radixDigits(blockAxisIndex(position.x, def.unit, detail), def.unit, detail)
  const y = radixDigits(blockAxisIndex(position.y, def.unit, detail), def.unit, detail)
  const address: number[] = []
  for (let i = 0; i < detail; i++) {
    const cell = y[i] * def.unit + x[i]
    if (!def.pattern[cell]) return { address, cell }
    address.push(cell)
  }
  return null
}
export const recursiveBlockKey = (position: RecursiveBlockPosition) => JSON.stringify([position.x, position.y])
export const recursiveBlockWon = (def: BlockRecursiveDefinition, position: RecursiveBlockPosition) =>
  !!def.goal && position.x.digits[0] === def.goal[0] && position.y.digits[0] === def.goal[1]

/** Translate exactly one visible cell; radix carrying retains the aligned boundary interval. */
export function moveRecursiveBlock(def: BlockRecursiveDefinition, position: RecursiveBlockPosition,
  direction: DirectionBit, detail: number): RecursiveBlockPosition | null {
  const located = recursiveBlockAddress(def, position)
  if (!located || detail <= located.address.length) return null
  const name = direction === 1 || direction === 4 ? 'x' : 'y', axis = position[name]
  const depth = Math.max(axis.digits.length, detail), base = BigInt(def.unit)
  const value = numerator(axis, def.unit) * base ** BigInt(depth - axis.digits.length) +
    (direction === 1 || direction === 8 ? -2n : 2n) * base ** BigInt(depth - detail)
  if (value < 0n || value >= 2n * base ** BigInt(depth)) return null
  const next = { ...position, [name]: coordinate(value, def.unit, depth) }
  const destination = recursiveBlockAddress(def, next)
  return destination && destination.address.length < detail ? next : null
}

/** Rendering alone approximates coordinates; movement and recordings retain every digit. */
export function blockAxisFraction(axis: BlockAxis, unit: number, copyDepth = 0): number {
  if (copyDepth >= axis.digits.length) {
    return Number(numerator(axis, unit) * BigInt(unit) ** BigInt(copyDepth - axis.digits.length) % 2n) / 2
  }
  const digits = axis.digits.slice(copyDepth)
  let value = 0, scale = 1
  for (const digit of digits.slice(0, 16)) { scale /= unit; value += digit * scale }
  return value + (digits.length <= 16 && axis.half ? scale / 2 : 0)
}
