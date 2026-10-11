import { useId } from 'react'
import { repeatedNeighbors, repeatedPortsAt, repeatedPosition, repeatedStateKey } from '../../model/repeatedDirected'
import type { RepeatedDirectedDefinition, RepeatedState } from '../../model/repeatedDirected'

type Point = { x: number; y: number }
function terminalPoint(def: RepeatedDirectedDefinition, input: RepeatedState): Point {
  const state = repeatedPosition(def, input)
  const offset = (Number(state.terminal.slice(1)) + 1) / (def.terminalsPerSide + 1)
  switch (state.terminal[0]) {
    case 'E': return { x: state.x, y: state.y - 1 + offset }
    case 'W': return { x: state.x - 1, y: state.y - 1 + offset }
    case 'N': return { x: state.x - 1 + offset, y: state.y }
    case 'S': return { x: state.x - 1 + offset, y: state.y - 1 }
    default: {
      const index = Number(state.terminal.slice(1)), columns = Math.ceil(Math.sqrt(def.terminalsPerSide))
      return { x: state.x - .75 + (index % columns) / columns / 2,
        y: state.y - .75 + Math.floor(index / columns) / columns / 2 }
    }
  }
}
function segment(a: Point, b: Point, arrowSize = 0): string {
  const line = `M${a.x},${a.y}L${b.x},${b.y}`
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  if (!arrowSize || !length) return line
  const dx = (b.x - a.x) / length * arrowSize, dy = (b.y - a.y) / length * arrowSize
  return `${line}M${b.x - dx + dy / 2},${b.y - dy - dx / 2}L${b.x},${b.y}L${b.x - dx - dy / 2},${b.y - dy + dx / 2}`
}

function copyFrame(def: RepeatedDirectedDefinition, current: RepeatedState,
  choices: RepeatedState[], all: boolean, preview: boolean) {
  if (all) return {
    x: Math.max(-1, current.x - (preview ? 1 : 2)),
    y: Math.max(-1, current.y - (preview ? 1 : 2)),
    span: preview ? 2 : 4,
  }
  const copies = [current, ...choices].map(state => repeatedPosition(def, state))
  if (!def.zero) copies.push({ ...current,
    x: current.x + (current.terminal[0] === 'E' ? 1 : 0),
    y: current.y + (current.terminal[0] === 'N' ? 1 : 0) })
  const minX = Math.min(...copies.map(copy => copy.x)) - 1
  const minY = Math.min(...copies.map(copy => copy.y)) - 1
  const maxX = Math.max(...copies.map(copy => copy.x))
  const maxY = Math.max(...copies.map(copy => copy.y))
  const span = Math.max(maxX - minX, maxY - minY)
  return { x: (minX + maxX - span) / 2, y: (minY + maxY - span) / 2, span }
}

export function RepeatedRenderer({ def, current, trail = [], detail, preview = false }: {
  def: RepeatedDirectedDefinition; current: RepeatedState; trail?: RepeatedState[]
  detail?: 'all' | 'available'; preview?: boolean
}) {
  const clipId = useId()
  const point = (state: RepeatedState) => terminalPoint(def, state)
  const all = (detail ?? (preview ? 'all' : 'available')) === 'all'
  const active = repeatedPosition(def, current), choices = repeatedNeighbors(def, active)
  const frame = copyFrame(def, active, choices, all, preview)
  const padding = all ? .2 : frame.span * .16
  const minX = frame.x - padding, minY = frame.y - padding, size = frame.span + padding * 2
  const flipY = 2 * frame.y + frame.span
  const copies: Point[] = []
  for (let x = Math.max(-1, Math.floor(frame.x)); x < Math.ceil(frame.x + frame.span); x++)
    for (let y = Math.max(-1, Math.floor(frame.y)); y < Math.ceil(frame.y + frame.span); y++)
      copies.push({ x, y })
  const edges: string[] = []
  if (all) {
    for (const copy of copies) {
      const x = copy.x + 1, y = copy.y + 1
      for (const port of repeatedPortsAt(def, x, y))
        edges.push(segment(point({ x, y, terminal: port.from }), point({ x, y, terminal: port.to }), size * .017))
    }
  } else {
    for (const next of choices) edges.push(segment(point(active), point(next), size * .017))
  }
  const visible = (p: Point) => p.x >= minX && p.x <= minX + size && p.y >= minY && p.y <= minY + size
  const route: string[] = []
  for (let i = 1; i < trail.length; i++) {
    const a = point(trail[i - 1]), b = point(trail[i])
    if (visible(a) || visible(b)) route.push(segment(a, b))
  }
  const position = point(current), goal = point(def.goal)
  return <svg className="repeated-maze" viewBox={`${minX} ${minY} ${size} ${size}`} role="img" aria-label="Directed repeated blocks around the current terminal">
    <defs><clipPath id={clipId}><rect x={frame.x} y={frame.y} width={frame.span} height={frame.span} /></clipPath></defs>
    <rect x={minX} y={minY} width={size} height={size} fill="#fff" />
    <g transform={`translate(0 ${flipY}) scale(1 -1)`}>
      {copies.map(copy => <rect key={`${copy.x},${copy.y}`} x={copy.x} y={copy.y}
        width="1" height="1" fill="#fbfcfa" stroke="#d5ded8" strokeWidth={size * .003} />)}
      <rect className="repeated-current-copy" x={active.x - 1} y={active.y - 1} width="1" height="1"
        fill="#eaf1e5" stroke="#769267" strokeWidth={size * .004} />
      <path className="repeated-connections" d={edges.join('')} fill="none" stroke="#678075" strokeWidth={size * .0035} opacity={all ? .65 : .9} />
      <path d={route.join('')} fill="none" stroke="#d6502f" strokeWidth={size * .007} opacity=".65" clipPath={`url(#${clipId})`} />
      <circle cx={goal.x} cy={goal.y} r={size * .020} fill="#ddb43b" />
      <circle className="repeated-player" cx={position.x} cy={position.y} r={size * .014}
        fill="#d74425" stroke="#fff" strokeWidth={size * .005} />
    </g>
    {copies.map(copy => <text className="repeated-copy-label" key={`${copy.x},${copy.y}`}
      x={copy.x + .1} y={flipY - copy.y - .86} fontSize={size * .033}
      fill="#52644b" stroke="#fbfcfa" strokeWidth={size * .012} paintOrder="stroke">
      ({copy.x + 1}, {copy.y + 1})
    </text>)}
    <text x={minX + size * .03} y={minY + size * .045} fontSize={size * .036} fill="#334c3f">Terminal {repeatedStateKey(active)} · {all ? 'all connections' : 'available connections'}</text>
  </svg>
}
