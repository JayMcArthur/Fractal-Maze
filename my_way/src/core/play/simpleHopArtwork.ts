import type { MazeArtwork, PathMazeDefinition } from '../model/pathMaze'

type Door = { copy: string; parent: string; child: string; point: [number, number] }

function matchesDoors(model: PathMazeDefinition, doors: Door[]): boolean {
  return model.connections.length === doors.length * 2 && doors.every(door =>
    (['enter', 'exit'] as const).every(operation => model.connections.filter(edge =>
      edge.copy === door.copy && edge.operation === operation &&
      edge.from === (operation === 'enter' ? door.parent : door.child) &&
      edge.to === (operation === 'enter' ? door.child : door.parent)).length === 1))
}

/** The small proof examples have disjoint corridors around their actual copy doors. */
export function simpleHopArtwork(model: PathMazeDefinition): MazeArtwork | null {
  if (!model.start || !model.goal) return null
  if ([model.start, model.goal].some(state => state.address.length > 0) || model.alternateGoals?.length)
    return null
  const nested = model.paths.length === 3 && model.copies.length === 2
  if (!(nested || (model.paths.length === 2 && model.copies.length === 1))) return null
  const first = model.start.path, last = model.goal.path
  if (first === last) return null
  const middle = nested ? model.paths.find(path => path.id !== first && path.id !== last)!.id : last
  const a = model.copies.find(copy => model.connections.some(edge => edge.operation === 'enter' && edge.copy === copy && edge.from === first && edge.to === first))
  if (!a) return null
  const b = model.copies.find(copy => copy !== a)
  const doors = [
    { copy: a, parent: first, child: first, point: [3, 5.5] as [number, number] },
    { copy: a, parent: middle, child: middle, point: (nested ? [4.5, 7] : [6, 5.5]) as [number, number] },
    ...(nested ? [
      { copy: b!, parent: middle, child: first, point: [8, 5.5] as [number, number] },
      { copy: b!, parent: last, child: last, point: [11, 5.5] as [number, number] },
    ] : []),
  ]
  if (!matchesDoors(model, doors)) return null
  const width = nested ? 13 : 9
  const outside = new Map<string, [number, number]>([
    [first, [0, 4.5]], [middle, nested ? [6.5, 9] : [9, 4.5]],
    ...(nested ? [[last, [13, 4.5]] as [string, [number, number]]] : []),
  ])
  return {
    asset: '', blockSize: 1, width, height: 9, bounds: [0, 0, width, 9], traces: hopTraces(model, nested, first, middle, last),
    frames: [{ id: a, x: 3, y: 4, width: 3, height: 3 },
      ...(nested ? [{ id: b!, x: 8, y: 4, width: 3, height: 3 }] : [])],
    gates: hopGates(model, doors, outside),
    start: [2.5, .5], goal: [nested ? 12.5 : 6.5, .5],
  }
}

function hopTraces(model: PathMazeDefinition, nested: boolean, first: string, middle: string, last: string): MazeArtwork['traces'] {
  const traces: MazeArtwork['traces'] = [
    { id: 'first', path: first, color: model.paths.find(path => path.id === first)!.color,
      points: [[2.5, .5], [2.5, 2.5], [2.5, 5.5], [3, 5.5]] },
    { id: 'first-exit', path: first, color: '#eab350', points: [[0, 4.5], [2.5, 4.5]] },
    { id: 'middle', path: middle, color: model.paths.find(path => path.id === middle)!.color,
      points: nested
        ? [[6.5, .5], [6.5, 7.5], [4.5, 7.5], [4.5, 7]]
        : [[6.5, .5], [6.5, 5.5], [6, 5.5]] },
  ]
  if (nested) traces.push(
    { id: 'middle-b', path: middle, color: '#eab350', points: [[6.5, 5.5], [8, 5.5]] },
    { id: 'middle-exit', path: middle, color: '#eab350', points: [[6.5, 7.5], [6.5, 9]] },
    { id: 'last', path: last, color: model.paths.find(path => path.id === last)!.color,
      points: [[12.5, .5], [12.5, 2.5], [12.5, 5.5], [11, 5.5]] },
    { id: 'last-exit', path: last, color: '#eab350', points: [[12.5, 4.5], [13, 4.5]] },
  )
  else traces.push({ id: 'middle-exit', path: middle, color: '#eab350', points: [[6.5, 4.5], [9, 4.5]] })
  return traces
}

function hopGates(model: PathMazeDefinition, doors: Door[], outside: Map<string, [number, number]>): MazeArtwork['gates'] {
  return model.connections.map(edge => {
      const door = doors.find(door => door.copy === edge.copy && (edge.operation === 'enter' ? door.parent === edge.from : door.child === edge.from))!
      return edge.operation === 'enter'
        ? { edge: edge.id, from: door.point, to: outside.get(door.child)! }
        : { edge: edge.id, from: outside.get(door.child)!, to: door.point }
    })
}
