import type { MazeArtwork, PathConnection, PathMazeDefinition } from '../model/pathMaze'
import type { DirectionBit } from '../model/squareRecursive'
import { artworkGraph, distance, type ArtworkPoint } from '../pathMaze/artworkRoutes'
import { directionDelta } from '../solver/common/movementResolver'

/** Traverse forced bends, then freeze at the next junction, gate or dead end. */
export function walkSource(
  artwork: MazeArtwork,
  path: string,
  marker: ArtworkPoint,
  direction: DirectionBit,
  stops: ArtworkPoint[] = []
): ArtworkPoint[] | null {
  const { nodes, markerNode } = artworkGraph(artwork, path, marker, stops)
  if (markerNode === null) return null
  const neighbors = (node: number, previous = -1) => {
    const cluster = joinedNodes(nodes, node)
    const targets = [...new Set([...cluster].flatMap((id) => nodes[id].next))].filter(
      (id) =>
        !cluster.has(id) &&
        id !== previous &&
        (previous < 0 || distance(nodes[id].point, nodes[previous].point) > 1e-7)
    )
    const seen = new Set<number>()
    return targets.filter(id => {
      if (seen.has(id)) return false
      for (const alias of joinedNodes(nodes, id)) seen.add(alias)
      return true
    })
  }
  const [dy, dx] = directionDelta(direction)
  const choices = neighbors(markerNode)
    .map((id) => {
      const point = nodes[id].point,
        length = distance(marker, point)
      return { id, score: ((point[0] - marker[0]) * dx + (point[1] - marker[1]) * dy) / length }
    })
    .filter((choice) => choice.score > 0.5)
    .sort((a, b) => b.score - a.score)
  if (
    !choices.length ||
    (choices.length > 1 && Math.abs(choices[0].score - choices[1].score) < 0.05)
  )
    return null
  const route = [marker],
    visited = new Set([markerNode])
  let previous = markerNode,
    node = choices[0].id
  while (!visited.has(node)) {
    visited.add(node)
    if (artwork.blockSize) {
      const next = nodes[node].point
      const previousPoint = route.at(-1)!
      const travelled = route.slice(1).reduce((total, point, i) => total + distance(route[i], point), 0)
      const remaining = artwork.blockSize - travelled
      const length = distance(previousPoint, next)
      if (length >= remaining - 1e-7) {
        const t = Math.min(1, remaining / length)
        route.push([previousPoint[0] + t * (next[0] - previousPoint[0]), previousPoint[1] + t * (next[1] - previousPoint[1])])
        break
      }
    }
    route.push(nodes[node].point)
    const next = neighbors(node, previous)
    if ([...joinedNodes(nodes, node)].some(id => nodes[id].stop) || next.length !== 1) break
    previous = node
    node = next[0]
  }
  return route.length > 1 ? route : null
}

function joinedNodes(nodes: ReturnType<typeof artworkGraph>['nodes'], node: number) {
  const cluster = new Set([node]), queue = [node]
  for (let i = 0; i < queue.length; i++)
    for (const next of nodes[queue[i]].joins) {
      if (!cluster.has(next)) {
        cluster.add(next)
        queue.push(next)
      }
    }
  return cluster
}

export function sourceGateDirection(
  artwork: MazeArtwork,
  edge: PathConnection,
  model: PathMazeDefinition
): DirectionBit | null {
  const gate = artwork.gates?.find((gate) => gate.edge === edge.id)
  if (!gate) return null
  if (edge.operation === 'enter') {
    const frame = artwork.frames.find((frame) => frame.id === edge.copy)
    if (!frame) return null
    const dx = frame.x + frame.width / 2 - gate.from[0],
      dy = frame.y + frame.height / 2 - gate.from[1]
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 4 : 1) : dy > 0 ? 2 : 8
  }
  if (edge.operation === 'exit') {
    if (model.surfaceSymbols?.includes(edge.copy) &&
      artwork.finishes?.some(finish => finish.state.path === edge.to) && distance(gate.from, gate.to) > 1e-7) {
      const dx = gate.to[0] - gate.from[0], dy = gate.to[1] - gate.from[1]
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 4 : 1) : dy > 0 ? 2 : 8
    }
    const [x, y, width, height] =
      artwork.views?.find((view) => view.paths.includes(edge.from))?.bounds ?? artwork.bounds
    const sides: [number, DirectionBit][] = [
      [Math.abs(gate.from[0] - x), 1],
      [Math.abs(gate.from[0] - x - width), 4],
      [Math.abs(gate.from[1] - y), 8],
      [Math.abs(gate.from[1] - y - height), 2],
    ]
    return sides.sort((a, b) => a[0] - b[0])[0][1]
  }
  return null
}
