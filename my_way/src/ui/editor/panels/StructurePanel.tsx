import type { SquareRecursiveDefinition } from '../../../core/model/squareRecursive'
import type { useEditorStore } from '../../../app/store/editorSlice'

type Store = ReturnType<typeof useEditorStore.getState>

interface StructurePanelProps {
  def: SquareRecursiveDefinition
  store: Pick<Store, 'resizeGrid'>
}

export function StructurePanel({ def, store }: StructurePanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-gray-400 text-sm">
        Click cell edges to toggle path connections. Walls are mirrored automatically.
      </p>
      <div className="flex flex-col gap-2">
        <label className="text-gray-300 text-sm font-semibold">Grid Size</label>
        <div className="flex gap-2 items-center">
          <label className="text-gray-400 text-xs">Rows</label>
          <input
            type="number"
            min={2}
            max={30}
            value={def.grid.rows}
            onChange={(e) => {
              const v = parseInt(e.target.value)
              if (v >= 2 && v <= 30) store.resizeGrid(v, def.grid.cols)
            }}
            className="w-16 bg-gray-700 text-white rounded px-2 py-1 text-sm"
          />
          <label className="text-gray-400 text-xs">Cols</label>
          <input
            type="number"
            min={2}
            max={30}
            value={def.grid.cols}
            onChange={(e) => {
              const v = parseInt(e.target.value)
              if (v >= 2 && v <= 30) store.resizeGrid(def.grid.rows, v)
            }}
            className="w-16 bg-gray-700 text-white rounded px-2 py-1 text-sm"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1 text-xs text-gray-500">
        <p>Tile size: {def.tileSize}px</p>
        <p>Canvas: {def.grid.cols * def.tileSize} × {def.grid.rows * def.tileSize}px</p>
      </div>
    </div>
  )
}
