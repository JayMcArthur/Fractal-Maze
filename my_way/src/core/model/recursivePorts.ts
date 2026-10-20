/** Exact transition semantics of the bundled Koteitan C++ port solvers. */
export interface PortState {
  blocks: number[]
  port: number
}
export interface RecursivePortsDefinition {
  type: 'recursivePorts'
  blocks: string[]
  rules: number[][] // from block, from port, depth change, to block, to port
  providedRoute?: PortState[]
  start: PortState
  goal: PortState
  stayKeepsBlock: boolean
}
export const portStateKey = (state: PortState) => `${state.blocks.join('.')}:${state.port}`
export function portMoves(def: RecursivePortsDefinition, state: PortState, maxDepth = Infinity) {
  const result: { rule: number; state: PortState; label: string }[] = []
  def.rules.forEach(([fromBlock, fromPort, change, toBlock, toPort], rule) => {
    // The reference matches block identity only on upward transitions.
    if (fromPort !== state.port || (change === -1 && fromBlock !== state.blocks.at(-1))) return
    if (change === 1 && state.blocks.length - 1 >= maxDepth) return
    if (change === -1 && state.blocks.length === 1) return
    const blocks =
      change === 1
        ? [...state.blocks, toBlock]
        : change === -1
          ? state.blocks.slice(0, -1)
          : def.stayKeepsBlock
            ? [...state.blocks]
            : [...state.blocks.slice(0, -1), toBlock]
    const next = { blocks, port: toPort }
    result.push({
      rule,
      state: next,
      label: `${change === 1 ? 'Enter' : change === -1 ? 'Leave' : 'Cross'} ${def.blocks[blocks.at(-1)!]} · port ${toPort}`,
    })
  })
  return result
}
