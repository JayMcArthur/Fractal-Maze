import { useState } from 'react'
import type { PathMazeDefinition } from '../../core/model/pathMaze'
import { PathEndpointsEditor } from './PathEndpointsEditor'
import { ConnectionTextEntry } from './ConnectionTextEntry'

export function PathModelEditor({
  model,
  onChange,
}: {
  model: PathMazeDefinition
  onChange: (model: PathMazeDefinition) => void
}) {
  const [newLabel, setNewLabel] = useState('')
  const [newCopy, setNewCopy] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [copy, setCopy] = useState('')
  const [bidirectional, setBidirectional] = useState(true)
  const [operation, setOperation] = useState<'enter' | 'exit' | 'walk'>('enter')
  const [note, setNote] = useState('')
  const valid = from && to && (operation === 'walk' || copy)
  const addConnection = () => {
    if (!valid) return
    const id = crypto.randomUUID()
    const edges =
      operation === 'walk'
        ? [
            {
              id: `${id}-0`,
              from,
              to,
              operation,
              copy: '',
              input: to.length === 1 ? to : '',
              evidence: note || 'Manual image review',
            },
            {
              id: `${id}-1`,
              from: to,
              to: from,
              operation,
              copy: '',
              input: from.length === 1 ? from : '',
              evidence: note || 'Manual image review',
            },
          ]
        : [
            { id: `${id}-0`, from, to, operation: 'enter' as const, copy,
              input: from === to ? '(' : to.length === 1 ? to : '', evidence: note || 'Manual image review' },
            { id: `${id}-1`, from: to, to: from, operation: 'exit' as const, copy,
              input: from === to ? ')' : from.length === 1 ? from : '', evidence: note || 'Manual image review' },
          ]
    const selected = bidirectional ? edges : [edges[operation === 'exit' ? 1 : 0]]
    onChange({ ...model, connections: [...model.connections, ...selected], review: 'wip' })
  }
  return (
    <div className="model-editor">
      <section className="workbench-card">
        <h2>1. Label connected paths</h2>
        <p>
          Label the whole connected corridor, including branches. Exits belong to paths; each exit
          is not a separate PDA state.
        </p>
        <div className="workbench-toolbar">
          <label>
            New path label
            <input
              aria-label="New path label"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
            />
          </label>
          <button
            className="control"
            disabled={!newLabel.trim()}
            onClick={() => {
              const id = String(
                Math.max(0, ...model.paths.map((path) => Number(path.id)).filter(Number.isFinite)) +
                  1
              )
              onChange({
                ...model,
                paths: [
                  ...model.paths,
                  { id, label: newLabel.trim(), color: '#3374a4', helper: false },
                ],
                review: 'wip',
              })
              setNewLabel('')
            }}
          >
            Add path
          </button>
        </div>
        <details>
          <summary>{model.paths.length} paths · edit labels and helper states</summary>
          <div className="path-list">
            {model.paths.map((path) => (
              <div className="path-row" key={path.id}>
                <input
                  aria-label={`Path ${path.id} color`}
                  type="text"
                  className="path-color"
                  style={{ borderColor: path.color }}
                  value={path.color}
                  onChange={(event) =>
                    onChange({
                      ...model,
                      paths: model.paths.map((item) =>
                        item.id === path.id ? { ...item, color: event.target.value } : item
                      ),
                      review: 'wip',
                    })
                  }
                />
                <input
                  aria-label={`Path ${path.id} label`}
                  value={path.label}
                  onChange={(event) =>
                    onChange({
                      ...model,
                      paths: model.paths.map((item) =>
                        item.id === path.id ? { ...item, label: event.target.value } : item
                      ),
                      review: 'wip',
                    })
                  }
                />
                <label>
                  <input
                    type="checkbox"
                    checked={path.helper}
                    onChange={(event) =>
                      onChange({
                        ...model,
                        paths: model.paths.map((item) =>
                          item.id === path.id ? { ...item, helper: event.target.checked } : item
                        ),
                        review: 'wip',
                      })
                    }
                  />
                  Helper
                </label>
                <button
                  className="control"
                  onClick={() =>
                    onChange({
                      ...model,
                      paths: model.paths.filter((item) => item.id !== path.id),
                      connections: model.connections.filter(
                        (edge) => edge.from !== path.id && edge.to !== path.id
                      ),
                      start: model.start?.path === path.id ? null : model.start,
                      goal: model.goal?.path === path.id ? null : model.goal,
                      alternateGoals: model.alternateGoals?.filter((goal) => goal.path !== path.id),
                      review: 'wip',
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </details>
      </section>
      <section className="workbench-card">
        <h2>2. Match copy gates</h2>
        <p>
          A parent path enters a labeled path in a child copy. Leaving must match the last copy on
          the stack.
        </p>
        <div className="workbench-toolbar">
          <label>
            Copy label
            <input
              aria-label="New copy label"
              value={newCopy}
              onChange={(event) => setNewCopy(event.target.value)}
            />
          </label>
          <button
            className="control"
            disabled={!newCopy.trim() || model.copies.includes(newCopy.trim())}
            onClick={() => {
              onChange({ ...model, copies: [...model.copies, newCopy.trim()], review: 'wip' })
              setNewCopy('')
            }}
          >
            Add copy
          </button>
        </div>
        <p className="copy-chips">
          {model.copies.map((copy) => (
            <button
              key={copy}
              className="control"
              title={`Remove copy ${copy} and its transitions`}
              onClick={() =>
                onChange({
                  ...model,
                  copies: model.copies.filter((item) => item !== copy),
                  connections: model.connections.filter((edge) => edge.copy !== copy),
                  start: model.start?.address.includes(copy) ? null : model.start,
                  goal: model.goal?.address.includes(copy) ? null : model.goal,
                  alternateGoals: model.alternateGoals?.filter(
                    (goal) => !goal.address.includes(copy)
                  ),
                  review: 'wip',
                })
              }
            >
              {copy} ×
            </button>
          ))}
        </p>
        <div className="connection-form">
          <label>
            Movement
            <select
              aria-label="Connection movement"
              value={operation}
              onChange={(event) => setOperation(event.target.value as typeof operation)}
            >
              <option value="enter">Enter child</option>
              <option value="exit">Exit child</option>
              <option value="walk">Same-level directed path</option>
            </select>
          </label>
          <label>
            Parent path
            <select
              aria-label="Connection parent path"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            >
              <option value="">Choose</option>
              {model.paths.map((path) => (
                <option key={path.id} value={path.id}>
                  {path.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Child copy
            <select
              aria-label="Connection copy"
              value={copy}
              onChange={(event) => setCopy(event.target.value)}
            >
              <option value="">Choose</option>
              {model.copies.map((copy) => (
                <option key={copy}>{copy}</option>
              ))}
            </select>
          </label>
          <label>
            Child path
            <select
              aria-label="Connection child path"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            >
              <option value="">Choose</option>
              {model.paths.map((path) => (
                <option key={path.id} value={path.id}>
                  {path.label}
                </option>
              ))}
            </select>
          </label>
          <label className="connection-evidence">
            Evidence
            <input
              aria-label="Connection evidence"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Gate position / source note"
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={bidirectional}
              onChange={(event) => setBidirectional(event.target.checked)}
            />{' '}
            Both directions
          </label>
          <button className="control control--primary" disabled={!valid} onClick={addConnection}>
            Add connection
          </button>
        </div>
        <ConnectionTextEntry model={model} onChange={onChange} />
        <details>
          <summary>{model.connections.length} PDA transitions · inspect and remove</summary>
          <div className="transition-list">
            {model.connections.map((edge) => (
              <div className="transition-row" key={edge.id}>
                <code>
                  {model.paths.find((path) => path.id === edge.from)?.label} →{' '}
                  {edge.operation === 'enter'
                    ? edge.copy + ' / '
                    : edge.operation === 'exit'
                      ? 'out ' + edge.copy + ' / '
                      : ''}
                  {model.paths.find((path) => path.id === edge.to)?.label}
                </code>
                <small>
                  input {edge.input || 'ε'} · {edge.evidence}
                </small>
                <button
                  className="control"
                  aria-label={`Remove transition ${edge.id}`}
                  onClick={() =>
                    onChange({
                      ...model,
                      connections: model.connections.filter((item) => item.id !== edge.id),
                      review: 'wip',
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </details>
      </section>
      <PathEndpointsEditor model={model} onChange={onChange} />
    </div>
  )
}
