import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import type { CatalogEntry } from '../../app/library/catalog'
import { catalogIndex } from '../../app/library/catalogIndex'
import { assetUrl } from '../../core/io/assetUrl'
import type { SolveRecord } from '../../app/projects/db'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { mazeFamily } from '../mazeFamily'
import { CatalogCopyButton } from './CatalogCopyButton'
import { MazeViewSelect } from './MazeViewSelect'

const MazeCanvas = lazy(() =>
  import('../components/MazeCanvas').then((module) => ({ default: module.MazeCanvas }))
)

export function MazeCard({
  entry,
  solve,
  savedDoc,
  onCoverClick,
}: {
  entry: CatalogEntry
  solve?: SolveRecord
  savedDoc?: RecursiveMazeDocument
  onCoverClick: () => void
}) {
  const preview = catalogIndex.find((maze) => maze.id === entry.id)?.preview
  const details = savedDoc ? savedCardDetails(savedDoc) : preview!
  const metadata = savedDoc?.metadata ?? entry
  const title = savedDoc ? metadata.title : entry.title
  const pathModel =
    details.definitionType === 'pathPushdown' || details.definitionType === 'infiniteRule'
  const to = `/${details.playable ? 'play' : 'workbench'}/${entry.id}`

  return (
    <article className="library-card">
      <Link to={to} className="library-card__preview">
        {savedDoc?.metadata.cover ? (
          <img src={savedDoc?.metadata.cover} alt={title} loading="lazy" />
        ) : savedDoc ? (
          <CardPreview doc={savedDoc} />
        ) : (
          <img src={assetUrl(preview!.asset)} alt={title} loading="lazy" />
        )}
        <span className="library-card__launch">
          {details.playable ? 'Enter maze' : 'Review conversion'} <b aria-hidden="true">→</b>
        </span>
        {solve && <span className="library-card__solved">Solved · {solve.bestMoves} moves</span>}
      </Link>
      <div className="library-card__body">
        <div>
          <p className="maze-kicker">{metadata.tags.join(' / ')}</p>
          <h2>{title}</h2>
          <p>{metadata.author || 'Unknown constructor'}</p>
        </div>
        <span className="library-card__type">{mazeFamily[entry.representationType]}</span>
        {details.review && (
          <span className="review-badge">
            {details.review === 'wip' ? 'WIP · review conversion' : 'Reviewed'}
          </span>
        )}
      </div>
      <MazeViewSelect id={entry.id} />
      <MazeCardActions
        entry={entry}
        to={to}
        details={details}
        saved={!!savedDoc}
        pathModel={pathModel}
        onCoverClick={onCoverClick}
      />
    </article>
  )
}

function savedCardDetails(doc: RecursiveMazeDocument) {
  const model = doc.definition
  const path = model.type === 'pathPushdown' || model.type === 'infiniteRule'
  return {
    definitionType: model.type,
    playable: !path || !!(model.start && model.goal),
    review: path || model.type === 'recursiveTour' ? model.review : null,
  }
}

function CardPreview({ doc }: { doc: RecursiveMazeDocument }) {
  const square = doc.definition.type === 'squareRecursive' ? doc.definition : null
  return (
    <Suspense fallback={null}>
      <MazeCanvas
        doc={doc}
        playerPos={
          square ? { blockStack: ['0'], row: square.player.row, col: square.player.col } : undefined
        }
        maxDepth={1}
        showBlockLabels={false}
        showBreadcrumbs={false}
        maxDisplayWidth={360}
      />
    </Suspense>
  )
}

function MazeCardActions({
  entry,
  to,
  details,
  saved,
  pathModel,
  onCoverClick,
}: {
  entry: CatalogEntry
  to: string
  details: ReturnType<typeof savedCardDetails>
  saved: boolean
  pathModel: boolean
  onCoverClick: () => void
}) {
  return (
    <div className="library-card__actions">
      <button className="control" onClick={onCoverClick}>Cover image</button>
      <Link className="control" to={to}>
        {details.playable ? 'Play' : 'Review conversion'}
      </Link>
      {details.playable && (
        <Link
          className="control"
          to={
            details.definitionType === 'recursiveTour'
              ? `/play/${entry.id}`
              : pathModel
                ? `/workbench/${entry.id}`
                : `/editor/${entry.id}`
          }
        >
          {details.definitionType === 'squareRecursive'
            ? 'Edit'
            : details.definitionType === 'blockRecursive'
              ? 'Edit pattern'
              : 'Inspect'}
        </Link>
      )}
      {!pathModel && (
        <Link className="control" to={`/workbench/${entry.id}`}>
          Convert artwork
        </Link>
      )}
      {saved && catalogIndex.some((maze) => maze.id === entry.id) && (
        <CatalogCopyButton id={entry.id} />
      )}
    </div>
  )
}
