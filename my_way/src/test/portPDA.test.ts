import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { loadCatalogMaze } from '../app/library/catalog'
import { portPlayDocument } from '../app/library/portPlayDocument'
import { portPathState } from '../core/play/portPDA'
import { portMoves, portStateKey } from '../core/model/recursivePorts'
import { availableMoves, stateKey, sameState } from '../core/pathMaze/traversal'
import { importReplay } from '../core/replay/importReplay'
import { buildNativeReplay } from '../core/replay/nativeReplay'
import { validateMaze } from '../core/validate/validateMaze'
import { compilePortPDA } from '../core/play/portPDA'
import { pathMoveDescription, pathMoveSequence } from '../core/play/pathMovement'
import { copyAddress } from '../core/pathMaze/copyAddress'
import { balancedPathSearch } from '../core/pathMaze/balancedSearch'
import { searchPaths, reachesGoal } from '../core/pathMaze/traversal'
import type { RecursivePortsDefinition } from '../core/model/recursivePorts'
import { crossPathSession, initialPathSession, pathSessionFinished, sessionPathRoute } from '../core/play/pathSession'
import { portReplaySession } from '../core/replay/portReplaySession'
import { bundledReplays } from '../app/library/bundledReplays'

const replacement: RecursivePortsDefinition = {
  type: 'recursivePorts', blocks: ['A', '@surface:0'], stayKeepsBlock: false,
  start: { blocks: [0], port: 0 }, goal: { blocks: [1], port: 3 },
  rules: [[1, 0, 1, 0, 1], [0, 1, 0, 1, 2], [1, 2, -1, -1, 0],
    [1, 0, 0, 1, 3], [0, 3, 0, 1, 3], [0, 0, -1, -1, 2], [-1, 0, -1, -1, 2]],
}

it('all bundled port players preserve every directed transition through four levels', () => {
  for (const id of ['ports-koteitan', 'ports-snuke_no3', 'ports-snuke_no4']) {
    const doc = loadCatalogMaze(id)!,
      def = doc.definition
    if (def.type !== 'recursivePorts') throw new Error('Expected port fixture')
    const converted = portPlayDocument(doc)!,
      model = converted.definition
    if (model.type !== 'pathPushdown') throw new Error('Expected playable PDA')
    const queue = [def.start],
      seen = new Set<string>()
    for (const current of queue) {
      if (seen.has(portStateKey(current))) continue
      seen.add(portStateKey(current))
      const moves = portMoves(def, current, 4)
      expect(
        new Set(
          availableMoves(model, portPathState(def, current))
            .map((move) => pathMoveSequence(model, portPathState(def, current), move.edge.id)!.states.at(-1)!)
            .filter((next) => copyAddress(model, next).length <= 4)
            .map(stateKey)
        )
      ).toEqual(new Set(moves.map((move) => stateKey(portPathState(def, move.state)))))
      queue.push(...moves.map((move) => move.state))
    }
    expect(model.start).toEqual(portPathState(def, def.start))
    expect(model.goal).toEqual(portPathState(def, def.goal))
  }
})

it('generated Koteitan corridor layouts export and import as a playable PDA snapshot', () => {
  const doc = portPlayDocument(loadCatalogMaze('ports-koteitan')!)!
  const model = doc.definition
  if (model.type !== 'pathPushdown') throw new Error('Expected playable PDA')
  expect(validateMaze(doc).issues.filter((issue) => issue.severity === 'error')).toEqual([])
  const move = availableMoves(model, model.start!)[0]
  const replay = buildNativeReplay(
    doc,
    { type: 'pathPushdown', states: [model.start!, move.next], edges: [move.edge.id] },
    'human',
    false
  )
  expect(importReplay(JSON.stringify(replay))).toEqual(replay)
})

it('compiles every imported replacement, directed exit and root identity through four levels', () => {
  const model = compilePortPDA(replacement)
  const children: number[][] = [[]]
  for (const address of children) {
    if (address.length < 4) children.push(...replacement.blocks.map((_, copy) => [...address, copy]))
    for (const root of [0, 1]) for (const port of [0, 1, 2, 3]) {
      const current = { blocks: [root, ...address], port }
      const state = portPathState(replacement, current)
      const actual = availableMoves(model, state).map(move => pathMoveSequence(model, state, move.edge.id)!)
      expect(actual.every(route => !model.paths.find(path => path.id === route.states.at(-1)!.path)!.helper)).toBe(true)
      expect(new Set(actual.map(route => route.states.at(-1)!)
        .filter(next => copyAddress(model, next).length <= 4).map(stateKey)))
        .toEqual(new Set(portMoves(replacement, current, 4).map(move => stateKey(portPathState(replacement, move.state)))))
    }
  }
  expect(model.surfaceSymbols?.some(symbol => replacement.blocks.includes(symbol))).toBe(false)
  expect(balancedPathSearch(model)?.states.at(-1)).toEqual(model.goal)
  expect(searchPaths(model, 0).route?.states.at(-1)).toEqual(model.goal)
})

