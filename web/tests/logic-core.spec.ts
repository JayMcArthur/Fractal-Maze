import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  applyTransitionById,
  formatAddress,
  initialState,
  isGoal,
  loadPortGraph,
  parseAddress,
} from '../src/logic-core/index';
import type { BrowserPackage } from '../src/packages/types';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const browserRoot = resolve(repoRoot, 'packages', 'browser');

function loadFixture(packageId: string): BrowserPackage {
  const text = readFileSync(resolve(browserRoot, `${packageId}.json`), 'utf-8');
  return JSON.parse(text) as BrowserPackage;
}

describe('parseAddress / formatAddress', () => {
  it('handles root point', () => {
    const address = parseAddress('p1');
    expect(address.point).toBe('p1');
    expect(address.prefix).toEqual([]);
    expect(formatAddress(address)).toBe('p1');
  });

  it('round-trips nested address', () => {
    const address = parseAddress('B.B.A.p1');
    expect(address.point).toBe('p1');
    expect(address.prefix).toEqual(['B', 'B', 'A']);
    expect(formatAddress(address)).toBe('B.B.A.p1');
  });
});

describe('Skeptic Play #1 logic core parity', () => {
  it('reaches goal by replaying known solution', () => {
    const pkg = loadFixture('skeptic_play_1');
    const graph = loadPortGraph(pkg.logic);
    let state = initialState(graph);
    const solution = pkg.solutions?.find((entry) => entry.id === 'known');
    expect(solution).toBeDefined();

    for (const step of solution!.steps) {
      if (!('transition_id' in step)) continue;
      const { next } = applyTransitionById(graph, state, step.transition_id);
      state = next;
    }

    expect(isGoal(graph, state)).toBe(true);
    expect(state.address.point).toBe('p2');
    expect(state.address.prefix).toEqual([]);
  });

  it('legal transitions from start match port-selected expectations', () => {
    const pkg = loadFixture('skeptic_play_1');
    const graph = loadPortGraph(pkg.logic);
    const state = initialState(graph);
    const startTransitions = graph.transitions.filter(
      (transition) => transition.source.point === state.address.point && transition.source.prefix.length === 0,
    );
    expect(startTransitions.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Wolfram #2 port disambiguation', () => {
  it('preserves the two p3 / label "7" ports as separate transitions', () => {
    const pkg = loadFixture('wolfram_2');
    const graph = loadPortGraph(pkg.logic);
    const ports = [...graph.ports.values()].filter(
      (port) => port.point === 'p3' && port.label === '7',
    );
    expect(ports.length).toBe(2);
    const contexts = new Set(ports.map((port) => port.context.join('.')));
    expect(contexts.has('')).toBe(true);
    expect(contexts.has('mA')).toBe(true);
  });
});
