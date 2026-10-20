import type { SquareRecursiveDefinition, DirectionBit } from '../model/squareRecursive'
import type { PathConnection, PathMazeDefinition, PathState } from '../model/pathMaze'
import type { PlayerAction, PlayerPosition } from '../model/playerState'
import { resolveMove } from '../solver/common/movementResolver'
import { applyConnection, reachesGoal, sameState, type PathRoute } from '../pathMaze/traversal'

const directions: DirectionBit[] = [8, 4, 2, 1]
const opposite = (direction: DirectionBit): DirectionBit =>
  ({ 8: 2, 4: 1, 2: 8, 1: 4 })[direction] as DirectionBit
const cellKey = (row: number, col: number) => `${row},${col}`
interface GateMove {
  edges: string[]
  row: number
  col: number
  direction: DirectionBit
  operation: 'enter' | 'exit' | 'walk'
}
export interface SquarePDA {
  model: PathMazeDefinition
  cellPaths: Map<string, string>
  moves: GateMove[]
  cells: Map<string, [number, number][]>
}

/** Collapse mutually reachable corridors; stack changes remain explicit PDA transitions. */
export function compileSquarePDA(def: SquareRecursiveDefinition): SquarePDA {
  const points = def.grid.cells.map(
    (_, i) => [Math.floor(i / def.grid.cols), i % def.grid.cols] as [number, number]
  )
  const normal = new Map<string, { to: string; direction: DirectionBit }[]>()
  for (const [row, col] of points) {
    const moves = directions.flatMap((direction) => {
      const move = resolveMove(def, { row, col, blockStack: ['0'] }, direction, 0)
      if (
        !move ||
        move.action.type === 'enterBlock' ||
        move.newPos.row < 0 ||
        move.newPos.col < 0 ||
        move.newPos.row >= def.grid.rows ||
        move.newPos.col >= def.grid.cols
      )
        return []
      return [{ to: cellKey(move.newPos.row, move.newPos.col), direction }]
    })
    normal.set(cellKey(row, col), moves)
  }
  const relevant = new Set([
    cellKey(def.player.row, def.player.col),
    ...def.links.map((point) => cellKey(point.row, point.col)),
    ...def.exits.map((point) => cellKey(point.row, point.col)),
    ...def.trophies.map((point) => cellKey(point.row, point.col)),
    ...[...normal.values()].flatMap((moves) => moves.map((move) => move.to)),
  ])
  const cellPaths = new Map<string, string>(),
    cells = new Map<string, [number, number][]>()
  for (const point of points) {
    const key = cellKey(...point)
    if (
      cellPaths.has(key) ||
      !(
        def.grid.cells[point[0] * def.grid.cols + point[1]] ||
        normal.get(key)!.length ||
        relevant.has(key)
      )
    )
      continue
    const id = String(cells.size + 1),
      group: [number, number][] = [point]
    cellPaths.set(key, id)
    for (let i = 0; i < group.length; i++)
      for (const next of normal.get(cellKey(...group[i]))!) {
        if (
          cellPaths.has(next.to) ||
          !normal.get(next.to)?.some((back) => back.to === cellKey(...group[i]))
        )
          continue
        cellPaths.set(next.to, id)
        group.push(next.to.split(',').map(Number) as [number, number])
      }
    cells.set(id, group)
  }
  const paths = [...cells.keys()].map((id) => ({
    id,
    label: id,
    color: def.colors.path,
    helper: false,
  }))
  const connections: PathConnection[] = [],
    moves: GateMove[] = []
  const add = (
    id: string,
    from: string,
    to: string,
    operation: PathConnection['operation'],
    copy = ''
  ) => {
    connections.push({
      id,
      from,
      to,
      operation,
      copy,
      input: '',
      evidence: 'Compiled from corridor movement rules',
    })
  }
  def.links.forEach((link, index) => {
    const exit = def.exits.find((exit) => exit.name === link.exitName)
    if (!exit) return // The native resolver ignores links to missing exits.
    const from = cellPaths.get(cellKey(link.row, link.col))!,
      to = cellPaths.get(cellKey(exit.row, exit.col))!
    for (const operation of ['enter', 'exit'] as const) {
      const copies = operation === 'enter' ? link.blockPath : [...link.blockPath].reverse()
      let path = operation === 'enter' ? from : to
      const edges: string[] = []
      copies.forEach((copy, step) => {
        const target =
          step === copies.length - 1
            ? operation === 'enter'
              ? to
              : from
            : `helper-${index}-${operation}-${step}`
        if (step < copies.length - 1)
          paths.push({ id: target, label: target, color: def.colors.path, helper: true })
        const id = `link-${index}-${operation}-${step}`
        add(id, path, target, operation, copy)
        edges.push(id)
        path = target
      })
      moves.push({
        edges,
        row: operation === 'enter' ? link.row : exit.row,
        col: operation === 'enter' ? link.col : exit.col,
        direction: operation === 'enter' ? opposite(exit.direction) : exit.direction,
        operation,
      })
    }
  })
  for (const [key, steps] of normal)
    for (const step of steps) {
      const from = cellPaths.get(key),
        to = cellPaths.get(step.to)
      if (!from || !to || from === to) continue
      const id = `walk-${key}-${step.direction}`
      add(id, from, to, 'walk')
      const [row, col] = key.split(',').map(Number)
      moves.push({ edges: [id], row, col, direction: step.direction, operation: 'walk' })
    }
  let goals: PathState[]
  if (def.trophies.length)
    goals = [
      ...new Set(def.trophies.map((point) => cellPaths.get(cellKey(point.row, point.col))!)),
    ].map((path) => ({ path, address: [] }))
  else {
    paths.push({ id: 'finish', label: 'Finish', color: def.colors.path, helper: true })
    goals = [{ path: 'finish', address: [] }]
    def.exits.forEach((exit) => {
      const id = `finish-${exit.name}`
      add(id, cellPaths.get(cellKey(exit.row, exit.col))!, 'finish', 'walk')
      moves.push({
        edges: [id],
        row: exit.row,
        col: exit.col,
        direction: exit.direction,
        operation: 'walk',
      })
    })
  }
  return {
    cellPaths,
    cells,
    moves,
    model: {
      type: 'pathPushdown',
      paths,
      copies: def.blocks.map((block) => block.name),
      connections,
      start: { path: cellPaths.get(cellKey(def.player.row, def.player.col))!, address: [] },
      goal: goals[0] ?? null,
      alternateGoals: goals.slice(1),
      allowedRule: 'finite',
      claims: [],
      review: 'reviewed',
      notes: [
        'Connected corridors are one PDA state. Copy entry pushes its name; copy exit pops it. Geometry determines where the next transition occurs.',
      ],
    },
  }
}

