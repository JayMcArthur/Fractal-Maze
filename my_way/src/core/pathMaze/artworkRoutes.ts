import type { ArtworkTrace, MazeArtwork } from '../model/pathMaze'

export type ArtworkPoint = [number, number]
export const distance = (a: ArtworkPoint, b: ArtworkPoint) => Math.hypot(a[0] - b[0], a[1] - b[1])

export function projectPoint(point: ArtworkPoint, a: ArtworkPoint, b: ArtworkPoint): ArtworkPoint {
  const dx = b[0] - a[0],
    dy = b[1] - a[1]
  const t = Math.max(
    0,
    Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))
  )
  return [a[0] + t * dx, a[1] + t * dy]
}

export function nearestTracePoint(traces: ArtworkTrace[], point: ArtworkPoint) {
  let best: { point: ArtworkPoint; trace: ArtworkTrace; segment: number; distance: number } | null =
    null
  for (const trace of traces)
    for (let i = 1; i < trace.points.length; i++) {
      const candidate = projectPoint(point, trace.points[i - 1], trace.points[i])
      const d = distance(candidate, point)
      if (!best || d < best.distance)
        best = { point: candidate, trace, segment: i - 1, distance: d }
    }
  return best
}

interface ArtworkNode {
  point: ArtworkPoint
  next: number[]
  joins: number[]
  stop: boolean
}
/** Wires join at endpoints; undirected block floors also join at interior meetings. */
export function artworkGraph(
  artwork: MazeArtwork,
  path: string,
  marker: ArtworkPoint,
  stops: ArtworkPoint[]
) {
  const traces = artwork.traces.filter((trace) => trace.path === path)
  const nodes: ArtworkNode[] = [],
    indices = traces.map((trace) =>
      trace.points.map((point) => {
        nodes.push({ point, next: [], joins: [], stop: false })
        return nodes.length - 1
      })
    )
  const splits = traces.map((trace) => trace.points.slice(1).map(() => [] as number[]))
  const tolerance = artwork.bounds[2] / 400
  const connect = (a: number, b: number, directed = false) => {
    if (!nodes[a].next.includes(b)) nodes[a].next.push(b)
    if (!directed && !nodes[b].next.includes(a)) nodes[b].next.push(a)
  }
  const attachSegment = (point: ArtworkPoint, index: number, segment: number) => {
    const a = indices[index][segment],
      b = indices[index][segment + 1]
    if (distance(point, nodes[a].point) < 1e-7) return a
    if (distance(point, nodes[b].point) < 1e-7) return b
    const existing = splits[index][segment].find((id) => distance(nodes[id].point, point) < 1e-7)
    if (existing !== undefined) return existing
    nodes.push({ point, next: [], joins: [], stop: false })
    const id = nodes.length - 1
    splits[index][segment].push(id)
    return id
  }
  const attach = (point: ArtworkPoint) => {
    const hit = nearestTracePoint(traces, point)
    return hit ? attachSegment(hit.point, traces.indexOf(hit.trace), hit.segment) : null
  }
  traces.forEach((trace, index) => {
    const junctions = artwork.blockSize && !trace.directed
      ? trace.points.map((_, i) => i)
      : [0, trace.points.length - 1]
    for (const endpoint of junctions) {
      const a = indices[index][endpoint]
      for (const other of traces) {
        if (trace === other) continue
        const hit = nearestTracePoint([other], trace.points[endpoint])!
        if (hit.distance > tolerance) continue
        const otherIndex = traces.indexOf(other)
        const b =
          distance(hit.point, other.points[hit.segment]) < 1e-7
            ? indices[otherIndex][hit.segment]
            : distance(hit.point, other.points[hit.segment + 1]) < 1e-7
              ? indices[otherIndex][hit.segment + 1]
              : (() => {
                  const existing = splits[otherIndex][hit.segment].find(
                    (id) => distance(nodes[id].point, hit.point) < 1e-7
                  )
                  if (existing !== undefined) return existing
                  nodes.push({ point: hit.point, next: [], joins: [], stop: false })
                  splits[otherIndex][hit.segment].push(nodes.length - 1)
                  return nodes.length - 1
                })()
        nodes[a].joins.push(b)
        nodes[b].joins.push(a)
      }
    }
  })
  const markerNode = attach(marker)
  const stopNodes: (number | null)[] = []
  for (const point of stops) {
    const hit = nearestTracePoint(traces, point)
    const id = hit && hit.distance <= tolerance ? attach(point) : null
    stopNodes.push(id)
    if (id !== null) nodes[id].stop = true
  }
  if (artwork.blockSize) joinBlockFloors(traces, nodes, attachSegment)
  traces.forEach((trace, index) => {
    for (let segment = 0; segment < trace.points.length - 1; segment++) {
      const a = indices[index][segment],
        b = indices[index][segment + 1]
      const ordered = [
        a,
        ...splits[index][segment].sort(
          (x, y) =>
            distance(nodes[a].point, nodes[x].point) - distance(nodes[a].point, nodes[y].point)
        ),
        b,
      ]
      for (let i = 1; i < ordered.length; i++) connect(ordered[i - 1], ordered[i], trace.directed)
    }
  })
  return { nodes, markerNode, stopNodes }
}

