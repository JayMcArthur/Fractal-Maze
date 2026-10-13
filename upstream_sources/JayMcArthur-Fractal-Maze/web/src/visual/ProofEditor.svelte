<script lang="ts">
  import { formatAddress } from '@logic-core/index';
  import type { ProofBody, ProofEdge } from '@logic-core/index';
  import type { PortGraphRuntimeStore } from '@runtime/store.svelte';

  interface Props {
    store: PortGraphRuntimeStore;
    edge: ProofEdge;
    onClose: () => void;
  }

  const { store, edge, onClose }: Props = $props();

  const defaultBody = $derived(store.defaultProofBody(edge.id));
  let body = $state<ProofBody | null>(null);
  let errors = $state<string[]>([]);
  const submitted = $derived(store.submittedProofs.has(edge.id));

  $effect(() => {
    if (!body) body = defaultBody;
  });

  function submit(): void {
    if (!body) return;
    const result = store.submitProof(edge.id, body);
    if (result.ok) {
      errors = [];
    } else {
      errors = result.errors ?? ['validation failed'];
    }
  }

  function take(): void {
    const result = store.applyProof(edge.id);
    if (!result.ok) {
      errors = [result.error ?? 'apply failed'];
    } else {
      onClose();
    }
  }
</script>

<div class="proof-editor panel">
  <header>
    <h3>Proof edge: {edge.id}</h3>
    <button class="close" onclick={onClose}>close</button>
  </header>

  <p class="explanation">{edge.explanation}</p>

  <dl>
    <dt>Type</dt><dd>{edge.proofType}</dd>
    <dt>Source</dt><dd class="mono">{formatAddress(edge.source)}</dd>
    <dt>Target</dt><dd class="mono">{formatAddress(edge.target)}</dd>
    <dt>Input symbol</dt><dd class="mono">{edge.input}</dd>
  </dl>

  {#if body}
    <h4>Proof body ({body.method})</h4>
    {#if body.summary}
      <p class="muted">{body.summary}</p>
    {/if}
    <ol class="steps">
      {#each body.steps as step, index (index)}
        <li>
          <span class="kind" class:assumption={step.kind === 'assumption'}>{step.kind}</span>
          <span class="mono">{formatAddress(step.source)} → {formatAddress(step.target)}</span>
          {#if step.reason}
            <span class="reason">{step.reason}</span>
          {/if}
        </li>
      {/each}
    </ol>
  {:else}
    <p class="muted">No default proof body packaged with this edge.</p>
  {/if}

  {#if errors.length > 0}
    <div class="errors">
      <strong>Validation errors:</strong>
      <ul>
        {#each errors as error (error)}
          <li>{error}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="actions">
    {#if !submitted}
      <button class="primary" onclick={submit} disabled={!body}>Submit proof</button>
    {:else}
      <span class="ok">✓ Proof accepted</span>
      <button class="primary" onclick={take}>Take proof move</button>
    {/if}
  </div>
</div>

<style>
  .proof-editor {
    border: 1px solid var(--proof);
    background: rgba(245, 158, 11, 0.05);
    display: grid;
    gap: 8px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h3 {
    margin: 0;
    font-size: 14px;
    color: var(--proof);
  }
  h4 {
    margin: 8px 0 4px 0;
    font-size: 13px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .close {
    font-size: 11px;
    padding: 2px 6px;
  }
  .explanation {
    margin: 0;
    font-size: 13px;
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    margin: 0;
    font-size: 12px;
  }
  dt {
    color: var(--muted);
  }
  dd {
    margin: 0;
  }
  .mono {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  }
  .steps {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 4px;
    font-size: 12px;
  }
  .steps li {
    display: grid;
    grid-template-columns: 80px 1fr;
    gap: 6px;
    align-items: baseline;
  }
  .kind {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .kind.assumption {
    color: var(--proof);
  }
  .reason {
    grid-column: 1 / -1;
    font-size: 11px;
    color: var(--muted);
    padding-left: 86px;
  }
  .muted {
    color: var(--muted);
    font-size: 12px;
  }
  .errors {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid #ef4444;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
  }
  .errors ul {
    margin: 4px 0 0 0;
    padding-left: 18px;
  }
  .actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .primary {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
  .ok {
    color: var(--goal);
    font-weight: 600;
    font-size: 13px;
  }
</style>
