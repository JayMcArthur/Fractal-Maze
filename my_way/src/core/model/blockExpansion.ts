import type { BlockRecursiveDefinition } from './blockRecursive'

/** Koteitan substitutes the unit into black cells; white cells stay open. */
export function blockWall(def: BlockRecursiveDefinition, col: number, row: number, depth: number): boolean {
  let scale = def.unit ** (depth - 1)
  for (let level = 0; level < depth; level++) {
    if (def.pattern[Math.floor(row / scale) % def.unit * def.unit + Math.floor(col / scale) % def.unit] === 0) return false
    scale /= def.unit
  }
  return true
}
