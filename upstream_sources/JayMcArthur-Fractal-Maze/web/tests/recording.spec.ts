import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  recordingFromHistory,
  recordedSolutionToYaml,
  stepsFromInlined,
} from '../src/runtime/solution';
import type { BrowserPackage, InlinedSolution } from '../src/packages/types';
import type { HistoryEntry } from '../src/runtime/store.svelte';
import type { Address } from '../src/logic-core/index';

const here = dirname(fileURLToPath(import.meta.url));
const browserRoot = resolve(here, '..', '..', 'packages', 'browser');

function loadFixture(packageId: string): BrowserPackage {
  return JSON.parse(readFileSync(resolve(browserRoot, `${packageId}.json`), 'utf-8')) as BrowserPackage;
}

const address = (point: string): Address => ({ prefix: [], point });

function makeEntry(transitionId: string, stepType: 'physical' | 'proof' = 'physical'): HistoryEntry {
  return {
    before: { address: address('p1'), activePort: null },
    after: { address: address('p2'), activePort: null },
    record: {
      stepType,
      input: 'x',
      source: address('p1'),
      target: address('p2'),
      transitionId,
      stackBefore: ['ROOT'],
      stackAfter: ['ROOT'],
    },
  };
}

describe('recording structure', () => {
  it('produces fmaze-solution-v0 envelope with steps in order', () => {
    const history: HistoryEntry[] = [makeEntry('t_one'), makeEntry('t_two'), makeEntry('t_three')];
    const recorded = recordingFromHistory(history, {
      mazeId: 'demo',
      recordingId: 'r1',
      expectsGoal: true,
    });
    expect(recorded.format).toBe('fmaze-solution-v0');
    expect(recorded.id).toBe('r1');
    expect(recorded.maze).toBe('demo');
    expect(recorded.expects_goal).toBe(true);
    expect(recorded.steps).toEqual([
      { transition_id: 't_one' },
      { transition_id: 't_two' },
      { transition_id: 't_three' },
    ]);
  });

  it('injects prove_edge_id before proof_edge_id when the edge was submitted', () => {
    const history: HistoryEntry[] = [
      makeEntry('pe_infinite_p1_to_p2', 'proof'),
    ];
    const recorded = recordingFromHistory(history, {
      mazeId: 'infinite_hop_1',
      recordingId: 'r1',
      expectsGoal: true,
      submittedProofs: new Set(['pe_infinite_p1_to_p2']),
    });
    expect(recorded.steps[0]).toEqual({ prove_edge_id: 'pe_infinite_p1_to_p2' });
    expect(recorded.steps[1]).toEqual({ proof_edge_id: 'pe_infinite_p1_to_p2' });
  });

  it('yaml emission matches the canonical packaged Skeptic Play #1 solution structure', () => {
    const pkg = loadFixture('skeptic_play_1');
    const known = pkg.solutions?.find((entry) => entry.id === 'known')!;
    const steps = stepsFromInlined(known);
    const synth: HistoryEntry[] = steps.map((step) => makeEntry(step.transition_id!));
    const recorded = recordingFromHistory(synth, {
      mazeId: pkg.id,
      recordingId: 'known_replay',
      logicHref: '../logic.yml',
      expectsGoal: true,
    });
    const yaml = recordedSolutionToYaml(recorded);
    expect(yaml).toContain('format: fmaze-solution-v0');
    expect(yaml).toContain('maze: skeptic_play_1');
    expect(yaml).toContain('expects_goal: true');
    expect(yaml.split('\n').filter((line) => line.startsWith('  - transition_id:')).length).toBe(
      steps.length,
    );
  });
});
