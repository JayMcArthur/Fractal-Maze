import type { RecursiveTourDefinition, TourGate, TourRoom, TourState } from '../model/recursiveTour'

export const tourDirections: TourGate[] = ['N', 'E', 'S', 'W']
const opposite: Record<TourGate, TourGate> = { N: 'S', E: 'W', S: 'N', W: 'E' }
export const tourStateKey = (state: TourState) => JSON.stringify(state)
export const currentTourRoom = (state: TourState) => state.rooms[state.active.at(-1)!]
export const tourComplete = (state: TourState) => state.rooms[0].exit !== null
export function startTour(def: RecursiveTourDefinition): TourState {
  return {
    rooms: [{ address: [], entry: def.entry, cells: [def.gates[def.entry]], exit: null }],
    active: [0],
  }
}
export function tourCounts(def: RecursiveTourDefinition, room: TourRoom) {
  const rows = Array<number>(def.size).fill(0),
    columns = Array<number>(def.size).fill(0)
  for (const cell of room.cells) {
    rows[Math.floor(cell / def.size)]++
    columns[cell % def.size]++
  }
  return { rows, columns }
}
function canVisit(def: RecursiveTourDefinition, room: TourRoom, cell: number): string | null {
  if (room.cells.includes(cell))
    return 'This room’s path cannot cross or backtrack. Use Undo to change it.'
  const { rows, columns } = tourCounts(def, room),
    row = Math.floor(cell / def.size),
    col = cell % def.size
  if (
    (def.rowCounts[row] !== null && rows[row] >= def.rowCounts[row]!) ||
    (def.columnCounts[col] !== null && columns[col] >= def.columnCounts[col]!)
  )
    return 'That move would exceed a row or column count.'
  return null
}
export function tourExitError(
  def: RecursiveTourDefinition,
  room: TourRoom,
  gate: TourGate
): string | null {
  if (gate === room.entry) return 'Leave through a different gate from the one you entered.'
  if (def.dots.some((dot) => !room.cells.includes(dot)))
    return 'Visit every dot in this room before leaving.'
  const { rows, columns } = tourCounts(def, room)
  if (
    def.rowCounts.some((count, i) => count !== null && rows[i] !== count) ||
    def.columnCounts.some((count, i) => count !== null && columns[i] !== count)
  )
    return 'Meet every numbered row and column in this room before leaving.'
  if (
    !room.address.length &&
    def.requireRootCopy &&
    !def.copies.some((copy) => room.cells.includes(copy.cell))
  )
    return 'The first tour must visit at least one recursive studio.'
  return null
}
function nextCell(def: RecursiveTourDefinition, cell: number, direction: TourGate): number | null {
  const row = Math.floor(cell / def.size),
    col = cell % def.size
  if (direction === 'N') return row ? cell - def.size : null
  if (direction === 'S') return row + 1 < def.size ? cell + def.size : null
  if (direction === 'W') return col ? cell - 1 : null
  return col + 1 < def.size ? cell + 1 : null
}
function advance(
  def: RecursiveTourDefinition,
  state: TourState,
  direction: TourGate
): string | null {
  const room = currentTourRoom(state),
    cell = room.cells.at(-1)!,
    next = nextCell(def, cell, direction)
  if (next === null) return leaveRoom(def, state, direction)
  if (!def.cells[cell].includes(next)) return 'A wall blocks that move.'
  const error = canVisit(def, room, next)
  if (error) return error
  room.cells.push(next)
  const copy = def.copies.find((copy) => copy.cell === next)
  if (copy) {
    const entry = opposite[direction]
    state.active.push(state.rooms.length)
    state.rooms.push({
      address: [...room.address, copy.id],
      entry,
      cells: [def.gates[entry]],
      exit: null,
    })
  }
  return null
}
function leaveRoom(def: RecursiveTourDefinition, state: TourState, gate: TourGate): string | null {
  const room = currentTourRoom(state)
  if (room.cells.at(-1) !== def.gates[gate]) return 'There is no gate here.'
  const error = tourExitError(def, room, gate)
  if (error) return error
  room.exit = gate
  if (state.active.length === 1) return null
  state.active.pop()
  // A studio counts as one parent square. Its exit continues to the adjacent parent square.
  return advance(def, state, gate)
}
export function moveTour(
  def: RecursiveTourDefinition,
  state: TourState,
  direction: TourGate
): { state: TourState } | { error: string } {
  if (tourComplete(state)) return { error: 'Tour complete. Restart to draw another path.' }
  const next = structuredClone(state),
    error = advance(def, next, direction)
  return error ? { error } : { state: next }
}
export function playTourMoves(def: RecursiveTourDefinition, moves: TourGate[]): TourState[] {
  const states = [startTour(def)]
  for (const direction of moves) {
    const result = moveTour(def, states.at(-1)!, direction)
    if ('error' in result) throw new Error(result.error)
    states.push(result.state)
  }
  return states
}
