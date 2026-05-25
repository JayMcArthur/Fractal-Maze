import { addressEquals, formatAddress, parseAddress } from './address';
import type { Address, ProofEdge, PortGraph, Transition } from './types';

export interface ProofStep {
  kind: 'physical' | 'assumption';
  source: Address;
  target: Address;
  reason?: string;
}

export interface ProofBody {
  method: string;
  steps: ProofStep[];
  summary?: string;
  variables?: unknown;
  obligations?: unknown[];
  presuppositions?: unknown[];
}

export interface RawProofStep {
  kind: string;
  source: string;
  target: string;
  reason?: string;
}

export interface RawProofBody {
  method: string;
  steps: RawProofStep[];
  summary?: string;
  variables?: unknown;
  obligations?: unknown[];
  presuppositions?: unknown[];
}

export function parseProofBody(raw: RawProofBody): ProofBody {
  return {
    method: raw.method,
    summary: raw.summary,
    variables: raw.variables,
    obligations: raw.obligations,
    presuppositions: raw.presuppositions,
    steps: raw.steps.map((step) => ({
      kind: step.kind as 'physical' | 'assumption',
      source: parseAddress(step.source),
      target: parseAddress(step.target),
      reason: step.reason,
    })),
  };
}

function hasPhysicalConnection(graph: PortGraph, source: Address, target: Address): boolean {
  for (const transition of graph.transitions) {
    if (transition.source.point !== source.point) continue;
    const depth = transition.source.prefix.length;
    if (depth > 0) {
      const tail = source.prefix.slice(-depth);
      if (tail.length !== depth) continue;
      let ok = true;
      for (let i = 0; i < depth; i += 1) {
        if (tail[i] !== transition.source.prefix[i]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
    }
    const applied = applyTransitionAddress(transition, source);
    if (addressEquals(applied, target)) return true;
  }
  return false;
}

function applyTransitionAddress(transition: Transition, current: Address): Address {
  const sourceDepth = transition.source.prefix.length;
  const basePrefix =
    sourceDepth === 0 ? current.prefix : current.prefix.slice(0, current.prefix.length - sourceDepth);
  return {
    prefix: [...basePrefix, ...transition.target.prefix],
    point: transition.target.point,
  };
}

export function validateProofBody(graph: PortGraph, edge: ProofEdge, body: ProofBody): string[] {
  const errors: string[] = [];
  if (body.steps.length === 0) {
    errors.push('proof must include at least one step');
    return errors;
  }
  if (body.method === 'infinite_hop' || body.method === 'simplified_infinite_hop') {
    return validateInfiniteHop(graph, body);
  }
  return validateChainProof(graph, edge, body);
}

function validateInfiniteHop(graph: PortGraph, body: ProofBody): string[] {
  const errors: string[] = [];
  if (body.steps.length < 2) {
    errors.push('infinite hop proof must include at least two convergence obligations');
  }
  for (const step of body.steps) {
    if (step.kind !== 'physical') {
      errors.push(`infinite hop obligation must be physical: ${formatAddress(step.source)} -> ${formatAddress(step.target)}`);
    } else if (!hasPhysicalConnection(graph, step.source, step.target)) {
      errors.push(`missing physical proof step ${formatAddress(step.source)} -> ${formatAddress(step.target)}`);
    }
  }
  const targetPrefixes = new Set(body.steps.map((step) => step.target.prefix.join('.')));
  if (targetPrefixes.size !== 1) {
    errors.push('infinite hop obligations must converge into the same submaze prefix');
  }
  return errors;
}

function validateChainProof(graph: PortGraph, edge: ProofEdge, body: ProofBody): string[] {
  const errors: string[] = [];
  const first = body.steps[0];
  if (!addressEquals(first.source, edge.source)) {
    errors.push(`proof must start at ${formatAddress(edge.source)}`);
  }
  const last = body.steps[body.steps.length - 1];
  if (!addressEquals(last.target, edge.target)) {
    errors.push(`proof must end at ${formatAddress(edge.target)}`);
  }
  for (let i = 1; i < body.steps.length; i += 1) {
    if (!addressEquals(body.steps[i - 1].target, body.steps[i].source)) {
      errors.push(
        `proof gap: ${formatAddress(body.steps[i - 1].target)} then ${formatAddress(body.steps[i].source)}`,
      );
    }
  }
  for (const step of body.steps) {
    if (step.kind === 'physical') {
      if (!hasPhysicalConnection(graph, step.source, step.target)) {
        errors.push(`missing physical proof step ${formatAddress(step.source)} -> ${formatAddress(step.target)}`);
      }
    } else if (step.kind === 'assumption') {
      const same =
        step.source.prefix.length === step.target.prefix.length &&
        step.source.prefix.every((value, index) => value === step.target.prefix[index]);
      if (!same) {
        errors.push(`invalid assumption across different contexts ${formatAddress(step.source)} -> ${formatAddress(step.target)}`);
      }
    } else {
      errors.push(`unsupported proof step kind ${step.kind}`);
    }
  }
  return errors;
}

export function extractProofBodyFromLogic(logic: unknown, edgeId: string): RawProofBody | null {
  if (!logic || typeof logic !== 'object') return null;
  const edges = (logic as { proof_edges?: unknown }).proof_edges;
  if (!Array.isArray(edges)) return null;
  for (const entry of edges) {
    if (typeof entry !== 'object' || entry === null) continue;
    const item = entry as { id?: unknown; proof?: unknown };
    if (item.id !== edgeId) continue;
    if (!item.proof || typeof item.proof !== 'object') return null;
    return item.proof as RawProofBody;
  }
  return null;
}

export function applyProofEdgeAddress(edge: ProofEdge, current: Address): Address {
  const depth = edge.source.prefix.length;
  const base = depth === 0 ? current.prefix : current.prefix.slice(0, current.prefix.length - depth);
  return {
    prefix: [...base, ...edge.target.prefix],
    point: edge.target.point,
  };
}

export function proofEdgeApplies(edge: ProofEdge, current: Address): boolean {
  if (edge.source.point !== current.point) return false;
  const depth = edge.source.prefix.length;
  if (depth === 0) return true;
  const tail = current.prefix.slice(-depth);
  if (tail.length !== depth) return false;
  for (let i = 0; i < depth; i += 1) {
    if (tail[i] !== edge.source.prefix[i]) return false;
  }
  return true;
}
