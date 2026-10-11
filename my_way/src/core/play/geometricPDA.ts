import type { GeometricMaze } from '../model/geometricRecursive'
import type { PathMazeDefinition, PathState, PathConnection } from '../model/pathMaze'
import type { GeometricPosition } from '../solver/common/geometricMovement'

function surfaceSymbol(maze: GeometricMaze) {
  let symbol = '@surface'
  while (maze.subMazes.some(copy => copy.id === symbol)) symbol = '@' + symbol
  return symbol
}

/** Connected floors are states. Gate numbers identify corresponding copy boundaries. */
export function geometricPathId(maze: GeometricMaze, gate: string) {
  const index = maze.paths.findIndex(path => path.gates.includes(gate))
  return index < 0 ? `@gate:${gate}` : String(index)
}

export function geometricPathState(maze: GeometricMaze, state: GeometricPosition): PathState {
  return state.won
    ? { path: `@finish:${state.gate}`, address: [] }
    : { path: geometricPathId(maze, state.gate), address: [surfaceSymbol(maze), ...state.stack] }
}

export function compileGeometricPDA(maze: GeometricMaze): PathMazeDefinition {
  const root = surfaceSymbol(maze)
  const paths = maze.paths.map((path, index) => ({
    id: String(index), label: String(index + 1), color: path.color, helper: false,
  }))
  const connections: PathConnection[] = []
  const boundary = (gate: string) => {
    const id = geometricPathId(maze, gate)
    if (!paths.some(path => path.id === id))
      paths.push({ id, label: 'Boundary dead end', color: '#eab350', helper: false })
    return id
  }
  for (const copy of maze.subMazes) for (let index = 0; index < maze.size * 4; index++) {
    const parent = `${copy.id}:${index}`, child = `_:${index}`
    if (!maze.paths.some(path => path.gates.includes(parent) || path.gates.includes(child))) continue
    const from = boundary(parent), to = boundary(child)
    connections.push(
      { id: `enter:${parent}`, from, to, operation: 'enter', copy: copy.id, input: '',
        evidence: `Source copy ${copy.id}, boundary ${index}` },
      { id: `exit:${parent}`, from: to, to: from, operation: 'exit', copy: copy.id, input: '',
        evidence: `Source copy ${copy.id}, boundary ${index}` },
    )
  }
  const gates = [...new Set(maze.paths.flatMap(path => path.gates))]
  const finishes = gates.filter(gate => gate.startsWith(maze.finish ? 'f:' : '_:'))
  const goals = finishes.map(gate => {
    const path = `@finish:${gate}`
    paths.push({ id: path, label: 'Finish', color: '#eab350', helper: false })
    connections.push({ id: `finish:${gate}`, from: geometricPathId(maze, gate), to: path,
      operation: 'exit', copy: root, input: '', evidence: `Surface finish ${gate}` })
    return { path, address: [] }
  })
  const start = gates.find(gate => gate.startsWith('s:'))
  return {
    type: 'pathPushdown', paths, copies: [...maze.subMazes.map(copy => copy.id), root],
    surfaceSymbols: [root], connections,
    start: start ? { path: geometricPathId(maze, start), address: [root] } : null,
    goal: goals[0] ?? null, alternateGoals: goals.slice(1), allowedRule: 'finite',
    claims: [], review: 'reviewed', notes: [
      'Follow the source corridors. Entering a copy preserves its numbered boundary; leaving returns to that boundary in its parent.',
      'Finishes work only at the surface. An unconnected boundary is a dead end; you can retrace your steps.',
    ],
  }
}
