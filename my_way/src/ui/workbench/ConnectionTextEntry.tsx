import { useState } from 'react'
import type { PathMazeDefinition } from '../../core/model/pathMaze'
import { connectionsFromText } from '../../core/pathMaze/connectionInput'

export function ConnectionTextEntry({ model, onChange }: {
  model: PathMazeDefinition
  onChange: (model: PathMazeDefinition) => void
}) {
  const [text, setText] = useState(''), [error, setError] = useState('')
  return (
    <details className="connection-text-entry">
      <summary>Enter connections as text</summary>
      <p>Use path IDs or unique labels. One line enters or leaves one copy. → is one way; ↔ adds both directions.</p>
      <label>
        Connections
        <textarea aria-label="Connection lines" rows={5} value={text}
          placeholder={'1 -> A.2\nA.2 -> 3\n3 <-> 4'}
          onChange={event => { setText(event.target.value); setError('') }} />
      </label>
      <button className="control" disabled={!text.trim()} onClick={() => {
        try {
          const connections = connectionsFromText(model, text, 'Entered as directed path connections')
          onChange({ ...model, connections: [...model.connections, ...connections], review: 'wip' })
          setText(''); setError('')
        } catch (error) { setError(error instanceof Error ? error.message : 'Could not add connections.') }
      }}>Add connection lines</button>
      {error && <p role="alert">{error}</p>}
    </details>
  )
}
