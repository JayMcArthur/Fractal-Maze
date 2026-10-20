import type { HistoryEntry } from './store.svelte';
import type { InlinedSolution } from '@packages/types';

export interface SolutionStep {
  transition_id?: string;
  proof_edge_id?: string;
  prove_edge_id?: string;
  note?: string;
}

export interface RecordedSolution {
  format: 'fmaze-solution-v0';
  id: string;
  maze: string;
  logic: string;
  expects_goal: boolean;
  steps: SolutionStep[];
  provenance?: {
    recorded_by: 'fractal-maze-lab-workbench';
    recorded_at: string;
  };
}

export function recordingFromHistory(
  history: readonly HistoryEntry[],
  options: {
    mazeId: string;
    recordingId: string;
    logicHref?: string;
    expectsGoal: boolean;
    submittedProofs?: ReadonlySet<string>;
  },
): RecordedSolution {
  const steps: SolutionStep[] = [];
  const submitted = options.submittedProofs ?? new Set<string>();
  const includedProofs = new Set<string>();
  for (const entry of history) {
    if (entry.record.stepType === 'proof') {
      if (!includedProofs.has(entry.record.transitionId) && submitted.has(entry.record.transitionId)) {
        steps.push({ prove_edge_id: entry.record.transitionId });
        includedProofs.add(entry.record.transitionId);
      }
      steps.push({ proof_edge_id: entry.record.transitionId });
    } else {
      steps.push({ transition_id: entry.record.transitionId });
    }
  }
  return {
    format: 'fmaze-solution-v0',
    id: options.recordingId,
    maze: options.mazeId,
    logic: options.logicHref ?? '../logic.yml',
    expects_goal: options.expectsGoal,
    steps,
    provenance: {
      recorded_by: 'fractal-maze-lab-workbench',
      recorded_at: new Date().toISOString(),
    },
  };
}

export function recordedSolutionToYaml(solution: RecordedSolution): string {
  const lines: string[] = [];
  lines.push(`format: ${solution.format}`);
  lines.push(`id: ${solution.id}`);
  lines.push(`maze: ${solution.maze}`);
  lines.push(`logic: ${solution.logic}`);
  lines.push(`expects_goal: ${solution.expects_goal}`);
  lines.push('steps:');
  for (const step of solution.steps) {
    if (step.transition_id !== undefined) {
      lines.push(`  - transition_id: ${quoteIfNeeded(step.transition_id)}`);
    } else if (step.prove_edge_id !== undefined) {
      lines.push(`  - prove_edge_id: ${quoteIfNeeded(step.prove_edge_id)}`);
    } else if (step.proof_edge_id !== undefined) {
      lines.push(`  - proof_edge_id: ${quoteIfNeeded(step.proof_edge_id)}`);
    }
    if (step.note) {
      lines.push(`    note: ${quoteIfNeeded(step.note)}`);
    }
  }
  if (solution.provenance) {
    lines.push('provenance:');
    lines.push(`  recorded_by: ${solution.provenance.recorded_by}`);
    lines.push(`  recorded_at: "${solution.provenance.recorded_at}"`);
  }
  lines.push('');
  return lines.join('\n');
}

function quoteIfNeeded(value: string): string {
  if (/^[A-Za-z0-9_.:@()#;=-]+$/.test(value) && !value.startsWith('#')) {
    return value;
  }
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function downloadSolutionYaml(solution: RecordedSolution): void {
  const yaml = recordedSolutionToYaml(solution);
  const blob = new Blob([yaml], { type: 'application/yaml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = solution.provenance?.recorded_at.replace(/[:.]/g, '-') ?? Date.now().toString();
  link.href = url;
  link.download = `${solution.maze}-${timestamp}.solution.yml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function stepsFromInlined(solution: InlinedSolution): SolutionStep[] {
  return solution.steps.map((step) => {
    if ('transition_id' in step) return { transition_id: step.transition_id, note: step.note };
    if ('prove_edge_id' in step) return { prove_edge_id: step.prove_edge_id, note: step.note };
    return { proof_edge_id: step.proof_edge_id, note: step.note };
  });
}
