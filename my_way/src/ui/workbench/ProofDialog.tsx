import { lazy, Suspense } from 'react'
import { Dialog } from '../components/Dialog'
import type { MazeArtwork, PathMazeDefinition } from '../../core/model/pathMaze'
import { checkedClaims } from '../../core/pathMaze/proofs'
const ProofWorkbench = lazy(() =>
  import('./ProofWorkbench').then((module) => ({ default: module.ProofWorkbench }))
)

export default function ProofDialog({
  title,
  model,
  claimsInUse,
  onChange,
  onClose,
  artwork,
}: {
  title: string
  claimsInUse: boolean
  model: PathMazeDefinition
  onChange: (model: PathMazeDefinition) => void
  onClose: () => void
  artwork?: MazeArtwork
}) {
  return (
    <Dialog
      title="Proof notebook"
      eyebrow={title}
      className="proof-dialog"
      closeLabel="Close proof notebook"
      onClose={onClose}
      footer={
        <>
          <p>
            {checkedClaims(model).length
              ? 'Your checked connections are ready. Return to the maze to use the highlighted proof action.'
              : 'Check below the trails to save a connection.'}
          </p>
          <button className="control control--primary" onClick={onClose}>
            Return to maze
          </button>
        </>
      }
    >
      <Suspense fallback={<p role="status">Opening proof notebook…</p>}>
        <ProofWorkbench
          model={model}
          artwork={artwork}
          onChange={onChange}
          inPlay
          claimsInUse={claimsInUse}
        />
      </Suspense>
    </Dialog>
  )
}
