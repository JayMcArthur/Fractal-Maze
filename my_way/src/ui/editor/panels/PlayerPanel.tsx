import type { SquareRecursiveDefinition } from '../../../core/model/squareRecursive'
import type { useEditorStore } from '../../../app/store/editorSlice'

type Store = ReturnType<typeof useEditorStore.getState>

interface PlayerPanelProps {
  def: SquareRecursiveDefinition
  store: Pick<Store, 'setPlayerPos' | 'addTrophy' | 'removeTrophy'>
}

export function PlayerPanel({ def, store }: PlayerPanelProps) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* Player */}
      <div className="flex flex-col gap-2">
        <label className="text-muted font-semibold">Player Start</label>
        <div className="flex gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-muted text-xs">Row</span>
            <input
              type="number"
              min={0}
              max={def.grid.rows - 1}
              value={def.player.row}
              onChange={(e) => store.setPlayerPos(parseInt(e.target.value) || 0, def.player.col)}
              className="w-16 surface-muted text-ink rounded px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted text-xs">Col</span>
            <input
              type="number"
              min={0}
              max={def.grid.cols - 1}
              value={def.player.col}
              onChange={(e) => store.setPlayerPos(def.player.row, parseInt(e.target.value) || 0)}
              className="w-16 surface-muted text-ink rounded px-2 py-1"
            />
          </label>
        </div>
        <p className="text-muted text-xs">
          Click a cell in the canvas to place the player start.
        </p>
      </div>

      {/* Trophies */}
      <div className="flex flex-col gap-2 border-t border-subtle pt-3">
        <label className="text-muted font-semibold">Trophies</label>
        <p className="text-muted text-xs">
          If trophies are present, reaching one wins. Otherwise, exiting the top-level wins.
        </p>
        {def.trophies.length === 0 && (
          <p className="text-muted text-xs">No trophies — exit-to-win mode.</p>
        )}
        {def.trophies.map((t, i) => (
          <div key={i} className="flex items-center gap-2 surface-muted rounded px-2 py-1">
            <span>🏆</span>
            <span className="text-muted text-xs">
              ({t.row}, {t.col})
            </span>
            <button
              onClick={() => store.removeTrophy(t.row, t.col)}
              className="ml-auto text-danger text-xs"
            >
              ×
            </button>
          </div>
        ))}
        <TrophyAdder def={def} store={store} />
      </div>
    </div>
  )
}

function TrophyAdder({ def, store }: PlayerPanelProps) {
  return (
    <div className="flex gap-2">
      <input
        type="number"
        id="trophy-row"
        placeholder="row"
        min={0}
        max={def.grid.rows - 1}
        className="w-16 surface-muted text-ink rounded px-2 py-1 text-sm"
      />
      <input
        type="number"
        id="trophy-col"
        placeholder="col"
        min={0}
        max={def.grid.cols - 1}
        className="w-16 surface-muted text-ink rounded px-2 py-1 text-sm"
      />
      <button
        onClick={() => {
          const r = parseInt((document.getElementById('trophy-row') as HTMLInputElement).value)
          const c = parseInt((document.getElementById('trophy-col') as HTMLInputElement).value)
          if (!isNaN(r) && !isNaN(c)) store.addTrophy(r, c)
        }}
        className="px-3 py-1 action-warning  text-ink rounded text-sm"
      >
        Add Trophy
      </button>
    </div>
  )
}
