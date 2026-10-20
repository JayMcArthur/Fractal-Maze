import { compilePlayDocument } from '../app/library/compilePlayDocument'
import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import collection from '../data/mazes/geometric-collection.json'
import { importGeometricCollection, amurielagiExportAdapter } from '../core/io/adapters/amurielagiAdapter'
import { compileGeometricPDA, geometricPathState } from '../core/play/geometricPDA'
import { geometricArtwork } from '../core/play/geometricArtwork'
import { geometricChoices, geometricMove, geometricStart } from '../core/solver/common/geometricMovement'
import { availableMoves, sameState } from '../core/pathMaze/traversal'
import { copyAddress } from '../core/pathMaze/copyAddress'
import { balancedPathSearch } from '../core/pathMaze/balancedSearch'
import { validateMaze } from '../core/validate/validateMaze'
import { initialPathSession, crossPathSession, pathCrossing, pathSessionFinished,
  sessionPathRoute, walkPathSession, undoPathSession } from '../core/play/pathSession'
import { artworkRoute } from '../core/pathMaze/artworkRoutes'
import { bundledReplays } from '../app/library/bundledReplays'
import { geometricReplaySession } from '../core/replay/geometricReplaySession'
import { buildNativeReplay } from '../core/replay/nativeReplay'
import { importReplay } from '../core/replay/importReplay'
import { sourceGateDirection } from '../core/play/sourceWalking'

const documents = importGeometricCollection(collection)

it('all twelve geometric imports keep their original source and exact floor cells in the block player', () => {
  for (const [index, doc] of documents.entries()) {
    const converted = compilePlayDocument(doc)
    expect(validateMaze(converted).issues.filter(issue => issue.severity === 'error')).toEqual([])
    expect(JSON.parse(amurielagiExportAdapter.export(doc))[0]).toEqual(collection[index])
    expect(converted.metadata.id).toBe(doc.metadata.id)
    expect(converted.artwork!.blockSize).toBe(1)
    for (const [path, original] of collection[index].paths.entries()) {
      const cells = new Set<string>()
      for (const trace of converted.artwork!.traces.filter(trace => trace.path === String(path)))
        for (let i = 1; i < trace.points.length; i++) {
          const a = trace.points[i - 1], b = trace.points[i]
          expect(a[0] === b[0] || a[1] === b[1]).toBe(true)
          const length = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))
          for (let step = 0; step <= length; step++)
            cells.add(JSON.stringify([a[0] - .5 + Math.sign(b[0] - a[0]) * step,
              a[1] - .5 + Math.sign(b[1] - a[1]) * step]))
        }
      expect(cells).toEqual(new Set(original.points.filter(point => !('isHead' in point && point.isHead))
        .map(point => JSON.stringify([point.x, point.y]))))
    }
  }
})

it('preserves every native geometric move and physical boundary in surface and nested copy contexts', () => {
  let count = 0
  for (const doc of documents) {
    if (doc.definition.type !== 'geometricRecursive') throw new Error('Expected geometric source')
    const maze = doc.definition.maze, model = compileGeometricPDA(maze), artwork = geometricArtwork(maze, model)
    const stacks = [[], ...maze.subMazes.map(copy => [copy.id]),
      ...maze.subMazes.map(copy => [maze.subMazes[0].id, copy.id])]
    for (const stack of stacks) for (const gate of maze.paths.flatMap(path => path.gates)) {
      const position = { stack, gate, won: false }, state = geometricPathState(maze, position)
      for (const choice of geometricChoices(maze, position)) {
        const expected = geometricPathState(maze, geometricMove(maze, position, choice))
        const [owner, port] = choice.split(':')
        const id = choice.startsWith('f:') || (owner === '_' && !stack.length)
          ? `finish:${choice}` : owner === '_' ? `exit:${stack.at(-1)}:${port}` : `enter:${choice}`
        const move = availableMoves(model, state).find(move => move.edge.id === id)
        expect(move, `${maze.name}: ${stack.join('/')} ${gate} → ${choice}`).toBeDefined()
        expect(sameState(move!.next, expected)).toBe(true)
        const point = artwork.traces.find(trace => trace.path === state.path)!.points[0]
        const crossing = pathCrossing(model, artwork, { state, point }, id)
        expect(crossing?.position.state).toEqual(expected)
        expect(crossing?.position.point).toBeDefined()
        expect(copyAddress(model, expected)).toEqual(geometricMove(maze, position, choice).stack)
        count++
      }
    }
  }
  expect(count).toBeGreaterThan(10000)
}, 45000)

