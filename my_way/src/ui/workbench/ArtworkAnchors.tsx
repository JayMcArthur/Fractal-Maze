import type { PathConnection } from '../../core/model/pathMaze'
import type { ArtworkAnchor, useArtworkAnchors } from './useArtworkAnchors'

export function ArtworkAnchorControls({
  selection,
  connections,
}: {
  selection: ReturnType<typeof useArtworkAnchors>
  connections: PathConnection[]
}) {
  return (
    <>
      <label>
        Placement
        <select
          aria-label="Artwork anchor"
          value={selection.anchor}
          onChange={(event) => selection.setAnchor(event.target.value as ArtworkAnchor)}
        >
          <option value="start">Maze entry</option>
          <option value="goal">Maze finish</option>
          <option value="from">Gate departure</option>
          <option value="to">Gate arrival in destination level</option>
          <option value="arrivalFrom">Parent exit arrow start</option>
        </select>
      </label>
      {selection.anchor === 'goal' && selection.finishes.length > 0 && (
        <label>
          Finish anchor
          <select
            aria-label="Source finish anchor"
            value={selection.finishIndex}
            onChange={(event) => selection.setFinishIndex(Number(event.target.value))}
          >
            <option value={-1}>Primary finish</option>
            {selection.finishes.map((finish, i) => (
              <option key={i} value={i}>
                {finish.state.address.join('') || 'surface'} · path {finish.state.path} · exit{' '}
                {i + 1}
              </option>
            ))}
          </select>
        </label>
      )}
      {selection.anchor !== 'start' && selection.anchor !== 'goal' && (
        <label>
          Connection
          <select
            aria-label="Anchor connection"
            value={selection.edge}
            onChange={(event) => selection.selectEdge(event.target.value)}
          >
            {connections.map((edge) => (
              <option key={edge.id} value={edge.id}>
                {edge.operation} {edge.copy} · {edge.from} → {edge.to}
              </option>
            ))}
          </select>
        </label>
      )}
      {(selection.pending.from || selection.pending.to) && (
        <span role="status">Set the other side of this gate to save both anchors.</span>
      )}
    </>
  )
}
