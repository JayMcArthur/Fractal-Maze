import { describe, expect, it } from 'vitest'
import type { PathMazeDefinition, ProofClaim, ProofStep } from '../core/model/pathMaze'
import { proofExamples } from '../app/library/proofExamples'
import { checkClaim, checkedClaims } from '../core/pathMaze/proofs'
import { connectionsFromPairs } from '../core/pathMaze/traversal'
import { buildNativeReplay } from '../core/replay/nativeReplay'
import { importReplay } from '../core/replay/importReplay'

const edge = (reference: string): ProofStep => ({ kind: 'edge', reference, reverse: false })
const steps = (...indices: number[]) => indices.map(i => edge(`edge-${i}-in`))
const setupProof = (): ProofClaim => ({
  id: 'setup-proof', rule: 'infiniteHop', from: { path: '1', address: [] }, to: { path: '2', address: [] },
  scope: ['A', 'B', 'C'], period: ['B', 'A', 'C'],
  setup: { first: steps(0, 2, 4), second: steps(1, 3, 5) }, first: steps(2, 0, 4), second: steps(3, 1, 5),
})
const model = () => ({
  ...(proofExamples()[0].definition as PathMazeDefinition), copies: ['A', 'B', 'C'],
  connections: connectionsFromPairs(['A', 'B', 'C'].flatMap(copy => [['1-1', `/${copy}`], ['2-2', `/${copy}`]]), 'Test trails'),
})

describe('generalized infinite proof construction', () => {
  it('checks ABC setup and BAC repetition on independent left and right paths', () => {
    const proof = setupProof(), result = checkClaim(model(), proof)
    expect(result.valid).toBe(true)
    expect(result.first.at(-1)).toEqual({ path: '1', address: ['A', 'B', 'C', 'B', 'A', 'C'] })
    expect(checkClaim(model(), { ...proof, second: steps(5, 1, 3) }).valid).toBe(false)
  })
  it('rejects a repeat that leaves its scope even when it returns to the target', () => {
    const proof = setupProof()
    proof.first = [edge('edge-4-out'), edge('edge-4-in'), ...proof.first]
    expect(checkClaim(model(), proof).message).toContain('stay inside the common scope')
  })
  it('supports different finite tails after the common setup address', () => {
    const proof = setupProof()
    proof.setup = { first: steps(0, 2, 4, 0), second: steps(1, 3, 5, 3) }
    proof.first = [edge('edge-0-out'), ...steps(2, 0, 4, 0)]
    proof.second = [edge('edge-3-out'), ...steps(3, 1, 5, 3)]
    expect(checkClaim(model(), proof).valid).toBe(true)
  })
  it('composes a checked hop into an exportable solution and rejects stale evidence', () => {
    const doc = proofExamples()[0], def = doc.definition as PathMazeDefinition
    const hop: ProofClaim = { ...setupProof(), scope: [], period: ['A'], setup: undefined, first: steps(0), second: steps(1) }
    def.claims = [hop]
    const first: ProofStep[] = [{ kind: 'lemma', reference: hop.id, reverse: false }]
    const final: ProofClaim = { ...hop, id: 'finish', rule: 'connection', first, second: [] }
    const result = checkClaim(def, final, checkedClaims(def))
    expect(result.valid).toBe(true)
    const replay = buildNativeReplay(doc, { type: 'infiniteRule', states: result.first, edges: [hop.id], proofSteps: first }, 'human', true)
    expect(importReplay(JSON.stringify(replay)).status).toBe('complete')
    ;(replay.maze.definition as PathMazeDefinition).claims[0].period = ['B']
    expect(() => importReplay(JSON.stringify(replay))).toThrow('unchecked connection')
  })
})
