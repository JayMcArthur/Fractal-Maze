export type TourGate = 'N' | 'E' | 'S' | 'W'
export interface RecursiveTourDefinition {
  type: 'recursiveTour'
  size: number
  /** Adjacent cells, indexed in row order. Walls remove adjacency. */
  cells: number[][]
  rowCounts: (number | null)[]
  columnCounts: (number | null)[]
  dots: number[]
  copies: { id: string; cell: number }[]
  gates: Record<TourGate, number>
  entry: TourGate
  requireRootCopy: boolean
  exitMarks: Record<TourGate, number[]>
  finalMarks: number[]
  providedMoves?: TourGate[]
  review: 'wip' | 'reviewed'
}
export interface TourRoom {
  address: string[]
  entry: TourGate
  cells: number[]
  exit: TourGate | null
}
export interface TourState {
  rooms: TourRoom[]
  /** Indices of the root and currently open recursive rooms. */
  active: number[]
}
