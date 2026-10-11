import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { importGeometricCollection, amurielagiExportAdapter } from '../core/io/adapters/amurielagiAdapter'
import { repeatedImportAdapter, repeatedExportAdapter } from '../core/io/adapters/repeatedAdapter'
import { fmazeExportAdapter, fmazeImportAdapter } from '../core/io/adapters/fmazeAdapter'
import { importKoteitan } from '../core/io/adapters/koteitanAdapter'
import { blockWall } from '../core/model/blockExpansion'
import type { BlockRecursiveDefinition } from '../core/model/blockRecursive'
import type { GeometricRecursiveDefinition } from '../core/model/geometricRecursive'
import type { RepeatedDirectedDefinition } from '../core/model/repeatedDirected'
import type { GraphLabeledDefinition } from '../core/model/graphLabeled'
import { canonicalTerminal, repeatedNeighbors, repeatedStateKey } from '../core/model/repeatedDirected'
import { geometricStart, geometricChoices, geometricMove } from '../core/solver/common/geometricMovement'
import { graphChoices } from '../core/solver/common/graphTraversal'
import { solveRepeated } from '../core/solver/traversal/repeatedSolver'
import { validateMaze } from '../core/validate/validateMaze'

const collection = JSON.parse(readFileSync('src/data/mazes/geometric-collection.json', 'utf8'))
const docs = importGeometricCollection(collection)

describe('native geometric collection', () => {
  it('keeps every maze, coordinate, gate number, and source field through both exports', () => {
    expect(docs).toHaveLength(12)
    for (const [index, doc] of docs.entries()) {
      expect(validateMaze(doc)).toEqual({ valid: true, issues: [] })
      expect(JSON.parse(amurielagiExportAdapter.export(doc))[0]).toEqual(collection[index])
      expect(fmazeImportAdapter.import(fmazeExportAdapter.export(doc))).toEqual(doc)
    }
  })
  it('enters the correct numbered gate, exits to the parent, and finishes only at the surface', () => {
    const maze = (docs[0].definition as GeometricRecursiveDefinition).maze
    const initial = geometricStart(maze)
    expect(initial.gate).toBe('s:3')
    expect(geometricChoices(maze, initial)).toContain('A:1')
    const entered = geometricMove(maze, initial, 'A:1')
    expect(entered).toEqual({ stack: ['A'], gate: '_:1', won: false })
    const exitMaze = { ...maze, paths: [{ color: '#000', points: [], gates: ['_:1', '_:5'] }] }
    const exited = geometricMove(exitMaze, entered, '_:5')
    expect(exited).toEqual({ stack: [], gate: 'A:5', won: false })
    expect(geometricMove(maze, initial, 'missing')).toBe(initial)
    const custom = { ...maze, paths: [{ color: '#000', points: [], gates: ['_:1', 'f:0'] }] }
    expect(geometricChoices(custom, { stack: ['A'], gate: '_:1', won: false })).not.toContain('f:0')
    expect(geometricMove(custom, { stack: [], gate: '_:1', won: false }, 'f:0').won).toBe(true)
  })
})

describe('black-cell block substitution', () => {
  it('leaves white regions open and substitutes black regions at each depth', () => {
    const def = importKoteitan({ map: [[1, 0], [0, 1]] }).definition as BlockRecursiveDefinition
    expect(Array.from({ length: 4 }, (_, index) => blockWall(def, index % 2, Math.floor(index / 2), 1))).toEqual([true, false, false, true])
    expect(blockWall(def, 0, 0, 2)).toBe(true)
    expect(blockWall(def, 1, 0, 2)).toBe(false)
    expect(blockWall(def, 2, 0, 2)).toBe(false)
    expect(blockWall(def, 3, 3, 2)).toBe(true)
  })
})

describe('repeated directed terminal semantics', () => {
  const raw = readFileSync('src/data/mazes/repeated-example.txt', 'utf8')
  const doc = repeatedImportAdapter.import(raw)
  const def = doc.definition as RepeatedDirectedDefinition
  it('canonicalizes shared terminals and matches the reference 13-edge BFS route', () => {
    expect(canonicalTerminal({ x: 1, y: 1, terminal: 'W0' })).toEqual({ x: 0, y: 1, terminal: 'E0' })
    expect(canonicalTerminal({ x: 1, y: 1, terminal: 'S0' })).toEqual({ x: 1, y: 0, terminal: 'N0' })
    const result = solveRepeated(def, 20)
    expect(result.status).toBe('solved')
    expect(result.path).toHaveLength(14)
    expect(result.path.at(-1)).toEqual(canonicalTerminal(def.goal))
    result.path.slice(1).forEach((state, index) => expect(repeatedNeighbors(def, result.path[index]).map(repeatedStateKey)).toContain(repeatedStateKey(state)))
  })
  it('preserves directed ports through source and canonical round-trips and respects bounds', () => {
    expect(validateMaze(doc)).toEqual({ valid: true, issues: [] })
    expect(repeatedImportAdapter.import(repeatedExportAdapter.export(doc)).definition).toEqual(def)
    expect(fmazeImportAdapter.import(fmazeExportAdapter.export(doc))).toEqual(doc)
    expect(solveRepeated(def, 0).status).toBe('bounded')
    const directed = { ...def, normal: [{ from: 'W0' as const, to: 'E0' as const }], nx: [], ny: [] }
    expect(repeatedNeighbors(directed, { x: 1, y: 1, terminal: 'E0' })).not.toContainEqual({ x: 0, y: 1, terminal: 'E0' })
  })
})

it('graph traversal uses actual links and respects one-way declarations', () => {
  const def: GraphLabeledDefinition = { type: 'graphLabeled', entryPortal: 'a', exitPortal: 'c', root: { id: 'root', label: 'Root', children: [], portals: [
    { id: 'a', label: 'A', isOneWay: true, connectsTo: ['b'] },
    { id: 'b', label: 'B', isOneWay: false, connectsTo: ['c'] },
    { id: 'c', label: 'C', isOneWay: false, connectsTo: [] },
  ] } }
  expect(graphChoices(def, 'a')).toEqual(['b'])
  expect(graphChoices(def, 'b')).toEqual(['c'])
  expect(graphChoices(def, 'c')).toEqual(['b'])
})
