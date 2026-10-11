import type { RecursiveMazeDocument } from '../../model/RecursiveMazeDocument'
import type { SquareRecursiveDefinition } from '../../model/squareRecursive'
import type { PlayerPosition } from '../../model/playerState'
import { directionDelta } from '../../solver/common/movementResolver'
import { fullView, sameStack } from './squareCamera'
import type { ViewRect } from './squareCamera'

export interface RendererOptions {
  maxDepth: number
  showBlockLabels: boolean
  showBreadcrumbs: boolean
  trail?: PlayerPosition[]
  playerPos?: PlayerPosition
  colorScheme?: 'default' | 'highContrast'
  viewStack?: string[]
  viewRect?: ViewRect
  pixelRatio?: number
}

const CONTRAST = ['#ffff00', '#00ffff', '#ff00ff', '#ff8000', '#00ff80']

export class CanvasRenderer {
  private def: SquareRecursiveDefinition

  constructor(doc: RecursiveMazeDocument) {
    if (doc.representationType !== 'squareRecursive') throw new Error('Expected a square-recursive maze')
    this.def = doc.definition as SquareRecursiveDefinition
  }

  render(canvas: HTMLCanvasElement, opts: RendererOptions): void {
    const full = fullView(this.def)
    const ratio = opts.pixelRatio ?? 1
    canvas.width = Math.round(full.width * ratio)
    canvas.height = Math.round(full.height * ratio)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const view = opts.viewRect ?? full
    ctx.scale(canvas.width / view.width, canvas.height / view.height)
    ctx.translate(-view.x, -view.y)
    this.drawLevel(ctx, opts.viewStack ?? opts.playerPos?.blockStack ?? ['0'], opts, 0)
  }

  private blockColor(name: string, contrast: boolean): string {
    const index = this.def.blocks.findIndex((block) => block.name === name)
    return contrast ? CONTRAST[index % CONTRAST.length] : this.def.blocks[index].color
  }