export function squarePathState(binding: SquarePDA, position: PlayerPosition): PathState {
  return {
    path: binding.cellPaths.get(cellKey(position.row, position.col)) ?? 'finish',
    address: position.blockStack.slice(1),
  }
}

/** Use the same PDA stack operation as source play, retaining the grid position for rendering. */
export function advanceSquarePDA(binding: SquarePDA, action: PlayerAction): PathState {
  const start = squarePathState(binding, action.from),
    end = squarePathState(binding, action.to)
  if (sameState(start, end)) return end
  if (end.path === 'finish' && reachesGoal(binding.model, start)) return start
  const operation =
    action.type === 'enterBlock' ? 'enter' : action.type === 'exitBlock' ? 'exit' : 'walk'
  for (const move of binding.moves.filter(
    (move) =>
      move.row === action.from.row &&
      move.col === action.from.col &&
      move.direction === action.direction &&
      move.operation === operation
  )) {
    let state: PathState | null = start
    for (const id of move.edges)
      state =
        state && applyConnection(state, binding.model.connections.find((edge) => edge.id === id)!)
    if (state && sameState(state, end)) return state
  }
  throw new Error('Corridor movement does not match its PDA transition.')
}

/** Expand a simplified solution back into actual legal grid steps, including multi-copy links. */
export function squareActionsFromPDA(
  def: SquareRecursiveDefinition,
  binding: SquarePDA,
  route: PathRoute
): PlayerAction[] {
  let position: PlayerPosition = { blockStack: ['0'], row: def.player.row, col: def.player.col }
  const actions: PlayerAction[] = []
  const step = (direction: DirectionBit) => {
    const result = resolveMove(def, position, direction, Date.now())
    if (!result) throw new Error('PDA solution has no matching corridor move.')
    actions.push({ ...result.action, timestamp: (actions.length + 1) * 150 })
    position = result.newPos
  }
  for (let i = 0; i < route.edges.length; ) {
    const move = binding.moves.find((move) =>
      move.edges.every((edge, index) => route.edges[i + index] === edge)
    )
    if (!move) throw new Error('PDA solution contains an incomplete copy transition.')
    for (const direction of corridorDirections(def, position, move.row, move.col)) step(direction)
    step(move.direction)
    i += move.edges.length
  }
  if (def.trophies.length && position.blockStack.length === 1) {
    const trophy = def.trophies.find(
      (trophy) =>
        binding.cellPaths.get(cellKey(trophy.row, trophy.col)) ===
        squarePathState(binding, position).path
    )!
    for (const direction of corridorDirections(def, position, trophy.row, trophy.col))
      step(direction)
  }
  if (
    !def.trophies.length &&
    position.blockStack.length === 1 &&
    position.row >= 0 &&
    position.col >= 0 &&
    position.row < def.grid.rows &&
    position.col < def.grid.cols
  ) {
    const path = squarePathState(binding, position).path
    const exit = def.exits.find(
      (exit) => binding.cellPaths.get(cellKey(exit.row, exit.col)) === path
    )!
    for (const direction of corridorDirections(def, position, exit.row, exit.col)) step(direction)
    step(exit.direction)
  }
  return actions
}

