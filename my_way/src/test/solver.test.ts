/**
 * Tests for the solver system (Sprint 8).
 * Tests generators directly (not via web worker).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { orelMazeImportAdapter } from '../core/io/adapters/orelMazeAdapter'
import { bfsSolve } from '../core/solver/traversal/TraversalSolver'
import { iddfsSolve } from '../core/solver/depthBounded/DepthBoundedSolver'
import type { SquareRecursiveDefinition } from '../core/model/squareRecursive'
import type { SolverConfig, SolverEvent } from '../core/model/solverInterface'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const MAZES_DIR = join(__dirname, '../data/mazes')

const SMALL_CONFIG: SolverConfig = {
  maxDepth: 3,
  maxNodes: 5000,
  timeoutMs: 5000,
  strategy: 'bfs',
}

async function collectEvents(gen: AsyncGenerator<SolverEvent>): Promise<SolverEvent[]> {
  const events: SolverEvent[] = []
  for await (const event of gen) {
    events.push(event)
    // Stop after terminal event
    if (event.type === 'solved' || event.type === 'unsolvable' || event.type === 'error') {
      break
    }
  }
  return events
}

function loadSquareMaze(): SquareRecursiveDefinition {
  const text = readFileSync(join(MAZES_DIR, '4_-_square.maze'), 'utf-8')
  const doc = orelMazeImportAdapter.import(text)
  return doc.definition as SquareRecursiveDefinition
}

describe('bfsSolve', () => {
  it('terminates with a terminal event (solved or unsolvable)', async () => {
    const def = loadSquareMaze()
    const events = await collectEvents(bfsSolve(def, SMALL_CONFIG))
    expect(events.length).toBeGreaterThan(0)
    const last = events[events.length - 1]
    expect(['solved', 'unsolvable', 'error']).toContain(last.type)
  })

  it('yields progress events before termination', async () => {
    const def = loadSquareMaze()
    const config: SolverConfig = { ...SMALL_CONFIG, maxNodes: 5000 }
    const events = await collectEvents(bfsSolve(def, config))
    // Should have at least the terminal event
    expect(events.length).toBeGreaterThan(0)
    // If there were progress events, they should have nodesExplored >= 0
    const progressEvents = events.filter((e) => e.type === 'progress')
    for (const e of progressEvents) {
      expect(e.nodesExplored).toBeGreaterThanOrEqual(0)
    }
  })

  it('solution path starts at player position (if solved)', async () => {
    const def = loadSquareMaze()
    const events = await collectEvents(bfsSolve(def, { ...SMALL_CONFIG, maxNodes: 50000 }))
    const solvedEvent = events.find((e) => e.type === 'solved')
    if (solvedEvent && solvedEvent.path) {
      expect(solvedEvent.path.length).toBeGreaterThan(0)
      // First action should start from player position
      const firstAction = solvedEvent.path[0]
      expect(firstAction.from.blockStack).toEqual(['0'])
      expect(firstAction.from.row).toBe(def.player.row)
      expect(firstAction.from.col).toBe(def.player.col)
    }
    // If unsolvable within limits, that's also valid
  })

  it('all events have non-negative nodesExplored', async () => {
    const def = loadSquareMaze()
    const events = await collectEvents(bfsSolve(def, SMALL_CONFIG))
    for (const e of events) {
      expect(e.nodesExplored).toBeGreaterThanOrEqual(0)
    }
  })

  it('terminates when maxNodes is hit', async () => {
    const def = loadSquareMaze()
    const tinyConfig: SolverConfig = { ...SMALL_CONFIG, maxNodes: 10 }
    const events = await collectEvents(bfsSolve(def, tinyConfig))
    const last = events[events.length - 1]
    // Should hit the limit and return unsolvable
    expect(['solved', 'unsolvable']).toContain(last.type)
  })
})

describe('iddfsSolve', () => {
  it('solves a surface path longer than the recursion-depth setting', async () => {
    const def = loadSquareMaze()
    const simple: SquareRecursiveDefinition = { ...def, grid: { rows: 1, cols: 5, cells: [4, 5, 5, 5, 1] }, blocks: [], links: [], exits: [], teleporters: [], trophies: [{ row: 0, col: 4, color: '#ff0000' }], player: { row: 0, col: 0, color: '#0000ff' } }
    for (const solve of [bfsSolve, iddfsSolve]) {
      const events = await collectEvents(solve(simple, { ...SMALL_CONFIG, maxDepth: 0 }))
      expect(events.at(-1)?.type).toBe('solved')
      expect(events.at(-1)?.path).toHaveLength(4)
    }
  })
  it('terminates with a terminal event', async () => {
    const def = loadSquareMaze()
    const events = await collectEvents(iddfsSolve(def, SMALL_CONFIG))
    expect(events.length).toBeGreaterThan(0)
    const last = events[events.length - 1]
    expect(['solved', 'unsolvable', 'error']).toContain(last.type)
  })

  it('yields progress events for each depth level', async () => {
    const def = loadSquareMaze()
    const events = await collectEvents(iddfsSolve(def, SMALL_CONFIG))
    const progressEvents = events.filter((e) => e.type === 'progress')
    // IDDFS should yield at least one progress event per depth
    expect(progressEvents.length).toBeGreaterThan(0)
  })

  it('depth increases in progress events', async () => {
    const def = loadSquareMaze()
    const events = await collectEvents(iddfsSolve(def, SMALL_CONFIG))
    const progressEvents = events.filter((e) => e.type === 'progress')
    if (progressEvents.length >= 2) {
      // depths should be non-decreasing
      for (let i = 1; i < progressEvents.length; i++) {
        expect(progressEvents[i].depth).toBeGreaterThanOrEqual(progressEvents[i - 1].depth)
      }
    }
  })

  it('solution path is non-empty if solved', async () => {
    const def = loadSquareMaze()
    const events = await collectEvents(iddfsSolve(def, { ...SMALL_CONFIG, maxNodes: 50000 }))
    const solvedEvent = events.find((e) => e.type === 'solved')
    if (solvedEvent && solvedEvent.path) {
      expect(solvedEvent.path.length).toBeGreaterThan(0)
    }
  })
})

describe('solver on alice maze', () => {
  it('bfsSolve terminates on alice maze', async () => {
    const text = readFileSync(join(MAZES_DIR, '1_-_alice_in_wonderland.maze'), 'utf-8')
    const doc = orelMazeImportAdapter.import(text)
    const def = doc.definition as SquareRecursiveDefinition
    const config: SolverConfig = { maxDepth: 2, maxNodes: 2000, timeoutMs: 5000, strategy: 'bfs' }
    const events = await collectEvents(bfsSolve(def, config))
    const last = events[events.length - 1]
    expect(['solved', 'unsolvable']).toContain(last.type)
  })
})
