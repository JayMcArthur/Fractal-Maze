import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveProject } from '../../app/projects/db'

/** Keep the saved project while opening the latest built-in conversion as a new project. */
export function CatalogCopyButton({ id }: { id: string }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const copy = async () => {
    setBusy(true)
    setError('')
    try {
      const [{ loadCatalogMaze }, { hydrateArtwork }] = await Promise.all([
        import('../../app/library/catalog'),
        import('../../app/library/pathCatalog'),
      ])
      const doc = await hydrateArtwork(loadCatalogMaze(id)!)
      const now = new Date().toISOString()
      doc.metadata = {
        ...doc.metadata,
        id: crypto.randomUUID(),
        title: `${doc.metadata.title} — catalog copy`,
        createdAt: now,
        updatedAt: now,
      }
      await saveProject(doc)
      navigate(`/play/${doc.metadata.id}`)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not copy the catalog maze.')
      setBusy(false)
    }
  }
  return <>
    <button className="control" disabled={busy} onClick={() => { void copy() }}>
      {busy ? 'Copying…' : 'Copy current catalog maze'}
    </button>
    {error && <p role="alert">{error}</p>}
  </>
}
