/**
 * SVG overlay rendered on top of the maze canvas in the editor.
 * Draws clickable cell edges for structure mode, block overlays, player/trophy markers.
 */
import type { SquareRecursiveDefinition } from '../../core/model/squareRecursive'
import type { EditorMode } from '../../app/store/editorSlice'

const DIR_N = 8
const DIR_E = 4
const DIR_S = 2
const DIR_W = 1

interface EditorSVGOverlayProps {
  def: SquareRecursiveDefinition
  mode: EditorMode
  selectedBlock: string | null
  onToggleWall: (row: number, col: number, dirBit: number) => void
  onCellClick: (row: number, col: number) => void
}

/** Render a thin clickable hit-area along a cell edge */
function EdgeHandle({
  x,
  y,
  w,
  h,
  active,
  onClick,
}: {
  x: number
  y: number
  w: number
  h: number
  active: boolean
  onClick: () => void
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill={active ? 'rgba(100,200,255,0.4)' : 'rgba(255,255,255,0.04)'}
      stroke="none"
      className="cursor-pointer hover:fill-[rgba(100,200,255,0.6)]"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    />
  )
}

export function EditorSVGOverlay({
  def,
  mode,
  selectedBlock,
  onToggleWall,
  onCellClick,
}: EditorSVGOverlayProps) {
  const ts = def.tileSize
  const W = def.grid.cols * ts
  const H = def.grid.rows * ts
  const edgeThick = Math.max(4, ts * 0.15)
  const center = ts * 0.25

  return (
    <svg
      width={W + ts * 0.5}
      height={H + ts * 0.5}
      viewBox={`${-ts * 0.25} ${-ts * 0.25} ${W + ts * 0.5} ${H + ts * 0.5}`}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ pointerEvents: 'none', width: '100%', height: '100%' }}
    >
      {/* Structure mode: cell edge handles */}
      {mode === 'structure' &&
        Array.from({ length: def.grid.rows }, (_, r) =>
          Array.from({ length: def.grid.cols }, (_, c) => {
            const mask = def.grid.cells[r * def.grid.cols + c]
            const x = c * ts
            const y = r * ts
            return (
              <g key={`${r}-${c}`} style={{ pointerEvents: 'all' }}>
                {/* N edge */}
                <EdgeHandle
                  x={x + center}
                  y={y}
                  w={ts * 0.5}
                  h={edgeThick}
                  active={!!(mask & DIR_N)}
                  onClick={() => onToggleWall(r, c, DIR_N)}
                />
                {/* S edge */}
                <EdgeHandle
                  x={x + center}
                  y={y + ts - edgeThick}
                  w={ts * 0.5}
                  h={edgeThick}
                  active={!!(mask & DIR_S)}
                  onClick={() => onToggleWall(r, c, DIR_S)}
                />
                {/* E edge */}
                <EdgeHandle
                  x={x + ts - edgeThick}
                  y={y + center}
                  w={edgeThick}
                  h={ts * 0.5}
                  active={!!(mask & DIR_E)}
                  onClick={() => onToggleWall(r, c, DIR_E)}
                />
                {/* W edge */}
                <EdgeHandle
                  x={x}
                  y={y + center}
                  w={edgeThick}
                  h={ts * 0.5}
                  active={!!(mask & DIR_W)}
                  onClick={() => onToggleWall(r, c, DIR_W)}
                />
              </g>
            )
          })
        )}

      {mode === 'player' &&
        Array.from({ length: def.grid.rows }, (_, row) =>
          Array.from({ length: def.grid.cols }, (_, col) => (
            <rect
              key={`${row}-${col}`}
              x={col * ts}
              y={row * ts}
              width={ts}
              height={ts}
              fill="transparent"
              role="button"
              tabIndex={0}
              aria-label={`Place player at row ${row}, column ${col}`}
              style={{ pointerEvents: 'all', cursor: 'crosshair' }}
              onClick={() => onCellClick(row, col)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onCellClick(row, col)
                }
              }}
            />
          ))
        )}

      {/* Blocks mode / all modes: block overlays */}
      {def.blocks.map((block) => {
        const bx = block.col * ts
        const by = block.row * ts
        const bw = block.width * ts
        const bh = block.height * ts
        const isSelected = block.name === selectedBlock
        return (
          <g key={block.name} style={{ pointerEvents: mode === 'blocks' ? 'all' : 'none' }}>
            <rect
              x={bx}
              y={by}
              width={bw}
              height={bh}
              fill={block.color + '33'}
              stroke={isSelected ? '#60a5fa' : block.color}
              strokeWidth={isSelected ? 3 : 2}
              strokeDasharray={isSelected ? undefined : '4 2'}
              className={mode === 'blocks' ? 'cursor-pointer' : ''}
              onClick={() => onCellClick(block.row, block.col)}
            />
            <text
              x={bx + bw / 2}
              y={by + bh / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={block.color}
              fontSize={Math.max(10, ts * 0.4)}
              fontWeight="bold"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {block.name}
            </text>
          </g>
        )
      })}

      {/* Player marker */}
      {(mode === 'player' || mode === 'structure') && (
        <circle
          cx={def.player.col * ts + ts / 2}
          cy={def.player.row * ts + ts / 2}
          r={ts * 0.22}
          fill={def.player.color}
          stroke="#fff"
          strokeWidth={2}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Trophy markers */}
      {def.trophies.map((t, i) => (
        <text
          key={i}
          x={t.col * ts + ts / 2}
          y={t.row * ts + ts / 2 + 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={ts * 0.4}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          🏆
        </text>
      ))}

      {/* Exit markers */}
      {def.exits.map((exit) => {
        const x = exit.col * ts + ts / 2
        const y = exit.row * ts + ts / 2
        return (
          <g key={exit.name} style={{ pointerEvents: 'none' }}>
            <circle cx={x} cy={y} r={ts * 0.15} fill="#4ade80" opacity={0.8} />
            <text
              x={x}
              y={y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={ts * 0.2}
              fill="#fff"
              fontWeight="bold"
              style={{ userSelect: 'none' }}
            >
              {exit.name}
            </text>
          </g>
        )
      })}

      {/* Link markers */}
      {def.links.map((link, i) => (
        <g key={i} style={{ pointerEvents: 'none' }}>
          <rect
            x={link.col * ts + ts * 0.3}
            y={link.row * ts + ts * 0.3}
            width={ts * 0.4}
            height={ts * 0.4}
            fill="#fb923c"
            opacity={0.7}
            rx={2}
          />
          <text
            x={link.col * ts + ts * 0.5}
            y={link.row * ts + ts * 0.5 + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={ts * 0.18}
            fill="#fff"
            style={{ userSelect: 'none' }}
          >
            →{link.blockPath[link.blockPath.length - 1]}
          </text>
        </g>
      ))}
    </svg>
  )
}
