import { lazy, Suspense, useEffect, useRef } from 'react'
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
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      previousFocus?.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-dialog-title"
      className="proof-dialog"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <header className="proof-dialog__header">
        <div>
          <p className="maze-kicker">{title}</p>
          <h2 id="proof-dialog-title">Proof notebook</h2>
          <p>Your run stays here. Close this notebook to continue.</p>
        </div>
        <button className="icon-control" aria-label="Close proof notebook" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="proof-dialog__body">
        <Suspense fallback={<p role="status">Opening proof notebook…</p>}>
          <ProofWorkbench model={model} artwork={artwork} onChange={onChange} inPlay claimsInUse={claimsInUse} />
        </Suspense>
      </div>
      <footer className="proof-dialog__footer">
        <p>{checkedClaims(model).length
          ? 'Your checked connections are ready. Return to the maze to use the highlighted proof action.'
          : 'Build the trails, check them, then save the connection to use it in your run.'}</p>
        <button className="control control--primary" onClick={onClose}>
          Return to maze
        </button>
      </footer>
    </dialog>
  )
}
