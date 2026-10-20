import type { SquareRecursiveDefinition } from '../../model/squareRecursive'
import type { SolverConfig, SolverEvent } from '../../model/solverInterface'
import type { PlayerPosition, PlayerAction } from '../../model/playerState'
import { resolveMove, DIR_N, DIR_E, DIR_S, DIR_W } from '../common/movementResolver'

const DIRECTIONS = [DIR_N, DIR_E, DIR_S, DIR_W] as const
const posKey = (pos: PlayerPosition) => pos.blockStack.join('/') + ':' + pos.row + ',' + pos.col
interface BFSNode { pos: PlayerPosition; parent: number; action?: PlayerAction }

export async function* bfsSolve(def: SquareRecursiveDefinition, config: SolverConfig): AsyncGenerator<SolverEvent> {
  const start: PlayerPosition = { blockStack: ['0'], row: def.player.row, col: def.player.col }
  const queue: BFSNode[] = [{ pos: start, parent: -1 }]
  const visited = new Set([posKey(start)])
  const startedAt = Date.now()
  let depthLimited = false
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const node = queue[cursor], nodesExplored = cursor + 1, depth = node.pos.blockStack.length - 1
    if (Date.now() - startedAt >= config.timeoutMs) { yield { type: 'unsolvable', nodesExplored, depth, message: 'timeout' }; return }
    for (const direction of DIRECTIONS) {
      const result = resolveMove(def, node.pos, direction, startedAt)
      if (!result) continue
      if (result.newPos.blockStack.length - 1 > config.maxDepth) { depthLimited = true; continue }
      if (result.isWin) {
        const path = [result.action]
        for (let index = cursor; queue[index].action; index = queue[index].parent) path.push(queue[index].action!)
        yield { type: 'solved', nodesExplored, depth, path: path.reverse(), frontier: [result.newPos] }; return
      }
      const key = posKey(result.newPos)
      if (visited.has(key)) continue
      if (visited.size >= config.maxNodes) { yield { type: 'unsolvable', nodesExplored, depth, message: 'maxNodes reached' }; return }
      visited.add(key); queue.push({ pos: result.newPos, parent: cursor, action: result.action })
    }
    if (nodesExplored % 200 === 0) {
      yield { type: 'progress', nodesExplored, depth, frontier: queue.slice(cursor + 1, cursor + 11).map((item) => item.pos) }
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }
  yield { type: 'unsolvable', nodesExplored: queue.length, depth: config.maxDepth, message: depthLimited ? 'depth limit reached' : 'exhausted' }
}
