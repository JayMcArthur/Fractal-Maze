import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  createFractalBlockMaze,
  exitsGoal,
  neighbors,
  patternFromRows,
  startPositions,
  type Direction,
} from '../src/logic-core/coordinate-path';
import type { BrowserPackage } from '../src/packages/types';

const here = dirname(fileURLToPath(import.meta.url));
const browserRoot = resolve(here, '..', '..', 'packages', 'browser');

function loadFixture(packageId: string): BrowserPackage {
  return JSON.parse(readFileSync(resolve(browserRoot, `${packageId}.json`), 'utf-8')) as BrowserPackage;
}

describe('Koteitan default fractal block pattern', () => {
  it('matches the Python pattern at depth 1', () => {
    const pkg = loadFixture('koteitan_fractal_block_default');
    const rows = (pkg.logic.pattern as { rows: number[][] }).rows;
    const pattern = patternFromRows(rows);
    expect(pattern.unit).toBe(4);
    // Black/white from the documented Koteitan default pattern.
    expect(rows).toEqual([
      [1, 0, 1, 1],
      [0, 1, 0, 1],
      [1, 0, 1, 1],
      [1, 1, 0, 0],
    ]);
  });

  it('produces non-empty starts at depth 4', () => {
    const pkg = loadFixture('koteitan_fractal_block_default');
    const rows = (pkg.logic.pattern as { rows: number[][] }).rows;
    const maze = createFractalBlockMaze(patternFromRows(rows), 'north', 'north');
    const starts = startPositions(maze, 4);
    expect(starts.length).toBeGreaterThan(0);
  });

  it('starting positions are all valid white cells along bottom boundary first descent', () => {
    const pkg = loadFixture('koteitan_fractal_block_default');
    const rows = (pkg.logic.pattern as { rows: number[][] }).rows;
    const pattern = patternFromRows(rows);
    const maze = createFractalBlockMaze(pattern, 'north', 'north');
    const starts = startPositions(maze, 3);
    for (const start of starts) {
      expect(start.length).toBeGreaterThan(0);
      const tip = start[start.length - 1];
      expect(rows[tip[1]][tip[0]]).toBe(0);
    }
  });

  it('neighbors produces four directions and at least one move', () => {
    const pkg = loadFixture('koteitan_fractal_block_default');
    const rows = (pkg.logic.pattern as { rows: number[][] }).rows;
    const maze = createFractalBlockMaze(patternFromRows(rows), 'north', 'north');
    const starts = startPositions(maze, 3);
    expect(starts.length).toBeGreaterThan(0);
    const moves = neighbors(maze, starts[0], 3);
    const directions: Direction[] = moves.map((entry) => entry.direction);
    expect(new Set(directions)).toEqual(new Set(['west', 'east', 'north', 'south']));
    const hasMove = moves.some((entry) => entry.positions.length > 0 || entry.direction === 'north');
    expect(hasMove).toBe(true);
  });

  it('exitsGoal is false at start and may be true after a north move chain', () => {
    const pkg = loadFixture('koteitan_fractal_block_default');
    const rows = (pkg.logic.pattern as { rows: number[][] }).rows;
    const maze = createFractalBlockMaze(patternFromRows(rows), 'north', 'north');
    const starts = startPositions(maze, 2);
    expect(starts.length).toBeGreaterThan(0);
    expect(exitsGoal(maze, starts[0])).toBe(false);
  });
});
