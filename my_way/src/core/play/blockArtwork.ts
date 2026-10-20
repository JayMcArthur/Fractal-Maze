import type { ArtworkTrace, MazeArtwork, PathMazeDefinition } from '../model/pathMaze'
import { distance, nearestTracePoint, type ArtworkPoint } from '../pathMaze/artworkRoutes'
import { artworkDisplayGeometry } from '../pathMaze/artworkDisplayGeometry'

/** Change only the drawing. All paths, directed strokes and PDA gate IDs retain their meaning. */
export function createBlockArtwork(source: MazeArtwork, model: PathMazeDefinition): MazeArtwork {
  if (source.blockSize) return source
  const display = artworkDisplayGeometry(source)
  const cell = Math.min(display.bounds[2], ...source.views?.map(view => view.bounds[2]) ?? []) / 64
  const origin: ArtworkPoint = [display.bounds[0], display.bounds[1]]
  const snap = (point: ArtworkPoint): ArtworkPoint => [
    origin[0] + Math.round((point[0] - origin[0]) / cell) * cell,
    origin[1] + Math.round((point[1] - origin[1]) / cell) * cell,
  ]
  const anchors = pathAnchors(source, model)
  const bounds = ([x, y, width, height]: number[]): [number, number, number, number] => {
    const a = snap([x, y]), b = snap([x + width, y + height])
    return [a[0] - cell / 2, a[1] - cell / 2, b[0] - a[0] + cell, b[1] - a[1] + cell]
  }
  return {
    asset: '',
    blockSize: cell,
    width: display.width,
    height: display.height,
    bounds: bounds(display.bounds),
    traces: source.traces.map(trace => ({
      id: trace.id, path: trace.path, color: trace.color, directed: trace.directed,
      points: orthogonalPoints(splitAtAnchors(trace, anchors.get(trace.path) ?? [], display.bounds[2] / 400).map(snap), trace.directed),
    })),
    frames: source.frames.map(frame => {
      const a = snap([frame.x, frame.y]), b = snap([frame.x + frame.width, frame.y + frame.height])
      return { id: frame.id, x: a[0], y: a[1], width: Math.max(cell, b[0] - a[0]), height: Math.max(cell, b[1] - a[1]) }
    }),
    gates: source.gates?.map(gate => ({
      edge: gate.edge, from: snap(gate.from), to: snap(gate.to),
      arrivalFrom: gate.arrivalFrom ? snap(gate.arrivalFrom) : undefined,
    })),
    start: source.start ? snap(source.start) : undefined,
    goal: source.goal ? snap(source.goal) : undefined,
    finishes: source.finishes?.map(finish => ({ ...finish, point: snap(finish.point) })),
    views: source.views?.map(view => ({ paths: view.paths, bounds: bounds(view.bounds) })),
  }
}

export function blockCamera(bounds: number[], point: ArtworkPoint, cell: number): number[] {
  const width = Math.min(bounds[2], cell * 32), height = Math.min(bounds[3], cell * 32)
  return [
    Math.max(bounds[0], Math.min(point[0] - width / 2, bounds[0] + bounds[2] - width)),
    Math.max(bounds[1], Math.min(point[1] - height / 2, bounds[1] + bounds[3] - height)),
    width, height,
  ]
}

function pathAnchors(artwork: MazeArtwork, model: PathMazeDefinition) {
  const anchors = new Map<string, ArtworkPoint[]>()
  const add = (path: string, point?: ArtworkPoint) => {
    if (point) anchors.set(path, [...anchors.get(path) ?? [], point])
  }
  for (const trace of artwork.traces) {
    add(trace.path, trace.points[0])
    add(trace.path, trace.points.at(-1))
  }
  for (const gate of artwork.gates ?? []) {
    const edge = model.connections.find(edge => edge.id === gate.edge)
    if (!edge) continue
    add(edge.from, gate.from)
    add(edge.to, gate.to)
    add(edge.to, gate.arrivalFrom)
  }
  if (model.start) add(model.start.path, artwork.start)
  if (model.goal) add(model.goal.path, artwork.goal)
  for (const finish of artwork.finishes ?? []) add(finish.state.path, finish.point)
  return anchors
}

/** Keep interior gates and existing endpoint junctions on the changed geometry. */
function splitAtAnchors(trace: ArtworkTrace, anchors: ArtworkPoint[], tolerance: number) {
  const splits = trace.points.slice(1).map(() => [] as ArtworkPoint[])
  for (const point of anchors) {
    const hit = nearestTracePoint([trace], point)
    if (hit && hit.distance <= tolerance) splits[hit.segment].push(point)
  }
  return trace.points.flatMap((point, i) => [
    point,
    ...(splits[i] ?? []).sort((a, b) => distance(point, a) - distance(point, b)),
  ])
}

function orthogonalPoints(points: ArtworkPoint[], directed = false): ArtworkPoint[] {
  const result: ArtworkPoint[] = []
  const append = (point: ArtworkPoint) => {
    const b = result.at(-1), a = result.at(-2)
    if (b && distance(b, point) < 1e-7) return
    if (a && b &&
      ((a[0] === b[0] && b[0] === point[0] && (b[1] - a[1]) * (point[1] - b[1]) >= 0) ||
       (a[1] === b[1] && b[1] === point[1] && (b[0] - a[0]) * (point[0] - b[0]) >= 0)))
      result.pop()
    result.push(point)
  }
  for (const point of points) {
    const previous = result.at(-1)
    if (previous && previous[0] !== point[0] && previous[1] !== point[1]) {
      const horizontal = Math.abs(previous[0] - point[0]) >= Math.abs(previous[1] - point[1])
      // Opposite arrows on one source wire must use the same bend in reverse.
      const firstHorizontal = directed && previous[1] > point[1] ? !horizontal : horizontal
      append(firstHorizontal ? [point[0], previous[1]] : [previous[0], point[1]])
    }
    append(point)
  }
  if (result.length === 1) result.push(result[0])
  return result
}
