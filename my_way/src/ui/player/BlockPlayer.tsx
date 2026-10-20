import { useState } from 'react'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { BlockRecursiveDefinition } from '../../core/model/blockRecursive'
import { saveProject } from '../../app/projects/db'
import { BlockNavigation } from './BlockNavigation'
import { blockDepthLimit } from '../../core/blockMaze/grid'

export function BlockPlayer({
  doc: draft,
  onChange,
}: {
  doc: RecursiveMazeDocument
  onChange: (doc: RecursiveMazeDocument) => void
}) {
  const depth = Math.max(
    1,
    Math.min(
      blockDepthLimit((draft.definition as BlockRecursiveDefinition).unit),
      draft.renderConfig.maxDepth
    )
  )
  const [saved, setSaved] = useState('')
  const [mode, setMode] = useState<'wall' | 'start' | 'goal'>('wall')
  const def = draft.definition as BlockRecursiveDefinition
  const update = (next: BlockRecursiveDefinition) => {
    const definition = { ...next }
    delete definition.providedRoute
    onChange({
      ...draft,
      definition,
      metadata: { ...draft.metadata, updatedAt: new Date().toISOString() },
    })
    setSaved('')
  }
  return (
    <>
      <p className="format-status">
        Black cells contain another copy of the pattern; white cells stay open.
      </p>
      <div className="block-workspace">
        <div className="format-field">
          <BlockNavigation
            key={JSON.stringify([def.pattern, def.start, def.goal])}
            doc={draft}
            depth={depth}
          />
        </div>
        <aside className="rail-panel">
          <h2>Base pattern</h2>
          <label>
            Edit pattern{' '}
            <select
              aria-label="Edit pattern"
              className="control"
              value={mode}
              onChange={(event) => setMode(event.target.value as typeof mode)}
            >
              <option value="wall">Black / white cells</option>
              <option value="start">Start cell</option>
              <option value="goal">Goal cell</option>
            </select>
          </label>
          <p>Choose a mode, then tap a base cell. Start and goal must be white.</p>
          <div
            className="block-pattern"
            style={{ gridTemplateColumns: `repeat(${def.unit}, 1fr)` }}
          >
            {def.pattern.map((cell, index) => (
              <button
                key={index}
                aria-label={`Cell ${index % def.unit},${Math.floor(index / def.unit)}: ${cell ? 'black' : 'white'}`}
                aria-pressed={Boolean(cell)}
                style={{ background: cell ? '#151815' : '#fff' }}
                onClick={() =>
                  mode === 'wall'
                    ? update({
                        ...def,
                        pattern: def.pattern.map((value, i) => (i === index ? 1 - value : value)),
                      })
                    : !cell &&
                      update({ ...def, [mode]: [index % def.unit, Math.floor(index / def.unit)] })
                }
              />
            ))}
          </div>
          <label className="range-row">
            <span>Initial view detail {depth}</span>
            <input
              aria-label="Initial view detail"
              type="range"
              min="1"
              max={blockDepthLimit(def.unit)}
              value={depth}
              onChange={(event) => {
                onChange({
                  ...draft,
                  renderConfig: { ...draft.renderConfig, maxDepth: Number(event.target.value) },
                  metadata: { ...draft.metadata, updatedAt: new Date().toISOString() },
                })
                setSaved('')
              }}
            />
          </label>
          <p>
            Detail 1 shows the base pattern. Zoom deeper during play to reveal more copies;
            changing the view keeps your position.
          </p>
          <button
            className="control"
            disabled={saved === 'Saving pattern…'}
            onClick={() => {
              setSaved('Saving pattern…')
              void saveProject(draft)
                .then(() => setSaved('Pattern saved'))
                .catch(() => setSaved('Save failed'))
            }}
          >
            Save pattern
          </button>
          <p role="status">{saved}</p>
        </aside>
      </div>
      <p className="format-note">
        {def.start || def.goal
          ? 'Blue marks the base start cell; red marks the base goal cell.'
          : 'This source pattern has no assigned start or goal.'}{' '}
        Arrow keys or WASD move one visible cell. Zoom deeper to reveal the smaller passages.
        Finite search runs in a worker; saved replays preserve the exact position and maze snapshot.
      </p>
    </>
  )
}
