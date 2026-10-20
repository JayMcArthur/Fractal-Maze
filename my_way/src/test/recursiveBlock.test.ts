import { expect, it } from 'vitest'
import { loadCatalogMaze } from '../app/library/catalog'
import type { BlockRecursiveDefinition } from '../core/model/blockRecursive'
import { expandBlock, blockNeighbors } from '../core/blockMaze/grid'
import { blockAxisIndex, gridBlockPosition, initialBlockPosition, moveRecursiveBlock,
  recursiveBlockAddress, recursiveBlockKey } from '../core/blockMaze/recursivePosition'
import type { RecursiveBlockPosition } from '../core/blockMaze/recursivePosition'
import { buildNativeReplay } from '../core/replay/nativeReplay'
import { importReplay } from '../core/replay/importReplay'

const doc = loadCatalogMaze('koteitan-block')!, def = doc.definition as BlockRecursiveDefinition

it('lazy cells and four directions agree with finite expansions for every small-grid position', () => {
  for (const id of ['koteitan-block', 'koteitan-block-3', 'koteitan-block-5']) {
    const model = loadCatalogMaze(id)!.definition as BlockRecursiveDefinition
    for (const detail of [1, 2, 3]) {
      const grid = expandBlock(model, detail)
      for (let cell = 0; cell < grid.cells.length; cell++) {
        const position = gridBlockPosition(model.unit, cell, detail)
        const located = recursiveBlockAddress(model, position)
        expect(!!located && located.address.length < detail, `${id} / ${detail} / ${cell}`).toBe(!grid.cells[cell])
        if (grid.cells[cell]) continue
        const actual = ([1, 2, 4, 8] as const).flatMap(direction => {
          const next = moveRecursiveBlock(model, position, direction, detail)
          return next ? [Number(blockAxisIndex(next.y, model.unit, detail)) * grid.width + Number(blockAxisIndex(next.x, model.unit, detail))] : []
        })
        expect(new Set(actual), `${id} / ${detail} / ${cell}`).toEqual(new Set(blockNeighbors(grid, cell)))
      }
    }
  }
})

it('zoomed steps translate exactly and reverse to the original physical point', () => {
  for (const unit of [2, 3, 4, 5]) {
    const model: BlockRecursiveDefinition = { type: 'blockRecursive', unit, pattern: Array(unit * unit).fill(0), start: [0, 0], goal: [1, 1] }
    const start = initialBlockPosition(model, 5)!
    for (const detail of [1, 4, 5, 6, 80]) {
      const next = moveRecursiveBlock(model, start, 4, detail)!
      const previous = moveRecursiveBlock(model, next, 1, detail)!
      expect(previous).toEqual(start)
    }
  }
})

it('crosses aligned copy boundaries at depth eighty and returns to the larger white region', () => {
  let current: RecursiveBlockPosition = {
    x: { digits: [...Array(79).fill(0), 1], half: true },
    y: { digits: [...Array(79).fill(0), 0], half: true },
  }
  expect(recursiveBlockAddress(def, current)!.address).toHaveLength(79)
  current = moveRecursiveBlock(def, current, 2, 81)!
  // The upper boundary strip is closed. Walk to the open lower strip before entering.
  for (let i = 0; i < 3; i++) current = moveRecursiveBlock(def, current, 1, 81)!
  expect(recursiveBlockAddress(def, current)!.address).toHaveLength(80)
  const parent = moveRecursiveBlock(def, current, 4, 81)!
  expect(recursiveBlockAddress(def, parent)!.address).toHaveLength(79)
  expect(moveRecursiveBlock(def, parent, 1, 81)).toEqual(current)
})

it('the supplied source solution round-trips with exact positions and real copy depth', () => {
  const native = def.providedRoute!
  const states = native.states.map(cell => gridBlockPosition(def.unit, cell, native.depth))
  const replay = buildNativeReplay(doc,
    { type: 'fractalBlock', states, details: states.slice(1).map(() => native.depth) }, 'solver', true)
  expect(importReplay(JSON.stringify(replay))).toEqual(replay)
  expect(replay.metrics.totalMoves).toBe(1756)
  expect(replay.metrics.maxDepthReached).toBe(4)
  const forged = structuredClone(replay)
  if (forged.nativeRoute?.type !== 'fractalBlock') throw new Error('Expected recursive recording')
  forged.nativeRoute.states[1] = states[3]
  expect(() => importReplay(JSON.stringify(forged))).toThrow('nonadjacent')
})

it('exports arbitrarily deep coordinates, removes exact detours and rejects amplified detail values', () => {
  const maze = structuredClone(doc)
  const model: BlockRecursiveDefinition = { ...def, providedRoute: undefined, pattern: Array(16).fill(0), start: [0, 0], goal: [1, 1] }
  maze.definition = model
  const start = initialBlockPosition(model, 1)!, next = moveRecursiveBlock(model, start, 4, 80)!
  const recording = buildNativeReplay(maze, { type: 'fractalBlock', states: [start, next], details: [80] }, 'human', false)
  expect(importReplay(JSON.stringify(recording))).toEqual(recording)
  expect(next.x.digits).toHaveLength(80)
  expect(recursiveBlockKey(next)).not.toBe(recursiveBlockKey(start))
  const trimmed = buildNativeReplay(maze, { type: 'fractalBlock', states: [start, next, start], details: [80, 80] }, 'human', false)
  expect(trimmed.metrics.totalMoves).toBe(0)
  const forged = structuredClone(recording)
  if (forged.nativeRoute?.type !== 'fractalBlock') throw new Error('Expected recursive recording')
  forged.nativeRoute.details[0] = 1000000
  expect(() => importReplay(JSON.stringify(forged))).toThrow('nonadjacent')
})
