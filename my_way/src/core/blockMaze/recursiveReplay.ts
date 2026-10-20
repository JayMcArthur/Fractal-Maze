import type { BlockRecursiveDefinition } from '../model/blockRecursive'
import type { RecursiveBlockPosition } from './recursivePosition'
import { moveRecursiveBlock, recursiveBlockAddress, recursiveBlockKey, recursiveBlockWon } from './recursivePosition'

export interface RecursiveBlockRoute {
  type: 'fractalBlock'
  states: RecursiveBlockPosition[]
  details: number[]
}

export function validateRecursiveBlockRoute(def: BlockRecursiveDefinition, route: RecursiveBlockRoute, complete: boolean) {
  if (!def.start || route.details.length !== route.states.length - 1 ||
    route.states[0].x.digits[0] !== def.start[0] || route.states[0].y.digits[0] !== def.start[1])
    throw new Error('Recursive block replay must start in its declared entry and record every move.')
  for (const state of route.states) {
    if ([...state.x.digits, ...state.y.digits].some(digit => digit >= def.unit) || !recursiveBlockAddress(def, state))
      throw new Error('Recursive block replay contains a wall or an invalid coordinate.')
  }
  for (let i = 0; i < route.details.length; i++) {
    const from = route.states[i], to = route.states[i + 1], detail = route.details[i]
    if (detail > Math.max(from.x.digits.length, from.y.digits.length, to.x.digits.length, to.y.digits.length) + 1 ||
      !([1, 2, 4, 8] as const).some(direction => {
        const next = moveRecursiveBlock(def, from, direction, detail)
        return next && recursiveBlockKey(next) === recursiveBlockKey(to)
      })) throw new Error('Recursive block replay contains a nonadjacent or blocked move.')
  }
  if (complete && !recursiveBlockWon(def, route.states.at(-1)!))
    throw new Error('Complete recursive block replay must reach its declared finish.')
}
