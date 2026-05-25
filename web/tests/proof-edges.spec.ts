import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { loadPortGraph } from '../src/logic-core/index';
import type { BrowserPackage } from '../src/packages/types';

const here = dirname(fileURLToPath(import.meta.url));
const browserRoot = resolve(here, '..', '..', 'packages', 'browser');

function loadFixture(packageId: string): BrowserPackage {
  return JSON.parse(readFileSync(resolve(browserRoot, `${packageId}.json`), 'utf-8')) as BrowserPackage;
}

describe('proof edge surfacing', () => {
  it('infinite_hop_1 exposes one infinite_hop proof edge with status "proved"', () => {
    const pkg = loadFixture('infinite_hop_1');
    const graph = loadPortGraph(pkg.logic);
    const edges = [...graph.proofEdges.values()];
    expect(edges.length).toBe(1);
    const edge = edges[0];
    expect(edge.proofType).toBe('infinite_hop');
    expect(edge.status).toBe('proved');
    expect(edge.enabledByDefault).toBe(false);
    expect(edge.source.point).toBe('p1');
    expect(edge.target.point).toBe('p2');
  });

  it('cantor_proof_1 exposes one cantor_hop proof edge', () => {
    const pkg = loadFixture('cantor_proof_1');
    const graph = loadPortGraph(pkg.logic);
    const edges = [...graph.proofEdges.values()];
    expect(edges.length).toBe(1);
    const edge = edges[0];
    expect(edge.proofType).toBe('cantor_hop');
    expect(edge.status).toBe('proved');
    expect(edge.enabledByDefault).toBe(false);
    expect(edge.source.point).toBe('p2');
    expect(edge.target.point).toBe('p3');
  });

  it('skeptic_play_1 has no proof edges', () => {
    const pkg = loadFixture('skeptic_play_1');
    const graph = loadPortGraph(pkg.logic);
    expect(graph.proofEdges.size).toBe(0);
  });
});