function corridorDirections(
  def: SquareRecursiveDefinition,
  from: PlayerPosition,
  row: number,
  col: number
): DirectionBit[] {
  const queue = [from],
    seen = new Map<string, { from: string; direction: DirectionBit }>()
  const start = cellKey(from.row, from.col)
  seen.set(start, { from: '', direction: 8 })
  for (let i = 0; i < queue.length; i++) {
    const position = queue[i],
      key = cellKey(position.row, position.col)
    if (position.row === row && position.col === col) {
      const result: DirectionBit[] = []
      let cursor = key
      while (cursor !== start) {
        const parent = seen.get(cursor)!
        result.unshift(parent.direction)
        cursor = parent.from
      }
      return result
    }
    for (const direction of directions) {
      const next = resolveMove(def, position, direction, Date.now())
      if (
        !next ||
        next.action.type === 'enterBlock' ||
        next.action.type === 'exitBlock' ||
        next.newPos.row < 0 ||
        next.newPos.col < 0 ||
        next.newPos.row >= def.grid.rows ||
        next.newPos.col >= def.grid.cols
      )
        continue
      const target = cellKey(next.newPos.row, next.newPos.col)
      if (!seen.has(target)) {
        seen.set(target, { from: key, direction })
        queue.push(next.newPos)
      }
    }
  }
  throw new Error('PDA corridor is disconnected in the grid.')
}

/** Port identities give an auditable mapping; a family name alone does not establish equivalence. */
export function alignAlicePDA(
  def: SquareRecursiveDefinition,
  binding: SquarePDA,
  source: PathMazeDefinition
): SquarePDA | null {
  if (def.trophies.length || source.allowedRule !== 'finite' || source.start?.address.length !== 0)
    return null
  const mapping = new Map<string, string>(),
    ids = new Map<string, string>()
  for (const [index, link] of def.links.entries()) {
    if (link.blockPath.length !== 1) return null
    for (const operation of ['enter', 'exit'] as const) {
      const original = binding.model.connections.find(
        (edge) => edge.id === `link-${index}-${operation}-0`
      )!
      const edge = source.connections.find(
        (edge) => edge.id === `${link.blockPath[0]}-${Number(link.exitName) - 1}-${operation}`
      )
      if (!edge || edge.operation !== operation || edge.copy !== link.blockPath[0]) return null
      for (const [from, to] of [
        [original.from, edge.from],
        [original.to, edge.to],
      ]) {
        if (mapping.has(from) && mapping.get(from) !== to) return null
        mapping.set(from, to)
      }
      ids.set(original.id, edge.id)
    }
  }
  if (
    mapping.size !== binding.cells.size ||
    new Set(mapping.values()).size !== source.paths.length ||
    mapping.get(binding.model.start!.path) !== source.start!.path ||
    ids.size !== source.connections.length
  )
    return null
  const goals = [source.goal, ...(source.alternateGoals ?? [])]
  const exits = new Set(
    def.exits.map((exit) => mapping.get(binding.cellPaths.get(cellKey(exit.row, exit.col))!))
  )
  if (
    goals.some((goal) => !goal || goal.address.length || !exits.has(goal.path)) ||
    new Set(goals.map((goal) => goal!.path)).size !== exits.size
  )
    return null
  const cellPaths = new Map(
    [...binding.cellPaths].map(([cell, path]) => [cell, mapping.get(path)!])
  )
  const cells = new Map([...binding.cells].map(([path, cells]) => [mapping.get(path)!, cells]))
  // Source acceptance is the whole surface corridor leading to a numbered exit.
  // The grid still completes the visible outward step before reporting victory.
  return {
    model: source,
    cellPaths,
    cells,
    moves: binding.moves
      .filter((move) => move.operation !== 'walk')
      .map((move) => ({ ...move, edges: move.edges.map((id) => ids.get(id)!) })),
  }
}
