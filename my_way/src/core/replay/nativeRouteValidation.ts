import type { NativeRoute } from './nativeReplay'
import type { RecursivePortsDefinition } from '../model/recursivePorts'
import type { GeometricRecursiveDefinition } from '../model/geometricRecursive'
import type { GraphLabeledDefinition } from '../model/graphLabeled'
import { portMoves, portStateKey } from '../model/recursivePorts'
import { geometricStart, geometricChoices, geometricMove } from '../solver/common/geometricMovement'
import { graphChoices } from '../solver/common/graphTraversal'
import type { SquareRecursiveDefinition } from '../model/squareRecursive'
import type { PlayerAction } from '../model/playerState'
import { samePosition } from './replayFrame'
import { resolveMove } from '../solver/common/movementResolver'

export function validateSquareReplay(def: SquareRecursiveDefinition, actions: PlayerAction[], complete: boolean) {
  let current = { blockStack: ['0'], row: def.player.row, col: def.player.col }
  let won = def.trophies.some(trophy => trophy.row === current.row && trophy.col === current.col)
  for (const action of actions) {
    if (!samePosition(current, action.from)) throw new Error('Square replay does not follow the previous position.')
    if (action.type === 'annotation' || action.type === 'checkpoint') {
      if (!samePosition(current, action.to)) throw new Error('Replay notes cannot move the player.')
      continue
    }
    const directions = action.direction ? [action.direction] : [8, 4, 2, 1] as const
    const move = directions.map(direction => resolveMove(def, current, direction, Date.now())).find(result => result && samePosition(result.newPos, action.to))
    if (!move || won) throw new Error('Square replay contains an illegal move.')
    current = move.newPos; won = move.isWin
  }
  if (complete && !won) throw new Error('Complete square replay must reach the finish.')
}

export function validatePortReplay(def: RecursivePortsDefinition, route: Extract<NativeRoute, { type: 'recursivePorts' }>, complete: boolean) {
  if (route.states.some(state => state.blocks.some(block => block >= def.blocks.length)) ||
    portStateKey(route.states[0]) !== portStateKey(def.start) ||
    route.states.slice(1).some((state, index) => !portMoves(def, route.states[index]).some(move => portStateKey(move.state) === portStateKey(state))) ||
    (complete && portStateKey(route.states.at(-1)!) !== portStateKey(def.goal)))
    throw new Error('Replay contains an illegal recursive-port route.')
}

export function validateGeometricReplay(def: GeometricRecursiveDefinition, route: Extract<NativeRoute, { type: 'geometricRecursive' }>, complete: boolean) {
  if (JSON.stringify(route.states[0]) !== JSON.stringify(geometricStart(def.maze)) || route.gates.length !== route.states.length - 1 ||
    route.gates.some((gate, index) => !geometricChoices(def.maze, route.states[index]).includes(gate) || JSON.stringify(geometricMove(def.maze, route.states[index], gate)) !== JSON.stringify(route.states[index + 1])) ||
    (complete && !route.states.at(-1)!.won)) throw new Error('Replay contains an illegal geometric route.')
}

export function validateGraphReplay(def: GraphLabeledDefinition, route: Extract<NativeRoute, { type: 'graphLabeled' }>, complete: boolean) {
  if (route.states[0] !== def.entryPortal || route.states.slice(1).some((state, index) => !graphChoices(def, route.states[index]).includes(state)) ||
    (complete && route.states.at(-1) !== def.exitPortal)) throw new Error('Replay contains an illegal portal route.')
}
