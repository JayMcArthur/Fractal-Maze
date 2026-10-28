import { lazy, Suspense } from 'react'
import { Dialog } from '../components/Dialog'
import type { PathPlayPosition } from '../../core/play/pathSession'
import type { CheckedProofStep } from '../../core/play/proofMovement'
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
  position,
  onFollow,
}: {
  position?: PathPlayPosition
  onFollow: (step: CheckedProofStep) => void
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
              ? 'Follow a checked connection from its card, or return to keep exploring.'
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
          position={position}
          onFollow={onFollow}
          artwork={artwork}
          onChange={onChange}
          inPlay
          claimsInUse={claimsInUse}
        />
      </Suspense>
    </Dialog>
  )
}
