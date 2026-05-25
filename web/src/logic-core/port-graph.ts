import { parseAddress } from './address';
import {
  type Port,
  type PortGraph,
  type ProofEdge,
  type Transition,
  type TransitionGroup,
} from './types';

interface RawPort {
  id: string;
  point: string;
  context?: string[];
  label?: string;
  kind?: string;
}

interface RawTransition {
  id: string;
  from_port: string;
  source: string;
  target: string;
  input: string;
  label?: string;
}

interface RawTransitionGroup {
  id: string;
  direction: 'one_way' | 'two_way';
  forward?: RawTransition;
  reverse?: RawTransition;
  label?: string;
}

interface RawProofEdge {
  id: string;
  source: string;
  target: string;
  input: string;
  proof_type: 'infinite_hop' | 'cantor_hop' | 'cantor_bridge';
  status: 'proved' | 'assumed' | 'disproved' | 'unknown';
  explanation: string;
  enabled_by_default?: boolean;
}

interface RawLogic {
  id: string;
  strategy: string;
  source_model: string;
  start: string;
  goals: string[];
  points?: { id: string; label?: string }[];
  submazes?: { id: string; label?: string }[];
  ports?: RawPort[];
  transitions?: RawTransition[];
  transition_groups?: RawTransitionGroup[];
  proof_edges?: RawProofEdge[];
}

export function isPortGraphLogic(logic: { strategy?: string; source_model?: string }): boolean {
  return logic.strategy === 'pda_stack' && logic.source_model === 'port_graph';
}

export function loadPortGraph(logic: unknown): PortGraph {
  const raw = logic as RawLogic;
  if (!isPortGraphLogic(raw)) {
    throw new Error(
      `loadPortGraph: unsupported strategy/source_model (${raw.strategy}/${raw.source_model})`,
    );
  }

  const ports = new Map<string, Port>();
  for (const rawPort of raw.ports ?? []) {
    ports.set(rawPort.id, {
      id: rawPort.id,
      point: rawPort.point,
      context: rawPort.context ?? [],
      label: rawPort.label,
      kind: rawPort.kind,
    });
  }

  const transitions: Transition[] = [];
  for (const rawTransition of raw.transitions ?? []) {
    transitions.push(parseTransition(rawTransition));
  }

  const transitionGroups: TransitionGroup[] = [];
  for (const rawGroup of raw.transition_groups ?? []) {
    const ids: string[] = [];
    for (const key of ['forward', 'reverse'] as const) {
      const member = rawGroup[key];
      if (member !== undefined) {
        const transition = parseTransition(member);
        transitions.push(transition);
        ids.push(transition.id);
      }
    }
    transitionGroups.push({
      id: rawGroup.id,
      direction: rawGroup.direction,
      transitionIds: ids,
      label: rawGroup.label,
    });
  }

  const proofEdges = new Map<string, ProofEdge>();
  for (const rawEdge of raw.proof_edges ?? []) {
    proofEdges.set(rawEdge.id, {
      id: rawEdge.id,
      source: parseAddress(rawEdge.source),
      target: parseAddress(rawEdge.target),
      input: rawEdge.input,
      proofType: rawEdge.proof_type,
      status: rawEdge.status,
      explanation: rawEdge.explanation,
      enabledByDefault: rawEdge.enabled_by_default ?? false,
    });
  }

  return {
    id: raw.id,
    start: parseAddress(raw.start),
    goals: raw.goals.map(parseAddress),
    points: raw.points ?? [],
    submazes: raw.submazes ?? [],
    ports,
    transitions,
    transitionGroups,
    proofEdges,
  };
}

function parseTransition(raw: RawTransition): Transition {
  return {
    id: raw.id,
    fromPort: raw.from_port,
    source: parseAddress(raw.source),
    target: parseAddress(raw.target),
    input: raw.input,
    label: raw.label,
  };
}
