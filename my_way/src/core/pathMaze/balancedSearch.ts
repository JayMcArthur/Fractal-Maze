import type { PathMazeDefinition, PathState } from '../model/pathMaze'
import { applyConnection, type PathRoute } from './traversal'
import { balancedEndpoints } from './balancedEndpoints'

interface Witness {
  kind: 'empty' | 'edge' | 'join' | 'copy'
  length: number
  edge?: string
  first?: Witness
  second?: Witness
  exit?: string
}
const empty: Witness = { kind: 'empty', length: 0 }

/** Least fixed point of finite, balanced copy routes. No recursion-depth bound is used. */
export function balancedPathSearch(model: PathMazeDefinition): PathRoute | null {
  if (!model.start || !model.goal) throw new Error('PDA search requires start and finish states.')
  const query = balancedEndpoints(model)
  const { routes, indices } = balancedRelation(query.model, query.virtual)
  const witness = routes[indices.get(query.model.start.path)!][indices.get(query.model.goal.path)!]
  if (!witness) return null
  if (witness.length > 1000000)
    throw new Error(
      'The finite witness exceeds one million transitions. Reachability is established, but this route is too large to play.'
    )
  const edges = expandWitness(witness).filter(edge => !query.virtual.has(edge))
  const states: PathState[] = [model.start]
  const byId = new Map(model.connections.map((edge) => [edge.id, edge]))
  for (const id of edges) states.push(applyConnection(states.at(-1)!, byId.get(id)!)!)
  return { states, edges }
}

function balancedRelation(model: PathMazeDefinition, virtual: Set<string>) {
  const indices = new Map(model.paths.map((path, index) => [path.id, index]))
  const size = model.paths.length
  const routes: (Witness | null)[][] = model.paths.map((_, i) =>
    model.paths.map((_, j) => (i === j ? empty : null))
  )
  const update = (from: string, to: string, witness: Witness) => {
    const row = routes[indices.get(from)!],
      index = indices.get(to)!
    if (row[index] && row[index]!.length <= witness.length) return false
    row[index] = witness
    return true
  }
  for (const edge of model.connections.filter((edge) => edge.operation === 'walk'))
    update(edge.from, edge.to, { kind: 'edge', edge: edge.id, length: virtual.has(edge.id) ? 0 : 1 })
  const entries = model.connections.filter((edge) => edge.operation === 'enter'),
    exits = model.connections.filter((edge) => edge.operation === 'exit')
  let changed = true
  while (changed) {
    changed = false
    for (const enter of entries)
      for (const exit of exits) {
        if (enter.copy !== exit.copy) continue
        const child = routes[indices.get(enter.to)!][indices.get(exit.from)!]
        if (
          child &&
          update(enter.from, exit.to, {
            kind: 'copy',
            edge: enter.id,
            exit: exit.id,
            first: child,
            length: child.length + (virtual.has(enter.id) ? 0 : 1) + (virtual.has(exit.id) ? 0 : 1),
          })
        )
          changed = true
      }
    for (let k = 0; k < size; k++)
      for (let i = 0; i < size; i++) {
        const first = routes[i][k]
        if (!first) continue
        for (let j = 0; j < size; j++) {
          const second = routes[k][j]
          if (!second || (routes[i][j] && routes[i][j]!.length <= first.length + second.length))
            continue
          routes[i][j] = { kind: 'join', first, second, length: first.length + second.length }
          changed = true
        }
      }
  }
  return { routes, indices }
}

function expandWitness(witness: Witness): string[] {
  const pending: (Witness | string)[] = [witness],
    edges: string[] = []
  while (pending.length) {
    const item = pending.pop()!
    if (typeof item === 'string') edges.push(item)
    else if (item.kind === 'edge') pending.push(item.edge!)
    else if (item.kind === 'join') pending.push(item.second!, item.first!)
    else if (item.kind === 'copy') pending.push(item.exit!, item.first!, item.edge!)
  }
  return edges
}
