import type { GeometricMaze } from '../../model/geometricRecursive'

export interface GeometricPosition { stack: string[]; gate: string; won: boolean }
export function geometricStart(maze: GeometricMaze): GeometricPosition {
  const gate = maze.paths.flatMap((path) => path.gates).find((id) => id.startsWith('s:')) ?? ''
  return { stack: [], gate, won: false }
}
export function geometricChoices(maze: GeometricMaze, position: GeometricPosition): string[] {
  if (position.won) return []
  return (maze.paths.find((path) => path.gates.includes(position.gate))?.gates ?? []).filter((id) => {
    const owner = id.split(':')[0]
    return id !== position.gate && owner !== 's' && (owner !== 'f' || !position.stack.length) && (owner !== '_' || position.stack.length > 0 || !maze.finish)
  })
}
export function geometricMove(maze: GeometricMaze, position: GeometricPosition, gate: string): GeometricPosition {
  if (!geometricChoices(maze, position).includes(gate)) return position
  const [owner, index] = gate.split(':')
  if (owner === 'f' || (owner === '_' && !position.stack.length)) return { ...position, gate, won: true }
  if (owner === '_') return { stack: position.stack.slice(0, -1), gate: `${position.stack.at(-1)}:${index}`, won: false }
  return { stack: [...position.stack, owner], gate: `_:${index}`, won: false }
}