function joinBlockFloors(
  traces: ArtworkTrace[],
  nodes: ArtworkNode[],
  attach: (point: ArtworkPoint, trace: number, segment: number) => number
) {
  const join = (a: number, b: number) => {
    if (!nodes[a].joins.includes(b)) nodes[a].joins.push(b)
    if (!nodes[b].joins.includes(a)) nodes[b].joins.push(a)
  }
  const segments = traces.flatMap((trace, index) =>
    trace.points.slice(1).map((point, segment) => ({
      trace: index,
      directed: !!trace.directed,
      segment,
      a: trace.points[segment],
      b: point,
    }))
  )
  for (let i = 0; i < segments.length; i++)
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i],
        b = segments[j]
      if (a.directed || b.directed) continue
      const point = orthogonalIntersection(a.a, a.b, b.a, b.b)
      if (point) join(attach(point, a.trace, a.segment), attach(point, b.trace, b.segment))
    }
  // A marker or gate can split overlapping floors away from their original vertices.
  const points = nodes.map((node) => node.point)
  for (const point of points) {
    const horizontal: number[] = [], vertical: number[] = [], floors: number[] = []
    for (const segment of segments) {
      const hit = projectPoint(point, segment.a, segment.b)
      if (distance(hit, point) >= 1e-7) continue
      const alias = attach(point, segment.trace, segment.segment)
      const aligned = segment.a[1] === segment.b[1] ? horizontal : vertical
      aligned.push(alias)
      if (!segment.directed) floors.push(alias)
    }
    for (const aliases of [horizontal, vertical, floors])
      for (let i = 1; i < aliases.length; i++) join(aliases[0], aliases[i])
  }
}

function orthogonalIntersection(
  a: ArtworkPoint,
  b: ArtworkPoint,
  c: ArtworkPoint,
  d: ArtworkPoint
): ArtworkPoint | null {
  const horizontal = a[1] === b[1]
  if (horizontal === (c[1] === d[1])) return null
  const x = horizontal ? c[0] : a[0],
    y = horizontal ? a[1] : c[1]
  return x >= Math.min(a[0], b[0]) &&
    x <= Math.max(a[0], b[0]) &&
    x >= Math.min(c[0], d[0]) &&
    x <= Math.max(c[0], d[0]) &&
    y >= Math.min(a[1], b[1]) &&
    y <= Math.max(a[1], b[1]) &&
    y >= Math.min(c[1], d[1]) &&
    y <= Math.max(c[1], d[1])
    ? [x, y]
    : null
}

/** Route walking, pointer travel and replay validation share the same directed junction graph. */
export function artworkRoute(
  artwork: MazeArtwork,
  path: string,
  from: ArtworkPoint,
  to: ArtworkPoint
): ArtworkPoint[] | null {
  const traces = artwork.traces.filter((trace) => trace.path === path)
  const a = nearestTracePoint(traces, from),
    b = nearestTracePoint(traces, to)
  if (!a || !b) return null
  const { nodes, markerNode: start, stopNodes } = artworkGraph(artwork, path, a.point, [b.point])
  const finish = stopNodes[0]
  if (start === null || finish === null) return null
  const costs = nodes.map(() => Infinity),
    parents = nodes.map(() => -1),
    visited = new Set<number>()
  costs[start] = 0
  while (visited.size < nodes.length) {
    let node = -1
    for (let i = 0; i < nodes.length; i++)
      if (!visited.has(i) && (node < 0 || costs[i] < costs[node])) node = i
    if (node < 0 || costs[node] === Infinity) return null
    if (node === finish) {
      const route = [nodes[node].point]
      while (parents[node] >= 0) {
        node = parents[node]
        route.unshift(nodes[node].point)
      }
      return route
    }
    visited.add(node)
    for (const next of [...nodes[node].next, ...nodes[node].joins]) {
      const cost = costs[node] + distance(nodes[node].point, nodes[next].point)
      if (!visited.has(next) && cost < costs[next]) {
        costs[next] = cost
        parents[next] = node
      }
    }
  }
  return null
}

export function pointAlongRoute(route: ArtworkPoint[], travel: number): ArtworkPoint {
  for (let i = 1; i < route.length; i++) {
    const length = distance(route[i - 1], route[i])
    if (travel <= length) {
      const t = length ? travel / length : 0
      return [
        route[i - 1][0] + t * (route[i][0] - route[i - 1][0]),
        route[i - 1][1] + t * (route[i][1] - route[i - 1][1]),
      ]
    }
    travel -= length
  }
  return route.at(-1)!
}
