import { useState } from 'react'
import type { SquareRecursiveDefinition, TileBlock } from '../../../core/model/squareRecursive'
import type { useEditorStore } from '../../../app/store/editorSlice'

type Store = ReturnType<typeof useEditorStore.getState>

interface BlocksPanelProps {
  def: SquareRecursiveDefinition
  selectedBlock: string | null
  store: Pick<Store, 'addBlock' | 'updateBlock' | 'removeBlock' | 'selectBlock'>
}

const BLOCK_COLORS = [
  '#fff7ac', '#a3d0e7', '#daa5c1', '#cbcbcb',
  '#a8e6cf', '#ffd3b6', '#ffaaa5', '#a0c4ff',
]

export function BlocksPanel({ def, selectedBlock, store }: BlocksPanelProps) {
  const [newName, setNewName] = useState('')

  const block = def.blocks.find((b) => b.name === selectedBlock)

  const addBlock = () => {
    const name = newName.trim().toUpperCase()
    if (!name || def.blocks.some((b) => b.name === name)) return
    const colorIndex = def.blocks.length % BLOCK_COLORS.length
    const newBlock: TileBlock = {
      name,
      row: 0,
      col: 0,
      width: 3,
      height: 3,
      color: BLOCK_COLORS[colorIndex],
    }
    store.addBlock(newBlock)
    store.selectBlock(name)
    setNewName('')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Block list */}
      <div className="flex flex-col gap-1">
        <label className="text-muted text-sm font-semibold">Blocks</label>
        {def.blocks.length === 0 && (
          <p className="text-muted text-xs">No blocks yet.</p>
        )}
        {def.blocks.map((b) => (
          <button
            key={b.name}
            onClick={() => store.selectBlock(b.name === selectedBlock ? null : b.name)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm text-left ${
              b.name === selectedBlock
                ? 'action-primary text-ink'
                : 'surface-muted text-muted '
            }`}
          >
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: b.color }}
            />
            <span className="font-mono font-bold">{b.name}</span>
            <span className="text-muted text-xs ml-auto">
              {b.width}×{b.height} @ ({b.row},{b.col})
            </span>
          </button>
        ))}
      </div>

      {/* Add block */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value.slice(0, 3).toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && addBlock()}
          placeholder="Name (e.g. A)"
          className="flex-1 surface-muted text-ink rounded px-2 py-1 text-sm font-mono"
          maxLength={3}
        />
        <button
          onClick={addBlock}
          disabled={!newName.trim() || def.blocks.some((b) => b.name === newName.trim().toUpperCase())}
          className="px-3 py-1 action-primary disabled:opacity-40 text-ink rounded text-sm"
        >
          Add
        </button>
      </div>

      {/* Selected block editor */}
      {block && (
        <div className="flex flex-col gap-3 border-t border-subtle pt-3">
          <div className="flex justify-between items-center">
            <span className="text-ink font-bold">Block {block.name}</span>
            <button
              onClick={() => { store.removeBlock(block.name); store.selectBlock(null) }}
              className="text-danger text-xs"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(['row', 'col', 'width', 'height'] as const).map((field) => (
              <label key={field} className="flex flex-col gap-1">
                <span className="text-muted text-xs capitalize">{field}</span>
                <input
                  type="number"
                  min={field === 'width' || field === 'height' ? 1 : 0}
                  value={block[field]}
                  onChange={(e) =>
                    store.updateBlock(block.name, { [field]: parseInt(e.target.value) || 0 })
                  }
                  className="surface-muted text-ink rounded px-2 py-1"
                />
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-muted text-xs">Color</span>
            <div className="flex gap-2 flex-wrap">
              {BLOCK_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => store.updateBlock(block.name, { color: c })}
                  className={`w-6 h-6 rounded ${block.color === c ? 'ring-2 ring-white' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={block.color}
                onChange={(e) => store.updateBlock(block.name, { color: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer"
                title="Custom color"
              />
            </div>
          </label>
        </div>
      )}
    </div>
  )
}
