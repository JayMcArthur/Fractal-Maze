import type { MazeArtwork, PathMazeDefinition } from '../model/pathMaze'
import type { ArtworkPoint } from '../pathMaze/artworkRoutes'
import { createBlockArtwork } from './blockArtwork'
import { sourceGateDirection } from './sourceWalking'

/** Shorten straight corridors with monotone grid maps; never merge distinct feature levels. */
export function compactBlockArtwork(source: MazeArtwork, model: PathMazeDefinition): MazeArtwork {
  const artwork = createBlockArtwork(source, model)
  const points: ArtworkPoint[] = [
    [0, 0],
    [artwork.width, artwork.height],
  ]
  const rectangle = ([x, y, width, height]: number[]) => {
    points.push([x, y], [x + width, y + height])
  }
  rectangle(artwork.bounds)
  for (const trace of artwork.traces) points.push(...trace.points)
  for (const frame of artwork.frames) rectangle([frame.x, frame.y, frame.width, frame.height])
  for (const view of artwork.views ?? []) rectangle(view.bounds)
  for (const gate of artwork.gates ?? []) {
    points.push(gate.from, gate.to)
    if (gate.arrivalFrom) points.push(gate.arrivalFrom)
  }
  if (artwork.start) points.push(artwork.start)
  if (artwork.goal) points.push(artwork.goal)
  for (const finish of artwork.finishes ?? []) points.push(finish.point)
  const x = compactAxis(
    points.map((point) => point[0]),
    artwork.blockSize!
  )
  const y = compactAxis(
    points.map((point) => point[1]),
    artwork.blockSize!
  )
  const shrinkX = [...x].some(([before, after]) => before !== after)
  const shrinkY = [...y].some(([before, after]) => before !== after)
  if (!shrinkX && !shrinkY) return artwork
  // A self-similar port may constrain one axis even when the other can shrink.
  for (const axes of [
    [shrinkX, shrinkY],
    [shrinkX, false],
    [false, shrinkY],
  ]) {
    if (!axes.some(Boolean)) continue
    const point = ([a, b]: ArtworkPoint): ArtworkPoint => [
      axes[0] ? x.get(a)! : a,
      axes[1] ? y.get(b)! : b,
    ]
    const candidate = mapArtwork(artwork, point)
    if (preservesPorts(artwork, candidate, model)) return candidate
  }
  return artwork
}

function compactAxis(values: number[], cell: number) {
  const levels = [...new Set(values)].sort((a, b) => a - b)
  let removed = 0
  return new Map(
    levels.map((level, index) => {
      if (index)
        removed += Math.max(0, Math.floor((level - levels[index - 1]) / cell + 1e-8) - 2) * cell
      return [level, level - removed]
    })
  )
}

function mapArtwork(
  artwork: MazeArtwork,
  point: (value: ArtworkPoint) => ArtworkPoint
): MazeArtwork {
  const rectangle = ([x, y, width, height]: number[]): [number, number, number, number] => {
    const a = point([x, y]),
      b = point([x + width, y + height])
    return [a[0], a[1], b[0] - a[0], b[1] - a[1]]
  }
  const origin = point([0, 0]),
    size = point([artwork.width, artwork.height])
  return {
    ...artwork,
    width: size[0] - origin[0],
    height: size[1] - origin[1],
    bounds: rectangle(artwork.bounds),
    traces: artwork.traces.map((trace) => ({
      id: trace.id,
      path: trace.path,
      color: trace.color,
      directed: trace.directed,
      points: trace.points.map(point),
    })),
    frames: artwork.frames.map((frame) => {
      const [x, y, width, height] = rectangle([frame.x, frame.y, frame.width, frame.height])
      return { ...frame, x, y, width, height }
    }),
    gates: artwork.gates?.map((gate) => ({
      ...gate,
      from: point(gate.from),
      to: point(gate.to),
      arrivalFrom: gate.arrivalFrom ? point(gate.arrivalFrom) : undefined,
    })),
    views: artwork.views?.map((view) => ({ ...view, bounds: rectangle(view.bounds) })),
    start: artwork.start ? point(artwork.start) : undefined,
    goal: artwork.goal ? point(artwork.goal) : undefined,
    finishes: artwork.finishes?.map((finish) => ({ ...finish, point: point(finish.point) })),
  }
}

function preservesPorts(before: MazeArtwork, after: MazeArtwork, model: PathMazeDefinition) {
  return (before.gates ?? []).every((gate, index) => {
    const edge = model.connections.find((edge) => edge.id === gate.edge)
    if (!edge) return true
    if (sourceGateDirection(before, edge, model) !== sourceGateDirection(after, edge, model))
      return false
    if (edge.operation === 'walk') return true
    const frameIndex = before.frames.findIndex((frame) => frame.id === edge.copy)
    if (frameIndex < 0) return true
    const entering = edge.operation === 'enter'
    const childPath = entering ? edge.to : edge.from
    const oldBounds =
      before.views?.find((view) => view.paths.includes(childPath))?.bounds ?? before.bounds
    const newBounds =
      after.views?.find((view) => view.paths.includes(childPath))?.bounds ?? after.bounds
    const oldFrame = before.frames[frameIndex],
      newFrame = after.frames[frameIndex]
    const oldParent = entering ? gate.from : (gate.arrivalFrom ?? gate.to)
    const newGate = after.gates![index]
    const newParent = entering ? newGate.from : (newGate.arrivalFrom ?? newGate.to)
    const oldChild = entering ? gate.to : gate.from,
      newChild = entering ? newGate.to : newGate.from
    return [0, 1].every((axis) => {
      const start = axis ? 'y' : 'x',
        length = axis ? 'height' : 'width'
      const parent = (oldParent[axis] - oldFrame[start]) / oldFrame[length]
      const child = (oldChild[axis] - oldBounds[axis]) / oldBounds[axis + 2]
      if (Math.abs(parent - child) > 1e-6) return true
      const mappedParent = (newParent[axis] - newFrame[start]) / newFrame[length]
      const mappedChild = (newChild[axis] - newBounds[axis]) / newBounds[axis + 2]
      return Math.abs(mappedParent - mappedChild) < 1e-6
    })
  })
}
