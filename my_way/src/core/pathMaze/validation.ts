import { z } from 'zod'
import type { PathMazeDefinition } from '../model/pathMaze'
import type { ValidationIssue } from '../validate/ValidationResult'

const address = z.array(z.string().min(1))
const state = z.object({ path: z.string().min(1), address })
export const proofStepSchema = z.object({
  kind: z.enum(['edge', 'lemma', 'hypothesis']),
  reference: z.string(),
  reverse: z.boolean(),
})
const claimSchema = z.object({
  id: z.string().min(1),
  rule: z.enum(['finite', 'infiniteHop', 'cantorHop', 'connection']),
  from: state,
  to: state,
  period: address,
  scope: address,
  first: z.array(proofStepSchema),
  second: z.array(proofStepSchema),
  setup: z.object({ first: z.array(proofStepSchema), second: z.array(proofStepSchema) }).optional(),
  companions: z
    .array(
      z.object({ id: z.string().min(1), from: state, to: state, witness: z.array(proofStepSchema) })
    )
    .optional(),
})
export const pathMazeSchema = z.object({
  type: z.enum(['pathPushdown', 'infiniteRule']),
  paths: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      color: z.string(),
      helper: z.boolean(),
    })
  ),
  copies: address,
  surfaceSymbols: address.optional(),
  connections: z.array(
    z.object({
      id: z.string().min(1),
      from: z.string().min(1),
      to: z.string().min(1),
      operation: z.enum(['enter', 'exit', 'walk']),
      copy: z.string(),
      input: z.string().max(1),
      evidence: z.string(),
    })
  ),
  start: state.nullable(),
  goal: state.nullable(),
  alternateGoals: z.array(state).optional(),
  allowedRule: z.enum(['finite', 'infiniteHop', 'cantorHop']),
  providedInput: z.string().optional(),
  claims: z.array(claimSchema),
  draftClaim: claimSchema.optional(),
  review: z.enum(['wip', 'reviewed']),
  notes: z.array(z.string()),
})
export const artworkSchema = z.object({
  blockSize: z.number().positive().optional(),
  asset: z.union([
    z.literal(''),
    z.string().regex(/^(references\/|data:image\/(png|jpeg|gif|webp|svg\+xml);base64,)/),
  ]),
  width: z.number().positive(),
  height: z.number().positive(),
  bounds: z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]),
  traces: z.array(
    z.object({
      id: z.string().min(1),
      path: z.string(),
      color: z.string(),
      points: z.array(z.tuple([z.number(), z.number()])).min(2),
      directed: z.boolean().optional(),
      svg: z.object({ d: z.string(), matrix: z.array(z.number()).length(6) }).optional(),
    })
  ),
  frames: z.array(
    z.object({
      id: z.string().min(1),
      x: z.number(),
      y: z.number(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
  ),
  gates: z
    .array(
      z.object({
        edge: z.string().min(1),
        from: z.tuple([z.number(), z.number()]),
        to: z.tuple([z.number(), z.number()]),
        arrivalFrom: z.tuple([z.number(), z.number()]).optional(),
      })
    )
    .optional(),
  start: z.tuple([z.number(), z.number()]).optional(),
  goal: z.tuple([z.number(), z.number()]).optional(),
  finishes: z.array(z.object({ state, point: z.tuple([z.number(), z.number()]) })).optional(),
  views: z
    .array(
      z.object({
        paths: z.array(z.string().min(1)).min(1),
        bounds: z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]),
      })
    )
    .optional(),
})

export function validatePathMaze(def: PathMazeDefinition): ValidationIssue[] {
  const result = pathMazeSchema.safeParse(def)
  if (!result.success)
    return [
      {
        severity: 'error',
        code: 'PATH_SCHEMA',
        message: 'Invalid path/PDA document: ' + result.error.issues[0].message,
      },
    ]
  const issues: ValidationIssue[] = []
  const paths = new Set(def.paths.map((path) => path.id))
  const copies = new Set(def.copies)
  const error = (code: string, message: string) => issues.push({ severity: 'error', code, message })
  if (def.surfaceSymbols?.some(symbol => !copies.has(symbol)))
    error('PATH_SURFACE', 'Surface symbols must belong to the stack alphabet.')
  if (
    paths.size !== def.paths.length ||
    copies.size !== def.copies.length ||
    new Set(def.connections.map((edge) => edge.id)).size !== def.connections.length
  )
    error('PATH_IDS', 'Paths, copies, and connections must have unique IDs.')
  for (const edge of def.connections)
    if (
      !paths.has(edge.from) ||
      !paths.has(edge.to) ||
      (edge.operation !== 'walk' && !copies.has(edge.copy))
    )
      error('PATH_EDGE', `Connection ${edge.id} refers to an unknown path or copy.`)
  for (const endpoint of [def.start, def.goal, ...(def.alternateGoals ?? [])])
    if (
      endpoint &&
      (!paths.has(endpoint.path) || endpoint.address.some((copy) => !copies.has(copy)))
    )
      error('PATH_ENDPOINT', 'Start or finish refers to an unknown path or copy.')
  if (def.type === 'pathPushdown' && def.allowedRule !== 'finite')
    error('PATH_RULE', 'A PDA uses finite paths. Select an infinite-rule maze to permit hops.')
  if (!def.start || !def.goal)
    issues.push({
      severity: 'warning',
      code: 'PATH_ENDPOINT_PENDING',
      message: 'WIP: start or finish still needs to be labeled.',
    })
  return issues
}
