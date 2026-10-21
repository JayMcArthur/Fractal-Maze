import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { loadReplay } from '../../app/projects/db'
import { bundledReplays } from '../../app/library/bundledReplays'
import { NavBar } from '../components/NavBar'

/** Existing shared/exported replay links open their maze's embedded playback. */
export function ReplayPage() {
  const { id } = useParams<{ id: string }>()
  const [result, setResult] = useState<{ id: string; mazeId?: string; error?: string }>()
  useEffect(() => {
    if (!id) return
    let active = true
    const bundled = bundledReplays.find((bundle) => bundle.id === id)
    const open = bundled
      ? Promise.resolve(bundled.mazeId)
      : loadReplay(id).then((record) => record?.mazeId)
    void open
      .then((mazeId) => {
        if (active)
          setResult({ id, mazeId, error: mazeId ? undefined : 'This replay is unavailable.' })
      })
      .catch((error: Error) => {
        if (active) setResult({ id, error: error.message })
      })
    return () => {
      active = false
    }
  }, [id])
  if (result?.id === id && result?.mazeId)
    return <Navigate to={`/play/${result.mazeId}?replay=${encodeURIComponent(id!)}`} replace />
  return (
    <div className="app-page">
      <NavBar />
      <main className="empty-state empty-state--page">
        <h1>{result?.error ?? 'Opening replay…'}</h1>
        {result?.error && <Link className="control" to="/library">Open library</Link>}
      </main>
    </div>
  )
}
