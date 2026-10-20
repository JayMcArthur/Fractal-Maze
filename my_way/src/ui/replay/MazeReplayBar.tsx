import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bundledReplays } from '../../app/library/bundledReplays'
import { replayViewsForMaze } from '../../app/library/mazeViews'
import { listReplays, saveReplay, type ReplayRecord } from '../../app/projects/db'
import { importReplay } from '../../core/replay/importReplay'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'

export function MazeReplayBar({
  maze,
  selected,
}: {
  maze: RecursiveMazeDocument
  selected: string
}) {
  const navigate = useNavigate()
  const [records, setRecords] = useState<ReplayRecord[]>([]),
    [error, setError] = useState('')
  const family = replayViewsForMaze(maze.metadata.id),
    ids = family.length ? family.map((view) => view.id) : [maze.metadata.id]
  const familyKey = ids.join(',')
  useEffect(() => {
    let active = true
    void Promise.all(familyKey.split(',').map((id) => listReplays(id)))
      .then((groups) => {
        if (active) setRecords(groups.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
      })
      .catch((error: Error) => {
        if (active) setError(error.message)
      })
    return () => {
      active = false
    }
  }, [familyKey, selected])
  const bundles = bundledReplays.filter((bundle) => ids.includes(bundle.mazeId))
  const viewLabel = (id: string) => family.find((view) => view.id === id)?.label
  const open = (replay: string) => {
    if (!replay) {
      navigate(`/play/${maze.metadata.id}`)
      return
    }
    const mazeId =
      bundles.find((bundle) => bundle.id === replay)?.mazeId ??
      records.find((record) => record.id === replay)?.mazeId
    if (mazeId) navigate(`/play/${mazeId}?replay=${encodeURIComponent(replay)}`)
  }
  const importFile = async (file?: File) => {
    if (!file) return
    setError('')
    if (file.size > 20 * 1024 * 1024) {
      setError('Choose a replay smaller than 20 MB.')
      return
    }
    try {
      const doc = importReplay(await file.text()),
        id = crypto.randomUUID()
      await saveReplay({
        id,
        mazeId: doc.mazeRef,
        mazeTitle: doc.mazeTitle,
        doc,
        createdAt: doc.startedAt,
      })
      navigate(`/play/${doc.mazeRef}?replay=${id}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not import replay.')
    }
  }
  return (
    <section className="maze-replay-bar" aria-label="Maze replays">
      <label>
        <span>Replays</span>
        <select
          className="control"
          aria-label="Maze replay"
          value={selected}
          onChange={(event) => open(event.target.value)}
        >
          <option value="">Your live run</option>
          {bundles.length > 0 && (
            <optgroup label="Shared solutions">
              {bundles.map((bundle) => (
                <option key={bundle.id} value={bundle.id}>
                  Solution{bundle.proofAssisted ? ' · proof assisted' : ''} · {bundle.moves} {bundle.moves === 1 ? 'move' : 'moves'}
                  {viewLabel(bundle.mazeId) ? ` · ${viewLabel(bundle.mazeId)}` : ''}
                  {bundles.filter(choice => choice.mazeId === bundle.mazeId).length > 1 ? ` · ${bundle.title}` : ''}
                </option>
              ))}
            </optgroup>
          )}
          {records.length > 0 && (
            <optgroup label="Your recordings">
              {records.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.doc.solverOrPlayer === 'solver'
                    ? record.doc.status === 'complete'
                      ? 'Solver solution'
                      : 'Partial solver run'
                    : record.doc.status === 'complete'
                      ? 'Player solution'
                      : 'Player run'}{' '}
                  · {record.doc.metrics.totalMoves} moves ·{' '}
                  {new Date(record.createdAt).toLocaleString()}
                  {viewLabel(record.mazeId) ? ` · ${viewLabel(record.mazeId)}` : ''}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>
      {selected && (
        <button className="control" onClick={() => open('')}>
          Return to play
        </button>
      )}
      <label className="control replay-import">
        Import replay
        <input
          aria-label="Import replay"
          type="file"
          accept=".json"
          className="sr-only"
          onChange={(event) => {
            void importFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </label>
      <p>
        {selected
          ? 'Playing the maze snapshot saved with this route.'
          : bundles.length
            ? 'Choose a shared solution or one of your recordings.'
            : 'Save a run to watch it here.'}
      </p>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
