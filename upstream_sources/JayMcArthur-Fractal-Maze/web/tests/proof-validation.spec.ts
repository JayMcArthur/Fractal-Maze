import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  loadPortGraph,
  parseProofBody,
  validateProofBody,
  type ProofBody,
} from '../src/logic-core/index';
import { extractProofBodyFromLogic } from '../src/logic-core/proofs';
import type { BrowserPackage } from '../src/packages/types';

const here = dirname(fileURLToPath(import.meta.url));
const browserRoot = resolve(here, '..', '..', 'packages', 'browser');

function loadFixture(packageId: string): BrowserPackage {
  return JSON.parse(readFileSync(resolve(browserRoot, `${packageId}.json`), 'utf-8')) as BrowserPackage;
}

describe('infinite_hop_1 proof validation', () => {
  it('accepts the packaged proof body', () => {
    const pkg = loadFixture('infinite_hop_1');
    const graph = loadPortGraph(pkg.logic);
    const edge = graph.proofEdges.get('pe_infinite_p1_to_p2');
    expect(edge).toBeDefined();
    const raw = extractProofBodyFromLogic(pkg.logic, edge!.id);
    expect(raw).toBeDefined();
    const body = parseProofBody(raw!);
    const errors = validateProofBody(graph, edge!, body);
    expect(errors).toEqual([]);
  });

  it('rejects a single-obligation proof (needs at least two convergence steps)', () => {
    const pkg = loadFixture('infinite_hop_1');
    const graph = loadPortGraph(pkg.logic);
    const edge = graph.proofEdges.get('pe_infinite_p1_to_p2')!;
    const truncated: ProofBody = {
      method: 'simplified_infinite_hop',
      steps: [{ kind: 'physical', source: { prefix: [], point: 'p1' }, target: { prefix: ['mA'], point: 'p1' } }],
    };
    const errors = validateProofBody(graph, edge, truncated);
    expect(errors.some((message) => message.includes('at least two'))).toBe(true);
  });

  it('rejects obligations that diverge into different submaze prefixes', () => {
    const pkg = loadFixture('infinite_hop_1');
    const graph = loadPortGraph(pkg.logic);
    const edge = graph.proofEdges.get('pe_infinite_p1_to_p2')!;
    const divergent: ProofBody = {
      method: 'simplified_infinite_hop',
      steps: [
        { kind: 'physical', source: { prefix: [], point: 'p1' }, target: { prefix: ['mA'], point: 'p1' } },
        { kind: 'physical', source: { prefix: [], point: 'p2' }, target: { prefix: ['mB'], point: 'p2' } },
      ],
    };
    const errors = validateProofBody(graph, edge, divergent);
    expect(errors.some((message) => message.includes('converge'))).toBe(true);
  });
});

describe('cantor_proof_1 proof validation', () => {
  it('accepts the packaged Cantor proof body', () => {
    const pkg = loadFixture('cantor_proof_1');
    const graph = loadPortGraph(pkg.logic);
    const edge = graph.proofEdges.get('pe_cantor_p2_to_p3')!;
    const raw = extractProofBodyFromLogic(pkg.logic, edge.id);
    const body = parseProofBody(raw!);
    const errors = validateProofBody(graph, edge, body);
    expect(errors).toEqual([]);
  });

  it('rejects a Cantor proof with a missing physical step', () => {
    const pkg = loadFixture('cantor_proof_1');
    const graph = loadPortGraph(pkg.logic);
    const edge = graph.proofEdges.get('pe_cantor_p2_to_p3')!;
    const broken: ProofBody = {
      method: 'simplified_cantor_hop',
      steps: [
        { kind: 'physical', source: { prefix: [], point: 'p2' }, target: { prefix: [], point: 'p9' } },
        { kind: 'assumption', source: { prefix: ['mB'], point: 'p1' }, target: { prefix: ['mB'], point: 'p3' } },
        { kind: 'physical', source: { prefix: ['mB'], point: 'p3' }, target: { prefix: [], point: 'p3' } },
      ],
    };
    const errors = validateProofBody(graph, edge, broken);
    expect(errors.length).toBeGreaterThan(0);
  });
});