  private drawLevel(ctx: CanvasRenderingContext2D, stack: string[], opts: RendererOptions, depth: number): void {
    const def = this.def
    const ts = def.tileSize
    const full = fullView(def)
    const contrast = opts.colorScheme === 'highContrast'
    const path = contrast ? '#ffffff' : def.colors.path
    const bg = contrast ? '#000000' : def.colors.background
    ctx.fillStyle = stack.length > 1 ? this.blockColor(stack.at(-1)!, contrast) : contrast ? '#000000' : def.colors.outside
    ctx.fillRect(0, 0, full.width, full.height)
    ctx.save()
    ctx.translate(ts * 0.25, ts * 0.25)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, def.grid.cols * ts, def.grid.rows * ts)
    ctx.fillStyle = path
    this.drawCorridors(ctx, path)
    this.drawCopies(ctx, stack, opts, depth, contrast)
    this.drawGates(ctx, stack, path, bg)
    if (opts.showBreadcrumbs && opts.trail) this.drawTrail(ctx, stack, opts.trail, contrast ? '#ff5050' : def.colors.line)
    if (stack.length === 1) for (const trophy of def.trophies) this.drawTrophy(ctx, trophy.row, trophy.col, trophy.color)
    if (opts.playerPos && sameStack(stack, opts.playerPos.blockStack)) {
      this.circle(ctx, opts.playerPos.row, opts.playerPos.col, ts * .1, contrast ? '#ff5050' : def.player.color)
    }
    ctx.restore()
  }

  private drawCorridors(ctx: CanvasRenderingContext2D, path: string): void {
    const def = this.def
    const ts = def.tileSize
    for (let row = 0; row < def.grid.rows; row++) {
      for (let col = 0; col < def.grid.cols; col++) {
        const mask = def.grid.cells[row * def.grid.cols + col]
        const x = col * ts
        const y = row * ts
        if (mask & 8) ctx.fillRect(x + ts * .25, y, ts * .5, ts * .75)
        if (mask & 4) ctx.fillRect(x + ts * .25, y + ts * .25, ts * .75, ts * .5)
        if (mask & 2) ctx.fillRect(x + ts * .25, y + ts * .25, ts * .5, ts * .75)
        if (mask & 1) ctx.fillRect(x, y + ts * .25, ts * .75, ts * .5)
      }
    }
    this.circle(ctx, def.player.row, def.player.col, ts * .5, path)
    for (const trophy of def.trophies) this.circle(ctx, trophy.row, trophy.col, ts * .5, path)

  }

  private drawCopies(ctx: CanvasRenderingContext2D, stack: string[], opts: RendererOptions, depth: number, contrast: boolean): void {
    const def = this.def
    const ts = def.tileSize
    const full = fullView(def)
    for (const block of def.blocks) {
      ctx.save()
      ctx.translate(block.col * ts, block.row * ts)
      ctx.beginPath()
      ctx.rect(0, 0, block.width * ts, block.height * ts)
      ctx.clip()
      ctx.fillStyle = this.blockColor(block.name, contrast)
      ctx.fillRect(0, 0, block.width * ts, block.height * ts)
      ctx.scale(block.width * ts / full.width, block.height * ts / full.height)
      const transform = ctx.getTransform()
      if (depth < opts.maxDepth && ts * Math.min(Math.abs(transform.a), Math.abs(transform.d)) >= .7) {
        this.drawLevel(ctx, [...stack, block.name], opts, depth + 1)
      }
      ctx.restore()
      if (opts.showBlockLabels && depth === 0) {
        ctx.font = '600 ' + ts * .25 + 'px system-ui'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(block.name, (block.col + .15) * ts, (block.row + .35) * ts)
      }
    }

  }

  private drawGates(ctx: CanvasRenderingContext2D, stack: string[], path: string, bg: string): void {
    const def = this.def
    const ts = def.tileSize
    for (const link of def.links) {
      const exit = def.exits.find((item) => item.name === link.exitName)
      if (exit) this.gate(ctx, link.row, link.col, exit.direction, path, true)
    }
    for (const tel of def.teleporters) this.gate(ctx, tel.row, tel.col, tel.direction, path, false)
    for (const exit of def.exits) {
      const visible = stack.length === 1 ? !def.trophies.length : def.links.some((link) =>
        link.exitName === exit.name && link.blockPath.length < stack.length && sameStack(link.blockPath, stack.slice(-link.blockPath.length)),
      )
      if (visible) {
        const [dr, dc] = directionDelta(exit.direction)
        ctx.fillStyle = bg
        // Fill only the outer quarter tile, preserving other corridors on the exit cell.
        if (dc) ctx.fillRect((exit.col + (dc < 0 ? -.25 : 1)) * ts, exit.row * ts, ts * .25, ts)
        else ctx.fillRect(exit.col * ts, (exit.row + (dr < 0 ? -.25 : 1)) * ts, ts, ts * .25)
        this.gate(ctx, exit.row, exit.col, exit.direction, path, false)
      }
    }
  }

  /** Gates extend their corridor a quarter tile beyond the cell. */
  private gate(ctx: CanvasRenderingContext2D, row: number, col: number, direction: 1 | 2 | 4 | 8, color: string, inward: boolean): void {
    const ts = this.def.tileSize
    const [dr, dc] = directionDelta(direction)
    const sign = inward ? -1 : 1
    const dx = dc * sign
    const dy = dr * sign
    ctx.fillStyle = color
    if (dx) ctx.fillRect((col + (dx < 0 ? -.25 : .25)) * ts, (row + .25) * ts, ts, ts * .5)
    else ctx.fillRect((col + .25) * ts, (row + (dy < 0 ? -.25 : .25)) * ts, ts * .5, ts)
  }

  private circle(ctx: CanvasRenderingContext2D, row: number, col: number, radius: number, color: string): void {
    const ts = this.def.tileSize
    ctx.beginPath()
    ctx.arc((col + .5) * ts, (row + .5) * ts, radius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }

  private drawTrophy(ctx: CanvasRenderingContext2D, row: number, col: number, color: string): void {
    const ts = this.def.tileSize
    ctx.save()
    ctx.translate((col + .5) * ts, (row + .5) * ts)
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(.7, ts * .015)
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 8)
      ctx.strokeRect(-ts * .28, -ts * .28, ts * .56, ts * .56)
    }
    ctx.restore()
  }

  private drawTrail(ctx: CanvasRenderingContext2D, stack: string[], trail: PlayerPosition[], color: string): void {
    const ts = this.def.tileSize
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(1, ts * .025)
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let i = 1; i < trail.length; i++) {
      const from = trail[i - 1]
      const to = trail[i]
      if (sameStack(stack, from.blockStack) && sameStack(stack, to.blockStack)) {
        if (Math.abs(from.row - to.row) + Math.abs(from.col - to.col) !== 1) continue
        ctx.moveTo((from.col + .5) * ts, (from.row + .5) * ts)
        ctx.lineTo((to.col + .5) * ts, (to.row + .5) * ts)
      } else {
        const point = sameStack(stack, from.blockStack) ? from : sameStack(stack, to.blockStack) ? to : null
        if (!point) continue
        const inner = point.blockStack.length > Math.min(from.blockStack.length, to.blockStack.length)
        const gate = inner ? this.def.exits.find((exit) => exit.row === point.row && exit.col === point.col)
          : this.def.links.find((link) => link.row === point.row && link.col === point.col)
        if (!gate) continue
        const direction = 'direction' in gate ? gate.direction : this.def.exits.find((exit) => exit.name === gate.exitName)?.direction
        if (!direction) continue
        const [dr, dc] = directionDelta(direction)
        const sign = inner ? 1 : -1
        ctx.moveTo((point.col + .5) * ts, (point.row + .5) * ts)
        ctx.lineTo((point.col + .5 + dc * sign * .75) * ts, (point.row + .5 + dr * sign * .75) * ts)
      }
    }
    ctx.stroke()
  }
}
