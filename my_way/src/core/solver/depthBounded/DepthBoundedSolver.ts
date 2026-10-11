import type { SquareRecursiveDefinition } from '../../model/squareRecursive'
import type { SolverConfig, SolverEvent } from '../../model/solverInterface'
import type { PlayerPosition, PlayerAction } from '../../model/playerState'
import { resolveMove, DIR_N, DIR_E, DIR_S, DIR_W } from '../common/movementResolver'

const DIRECTIONS = [DIR_N, DIR_E, DIR_S, DIR_W] as const
const posKey = (pos: PlayerPosition) => pos.blockStack.join('/') + ':' + pos.row + ',' + pos.col
interface Frame { pos: PlayerPosition; direction: number; action?: PlayerAction }

/** Action-depth deepening is independent of the configured recursion-depth cap. */
export async function* iddfsSolve(def: SquareRecursiveDefinition, config: SolverConfig): AsyncGenerator<SolverEvent> {
  const start: PlayerPosition = { blockStack: ['0'], row: def.player.row, col: def.player.col }
  const startedAt = Date.now()
  let nodesExplored = 0
  for (let actionLimit = 1; ; actionLimit++) {
    yield { type: 'progress', nodesExplored, depth: actionLimit }
    await new Promise((resolve) => setTimeout(resolve, 0))
    const frames: Frame[] = [{ pos: start, direction: 0 }]
    const visited = new Set([posKey(start)])
    let actionLimited = false, recursionLimited = false
    nodesExplored++
    while (frames.length) {
      if (Date.now() - startedAt >= config.timeoutMs || nodesExplored >= config.maxNodes) {
        yield { type: 'unsolvable', nodesExplored, depth: actionLimit, message: Date.now() - startedAt >= config.timeoutMs ? 'timeout' : 'maxNodes reached' }; return
      }
      const frame = frames.at(-1)!
      if (frame.direction >= DIRECTIONS.length) { visited.delete(posKey(frame.pos)); frames.pop(); continue }
      const result = resolveMove(def, frame.pos, DIRECTIONS[frame.direction++], startedAt)
      if (!result) continue
      if (result.newPos.blockStack.length - 1 > config.maxDepth) { recursionLimited = true; continue }
      if (result.isWin) {
        yield { type: 'solved', nodesExplored, depth: actionLimit, path: [...frames.slice(1).map((item) => item.action!), result.action] }; return
      }
      const key = posKey(result.newPos)
      if (visited.has(key)) continue
      if (frames.length >= actionLimit) { actionLimited = true; continue }
      visited.add(key); frames.push({ pos: result.newPos, direction: 0, action: result.action }); nodesExplored++
    }
    if (!actionLimited) {
      yield { type: 'unsolvable', nodesExplored, depth: actionLimit, message: recursionLimited ? 'depth limit reached' : 'exhausted' }; return
    }
  }
}
