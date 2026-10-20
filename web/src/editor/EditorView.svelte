<script lang="ts">
  import { untrack } from 'svelte';
  import { formatAddress } from '@logic-core/index';
  import { parseConnectionInput, type EditorConnection } from './model';
  import { createEditorStore, previewCompiledModel } from './store.svelte';
  import { downloadEmittedFiles, emitEditorPackage } from './emit';
  import { editorModelToBrowserPackage } from './to-browser-package';
  import type { BrowserPackage } from '@packages/types';

  interface Props {
    draftId: string;
    onPlayDraft: (pkg: BrowserPackage) => void;
  }

  const { draftId, onPlayDraft }: Props = $props();
  const editor = createEditorStore(untrack(() => draftId));

  let connectionInput = $state('');
  let connectionError = $state<string | null>(null);
  let newJunction = $state('');
  let newSubmaze = $state('');

  const compiled = $derived(previewCompiledModel(editor.model));
  const transitions = $derived(compiled.graph.transitions);
  const portsList = $derived([...compiled.graph.ports.values()]);
  const warnings = $derived(compiled.warnings);

  function addConnection(): void {
    const result = parseConnectionInput(connectionInput);
    if (!result.ok) {
      connectionError = result.error ?? 'unable to parse';
      return;
    }
    editor.addConnection(result.connection!);
    connectionInput = '';
    connectionError = null;
  }

  function addJunctionFromInput(): void {
    if (!newJunction) return;
    editor.addJunction(newJunction);
    newJunction = '';
  }

  function addSubmazeFromInput(): void {
    if (!newSubmaze) return;
    editor.addSubmaze(newSubmaze);
    newSubmaze = '';
  }

  function exportYaml(): void {
    const files = emitEditorPackage(editor.model);
    downloadEmittedFiles(editor.model, files);
  }

  function playDraft(): void {
    const pkg = editorModelToBrowserPackage(editor.model);
    onPlayDraft(pkg);
  }

  function setStartFromSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    editor.setStart(target.value);
  }

  function toggleGoal(junction: string): void {
    const current = new Set(editor.model.goalJunctions);
    if (current.has(junction)) current.delete(junction);
    else current.add(junction);
    editor.setGoals([...current]);
  }
</script>

