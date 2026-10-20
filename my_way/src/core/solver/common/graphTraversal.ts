import type { GraphLabeledDefinition, SubmazeNode, Portal } from '../../model/graphLabeled'

export function graphPortals(root: SubmazeNode): Portal[] {
  return [...root.portals, ...root.children.flatMap(graphPortals)]
}
/** An undirected declaration supplies its reverse edge; one-way declarations don't. */
export function graphChoices(def: GraphLabeledDefinition, current: string): string[] {
  const portals = graphPortals(def.root)
  return [...new Set([
    ...(portals.find((portal) => portal.id === current)?.connectsTo ?? []),
    ...portals.filter((portal) => !portal.isOneWay && portal.connectsTo.includes(current)).map((portal) => portal.id),
  ])]
}
