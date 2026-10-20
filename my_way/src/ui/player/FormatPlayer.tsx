import { compilePlayDocument } from '../../app/library/compilePlayDocument'
import { MazeCredits } from './MazeCredits'
import { PlayHeader } from './PlayHeader'
import { MazePlayArea } from './MazePlayArea'
import { TourPlayer } from './TourPlayer'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { mazeEntry } from '../../app/library/mazeViews'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { saveProject } from '../../app/projects/db'
import { NavBar } from '../components/NavBar'
import { ExportDialog } from '../components/ExportDialog'
import { GraphPlayer } from './GraphPlayer'
import { BlockPlayer } from './BlockPlayer'
import { RepeatedPlayer } from './RepeatedPlayer'
import { PathPlayer } from '../workbench/PathPlayer'
import { MazeWip } from './MazeWip'
import { MazeViewSelect } from '../library/MazeViewSelect'

export function FormatPlayer({ doc: original }: { doc: RecursiveMazeDocument }) {
  const [draft, setDraft] = useState(original)
  const doc = useMemo(() => compilePlayDocument(original), [original])
  const [exporting, setExporting] = useState(false)
  const [saveStatus, setSaveStatus] = useState('Save to library')
  const launch = mazeEntry(doc.metadata.id, doc)
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
        {!launch.playable ? <MazeWip doc={doc} /> : <MazePlayArea doc={doc}>
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
        </MazePlayArea>}
        <MazeCredits doc={original} />
      </main>
      {exporting && <ExportDialog doc={draft} onClose={() => setExporting(false)} />}
    </div>
  )
}
