import type { BlockRecursiveDefinition } from '../../model/blockRecursive'
import { blockWall } from '../../model/blockExpansion'
import { blockAxisFraction, blockAxisIndex, radixDigits, radixIndex, type BlockAxis, type RecursiveBlockPosition } from '../../blockMaze/recursivePosition'

export function blockWindow(def: BlockRecursiveDefinition, position: RecursiveBlockPosition, detail: number) {
  const width = BigInt(def.unit) ** BigInt(detail), span = Number(width < 64n ? width : 64n)
  const origin = (axis: BlockAxis) => {
    const index = blockAxisIndex(axis, def.unit, detail)
    const proposed = index / 32n * 32n - 16n
    return proposed < 0n ? 0n : proposed > width - BigInt(span) ? width - BigInt(span) : proposed
  }
  return { x: origin(position.x), y: origin(position.y), span }
}

function offset(axis: BlockAxis, unit: number, detail: number, origin: bigint, span: number) {
  const index = blockAxisIndex(axis, unit, detail), delta = index - origin
  if (delta < -1n || delta > BigInt(span + 1)) return null
  if (detail >= axis.digits.length) {
    const doubled = (2n * radixIndex(axis.digits, unit) + (axis.half ? 1n : 0n)) * BigInt(unit) ** BigInt(detail - axis.digits.length)
    return Number(doubled - origin * 2n) / 2
  }
  return Number(delta) + blockAxisFraction(axis, unit, detail)
}

export function paintBlockWindow(canvas: HTMLCanvasElement, def: BlockRecursiveDefinition,
  position: RecursiveBlockPosition, trail: RecursiveBlockPosition[], detail: number) {
  const view = blockWindow(def, position, detail), size = 768, scale = size / view.span
  if (canvas.width !== size) canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const columns = Array.from({ length: view.span }, (_, col) => radixDigits(view.x + BigInt(col), def.unit, detail))
  const rows = Array.from({ length: view.span }, (_, row) => radixDigits(view.y + BigInt(row), def.unit, detail))
  for (let row = 0; row < view.span; row++) for (let col = 0; col < view.span; col++) {
    const open = columns[col].some((x, level) => !def.pattern[rows[row][level] * def.unit + x])
    ctx.fillStyle = open ? '#ffffff' : '#181818'
    ctx.fillRect(col * scale, row * scale, scale, scale)
    if (!open && scale >= def.unit * 4) {
      const inner = scale / def.unit
      for (let cell = 0; cell < def.pattern.length; cell++) if (!def.pattern[cell]) {
        ctx.fillStyle = '#858f87'
        ctx.fillRect((col + cell % def.unit / def.unit) * scale, (row + Math.floor(cell / def.unit) / def.unit) * scale, inner, inner)
      }
    }
  }
  if (def.goal) paintFinishRegion(ctx, def.goal, def.unit, detail, view, scale)
  const point = (state: RecursiveBlockPosition) => {
    const x = offset(state.x, def.unit, detail, view.x, view.span), y = offset(state.y, def.unit, detail, view.y, view.span)
    return x === null || y === null ? null : [x * scale, y * scale]
  }
  ctx.strokeStyle = '#1671cb'; ctx.lineWidth = scale * .25; ctx.beginPath()
  let joined = false
  for (const state of trail) {
    const p = point(state)
    if (!p) { joined = false; continue }
    if (joined) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1])
    joined = true
  }
  ctx.stroke()
  for (const [state, color] of [
    [def.start ? { x: { digits: [def.start[0]], half: true }, y: { digits: [def.start[1]], half: true } } : null, '#007fc5'],
    [def.goal ? { x: { digits: [def.goal[0]], half: true }, y: { digits: [def.goal[1]], half: true } } : null, '#d9472e'],
    [position, '#f0b429'],
  ] as const) {
    const p = state && point(state)
    if (!p) continue
    ctx.beginPath(); ctx.arc(p[0], p[1], Math.min(6, scale * .28), 0, Math.PI * 2)
    ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = Math.min(1.5, scale * .08); ctx.stroke()
  }
  return view
}

export function paintBlockOverview(canvas: HTMLCanvasElement, def: BlockRecursiveDefinition,
  position: RecursiveBlockPosition, context: number[] = []) {
  const ctx = canvas.getContext('2d')!, size = 192
  canvas.width = canvas.height = size
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size)
  const detail = Math.ceil(Math.log(size) / Math.log(def.unit)), width = def.unit ** detail
  const bitmap = ctx.createImageData(size, size)
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    const wall = blockWall(def, Math.floor((col + .5) * width / size), Math.floor((row + .5) * width / size), detail)
    const value = wall ? 24 : 255
    bitmap.data.set([value, value, value, 255], (row * size + col) * 4)
  }
  ctx.putImageData(bitmap, 0, 0)
  const parent = Math.max(0, context.length - 1)
  const x = blockAxisFraction(position.x, def.unit, parent), y = blockAxisFraction(position.y, def.unit, parent)
  const copy = context.at(-1)
  const scale = copy === undefined ? 1 : 1 / def.unit
  const cx = copy === undefined ? 0 : copy % def.unit * scale
  const cy = copy === undefined ? 0 : Math.floor(copy / def.unit) * scale
  ctx.strokeStyle = '#007fc5'; ctx.lineWidth = 2
  ctx.strokeRect(cx * size, cy * size, Math.max(2, scale * size), Math.max(2, scale * size))
  ctx.fillStyle = '#f0b429'; ctx.beginPath(); ctx.arc(x * size, y * size, 2, 0, Math.PI * 2); ctx.fill()
}

function paintFinishRegion(ctx: CanvasRenderingContext2D, goal: [number, number], unit: number, detail: number,
  view: ReturnType<typeof blockWindow>, scale: number) {
    const factor = BigInt(unit) ** BigInt(detail - 1)
    const gx = BigInt(goal[0]) * factor - view.x, gy = BigInt(goal[1]) * factor - view.y
    if (gx < BigInt(view.span) && gy < BigInt(view.span) && gx + factor > 0n && gy + factor > 0n) {
      const left = Number(gx < 0n ? 0n : gx) * scale, top = Number(gy < 0n ? 0n : gy) * scale
      const right = Number(gx + factor > BigInt(view.span) ? BigInt(view.span) : gx + factor) * scale
      const bottom = Number(gy + factor > BigInt(view.span) ? BigInt(view.span) : gy + factor) * scale
      ctx.fillStyle = '#fff2e7'; ctx.fillRect(left, top, right - left, bottom - top)
      ctx.strokeStyle = '#d9472e'; ctx.lineWidth = 2; ctx.strokeRect(left, top, right - left, bottom - top)
      ctx.fillStyle = '#9e4511'; ctx.font = '40px sans-serif'; ctx.fillText('Finish', left + 6, top + 44)
    }
}
