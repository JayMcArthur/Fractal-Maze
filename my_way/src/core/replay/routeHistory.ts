import type { PlayerAction } from '../model/playerState'
import { samePosition } from './replayFrame'

/** A route ends at its latest position; revisiting a position removes the intervening loop. */
export function appendRouteState<T>(states: T[], next: T, key: (state: T) => string): T[] {
  const index = states.findIndex((state) => key(state) === key(next))
  return index < 0 ? [...states, next] : states.slice(0, index + 1)
}

export function appendRouteAction(actions: PlayerAction[], next: PlayerAction): PlayerAction[] {
  if (next.type === 'checkpoint') return [...actions, next]
  const index = actions.findIndex((action) => samePosition(action.from, next.to))
  return index < 0 ? [...actions, next] : actions.slice(0, index)
}
