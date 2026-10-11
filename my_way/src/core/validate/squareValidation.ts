import type { SquareRecursiveDefinition } from '../model/squareRecursive'
import type { ValidationIssue } from './ValidationResult'

function validateGrid(def: SquareRecursiveDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const { rows, cols, cells } = def.grid
  if (
    !Number.isInteger(rows) ||
    !Number.isInteger(cols) ||
    rows <= 0 ||
    cols <= 0 ||
    !Number.isFinite(def.tileSize) ||
    def.tileSize <= 0
  )
    issues.push({
      severity: 'error',
      code: 'INVALID_GRID_DIMENSIONS',
      message: 'Grid dimensions and tile size must be positive',
    })
  if (cells.length !== rows * cols) {
    issues.push({
      severity: 'error',
      code: 'GRID_SIZE_MISMATCH',
      message: `Grid cells length ${cells.length} does not match rows*cols (${rows}*${cols}=${rows * cols})`,
      location: 'grid',
    })
  }

  for (let i = 0; i < cells.length; i++) {
    if (!Number.isInteger(cells[i]) || cells[i] < 0 || cells[i] > 0x0f) {
      issues.push({
        severity: 'error',
        code: 'INVALID_TILE_BITMASK',
        message: `Tile at index ${i} has invalid bitmask value ${cells[i]} (expected 0–15)`,
        location: `grid.cells[${i}]`,
      })
    }
  }
  return issues
}

function validatePositions(def: SquareRecursiveDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const { rows, cols } = def.grid
  const inBounds = (row: number, col: number) =>
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    col >= 0 &&
    row < rows &&
    col < cols
  for (const block of def.blocks)
    if (
      !inBounds(block.row, block.col) ||
      !Number.isInteger(block.width) ||
      !Number.isInteger(block.height) ||
      block.width <= 0 ||
      block.height <= 0 ||
      block.col + block.width > cols ||
      block.row + block.height > rows
    )
      issues.push({
        severity: 'error',
        code: 'BLOCK_BOUNDS',
        message: `Block ${block.name} lies outside the grid`,
      })
  for (const point of [def.player, ...def.trophies, ...def.links, ...def.exits, ...def.teleporters])
    if (!inBounds(point.row, point.col))
      issues.push({
        severity: 'error',
        code: 'SQUARE_POINT_BOUNDS',
        message: `Position (${point.row}, ${point.col}) lies outside the grid`,
      })
  return issues
}

export function validateSquareRecursive(def: SquareRecursiveDefinition): ValidationIssue[] {
  const issues = [...validateGrid(def), ...validatePositions(def)]
  const blockNames = new Set(def.blocks.map((b) => b.name))

  const seen = new Set<string>()
  for (const b of def.blocks) {
    if (seen.has(b.name)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_BLOCK_NAME',
        message: `Duplicate block name: "${b.name}"`,
        location: `blocks[${b.name}]`,
      })
    }
    seen.add(b.name)
  }

  const exitNames = new Set<string>()
  for (const e of def.exits) {
    if (exitNames.has(e.name)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_EXIT_NAME',
        message: `Duplicate exit name: "${e.name}"`,
        location: `exits[${e.name}]`,
      })
    }
    exitNames.add(e.name)
  }

  for (let i = 0; i < def.links.length; i++) {
    const link = def.links[i]
    for (const blockName of link.blockPath) {
      if (!blockNames.has(blockName)) {
        issues.push({
          severity: 'error',
          code: 'INVALID_LINK_BLOCK',
          message: `Link at (${link.row},${link.col}) references unknown block "${blockName}"`,
          location: `links[${i}]`,
        })
      }
    }
    if (!exitNames.has(link.exitName)) {
      issues.push({
        severity: 'warning',
        code: 'INVALID_LINK_EXIT',
        message: `Link at (${link.row},${link.col}) references unknown exit "${link.exitName}"`,
        location: `links[${i}]`,
      })
    }
  }

  if (def.exits.length === 0 && def.trophies.length === 0) {
    issues.push({
      severity: 'warning',
      code: 'NO_WIN_CONDITION',
      message: 'Maze has no exits and no trophies — no win condition defined',
    })
  }

  return issues
}
