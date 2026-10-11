import { describe, it, expect } from 'vitest'
import type {
  RecursiveMazeDocument,
  RenderConfig,
  SolverConfig,
  PlayerPosition,
  ValidationResult,
} from '../core'

describe('Core contracts', () => {
  it('RecursiveMazeDocument type is importable', () => {
    const doc: RecursiveMazeDocument = {
      formatVersion: '1.0',
      metadata: {
        id: 'test-id',
        title: 'Test Maze',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      representationType: 'squareRecursive',
      definition: {
        type: 'squareRecursive',
        tileSize: 32,
        colors: { outside: '#000', background: '#fff', path: '#ccc', line: '#f00' },
        grid: { rows: 5, cols: 5, cells: new Array(25).fill(0) },
        blocks: [],
        links: [],
        exits: [],
        teleporters: [],
        player: { row: 0, col: 0, color: '#00f' },
        trophies: [],
      },
      renderConfig: {
        preferredRenderer: 'auto',
        maxDepth: 3,
        showBreadcrumbs: true,
        showBlockLabels: true,
        animationSpeed: 'normal',
      },
      solverConfig: {
        maxDepth: 10,
        maxNodes: 100000,
        timeoutMs: 30000,
        strategy: 'bfs',
      },
      annotations: [],
    }
    expect(doc.formatVersion).toBe('1.0')
    expect(doc.representationType).toBe('squareRecursive')
  })

  it('PlayerPosition type is importable', () => {
    const pos: PlayerPosition = { blockStack: ['0'], row: 2, col: 3 }
    expect(pos.blockStack).toEqual(['0'])
  })

  it('ValidationResult type is importable', () => {
    const result: ValidationResult = { valid: true, issues: [] }
    expect(result.valid).toBe(true)
  })

  it('catalog.json is loadable', async () => {
    const catalog = await import('../data/manifests/catalog.json')
    expect(Array.isArray(catalog.default)).toBe(true)
    expect(catalog.default.length).toBe(9)
    expect(catalog.default[0].id).toBe('alice-in-wonderland')
  })

  it('RenderConfig has expected defaults', () => {
    const cfg: RenderConfig = {
      preferredRenderer: 'canvas',
      maxDepth: 5,
      showBreadcrumbs: false,
      showBlockLabels: false,
      animationSpeed: 'fast',
    }
    expect(cfg.maxDepth).toBe(5)
  })

  it('SolverConfig strategy is a valid value', () => {
    const cfg: SolverConfig = {
      maxDepth: 10,
      maxNodes: 1000,
      timeoutMs: 5000,
      strategy: 'iddfs',
    }
    expect(['bfs', 'dfs', 'astar', 'iddfs']).toContain(cfg.strategy)
  })
})
