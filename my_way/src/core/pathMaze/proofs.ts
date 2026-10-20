import type { PathMazeDefinition, PathState, ProofClaim, ProofStep } from '../model/pathMaze'
import { applyConnection, sameState } from './traversal'

export interface ProofCheck {
  valid: boolean
  message: string
  first: PathState[]
  second: PathState[]
}
const begins = (address: string[], prefix: string[]) =>
  prefix.every((copy, i) => address[i] === copy)
const ends = (address: string[], suffix: string[]) =>
  begins(address.slice(address.length - suffix.length), suffix)

export function declaredConnections(claim: ProofClaim) {
  return [
    { id: claim.id, from: claim.from, to: claim.to, witness: claim.first },
    ...(claim.companions ?? []),
  ]
}
type Declaration = ReturnType<typeof declaredConnections>[number]

function applyLemma(state: PathState, pair: Declaration, reverse: boolean): PathState | null {
  const [from, to] = reverse ? [pair.to, pair.from] : [pair.from, pair.to]
  if (
    state.path !== from.path ||
    state.address.length < from.address.length ||
    !ends(state.address, from.address)
  )
    return null
  return {
    path: to.path,
    address: [...state.address.slice(0, state.address.length - from.address.length), ...to.address],
  }
}

function applyHypothesis(
  state: PathState,
  pair: Declaration,
  scope: string[],
  reverse: boolean
): PathState | null {
  const [from, to] = reverse ? [pair.to, pair.from] : [pair.from, pair.to]
  const relative = from.address.slice(scope.length)
  const current = state.address.slice(scope.length)
  if (
    state.path !== from.path ||
    !begins(state.address, scope) ||
    current.length <= relative.length ||
    !ends(current, relative)
  )
    return null
  const descendant = current.slice(0, current.length - relative.length)
  return { path: to.path, address: [...scope, ...descendant, ...to.address.slice(scope.length)] }
}

export function applyProofStep(
  def: PathMazeDefinition,
  state: PathState,
  step: ProofStep,
  claim: ProofClaim,
  accepted: ProofClaim[]
): PathState | null {
  if (step.kind === 'edge') {
    const edge = def.connections.find((edge) => edge.id === step.reference)
    return edge ? applyConnection(state, edge) : null
  }
  if (step.kind === 'hypothesis') {
    const pair = declaredConnections(claim).find((pair) => pair.id === step.reference)
    return claim.rule === 'cantorHop' && pair
      ? applyHypothesis(state, pair, claim.scope, step.reverse)
      : null
  }
  for (const lemma of accepted) {
    if (step.reverse && lemma.rule === 'finite') continue
    const pair = declaredConnections(lemma).find((pair) => pair.id === step.reference)
    if (pair) return applyLemma(state, pair, step.reverse)
  }
  return null
}

export function traceWitness(
  def: PathMazeDefinition,
  start: PathState,
  steps: ProofStep[],
  claim: ProofClaim,
  accepted: ProofClaim[]
): { states: PathState[]; error: string | null } {
  const states = [start]
  for (let i = 0; i < steps.length; i++) {
    const next = applyProofStep(def, states.at(-1)!, steps[i], claim, accepted)
    if (!next) return { states, error: `Step ${i + 1} cannot be used at this address.` }
    states.push(next)
  }
  return { states, error: null }
}

function claimError(def: PathMazeDefinition, claim: ProofClaim): string | null {
  const declarations = declaredConnections(claim)
  const states = declarations.flatMap((pair) => [pair.from, pair.to])
  if (
    states.some(
      (state) =>
        !def.paths.some((path) => path.id === state.path) ||
        state.address.some((copy) => !def.copies.includes(copy))
    )
  )
    return 'Choose existing paths and copy addresses.'
  if (
    claim.scope.some((copy) => !def.copies.includes(copy)) ||
    (claim.rule !== 'infiniteHop' && states.some((state) => !begins(state.address, claim.scope)))
  )
    return 'Both endpoints must be inside the declared scope.'
  if (declarations.some((pair) => sameState(pair.from, pair.to)))
    return 'Choose two different endpoints.'
  if (new Set(declarations.map((pair) => pair.id)).size !== declarations.length)
    return 'Each declared connection needs a unique ID.'
  return claimRuleError(def, claim)
}

function claimRuleError(def: PathMazeDefinition, claim: ProofClaim): string | null {
  const declarations = declaredConnections(claim)
  if (claim.rule !== 'cantorHop' && claim.companions?.length)
    return 'Joint hypotheses are available under Cantor-hop rules only.'
  if (claim.rule !== 'infiniteHop' && claim.setup)
    return 'Setup trails are available for infinite hops only.'
  if (claim.rule !== 'finite' && def.allowedRule === 'finite')
    return 'This maze permits finite paths only.'
  if (claim.rule === 'cantorHop' && def.allowedRule !== 'cantorHop')
    return 'Cantor hops are not enabled for this maze.'
  if (
    claim.rule === 'infiniteHop' &&
    (!claim.period.length || claim.period.some((copy) => !def.copies.includes(copy)))
  )
    return 'A repeating word must contain at least one existing copy.'
  if (
    declarations.some((pair) => !pair.witness.length) ||
    (claim.rule === 'infiniteHop' && !claim.second.length)
  )
    return 'Build the required witness routes before checking.'
  return null
}

