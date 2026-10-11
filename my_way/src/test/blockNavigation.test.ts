import { expect, it } from 'vitest'
import { loadCatalogMaze } from '../app/library/catalog'
import type { BlockRecursiveDefinition } from '../core/model/blockRecursive'
import {
  blockNeighbors,
  expandBlock,
  searchBlock,
  validateBlockRoute,
} from '../core/blockMaze/grid'
import { buildNativeReplay } from '../core/replay/nativeReplay'
import { importReplay } from '../core/replay/importReplay'

const doc = loadCatalogMaze('koteitan-block')!,
  def = doc.definition as BlockRecursiveDefinition
it('finds the shortest depth-five source witness and distinguishes a closed finite expansion', () => {
  const grid = expandBlock(def, 4)
  expect(grid.cells.reduce((total, wall) => total + wall, 0)).toBe(10000)
  expect(searchBlock(grid).status).toBe('exhausted')
  const deeper = expandBlock(def, 5),
    result = searchBlock(deeper)
  expect(result.status).toBe('solved')
  expect(result.path).toHaveLength(1757)
  expect(result.path).toEqual(def.providedRoute!.states)
  expect(() => validateBlockRoute(def, 5, result.path, true)).not.toThrow()
})
it('trims human detours while preserving depth and immutable maze/route snapshots', () => {
  const { depth, states } = def.providedRoute!,
    path = [states[0], states[1], states[0], ...states.slice(1)]
  const replay = buildNativeReplay(
    doc,
    { type: 'blockRecursive', depth, states: path },
    'human',
    true
  )
  expect(replay.metrics).toMatchObject({ totalMoves: 1756, maxDepthReached: 5 })
  const restored = importReplay(JSON.stringify(replay))
  expect(restored.nativeRoute).toEqual({ type: 'blockRecursive', depth: 5, states })
  path[0] = 0
  expect(restored.nativeRoute?.states[0]).toBe(states[0])
})
it('rejects diagonal moves, walls, forged complete routes and impractical expansion sizes', () => {
  const grid = expandBlock(def, 4),
    start = grid.start!
  expect(blockNeighbors(grid, start)).not.toContain(start + grid.width + 1)
  expect(() => validateBlockRoute(def, 4, [start, start + grid.width + 1], false)).toThrow(
    'wall crossing'
  )
  expect(() => validateBlockRoute(def, 4, [start], true)).toThrow('must reach')
  expect(() => expandBlock(def, 6)).toThrow('2048')
  expect(searchBlock(expandBlock({ ...def, start: null }, 4)).status).toBe('missingEndpoints')
})
