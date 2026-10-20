import { type ReactNode, useMemo } from 'react'
import { rulePlayDocument } from '../../app/library/rulePlayDocument'
import { Link } from 'react-router-dom'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { PathMazeDefinition } from '../../core/model/pathMaze'
import { PathMazeDrawing } from './PathMazeDrawing'
import { PathMoveChoices } from './PathRouteControls'
import { SaveRouteButton } from '../replay/SaveRouteButton'
import { CopyAddress } from '../components/CopyAddress'
import { usePathSession } from './usePathSession'
import { copyAddress } from '../../core/pathMaze/copyAddress'
import { PathProofChoices } from './PathProofChoices'

export function PathPlayer({
  doc,
  model,
  children,
}: {
  doc: RecursiveMazeDocument
  model: PathMazeDefinition
  children?: ReactNode
}) {
  const playable = useMemo(() => rulePlayDocument(doc) ?? doc, [doc])
  const { session, frame, route, animating, current, shown, finished, playArtwork, availableEdges, proofMoves, useProof,
    onWalk, move, undo, reset, markSaved, setAnimating, setVisibleState } = usePathSession(playable, model)
  const pathLabel = model.paths.find((path) => path.id === shown?.path)?.label
  const address = shown ? copyAddress(model, shown) : []
  return (
    <div className="path-play-session">
      <section className="digital-hud" aria-label="Maze position and session status">
        <div className="digital-hud__position">
          <span className={`status-lamp ${finished ? 'is-won' : ''}`} aria-hidden="true" />
          <div>
            <small>Current position</small>
            <CopyAddress address={address} />
          </div>
        </div>
        <dl className="digital-hud__metrics">
          <div>
            <dt>Depth</dt>
            <dd>{address.length}</dd>
          </div>
          <div>
            <dt>Path</dt>
            <dd>{pathLabel ?? '—'}</dd>
          </div>
          <div>
            <dt>Moves</dt>
            <dd>{session.moves.length}</dd>
          </div>
        </dl>
      </section>
      <div className="path-player player-layout">
        <div className="path-player__drawing player-field">
          <PathMazeDrawing
            model={model}
            artwork={playArtwork}
            busy={animating}
            current={current}
            frame={frame}
            onMove={finished ? undefined : move}
            onMotionChange={setAnimating}
            onVisibleStateChange={setVisibleState}
            onWalk={onWalk}
            controls={
              <>
                <PathMoveChoices
                model={model}
                current={current}
                busy={animating || finished}
                availableEdges={availableEdges}
                onMove={move}
                />
                <PathProofChoices model={model} current={current} moves={proofMoves}
                  busy={animating || finished} onMove={useProof} />
              </>
            }
          />
        </div>
        <aside className="player-rail source-player-rail">
          <section className="rail-panel path-controls">
            <div className="rail-panel__heading">
              <div>
                <p className="maze-kicker">Live run</p>
                <h2>Session</h2>
              </div>
              <span className="signal-badge">{finished ? 'Finished' : 'Active'}</span>
            </div>
            <p role="status">
              {finished
                ? 'Finish reached.'
                : 'Walk to a junction or gate, then choose your next direction.'}
            </p>
            <div className="control-grid">
              <button
                className="control"
                disabled={!session.moves.length || animating}
                onClick={undo}
              >
                Undo move
              </button>
              <button className="control" onClick={reset}>
                Restart path
              </button>
            </div>
            <SaveRouteButton
              maze={doc}
              playArtwork={playArtwork}
              disabled={animating}
              route={{ type: model.type, ...route, ...(playArtwork?.traces.length ? { physical: session } : {}) }}
              source="human"
              complete={finished}
              onSaved={markSaved}
            />
            {children ?? (
              <>
                <Link className="rail-link" to={`/solver?id=${doc.metadata.id}`}>
                  Solve & analyze<span>→</span>
                </Link>
                {model.allowedRule !== 'finite' && (
                  <Link className="control" to={`/workbench/${doc.metadata.id}?tab=proof`}>
                    Build an infinite proof
                  </Link>
                )}
              </>
            )}
          </section>
          {model.notes.length > 0 && (
            <details className="rail-panel workbench-notes">
              <summary>{model.review === 'wip' ? 'WIP conversion notes' : 'Maze rules'}</summary>
              {model.notes.map((note, i) => (
                <p key={i}>{note}</p>
              ))}
            </details>
          )}
        </aside>
      </div>
    </div>
  )
}
