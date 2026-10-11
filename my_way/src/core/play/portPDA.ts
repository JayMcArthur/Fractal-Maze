import type { PathMazeDefinition, MazeArtwork, ArtworkTrace, PathConnection } from '../model/pathMaze'
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

/** A corridor layout for rule-only imports, without inventing connections at crossings. */
export function portArtwork(model: PathMazeDefinition): MazeArtwork {
  const copies = model.copies.filter(copy => !model.surfaceSymbols?.includes(copy))
  const paths = model.paths.filter(path => !path.helper)
  const width = 600,
    height = 265 + Math.ceil(copies.length / 5) * 95
  const columns = Math.min(5, copies.length)
  const frames = copies.map((id, i) => ({
    id,
    x: 20 + (i % columns) * (560 / columns),
    y: 240 + Math.floor(i / columns) * 95,
    width: 520 / columns,
    height: 75,
  }))
  const point = (path: string): [number, number] => {
    const helper = model.paths.find(item => item.id === path)?.helper
    const row = helper ? model.connections.find(edge => edge.to === path)!.from : path
    return [helper ? 580 : 20,
      30 + paths.findIndex(item => item.id === row) * 160 / Math.max(1, paths.length - 1)]
  }
  const traces: ArtworkTrace[] = paths.map((path) => ({
    id: `line-${path.id}`,
    path: path.id,
    color: path.color,
    points: [point(path.id), [580, point(path.id)[1]]],
  }))
  const gates = model.connections.map((edge) => {
    const helper = model.paths.find(path => path.id === edge.from && path.helper)
    const fromPath = helper ? model.connections.find(first => first.to === helper.id)!.from : edge.from
    const frame = frames.find((frame) => frame.id === edge.copy)
    const from: [number, number] =
      edge.operation === 'enter' && frame && !helper
        ? [frame.x + frame.width / 2, frame.y]
        : [580, point(fromPath)[1]]
    if (edge.operation === 'enter' && frame && !helper)
      traces.push({
        id: edge.id,
        path: edge.from,
        color: '#eab350',
        points: [[from[0], point(edge.from)[1]], from],
      })
    return { edge: edge.id, from, to: point(edge.to) }
  })
  for (const helper of model.paths.filter(path => path.helper)) {
    const location = point(helper.id)
    traces.push({ id: `point-${helper.id}`, path: helper.id, color: '#eab350', points: [location, location] })
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
  }
}
