/**
 * Import adapter for the Orelcosseron `.maze` text format.
 * Ported from MazeToJSON.tsx (Orelcosseron Next.js project) and maze.py (Python project).
 */
import type { ImportAdapter, ExportAdapter } from '../AdapterInterface'
import type { RecursiveMazeDocument } from '../../model/RecursiveMazeDocument'
import type {
  SquareRecursiveDefinition,
  TileBlock,
  TileLink,
  TileExit,
  Teleporter,
} from '../../model/squareRecursive'
import { defaultRenderConfig } from '../../model/renderConfig'
import { defaultSolverConfig } from '../../model/solverInterface'

/** Decode and validate the decimal tile grid separately from its named directives. */
function parseGrid(gridRows: string[]): SquareRecursiveDefinition['grid'] {
  if (gridRows.length === 0) {
    throw new Error('Orel maze does not contain a tile grid')
  }
  const rowWidths = new Set(gridRows.map((row) => row.length))
  if (rowWidths.size !== 1) {
    throw new Error('Orel maze grid rows must all have the same width')
  }
  const cells: number[] = []
  for (const row of gridRows) {
    for (let i = 0; i + 1 < row.length; i += 2) {
      cells.push(parseInt(row.slice(i, i + 2), 10))
    }
  }
  const rows = gridRows.length
  const cols = gridRows[0].length / 2

  const invalidCell = cells.find((cell) => !Number.isInteger(cell) || cell < 0 || cell > 15)
  if (invalidCell !== undefined) {
    throw new Error(`Orel tile bitmasks must be decimal values from 00 to 15; received ${invalidCell}`)
  }

  return { rows, cols, cells }
}

function parseMazeText(text: string, title = 'Imported Maze'): RecursiveMazeDocument {
  const lines = text.split('\n')

  let tileSize = 32
  let outsideColor = '#ffffff'
  let backgroundColor = '#ffffff'
  let pathColor = '#cccccc'
  let lineColor = '#ff0000'

  const gridRows: string[] = []
  const blocks: TileBlock[] = []
  const links: TileLink[] = []
  const exits: TileExit[] = []
  const teleporters: Teleporter[] = []
  let player = { row: 0, col: 0, color: '#0000ff' }
  const trophies: Array<{ row: number; col: number; color: string }> = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line[0] === '#') continue

    if (line.startsWith('TILE_SIZE')) {
      tileSize = parseInt(line.split(/\s+/)[1])
      continue
    }
    if (line.startsWith('OUTSIDE_COLOR')) {
      outsideColor = line.split(/\s+/)[1]
      continue
    }
    if (line.startsWith('BACKGROUND_COLOR')) {
      backgroundColor = line.split(/\s+/)[1]
      continue
    }
    if (line.startsWith('PATH_COLOR')) {
      pathColor = line.split(/\s+/)[1]
      continue
    }
    if (line.startsWith('LINE_COLOR')) {
      lineColor = line.split(/\s+/)[1]
      continue
    }
    if (line.startsWith('TELEPORT')) {
      // TELEPORT row col orientation+reach
      const parts = line.split(/\s+/)
      const row = parseInt(parts[1])
      const col = parseInt(parts[2])
      const spec = parts[3].split('+')
      const direction = parseInt(spec[0]) as 1 | 2 | 4 | 8
      const reach = parseInt(spec[1])
      teleporters.push({ row, col, direction, reach })
      continue
    }
    if (line.startsWith('BLOCK')) {
      // BLOCK name row col width height #color
      const parts = line.split(/\s+/)
      blocks.push({
        name: parts[1],
        row: parseInt(parts[2]),
        col: parseInt(parts[3]),
        width: parseInt(parts[4]),
        height: parseInt(parts[5]),
        color: parts[6] ?? '#ffffff',
      })
      continue
    }
    if (line.startsWith('LINK')) {
      // LINK block_name[+block_name...] exit_name row col
      const parts = line.split(/\s+/)
      const blockPath = parts[1].split('+')
      const exitName = parts[2]
      const row = parseInt(parts[3])
      const col = parseInt(parts[4])
      links.push({ row, col, blockPath, exitName })
      continue
    }
    if (line.startsWith('EXIT')) {
      // EXIT name orientation row col
      const parts = line.split(/\s+/)
      const name = parts[1]
      const direction = parseInt(parts[2]) as 1 | 2 | 4 | 8
      const row = parseInt(parts[3])
      const col = parseInt(parts[4])
      exits.push({ name, direction, row, col })
      continue
    }
    if (line.startsWith('PLAYER')) {
      // PLAYER row col #color
      const parts = line.split(/\s+/)
      player = { row: parseInt(parts[1]), col: parseInt(parts[2]), color: parts[3] ?? '#0000ff' }
      continue
    }
    if (line.startsWith('TROPHY')) {
      // TROPHY row col #color
      const parts = line.split(/\s+/)
      trophies.push({ row: parseInt(parts[1]), col: parseInt(parts[2]), color: parts[3] ?? '#ffff00' })
      continue
    }
    // Otherwise it's a grid row (pairs of decimal digits, each pair is a tile bitmask 0–15)
    if (/^[0-9]+$/.test(line) && line.length % 2 === 0) {
      gridRows.push(line)
    }
  }


  const definition: SquareRecursiveDefinition = {
    type: 'squareRecursive',
    tileSize,
    colors: {
      outside: outsideColor,
      background: backgroundColor,
      path: pathColor,
      line: lineColor,
    },
    grid: parseGrid(gridRows),
    blocks,
    links,
    exits,
    teleporters,
    player,
    trophies,
  }

  const now = new Date().toISOString()
  return {
    formatVersion: '1.0',
    metadata: {
      id: crypto.randomUUID(),
      title,
      tags: [],
      createdAt: now,
      updatedAt: now,
    },
    representationType: 'squareRecursive',
    definition,
    renderConfig: { ...defaultRenderConfig },
    solverConfig: { ...defaultSolverConfig },
    annotations: [],
  }
}

