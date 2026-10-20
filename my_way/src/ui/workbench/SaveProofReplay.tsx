import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { PathMazeDefinition, ProofClaim } from '../../core/model/pathMaze'
import type { ProofCheck } from '../../core/pathMaze/proofs'
import { sameState, reachesGoal } from '../../core/pathMaze/traversal'
import { buildNativeReplay } from '../../core/replay/nativeReplay'
import { saveReplay } from '../../app/projects/db'

export function SaveProofReplay({ document, model, claim, result }: {
  document: RecursiveMazeDocument; model: PathMazeDefinition; claim: ProofClaim; result: ProofCheck | null
}) {
  const navigate = useNavigate(), [error, setError] = useState('')
  if (!result?.valid || claim.rule !== 'connection' || !model.start || !sameState(claim.from, model.start) || !reachesGoal(model, claim.to)) return null
  const save = async () => {
    try {
      const maze = { ...document, definition: model }
      const doc = buildNativeReplay(maze, { type: 'infiniteRule', states: result.first, edges: claim.first.map(step => step.reference), proofSteps: claim.first }, 'human', true)
      const id = crypto.randomUUID()
      await saveReplay({ id, mazeId: document.metadata.id, mazeTitle: document.metadata.title, doc, createdAt: new Date().toISOString() })
      navigate(`/play/${document.metadata.id}?replay=${id}`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save proof replay.') }
  }
  return <><button className="control" onClick={save}>Save & play proof solution</button>{error && <p role="alert">{error}</p>}</>
}
