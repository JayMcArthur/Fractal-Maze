import { expect, it } from 'vitest'
import { appendRouteAction, appendRouteState } from '../core/replay/routeHistory'
import { appendPathMove } from '../core/pathMaze/traversal'
import type { PlayerAction } from '../core/model/playerState'
import { trimNativeRoute } from '../core/replay/nativeReplay'

it('trims a multi-step loop and keeps the route legally contiguous', () => {
  const positions = [
    { blockStack: ['0'], row: 0, col: 0 },
    { blockStack: ['0'], row: 0, col: 1 },
    { blockStack: ['0'], row: 1, col: 1 },
    { blockStack: ['0'], row: 1, col: 0 },
    { blockStack: ['0'], row: 0, col: 0 },
  ]
  const actions = positions
    .slice(1)
    .map((to, i): PlayerAction => ({ type: 'move', from: positions[i], to, timestamp: i * 200 }))
  expect(actions.reduce(appendRouteAction, [] as PlayerAction[])).toEqual([])
  expect(appendRouteState([0, 1, 2, 3], 1, String)).toEqual([0, 1])
})
it('does not confuse positions in different recursive copies, and trims edge IDs with states', () => {
  const start = { path: '1', address: [] },
    inside = { path: '1', address: ['A'] }
  const entered = appendPathMove({ states: [start], edges: [] }, inside, 'enter-A')
  expect(entered.states).toEqual([start, inside])
  expect(appendPathMove(entered, start, 'exit-A')).toEqual({ states: [start], edges: [] })
})
it('removes old native replay detours without losing the transition after a loop', () => {
  const a = { path: '1', address: [] },
    b = { path: '2', address: ['A'] },
    c = { path: '3', address: [] }
  expect(
    trimNativeRoute({ type: 'pathPushdown', states: [a, b, a, c], edges: ['in', 'out', 'finish'] })
  ).toEqual({ type: 'pathPushdown', states: [a, c], edges: ['finish'] })
  expect(
    trimNativeRoute({
      type: 'recursivePorts',
      states: [
        { blocks: [0], port: 0 },
        { blocks: [0, 1], port: 0 },
        { blocks: [0], port: 0 },
      ],
    }).states
  ).toEqual([{ blocks: [0], port: 0 }])
  expect(
    trimNativeRoute({
      type: 'repeatedDirected',
      states: [
        { x: 0, y: 0, terminal: 'N0' },
        { x: 1, y: 0, terminal: 'N0' },
        { x: 0, y: 0, terminal: 'N0' },
      ],
    }).states
  ).toEqual([{ x: 0, y: 0, terminal: 'N0' }])
})
