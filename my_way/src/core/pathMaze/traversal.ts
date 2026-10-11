import type { PathConnection, PathMazeDefinition, PathState } from '../model/pathMaze'
import { appendRouteState } from '../replay/routeHistory'
import { copyAddress } from './copyAddress'

export const stateKey = (state: PathState) => JSON.stringify([state.address, state.path])
export const sameState = (a: PathState, b: PathState) => stateKey(a) === stateKey(b)
export const stateLabel = (state: PathState, model?: PathMazeDefinition) =>
  `${(model ? copyAddress(model, state) : state.address).join('') || 'surface'} · ${model?.paths.find(path => path.id === state.path)?.label ?? state.path}`

export const reachesGoal = (def: PathMazeDefinition, state: PathState) =>
  !!def.goal && [def.goal, ...(def.alternateGoals ?? [])].some((goal) => sameState(state, goal))

export function applyConnection(state: PathState, edge: PathConnection): PathState | null {
  if (edge.from !== state.path) return null
  if (edge.operation === 'exit' && state.address.at(-1) !== edge.copy) return null
  const address =
    edge.operation === 'enter'
      ? [...state.address, edge.copy]
      : edge.operation === 'exit'
        ? state.address.slice(0, -1)
        : [...state.address]
  return { path: edge.to, address }
}

export function availableMoves(def: PathMazeDefinition, state: PathState) {
  return def.connections.flatMap((edge) => {
    const next = applyConnection(state, edge)
    return next ? [{ edge, next }] : []
  })
}

export interface PathRoute {
  states: PathState[]
  edges: string[]
}
export function appendPathMove(route: PathRoute, next: PathState, edge: string): PathRoute {
  const states = appendRouteState(route.states, next, stateKey)
  return { states, edges: [...route.edges, edge].slice(0, states.length - 1) }
}
export interface PathSearch {
  route: PathRoute | null
  visited: number
  limited: boolean
}

export function searchPaths(
  def: PathMazeDefinition,
  maxDepth: number,
  maxStates = 20000
): PathSearch {
  if (!def.start || !def.goal) return { route: null, visited: 0, limited: false }
  const queue = [def.start]
  const parents = new Map<string, { state: PathState; edge: string }>()
  const seen = new Set([stateKey(def.start)])
  let limited = false
  for (let index = 0; index < queue.length; index++) {
    const state = queue[index]
    if (reachesGoal(def, state))
      return { route: restoreRoute(state, parents), visited: seen.size, limited }
    for (const { edge, next } of availableMoves(def, state)) {
      if (copyAddress(def, next).length > maxDepth) {
        limited = true
        continue
      }
      const key = stateKey(next)
      if (seen.has(key)) continue
      if (seen.size >= maxStates) return { route: null, visited: seen.size, limited: true }
      seen.add(key)
      parents.set(key, { state, edge: edge.id })
      queue.push(next)
    }
  }
  return { route: null, visited: seen.size, limited }
}

function restoreRoute(
  end: PathState,
  parents: Map<string, { state: PathState; edge: string }>
): PathRoute {
  const states = [end],
    edges: string[] = []
  let parent = parents.get(stateKey(end))
  while (parent) {
    edges.unshift(parent.edge)
    states.unshift(parent.state)
    parent = parents.get(stateKey(parent.state))
  }
  return { states, edges }
}

export interface PathInputResult {
  route: PathRoute | null
  accepted: boolean
  consumed: number
}

/** Retain legal rejected routes for review; never overwrite alternative transitions. */
export function runPathInput(def: PathMazeDefinition, input: string): PathInputResult {
  if (!def.start || !def.goal) return { route: null, accepted: false, consumed: 0 }
  if (def.connections.some((edge) => !edge.input))
    throw new Error(
      'Guide-input playback requires explicit input tokens. This model has epsilon transitions; use finite search or manual movement.'
    )
  let routes: PathRoute[] = [{ states: [def.start], edges: [] }]
  let consumed = 0
  for (const token of input) {
    const nextRoutes = new Map<string, PathRoute>()
    for (const route of routes)
      for (const { edge, next } of availableMoves(def, route.states.at(-1)!))
        if (edge.input === token)
          nextRoutes.set(stateKey(next), {
            states: [...route.states, next],
            edges: [...route.edges, edge.id],
          })
    if (nextRoutes.size > 20000)
      throw new Error('Input branches exceed 20,000 states. Shorten the input.')
    if (!nextRoutes.size) return { route: routes[0], accepted: false, consumed }
    routes = [...nextRoutes.values()]
    consumed++
  }
  const acceptedRoute = routes.find((route) => reachesGoal(def, route.states.at(-1)!))
  return { route: acceptedRoute ?? routes[0], accepted: !!acceptedRoute, consumed }
}

export function connectionsFromPairs(pairs: string[][], evidence: string): PathConnection[] {
  return pairs.flatMap(([pair, direction], index) => {
    const [a, b] = pair.split('-')
    const [from, to] = direction.startsWith('/') ? [a, b] : [b, a]
    const copy = direction.replace('/', '')
    return [
      {
        id: `edge-${index}-in`,
        from,
        to,
        operation: 'enter' as const,
        copy,
        input: from === to ? '(' : to.length === 1 ? to : '',
        evidence,
      },
      {
        id: `edge-${index}-out`,
        from: to,
        to: from,
        operation: 'exit' as const,
        copy,
        input: from === to ? ')' : from.length === 1 ? from : '',
        evidence,
      },
    ]
  })
}
