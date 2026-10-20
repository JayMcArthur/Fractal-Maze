import { validatePortReplay, validateGeometricReplay, validateGraphReplay, validateSquareReplay } from './nativeRouteValidation'
import { validateBlockRoute } from '../blockMaze/grid'
import { tourStateSchema, validateTourReplay } from '../recursiveTour/validation'
import { z } from 'zod'
import type { ReplayDocument } from './ReplayDocument'
import type { RecursiveMazeDocument } from '../model/RecursiveMazeDocument'
import { validateMaze } from '../validate/validateMaze'
import type { PathMazeDefinition, ProofStep } from '../model/pathMaze'
import type { PathSession } from '../play/pathSession'
import type { PathRoute } from '../pathMaze/traversal'
import { applyConnection, sameState, reachesGoal } from '../pathMaze/traversal'
import { normalizeReplay } from './normalizeReplay'
import { artworkSchema, proofStepSchema } from '../pathMaze/validation'
import { validateProofReplay } from './proofReplay'
import { validateRepeatedReplay } from './repeatedReplay'
import { pathSessionSchema, validatePathSession } from './pathSessionValidation'
import { validateRecursiveBlockRoute } from '../blockMaze/recursiveReplay'

const position = z.object({
  blockStack: z.array(z.string()).min(1),
  row: z.number().int(),
  col: z.number().int(),
})
const action = z.looseObject({
  type: z.enum([
    'move',
    'enterBlock',
    'exitBlock',
    'teleport',
    'solverStep',
    'checkpoint',
    'annotation',
  ]),
  from: position,
  to: position,
  timestamp: z.number().nonnegative(),
})
const blockAxis = z.object({ digits: z.array(z.number().int().nonnegative()).min(1), half: z.boolean() })
const repeatedState = z.object({
  x: z.number().int().nonnegative(), y: z.number().int().nonnegative(),
  terminal: z.string().regex(/^[CNESW]\d+$/),
})
const repeatedRoute = z.union([
  z.object({ type: z.literal('repeatedDirected'), states: z.array(repeatedState).min(1) }),
  z.object({ type: z.literal('repeatedDirected'), start: repeatedState,
    runs: z.array(z.object({ count: z.number().int().positive(),
      steps: z.array(z.tuple([z.number().int().min(-1).max(1), z.number().int().min(-1).max(1),
        z.string().regex(/^[CNESW]\d+$/)])).min(1) })) }),
])
const nativeRoute = z.union([z.discriminatedUnion('type', [
  z.object({ type: z.literal('fractalBlock'),
    states: z.array(z.object({ x: blockAxis, y: blockAxis })).min(1),
    details: z.array(z.number().int().positive()) }),
  z.object({ type: z.literal('graphLabeled'), states: z.array(z.string()).min(1) }),
  z.object({ type: z.literal('geometricRecursive'), states: z.array(z.object({ stack: z.array(z.string()), gate: z.string(), won: z.boolean() })).min(1), gates: z.array(z.string()) }),
  z.object({
    type: z.literal('blockRecursive'),
    depth: z.number().int().positive(),
    states: z.array(z.number().int().nonnegative()).min(1),
  }),
  z.object({ type: z.literal('recursiveTour'), states: z.array(tourStateSchema).min(1) }),
  z.object({
    type: z.enum(['pathPushdown', 'infiniteRule']),
    states: z.array(z.object({ path: z.string(), address: z.array(z.string()) })).min(1),
    edges: z.array(z.string()),
    proofSteps: z.array(proofStepSchema).optional(),
    physical: pathSessionSchema.optional(),
  }),
  z.object({
    type: z.literal('recursivePorts'),
    states: z
      .array(
        z.object({
          blocks: z.array(z.number().int().nonnegative()).min(1),
          port: z.number().int().nonnegative(),
        })
      )
      .min(1),
  }),
]), repeatedRoute])
const schema = z.looseObject({
  playArtwork: artworkSchema.optional(),
  formatVersion: z.literal('1.0'),
  mazeRef: z.string(),
  mazeTitle: z.string(),
  maze: z.custom<RecursiveMazeDocument>((value) => {
    try {
      const doc = value as RecursiveMazeDocument
      return doc.formatVersion === '1.0' && validateMaze(doc).valid
    } catch {
      return false
    }
  }, 'Replay needs a valid embedded maze'),
  solverOrPlayer: z.enum(['human', 'solver']),
  startedAt: z.string(),
  status: z.enum(['complete', 'partial', 'failed']),
  actions: z.array(action),
  derivedPath: z.array(position),
  checkpoints: z.array(z.number().int().nonnegative()),
  nativeRoute: nativeRoute.optional(),
  metrics: z.object({
    totalMoves: z.number().int().nonnegative(),
    totalTime: z.number().nonnegative(),
    maxDepthReached: z.number().int().nonnegative(),
  }),
})

