export type Terminal = `${'N' | 'E' | 'S' | 'W' | 'C'}${number}`
export interface DirectedPort {
  from: Terminal
  to: Terminal
}
export interface RepeatedState {
  x: number
  y: number
  terminal: Terminal
}
export interface RepeatedDirectedDefinition {
  type: 'repeatedDirected'
  terminalsPerSide: number
  normal: DirectedPort[]
  nx: DirectedPort[]
  ny: DirectedPort[]
  zero?: DirectedPort[]
  start: RepeatedState
  providedRoute?: RepeatedState[]
  goal: RepeatedState
}
export function canonicalTerminal(state: RepeatedState): RepeatedState {
  const side = state.terminal[0],
    index = state.terminal.slice(1)
  if (side === 'W') return { x: state.x - 1, y: state.y, terminal: `E${index}` as Terminal }
  if (side === 'S') return { x: state.x, y: state.y - 1, terminal: `N${index}` as Terminal }
  return state
}
export const repeatedStateKey = (state: RepeatedState) => `${state.x},${state.y},${state.terminal}`

/** Atomic mazes count crossing a block boundary as a move; legacy mazes share it. */
export const repeatedPosition = (def: RepeatedDirectedDefinition, state: RepeatedState) =>
  def.zero ? state : canonicalTerminal(state)

export function repeatedPortsAt(def: RepeatedDirectedDefinition, x: number, y: number): DirectedPort[] {
  if (x < 0 || y < 0) return []
  if (!x && !y) return def.zero ?? []
  if (!x) return def.nx
  if (!y) return def.ny
  return def.normal
}

function atomicNeighbors(def: RepeatedDirectedDefinition, state: RepeatedState): RepeatedState[] {
  const result = repeatedPortsAt(def, state.x, state.y)
    .filter((port) => port.from === state.terminal)
    .map((port) => ({ ...state, terminal: port.to }))
  const crossings = {
    W: [-1, 0, 'E'], E: [1, 0, 'W'], N: [0, 1, 'S'], S: [0, -1, 'N'],
  } as const
  const side = state.terminal[0] as keyof typeof crossings
  const crossing = crossings[side]
  if (crossing) {
    const x = state.x + crossing[0], y = state.y + crossing[1]
    if (x >= 0 && y >= 0)
      result.push({ x, y, terminal: `${crossing[2]}${state.terminal.slice(1)}` as Terminal })
  }
  return [...new Map(result.map((next) => [repeatedStateKey(next), next])).values()]
}

export function repeatedNeighbors(
  def: RepeatedDirectedDefinition,
  state: RepeatedState
): RepeatedState[] {
  if (def.zero) return atomicNeighbors(def, state)
  const s = canonicalTerminal(state)
  const side = s.terminal[0],
    index = s.terminal.slice(1)
  const blocks = [
    { x: s.x, y: s.y, terminal: s.terminal },
    side === 'E'
      ? { x: s.x + 1, y: s.y, terminal: `W${index}` }
      : { x: s.x, y: s.y + 1, terminal: `S${index}` },
  ]
  const result = new Map<string, RepeatedState>()
  for (const block of blocks) {
    const ports = repeatedPortsAt(def, block.x, block.y)
    for (const port of ports)
      if (port.from === block.terminal) {
        const next = canonicalTerminal({ x: block.x, y: block.y, terminal: port.to })
        if (next.x >= 0 && next.y >= 0) result.set(repeatedStateKey(next), next)
      }
  }
  return [...result.values()]
}
