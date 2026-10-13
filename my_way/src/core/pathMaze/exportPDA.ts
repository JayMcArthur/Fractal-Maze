import type { PathMazeDefinition } from '../model/pathMaze'

/** Stack is written bottom-to-top. ⊥ is a real bottom marker, retained by every transition. */
export function exportPathPDA(model: PathMazeDefinition, title?: string) {
  let bottom = '⊥'
  while (model.copies.includes(bottom)) bottom += '⊥'
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
          evidence: edge.evidence,
        },
      ]
    return [bottom, ...model.copies].map((top) => ({
      from: edge.from,
      input: edge.input,
      pop: top,
      push: edge.operation === 'enter' ? [top, edge.copy] : [top],
      to: edge.to,
      source: edge.id,
      evidence: edge.evidence,
    }))
  })
  return {
    format: 'path-pda/1',
    ...(title ? { title } : {}),
    representationType: model.type,
    allowedRule: model.allowedRule,
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
    providedInput: model.providedInput,
    ...(model.type === 'infiniteRule'
      ? {
          extraMovementRule: model.allowedRule,
          warning:
            'Infinite and Cantor hops are separate checked derivations, not PDA transitions.',
        }
      : {}),
  }
}
