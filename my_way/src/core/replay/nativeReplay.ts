import type { RecursiveMazeDocument } from '../model/RecursiveMazeDocument'
import { repeatedStateKey } from '../model/repeatedDirected'
import { repeatedRouteStepCount } from './repeatedReplay'
import type { RepeatedRoute } from './repeatedReplay'
import type { PortState } from '../model/recursivePorts'
import type { ReplayDocument } from './ReplayDocument'
import type { TourState } from '../model/recursiveTour'
import { tourStateKey } from '../recursiveTour/movement'
import type { PathState, ProofStep } from '../model/pathMaze'
import type { GeometricPosition } from '../solver/common/geometricMovement'
import { appendSessionMove, sessionPathRoute, pathRouteSession, type PathSession } from '../play/pathSession'
import { copyAddress } from '../pathMaze/copyAddress'
import type { BlockRecursiveDefinition } from '../model/blockRecursive'
import type { RecursiveBlockRoute } from '../blockMaze/recursiveReplay'
import { recursiveBlockAddress, recursiveBlockKey } from '../blockMaze/recursivePosition'

export type NativeRoute =
  | RecursiveBlockRoute
  | { type: 'blockRecursive'; depth: number; states: number[] }
  | { type: 'recursiveTour'; states: TourState[] }
  | RepeatedRoute
  | { type: 'recursivePorts'; states: PortState[] }
  | { type: 'graphLabeled'; states: string[] }
  | { type: 'geometricRecursive'; states: GeometricPosition[]; gates: string[] }
  | { type: 'pathPushdown' | 'infiniteRule'; states: PathState[]; edges: string[]; proofSteps?: ProofStep[]; physical?: PathSession }
export const replayStepCount = (doc: ReplayDocument) =>
  doc.nativeRoute ? nativeRouteStepCount(doc.nativeRoute) : doc.actions.length
export const nativeRouteStepCount = (route: NativeRoute) =>
  route.type === 'repeatedDirected' ? repeatedRouteStepCount(route)
    : (route.type === 'pathPushdown' || route.type === 'infiniteRule') && route.physical
    ? route.physical.moves.length : route.states.length - 1

function routeIndices<State>(states: State[], key: (state: State) => string): number[] {
  const indices: number[] = [],
    positions = new Map<string, number>()
  states.forEach((state, index) => {
    const id = key(state),
      previous = positions.get(id)
    if (previous !== undefined) {
      for (const removed of indices.splice(previous + 1)) positions.delete(key(states[removed]))
    } else {
      positions.set(id, indices.length)
      indices.push(index)
    }
  })
  return indices
}
export function trimNativeRoute(route: NativeRoute): NativeRoute {
  switch (route.type) {
    case 'fractalBlock': {
      const indices = routeIndices(route.states, recursiveBlockKey)
      return { ...route, states: indices.map(index => route.states[index]),
        details: indices.slice(1).map(index => route.details[index - 1]) }
    }
    case 'graphLabeled':
      return { ...route, states: routeIndices(route.states, String).map(index => route.states[index]) }
    case 'geometricRecursive': {
      const indices = routeIndices(route.states, state => JSON.stringify([state.stack, state.gate, state.won]))
      return { ...route, states: indices.map(index => route.states[index]), gates: indices.slice(1).map(index => route.gates[index - 1]) }
    }
    case 'blockRecursive':
      return {
        ...route,
        states: routeIndices(route.states, String).map((index) => route.states[index]),
      }
    case 'recursiveTour':
      return {
        ...route,
        states: routeIndices(route.states, tourStateKey).map((index) => route.states[index]),
      }
    case 'pathPushdown':
    case 'infiniteRule': {
      if (route.physical) {
        let physical: PathSession = { positions: route.physical.positions.slice(0, 1), moves: [] }
        route.physical.moves.forEach((move, index) => {
          physical = appendSessionMove(physical, move, route.physical!.positions[index + 1])
        })
        const witness = sessionPathRoute(physical)
        const normalized = { ...route, ...witness, physical }
        if (!witness.proofSteps) delete normalized.proofSteps
        return normalized
      }
      const indices = routeIndices(route.states, (state) =>
        JSON.stringify([state.address, state.path])
      )
      return {
        ...route,
        states: indices.map((index) => route.states[index]),
        edges: indices.slice(1).map((index) => route.edges[index - 1]),
        ...(route.proofSteps ? { proofSteps: indices.slice(1).map(index => route.proofSteps![index - 1]) } : {}),
      }
    }
    case 'recursivePorts':
      return {
        ...route,
        states: routeIndices(route.states, (state) =>
          JSON.stringify([state.blocks, state.port])
        ).map((index) => route.states[index]),
      }
    case 'repeatedDirected':
      if (!('states' in route)) return route
      return {
        ...route,
        states: routeIndices(route.states, repeatedStateKey).map((index) => route.states[index]),
      }
  }
}

function physicalPathRoute(
  maze: RecursiveMazeDocument,
  route: NativeRoute,
  source: 'human' | 'solver',
  complete: boolean
): NativeRoute {
  if ((route.type === 'pathPushdown' || route.type === 'infiniteRule') && !route.physical && maze.artwork?.traces.length &&
      (maze.definition.type === 'pathPushdown' || maze.definition.type === 'infiniteRule') &&
      (maze.definition.surfaceSymbols || route.proofSteps || (source === 'solver' && complete && maze.artwork.blockSize)))
    return { ...route, physical: pathRouteSession(maze.definition, maze.artwork, route, complete) }
  return route
}

export function buildNativeReplay(
  maze: RecursiveMazeDocument,
  route: NativeRoute,
  source: 'human' | 'solver',
  complete: boolean
): ReplayDocument {
  route = trimNativeRoute(physicalPathRoute(maze, route, source, complete))
  const now = new Date().toISOString()
  return structuredClone({
    formatVersion: '1.0',
    mazeRef: maze.metadata.id,
    maze,
    mazeTitle: maze.metadata.title,
    solverOrPlayer: source,
    startedAt: now,
    endedAt: now,
    status: complete ? 'complete' : 'partial',
    actions: [],
    derivedPath: [],
    checkpoints: [],
    nativeRoute: route,
    metrics: {
      totalMoves: Math.max(0, nativeRouteStepCount(route)),
      totalTime: 0,
      maxDepthReached:
        route.type === 'fractalBlock' && maze.definition.type === 'blockRecursive'
          ? Math.max(0, ...route.states.map(state => recursiveBlockAddress(maze.definition as BlockRecursiveDefinition, state)!.address.length))
          : route.type === 'geometricRecursive'
          ? Math.max(0, ...route.states.map(state => state.stack.length))
          : route.type === 'blockRecursive'
          ? route.depth
          : route.type === 'recursiveTour'
            ? Math.max(
                0,
                ...route.states.flatMap((state) => state.rooms.map((room) => room.address.length))
              )
            : route.type === 'recursivePorts'
              ? Math.max(0, ...route.states.map((state) => state.blocks.length - 1))
              : route.type === 'pathPushdown' || route.type === 'infiniteRule'
                ? Math.max(0, ...route.states.map((state) =>
                    maze.definition.type === 'pathPushdown' || maze.definition.type === 'infiniteRule'
                      ? copyAddress(maze.definition, state).length : state.address.length))
                : 0,
    },
  })
}
