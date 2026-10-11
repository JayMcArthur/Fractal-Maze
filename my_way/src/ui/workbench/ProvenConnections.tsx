import type { ProofClaim } from '../../core/model/pathMaze'
import { declaredConnections } from '../../core/pathMaze/proofs'
import { stateKey, stateLabel } from '../../core/pathMaze/traversal'

export function ProvenConnections({ claims }: { claims: ProofClaim[] }) {
  const connections = new Map<string, { label: string; proofs: number }>()
  for (const claim of claims)
    for (const pair of declaredConnections(claim)) {
      const endpoints = [stateKey(pair.from), stateKey(pair.to)]
      if (claim.rule !== 'finite') endpoints.sort()
      const key = JSON.stringify(endpoints)
      const existing = connections.get(key)
      if (existing) existing.proofs++
      else
        connections.set(key, {
          label: `${stateLabel(pair.from)} ${claim.rule === 'finite' ? '→' : '↔'} ${stateLabel(pair.to)}`,
          proofs: 1,
        })
    }
  return (
    <details className="workbench-card proven-connections">
      <summary>Proven connections ({connections.size})</summary>
      <p>
        Different repeating words can prove the same connection. Each proof remains in your
        notebook.
      </p>
      <ul>
        {[...connections].map(([key, connection]) => (
          <li key={key}>
            <code>{connection.label}</code> · {connection.proofs}{' '}
            {connection.proofs === 1 ? 'proof' : 'proofs'}
          </li>
        ))}
      </ul>
    </details>
  )
}
