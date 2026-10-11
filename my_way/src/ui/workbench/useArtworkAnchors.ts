import { useState } from 'react'
import type { MazeArtwork, PathConnection } from '../../core/model/pathMaze'

export type ArtworkAnchor = 'start' | 'goal' | 'from' | 'to' | 'arrivalFrom'
type Point = [number, number]

export function useArtworkAnchors(
  artwork: MazeArtwork,
  connections: PathConnection[],
  onChange: (artwork: MazeArtwork) => void
) {
  const [anchor, setAnchor] = useState<ArtworkAnchor>('start')
  const [finishIndex, setFinishIndex] = useState(-1)
  const [edge, setEdge] = useState(connections[0]?.id ?? '')
  const [pending, setPending] = useState<{ from?: Point; to?: Point }>({})
  const selectEdge = (id: string) => {
    setEdge(id)
    setPending({})
  }
  const place = (point: Point) => {
    if (anchor === 'goal' && finishIndex >= 0 && artwork.finishes?.[finishIndex]) {
      onChange({
        ...artwork,
        finishes: artwork.finishes.map((finish, i) =>
          i === finishIndex ? { ...finish, point } : finish
        ),
      })
      return
    }
    if (anchor === 'start' || anchor === 'goal') {
      onChange({ ...artwork, [anchor]: point })
      return
    }
    if (!edge) return
    const existing = artwork.gates?.find((gate) => gate.edge === edge)
    if (existing) {
      onChange({
        ...artwork,
        gates: artwork.gates!.map((gate) =>
          gate.edge === edge ? { ...gate, [anchor]: point } : gate
        ),
      })
    } else if (anchor !== 'arrivalFrom') {
      const next = { ...pending, [anchor]: point }
      setPending(next)
      if (next.from && next.to) {
        onChange({
          ...artwork,
          gates: [...(artwork.gates ?? []), { edge, from: next.from, to: next.to }],
        })
        setPending({})
      }
    }
  }
  const points = [
    artwork.start,
    artwork.goal,
    ...(artwork.finishes ?? []).map((finish) => finish.point),
    ...(artwork.gates ?? [])
      .filter((gate) => gate.edge === edge)
      .flatMap((gate) => [gate.from, gate.to, gate.arrivalFrom]),
    pending.from,
    pending.to,
  ].filter((point): point is Point => !!point)
  return {
    anchor,
    setAnchor,
    finishIndex,
    setFinishIndex,
    finishes: artwork.finishes ?? [],
    edge,
    selectEdge,
    pending,
    points,
    place,
  }
}
