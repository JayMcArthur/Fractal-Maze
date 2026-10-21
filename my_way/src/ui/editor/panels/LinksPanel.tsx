import { useState } from 'react'
import type { SquareRecursiveDefinition, DirectionBit } from '../../../core/model/squareRecursive'
import type { useEditorStore } from '../../../app/store/editorSlice'

type Store = ReturnType<typeof useEditorStore.getState>

interface LinksPanelProps {
  def: SquareRecursiveDefinition
  store: Pick<Store, 'setLink' | 'removeLink' | 'setExit' | 'removeExit'>
}

export function LinksPanel({ def, store }: LinksPanelProps) {
  const [exitName, setExitName] = useState('')
  const [exitDir, setExitDir] = useState<DirectionBit>(8)
  const [exitRow, setExitRow] = useState(0)
  const [exitCol, setExitCol] = useState(0)

  const [linkBlock, setLinkBlock] = useState('')
  const [linkExit, setLinkExit] = useState('')
  const [linkRow, setLinkRow] = useState(0)
  const [linkCol, setLinkCol] = useState(0)

  const addExit = () => {
    const name = exitName.trim()
    if (!name) return
    store.setExit({ name, direction: exitDir, row: exitRow, col: exitCol })
    setExitName('')
  }

  const addLink = () => {
    if (!linkBlock || !linkExit) return
    store.setLink({ row: linkRow, col: linkCol, blockPath: linkBlock.split('+'), exitName: linkExit })
  }

  const DIR_OPTS: Array<{ label: string; value: DirectionBit }> = [
    { label: 'N (8)', value: 8 },
    { label: 'E (4)', value: 4 },
    { label: 'S (2)', value: 2 },
    { label: 'W (1)', value: 1 },
  ]

  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* Exits */}
      <div className="flex flex-col gap-2">
        <label className="text-muted font-semibold">Exits</label>
        {def.exits.length === 0 && <p className="text-muted text-xs">No exits.</p>}
        {def.exits.map((e) => (
          <div key={e.name} className="flex items-center gap-2 surface-muted rounded px-2 py-1">
            <span className="text-success font-mono w-8">{e.name}</span>
            <span className="text-muted text-xs">dir:{e.direction} ({e.row},{e.col})</span>
            <button
              onClick={() => store.removeExit(e.name)}
              className="ml-auto text-danger text-xs"
            >
              ×
            </button>
          </div>
        ))}

        {/* Add exit */}
        <div className="grid grid-cols-2 gap-1 mt-1">
          <input
            type="text"
            placeholder="Exit name"
            value={exitName}
            onChange={(e) => setExitName(e.target.value)}
            className="col-span-2 surface-muted text-ink rounded px-2 py-1"
          />
          <select
            value={exitDir}
            onChange={(e) => setExitDir(parseInt(e.target.value) as DirectionBit)}
            className="surface-muted text-ink rounded px-2 py-1"
          >
            {DIR_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex gap-1">
            <input
              type="number" placeholder="row" value={exitRow}
              onChange={(e) => setExitRow(parseInt(e.target.value) || 0)}
              className="w-1/2 surface-muted text-ink rounded px-2 py-1"
            />
            <input
              type="number" placeholder="col" value={exitCol}
              onChange={(e) => setExitCol(parseInt(e.target.value) || 0)}
              className="w-1/2 surface-muted text-ink rounded px-2 py-1"
            />
          </div>
        </div>
        <button
          onClick={addExit}
          className="px-3 py-1 action-primary text-ink rounded"
        >
          Add Exit
        </button>
      </div>

      {/* Links */}
      <div className="flex flex-col gap-2 border-t border-subtle pt-3">
        <label className="text-muted font-semibold">Links</label>
        {def.links.length === 0 && <p className="text-muted text-xs">No links.</p>}
        {def.links.map((l, i) => (
          <div key={i} className="flex items-center gap-2 surface-muted rounded px-2 py-1">
            <span className="text-warning font-mono text-xs">
              ({l.row},{l.col}) → {l.blockPath.join('+')}:{l.exitName}
            </span>
            <button
              onClick={() => store.removeLink(l.row, l.col)}
              className="ml-auto text-danger text-xs"
            >
              ×
            </button>
          </div>
        ))}

        {/* Add link */}
        <div className="grid grid-cols-2 gap-1 mt-1">
          <input
            type="text" placeholder="Block path (A or A+B)"
            value={linkBlock}
            onChange={(e) => setLinkBlock(e.target.value.toUpperCase())}
            className="surface-muted text-ink rounded px-2 py-1"
          />
          <select
            value={linkExit}
            onChange={(e) => setLinkExit(e.target.value)}
            className="surface-muted text-ink rounded px-2 py-1"
          >
            <option value="">Exit name…</option>
            {def.exits.map((e) => <option key={e.name} value={e.name}>{e.name}</option>)}
          </select>
          <input
            type="number" placeholder="row" value={linkRow}
            onChange={(e) => setLinkRow(parseInt(e.target.value) || 0)}
            className="surface-muted text-ink rounded px-2 py-1"
          />
          <input
            type="number" placeholder="col" value={linkCol}
            onChange={(e) => setLinkCol(parseInt(e.target.value) || 0)}
            className="surface-muted text-ink rounded px-2 py-1"
          />
        </div>
        <button
          onClick={addLink}
          disabled={!linkBlock || !linkExit}
          className="px-3 py-1 action-warning  disabled:opacity-40 text-ink rounded"
        >
          Add Link
        </button>
      </div>
    </div>
  )
}
