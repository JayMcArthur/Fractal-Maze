import { useState } from 'react'
import type { SquareRecursiveDefinition, DirectionBit } from '../../../core/model/squareRecursive'
import type { useEditorStore } from '../../../app/store/editorSlice'
type Store = ReturnType<typeof useEditorStore.getState>
export function TeleportersPanel({
  def,
  store,
}: {
  def: SquareRecursiveDefinition
  store: Pick<Store, 'setTeleporter' | 'removeTeleporter'>
}) {
  const [row, setRow] = useState(0),
    [col, setCol] = useState(0),
    [direction, setDirection] = useState<DirectionBit>(4),
    [reach, setReach] = useState(2)
  const dr = direction === 8 ? -1 : direction === 2 ? 1 : 0,
    dc = direction === 1 ? -1 : direction === 4 ? 1 : 0
  const valid =
    row >= 0 &&
    row < def.grid.rows &&
    col >= 0 &&
    col < def.grid.cols &&
    reach >= 1 &&
    row + dr * reach >= 0 &&
    row + dr * reach < def.grid.rows &&
    col + dc * reach >= 0 &&
    col + dc * reach < def.grid.cols
  return (
    <section className="flex flex-col gap-2 text-sm border-t border-gray-700 pt-3">
      <h2 className="font-semibold">Teleporters</h2>
      <p className="text-xs text-gray-400">
        Jump along a direction from the chosen cell. Reach is the number of cells to travel.
      </p>
      {def.teleporters.map((tel) => (
        <div key={`${tel.row}-${tel.col}-${tel.direction}`} className="flex gap-2 items-center">
          <span>
            ({tel.row}, {tel.col}) · {tel.direction} · reach {tel.reach}
          </span>
          <button
            className="control"
            aria-label={`Remove teleporter at ${tel.row}, ${tel.col}`}
            onClick={() => store.removeTeleporter(tel.row, tel.col, tel.direction)}
          >
            ×
          </button>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2">
        {[
          { name: 'Row', value: row, set: setRow, max: def.grid.rows - 1 },
          { name: 'Column', value: col, set: setCol, max: def.grid.cols - 1 },
          {
            name: 'Reach',
            value: reach,
            set: setReach,
            max: Math.max(def.grid.rows, def.grid.cols) - 1,
          },
        ].map(({ name, value, set, max }) => (
          <label className="flex flex-col gap-1" key={String(name)}>
            {String(name)}
            <input
              className="bg-gray-700 rounded px-2 py-1 w-full"
              aria-label={`Teleporter ${name}`}
              type="number"
              min={name === 'Reach' ? 1 : 0}
              max={Number(max)}
              value={Number(value)}
              onChange={(event) => set(Number(event.target.value))}
            />
          </label>
        ))}
        <label className="flex flex-col gap-1">
          Direction
          <select
            className="bg-gray-700 rounded px-2 py-1"
            aria-label="Teleporter direction"
            value={direction}
            onChange={(event) => setDirection(Number(event.target.value) as DirectionBit)}
          >
            <option value={8}>North</option>
            <option value={4}>East</option>
            <option value={2}>South</option>
            <option value={1}>West</option>
          </select>
        </label>
      </div>
      <button
        className="control"
        disabled={!valid}
        onClick={() => store.setTeleporter({ row, col, direction, reach })}
      >
        Add teleporter
      </button>
      {!valid && (
        <p className="text-xs text-gray-400">Choose a start and destination inside the grid.</p>
      )}
    </section>
  )
}