export const orelMazeImportAdapter: ImportAdapter = {
  formatName: 'Orelcosseron .maze',
  fileExtensions: ['.maze'],

  canImport(raw: string | object): boolean {
    if (typeof raw !== 'string') return false
    // A .maze file contains decimal tile pairs and/or known directives.
    return (
      raw.includes('TILE_SIZE') ||
      raw.includes('OUTSIDE_COLOR') ||
      /(?:^|\n)[0-9]{4,}(?:\r?\n|$)/.test(raw)
    )
  },

  import(raw: string | object): RecursiveMazeDocument {
    if (typeof raw !== 'string') throw new Error('Expected string input for .maze format')
    return parseMazeText(raw)
  },
}

/** Export a SquareRecursiveDefinition back to Orel .maze text format */
export const orelMazeExportAdapter: ExportAdapter = {
  formatName: 'Orelcosseron .maze',
  fileExtension: '.maze',

  export(doc: RecursiveMazeDocument): string {
    if (doc.representationType !== 'squareRecursive') {
      throw new Error('Orel .maze format only supports squareRecursive mazes')
    }
    const def = doc.definition as SquareRecursiveDefinition
    const lines: string[] = []

    lines.push(`# ${doc.metadata.title}`)
    lines.push('')
    lines.push(`OUTSIDE_COLOR ${def.colors.outside}`)
    lines.push(`BACKGROUND_COLOR ${def.colors.background}`)
    lines.push(`PATH_COLOR ${def.colors.path}`)
    lines.push(`LINE_COLOR ${def.colors.line}`)
    lines.push('')
    lines.push(`TILE_SIZE ${def.tileSize}`)
    lines.push('')

    // Grid rows
    const { rows, cols, cells } = def.grid
    for (let r = 0; r < rows; r++) {
      let row = ''
      for (let c = 0; c < cols; c++) {
        row += cells[r * cols + c].toString(10).padStart(2, '0')
      }
      lines.push(row)
    }
    lines.push('')

    // Teleporters
    for (const t of def.teleporters) {
      lines.push(
        `TELEPORT ${String(t.row).padStart(2, '0')} ${String(t.col).padStart(2, '0')} ${t.direction}+${t.reach}`
      )
    }
    lines.push('')

    // Player
    lines.push(
      `PLAYER ${String(def.player.row).padStart(2, '0')} ${String(def.player.col).padStart(2, '0')} ${def.player.color}`
    )
    lines.push('')

    // Trophies
    for (const t of def.trophies) {
      lines.push(
        `TROPHY ${String(t.row).padStart(2, '0')} ${String(t.col).padStart(2, '0')} ${t.color}`
      )
    }
    lines.push('')

    // Exits
    for (const e of def.exits) {
      lines.push(
        `EXIT ${e.name} ${e.direction} ${String(e.row).padStart(2, '0')} ${String(e.col).padStart(2, '0')}`
      )
    }
    lines.push('')

    // Blocks
    for (const b of def.blocks) {
      lines.push(
        `BLOCK ${b.name} ${String(b.row).padStart(2, '0')} ${String(b.col).padStart(2, '0')} ${b.width} ${b.height} ${b.color}`
      )
    }
    lines.push('')

    // Links
    for (const l of def.links) {
      lines.push(
        `LINK ${l.blockPath.join('+')} ${l.exitName} ${String(l.row).padStart(2, '0')} ${String(l.col).padStart(2, '0')}`
      )
    }

    return lines.join('\n')
  },
}
