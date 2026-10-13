import type { PathMazeDefinition, PathConnection } from '../model/pathMaze'
import type { RecursivePortsDefinition, PortState } from '../model/recursivePorts'

const mutableRoot = (def: RecursivePortsDefinition) =>
  (!def.stayKeepsBlock && def.rules.some(rule => rule[2] === 0)) || def.start.blocks[0] !== def.goal.blocks[0]

function surfaceSymbols(def: RecursivePortsDefinition) {
  let prefix = '@surface:'
  while (def.blocks.some(block => block.startsWith(prefix))) prefix = '@' + prefix
  return def.blocks.map((_, index) => prefix + index)
}

export const portPathState = (def: RecursivePortsDefinition, state: PortState) => ({
  path: String(state.port),
  address: [
    ...(mutableRoot(def) ? [surfaceSymbols(def)[state.blocks[0]]] : []),
    ...state.blocks.slice(1).map((block) => def.blocks[block]),
  ],
})

/** Port rules use the same enter/pop/walk operations as image and corridor mazes. */
export function compilePortPDA(def: RecursivePortsDefinition): PathMazeDefinition {
  const roots = mutableRoot(def) ? surfaceSymbols(def) : []
  const connections: PathConnection[] = []
  const helpers: PathMazeDefinition['paths'] = []
  def.rules.forEach(([fromBlock, fromPort, change, toBlock, toPort], rule) => {
    if (change === -1 && fromBlock === -1) return
    const base = { input: '', evidence: 'Original directed transition rule' }
    if (change !== 0 || def.stayKeepsBlock) {
      connections.push({ ...base, id: `rule-${rule}`, from: String(fromPort), to: String(toPort),
        operation: change === 1 ? 'enter' : change === -1 ? 'exit' : 'walk',
        copy: change === 1 ? def.blocks[toBlock] : change === -1 ? def.blocks[fromBlock] : '' })
      return
    }
    // Replace exactly one symbol. Distinct surface symbols prevent leaving the root.
    for (const [index, copy] of [...def.blocks, ...roots].entries()) {
      const helper = `@replace:${rule}:${index}`
      helpers.push({ id: helper, label: 'Copy crossing', color: '#eab350', helper: true })
      connections.push(
        { ...base, id: `rule-${rule}-${index}-pop`, from: String(fromPort), to: helper,
          operation: 'exit', copy },
        { ...base, id: `rule-${rule}-${index}-push`, from: helper, to: String(toPort),
          operation: 'enter', copy: index < def.blocks.length ? def.blocks[toBlock] : roots[toBlock] }
      )
    }
  })
  const ports = [
    ...new Set([def.start.port, def.goal.port, ...def.rules.flatMap((rule) => [rule[1], rule[4]])]),
  ].sort((a, b) => a - b)
  return {
    type: 'pathPushdown',
    paths: [...ports.map((port) => ({
      id: String(port),
      label: String(port),
      color: '#eab350',
      helper: false,
    })), ...helpers],
    copies: [...def.blocks, ...roots],
    ...(roots.length ? { surfaceSymbols: roots } : {}),
    connections,
    start: portPathState(def, def.start),
    goal: portPathState(def, def.goal),
    allowedRule: 'finite',
    claims: [],
    review: 'reviewed',
    notes: [],
  }
}
