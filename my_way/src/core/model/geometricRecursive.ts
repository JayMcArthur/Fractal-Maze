export interface GeometricPoint { x: number; y: number; isHead?: boolean }
export interface GeometricEndpoint { id: string; x: number; y: number }
export interface GeometricPath { color: string; points: GeometricPoint[]; gates: string[]; head?: GeometricPoint }
export interface GeometricMaze {
  uid: string
  token: 'FRACTAL-MAZE.v2'
  name: string
  size: number
  paths: GeometricPath[]
  startingPoint: GeometricEndpoint
  finish: GeometricEndpoint | null
  subMazes: GeometricEndpoint[]
  nextSubMazeIdCode?: number
  readOnly?: boolean
}
export interface GeometricRecursiveDefinition { type: 'geometricRecursive'; maze: GeometricMaze }

export const geometricWidth = (size: number) => size > 6 ? 200 : size > 4 ? 150 : 100
export const geometricSubWidth = (size: number) => size > 3 ? size * 3 + 2 : size * 4 + 3

export interface GeometricGate { id: string; x: number; y: number; width: number }
/** Clockwise gate order: north, east, south, west; keep the full owner:index ID. */
export function geometricGates(maze: GeometricMaze): GeometricGate[] {
  const gates: GeometricGate[] = []
  const owners = [{ id: '_', x: 0, y: 0, width: geometricWidth(maze.size), count: maze.size, gateWidth: 3 },
    ...maze.subMazes.map((sub) => ({ ...sub, width: geometricSubWidth(maze.size), count: maze.size, gateWidth: 1 })),
    ...[maze.startingPoint, maze.finish].filter((endpoint): endpoint is GeometricEndpoint => Boolean(endpoint)).map((endpoint) => ({ ...endpoint, width: 5, count: 1, gateWidth: 1 }))]
  for (const owner of owners) {
    const offset0 = Math.floor((owner.width - owner.count * owner.gateWidth) / (owner.count + 1))
    const offset = offset0 + owner.gateWidth
    for (let side = 0; side < 4; side++) for (let i = 0; i < owner.count; i++) {
      const x = side === 0 ? offset0 + i * offset : side === 1 ? owner.width - owner.gateWidth : side === 2 ? owner.width - offset - i * offset : 0
      const y = side === 0 ? 0 : side === 1 ? offset0 + i * offset : side === 2 ? owner.width - owner.gateWidth : owner.width - offset - i * offset
      gates.push({ id: `${owner.id}:${side * owner.count + i}`, x: owner.x + x, y: owner.y + y, width: owner.gateWidth })
    }
  }
  return gates
}
