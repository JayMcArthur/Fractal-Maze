import { formatAddress } from '@logic-core/address';
import type { EditorModel } from './model';

export interface EmittedFiles {
  manifest: string;
  logic: string;
}

export function emitEditorPackage(model: EditorModel): EmittedFiles {
  return {
    manifest: emitManifest(model),
    logic: emitLogic(model),
  };
}

function emitManifest(model: EditorModel): string {
  const lines: string[] = [];
  lines.push('format: fmaze-package-v0');
  lines.push(`id: ${quote(model.packageId)}`);
  lines.push(`title: ${quote(model.title)}`);
  lines.push('primary_authoring: port_graph');
  lines.push('');
  lines.push('logic:');
  lines.push('  href: logic.yml');
  lines.push('  format: fmaze-logic-v0');
  lines.push('');
  lines.push('provenance:');
  lines.push('  authored_by: fractal-maze-lab-workbench-editor');
  lines.push(`  authored_at: "${new Date().toISOString()}"`);
  lines.push('');
  return lines.join('\n');
}

function emitLogic(model: EditorModel): string {
  const lines: string[] = [];
  lines.push('format: fmaze-logic-v0');
  lines.push(`id: ${quote(model.packageId)}`);
  lines.push('strategy: pda_stack');
  lines.push('source_model: port_graph');
  lines.push(`start: ${quote(model.startJunction)}`);
  lines.push('goals:');
  for (const goal of model.goalJunctions) {
    lines.push(`  - ${quote(goal)}`);
  }
  lines.push('');
  lines.push('points:');
  for (const junction of model.junctions) {
    lines.push(`  - id: ${quote(junction)}`);
  }
  lines.push('');
  lines.push('submazes:');
  for (const submaze of model.submazes) {
    lines.push(`  - id: ${quote(submaze)}`);
  }
  lines.push('');
  lines.push('ports:');
  const seenPorts = new Set<string>();
  for (const connection of model.connections) {
    const portId = generatePortId(connection.from, connection.to);
    if (seenPorts.has(portId)) continue;
    seenPorts.add(portId);
    lines.push(`  - id: ${quote(portId)}`);
    lines.push(`    point: ${quote(connection.from.point)}`);
    if (connection.from.prefix.length > 0) {
      lines.push('    context:');
      for (const ctx of connection.from.prefix) {
        lines.push(`      - ${quote(ctx)}`);
      }
    }
    lines.push(`    label: ${quote(connection.to.point)}`);
  }
  lines.push('');
  lines.push('transitions:');
  for (const connection of model.connections) {
    const portId = generatePortId(connection.from, connection.to);
    lines.push(`  - id: ${quote(connection.id)}`);
    lines.push(`    from_port: ${quote(portId)}`);
    lines.push(`    source: ${quote(formatAddress(connection.from))}`);
    lines.push(`    target: ${quote(formatAddress(connection.to))}`);
    lines.push(`    input: ${quote(connection.to.point)}`);
  }
  lines.push('');
  return lines.join('\n');
}

function generatePortId(from: { prefix: readonly string[]; point: string }, to: { prefix: readonly string[]; point: string }): string {
  const fromTag = from.prefix.length === 0 ? from.point : `${from.prefix.join('_')}_${from.point}`;
  const toTag = to.prefix.length === 0 ? to.point : `${to.prefix.join('_')}_${to.point}`;
  return `${fromTag}_to_${toTag}`;
}

function quote(value: string): string {
  if (/^[A-Za-z0-9_.:@()#;=-]+$/.test(value) && !value.startsWith('#')) {
    return value;
  }
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function downloadEmittedFiles(model: EditorModel, files: EmittedFiles): void {
  triggerDownload(`${model.packageId}-package.yml`, files.manifest);
  triggerDownload(`${model.packageId}-logic.yml`, files.logic);
}

function triggerDownload(filename: string, body: string): void {
  const blob = new Blob([body], { type: 'application/yaml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
