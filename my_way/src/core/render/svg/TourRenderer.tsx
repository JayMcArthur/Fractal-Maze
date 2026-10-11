import type { MazeArtwork } from '../../model/pathMaze'
import type { RecursiveTourDefinition, TourState } from '../../model/recursiveTour'
import { currentTourRoom, startTour } from '../../recursiveTour/movement'
import { assetUrl } from '../../io/assetUrl'

export function TourRenderer({
  def,
  artwork,
  state = startTour(def),
  roomIndex,
  onCell,
  markings = false,
}: {
  def: RecursiveTourDefinition
  artwork?: MazeArtwork
  state?: TourState
  roomIndex?: number
  onCell?: (cell: number) => void
  markings?: boolean
}) {
  const room = roomIndex === undefined ? currentTourRoom(state) : state.rooms[roomIndex]
  const width = artwork?.width ?? 800,
    height = artwork?.height ?? 800
  const [x, y, w, h] = artwork?.bounds ?? [20, 20, 720, 720]
  const cw = w / def.size,
    ch = h / def.size
  const center = (cell: number) => [
    x + ((cell % def.size) + 0.5) * cw,
    y + (Math.floor(cell / def.size) + 0.5) * ch,
  ]
  const points = room.cells.map((cell) => center(cell).join(',')).join(' ')
  const marked = new Set(
    room.exit ? [...def.exitMarks[room.exit], ...(!room.address.length ? def.finalMarks : [])] : []
  )
  return (
    <svg
      className="tour-drawing"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Recursive tour: ${room.address.join(' → ') || 'surface'}`}
    >
      {artwork ? (
        <image href={assetUrl(artwork.asset)} width={width} height={height} />
      ) : (
        <rect x={x} y={y} width={w} height={h} fill="#eee" />
      )}
      {!artwork &&
        def.cells.map((neighbors, cell) => {
          const [cx, cy] = center(cell)
          return (
            <g key={cell}>
              {neighbors
                .filter((next) => next > cell)
                .map((next) => {
                  const [nx, ny] = center(next)
                  return (
                    <line
                      key={next}
                      x1={cx}
                      y1={cy}
                      x2={nx}
                      y2={ny}
                      stroke="#666"
                      strokeWidth={cw * 0.15}
                    />
                  )
                })}
            </g>
          )
        })}
      {markings &&
        room.cells.map((cell, i) =>
          marked.has(i + 1) ? (
            <rect
              key={cell}
              x={center(cell)[0] - cw / 2 + 3}
              y={center(cell)[1] - ch / 2 + 3}
              width={cw - 6}
              height={ch - 6}
              fill="white"
            />
          ) : null
        )}
      <polyline
        points={points}
        stroke="#075dad"
        strokeWidth={Math.max(3, cw * 0.09)}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {def.dots.map((cell) => (
        <circle
          key={cell}
          cx={center(cell)[0]}
          cy={center(cell)[1]}
          r={cw * 0.09}
          fill={room.cells.includes(cell) ? '#075dad' : '#111'}
        />
      ))}
      {def.copies.map((copy) => (
        <text
          key={copy.id}
          x={center(copy.cell)[0]}
          y={center(copy.cell)[1]}
          dominantBaseline="middle"
          textAnchor="middle"
          fill="#163953"
          fontSize={cw * 0.3}
          fontWeight="700"
        >
          {copy.id}
        </text>
      ))}
      <circle
        cx={center(room.cells.at(-1)!)[0]}
        cy={center(room.cells.at(-1)!)[1]}
        r={cw * 0.13}
        fill="#fcbf35"
        stroke="#222"
        strokeWidth="2"
      />
      {onCell &&
        def.cells.map((_, cell) => (
          <rect
            key={cell}
            x={x + (cell % def.size) * cw}
            y={y + Math.floor(cell / def.size) * ch}
            width={cw}
            height={ch}
            fill="transparent"
            onClick={() => onCell(cell)}
          />
        ))}
    </svg>
  )
}
