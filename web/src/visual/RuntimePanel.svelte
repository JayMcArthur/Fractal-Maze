<script lang="ts">
  import { formatAddress } from '@logic-core/index';
  import type { PortGraphRuntimeStore } from '@runtime/store.svelte';

  interface Props {
    store: PortGraphRuntimeStore;
  }

  const { store }: Props = $props();
</script>

<div class="panel runtime">
  <h3>Runtime state</h3>
  <div class="row">
    <span class="label">Current point</span>
    <span class="value">{store.state.address.point}</span>
  </div>
  <div class="row">
    <span class="label">Address</span>
    <span class="value mono">{formatAddress(store.state.address)}</span>
  </div>
  <div class="row">
    <span class="label">Stack</span>
    <span class="value mono">[{[...store.state.address.prefix, ''].join(', ').replace(/, $/, '')}]</span>
  </div>
  <div class="row">
    <span class="label">Steps taken</span>
    <span class="value">{store.history.length}</span>
  </div>
  <div class="row">
    <span class="label">Status</span>
    <span class="value" class:at-goal={store.atGoal}>{store.atGoal ? 'AT GOAL' : 'in progress'}</span>
  </div>
</div>

<style>
  .runtime {
    display: grid;
    gap: 8px;
  }
  h3 {
    margin: 0 0 6px 0;
    font-size: 14px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }
  .label {
    color: var(--muted);
  }
  .value {
    font-weight: 600;
  }
  .mono {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  }
  .at-goal {
    color: var(--goal);
  }
</style>
