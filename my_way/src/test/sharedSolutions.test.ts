import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { catalog, loadCatalogMaze } from '../app/library/catalog'
import { bundledReplays } from '../app/library/bundledReplays'
import fixtures from '../data/mazes/catalog-solutions.json'
import register from '../data/mazes/register-solutions.json'
import atomic from '../data/mazes/upstream-repeated.json'
import coverage from '../data/manifests/solution-coverage.json'
import { buildNativeReplay } from '../core/replay/nativeReplay'
import type { NativeRoute } from '../core/replay/nativeReplay'
import { buildReplay } from '../core/replay/replayWriter'
import type { PlayerAction } from '../core/model/playerState'
import type { ProofClaim } from '../core/model/pathMaze'
import { importReplay } from '../core/replay/importReplay'
import { resolveMove } from '../core/solver/common/movementResolver'
import type { SquareRecursiveDefinition } from '../core/model/squareRecursive'
import { samePosition } from '../core/replay/replayFrame'
import { hydrateArtwork } from '../app/library/pathCatalog'
import { wirePlayDocument } from '../app/library/wirePlayDocument'

describe('shared solution inventory', () => {
  it.each(register)('keeps the source-checked register solution current for $mazeId', (fixture) => {
    const source = readFileSync(`../${fixture.evidence.source}`, 'utf8').replace(/\r\n?/g, '\n')
    expect(createHash('sha256').update(source).digest('hex')).toBe(fixture.evidence.inputHash)
    const row = atomic.find(row => `repeated-atomic-${row.id}` === fixture.mazeId)!
    expect(createHash('sha256').update(row.raw).digest('hex')).toBe(fixture.evidence.mazeHash)
    const replay = buildNativeReplay(loadCatalogMaze(fixture.mazeId)!, fixture.route as NativeRoute, 'solver', true)
    expect(importReplay(JSON.stringify(replay)).metrics.totalMoves).toBe(fixture.evidence.trimmedMoves)
  })
  it('covers every catalog document and never publishes empty or unverified failures', () => {
    expect(coverage.map(row => row.id).sort()).toEqual(catalog.map(row => row.id).sort())
    expect(new Set(bundledReplays.map(row => row.id)).size).toBe(bundledReplays.length)
    for (const row of coverage.filter(row => ['solution', 'proof-solution'].includes(row.status)))
      expect(bundledReplays.some(replay => replay.mazeId === row.id && replay.complete)).toBe(true)
  })
  it.each(bundledReplays)('publishes a complete current snapshot for $id', async (bundle) => {
    const text = readFileSync(`public/${bundle.asset}`, 'utf8')
    expect(bundle.complete).toBe(true)
    const replay = importReplay(text)
    expect(replay.status).toBe('complete')
    expect(replay.mazeRef).toBe(bundle.mazeId)
    expect(replay.metrics.totalMoves).toBe(bundle.moves)
    expect(replay.nativeRoute?.type ?? replay.maze.definition.type).toBe(bundle.format)
    const source = structuredClone(loadCatalogMaze(bundle.mazeId)!)
    const current = await hydrateArtwork(wirePlayDocument(source) ?? source)
    if (bundle.proofAssisted &&
        (current.definition.type === 'infiniteRule' || current.definition.type === 'pathPushdown') &&
        (replay.maze.definition.type === 'infiniteRule' || replay.maze.definition.type === 'pathPushdown')) {
      expect(replay.maze.definition.claims?.length).toBeGreaterThan(0)
      current.definition.claims = replay.maze.definition.claims
    }
    expect(replay.maze.definition).toEqual(current.definition)
    expect(replay.maze.artwork).toEqual(current.artwork)
  })
  it.each(fixtures)('checks the complete generated route for $mazeId', (fixture) => {
    const maze = structuredClone(loadCatalogMaze(fixture.mazeId)!)
    const data = fixture as { mazeId: string; route?: NativeRoute; actions?: PlayerAction[]; claims?: ProofClaim[] }
    if (data.claims && maze.definition.type === 'infiniteRule') maze.definition.claims = data.claims
    if (data.actions) {
      const def = maze.definition as SquareRecursiveDefinition
      let current = { blockStack: ['0'], row: def.player.row, col: def.player.col }, won = false
      for (const action of data.actions) {
        expect(samePosition(action.from, current)).toBe(true)
        const result = resolveMove(def, current, action.direction!, Date.now())!
        expect(result).not.toBeNull()
        expect(samePosition(action.to, result.newPos)).toBe(true)
        current = result.newPos; won = result.isWin
      }
      expect(won).toBe(true)
    }
    const replay = data.actions ? buildReplay(maze, data.actions, 'complete', new Date().toISOString(), 'solver') : buildNativeReplay(maze, data.route!, 'solver', true)
    expect(importReplay(JSON.stringify(replay)).status).toBe('complete')
  })
})
