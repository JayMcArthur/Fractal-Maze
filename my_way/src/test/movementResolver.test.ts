import { describe, expect, it } from 'vitest'
import { resolveMove } from '../core/solver/common/movementResolver'
import type { SquareRecursiveDefinition } from '../core/model/squareRecursive'

const def: SquareRecursiveDefinition = {
  type: 'squareRecursive',
  tileSize: 32,
  colors: { outside: '#000', background: '#000', path: '#fff', line: '#f00' },
  grid: { rows: 1, cols: 1, cells: [0] },
  blocks: [
    { name: 'A', row: 0, col: 0, width: 1, height: 1, color: '#111' },
    { name: 'B', row: 0, col: 0, width: 1, height: 1, color: '#222' },
    { name: 'C', row: 0, col: 0, width: 1, height: 1, color: '#333' },
  ],
  exits: [{ name: 'north', direction: 8, row: 0, col: 0 }],
  links: [
    { row: 4, col: 4, blockPath: ['A', 'B'], exitName: 'north' },
    { row: 6, col: 6, blockPath: ['C', 'B'], exitName: 'north' },
  ],
  teleporters: [],
  player: { row: 0, col: 0, color: '#fff' },
  trophies: [],
}

describe('nested block exits', () => {
  it('uses the link whose complete block path matches the current stack suffix', () => {
    const result = resolveMove(def, { blockStack: ['0', 'C', 'B'], row: 0, col: 0 }, 8, 0)
    expect(result?.newPos).toEqual({ blockStack: ['0'], row: 6, col: 6 })
    expect(result?.action.type).toBe('exitBlock')
  })

  it('does not exit when the current stack has no exact path match', () => {
    const result = resolveMove(def, { blockStack: ['0', 'A', 'B', 'B'], row: 0, col: 0 }, 8, 0)
    expect(result).toBeNull()
  })
})
