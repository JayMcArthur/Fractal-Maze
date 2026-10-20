// Borrowing: Orel tile bitmask, BLOCK/LINK/EXIT/TELEPORT model

export type DirectionBit = 1 | 2 | 4 | 8 // W=1 | S=2 | E=4 | N=8
export type TileBitmask = number // 0x00–0x0F

export interface TileGrid {
  rows: number
  cols: number
  cells: TileBitmask[] // row-major flat array
}

export interface TileBlock {
  name: string
  row: number
  col: number
  width: number
  height: number
  color: string
}

export interface TileLink {
  row: number
  col: number
  blockPath: string[] // ['A'] or ['A','B'] for nested
  exitName: string
}

export interface TileExit {
  name: string
  direction: DirectionBit
  row: number
  col: number
}

export interface Teleporter {
  row: number
  col: number
  direction: DirectionBit
  reach: number
}

export interface SquareRecursiveDefinition {
  type: 'squareRecursive'
  tileSize: number
  colors: { outside: string; background: string; path: string; line: string }
  grid: TileGrid
  blocks: TileBlock[]
  links: TileLink[]
  exits: TileExit[]
  teleporters: Teleporter[]
  player: { row: number; col: number; color: string }
  trophies: Array<{ row: number; col: number; color: string }>
}
