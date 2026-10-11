import type { PathMazeDefinition } from '../model/pathMaze'

/** Stack is written bottom-to-top. ⊥ is a real bottom marker, retained by every transition. */
export function exportPathPDA(model: PathMazeDefinition) {
  const bottom = '⊥'
  const transitions = model.connections.flatMap((edge) => {
    if (edge.operation === 'exit')
      return [
        {
          from: edge.from,
          input: edge.input,
          pop: edge.copy,
          push: [] as string[],
          to: edge.to,
          source: edge.id,
        },
      ]
    return [bottom, ...model.copies].map((top) => ({
      from: edge.from,
      input: edge.input,
      pop: top,
      push: edge.operation === 'enter' ? [top, edge.copy] : [top],
      to: edge.to,
      source: edge.id,
    }))
  })
  return {
    format: 'path-pda/1',
    review: model.review,
    semantics:
      'Nondeterministic finite path traversal; empty input is epsilon; push arrays are bottom-to-top.',
    states: model.paths,
    inputAlphabet: [...new Set(model.connections.map((edge) => edge.input).filter(Boolean))],
    stackAlphabet: [bottom, ...model.copies],
    bottom,
    surfaceSymbols: model.surfaceSymbols,
    start: model.start,
    goal: model.goal,
    alternateGoals: model.alternateGoals,
    acceptance:
      'Any declared finish path at its exact copy address; surface acceptance requires only the bottom marker.',
    transitions,
    notes: model.notes,
    ...(model.type === 'infiniteRule'
      ? {
          extraMovementRule: model.allowedRule,
          warning:
            'Infinite and Cantor hops are separate checked derivations, not PDA transitions.',
        }
      : {}),
  }
}
