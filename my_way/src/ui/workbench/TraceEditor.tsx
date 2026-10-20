import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { ArtworkTrace, MazeArtwork, MazePath, PathConnection } from '../../core/model/pathMaze'
import { assetUrl } from '../../core/io/assetUrl'
import { TraceShape } from '../../core/render/svg/TraceShape'
import { CorridorArtwork } from '../../core/render/svg/CorridorArtwork'
import { ArtworkAnchorControls } from './ArtworkAnchors'
import { useArtworkAnchors } from './useArtworkAnchors'
import { artworkDisplayGeometry } from '../../core/pathMaze/artworkDisplayGeometry'

export function TraceEditor({
  artwork,
  paths,
  connections,
  onChange,
}: {
  artwork: MazeArtwork
  paths: MazePath[]
  connections: PathConnection[]
  onChange: (artwork: MazeArtwork) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selected, setSelected] = useState('')
  const [tool, setTool] = useState<'select' | 'draw' | 'frame' | 'anchor'>('select')
  const anchors = useArtworkAnchors(artwork, connections, onChange)
  const [points, setPoints] = useState<[number, number][]>([])
  const [label, setLabel] = useState(paths[0]?.id ?? '')
  const [frameId, setFrameId] = useState('A')
  const [opacity, setOpacity] = useState(0.85)
  const [zoom, setZoom] = useState(1)
  const [showLabels, setShowLabels] = useState(paths.length <= 20)
  const [drag, setDrag] = useState<{ index: number; point: [number, number] } | null>(null)
  const labeled = new Map<string, ArtworkTrace>()
  for (const item of artwork.traces)
    if (paths.some((path) => path.id === item.path) && !labeled.has(item.path))
      labeled.set(item.path, item)
  const trace = artwork.traces.find((trace) => trace.id === selected)
  const display = artworkDisplayGeometry(artwork)
  const unit = display.bounds[2] / 100
  const coordinate = (event: PointerEvent<SVGElement>): [number, number] => {
    const svg = svgRef.current!,
      matrix = svg.getScreenCTM()!
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    return [Math.round(point.x * 100) / 100, Math.round(point.y * 100) / 100]
  }
  const patchTrace = (next: ArtworkTrace) =>
    onChange({
      ...artwork,
      traces: artwork.traces.map((trace) => (trace.id === next.id ? next : trace)),
    })
  const finish = () => {
    if (tool === 'draw' && points.length > 1)
      onChange({
        ...artwork,
        traces: [
          ...artwork.traces,
          {
            id: crypto.randomUUID(),
            path: label,
            color: paths.find((path) => path.id === label)?.color ?? '#dd633c',
            points,
          },
        ],
      })
    if (tool === 'frame' && points.length > 1) {
      const [a, b] = points
      if (a[0] !== b[0] && a[1] !== b[1])
        onChange({
          ...artwork,
          frames: [
            ...artwork.frames.filter((frame) => frame.id !== frameId),
            {
              id: frameId,
              x: Math.min(a[0], b[0]),
              y: Math.min(a[1], b[1]),
              width: Math.abs(a[0] - b[0]),
              height: Math.abs(a[1] - b[1]),
            },
          ],
        })
    }
    setPoints([])
  }
  return (
    <section className="trace-editor">
      <div className="workbench-toolbar">
        <label>
          Tool
          <select
            aria-label="Trace tool"
            value={tool}
            onChange={(event) => {
              setTool(event.target.value as typeof tool)
              setPoints([])
            }}
          >
            <option value="select">Select / move vertices</option>
            <option value="draw">Draw a connected path</option>
            <option value="frame">Place copy frame</option>
            <option value="anchor">Place entry, finish or gate</option>
          </select>
        </label>
        {tool === 'anchor' && (
          <ArtworkAnchorControls selection={anchors} connections={connections} />
        )}
        <label>
          Path label
          <select
            aria-label="Drawing path"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          >
            <option value="">Unassigned</option>
            {paths.map((path) => (
              <option key={path.id} value={path.id}>
                {path.label}
                {path.helper ? ' (helper)' : ''}
              </option>
            ))}
          </select>
        </label>
        {tool === 'frame' && (
          <label>
            Copy name
            <input
              aria-label="Copy frame name"
              value={frameId}
              onChange={(event) => setFrameId(event.target.value)}
            />
          </label>
        )}
        <label>
          Image
          <input
            aria-label="Artwork opacity"
            type="range"
            min="0"
            max="1"
            step=".05"
            value={opacity}
            onChange={(event) => setOpacity(Number(event.target.value))}
          />
        </label>
        <label>
          Zoom
          <select
            aria-label="Artwork zoom"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          >
            {[1, 1.5, 2, 3, 4].map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
        <label className="trace-label-toggle">
          <input
            aria-label="Show path labels"
            type="checkbox"
            checked={showLabels}
            onChange={(event) => setShowLabels(event.target.checked)}
          />
          Path labels
        </label>
        {(tool === 'draw' || tool === 'frame') && (
          <>
            <button
              className="control control--primary"
              disabled={points.length < 2 || (tool === 'frame' && !frameId.trim())}
              onClick={finish}
            >
              Finish {tool === 'draw' ? 'trace' : 'frame'}
            </button>
            <button
              className="control"
              onClick={() => setPoints(points.slice(0, -1))}
              disabled={!points.length}
            >
              Undo point
            </button>
            <button className="control" onClick={() => setPoints([])}>
              Cancel
            </button>
          </>
        )}
      </div>
      <p className="workbench-help">
        {
          {
            anchor:
              'Click the source to place an anchor. A gate needs departure and arrival coordinates. These align the drawing; its path states and copy operation are set in the PDA editor.',
            draw: 'Click along the corridor, including bends, then finish. Assign separate fragments the same label when they belong to one connected path.',
            frame:
              'Click two opposite corners of a copy. Use the connection table to match its gates; a frame alone does not create a PDA transition.',
            select:
              'Select a trace, assign its connected-path label, or drag a vertex. Original SVG curves stay exact until you move a vertex.',
          }[tool]
        }
      </p>
      {artwork.views && (
        <button className="control" onClick={() => onChange({ ...artwork, views: undefined })}>
          Show all room diagrams together in Play
        </button>
      )}
      <div className="trace-scroll">
        <svg
          ref={svgRef}
          className="trace-board"
          viewBox={display.bounds.join(' ')}
          style={{ width: `${zoom * 100}%` }}
          role="img"
          aria-label="Editable source maze"
          onPointerDown={(event) => {
            if (tool === 'anchor') anchors.place(coordinate(event))
            else if (tool !== 'select' && (tool !== 'frame' || points.length < 2))
              setPoints([...points, coordinate(event)])
            else if (event.target === event.currentTarget) setSelected('')
          }}
          onPointerMove={(event) => {
            if (drag) setDrag({ ...drag, point: coordinate(event) })
          }}
          onPointerUp={() => {
            if (drag && trace)
              patchTrace({
                ...trace,
                svg: undefined,
                points: trace.points.map((point, i) => (i === drag.index ? drag.point : point)),
              })
            setDrag(null)
          }}
          onPointerCancel={() => setDrag(null)}
        >
          {artwork.asset ? (
            <image
              href={assetUrl(artwork.asset)}
              width={display.width}
              height={display.height}
              opacity={opacity}
              pointerEvents="none"
            />
          ) : (
            <g opacity={opacity} pointerEvents="none">
              <CorridorArtwork artwork={artwork} bounds={display.bounds} />
            </g>
          )}
          {tool === 'anchor' && (
            <g pointerEvents="none" fill="#fff" stroke="#21665e" strokeWidth={unit * 0.25}>
              {anchors.points.map((point, i) => (
                <circle key={i} cx={point[0]} cy={point[1]} r={unit} />
              ))}
            </g>
          )}
          {artwork.traces.map((item) => {
            const drawn =
              drag && item.id === selected
                ? {
                    ...item,
                    svg: undefined,
                    points: item.points.map((point, i) => (i === drag.index ? drag.point : point)),
                  }
                : item
            return (
              <g
                key={item.id}
                fill="none"
                stroke={item.id === selected ? '#dd633c' : item.color}
                strokeWidth={unit * 0.3}
                strokeLinecap="round"
                opacity={item.id === selected ? 1 : 0.6}
              >
                <g pointerEvents="none">
                  <TraceShape trace={drawn} />
                </g>
                <g
                  className="trace-hit"
                  stroke="transparent"
                  strokeWidth={unit * 1.5}
                  onPointerDown={(event) => {
                    if (tool !== 'select') return
                    event.stopPropagation()
                    setSelected(item.id)
                  }}
                >
                  <title>
                    Path {paths.find((path) => path.id === item.path)?.label ?? '?'} · {item.id}
                  </title>
                  <TraceShape trace={drawn} />
                </g>
              </g>
            )
          })}
          {showLabels &&
            [...labeled.values()].map((item) => {
              const point = item.points[Math.floor(item.points.length / 2)]
              const text = 'p' + paths.find((path) => path.id === item.path)!.label
              return (
                <g
                  key={item.path}
                  transform={`translate(${point[0]} ${point[1]})`}
                  pointerEvents="none"
                >
                  <rect
                    x={unit * 0.3}
                    y={-unit * 1.7}
                    width={unit * (text.length + 1)}
                    height={unit * 2}
                    rx={unit * 0.3}
                    fill="#fff8e7"
                    stroke="#a98753"
                    strokeWidth={unit * 0.12}
                  />
                  <text
                    x={unit * 0.6}
                    y={-unit * 0.25}
                    fill="#6c4926"
                    fontSize={unit * 1.4}
                    fontWeight="bold"
                  >
                    {text}
                  </text>
                </g>
              )
            })}
          {artwork.frames.map((frame) => (
            <g key={frame.id} pointerEvents="none">
              <rect
                x={frame.x}
                y={frame.y}
                width={frame.width}
                height={frame.height}
                fill="none"
                stroke="#536b98"
                strokeWidth={unit * 0.3}
                strokeDasharray={`${unit} ${unit / 2}`}
              />
              <text x={frame.x + unit} y={frame.y + unit * 2} fontSize={unit * 2} fill="#293c64">
                {frame.id}
              </text>
            </g>
          ))}
          {!!points.length && (
            <polyline
              points={points.map((point) => point.join(',')).join(' ')}
              fill="none"
              stroke="#dd633c"
              strokeWidth={unit * 0.5}
              pointerEvents="none"
            />
          )}
          {trace?.points.map((point, index) => {
            const actual = drag?.index === index ? drag.point : point
            return (
              <circle
                key={index}
                cx={actual[0]}
                cy={actual[1]}
                r={unit * 0.65}
                fill="white"
                stroke="#dd633c"
                strokeWidth={unit * 0.3}
                className="trace-vertex"
                onPointerDown={(event) => {
                  if (tool !== 'select') return
                  event.stopPropagation()
                  event.currentTarget.setPointerCapture(event.pointerId)
                  setDrag({ index, point })
                }}
              />
            )
          })}
        </svg>
      </div>
      {trace && (
        <div className="trace-selection workbench-toolbar">
          <strong>Selected trace</strong>
          <label>
            <input
              type="checkbox"
              aria-label="Directed trace"
              checked={!!trace.directed}
              onChange={(event) => patchTrace({ ...trace, directed: event.target.checked })}
            />
            Follow vertices in arrow order
          </label>
          <label>
            Connected path
            <select
              aria-label="Selected trace path"
              value={trace.path}
              onChange={(event) =>
                patchTrace({
                  ...trace,
                  path: event.target.value,
                  color: paths.find((path) => path.id === event.target.value)?.color ?? trace.color,
                })
              }
            >
              <option value="">Unassigned</option>
              {paths.map((path) => (
                <option key={path.id} value={path.id}>
                  {path.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="control"
            onClick={() => {
              onChange({
                ...artwork,
                traces: artwork.traces.filter((item) => item.id !== selected),
              })
              setSelected('')
            }}
          >
            Delete trace
          </button>
          <span>{trace.svg ? 'Original SVG geometry' : `${trace.points.length} vertices`}</span>
        </div>
      )}
    </section>
  )
}