it('keeps a root-changing crossing at depth zero and exports its complete physical witness', () => {
  const doc = loadCatalogMaze('ports-koteitan')!
  doc.definition = replacement
  const converted = portPlayDocument(doc)!
  if (converted.definition.type !== 'pathPushdown') throw new Error('Expected playable PDA')
  const model = converted.definition, artwork = converted.artwork!
  expect(validateMaze(converted).issues.filter(issue => issue.severity === 'error')).toEqual([])
  const session = initialPathSession(model, artwork)
  const edge = availableMoves(model, model.start!).find(move =>
    sameState(pathMoveSequence(model, model.start!, move.edge.id)!.states.at(-1)!, model.goal!))!.edge
  expect(pathMoveDescription(model, model.start!, edge)).toEqual({ action: 'Cross', path: '3' })
  const crossed = crossPathSession(session, model, artwork, edge.id)
  expect(crossed.moves).toHaveLength(1)
  expect(sessionPathRoute(crossed).edges).toHaveLength(2)
  expect(copyAddress(model, crossed.positions.at(-1)!.state)).toEqual([])
  expect(pathSessionFinished(model, artwork, crossed.positions.at(-1))).toBe(true)
  const replay = buildNativeReplay(converted,
    { type: 'pathPushdown', ...sessionPathRoute(crossed), physical: crossed }, 'human', true)
  expect(replay.metrics.maxDepthReached).toBe(0)
  expect(replay.metrics.totalMoves).toBe(1)
  expect(importReplay(JSON.stringify(replay))).toEqual(replay)
  const solved = buildNativeReplay(converted,
    { type: 'pathPushdown', ...balancedPathSearch(model)! }, 'solver', true)
  expect(solved.metrics.totalMoves).toBe(1)
  expect(importReplay(JSON.stringify(solved))).toEqual(solved)
})

it('rejects unreachable differing roots without pretending root exit is legal', () => {
  const def = { ...replacement, stayKeepsBlock: true, rules: [[0, 0, -1, -1, 3]], goal: { blocks: [1], port: 3 } }
  const model = compilePortPDA(def)
  expect(availableMoves(model, model.start!)).toEqual([])
  expect(balancedPathSearch(model)).toBeNull()
})

it('plays every bundled port solution with canonical source/block positions and copy witnesses', async () => {
  for (const bundle of bundledReplays.filter(bundle => bundle.format === 'recursivePorts')) {
    const replay = importReplay(readFileSync(`public/${bundle.asset}`, 'utf8'))
    if (replay.maze.definition.type !== 'recursivePorts' || replay.nativeRoute?.type !== 'recursivePorts')
      throw new Error('Expected old port recording')
    const maze = portPlayDocument(replay.maze)!
    if (maze.definition.type !== 'pathPushdown') throw new Error('Expected playable PDA')
    const physical = portReplaySession(replay.maze.definition, maze.definition, maze.artwork!, replay.nativeRoute.states)
    expect(physical.moves).toHaveLength(replay.nativeRoute.states.length - 1)
    expect(reachesGoal(maze.definition, physical.positions.at(-1)!.state)).toBe(true)
    expect(pathSessionFinished(maze.definition, maze.artwork, physical.positions.at(-1))).toBe(true)
    const canonical = buildNativeReplay(maze, { type: 'pathPushdown', ...sessionPathRoute(physical), physical }, 'solver', true)
    expect(importReplay(JSON.stringify(canonical))).toEqual(canonical)
  }
})

it('an edited Snuke transition is compiled from its actual rules instead of the bundled drawing', () => {
  const doc = structuredClone(loadCatalogMaze('ports-snuke_no3')!)
  if (doc.definition.type !== 'recursivePorts') throw new Error('Expected port fixture')
  const native = doc.definition
  const original = portPlayDocument(doc)!
  doc.definition.rules[0][4] = 2
  const edited = portPlayDocument(doc)!
  expect(edited.definition).not.toBe(original.definition)
  expect(edited.artwork?.asset).toBe('')
  if (edited.definition.type !== 'pathPushdown') throw new Error('Expected playable PDA')
  expect(
    availableMoves(edited.definition, edited.definition.start!).map((move) => move.next)
  ).toEqual(portMoves(native, native.start).map((move) => portPathState(native, move.state)))
})
