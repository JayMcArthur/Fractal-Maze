import type { SquareRecursiveDefinition } from '../../model/squareRecursive'

export interface ViewRect { x: number; y: number; width: number; height: number }

export function fullView(def: SquareRecursiveDefinition): ViewRect {
  return { x: 0, y: 0, width: (def.grid.cols + 0.5) * def.tileSize, height: (def.grid.rows + 0.5) * def.tileSize }
}

export function sameStack(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((name, index) => name === b[index])
}

/** Locate a descendant's full frame in its ancestor's coordinate system. */
export function contextRect(def: SquareRecursiveDefinition, path: string[]): ViewRect {
  const full = fullView(def)
  let rect = full
  for (const name of path) {
    const block = def.blocks.find((item) => item.name === name)
    if (!block) throw new Error('No block named ' + name)
    const sx = rect.width / full.width
    const sy = rect.height / full.height
    rect = {
      x: rect.x + (block.col + 0.25) * def.tileSize * sx,
      y: rect.y + (block.row + 0.25) * def.tileSize * sy,
      width: block.width * def.tileSize * sx,
      height: block.height * def.tileSize * sy,
    }
  }
  return rect
}

export function cameraTransition(def: SquareRecursiveDefinition, from: string[], to: string[]) {
  const enters = from.length < to.length && from.every((name, index) => name === to[index])
  const exits = to.length < from.length && to.every((name, index) => name === from[index])
  if (!enters && !exits) return null
  const ancestor = enters ? from : to
  const path = (enters ? to : from).slice(ancestor.length)
  const child = contextRect(def, path)
  const full = fullView(def)
  return { stack: ancestor, from: enters ? full : child, to: enters ? child : full, levels: path.length }
}

export function interpolateView(from: ViewRect, to: ViewRect, t: number): ViewRect {
  const width = from.width * Math.pow(to.width / from.width, t)
  const height = from.height * Math.pow(to.height / from.height, t)
  const cx = from.x + from.width / 2 + (to.x + to.width / 2 - from.x - from.width / 2) * t
  const cy = from.y + from.height / 2 + (to.y + to.height / 2 - from.y - from.height / 2) * t
  return { x: cx - width / 2, y: cy - height / 2, width, height }
}
