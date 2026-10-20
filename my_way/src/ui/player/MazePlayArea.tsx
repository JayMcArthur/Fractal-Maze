import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { loadReplay } from '../../app/projects/db'
import { bundledReplays, loadBundledReplay } from '../../app/library/bundledReplays'
import type { ReplayDocument } from '../../core/replay/ReplayDocument'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { MazeReplayBar } from '../replay/MazeReplayBar'
import { ReplayPlayback } from '../replay/ReplayPlayback'

export function MazePlayArea({
  doc,
  children,
}: {
  doc: RecursiveMazeDocument
  children: ReactNode
}) {
  const [query] = useSearchParams(),
    selected = query.get('replay') ?? ''
  const [result, setResult] = useState<{ id: string; mazeId: string; replay?: ReplayDocument; error?: string }>()
  const bundle = bundledReplays.find(
    (bundle) => bundle.id === selected && bundle.mazeId === doc.metadata.id
  )
  useEffect(() => {
    if (!selected) return
    let active = true
    const open = bundle
      ? loadBundledReplay(bundle)
      : loadReplay(selected).then((record) =>
          record?.mazeId === doc.metadata.id ? record.doc : undefined
        )
    void open
      .then((replay) => {
        if (active)
          setResult({
            id: selected,
            mazeId: doc.metadata.id,
            replay,
            error: replay ? undefined : 'This replay does not belong to this maze.',
          })
      })
      .catch((error: Error) => {
        if (active) setResult({ id: selected, mazeId: doc.metadata.id, error: error.message })
      })
    return () => {
      active = false
    }
  }, [selected, bundle, doc.metadata.id])
  const current = result?.id === selected && result.mazeId === doc.metadata.id ? result : undefined
  return (
    <div className="maze-play-area">
      {!selected ? (
        children
      ) : current?.replay ? (
        <ReplayPlayback key={selected} doc={current.replay} />
      ) : (
        <p role="status">
          {current?.error ?? 'Opening replay…'}
        </p>
      )}
      <MazeReplayBar maze={doc} selected={selected} />
    </div>
  )
}
