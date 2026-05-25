<script lang="ts">
  import { formatAddress } from '@logic-core/index';
  import type { Transition } from '@logic-core/index';
  import type { PortGraphRuntimeStore } from '@runtime/store.svelte';

  interface Props {
    store: PortGraphRuntimeStore;
    onSelect?: (transition: Transition) => void;
  }

  const { store, onSelect }: Props = $props();

  const layout = $derived(store.pkg.auto_graph_layout);
  const points = $derived(store.graph.points);
  const pointLabels = $derived(new Map(points.map((point) => [point.id, point.label ?? point.id])));
  const goals = $derived(new Set(store.graph.goals.map((goal) => goal.point)));
  const visited = $derived(new Set(store.history.map((entry) => entry.after.address.point)));
  const legalTargets = $derived(
    new Set(store.legal.map((transition) => transition.target.point)),
  );
  const currentPoint = $derived(store.state.address.point);

  const padding = 40;
  const viewBox = $derived(layoutViewBox());

  function layoutViewBox(): string {
    if (!layout) return '0 0 600 400';
    const xs = Object.values(layout.points).map((entry) => entry.x);
    const ys = Object.values(layout.points).map((entry) => entry.y);
    if (xs.length === 0 || ys.length === 0) return '0 0 600 400';
    const minX = Math.min(...xs) - padding;
    const maxX = Math.max(...xs) + padding;
    const minY = Math.min(...ys) - padding;
    const maxY = Math.max(...ys) + padding;
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }

  function transitionsForPoint(pointId: string): Transition[] {
    return store.legal.filter((transition) => transition.target.point !== pointId);
  }
</script>

{#if layout}
  <svg class="graph" {viewBox} preserveAspectRatio="xMidYMid meet">
    {#each store.graph.transitions as transition}
      {@const source = layout.points[transition.source.point]}
      {@const target = layout.points[transition.target.point]}
      {#if source && target && transition.source.point !== transition.target.point}
        <line
          class="edge"
          x1={source.x}
          y1={source.y}
          x2={target.x}
          y2={target.y}
        />
      {/if}
    {/each}

    {#each Object.entries(layout.points) as [pointId, position]}
      {@const isCurrent = pointId === currentPoint}
      {@const isGoal = goals.has(pointId)}
      {@const wasVisited = visited.has(pointId)}
      {@const isReachable = legalTargets.has(pointId)}
      <g class="point" class:current={isCurrent} class:goal={isGoal} class:visited={wasVisited} class:reachable={isReachable}>
        <circle cx={position.x} cy={position.y} r={isCurrent ? 22 : 16} />
        <text x={position.x} y={position.y + 5} text-anchor="middle">
          {pointLabels.get(pointId) ?? pointId}
        </text>
      </g>
    {/each}

    {#each store.legal as transition}
      {@const source = layout.points[transition.source.point]}
      {@const target = layout.points[transition.target.point]}
      {#if source && target}
        <line
          class="legal-edge"
          x1={source.x}
          y1={source.y}
          x2={target.x}
          y2={target.y}
        />
        <circle
          class="activation"
          cx={(source.x + target.x) / 2}
          cy={(source.y + target.y) / 2}
          r={9}
          onclick={() => onSelect?.(transition)}
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect?.(transition);
            }
          }}
          tabindex="0"
          role="button"
          aria-label={`Apply ${transition.label ?? transition.id}`}
        />
      {/if}
    {/each}
  </svg>
{:else}
  <div class="empty">No auto graph layout available for this package.</div>
{/if}

<style>
  .graph {
    width: 100%;
    height: 100%;
    background: #131722;
    border-radius: 6px;
  }
  .edge {
    stroke: #2d3344;
    stroke-width: 1.5;
  }
  .legal-edge {
    stroke: var(--accent);
    stroke-width: 2.5;
    stroke-dasharray: 5 4;
    opacity: 0.75;
  }
  .point circle {
    fill: var(--panel);
    stroke: var(--panel-border);
    stroke-width: 2;
    transition: r 120ms ease;
  }
  .point text {
    fill: var(--text);
    font-size: 14px;
    font-weight: 600;
    pointer-events: none;
  }
  .point.visited circle {
    fill: rgba(192, 132, 252, 0.18);
    stroke: var(--history);
  }
  .point.reachable circle {
    stroke: var(--accent);
  }
  .point.goal circle {
    stroke: var(--goal);
    stroke-width: 3;
  }
  .point.current circle {
    fill: var(--accent-soft);
    stroke: var(--accent);
    stroke-width: 3;
  }
  .activation {
    fill: var(--accent);
    stroke: white;
    stroke-width: 1.5;
    cursor: pointer;
    opacity: 0.9;
  }
  .activation:hover, .activation:focus {
    opacity: 1;
    r: 12;
    outline: none;
  }
  .empty {
    padding: 20px;
    color: var(--muted);
    text-align: center;
  }
</style>
