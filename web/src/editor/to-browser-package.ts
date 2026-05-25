import type { BrowserPackage } from '@packages/types';
import { formatAddress } from '@logic-core/address';
import type { EditorModel } from './model';

export function editorModelToBrowserPackage(model: EditorModel): BrowserPackage {
  const ports: Array<{
    id: string;
    point: string;
    context?: string[];
    label?: string;
  }> = [];
  const seenPortIds = new Set<string>();

  const transitions: Array<{
    id: string;
    from_port: string;
    source: string;
    target: string;
    input: string;
  }> = [];

  for (const connection of model.connections) {
    const portId = generatePortId(connection.from, connection.to);
    if (!seenPortIds.has(portId)) {
      seenPortIds.add(portId);
      const entry: { id: string; point: string; context?: string[]; label?: string } = {
        id: portId,
        point: connection.from.point,
        label: connection.to.point,
      };
      if (connection.from.prefix.length > 0) {
        entry.context = [...connection.from.prefix];
      }
      ports.push(entry);
    }
    transitions.push({
      id: connection.id,
      from_port: portId,
      source: formatAddress(connection.from),
      target: formatAddress(connection.to),
      input: connection.to.point,
    });
  }

  const logic = {
    format: 'fmaze-logic-v0' as const,
    id: model.packageId,
    strategy: 'pda_stack',
    source_model: 'port_graph',
    start: model.startJunction,
    goals: [...model.goalJunctions],
    points: model.junctions.map((id) => ({ id })),
    submazes: model.submazes.map((id) => ({ id })),
    ports,
    transitions,
  };

  return {
    format: 'fmaze-browser-v0',
    id: model.packageId,
    title: model.title,
    primary_authoring: 'port_graph',
    source_root: `draft:${model.draftId}`,
    logic,
  };
}

function generatePortId(from: { prefix: readonly string[]; point: string }, to: { prefix: readonly string[]; point: string }): string {
  const fromTag = from.prefix.length === 0 ? from.point : `${from.prefix.join('_')}_${from.point}`;
  const toTag = to.prefix.length === 0 ? to.point : `${to.prefix.join('_')}_${to.point}`;
  return `${fromTag}_to_${toTag}`;
}
