import { describe, expect, it } from 'vitest'
import { loadCatalogMaze } from '../app/library/catalog'
import type { RecursiveTourDefinition } from '../core/model/recursiveTour'
import {
  currentTourRoom,
  moveTour,
  playTourMoves,
  startTour,
  tourComplete,
  tourCounts,
} from '../core/recursiveTour/movement'
import { validateTour, validateTourReplay } from '../core/recursiveTour/validation'
import { buildNativeReplay } from '../core/replay/nativeReplay'
import { importReplay } from '../core/replay/importReplay'
import { fmazeImportAdapter, fmazeExportAdapter } from '../core/io/adapters/fmazeAdapter'

const doc = loadCatalogMaze('backlot')!,
  def = doc.definition as RecursiveTourDefinition

describe('Backlot recursive room rules', () => {
  it('reproduces the six published rooms, all counts and dots, through depth three', () => {
    expect(validateTour(def)).toEqual([])
    const states = playTourMoves(def, def.providedMoves!),
      end = states.at(-1)!
    expect(states).toHaveLength(338)
    expect(tourComplete(end)).toBe(true)
    expect(end.rooms.map((room) => room.entry + room.exit)).toEqual([
      'NE',
      'ES',
      'WN',
      'WS',
      'SE',
      'NW',
    ])
    expect(Math.max(...end.rooms.map((room) => room.address.length))).toBe(3)
    for (const room of end.rooms) {
      expect(new Set(room.cells).size).toBe(room.cells.length)
      expect(def.dots.every((dot) => room.cells.includes(dot))).toBe(true)
      const counts = tourCounts(def, room)
      def.rowCounts.forEach((count, i) => {
        if (count !== null) expect(counts.rows[i]).toBe(count)
      })
      def.columnCounts.forEach((count, i) => {
        if (count !== null) expect(counts.columns[i]).toBe(count)
      })
    }
  })
  it('blocks retracing, early exit, walls, and excess counts', () => {
    const start = startTour(def)
    expect(moveTour(def, start, 'N')).toMatchObject({
      error: expect.stringContaining('different gate'),
    })
    const next = moveTour(def, start, 'S')
    if (!('state' in next)) throw new Error(next.error)
    expect(moveTour(def, next.state, 'N')).toMatchObject({
      error: expect.stringContaining('cannot cross'),
    })
    expect(moveTour(def, next.state, 'S')).toMatchObject({ error: expect.stringContaining('wall') })
    const limited = { ...def, rowCounts: def.rowCounts.map((count, i) => (i === 1 ? 1 : count)) }
    expect(moveTour(limited, next.state, 'W')).toMatchObject({
      error: expect.stringContaining('exceed'),
    })
    const incomplete = startTour(def)
    incomplete.rooms[0].cells = [def.gates.E]
    expect(moveTour(def, incomplete, 'E')).toMatchObject({
      error: expect.stringContaining('every dot'),
    })
  })
  it('counts a studio once in its parent, enters the correct side, and preserves the parent drawing', () => {
    const states = playTourMoves(def, def.providedMoves!)
    const at = states.findIndex((state) => state.active.length === 2)
    expect(currentTourRoom(states[at])).toMatchObject({ address: ['A'], entry: 'E', cells: [44] })
    expect(states[at].rooms[0].cells.at(-1)).toBe(49)
    expect(states[at + 1].rooms[0].cells).toEqual(states[at].rooms[0].cells)
    expect(states[at].rooms[0].cells.filter((cell) => cell === 49)).toHaveLength(1)
  })
  it('round-trips an immutable complete maze/replay and rejects altered room history', () => {
    const maze = fmazeImportAdapter.import(fmazeExportAdapter.export(doc))
    expect(maze.definition).toEqual(def)
    const states = playTourMoves(def, def.providedMoves!),
      replay = buildNativeReplay(doc, { type: 'recursiveTour', states }, 'solver', true)
    const restored = importReplay(JSON.stringify(replay))
    expect(restored.metrics).toMatchObject({ totalMoves: 337, maxDepthReached: 3 })
    expect(restored.nativeRoute?.states).toHaveLength(338)
    states[1].rooms[0].cells.push(0)
    expect(replay.nativeRoute?.states[1]).not.toEqual(states[1])
    expect(() => validateTourReplay(def, states, true)).toThrow('illegal move')
    expect(() =>
      validateTourReplay(def, playTourMoves(def, def.providedMoves!.slice(0, 10)), true)
    ).toThrow('must leave')
  })
  it('rejects out-of-bounds corridors and studios on gates at import validation', () => {
    const invalid = structuredClone(def)
    invalid.cells[0].push(999)
    expect(validateTour(invalid)[0].message).toContain('neighboring cells')
    expect(validateTour({ ...def, copies: [{ id: 'A', cell: def.gates.N }] })[0].message).toContain(
      'border gate'
    )
  })
})
