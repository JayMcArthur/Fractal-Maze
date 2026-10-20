import type { MazeArtwork, PathConnection, PathMazeDefinition, CopyFrame } from '../model/pathMaze'
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
    return targets.filter((id) => {
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
      const travelled = route
        .slice(1)
        .reduce((total, point, i) => total + distance(route[i], point), 0)
      const remaining = artwork.blockSize - travelled
      const length = distance(previousPoint, next)
      if (length >= remaining - 1e-7) {
        const t = Math.min(1, remaining / length)
        route.push([
          previousPoint[0] + t * (next[0] - previousPoint[0]),
          previousPoint[1] + t * (next[1] - previousPoint[1]),
        ])
        break
      }
    }
    route.push(nodes[node].point)
    const next = neighbors(node, previous)
    if ([...joinedNodes(nodes, node)].some((id) => nodes[id].stop) || next.length !== 1) break
    previous = node
    node = next[0]
  }
  return route.length > 1 ? route : null
}

function joinedNodes(nodes: ReturnType<typeof artworkGraph>['nodes'], node: number) {
  const cluster = new Set([node]),
    queue = [node]
  for (let i = 0; i < queue.length; i++)
    for (const next of nodes[queue[i]].joins) {
      if (!cluster.has(next)) {
        cluster.add(next)
        queue.push(next)
      }
    }
  return cluster
}

type ArtworkGate = NonNullable<MazeArtwork['gates']>[number]

function axisDirection(dx: number, dy: number): DirectionBit {
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 4 : 1) : dy > 0 ? 2 : 8
}

function entryDirection(frame: CopyFrame, point: ArtworkPoint): DirectionBit {
  const borders: [number, DirectionBit][] = [
    [Math.abs(point[1] - frame.y), 2],
    [Math.abs(point[1] - frame.y - frame.height), 8],
    [Math.abs(point[0] - frame.x), 4],
    [Math.abs(point[0] - frame.x - frame.width), 1],
  ]
  if (
    point[0] >= frame.x &&
    point[0] <= frame.x + frame.width &&
    point[1] >= frame.y &&
    point[1] <= frame.y + frame.height
  ) {
    const nearest = borders.sort((a, b) => a[0] - b[0])[0]
    if (nearest[0] < 1e-6) return nearest[1]
  }
  return axisDirection(frame.x + frame.width / 2 - point[0], frame.y + frame.height / 2 - point[1])
}

/** A room door without a copy frame continues its unique incoming corridor. */
function terminalDirection(
  artwork: MazeArtwork,
  path: string,
  point: ArtworkPoint
): DirectionBit | null {
  const directions = new Set<DirectionBit>()
  for (const trace of artwork.traces.filter((trace) => trace.path === path)) {
    const approaches = trace.directed ? [trace.points] : [trace.points, [...trace.points].reverse()]
    for (const points of approaches) {
      if (distance(points.at(-1)!, point) > 1e-6) continue
      const previous = points
        .slice(0, -1)
        .reverse()
        .find((previous) => distance(previous, point) > 1e-6)
      if (previous) directions.add(axisDirection(point[0] - previous[0], point[1] - previous[1]))
    }
  }
  return directions.size === 1 ? [...directions][0] : null
}

function exitDirection(
  artwork: MazeArtwork,
  edge: PathConnection,
  model: PathMazeDefinition,
  gate: ArtworkGate
): DirectionBit {
  if (
    model.surfaceSymbols?.includes(edge.copy) &&
    artwork.finishes?.some((finish) => finish.state.path === edge.to) &&
    distance(gate.from, gate.to) > 1e-7
  )
    return axisDirection(gate.to[0] - gate.from[0], gate.to[1] - gate.from[1])
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

function walkDirection(
  artwork: MazeArtwork,
  edge: PathConnection,
  gate: ArtworkGate
): DirectionBit | null {
  const trace = artwork.traces.find(
    (trace) =>
      trace.path === edge.from && trace.directed && distance(trace.points.at(-1)!, gate.from) < 1e-6
  )
  const from =
    trace?.points
      .slice(0, -1)
      .reverse()
      .find((point) => distance(point, gate.from) > 1e-6) ?? gate.from
  const to = trace ? gate.from : gate.to
  const dx = to[0] - from[0],
    dy = to[1] - from[1]
  return dx || dy ? axisDirection(dx, dy) : null
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
    return frame
      ? entryDirection(frame, gate.from)
      : terminalDirection(artwork, edge.from, gate.from)
  }
  if (edge.operation === 'exit') return exitDirection(artwork, edge, model, gate)
  return walkDirection(artwork, edge, gate)
}