export function importReplay(text: string): ReplayDocument {
  const result = schema.safeParse(JSON.parse(text))
  if (!result.success)
    throw new Error(
      'Choose an exported .fmaze-solution.json file with its maze snapshot and recorded route.'
    )
  const doc = result.data as ReplayDocument
  const def = doc.maze.definition
  if (doc.playArtwork &&
    ((def.type !== 'pathPushdown' && def.type !== 'infiniteRule') ||
      !validateMaze({ ...doc.maze, artwork: doc.playArtwork }).valid))
    throw new Error('The recorded layout does not match this maze’s paths and gates.')
  if (doc.nativeRoute) {
    validateNativeReplay(doc)
  } else {
    if (def.type !== 'squareRecursive')
      throw new Error('This maze family requires a native recorded route.')
    validateSquareReplay(def, doc.actions, doc.status === 'complete')
  }
  return normalizeReplay(doc)
}

function validateNativeReplay(doc: ReplayDocument) {
  const def = doc.maze.definition,
    route = doc.nativeRoute!
  if (def.type === 'blockRecursive' && route.type === 'fractalBlock') {
    validateRecursiveBlockRoute(def, route, doc.status === 'complete')
    return
  }
  if (def.type === 'blockRecursive' && route.type === 'blockRecursive')
    validateBlockRoute(def, route.depth, route.states, doc.status === 'complete')
  if (def.type === 'recursiveTour' && route.type === 'recursiveTour')
    validateTourReplay(def, route.states, doc.status === 'complete')
  if (route.type !== def.type) throw new Error('Replay route and maze family do not match.')
  if (
    (def.type === 'pathPushdown' || def.type === 'infiniteRule') &&
    (route.type === 'pathPushdown' || route.type === 'infiniteRule')
  ) {
    validatePathRecording(def, route, doc)
  }
  if (def.type === 'recursivePorts' && route.type === 'recursivePorts') validatePortReplay(def, route, doc.status === 'complete')
  if (def.type === 'geometricRecursive' && route.type === 'geometricRecursive') validateGeometricReplay(def, route, doc.status === 'complete')
  if (def.type === 'graphLabeled' && route.type === 'graphLabeled') validateGraphReplay(def, route, doc.status === 'complete')
  if (def.type === 'repeatedDirected' && route.type === 'repeatedDirected')
    validateRepeatedReplay(def, route, doc.status === 'complete')
}

function validatePathRecording(def: PathMazeDefinition,
  route: PathRoute & { physical?: PathSession; proofSteps?: ProofStep[] }, doc: ReplayDocument) {
  const complete = doc.status === 'complete'
  if (route.physical) {
    validatePathSession(def, doc.playArtwork ?? doc.maze.artwork, route.physical, route, complete)
  }
  if (route.proofSteps) validateProofReplay(def, { ...route, proofSteps: route.proofSteps }, complete)
  else validatePathReplay(def, route, complete)
}

function validatePathReplay(def: PathMazeDefinition, route: PathRoute, complete: boolean) {
  if (
    !def.start ||
    !sameState(route.states[0], def.start) ||
    route.edges.length !== route.states.length - 1
  )
    throw new Error('Path replay must start at the maze entry and record every transition.')
  for (let index = 0; index < route.edges.length; index++) {
    const edge = def.connections.find((edge) => edge.id === route.edges[index])
    const next = edge && applyConnection(route.states[index], edge)
    if (!next || !sameState(next, route.states[index + 1]))
      throw new Error('Path replay contains an illegal stack transition.')
  }
  if (complete && !reachesGoal(def, route.states.at(-1)!))
    throw new Error('Complete path replay does not reach the maze finish.')
}
