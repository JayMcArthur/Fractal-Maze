import type { PathMazeDefinition, MazeArtwork, ArtworkTrace } from '../model/pathMaze'

/** A corridor layout for rule-only imports, without inventing connections at crossings. */
export function ruleArtwork(model: PathMazeDefinition, pointPaths: string[] = []): MazeArtwork {
  const copies = model.copies.filter((copy) => !model.surfaceSymbols?.includes(copy))
  const paths = model.paths.filter((path) => !pointPaths.includes(path.id))
  const span = Math.max(160, (paths.length - 1) * 30),
    frameY = span + 80
  const width = 600,
    height = frameY + 25 + Math.ceil(copies.length / 5) * 95
  const columns = Math.min(5, copies.length)
  const frames = copies.map((id, i) => ({
    id,
    x: 20 + (i % columns) * (560 / columns),
    y: frameY + Math.floor(i / columns) * 95,
    width: 520 / columns,
    height: 75,
  }))
  const exits = model.connections.filter(
    (edge) =>
      !pointPaths.includes(edge.from) &&
      !(edge.operation === 'enter' && frames.some((frame) => frame.id === edge.copy))
  )
  const exitPoint = (edge: (typeof model.connections)[number]): [number, number] => {
    const ports = exits.filter((port) => port.from === edge.from)
    return [20 + ((ports.indexOf(edge) + 1) * 560) / (ports.length + 1), 0]
  }
  const point = (path: string): [number, number] => {
    const helper = pointPaths.includes(path)
    if (helper) return exitPoint(model.connections.find((edge) => edge.to === path)!)
    return [
      20,
      30 + (paths.findIndex((item) => item.id === path) * span) / Math.max(1, paths.length - 1),
    ]
  }
  const traces: ArtworkTrace[] = paths.map((path) => ({
    id: `line-${path.id}`,
    path: path.id,
    color: path.color,
    points: [point(path.id), [580, point(path.id)[1]]],
  }))
  const gates = model.connections.map((edge) => {
    const helper = pointPaths.includes(edge.from)
    const frame = frames.find((frame) => frame.id === edge.copy)
    let from: [number, number]
    if (edge.operation === 'walk') {
      const origin = point(edge.from),
        to = point(edge.to)
      traces.push({
        id: edge.id,
        path: edge.from,
        color: '#eab350',
        directed: true,
        points: [[580, origin[1]], [0, origin[1]], [0, to[1]], to],
      })
      return { edge: edge.id, from: to, to }
    }
    if (helper) from = point(edge.from)
    else if (edge.operation === 'enter' && frame) {
      const ports = model.connections.filter(
        (port) =>
          port.operation === 'enter' && port.copy === edge.copy && !pointPaths.includes(port.from)
      )
      from = [frame.x + ((ports.indexOf(edge) + 1) * frame.width) / (ports.length + 1), frame.y]
    } else from = exitPoint(edge)
    if (!helper)
      traces.push({
        id: edge.id,
        path: edge.from,
        color: '#eab350',
        points: [[from[0], point(edge.from)[1]], from],
      })
    return { edge: edge.id, from, to: point(edge.to) }
  })
  for (const helper of model.paths.filter((path) => pointPaths.includes(path.id))) {
    const location = point(helper.id)
    traces.push({
      id: `point-${helper.id}`,
      path: helper.id,
      color: '#eab350',
      points: [location, location],
    })
  }
  return {
    asset: '',
    width,
    height,
    bounds: [0, 0, width, height],
    frames,
    traces,
    gates,
    start: model.start ? point(model.start.path) : undefined,
    goal: model.goal ? [580, point(model.goal.path)[1]] : undefined,
    finishes: model.alternateGoals?.map((state) => ({ state, point: [580, point(state.path)[1]] })),
  }
}
