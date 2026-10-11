import { describe, expect, it } from 'vitest'
import { importKoteitan } from '../core/io/adapters/koteitanAdapter'
import { amurielagiImportAdapter } from '../core/io/adapters/amurielagiAdapter'
import { validateMaze } from '../core/validate/validateMaze'

describe('representation-family validation', () => {
  it('accepts a valid block-recursive document', () => {
    const doc = importKoteitan({ map: [[0, 1], [0, 0]], start: [0, 0], goal: [1, 1] })
    expect(validateMaze(doc)).toEqual({ valid: true, issues: [] })
  })

  it('rejects malformed block patterns', () => {
    const doc = importKoteitan({ map: [[0, 2], [0, 0]], start: [0, 0], goal: [3, 3] })
    const result = validateMaze(doc)
    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['INVALID_BLOCK_CELL', 'BLOCK_POINT_BOUNDS'])
    )
  })

  it('validates the full numbered geometric gate reference', () => {
    const raw = JSON.stringify([{ uid: 'g', token: 'FRACTAL-MAZE.v2', name: 'Geometric', size: 1,
      startingPoint: { id: 's', x: 10, y: 10 }, finish: null, subMazes: [],
      paths: [{ color: '#000', gates: ['s:1', '_:2'], points: [] }],
    }])
    expect(validateMaze(amurielagiImportAdapter.import(raw)).valid).toBe(true)
    const bad = raw.replace('_:2', '_:9')
    expect(validateMaze(amurielagiImportAdapter.import(bad)).valid).toBe(false)
  })
})
