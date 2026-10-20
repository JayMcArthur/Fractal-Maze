<script lang="ts">
  import type { CoordinateRuntimeStore } from '@runtime/coordinate-store.svelte';
  import type { Direction } from '@logic-core/coordinate-path';

  interface Props {
    store: CoordinateRuntimeStore;
  }

  const { store }: Props = $props();

  const directions: Direction[] = ['north', 'south', 'west', 'east'];

  function canStep(direction: Direction): boolean {
    const entry = store.legal.find((item) => item.direction === direction);
    return !!entry && entry.positions.length > 0;
  }
</script>

<div class="panel">
  <h3>Fractal Block controls</h3>
  <label class="depth">
    Depth limit
    <input
      type="range"
      min="2"
      max="6"
      bind:value={() => store.depthLimit, (value) => store.setDepth(Number(value))}
    />
    <span class="value">{store.depthLimit}</span>
  </label>

  <p class="muted">Starts at this depth: {store.starts.length}</p>

  <div class="moves">
    {#each directions as direction (direction)}
      <button
        onclick={() => store.step(direction)}
        disabled={!canStep(direction) || store.atGoal}
      >
        {direction}
      </button>
    {/each}
  </div>

  <p class="status" class:goal={store.atGoal}>
    {store.atGoal ? 'Exited at the goal edge.' : `Steps taken: ${store.history.length}`}
  </p>
</div>

<style>
  .panel {
    display: grid;
    gap: 8px;
  }
  h3 {
    margin: 0;
    font-size: 14px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .depth {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--muted);
  }
  .depth .value {
    font-weight: 600;
    color: var(--text);
    min-width: 24px;
    text-align: right;
  }
  .moves {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
  .status {
    margin: 4px 0 0 0;
    font-size: 12px;
    color: var(--muted);
  }
  .status.goal {
    color: var(--goal);
    font-weight: 600;
  }
  .muted {
    color: var(--muted);
    font-size: 12px;
    margin: 0;
  }
</style>
