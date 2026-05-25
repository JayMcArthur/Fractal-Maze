export const ROOT = 'ROOT';

export interface Address {
  prefix: readonly string[];
  point: string;
}

export interface Port {
  id: string;
  point: string;
  context: readonly string[];
  label?: string;
  kind?: string;
}

export interface Transition {
  id: string;
  fromPort: string;
  source: Address;
  target: Address;
  input: string;
  label?: string;
}

export interface TransitionGroup {
  id: string;
  direction: 'one_way' | 'two_way';
  transitionIds: readonly string[];
  label?: string;
}

export interface ProofEdge {
  id: string;
  source: Address;
  target: Address;
  input: string;
  proofType: 'infinite_hop' | 'cantor_hop' | 'cantor_bridge';
  status: 'proved' | 'assumed' | 'disproved' | 'unknown';
  explanation: string;
  enabledByDefault: boolean;
}

export interface RuntimeState {
  address: Address;
  activePort: string | null;
}

export interface StepRecord {
  stepType: 'physical' | 'proof';
  input: string;
  source: Address;
  target: Address;
  transitionId: string;
  stackBefore: readonly string[];
  stackAfter: readonly string[];
  explanation?: string;
}

export interface PortGraph {
  id: string;
  start: Address;
  goals: readonly Address[];
  points: readonly { id: string; label?: string }[];
  submazes: readonly { id: string; label?: string }[];
  ports: ReadonlyMap<string, Port>;
  transitions: readonly Transition[];
  transitionGroups: readonly TransitionGroup[];
  proofEdges: ReadonlyMap<string, ProofEdge>;
}

export class ExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExecutionError';
  }
}
