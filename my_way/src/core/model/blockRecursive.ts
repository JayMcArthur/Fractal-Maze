// Borrowing: koteitan fractalblockmaze multi-depth position, bit grid

export interface BlockProvidedRoute {
  depth: number
  states: number[]
}

export interface BlockRecursiveDefinition {
  type: 'blockRecursive'
  providedRoute?: BlockProvidedRoute
  unit: number // e.g. 4 for 4×4 base pattern
  pattern: number[] // flat bitmask, 1=wall 0=path
  start: [number, number] | null // [x, y] in base grid
  goal: [number, number] | null
}
