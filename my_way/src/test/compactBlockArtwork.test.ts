import { it, expect } from 'vitest'
import { writeFileSync } from 'node:fs'
import { catalog, loadCatalogMaze } from '../app/library/catalog'
import { compilePlayDocument } from '../app/library/compilePlayDocument'
import { rulePlayDocument } from '../app/library/rulePlayDocument'
import { createBlockArtwork } from '../core/play/blockArtwork'
import { compactBlockArtwork } from '../core/play/compactBlockArtwork'
import { artworkGraph, type ArtworkPoint } from '../core/pathMaze/artworkRoutes'
import { sourceGateDirection } from '../core/play/sourceWalking'
import type { MazeArtwork, PathMazeDefinition } from '../core/model/pathMaze'

function terminals(artwork: MazeArtwork, model: PathMazeDefinition) {
  const points = new Map<string, ArtworkPoint[]>()
  const add = (path: string, point: ArtworkPoint) =>
    points.set(path, [...(points.get(path) ?? []), point])
  for (const gate of artwork.gates ?? []) {
    const edge = model.connections.find((edge) => edge.id === gate.edge)
    if (!edge) continue
    add(edge.from, gate.from)
    add(edge.to, gate.to)
    if (gate.arrivalFrom) add(edge.to, gate.arrivalFrom)
  }
  if (model.start && artwork.start) add(model.start.path, artwork.start)
  if (model.goal && artwork.goal) add(model.goal.path, artwork.goal)
  for (const finish of artwork.finishes ?? []) add(finish.state.path, finish.point)
  return points
}

it('shrinks catalog block layouts while preserving directed terminal reachability, gates and model data', () => {
  const measurements = []
  for (const entry of catalog) {
    const compiled = compilePlayDocument(loadCatalogMaze(entry.id)!)
    const doc = rulePlayDocument(compiled) ?? compiled
    const model = doc.definition
    if (
      (model.type !== 'pathPushdown' && model.type !== 'infiniteRule') ||
      !doc.artwork?.traces.length
    )
      continue
    const original = structuredClone(doc)
    const before = createBlockArtwork(doc.artwork, model)
    const after = compactBlockArtwork(doc.artwork, model)
    expect(doc).toEqual(original)
    expect(after.bounds[2]).toBeLessThanOrEqual(before.bounds[2] + 1e-7)
    expect(after.bounds[3]).toBeLessThanOrEqual(before.bounds[3] + 1e-7)
    expect(compactBlockArtwork(after, model)).toEqual(after)
    expect(after.traces.map((trace) => [trace.id, trace.path, trace.directed])).toEqual(
      before.traces.map((trace) => [trace.id, trace.path, trace.directed])
    )
    expect(after.gates?.map((gate) => gate.edge)).toEqual(before.gates?.map((gate) => gate.edge))
    for (const edge of model.connections)
      expect(sourceGateDirection(after, edge, model)).toBe(sourceGateDirection(before, edge, model))
    const oldTerminals = terminals(before, model),
      newTerminals = terminals(after, model)
    for (const [path, oldPoints] of oldTerminals) {
      expect(reachability(after, path, newTerminals.get(path)!), `${entry.id}: ${path}`).toEqual(
        reachability(before, path, oldPoints)
      )
    }
    measurements.push({
      id: entry.id,
      before: before.bounds.slice(2).map((length) => length / before.blockSize!),
      after: after.bounds.slice(2).map((length) => length / after.blockSize!),
    })
  }
  writeFileSync('/tmp/fractal-compact-layouts.json', JSON.stringify(measurements, null, 2))
  expect(
    measurements.filter((row) => row.after[0] * row.after[1] < row.before[0] * row.before[1]).length
  ).toBeGreaterThan(5)
})

function reachability(artwork: MazeArtwork, path: string, points: ArtworkPoint[]) {
  const { nodes, stopNodes } = artworkGraph(artwork, path, points[0], points)
  return stopNodes.map((start) => {
    const queue = start === null ? [] : [start],
      seen = new Set(queue)
    for (const node of queue)
      for (const next of [...nodes[node].next, ...nodes[node].joins]) {
        if (!seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
      }
    return stopNodes.map((finish) => finish !== null && seen.has(finish))
  })
}
