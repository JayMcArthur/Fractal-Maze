<script lang="ts">
  import { formatAddress } from '@logic-core/index';
  import type { Transition } from '@logic-core/index';
  import type { PortGraphRuntimeStore } from '@runtime/store.svelte';
  import ProofEditor from './ProofEditor.svelte';

  interface Props {
    store: PortGraphRuntimeStore;
    onSelect: (transition: Transition) => void;
  }

  const { store, onSelect }: Props = $props();

  const actionPresentations = $derived(extractActionPresentations(store.pkg.visual));
  const ordered = $derived(orderLegalTransitions());

  function extractActionPresentations(visual: unknown): Map<string, { label: string; order: number }> {
    const map = new Map<string, { label: string; order: number }>();
    if (!visual || typeof visual !== 'object') return map;
    const presentations = (visual as { action_presentations?: unknown }).action_presentations;
    if (!Array.isArray(presentations)) return map;
    for (const entry of presentations) {
      if (typeof entry !== 'object' || entry === null) continue;
      const item = entry as { transition_id?: unknown; label?: unknown; order?: unknown };
      if (typeof item.transition_id !== 'string' || typeof item.label !== 'string') continue;
      const order = typeof item.order === 'number' ? item.order : 0;
      map.set(item.transition_id, { label: item.label, order });
    }
    return map;
  }

  function orderLegalTransitions(): Transition[] {
    const list = [...store.legal];
    list.sort((left, right) => {
      const leftOrder = actionPresentations.get(left.id)?.order ?? 9999;
      const rightOrder = actionPresentations.get(right.id)?.order ?? 9999;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.id.localeCompare(right.id);
    });
    return list;
  }

  function labelFor(transition: Transition): string {
    const presentation = actionPresentations.get(transition.id);
    if (presentation) return presentation.label;
    return `${transition.input} → ${formatAddress(transition.target)}`;
  }

  let expandedProofId = $state<string | null>(null);

  function toggleProof(id: string): void {
    expandedProofId = expandedProofId === id ? null : id;
  }
</script>

<div class="panel actions">
  <h3>Legal actions</h3>
  {#if ordered.length === 0}
    <p class="muted">No legal physical moves from this state.</p>
  {:else}
    <ul>
      {#each ordered as transition (transition.id)}
        <li>
          <button onclick={() => onSelect(transition)}>
            <span class="action-label">{labelFor(transition)}</span>
            <span class="action-target">{formatAddress(transition.target)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if store.proofOffers.length > 0}
    <h3 class="proof-heading">Proof edges</h3>
    <ul class="proof-list">
      {#each store.proofOffers as offer (offer.edge.id)}
        <li class="proof-row">
          <button
            class="proof-button"
            class:locked={!offer.unlocked}
            class:unlocked={offer.unlocked}
            onclick={() => {
              if (offer.unlocked) {
                store.applyProof(offer.edge.id);
              } else {
                toggleProof(offer.edge.id);
              }
            }}
            title={offer.unlocked
              ? 'Click to take the proof edge.'
              : 'Submit a proof body to unlock.'}
          >
            <span class="proof-mark" aria-hidden="true">{offer.unlocked ? '✓' : '⌬'}</span>
            <span class="proof-label">{offer.edge.input}</span>
            <span class="proof-target">→ {formatAddress(offer.edge.target)}</span>
          </button>
          <button class="explain-toggle" onclick={() => toggleProof(offer.edge.id)}>
            {expandedProofId === offer.edge.id ? 'hide proof' : 'open proof'}
          </button>
          {#if expandedProofId === offer.edge.id}
            <div class="proof-slot">
              <ProofEditor
                store={store}
                edge={offer.edge}
                onClose={() => (expandedProofId = null)}
              />
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .actions {
    display: grid;
    gap: 6px;
    max-height: 60vh;
    overflow-y: auto;
  }
  h3 {
    margin: 0 0 6px 0;
    font-size: 14px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .proof-heading {
    margin-top: 12px;
    color: var(--proof);
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 4px;
  }
  button {
    width: 100%;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .action-target {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    color: var(--muted);
    font-size: 12px;
  }
  .muted {
    color: var(--muted);
    font-size: 13px;
  }
  .proof-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px;
  }
  .proof-button {
    border-color: var(--proof);
    background: rgba(245, 158, 11, 0.08);
    cursor: pointer;
    gap: 6px;
  }
  .proof-button.locked .proof-mark {
    color: var(--proof);
  }
  .proof-label {
    font-weight: 600;
  }
  .proof-target {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    color: var(--muted);
    font-size: 12px;
  }
  .explain-toggle {
    font-size: 11px;
    background: transparent;
    border: 1px solid var(--panel-border);
    padding: 4px 8px;
  }
  .proof-slot {
    grid-column: 1 / -1;
    margin-top: 4px;
  }
  .proof-button.unlocked {
    cursor: pointer;
    background: rgba(74, 222, 128, 0.12);
    border-color: var(--goal);
  }
  .proof-button.unlocked .proof-mark {
    color: var(--goal);
  }
</style>