<div class="editor">
  <div class="meta panel">
    <h3>Package identity</h3>
    <label>
      Package id
      <input value={editor.model.packageId} oninput={(e) => editor.setPackageId((e.target as HTMLInputElement).value)} />
    </label>
    <label>
      Title
      <input value={editor.model.title} oninput={(e) => editor.setTitle((e.target as HTMLInputElement).value)} />
    </label>
    <label>
      Start junction
      <select value={editor.model.startJunction} onchange={setStartFromSelect}>
        {#each editor.model.junctions as junction (junction)}
          <option value={junction}>{junction}</option>
        {/each}
      </select>
    </label>
  </div>

  <div class="junctions panel">
    <h3>Junctions</h3>
    <ul>
      {#each editor.model.junctions as junction (junction)}
        <li>
          <label class="goal-toggle">
            <input
              type="checkbox"
              checked={editor.model.goalJunctions.includes(junction)}
              onchange={() => toggleGoal(junction)}
            />
            <span class="mono">{junction}</span>
            {#if editor.model.goalJunctions.includes(junction)}
              <span class="goal-tag">goal</span>
            {/if}
            {#if editor.model.startJunction === junction}
              <span class="start-tag">start</span>
            {/if}
          </label>
          <button class="mini" onclick={() => editor.removeJunction(junction)}>remove</button>
        </li>
      {/each}
    </ul>
    <div class="add-row">
      <input
        placeholder="new junction id, e.g. p7"
        bind:value={newJunction}
        onkeydown={(event) => {
          if (event.key === 'Enter') addJunctionFromInput();
        }}
      />
      <button onclick={addJunctionFromInput} disabled={!newJunction}>Add junction</button>
    </div>
  </div>

  <div class="submazes panel">
    <h3>Submazes</h3>
    <ul>
      {#each editor.model.submazes as submaze (submaze)}
        <li>
          <span class="mono">{submaze}</span>
          <button class="mini" onclick={() => editor.removeSubmaze(submaze)}>remove</button>
        </li>
      {/each}
    </ul>
    <div class="add-row">
      <input
        placeholder="new submaze id, e.g. B"
        bind:value={newSubmaze}
        onkeydown={(event) => {
          if (event.key === 'Enter') addSubmazeFromInput();
        }}
      />
      <button onclick={addSubmazeFromInput} disabled={!newSubmaze}>Add submaze</button>
    </div>
  </div>

  <div class="connections panel">
    <h3>Connections</h3>
    <p class="muted">Format: <code>p1 → A.p2</code> (or <code>p1 -&gt; A.p2</code>). Use dots to nest submazes.</p>
    <div class="add-row">
      <input
        placeholder="p1 → A.p2"
        bind:value={connectionInput}
        onkeydown={(event) => {
          if (event.key === 'Enter') addConnection();
        }}
      />
      <button onclick={addConnection} disabled={!connectionInput}>Add</button>
    </div>
    {#if connectionError}
      <p class="error">{connectionError}</p>
    {/if}
    <ul class="connection-list">
      {#each editor.model.connections as connection (connection.id)}
        <li>
          <span class="mono">{formatAddress(connection.from)} → {formatAddress(connection.to)}</span>
          <button class="mini" onclick={() => editor.removeConnection(connection.id)}>remove</button>
        </li>
      {/each}
    </ul>
  </div>

  <div class="preview panel">
    <h3>Compiled PDA preview</h3>
    <div class="counts">
      <div><span class="metric">{portsList.length}</span><span class="muted">ports</span></div>
      <div><span class="metric">{transitions.length}</span><span class="muted">transitions</span></div>
      <div><span class="metric">{editor.model.junctions.length}</span><span class="muted">junctions</span></div>
      <div><span class="metric">{editor.model.submazes.length}</span><span class="muted">submazes</span></div>
    </div>
    <details>
      <summary>Generated ports</summary>
      <ul class="mono">
        {#each portsList as port (port.id)}
          <li>{port.id} (at {port.context.join('.') || 'root'}.{port.point})</li>
        {/each}
      </ul>
    </details>
    <details>
      <summary>Generated transitions</summary>
      <ul class="mono">
        {#each transitions as transition (transition.id)}
          <li>{transition.id}</li>
        {/each}
      </ul>
    </details>
  </div>

  <div class="validation panel">
    <h3>Validation</h3>
    {#if warnings.length === 0}
      <p class="ok">No warnings.</p>
    {:else}
      <ul class="warning-list">
        {#each warnings as warning (warning)}
          <li>{warning}</li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="actions panel">
    <button class="primary" onclick={playDraft} disabled={transitions.length === 0}>Play this draft</button>
    <button onclick={exportYaml} disabled={transitions.length === 0}>Download YAML</button>
    <button class="danger" onclick={() => editor.clearDraft()}>Clear draft</button>
  </div>
</div>

<style>
  .editor {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    padding: 0 20px 20px;
  }
  .meta, .actions, .preview, .validation, .connections {
    grid-column: 1 / -1;
  }
  h3 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  label {
    display: grid;
    gap: 4px;
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 8px;
  }
  input, select {
    background: var(--panel);
    color: var(--text);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    padding: 4px 8px;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 4px;
  }
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }
  .add-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px;
    margin-top: 6px;
  }
  .mono {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  }
  .mini {
    font-size: 10px;
    padding: 2px 6px;
    background: transparent;
  }
  .goal-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 13px;
    color: var(--text);
  }
  .goal-tag {
    font-size: 10px;
    background: var(--goal);
    color: #03110a;
    padding: 1px 5px;
    border-radius: 999px;
  }
  .start-tag {
    font-size: 10px;
    background: var(--accent);
    color: white;
    padding: 1px 5px;
    border-radius: 999px;
  }
  .counts {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  .counts div {
    display: grid;
    gap: 2px;
    text-align: center;
  }
  .metric {
    font-size: 20px;
    font-weight: 700;
  }
  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .primary {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
  .danger {
    background: rgba(239, 68, 68, 0.15);
    border-color: #ef4444;
    color: #fecaca;
  }
  .warning-list {
    color: var(--proof);
  }
  .ok {
    color: var(--goal);
    margin: 0;
    font-size: 13px;
  }
  .error {
    color: #ef4444;
    margin: 4px 0 0 0;
    font-size: 12px;
  }
  details summary {
    cursor: pointer;
    font-size: 12px;
    color: var(--muted);
    padding: 6px 0;
  }
  .muted {
    color: var(--muted);
    font-size: 12px;
  }
  code {
    background: var(--panel-border);
    padding: 1px 4px;
    border-radius: 4px;
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  }
</style>
