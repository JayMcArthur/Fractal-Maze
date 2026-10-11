import { geometricGates, geometricSubWidth, geometricWidth, type GeometricMaze } from '../model/geometricRecursive'
import type { ArtworkTrace, MazeArtwork, PathMazeDefinition } from '../model/pathMaze'
import { distance, type ArtworkPoint } from '../pathMaze/artworkRoutes'
import { geometricPathId } from './geometricPDA'

/** Source points are painted cells, not an ordered route. Follow their four-neighbor graph. */
function pixelTraces(maze: GeometricMaze): ArtworkTrace[] {
  return maze.paths.flatMap((path, index) => {
    const cells = new Map(path.points.filter(point => !point.isHead)
      .map(point => [`${point.x},${point.y}`, [point.x + .5, point.y + .5] as ArtworkPoint]))
    const neighbors = new Map([...cells].map(([id, point]) => [id,
      [[-1, 0], [1, 0], [0, -1], [0, 1]]
        .map(([dx, dy]) => `${point[0] - .5 + dx},${point[1] - .5 + dy}`)
        .filter(next => cells.has(next))]))
    const visited = new Set<string>(), traces: ArtworkTrace[] = []
    const link = (a: string, b: string) => JSON.stringify([a, b].sort())
    const nodes = [...cells.keys()].sort((a, b) =>
      Number(neighbors.get(a)!.length === 2) - Number(neighbors.get(b)!.length === 2))
    const add = (points: ArtworkPoint[]) => traces.push({
      id: `floor-${index}-${traces.length}`, path: String(index), color: path.color,
      points: points.length === 1 ? [points[0], points[0]] : points,
    })
    for (const start of nodes) {
      if (!neighbors.get(start)!.length) add([cells.get(start)!])
      for (const next of neighbors.get(start)!) {
        if (visited.has(link(start, next))) continue
        const points = [cells.get(start)!]
        let previous = start, current = next
        while (true) {
          visited.add(link(previous, current))
          const point = cells.get(current)!, a = points.at(-2), b = points.at(-1)!
          if (a && ((a[0] === b[0] && b[0] === point[0]) ||
            (a[1] === b[1] && b[1] === point[1]))) points.pop()
          points.push(point)
          const onward = neighbors.get(current)!.filter(id => id !== previous)
          if (neighbors.get(current)!.length !== 2 || visited.has(link(current, onward[0]))) break
          previous = current
          current = onward[0]
        }
        add(points)
      }
    }
    return traces
  })
}

/** Keep the original unit-cell layout; resampling can merge different source corridors. */
export function geometricArtwork(maze: GeometricMaze, model: PathMazeDefinition): MazeArtwork {
  const width = geometricWidth(maze.size), size = geometricSubWidth(maze.size)
  const nativeGates = geometricGates(maze)
  const traces = pixelTraces(maze)
  const finishPoint = (gate: string): ArtworkPoint => gate.startsWith('f:') && maze.finish
    ? [maze.finish.x + 2.5, maze.finish.y + 2.5] : anchor(gate)
  const anchor = (gate: string): ArtworkPoint => {
    const drawn = nativeGates.find(item => item.id === gate)!
    const center: ArtworkPoint = [drawn.x + drawn.width / 2, drawn.y + drawn.width / 2]
    const path = maze.paths.find(path => path.gates.includes(gate))
    const points = path?.points.filter(point => !point.isHead)
      .map(point => [point.x + .5, point.y + .5] as ArtworkPoint)
    return points?.length
      ? points.reduce((best, point) => distance(point, center) < distance(best, center) ? point : best)
      : center
  }
  for (const path of model.paths.filter(path => path.id.startsWith('@gate:') || path.id.startsWith('@finish:'))) {
    const gate = path.id.slice(path.id.indexOf(':') + 1), point = anchor(gate)
    traces.push({ id: path.id, path: path.id, color: path.color,
      points: [point, path.id.startsWith('@finish:') ? finishPoint(gate) : point] })
  }
  const gates = model.connections.map(edge => {
    if (edge.id.startsWith('finish:')) {
      const gate = edge.id.slice(7)
      return { edge: edge.id, from: anchor(gate), to: finishPoint(gate), arrivalFrom: anchor(gate) }
    }
    const parent = edge.id.slice(edge.id.indexOf(':') + 1)
    const child = `_:${parent.slice(parent.lastIndexOf(':') + 1)}`
    const outside = anchor(parent), inside = anchor(child)
    return { edge: edge.id,
      from: edge.operation === 'enter' ? outside : inside,
      to: edge.operation === 'enter' ? inside : outside }
  })
  const start = maze.paths.flatMap(path => path.gates).find(gate => gate.startsWith('s:'))
  const goals = [model.goal, ...model.alternateGoals ?? []].filter(goal => goal !== null)
  const finishes = goals.map(state => ({ state, point: finishPoint(state.path.slice(8)) }))
  return {
    asset: '', blockSize: 1, width, height: width, bounds: [0, 0, width, width], traces, gates,
    frames: maze.subMazes.map(copy => ({ ...copy, width: size, height: size })),
    start: start && model.start?.path === geometricPathId(maze, start) ? anchor(start) : undefined,
    goal: finishes[0]?.point, finishes,
  }
}
