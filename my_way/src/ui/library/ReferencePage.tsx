import { defaultPlayId } from '../../app/library/mazeViews'
import { assetUrl } from '../../core/io/assetUrl'
import { Link, useParams } from 'react-router-dom'
import references from '../../data/manifests/references.json'
import { NavBar } from '../components/NavBar'
import { referenceDraftId, sourcePlayableId } from '../../app/library/catalogIndex'

export function ReferencePage() {
  const { id } = useParams()
  const entry = references.find((reference) => reference.id === id)
  const url = entry ? assetUrl(entry.asset) : ''
  const originalPlay = entry && (sourcePlayableId(entry.id) ?? entry.playableId)
  const playable = originalPlay && defaultPlayId(originalPlay)
  return (
    <div className="app-page">
      <NavBar />
      <main className="page-frame reference-frame">
        <Link className="control" to="/library">
          ← Library
        </Link>
        {entry ? (
          <>
            <header className="reference-heading">
              <p className="maze-kicker">
                {entry.kind} / {entry.author}
              </p>
              <h1>{entry.title}</h1>
              <p>
                {playable
                  ? 'Original artwork for a maze with an interactive version in the collection.'
                  : 'Review its WIP path/PDA conversion beside this original artwork. Uncertain crossings and gates remain editable.'}
              </p>
              {playable && (
                <Link className="control control--primary" to={`/play/${playable}`}>
                  Play this maze →
                </Link>
              )}
              <Link className="control control--primary" to={`/workbench/${referenceDraftId(entry.id) ?? entry.id}`}>Review WIP / trace artwork →</Link>
              <a className="control" href={url} target="_blank" rel="noreferrer">
                Open original file ↗
              </a>
            </header>
            {entry.asset.endsWith('.pdf') ? (
              <iframe src={url} title={entry.title} />
            ) : (
              <a href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={entry.title} />
              </a>
            )}
            <p className="format-note">Source: {entry.source}</p>
          </>
        ) : (
          <h1>Reference not found</h1>
        )}
      </main>
    </div>
  )
}
