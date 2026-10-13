import { expect, it } from 'vitest'
import { loadCatalogMaze } from '../app/library/catalog'
import { simpleHopArtwork } from '../core/play/simpleHopArtwork'
import type { PathMazeDefinition } from '../core/model/pathMaze'
import { nearestTracePoint } from '../core/pathMaze/artworkRoutes'

it.each(['simple-infinite-hop', 'simple-nested-infinite-hop'])('%s connects each parent door to the matching child boundary without changing rules', id => {
  const model = loadCatalogMaze(id)!.definition as PathMazeDefinition
  const artwork = simpleHopArtwork(model)!
  expect(artwork).not.toBeNull()
  for (const edge of model.connections.filter(edge => edge.operation === 'enter')) {
    const gate = artwork.gates!.find(gate => gate.edge === edge.id)!
    const frame = artwork.frames.find(frame => frame.id === edge.copy)!
    const projected = [frame.x + gate.to[0] / artwork.width * frame.width,
      frame.y + gate.to[1] / artwork.height * frame.height]
    expect(projected[0]).toBeCloseTo(gate.from[0])
    expect(projected[1]).toBeCloseTo(gate.from[1])
    expect(nearestTracePoint(artwork.traces.filter(trace => trace.path === edge.from), gate.from)!.distance).toBe(0)
    expect(nearestTracePoint(artwork.traces.filter(trace => trace.path === edge.to), gate.to)!.distance).toBe(0)
    expect(gate.to[0] === 0 || gate.to[0] === artwork.width ||
      gate.to[1] === 0 || gate.to[1] === artwork.height).toBe(true)
  }
  const changed = structuredClone(model)
  changed.connections[0].to = model.goal!.path
  expect(simpleHopArtwork(changed)).toBeNull()
})