it('keeps explicit finishes surface-only and separates the final physical action from entering its corridor', () => {
  const maze = collection[9], model = compileGeometricPDA(maze), artwork = geometricArtwork(maze, model)
  const finish = model.connections.find(edge => edge.id.startsWith('finish:'))!
  const surface = { path: finish.from, address: model.start!.address }
  expect(availableMoves(model, { ...surface, address: [...surface.address, maze.subMazes[0].id] })
    .some(move => move.edge.id === finish.id)).toBe(false)
  const point = artwork.gates!.find(gate => gate.edge === finish.id)!.from
  expect(pathSessionFinished(model, artwork, { state: surface, point })).toBe(false)
  const finished = pathCrossing(model, artwork, { state: surface, point }, finish.id)!
  expect(pathSessionFinished(model, artwork, finished.position)).toBe(true)
  expect(copyAddress(model, finished.position.state)).toEqual([])
  expect(sourceGateDirection(artwork, finish, model)).toBe(1)
  expect(balancedPathSearch(model)).not.toBeNull()
  expect(balancedPathSearch(compileGeometricPDA(collection[0]))).toBeNull()
})

it('represents an unbound outer boundary as a physical dead end with a legal return', () => {
  const doc = structuredClone(documents[0])
  if (doc.definition.type !== 'geometricRecursive') throw new Error('Expected geometric source')
  const maze = doc.definition.maze
  for (const path of maze.paths) path.gates = path.gates.filter(gate => gate !== '_:1')
  const model = compileGeometricPDA(maze), artwork = geometricArtwork(maze, model)
  const enter = model.connections.find(edge => edge.operation === 'enter' && edge.to.startsWith('@gate:'))!
  const point = artwork.gates!.find(gate => gate.edge === enter.id)!.from
  const state = { path: enter.from, address: model.start!.address }
  const crossed = pathCrossing(model, artwork, { state, point }, enter.id)!
  const exits = availableMoves(model, crossed.position.state)
  expect(exits.every(move => move.edge.operation === 'exit')).toBe(true)
  const reverse = exits.find(move => move.edge.id === enter.id.replace('enter:', 'exit:'))!
  const returned = pathCrossing(model, artwork, crossed.position, reverse.edge.id)!
  expect(returned.position).toEqual({ state, point })
})

it('allows physical reversal and trims only after returning to the original floor point', () => {
  const maze = collection[0], model = compileGeometricPDA(maze), artwork = geometricArtwork(maze, model)
  const start = initialPathSession(model, artwork)
  expect(start.positions[0].state).toEqual(geometricPathState(maze, geometricStart(maze)))
  const entered = crossPathSession(start, model, artwork, 'enter:A:1')
  expect(copyAddress(model, entered.positions.at(-1)!.state)).toEqual(['A'])
  const returned = crossPathSession(entered, model, artwork, 'exit:A:1')
  const exit = model.connections.find(edge => edge.id === 'exit:A:1')!
  expect(sourceGateDirection({ ...artwork, finishes: [{ state: start.positions[0].state,
    point: start.positions[0].point! }] }, exit, model)).toBe(8)
  expect(returned.moves).toHaveLength(2)
  expect(returned.positions.at(-1)!.state).toEqual(model.start)
  const current = returned.positions.at(-1)!
  const walk = artworkRoute(artwork, current.state.path, current.point!, start.positions[0].point!)!
  const trimmed = walkPathSession(returned, walk)
  expect(trimmed).toEqual(start)
  expect(undoPathSession(entered)).toEqual(start)
})

it('plays archived geometric solutions on the physical PDA without dropping their finish action', async () => {
  const bundles = bundledReplays.filter(bundle => bundle.format === 'geometricRecursive')
  expect(bundles.length).toBeGreaterThan(0)
  for (const bundle of bundles) {
    const original = importReplay(readFileSync(`public/${bundle.asset}`, 'utf8'))
    if (original.maze.definition.type !== 'geometricRecursive' || original.nativeRoute?.type !== 'geometricRecursive')
      throw new Error('Expected geometric recording')
    const maze = compilePlayDocument(original.maze)
    if (maze.definition.type !== 'pathPushdown') throw new Error('Expected compiled PDA')
    const physical = geometricReplaySession(original.maze.definition.maze, maze.definition,
      maze.artwork!, original.nativeRoute)
    expect(physical.moves).toHaveLength(original.nativeRoute.gates.length)
    expect(pathSessionFinished(maze.definition, maze.artwork, physical.positions.at(-1))).toBe(true)
    const replay = buildNativeReplay(maze,
      { type: 'pathPushdown', ...sessionPathRoute(physical), physical }, 'solver', true)
    expect(importReplay(JSON.stringify(replay))).toEqual(replay)
    expect(original.nativeRoute.type).toBe('geometricRecursive')
  }
})
