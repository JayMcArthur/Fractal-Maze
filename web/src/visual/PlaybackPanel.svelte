<script lang="ts">
  import {
    downloadSolutionYaml,
    recordingFromHistory,
    stepsFromInlined,
    type SolutionStep,
  } from '@runtime/solution';
  import type { PortGraphRuntimeStore } from '@runtime/store.svelte';
  import type { InlinedSolution } from '@packages/types';

  interface Props {
    store: PortGraphRuntimeStore;
  }

  const { store }: Props = $props();

  const solutions = $derived(store.pkg.solutions ?? []);
  let selectedSolutionId = $state<string | null>(null);
  let stepIndex = $state(0);
  let playing = $state(false);
  let intervalMs = $state(600);
  let timerId = $state<ReturnType<typeof setInterval> | null>(null);
  let errorMessage = $state<string | null>(null);

  $effect(() => {
    if (solutions.length === 0) {
      selectedSolutionId = null;
    } else if (!selectedSolutionId) {
      selectedSolutionId = solutions[0].id;
    }
  });

  const activeSolution = $derived<InlinedSolution | null>(
    solutions.find((entry) => entry.id === selectedSolutionId) ?? null,
  );
  const steps = $derived<SolutionStep[]>(activeSolution ? stepsFromInlined(activeSolution) : []);

  function selectSolution(event: Event): void {
    const target = event.target as HTMLSelectElement;
    selectedSolutionId = target.value;
    resetPlayback();
  }

  function resetPlayback(): void {
    stopTimer();
    stepIndex = 0;
    store.reset();
    errorMessage = null;
  }

  function applyStep(step: SolutionStep): boolean {
    if (step.transition_id) {
      const result = store.commit(step.transition_id);
      if (!result.ok) {
        errorMessage = result.error ?? 'replay failed';
        return false;
      }
      return true;
    }
    if (step.prove_edge_id) {
      const body = store.defaultProofBody(step.prove_edge_id);
      if (!body) {
        errorMessage = `no default proof body for ${step.prove_edge_id}`;
        return false;
      }
      const result = store.submitProof(step.prove_edge_id, body);
      if (!result.ok) {
        errorMessage = result.errors?.join('; ') ?? 'proof submission failed';
        return false;
      }
      return true;
    }
    if (step.proof_edge_id) {
      const result = store.applyProof(step.proof_edge_id);
      if (!result.ok) {
        errorMessage = result.error ?? 'proof application failed';
        return false;
      }
      return true;
    }
    return true;
  }

  function stepForward(): void {
    if (stepIndex >= steps.length) {
      stopTimer();
      return;
    }
    const ok = applyStep(steps[stepIndex]);
    if (!ok) {
      stopTimer();
      return;
    }
    stepIndex += 1;
    if (stepIndex >= steps.length) {
      stopTimer();
    }
  }

  function stepBackward(): void {
    if (stepIndex <= 0) return;
    store.undo();
    stepIndex -= 1;
  }

  function play(): void {
    if (steps.length === 0) return;
    if (stepIndex >= steps.length) resetPlayback();
    playing = true;
    timerId = setInterval(() => {
      stepForward();
      if (stepIndex >= steps.length) {
        stopTimer();
      }
    }, intervalMs);
  }

  function pause(): void {
    stopTimer();
  }

  function stopTimer(): void {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    playing = false;
  }

  function downloadRecording(): void {
    const timestamp = new Date().toISOString();
    const solution = recordingFromHistory(store.history, {
      mazeId: store.pkg.id,
      recordingId: `recorded_${timestamp.replace(/[:.]/g, '-')}`,
      logicHref: '../logic.yml',
      expectsGoal: store.atGoal,
      submittedProofs: store.submittedProofs,
    });
    downloadSolutionYaml(solution);
  }
</script>

<div class="panel playback">
  <h3>Solution playback</h3>

  {#if solutions.length === 0}
    <p class="muted">No solutions packaged with this maze.</p>
  {:else}
    <label>
      Solution
      <select onchange={selectSolution} value={selectedSolutionId ?? ''}>
        {#each solutions as solution (solution.id)}
          <option value={solution.id}>{solution.id}{solution.expects_goal ? ' ★' : ''}</option>
        {/each}
      </select>
    </label>

    <div class="controls">
      <button onclick={resetPlayback}>⟲ Reset</button>
      <button onclick={stepBackward} disabled={stepIndex === 0}>◀ Back</button>
      {#if playing}
        <button onclick={pause}>⏸ Pause</button>
      {:else}
        <button onclick={play} disabled={steps.length === 0}>▶ Play</button>
      {/if}
      <button onclick={stepForward} disabled={stepIndex >= steps.length}>▶ Step</button>
    </div>

    <label class="speed">
      Speed
      <input
        type="range"
        min="120"
        max="1600"
        step="40"
        bind:value={intervalMs}
      />
      <span class="muted">{intervalMs} ms/step</span>
    </label>

    <p class="status">step {stepIndex} / {steps.length}</p>
    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {/if}
  {/if}

  <hr />
  <h3>Recording</h3>
  <p class="muted">Captures every committed transition + proof step from this session.</p>
  <button class="record-button" onclick={downloadRecording} disabled={store.history.length === 0}>
    Download recording ({store.history.length} steps)
  </button>
</div>

<style>
  .playback {
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
  label {
    display: grid;
    gap: 4px;
    font-size: 12px;
    color: var(--muted);
  }
  select {
    background: var(--panel);
    color: var(--text);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    padding: 4px 8px;
  }
  .controls {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }
  .controls button {
    padding: 6px 4px;
    font-size: 12px;
  }
  .speed {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 6px;
    align-items: center;
  }
  .status {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }
  .error {
    margin: 0;
    color: #ef4444;
    font-size: 12px;
  }
  hr {
    border: none;
    border-top: 1px solid var(--panel-border);
    margin: 8px 0 4px;
  }
  .muted {
    color: var(--muted);
    font-size: 12px;
  }
  .record-button {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
</style>
