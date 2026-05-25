import {
  ExecutionError,
  applyProofEdgeAddress,
  applyTransitionById,
  initialState,
  isGoal,
  legalTransitions,
  loadPortGraph,
  parseProofBody,
  proofEdgeApplies,
  validateProofBody,
  type PortGraph,
  type ProofBody,
  type ProofEdge,
  type RawProofBody,
  type RuntimeState,
  type StepRecord,
  type Transition,
} from '@logic-core/index';
import { stackOf } from '@logic-core/address';
import type { BrowserPackage } from '@packages/types';

export interface HistoryEntry {
  before: RuntimeState;
  after: RuntimeState;
  record: StepRecord;
}

export interface ProofEdgeOffer {
  edge: ProofEdge;
  applies: boolean;
  unlocked: boolean;
  submittedAt: number | null;
}

export interface PortGraphRuntimeStore {
  readonly kind: 'pda_stack';
  readonly pkg: BrowserPackage;
  readonly graph: PortGraph;
  readonly state: RuntimeState;
  readonly history: readonly HistoryEntry[];
  readonly future: readonly HistoryEntry[];
  readonly atGoal: boolean;
  readonly legal: readonly Transition[];
  readonly proofOffers: readonly ProofEdgeOffer[];
  readonly submittedProofs: ReadonlySet<string>;
  reset(): void;
  commit(transitionId: string): { ok: boolean; error?: string };
  submitProof(edgeId: string, body: ProofBody): { ok: boolean; errors?: string[] };
  applyProof(edgeId: string): { ok: boolean; error?: string };
  defaultProofBody(edgeId: string): ProofBody | null;
  undo(): boolean;
  redo(): boolean;
}

export function createRuntimeStore(pkg: BrowserPackage): PortGraphRuntimeStore {
  const graph = loadPortGraph(pkg.logic);

  let state = $state<RuntimeState>(initialState(graph));
  let history = $state<HistoryEntry[]>([]);
  let future = $state<HistoryEntry[]>([]);
  let submittedProofs = $state<Set<string>>(new Set(seedDefaultUnlocks(graph)));

  const atGoal = $derived(isGoal(graph, state));
  const legal = $derived(legalTransitions(graph, state));
  const proofOffers = $derived(computeProofOffers(graph, state, submittedProofs));

  function reset(): void {
    state = initialState(graph);
    history = [];
    future = [];
    submittedProofs = new Set(seedDefaultUnlocks(graph));
  }

  function commit(transitionId: string): { ok: boolean; error?: string } {
    try {
      const { next, record } = applyTransitionById(graph, state, transitionId);
      const entry: HistoryEntry = { before: state, after: next, record };
      history = [...history, entry];
      future = [];
      state = next;
      return { ok: true };
    } catch (exc) {
      const error = exc instanceof ExecutionError ? exc.message : String(exc);
      return { ok: false, error };
    }
  }

  function submitProof(edgeId: string, body: ProofBody): { ok: boolean; errors?: string[] } {
    const edge = graph.proofEdges.get(edgeId);
    if (!edge) return { ok: false, errors: [`unknown proof edge ${edgeId}`] };
    const errors = validateProofBody(graph, edge, body);
    if (errors.length > 0) return { ok: false, errors };
    submittedProofs = new Set([...submittedProofs, edgeId]);
    return { ok: true };
  }

  function applyProof(edgeId: string): { ok: boolean; error?: string } {
    const edge = graph.proofEdges.get(edgeId);
    if (!edge) return { ok: false, error: `unknown proof edge ${edgeId}` };
    if (!submittedProofs.has(edgeId)) {
      return { ok: false, error: `proof for ${edgeId} has not been submitted` };
    }
    if (!proofEdgeApplies(edge, state.address)) {
      return { ok: false, error: `proof edge ${edgeId} does not apply at ${state.address.point}` };
    }
    const target = applyProofEdgeAddress(edge, state.address);
    const next: RuntimeState = { address: target, activePort: null };
    const record: StepRecord = {
      stepType: 'proof',
      input: edge.input,
      source: state.address,
      target,
      transitionId: edge.id,
      stackBefore: stackOf(state.address),
      stackAfter: stackOf(next.address),
      explanation: edge.explanation,
    };
    history = [...history, { before: state, after: next, record }];
    future = [];
    state = next;
    return { ok: true };
  }

  function defaultProofBody(edgeId: string): ProofBody | null {
    const raw = extractRawProofBody(pkg.logic, edgeId);
    return raw ? parseProofBody(raw) : null;
  }

  function undo(): boolean {
    if (history.length === 0) return false;
    const last = history[history.length - 1];
    history = history.slice(0, -1);
    future = [last, ...future];
    state = last.before;
    return true;
  }

  function redo(): boolean {
    if (future.length === 0) return false;
    const next = future[0];
    future = future.slice(1);
    history = [...history, next];
    state = next.after;
    return true;
  }

  return {
    kind: 'pda_stack',
    pkg,
    graph,
    get state() {
      return state;
    },
    get history() {
      return history;
    },
    get future() {
      return future;
    },
    get atGoal() {
      return atGoal;
    },
    get legal() {
      return legal;
    },
    get proofOffers() {
      return proofOffers;
    },
    get submittedProofs() {
      return submittedProofs;
    },
    reset,
    commit,
    submitProof,
    applyProof,
    defaultProofBody,
    undo,
    redo,
  };
}

function seedDefaultUnlocks(graph: PortGraph): string[] {
  const seeds: string[] = [];
  for (const edge of graph.proofEdges.values()) {
    if (edge.enabledByDefault) seeds.push(edge.id);
  }
  return seeds;
}

function computeProofOffers(
  graph: PortGraph,
  state: RuntimeState,
  submitted: ReadonlySet<string>,
): ProofEdgeOffer[] {
  const offers: ProofEdgeOffer[] = [];
  for (const edge of graph.proofEdges.values()) {
    const applies = proofEdgeApplies(edge, state.address);
    if (!applies) continue;
    offers.push({
      edge,
      applies: true,
      unlocked: submitted.has(edge.id),
      submittedAt: submitted.has(edge.id) ? 1 : null,
    });
  }
  return offers;
}

function extractRawProofBody(logic: unknown, edgeId: string): RawProofBody | null {
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
