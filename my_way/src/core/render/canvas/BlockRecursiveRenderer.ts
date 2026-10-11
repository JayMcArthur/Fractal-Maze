import type { RecursiveMazeDocument } from '../../model/RecursiveMazeDocument'
import type { BlockRecursiveDefinition } from '../../model/blockRecursive'

export class BlockRecursiveRenderer {
  render(doc: RecursiveMazeDocument, canvas: HTMLCanvasElement, maxDepth: number): void {
    const def = doc.definition as BlockRecursiveDefinition
    const size = 768
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#151815'
    const draw = (x: number, y: number, width: number, level: number) => {
      const cell = width / def.unit
      for (let row = 0; row < def.unit; row++) for (let col = 0; col < def.unit; col++) {
        if (!def.pattern[row * def.unit + col]) continue
        const cx = x + col * cell, cy = y + row * cell
        if (level < maxDepth && cell >= 1) draw(cx, cy, cell, level + 1)
        else ctx.fillRect(cx, cy, cell, cell)
      }
    }
    draw(0, 0, size, 1)
    const cell = size / def.unit
    for (const [point, color] of [[def.start, '#007fc5'], [def.goal, '#d9472e']] as const) {
      if (!point) continue
      ctx.beginPath()
      ctx.arc((point[0] + .5) * cell, (point[1] + .5) * cell, Math.min(6, cell * .12), 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    }
  }
}
