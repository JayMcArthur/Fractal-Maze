<script lang="ts">
  import { onMount } from 'svelte';
  import { loadBrowserPackage } from '@packages/loader';
  import type { BrowserPackage } from '@packages/types';
  import { loadCatalogue, type CatalogueEntry } from '@packages/catalogue';
  import { createStoreForPackage, type AnyRuntimeStore } from '@runtime/factory.svelte';
  import type { Transition } from '@logic-core/index';
  import AutoGraphView from '@visual/AutoGraphView.svelte';
  import RuntimePanel from '@visual/RuntimePanel.svelte';
  import ActionList from '@visual/ActionList.svelte';
  import HistoryPanel from '@visual/HistoryPanel.svelte';
  import FractalBlockView from '@visual/FractalBlockView.svelte';
  import FractalBlockControls from '@visual/FractalBlockControls.svelte';
  import PlaybackPanel from '@visual/PlaybackPanel.svelte';
  import EditorView from '../src/editor/EditorView.svelte';

  let catalogue = $state<CatalogueEntry[]>([]);
  let selectedId = $state('skeptic_play_1');
  let pkg = $state<BrowserPackage | null>(null);
  let store = $state<AnyRuntimeStore | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(false);
  let mode = $state<'browse' | 'edit'>('browse');
  const draftId = 'default';

  function playDraftPackage(draftPkg: BrowserPackage): void {
    error = null;
    pkg = draftPkg;
    try {
      store = createStoreForPackage(draftPkg);
      mode = 'browse';
    } catch (exc) {
      error = exc instanceof Error ? exc.message : String(exc);
      store = null;
    }
  }

  async function load(packageId: string): Promise<void> {
    loading = true;
    error = null;
    try {
      const next = await loadBrowserPackage(packageId);
      pkg = next;
      store = createStoreForPackage(next);
    } catch (exc) {
      error = exc instanceof Error ? exc.message : String(exc);
      pkg = null;
      store = null;
    } finally {
      loading = false;
    }
  }

  function handleSelectTransition(transition: Transition): void {
    if (!store || store.kind !== 'pda_stack') return;
    const result = store.commit(transition.id);
    if (!result.ok) {
      error = result.error ?? 'transition failed';
    }
  }

  function selectPackage(event: Event): void {
    const target = event.target as HTMLSelectElement;
    selectedId = target.value;
    void load(selectedId);
    updateUrl(selectedId);
  }

  function canReset(s: AnyRuntimeStore | null): boolean {
    return !!s && s.kind !== 'reference_record';
  }
  function canUndo(s: AnyRuntimeStore | null): boolean {
    return !!s && s.kind !== 'reference_record' && s.history.length > 0;
  }
  function canRedo(s: AnyRuntimeStore | null): boolean {
    return !!s && s.kind !== 'reference_record' && s.future.length > 0;
  }

  function packageFromUrl(): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('package');
    if (fromQuery) return fromQuery;
    const hash = window.location.hash.replace(/^#/, '');
    return hash || null;
  }

  function updateUrl(packageId: string): void {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('package', packageId);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }

  onMount(() => {
    const initial = packageFromUrl();
    if (initial) {
      selectedId = initial;
    }
    void loadCatalogue()
      .then((index) => {
        catalogue = index.packages;
      })
      .catch((exc: unknown) => {
        error = exc instanceof Error ? exc.message : String(exc);
      });
    void load(selectedId);
    updateUrl(selectedId);
  });
</script>

<header>
  <h1>Fractal Maze Lab</h1>
  <div class="controls">
    <div class="mode-toggle">
      <button onclick={() => (mode = 'browse')} class:active={mode === 'browse'}>Browse</button>
      <button onclick={() => (mode = 'edit')} class:active={mode === 'edit'}>Edit</button>
    </div>
    <label>
      Package
      <select onchange={selectPackage} value={selectedId} disabled={mode !== 'browse'}>
        {#each catalogue as entry (entry.id)}
          <option value={entry.id}>{entry.title} · {entry.status}</option>
        {/each}
      </select>
    </label>
    <button
      onclick={() => {
        if (!store || store.kind === 'reference_record') return;
        store.reset();
      }}
      disabled={!canReset(store)}
    >Reset</button>
    <button
      onclick={() => {
        if (!store || store.kind === 'reference_record') return;
        store.undo();
      }}
      disabled={!canUndo(store)}
    >Undo</button>
    <button
      onclick={() => {
        if (!store || store.kind === 'reference_record') return;
        store.redo();
      }}
      disabled={!canRedo(store)}
    >Redo</button>
  </div>
</header>

{#if mode === 'edit'}
  <h2>Editor — address-graph authoring</h2>
  <p class="hint">Draft persists to your browser's localStorage. Use "Play this draft" to load the in-memory graph into the player.</p>
  <EditorView draftId={draftId} onPlayDraft={playDraftPackage} />
{:else if loading}
  <p class="status">Loading {selectedId}…</p>
{:else if error}
  <p class="status error">Error: {error}</p>
{:else if pkg && store}
  <h2>{pkg.title}</h2>
  <p class="hint">
    Strategy: {pkg.logic.strategy} · Source: {pkg.source_root}
  </p>
  <main>
    {#if store.kind === 'pda_stack'}
      <section class="graph-area">
        <AutoGraphView store={store} onSelect={handleSelectTransition} />
      </section>
      <aside class="side-panels">
        <RuntimePanel store={store} />
        <ActionList store={store} onSelect={handleSelectTransition} />
        <PlaybackPanel store={store} />
        <HistoryPanel store={store} />
      </aside>
    {:else if store.kind === 'coordinate_path'}
      <section class="graph-area">
        <FractalBlockView store={store} />
      </section>
      <aside class="side-panels">
        <FractalBlockControls store={store} />
      </aside>
    {:else if store.kind === 'reference_record'}
      <section class="reference-notice panel">
        <h3>Reference-only package</h3>
        <p>{store.notice}</p>
        {#if pkg.modeling_status?.next_step}
          <p class="muted"><strong>Next step:</strong> {pkg.modeling_status.next_step}</p>
        {/if}
      </section>
    {/if}
  </main>
{:else}
  <p class="status">No package loaded.</p>
{/if}

<style>
  header {
    padding: 12px 20px;
    border-bottom: 1px solid var(--panel-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  h1 {
    margin: 0;
    font-size: 18px;
  }
  h2 {
    padding: 12px 20px 0;
    margin: 0;
    font-size: 22px;
  }
  .hint {
    padding: 4px 20px 12px;
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }
  .controls {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .mode-toggle {
    display: flex;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    overflow: hidden;
  }
  .mode-toggle button {
    border: none;
    border-radius: 0;
    padding: 4px 10px;
    background: transparent;
    font-size: 12px;
  }
  .mode-toggle button.active {
    background: var(--accent);
    color: white;
  }
  .controls label {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 13px;
    color: var(--muted);
  }
  select {
    background: var(--panel);
    color: var(--text);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    padding: 4px 8px;
  }
  main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 16px;
    padding: 0 20px 20px;
    align-items: start;
  }
  .graph-area {
    height: 70vh;
    min-height: 400px;
  }
  .side-panels {
    display: grid;
    gap: 12px;
  }
  .status {
    padding: 20px;
    color: var(--muted);
  }
  .status.error {
    color: #ef4444;
  }
  .reference-notice {
    grid-column: 1 / -1;
    padding: 24px;
  }
  .reference-notice h3 {
    margin: 0 0 8px 0;
  }
  .muted {
    color: var(--muted);
    font-size: 13px;
  }
  @media (max-width: 900px) {
    main {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
