import { describe, expect, it } from 'vitest'
import { loadCatalogMaze, catalog } from '../app/library'
import { proofExamples } from '../app/library/proofExamples'
import type { PathMazeDefinition, ProofClaim, ProofStep } from '../core/model/pathMaze'
import {
  applyConnection,
  availableMoves,
  connectionsFromPairs,
  runPathInput,
  sameState,
  searchPaths,
} from '../core/pathMaze/traversal'
import { checkClaim, checkedClaims } from '../core/pathMaze/proofs'
import { exportPathPDA } from '../core/pathMaze/exportPDA'
import { buildNativeReplay } from '../core/replay/nativeReplay'
import { importReplay } from '../core/replay/importReplay'
import { validateMaze } from '../core/validate/validateMaze'
import { fmazeExportAdapter, fmazeImportAdapter } from '../core/io/adapters/fmazeAdapter'

const model = (id: string) => loadCatalogMaze(id)!.definition as PathMazeDefinition
const step = (reference: string): ProofStep => ({ kind: 'edge', reference, reverse: false })
const claim = (patch: Partial<ProofClaim> = {}): ProofClaim => ({
  id: 'claim',
  rule: 'cantorHop',
  from: { path: '1', address: [] },
  to: { path: '3', address: [] },
  period: [],
  scope: [],
  first: [],
  second: [],
  ...patch,
})

describe('path-labeled image conversions', () => {
  it.each([1, 3, 4, 5, 6])('accepts the complete input from Jay’s source fixture %i', (fixture) => {
    const def = model(`pda-guide-${fixture}`)
    const result = runPathInput(def, def.providedInput!)
    expect(result.accepted).toBe(true)
    const route = result.route!
    expect(route).not.toBeNull()
    expect(route.edges).toHaveLength(def.providedInput!.length)
    expect(sameState(route.states.at(-1)!, def.goal!)).toBe(true)
    expect(route.states.at(-1)!.address).toEqual([])
  })
  it('preserves alternatives instead of overwriting transitions with the same input', () => {
    const def = model('pda-guide-1')
    def.connections = connectionsFromPairs(
      [
        ['1-2', '/A'],
        ['1-2', '/B'],
      ],
      'Image crossing'
    )
    expect(availableMoves(def, def.start!).map((move) => move.next.address)).toEqual([['A'], ['B']])
    expect(applyConnection({ path: '2', address: ['B'] }, def.connections[1])).toBeNull()
    expect(applyConnection({ path: '2', address: [] }, def.connections[1])).toBeNull()
    expect(applyConnection({ path: '2', address: ['A', 'B'] }, def.connections[3])).toEqual({
      path: '1',
      address: ['A'],
    })
  })
  it('labels source helper states and the disputed Wolfram connection', () => {
    expect(model('pda-guide-4').paths.find((path) => path.id === '5')?.helper).toBe(true)
    expect(model('pda-guide-2').paths.find((path) => path.id === 'C')?.label).toBe('19')
    expect(model('pda-guide-2').notes.join(' ')).toContain('3–7 A/')
    const wolf = model('pda-guide-2')
    const rejected = runPathInput(wolf, wolf.providedInput!)
    expect(rejected.accepted).toBe(false)
    expect(rejected.consumed).toBe(wolf.providedInput!.length)
    expect(rejected.route?.states.at(-1)).toEqual({ path: 'A', address: ['A', 'B'] })
    wolf.goal = { path: 'A', address: ['A', 'B'] }
    expect(runPathInput(wolf, wolf.providedInput!).route?.states.at(-1)).toEqual(wolf.goal)
  })
  it('keeps epsilon traversal in finite search and refuses a misleading literal-token result', () => {
    const def = model('pda-guide-1')
    def.connections = def.connections.map((edge) => ({ ...edge, input: '' }))
    expect(searchPaths(def, 6).route?.states.at(-1)).toEqual(def.goal)
    expect(() => runPathInput(def, '12')).toThrow('epsilon transitions')
  })
  it('keeps the last legal input prefix available for a rejected replay', () => {
    const def = model('pda-guide-1')
    const result = runPathInput(def, def.providedInput! + 'invalid')
    expect(result.accepted).toBe(false)
    expect(result.consumed).toBe(def.providedInput!.length)
    expect(result.route?.edges).toHaveLength(def.providedInput!.length)
    expect(result.route?.states.at(-1)).toEqual(def.goal)
  })
  it('validates and round-trips every WIP document without removing artwork or claims', () => {
    for (const entry of catalog.filter((entry) => entry.tags.includes('pda'))) {
      const doc = loadCatalogMaze(entry.id)!
      expect(validateMaze(doc).valid, entry.title).toBe(true)
      expect(fmazeImportAdapter.import(fmazeExportAdapter.export(doc))).toEqual(doc)
    }
  })
  it('reports search limits without inferring unreachable infinite endpoints', () => {
    const def = proofExamples()[0].definition as PathMazeDefinition
    expect(searchPaths(def, 2)).toEqual({ route: null, visited: 3, limited: true })
    expect(searchPaths(def, 10, 2)).toEqual({ route: null, visited: 2, limited: true })
    def.connections = []
    expect(searchPaths(def, 2)).toEqual({ route: null, visited: 1, limited: false })
    def.start = null
    expect(searchPaths(def, 2).visited).toBe(0)
  })
  it('exports stack operations faithfully and validates a solver replay against every recorded edge', () => {
    const doc = loadCatalogMaze('pda-guide-1')!
    const def = doc.definition as PathMazeDefinition
    const route = searchPaths(def, 6).route!
    expect(route).not.toBeNull()
    const pda = exportPathPDA(def)
    const enter = pda.transitions.find(
      (edge) => edge.source === def.connections[0].id && edge.pop === '⊥'
    )!
    expect(enter.push).toEqual(['⊥', 'A'])
    expect(pda.transitions.find((edge) => edge.source === def.connections[1].id)?.pop).toBe('A')
    const replay = buildNativeReplay(doc, { type: 'pathPushdown', ...route }, 'solver', true)
    expect(importReplay(JSON.stringify(replay))).toEqual(replay)
    replay.nativeRoute = {
      type: 'pathPushdown',
      states: route.states,
      edges: ['missing', ...route.edges.slice(1)],
    }
    expect(() => importReplay(JSON.stringify(replay))).toThrow('illegal stack transition')
  })
})

