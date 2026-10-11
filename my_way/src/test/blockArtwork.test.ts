import { expect, it } from 'vitest'
import { pathDocs } from '../app/library/pathCatalog'
import { blockCamera, createBlockArtwork } from '../core/play/blockArtwork'
import { buildNativeReplay } from '../core/replay/nativeReplay'
import { importReplay } from '../core/replay/importReplay'
import { availableMoves } from '../core/pathMaze/traversal'
import { nearestTracePoint, artworkRoute } from '../core/pathMaze/artworkRoutes'
import { artworkSchema } from '../core/pathMaze/validation'
import type { PathMazeDefinition } from '../core/model/pathMaze'
import { walkSource } from '../core/play/sourceWalking'

const bound = pathDocs.filter(doc => doc.artwork?.gates?.length &&
  (doc.definition.type === 'pathPushdown' || doc.definition.type === 'infiniteRule') &&
  doc.definition.start && doc.definition.goal)

it.each(bound)('$metadata.title has orthogonal block routes with every PDA gate still on its path', doc => {
  const model = doc.definition as PathMazeDefinition
  const original = JSON.stringify(doc)
  const blocks = createBlockArtwork(doc.artwork!, model)
  expect(artworkSchema.safeParse(blocks).success).toBe(true)
  expect(blocks.asset).toBe('')
  expect(blocks.blockSize).toBeGreaterThan(0)
  for (const trace of blocks.traces) {
    expect(trace.svg).toBeUndefined()
    for (let i = 1; i < trace.points.length; i++) {
      const a = trace.points[i - 1], b = trace.points[i]
      expect(a[0] === b[0] || a[1] === b[1]).toBe(true)
    }
  }
  for (const gate of blocks.gates!) {
    const edge = model.connections.find(edge => edge.id === gate.edge)!
    for (const [path, point] of [[edge.from, gate.from], [edge.to, gate.to]] as const) {
      const hit = nearestTracePoint(blocks.traces.filter(trace => trace.path === path), point)
      expect(hit?.distance, `${gate.edge} ${path}`).toBeLessThan(1e-6)
    }
  }
  expect(JSON.stringify(doc)).toBe(original)
})

it('keeps directed source strokes directed after making them orthogonal', () => {
  const doc = structuredClone(bound[0])
  doc.artwork = {
    asset: '', width: 100, height: 100, bounds: [0, 0, 100, 100], frames: [],
    traces: [{ id: 'one-way', path: '1', color: '#000', directed: true,
      points: [[0, 0], [50, 30], [100, 100]] }],
    start: [0, 0], goal: [100, 100],
  }
  const model = { ...doc.definition, start: { path: '1', address: [] }, goal: { path: '1', address: [] } } as PathMazeDefinition
  const blocks = createBlockArtwork(doc.artwork, model)
  expect(artworkRoute(blocks, '1', blocks.start!, blocks.goal!)).not.toBeNull()
  expect(artworkRoute(blocks, '1', blocks.goal!, blocks.start!)).toBeNull()
})

it('keeps the Snuke arrival connected to an onward block corridor', () => {
  const doc = bound.find(doc => doc.metadata.id === 'draft-maze-images-snuke-snuke-3-png')!
  const model = doc.definition as PathMazeDefinition
  const blocks = createBlockArtwork(doc.artwork!, model)
  const edge = model.connections.find(edge => edge.from === model.start!.path && edge.copy === 'L' && edge.operation === 'enter')!
  const point = blocks.gates!.find(gate => gate.edge === edge.id)!.to
  const routes = [1, 2, 4, 8].map(direction => walkSource(blocks, edge.to, point, direction as 1 | 2 | 4 | 8))
  expect(routes.filter(Boolean).length).toBeGreaterThan(0)
})

it('preserves keyboard continuation at every bound gate arrival that can be walked in the source', () => {
  for (const doc of bound) {
    const model = doc.definition as PathMazeDefinition
    const blocks = createBlockArtwork(doc.artwork!, model)
    for (const gate of doc.artwork!.gates!) {
      const edge = model.connections.find(edge => edge.id === gate.edge)!
      const directions = [1, 2, 4, 8] as const
      if (!directions.some(direction => walkSource(doc.artwork!, edge.to, gate.to, direction))) continue
      const target = blocks.gates!.find(target => target.edge === gate.edge)!.to
      expect(directions.some(direction => walkSource(blocks, edge.to, target, direction)),
        `${doc.metadata.id} ${gate.edge}`).toBe(true)
    }
  }
}, 10000)

it('records the selected block layout without replacing the source and validates it on import', () => {
  const maze = bound[0], model = maze.definition as PathMazeDefinition
  const first = availableMoves(model, model.start!)[0]
  const replay = buildNativeReplay(maze, { type: model.type,
    states: [model.start!, first.next], edges: [first.edge.id] }, 'human', false)
  replay.playArtwork = createBlockArtwork(maze.artwork!, model)
  const restored = importReplay(JSON.stringify(replay))
  expect(restored.playArtwork).toEqual(replay.playArtwork)
  expect(restored.maze.artwork).toEqual(maze.artwork)
  restored.playArtwork!.gates![0].edge = 'unknown-connection'
  expect(() => importReplay(JSON.stringify(restored))).toThrow('recorded layout')
})

it('keeps the local block camera inside the template at each corner', () => {
  const bounds = [20, 30, 1000, 2000]
  for (const point of [[20, 30], [1020, 30], [20, 2030], [1020, 2030]] as [number, number][]) {
    const camera = blockCamera(bounds, point, 10)
    expect(camera[0]).toBeGreaterThanOrEqual(bounds[0])
    expect(camera[1]).toBeGreaterThanOrEqual(bounds[1])
    expect(camera[0] + camera[2]).toBeLessThanOrEqual(bounds[0] + bounds[2])
    expect(camera[1] + camera[3]).toBeLessThanOrEqual(bounds[1] + bounds[3])
    expect(camera[2]).toBe(320)
    expect(camera[3]).toBe(320)
  }
})