function bidirectional(def: PathMazeDefinition): boolean {
  return def.connections.every((edge) =>
    def.connections.some(
      (reverse) =>
        reverse.from === edge.to &&
        reverse.to === edge.from &&
        reverse.copy === edge.copy &&
        reverse.operation ===
          (edge.operation === 'enter' ? 'exit' : edge.operation === 'exit' ? 'enter' : 'walk')
    )
  )
}

function jointWitnessError(
  def: PathMazeDefinition,
  claim: ProofClaim,
  accepted: ProofClaim[]
): string | null {
  for (const [index, pair] of (claim.companions ?? []).entries()) {
    const witness = traceWitness(def, pair.from, pair.witness, claim, accepted)
    if (witness.error || !sameState(witness.states.at(-1)!, pair.to))
      return `Related connection ${index + 2}: ${witness.error ?? 'its witness does not reach the target.'}`
    if (witness.states.some(state => !begins(state.address, claim.scope)))
      return `Related connection ${index + 2} leaves the common scope.`
  }
  return null
}

export function checkClaim(
  def: PathMazeDefinition,
  claim: ProofClaim,
  accepted: ProofClaim[] = []
): ProofCheck {
  const fail = (message: string): ProofCheck => ({ valid: false, message, first: [], second: [] })
  const error = claimError(def, claim)
  if (error) return fail(error)
  if (claim.rule !== 'finite' && !bidirectional(def))
    return fail(
      'These hop rules require bidirectional connections. Review one-way arrows or use finite routes.'
    )
  const permitted =
    claim.rule === 'finite' ? accepted.filter((lemma) => lemma.rule === 'finite') : accepted
  return checkWitnesses(def, claim, permitted)
}

function checkWitnesses(def: PathMazeDefinition, claim: ProofClaim, permitted: ProofClaim[]): ProofCheck {
  const fail = (message: string): ProofCheck => ({ valid: false, message, first: [], second: [] })
  const left = infiniteWitness(def, claim, permitted, 'first')
  const right = infiniteWitness(def, claim, permitted, 'second')
  const first = claim.rule === 'infiniteHop' ? left.cycle : traceWitness(def, claim.from, claim.first, claim, permitted)
  const second = right.cycle
  const error = witnessError(claim, left, right, first, second)
  if (error) return fail(error)
  const jointError = jointWitnessError(def, claim, permitted)
  if (jointError) return fail(jointError)
  return {
    valid: true,
    message:
      claim.rule === 'finite'
        ? 'Finite route checked.'
        : claim.rule === 'connection'
          ? 'Connection checked using saved claims.'
        : `Derivation checked under ${claim.rule === 'cantorHop' ? 'Cantor-hop' : 'infinite-hop'} rules. This is not a finite route.`,
    first: claim.rule === 'infiniteHop' ? [...left.setup.states.slice(0, -1), ...first.states] : first.states,
    second: claim.rule === 'infiniteHop' ? [...right.setup.states.slice(0, -1), ...second.states] : [],
  }
}

export function infiniteWitness(def: PathMazeDefinition, claim: ProofClaim, accepted: ProofClaim[], side: 'first' | 'second') {
  const start = side === 'first' ? claim.from : claim.to
  const setup = traceWitness(def, start, claim.setup?.[side] ?? [], claim, accepted)
  const anchor = setup.states.at(-1)!
  const target = { ...anchor, address: [...claim.scope, ...claim.period, ...anchor.address.slice(claim.scope.length)] }
  const cycle = traceWitness(def, anchor, claim[side], claim, accepted)
  return { setup, anchor, target, cycle }
}

/** Recheck in order against the current topology; editing connections invalidates stale lemmas. */
export function checkedClaims(def: PathMazeDefinition): ProofClaim[] {
  const accepted: ProofClaim[] = []
  const ids = new Set<string>()
  for (const claim of def.claims) {
    const declared = declaredConnections(claim)
    if (declared.some((pair) => ids.has(pair.id)) || !checkClaim(def, claim, accepted).valid)
      continue
    declared.forEach((pair) => ids.add(pair.id))
    accepted.push(claim)
  }
  return accepted
}

function witnessError(claim: ProofClaim, left: ReturnType<typeof infiniteWitness>, right: ReturnType<typeof infiniteWitness>, first: ReturnType<typeof traceWitness>, second: ReturnType<typeof traceWitness>): string | null {
  if (claim.rule === 'infiniteHop' && (left.setup.error || right.setup.error))
    return (left.setup.error ?? right.setup.error!)
  if (first.error || (claim.rule === 'infiniteHop' && second.error))
    return (first.error ?? second.error!)
  const firstTarget = claim.rule === 'infiniteHop' ? left.target : claim.to
  if (!sameState(first.states.at(-1)!, firstTarget))
    return ('The first witness does not reach its required endpoint.')
  if (claim.rule === 'infiniteHop' && !sameState(second.states.at(-1)!, right.target))
    return ('The second witness must reach the same repeating word on its own side.')
  if (claim.rule !== 'finite' && claim.rule !== 'connection' &&
    [...first.states, ...(claim.rule === 'infiniteHop' ? second.states : [])].some(state => !begins(state.address, claim.scope)))
    return ('Repeating witnesses and descendant derivations must stay inside the common scope.')
  return null
}