describe('proofs under explicit infinite movement rules', () => {
  const cantorId = 'proof-maze-images-siggy-simple-cantor-maze-svg'
  const cantorProof = () =>
    claim({
      first: [
        step('edge-0-in'),
        { kind: 'hypothesis', reference: 'claim', reverse: false },
        step('edge-1-out'),
        step('edge-2-in'),
        { kind: 'hypothesis', reference: 'claim', reverse: false },
        step('edge-3-out'),
      ],
    })
  it('checks a user-built Cantor derivation and rejects a circular hypothesis at the surface', () => {
    const def = model(cantorId)
    expect(checkClaim(def, cantorProof()).valid).toBe(true)
    expect(
      checkClaim(
        def,
        claim({ first: [{ kind: 'hypothesis', reference: 'claim', reverse: false }] })
      ).valid
    ).toBe(false)
    expect(checkClaim(def, claim()).message).toContain('Build the required witness')
  })
  it('requires both infinite-hop witnesses, the same nonempty repeat, and legal movement rules', () => {
    const def = proofExamples()[0].definition as PathMazeDefinition
    const proof = claim({
      rule: 'infiniteHop',
      to: { path: '2', address: [] },
      period: ['A'],
      first: [step('edge-0-in')],
      second: [step('edge-1-in')],
    })
    expect(checkClaim(def, proof).valid).toBe(true)
    expect(checkClaim(def, { ...proof, period: [] }).valid).toBe(false)
    expect(checkClaim(def, { ...proof, period: ['B'] }).valid).toBe(false)
    expect(checkClaim(def, { ...proof, second: [] }).valid).toBe(false)
    expect(checkClaim({ ...def, allowedRule: 'finite' }, proof).valid).toBe(false)
    expect(checkClaim(def, { ...proof, rule: 'cantorHop' }).valid).toBe(false)
    expect(
      checkClaim(def, { ...proof, second: [step('edge-1-in'), step('edge-1-in')] }).valid
    ).toBe(false)
  })
  it('supports nested infinite hops through earlier checked lemmas and invalidates edited topology', () => {
    const def = proofExamples()[1].definition as PathMazeDefinition
    const first = claim({
      id: 'first',
      rule: 'infiniteHop',
      to: { path: '2', address: [] },
      period: ['A'],
      first: [step('edge-0-in')],
      second: [step('edge-1-in')],
    })
    def.claims = [first]
    const nested = claim({
      rule: 'infiniteHop',
      period: ['B'],
      first: [{ kind: 'lemma', reference: 'first', reverse: false }, step('edge-2-in')],
      second: [step('edge-3-in')],
    })
    expect(checkClaim(def, nested, checkedClaims(def)).valid).toBe(true)
    expect(checkClaim(def, nested).valid).toBe(false)
    expect(checkClaim(def, { ...nested, rule: 'finite' }, checkedClaims(def)).valid).toBe(false)
    def.claims.push(nested)
    expect(checkedClaims(def)).toHaveLength(2)
    def.connections = def.connections.filter((edge) => edge.id !== 'edge-0-in')
    expect(checkedClaims(def)).toHaveLength(0)
  })
  it('rejects unknown paths, invalid scopes, self-lemmas and non-reaching finite evidence', () => {
    const def = model(cantorId)
    expect(checkClaim(def, claim({ from: { path: 'unknown', address: [] } })).valid).toBe(false)
    expect(checkClaim(def, claim({ scope: ['A'] })).valid).toBe(false)
    expect(checkClaim(def, claim({ to: { path: '1', address: [] } })).valid).toBe(false)
    expect(checkClaim(def, claim({ rule: 'finite', first: [step('edge-0-in')] })).valid).toBe(false)
    expect(
      checkClaim(def, claim({ first: [{ kind: 'lemma', reference: 'claim', reverse: false }] }))
        .valid
    ).toBe(false)
    const proof = cantorProof()
    const reversed = {
      ...proof,
      first: [
        step('edge-0-in'),
        { kind: 'hypothesis' as const, reference: 'claim', reverse: true },
      ],
    }
    expect(checkClaim(def, reversed).valid).toBe(false)
  })
  it('checks every member of a joint Cantor claim before admitting any of its lemmas', () => {
    const def = model(cantorId)
    def.copies = ['A']
    def.connections = connectionsFromPairs(
      [
        ['1-2', '/A'],
        ['2-3', '/A'],
        ['2-1', '/A'],
        ['3-2', '/A'],
      ],
      'Joint Cantor example'
    )
    const joint = claim({
      to: { path: '2', address: [] },
      first: [
        step('edge-0-in'),
        { kind: 'hypothesis', reference: 'related', reverse: false },
        step('edge-1-out'),
      ],
      companions: [
        {
          id: 'related',
          from: { path: '2', address: [] },
          to: { path: '3', address: [] },
          witness: [
            step('edge-2-in'),
            { kind: 'hypothesis', reference: 'claim', reverse: false },
            step('edge-3-out'),
          ],
        },
      ],
    })
    expect(checkClaim(def, joint).valid).toBe(true)
    expect(checkClaim(def, { ...joint, companions: [] }).valid).toBe(false)
    expect(
      checkClaim(def, { ...joint, companions: [{ ...joint.companions![0], witness: [] }] }).valid
    ).toBe(false)
    def.claims = [joint]
    const dependent = claim({
      id: 'later',
      first: [
        { kind: 'lemma', reference: 'claim', reverse: false },
        { kind: 'lemma', reference: 'related', reverse: false },
      ],
    })
    expect(checkClaim(def, dependent, checkedClaims(def)).valid).toBe(true)
    expect(checkClaim(def, { ...dependent, rule: 'finite' }, checkedClaims(def)).valid).toBe(false)
  })

  it('does not reverse a directed finite lemma or apply undirected hop rules to arrows', () => {
    const def = model(cantorId)
    def.connections = [
      {
        id: 'arrow',
        from: '1',
        to: '2',
        operation: 'walk',
        copy: '',
        input: '2',
        evidence: 'One-way arrow',
      },
    ]
    const finite = claim({
      id: 'arrow-lemma',
      rule: 'finite',
      to: { path: '2', address: [] },
      first: [step('arrow')],
    })
    expect(checkClaim(def, finite).valid).toBe(true)
    def.claims = [finite]
    expect(
      checkClaim(
        def,
        claim({
          rule: 'finite',
          from: { path: '2', address: [] },
          to: { path: '1', address: [] },
          first: [{ kind: 'lemma', reference: 'arrow-lemma', reverse: true }],
        }),
        checkedClaims(def)
      ).valid
    ).toBe(false)
    expect(checkClaim(def, claim({ first: [step('arrow')] })).message).toContain('bidirectional')
  })
})
