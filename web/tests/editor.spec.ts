import { describe, expect, it } from 'vitest';

import {
  applyTransitionById,
  initialState,
  isGoal,
  legalTransitions,
  loadPortGraph,
} from '../src/logic-core/index';
import { compileEditorModel, parseConnectionInput, type EditorModel } from '../src/editor/model';
import { editorModelToBrowserPackage } from '../src/editor/to-browser-package';
import { emitEditorPackage } from '../src/editor/emit';

function tinyRecursiveModel(): EditorModel {
  const conn = (input: string) => {
    const parsed = parseConnectionInput(input);
    if (!parsed.ok) throw new Error(parsed.error);
    return parsed.connection!;
  };
  return {
    draftId: 'tiny',
    packageId: 'tiny_recursive',
    title: 'Tiny Recursive Editor Draft',
    junctions: ['p1', 'p2', 'p3'],
    submazes: ['A'],
    startJunction: 'p1',
    goalJunctions: ['p3'],
    connections: [
      conn('p1 → A.p1'),
      conn('A.p2 → p3'),
    ],
  };
}

describe('parseConnectionInput', () => {
  it('accepts arrow notation', () => {
    const result = parseConnectionInput('p1 → A.p2');
    expect(result.ok).toBe(true);
    expect(result.connection!.from.point).toBe('p1');
    expect(result.connection!.to.prefix).toEqual(['A']);
    expect(result.connection!.to.point).toBe('p2');
  });

  it('accepts dash-arrow notation', () => {
    const result = parseConnectionInput('B.B.A.p1 -> p4');
    expect(result.ok).toBe(true);
    expect(result.connection!.from.prefix).toEqual(['B', 'B', 'A']);
    expect(result.connection!.from.point).toBe('p1');
  });

  it('rejects malformed input', () => {
    const result = parseConnectionInput('not valid');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('compileEditorModel', () => {
  it('produces a graph with ports + transitions for each connection', () => {
    const model = tinyRecursiveModel();
    const { graph, warnings } = compileEditorModel(model, { lenient: true });
    expect(warnings).toEqual([]);
    expect(graph.transitions.length).toBe(2);
    expect(graph.ports.size).toBeGreaterThan(0);
  });

  it('flags warnings for undeclared submazes', () => {
    const model: EditorModel = {
      ...tinyRecursiveModel(),
      submazes: [], // drop A
    };
    const { warnings } = compileEditorModel(model, { lenient: true });
    expect(warnings.some((warning) => warning.includes('submaze'))).toBe(true);
  });
});

describe('editor to browser package + play', () => {
  it('produces a browser package that the runtime can load and execute', () => {
    const model = tinyRecursiveModel();
    const pkg = editorModelToBrowserPackage(model);
    const graph = loadPortGraph(pkg.logic);

    let state = initialState(graph);
    expect(isGoal(graph, state)).toBe(false);
    const legal = legalTransitions(graph, state);
    expect(legal.length).toBeGreaterThanOrEqual(1);
    const stepInto = legal.find((t) => t.target.point === 'p1' && t.target.prefix.length === 1);
    expect(stepInto).toBeDefined();
    const { next } = applyTransitionById(graph, state, stepInto!.id);
    state = next;
    expect(state.address.prefix).toEqual(['A']);
    expect(state.address.point).toBe('p1');
  });
});

describe('emitEditorPackage', () => {
  it('emits manifest with quoted title and logic with all sections', () => {
    const model = tinyRecursiveModel();
    const { manifest, logic } = emitEditorPackage(model);
    expect(manifest).toContain('format: fmaze-package-v0');
    expect(manifest).toContain('primary_authoring: port_graph');
    expect(logic).toContain('strategy: pda_stack');
    expect(logic).toContain('source_model: port_graph');
    expect(logic).toContain('start: p1');
    expect(logic).toMatch(/goals:\n\s*-\s*p3/);
    expect(logic).toContain('points:');
    expect(logic).toContain('submazes:');
    expect(logic).toContain('ports:');
    expect(logic).toContain('transitions:');
  });
});
