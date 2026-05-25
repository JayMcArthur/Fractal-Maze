import { addressEquals, stackOf } from './address';
import {
  ExecutionError,
  type Address,
  type PortGraph,
  type RuntimeState,
  type StepRecord,
  type Transition,
} from './types';

export function initialState(graph: PortGraph): RuntimeState {
  return { address: graph.start, activePort: null };
}

export function isGoal(graph: PortGraph, state: RuntimeState): boolean {
  return graph.goals.some((goal) => addressEquals(goal, state.address));
}

export function withPort(state: RuntimeState, activePort: string | null): RuntimeState {
  return { address: state.address, activePort };
}

export function transitionMatches(transition: Transition, state: RuntimeState): boolean {
  if (transition.source.point !== state.address.point) return false;
  if (transition.fromPort !== state.activePort) return false;
  const sourceDepth = transition.source.prefix.length;
  if (sourceDepth === 0) return true;
  const tail = state.address.prefix.slice(-sourceDepth);
  if (tail.length !== sourceDepth) return false;
  for (let i = 0; i < sourceDepth; i += 1) {
    if (tail[i] !== transition.source.prefix[i]) return false;
  }
  return true;
}

export function applyTransitionAddress(transition: Transition, current: Address): Address {
  const sourceDepth = transition.source.prefix.length;
  const basePrefix =
    sourceDepth === 0 ? current.prefix : current.prefix.slice(0, current.prefix.length - sourceDepth);
  return {
    prefix: [...basePrefix, ...transition.target.prefix],
    point: transition.target.point,
  };
}

export function legalTransitions(graph: PortGraph, state: RuntimeState): Transition[] {
  const matches: Transition[] = [];
  for (const transition of graph.transitions) {
    const probe = withPort(state, transition.fromPort);
    if (transitionMatches(transition, probe)) {
      matches.push(transition);
    }
  }
  return matches;
}

export function applyTransitionById(
  graph: PortGraph,
  state: RuntimeState,
  transitionId: string,
): { next: RuntimeState; record: StepRecord } {
  const transition = graph.transitions.find((candidate) => candidate.id === transitionId);
  if (!transition) {
    throw new ExecutionError(`unknown transition ${transitionId}`);
  }
  const ported = withPort(state, transition.fromPort);
  if (!transitionMatches(transition, ported)) {
    throw new ExecutionError(
      `transition ${transitionId} does not apply at ${state.address.point}`,
    );
  }
  const target = applyTransitionAddress(transition, ported.address);
  const next: RuntimeState = { address: target, activePort: null };
  const record: StepRecord = {
    stepType: 'physical',
    input: transition.input,
    source: ported.address,
    target,
    transitionId: transition.id,
    stackBefore: stackOf(ported.address),
    stackAfter: stackOf(next.address),
  };
  return { next, record };
}
