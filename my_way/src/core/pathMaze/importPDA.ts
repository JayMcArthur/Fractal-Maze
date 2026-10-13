import { z } from 'zod'
import type { PathConnection, PathMazeDefinition } from '../model/pathMaze'
import { pathMazeSchema, validatePathMaze } from './validation'
import { exportPathPDA } from './exportPDA'

const transition = z.object({
  from: z.string().min(1), to: z.string().min(1), input: z.string().max(1),
  pop: z.string().min(1), push: z.array(z.string().min(1)), source: z.string().min(1),
  evidence: z.string().optional(),
}).strict()
const schema = z.object({
  format: z.literal('path-pda/1'),
  title: z.string().min(1).optional(),
  representationType: pathMazeSchema.shape.type.optional(),
  allowedRule: pathMazeSchema.shape.allowedRule.optional(),
  review: pathMazeSchema.shape.review,
  semantics: z.literal('Nondeterministic finite path traversal; empty input is epsilon; push arrays are bottom-to-top.'),
  states: pathMazeSchema.shape.paths, inputAlphabet: z.array(z.string().length(1)),
  stackAlphabet: z.array(z.string().min(1)).min(1), bottom: z.string().min(1),
  surfaceSymbols: pathMazeSchema.shape.surfaceSymbols,
  start: pathMazeSchema.shape.start, goal: pathMazeSchema.shape.goal,
  alternateGoals: pathMazeSchema.shape.alternateGoals,
  acceptance: z.literal('Any declared finish path at its exact copy address; surface acceptance requires only the bottom marker.'),
  transitions: z.array(transition), notes: z.array(z.string()),
  providedInput: z.string().optional(),
  extraMovementRule: pathMazeSchema.shape.allowedRule.optional(), warning: z.string().optional(),
}).strict()

type Transition = z.infer<typeof transition>

/** Read our path-PDA export without weakening arbitrary stack guards into corridors. */
export function importPathPDA(raw: string | object) {
  const data = schema.parse(typeof raw === 'string' ? JSON.parse(raw) : raw)
  if (new Set(data.stackAlphabet).size !== data.stackAlphabet.length || !data.stackAlphabet.includes(data.bottom))
    throw new Error('The PDA stack alphabet must contain one distinct bottom marker.')
  const groups = new Map<string, Transition[]>()
  for (const rule of data.transitions) {
    const rules = groups.get(rule.source)
    if (rules) rules.push(rule)
    else groups.set(rule.source, [rule])
  }
  const allowedRule = data.allowedRule ?? data.extraMovementRule ?? 'finite'
  if (data.extraMovementRule && data.extraMovementRule !== allowedRule)
    throw new Error('The PDA movement rules disagree.')
  const model: PathMazeDefinition = {
    type: data.representationType ?? (allowedRule === 'finite' ? 'pathPushdown' : 'infiniteRule'),
    paths: data.states, copies: data.stackAlphabet.filter(symbol => symbol !== data.bottom),
    surfaceSymbols: data.surfaceSymbols, start: data.start, goal: data.goal,
    alternateGoals: data.alternateGoals, allowedRule, review: data.review, notes: data.notes,
    providedInput: data.providedInput, claims: [],
    connections: [...groups].map(([id, rules]) => connection(id, rules[0], data.bottom)),
  }
  const errors = validatePathMaze(model).filter(issue => issue.severity === 'error')
  if (errors.length) throw new Error(errors[0].message)
  for (const edge of model.connections)
    if (groups.get(edge.id)!.length !== (edge.operation === 'exit' ? 1 : data.stackAlphabet.length))
      throw new Error(`PDA transition ${edge.id} has incomplete or duplicate stack guards.`)
  const expected = exportPathPDA(model)
  // Export can choose a different unused bottom symbol after importing an older document.
  const normalize = (rule: Transition) => JSON.stringify([rule.source, rule.from, rule.to, rule.input,
    rule.pop === data.bottom ? expected.bottom : rule.pop,
    rule.push.map(symbol => symbol === data.bottom ? expected.bottom : symbol)])
  const actualRules = data.transitions.map(normalize).sort()
  const expectedRules = expected.transitions.map(rule => JSON.stringify([
    rule.source, rule.from, rule.to, rule.input, rule.pop, rule.push])).sort()
  if (JSON.stringify(actualRules) !== JSON.stringify(expectedRules))
    throw new Error('This PDA contains stack-dependent or compound transitions outside the path-PDA export format.')
  if (JSON.stringify([...data.inputAlphabet].sort()) !== JSON.stringify([...expected.inputAlphabet].sort()))
    throw new Error('The PDA input alphabet does not match its connections.')
  for (const rules of groups.values())
    if (rules.some(rule => rule.evidence !== rules[0].evidence))
      throw new Error('Copies of a PDA transition have conflicting evidence.')
  return { model, title: data.title }
}

function connection(id: string, rule: Transition, bottom: string): PathConnection {
  const base = { id, from: rule.from, to: rule.to, input: rule.input,
    evidence: rule.evidence ?? 'Imported path-PDA transition' }
  if (!rule.push.length && rule.pop !== bottom)
    return { ...base, operation: 'exit', copy: rule.pop }
  if (rule.push.length === 1 && rule.push[0] === rule.pop)
    return { ...base, operation: 'walk', copy: '' }
  if (rule.push.length === 2 && rule.push[0] === rule.pop && rule.push[1] !== bottom)
    return { ...base, operation: 'enter', copy: rule.push[1] }
  throw new Error(`PDA transition ${id} is not a path enter, exit or walk.`)
}
