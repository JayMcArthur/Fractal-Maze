import { z } from 'zod'
import type { RecursiveTourDefinition, TourState } from '../model/recursiveTour'
import type { ValidationIssue } from '../validate/ValidationResult'
import {
  moveTour,
  startTour,
  tourComplete,
  tourDirections,
  tourStateKey,
  playTourMoves,
} from './movement'

const gate = z.enum(['N', 'E', 'S', 'W'])
const cell = z.number().int().nonnegative()
const marks = z.array(z.number().int().positive())
export const tourSchema = z.object({
  type: z.literal('recursiveTour'),
  size: z.number().int().min(3).max(31),
  cells: z.array(z.array(cell)),
  rowCounts: z.array(cell.nullable()),
  columnCounts: z.array(cell.nullable()),
  dots: z.array(cell),
  copies: z.array(z.object({ id: z.string().min(1), cell })),
  gates: z.object({ N: cell, E: cell, S: cell, W: cell }),
  entry: gate,
  requireRootCopy: z.boolean(),
  exitMarks: z.object({ N: marks, E: marks, S: marks, W: marks }),
  finalMarks: marks,
  providedMoves: z.array(gate).optional(),
  review: z.enum(['wip', 'reviewed']),
})
export const tourStateSchema = z.object({
  rooms: z
    .array(
      z.object({
        address: z.array(z.string()),
        entry: gate,
        cells: z.array(cell).min(1),
        exit: gate.nullable(),
      })
    )
    .min(1),
  active: z.array(cell).min(1),
})
export function validateTour(def: RecursiveTourDefinition): ValidationIssue[] {
  const parsed = tourSchema.safeParse(def)
  const error = (message: string): ValidationIssue[] => [
    { severity: 'error', code: 'RECURSIVE_TOUR', message },
  ]
  if (!parsed.success) return error('Recursive tour fields are invalid.')
  const size = def.size,
    total = size * size
  if (
    def.cells.length !== total ||
    def.rowCounts.length !== size ||
    def.columnCounts.length !== size
  )
    return error('Tour grid and count dimensions must match.')
  if ([...def.rowCounts, ...def.columnCounts].some((count) => count !== null && count > size))
    return error('Tour counts cannot exceed the grid size.')
  const points = [...def.dots, ...def.copies.map((copy) => copy.cell), ...Object.values(def.gates)]
  if (points.some((point) => point >= total))
    return error('Tour dots, studios and gates must be inside the grid.')
  if (
    new Set(def.copies.map((copy) => copy.id)).size !== def.copies.length ||
    new Set(def.copies.map((copy) => copy.cell)).size !== def.copies.length
  )
    return error('Tour studios need unique names and cells.')
  for (let i = 0; i < total; i++)
    for (const j of def.cells[i])
      if (
        j >= total ||
        !def.cells[j].includes(i) ||
        Math.abs(Math.floor(i / size) - Math.floor(j / size)) +
          Math.abs((i % size) - (j % size)) !==
          1
      )
        return error('Tour corridors must connect neighboring cells in both directions.')
  if (
    Object.entries(def.gates).some(([name, point]) =>
      name === 'N'
        ? point >= size
        : name === 'S'
          ? point < total - size
          : name === 'W'
            ? point % size !== 0
            : point % size !== size - 1
    )
  )
    return error('Tour gates must lie on their named borders.')
  if (def.copies.some((copy) => Object.values(def.gates).includes(copy.cell)))
    return error('A studio cannot occupy a border gate.')
  if (def.providedMoves) {
    try {
      if (!tourComplete(playTourMoves(def, def.providedMoves).at(-1)!))
        return error('Provided tour must finish.')
    } catch {
      return error('Provided tour contains an illegal move.')
    }
  }
  return []
}
export function validateTourReplay(
  def: RecursiveTourDefinition,
  states: TourState[],
  complete: boolean
): void {
  if (tourStateKey(states[0]) !== tourStateKey(startTour(def)))
    throw new Error('Tour replay must begin at the north entry.')
  for (let i = 1; i < states.length; i++) {
    const legal = tourDirections.some((direction) => {
      const result = moveTour(def, states[i - 1], direction)
      return 'state' in result && tourStateKey(result.state) === tourStateKey(states[i])
    })
    if (!legal) throw new Error('Tour replay contains an illegal move or invalid room counts.')
  }
  if (complete && !tourComplete(states.at(-1)!))
    throw new Error('Complete tour replay must leave the root room.')
}
