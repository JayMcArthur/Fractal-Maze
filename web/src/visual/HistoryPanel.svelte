<script lang="ts">
  import { formatAddress } from '@logic-core/index';
  import type { PortGraphRuntimeStore } from '@runtime/store.svelte';

  interface Props {
    store: PortGraphRuntimeStore;
  }

  const { store }: Props = $props();
</script>

<div class="panel history">
  <h3>History</h3>
  {#if store.history.length === 0}
    <p class="muted">No moves yet. Pick a legal action to begin.</p>
  {:else}
    <ol>
      {#each store.history as entry, index (index)}
        <li>
          <span class="step-num">{index + 1}</span>
          <span class="step-id mono">{entry.record.transitionId}</span>
          <span class="step-target mono">→ {formatAddress(entry.record.target)}</span>
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .history {
    max-height: 40vh;
    overflow-y: auto;
  }
  h3 {
    margin: 0 0 6px 0;
    font-size: 14px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 4px;
    font-size: 12px;
  }
  li {
    display: grid;
    grid-template-columns: 24px 1fr auto;
    gap: 8px;
    align-items: baseline;
  }
  .step-num {
    color: var(--muted);
    text-align: right;
  }
  .mono {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  }
  .step-target {
    color: var(--history);
  }
  .muted {
    color: var(--muted);
    font-size: 13px;
  }
</style>
