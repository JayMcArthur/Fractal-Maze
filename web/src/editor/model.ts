import { formatAddress, parseAddress } from '@logic-core/address';
import type { Address, PortGraph } from '@logic-core/index';

export interface EditorConnection {
  id: string;
  from: Address;
  to: Address;
  label?: string;
}

export interface EditorModel {
  draftId: string;
  packageId: string;
  title: string;
  junctions: string[];
  submazes: string[];
  startJunction: string;
  goalJunctions: string[];
  connections: EditorConnection[];
}

export function emptyEditorModel(draftId: string): EditorModel {
  return {
    draftId,
    packageId: 'my_new_maze',
    title: 'My New Maze',
    junctions: ['p1', 'p2'],
    submazes: ['A'],
    startJunction: 'p1',
    goalJunctions: ['p2'],
    connections: [],
  };
}

export interface ParseConnectionResult {
  ok: boolean;
  connection?: EditorConnection;
  error?: string;
}

const CONNECTION_PATTERN = /^\s*([^\s→>-]+)\s*(?:→|->)\s*([^\s→>-]+)\s*$/;

export function parseConnectionInput(input: string, idPrefix = 't'): ParseConnectionResult {
  const match = CONNECTION_PATTERN.exec(input);
  if (!match) {
    return {
      ok: false,
      error: 'expected format "p1 → A.p2" (or "p1 -> A.p2")',
    };
  }
  try {
    const from = parseAddress(match[1]);
    const to = parseAddress(match[2]);
    const id = `${idPrefix}_${formatAddress(from).replace(/\./g, '_')}_to_${formatAddress(to).replace(/\./g, '_')}`;
    return {
      ok: true,
      connection: { id, from, to },
    };
  } catch (exc) {
    return {
      ok: false,
      error: exc instanceof Error ? exc.message : String(exc),
    };
  }
}

export interface CompileResult {
  graph: PortGraph;
  warnings: string[];
}

interface BuildOptions {
  /** When set, missing junctions become warnings rather than throwing. */
  lenient?: boolean;
}

export function compileEditorModel(model: EditorModel, options: BuildOptions = {}): CompileResult {
  const warnings: string[] = [];
  const junctionSet = new Set(model.junctions);
  const submazeSet = new Set(model.submazes);

  for (const junction of model.junctions) {
    if (!isValidIdentifier(junction)) {
      warnings.push(`junction ${junction!} uses invalid characters`);
    }
  }
  for (const submaze of model.submazes) {
    if (!isValidIdentifier(submaze)) {
      warnings.push(`submaze ${submaze!} uses invalid characters`);
    }
  }
  if (!junctionSet.has(model.startJunction)) {
    warnings.push(`start junction ${model.startJunction!} is not declared`);
  }
  for (const goal of model.goalJunctions) {
    if (!junctionSet.has(goal)) {
      warnings.push(`goal junction ${goal!} is not declared`);
    }
  }

  const ports = new Map<string, {
    id: string;
    point: string;
    context: readonly string[];
    label?: string;
  }>();
  const transitions: {
    id: string;
    fromPort: string;
    source: Address;
    target: Address;
    input: string;
    label?: string;
  }[] = [];

  for (const connection of model.connections) {
    if (!junctionSet.has(connection.from.point)) {
      warnings.push(`connection ${connection.id}: from junction ${connection.from.point} not declared`);
    }
    if (!junctionSet.has(connection.to.point)) {
      warnings.push(`connection ${connection.id}: to junction ${connection.to.point} not declared`);
    }
    for (const submaze of [...connection.from.prefix, ...connection.to.prefix]) {
      if (!submazeSet.has(submaze)) {
        warnings.push(`connection ${connection.id}: submaze ${submaze} not declared`);
      }
    }

    const fromPortId = generatePortId(connection.from, connection.to);
    if (!ports.has(fromPortId)) {
      ports.set(fromPortId, {
        id: fromPortId,
        point: connection.from.point,
        context: connection.from.prefix,
        label: connection.to.point,
      });
    }
    transitions.push({
      id: connection.id,
      fromPort: fromPortId,
      source: connection.from,
      target: connection.to,
      input: connection.to.point,
      label: connection.label,
    });
  }

  const graph: PortGraph = {
    id: model.packageId,
    start: { prefix: [], point: model.startJunction },
    goals: model.goalJunctions.map((point) => ({ prefix: [], point })),
    points: model.junctions.map((id) => ({ id })),
    submazes: model.submazes.map((id) => ({ id })),
    ports,
    transitions,
    transitionGroups: [],
    proofEdges: new Map(),
  };

  if (!options.lenient && warnings.length > 0) {
    return { graph, warnings };
  }
  return { graph, warnings };
}

function generatePortId(from: Address, to: Address): string {
  const fromTag = from.prefix.length === 0
    ? from.point
    : `${from.prefix.join('_')}_${from.point}`;
  const toTag = to.prefix.length === 0
    ? to.point
    : `${to.prefix.join('_')}_${to.point}`;
  return `${fromTag}_to_${toTag}`;
}

function isValidIdentifier(value: string): boolean {
  return /^[A-Za-z0-9_.:@()#;=-]+$/.test(value);
}
