<script lang="ts">
  import { isBlack } from '@logic-core/coordinate-path';
  import type { CoordinateRuntimeStore } from '@runtime/coordinate-store.svelte';

  interface Props {
    store: CoordinateRuntimeStore;
  }

  const { store }: Props = $props();

  const pattern = $derived(store.maze.pattern);
  const currentPath = $derived(store.position);

  const renderDepth = $derived(Math.min(store.depthLimit, 4));

  function cellLabel(x: number, y: number): string {
    return `${x},${y}`;
  }

  function currentAtDepth(depth: number): [number, number] | null {
    if (depth >= currentPath.length) return null;
    const cell = currentPath[depth];
    return [cell[0], cell[1]];
  }

  function pathPrefixMatches(depth: number): boolean {
    return depth < currentPath.length;
  }
</script>

<div class="block-view">
  <div class="header">
    <span class="title">Fractal Block view</span>
    <span class="muted">depth limit: {store.depthLimit}</span>
  </div>

  <div class="grids" style="--unit: {pattern.unit};">
    {#each Array.from({ length: renderDepth }, (_, depth) => depth) as depth (depth)}
      {@const here = currentAtDepth(depth)}
      <div class="grid-wrap">
        <span class="grid-label">depth {depth}</span>
        <div class="grid">
          {#each pattern.cells as row, y (y)}
            {#each row as cell, x (x)}
              {@const isCurrent = here !== null && here[0] === x && here[1] === y}
              {@const isOnPath = pathPrefixMatches(depth)}
              <div
                class="cell"
                class:black={cell === 1}
                class:white={cell === 0}
                class:current={isCurrent}
                title={cellLabel(x, y)}
              ></div>
            {/each}
          {/each}
        </div>
      </div>
    {/each}
  </div>

  {#if store.position.length === 0}
    <p class="muted">No legal starting position at this depth.</p>
  {/if}
</div>

<style>
  .block-view {
    background: #131722;
    padding: 16px;
    border-radius: 6px;
    height: 100%;
    overflow: auto;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 12px;
  }
  .title {
    font-weight: 600;
  }
  .muted {
    color: var(--muted);
    font-size: 12px;
  }
  .grids {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-start;
  }
  .grid-wrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .grid-label {
    font-size: 11px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(var(--unit), 28px);
    grid-template-rows: repeat(var(--unit), 28px);
    gap: 1px;
    background: var(--panel-border);
    padding: 1px;
    border-radius: 4px;
  }
  .cell {
    width: 28px;
    height: 28px;
  }
  .cell.white {
    background: #1f2530;
  }
  .cell.black {
    background: #0c0e14;
  }
  .cell.current {
    box-shadow: inset 0 0 0 3px var(--accent);
  }
</style>
