import type { PathConnection, PathMazeDefinition, PathState } from '../model/pathMaze'
import type { SquareRecursiveDefinition } from '../model/squareRecursive'
import type { SquarePDA } from './squarePDA'

const transitionKey = (edge: PathConnection, from = edge.from, to = edge.to) =>
  JSON.stringify([from, to, edge.operation, edge.copy])

/** A bijection must preserve start, surface finishes and every directed stack transition. */
export function alignSquareModel(
  def: SquareRecursiveDefinition,
  binding: SquarePDA,
  source: PathMazeDefinition
): SquarePDA | null {
  if (
    source.allowedRule !== 'finite' ||
    !source.start ||
    !source.goal ||
    source.start.address.length ||
    [source.goal, ...(source.alternateGoals ?? [])].some((goal) => goal.address.length)
  )
    return null
  const native = binding.model
  const paths = native.paths.filter((path) => path.id !== 'finish')
  const connections = native.connections.filter((edge) => edge.to !== 'finish')
  const goals: PathState[] = def.trophies.length
    ? [native.goal!, ...(native.alternateGoals ?? [])]
    : def.exits.map((exit) => ({
        path: binding.cellPaths.get(`${exit.row},${exit.col}`)!,
        address: [],
      }))
  if (
    paths.length !== source.paths.length ||
    connections.length !== source.connections.length ||
    [...native.copies].sort().join(',') !== [...source.copies].sort().join(',')
  )
    return null
  const mapping = findMapping(
    { ...native, paths, connections, goal: goals[0], alternateGoals: goals.slice(1) },
    source
  )
  if (!mapping) return null
  const remaining = [...source.connections],
    ids = new Map<string, string>()
  for (const edge of connections) {
    const key = transitionKey(edge, mapping.get(edge.from)!, mapping.get(edge.to)!)
    const index = remaining.findIndex((candidate) => transitionKey(candidate) === key)
    ids.set(edge.id, remaining.splice(index, 1)[0].id)
  }
  return {
    model: source,
    cellPaths: new Map([...binding.cellPaths].map(([cell, path]) => [cell, mapping.get(path)!])),
    cells: new Map([...binding.cells].map(([path, cells]) => [mapping.get(path)!, cells])),
    moves: binding.moves
      .filter((move) => move.edges.every((id) => ids.has(id)))
      .map((move) => ({ ...move, edges: move.edges.map((id) => ids.get(id)!) })),
  }
}

function pathSignature(model: PathMazeDefinition, path: string) {
  const goals = [model.goal, ...(model.alternateGoals ?? [])]
  const counts = model.connections
    .flatMap((edge) => [
      ...(edge.from === path ? [`out-${edge.operation}-${edge.copy}`] : []),
      ...(edge.to === path ? [`in-${edge.operation}-${edge.copy}`] : []),
    ])
    .sort()
  return JSON.stringify([
    model.start?.path === path,
    goals.some((goal) => goal?.path === path),
    counts,
  ])
}

function findMapping(native: PathMazeDefinition, source: PathMazeDefinition) {
  const candidates = new Map(
    native.paths.map((path) => [
      path.id,
      source.paths
        .filter(
          (candidate) => pathSignature(source, candidate.id) === pathSignature(native, path.id)
        )
        .map((candidate) => candidate.id),
    ])
  )
  if ([...candidates.values()].some((candidates) => !candidates.length)) return null
  const mapping = new Map<string, string>(),
    used = new Set<string>()
  const edges = (model: PathMazeDefinition, from: string, to: string) =>
    model.connections
      .filter((edge) => edge.from === from && edge.to === to)
      .map((edge) => `${edge.operation}-${edge.copy}`)
      .sort()
      .join(',')
  const consistent = (from: string, to: string) =>
    [...mapping].every(
      ([a, b]) =>
        edges(native, from, a) === edges(source, to, b) &&
        edges(native, a, from) === edges(source, b, to)
    ) && edges(native, from, from) === edges(source, to, to)
  const assign = (): boolean => {
    if (mapping.size === native.paths.length) return true
    const next = [...candidates]
      .filter(([id]) => !mapping.has(id))
      .map(([id, choices]) => ({
        id,
        choices: choices.filter((choice) => !used.has(choice) && consistent(id, choice)),
      }))
      .sort((a, b) => a.choices.length - b.choices.length)[0]
    for (const choice of next.choices) {
      mapping.set(next.id, choice)
      used.add(choice)
      if (assign()) return true
      mapping.delete(next.id)
      used.delete(choice)
    }
    return false
  }
  return assign() ? mapping : null
}
