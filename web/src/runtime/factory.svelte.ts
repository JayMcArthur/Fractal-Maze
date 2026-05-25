import { createCoordinateStore, type CoordinateRuntimeStore } from './coordinate-store.svelte';
import { createRuntimeStore, type PortGraphRuntimeStore } from './store.svelte';
import type { BrowserPackage } from '@packages/types';

export type AnyRuntimeStore =
  | PortGraphRuntimeStore
  | CoordinateRuntimeStore
  | { kind: 'reference_record'; pkg: BrowserPackage; notice: string };

export function createStoreForPackage(pkg: BrowserPackage): AnyRuntimeStore {
  const strategy = pkg.logic.strategy;
  if (strategy === 'pda_stack' && pkg.logic.source_model === 'port_graph') {
    return createRuntimeStore(pkg);
  }
  if (strategy === 'coordinate_path') {
    return createCoordinateStore(pkg);
  }
  if (strategy === 'reference_record') {
    return {
      kind: 'reference_record',
      pkg,
      notice:
        pkg.modeling_status?.reason ??
        'This maze is recorded as a reference only; no playable logic has been authored yet.',
    };
  }
  throw new Error(`Unsupported strategy: ${strategy} / ${pkg.logic.source_model}`);
}
