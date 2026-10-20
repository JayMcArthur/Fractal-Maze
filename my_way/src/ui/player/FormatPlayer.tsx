import { PlayHeader } from './PlayHeader'
import { MazePlayArea } from './MazePlayArea'
import { TourPlayer } from './TourPlayer'
import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { mazeEntry } from '../../app/library/mazeViews'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { saveProject } from '../../app/projects/db'
import { NavBar } from '../components/NavBar'
import { ExportDialog } from '../components/ExportDialog'
import { GraphPlayer } from './GraphPlayer'
import { BlockPlayer } from './BlockPlayer'
import { portPlayDocument } from '../../app/library/portPlayDocument'
import { geometricPlayDocument } from '../../app/library/geometricPlayDocument'
import { wirePlayDocument } from '../../app/library/wirePlayDocument'
import { RepeatedPlayer } from './RepeatedPlayer'
import { PathPlayer } from '../workbench/PathPlayer'
import { MazeViewSelect } from '../library/MazeViewSelect'

export function FormatPlayer({ doc: original }: { doc: RecursiveMazeDocument }) {
  const [draft, setDraft] = useState(original)
  const doc = useMemo(
    () =>
      geometricPlayDocument(original) ??
      portPlayDocument(original) ??
      wirePlayDocument(original) ??
      original,
    [original]
  )
  const [exporting, setExporting] = useState(false)
  const [saveStatus, setSaveStatus] = useState('Save to library')
  const launch = mazeEntry(doc.metadata.id, doc)
  if (!launch.playable) return <Navigate to={launch.to} replace />
  return (
    <div className="app-page">
      <NavBar />
      <main className="player-frame format-frame">
        <PlayHeader doc={doc}>
          <Link className="control" to="/library">
            Library
          </Link>
          <button
            className="control"
            onClick={() => {
              void saveProject(draft)
                .then(() => setSaveStatus('Saved'))
                .catch(() => setSaveStatus('Save failed'))
            }}
          >
            {saveStatus}
          </button>
          <button className="control" onClick={() => setExporting(true)}>
            Export
          </button>
        </PlayHeader>
        <MazeViewSelect id={doc.metadata.id} play />
        <MazePlayArea doc={doc}>
          {doc.representationType === 'recursiveTour' && <TourPlayer doc={doc} />}
          {doc.representationType === 'graphLabeled' && <GraphPlayer doc={doc} />}
          {doc.representationType === 'blockRecursive' && (
            <BlockPlayer
              doc={draft}
              onChange={(next) => {
                setDraft(next)
                setSaveStatus('Save to library')
              }}
            />
          )}
          {doc.representationType === 'repeatedDirected' && <RepeatedPlayer doc={doc} />}
          {(doc.definition.type === 'infiniteRule' || doc.definition.type === 'pathPushdown') && (
            <PathPlayer doc={doc} model={doc.definition} />
          )}
        </MazePlayArea>
      </main>
      {exporting && <ExportDialog doc={draft} onClose={() => setExporting(false)} />}
    </div>
  )
}
