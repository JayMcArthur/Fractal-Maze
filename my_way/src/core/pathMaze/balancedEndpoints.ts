import type { PathConnection, PathMazeDefinition } from '../model/pathMaze'

/** Initialize and accept exact endpoint stacks inside an empty-stack reachability query. */
export function balancedEndpoints(model: PathMazeDefinition) {
  const paths = [...model.paths], connections = [...model.connections]
  const used = new Set([...paths.map(path => path.id), ...connections.map(edge => edge.id)])
  const virtual = new Set<string>()
  let serial = 0
  const id = () => {
    let candidate: string
    do candidate = `@endpoint:${serial++}`
    while (used.has(candidate))
    used.add(candidate)
    return candidate
  }
  const path = () => {
    const name = id()
    paths.push({ id: name, label: name, color: '#000', helper: true })
    return name
  }
  const connect = (from: string, to: string, operation: PathConnection['operation'], copy = '') => {
    const name = id()
    virtual.add(name)
    connections.push({ id: name, from, to, operation, copy, input: '', evidence: '' })
  }
  const start = path(), goal = path()
  let current = start
  for (const copy of model.start!.address) {
    const next = path()
    connect(current, next, 'enter', copy)
    current = next
  }
  connect(current, model.start!.path, 'walk')
  for (const endpoint of [model.goal!, ...(model.alternateGoals ?? [])]) {
    current = path()
    connect(endpoint.path, current, 'walk')
    for (const copy of [...endpoint.address].reverse()) {
      const next = path()
      connect(current, next, 'exit', copy)
      current = next
    }
    connect(current, goal, 'walk')
  }
  return { model: { ...model, paths, connections,
    start: { path: start, address: [] }, goal: { path: goal, address: [] }, alternateGoals: [] }, virtual }
}
