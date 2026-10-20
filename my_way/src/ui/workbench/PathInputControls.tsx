import { useState } from 'react'
import type { PathMazeDefinition } from '../../core/model/pathMaze'
import { runPathInput, stateLabel } from '../../core/pathMaze/traversal'
import type { PathRoute } from '../../core/pathMaze/traversal'

export function PathInputControls({
  model,
  onResult,
}: {
  model: PathMazeDefinition
  onResult: (route: PathRoute | null, message: string) => void
}) {
  const [input, setInput] = useState('')
  return (
      <details>
        <summary>Run a guide input string</summary>
        <p>
          Source labels above 9 retain the Python tokens :, ;, &lt;, =, and so on. The stack must be
          empty at the surface finish.
        </p>
        <label>
          Input string
          <input
            aria-label="PDA input string"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>
        <div className="button-row">
          {model.providedInput && (
            <button className="control" onClick={() => setInput(model.providedInput!)}>
              Load guide example
            </button>
          )}
          <button
            className="control"
            disabled={!input || !model.start || !model.goal}
            onClick={() => {
              try {
                const found = runPathInput(model, input)
                onResult(
                  found.route,
                  found.accepted
                    ? 'Guide input accepted; step through its route.'
                    : `Input rejected after ${found.consumed} / ${input.length} tokens. Last legal state: ${found.route ? stateLabel(found.route.states.at(-1)!) : 'none'}. Inspect the partial replay below.`
                )
              } catch (error) {
                onResult(null, error instanceof Error ? error.message : 'Input failed')
              }
            }}
          >
            Run input
          </button>
        </div>
      </details>
  )
}
