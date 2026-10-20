import type { PathConnection, PathMazeDefinition } from '../model/pathMaze'

function endpoint(model: PathMazeDefinition, text: string) {
  const path = model.paths.find(path => path.id === text)
  if (path) return { path: path.id, copy: '' }
  const labels = model.paths.filter(path => path.label === text)
  if (labels.length === 1) return { path: labels[0].id, copy: '' }
  const matches = model.copies.flatMap(copy => {
    if (!text.startsWith(copy + '.')) return []
    const name = text.slice(copy.length + 1)
    const direct = model.paths.find(path => path.id === name)
    const paths = direct ? [direct] : model.paths.filter(path => path.label === name)
    return paths.map(path => ({ path: path.id, copy }))
  })
  if (matches.length === 1) return matches[0]
  throw new Error(`Unknown or ambiguous path “${text}”. Use a path ID, or Copy.Path for one boundary.`)
}

/** One declared copy boundary per line; never discard a multi-copy context guard. */
export function connectionsFromText(model: PathMazeDefinition, text: string, evidence: string): PathConnection[] {
  if (text.length > 20000) throw new Error('Enter at most 20,000 characters at once.')
  const connections: PathConnection[] = []
  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    if (!line.trim()) return
    try {
      const match = /^\s*(.+?)\s*(<->|↔|->|→)\s*(.+?)\s*$/.exec(line)
      if (!match) throw new Error('Use “1 -> A.2”, “A.2 -> 1” or “1 <-> 2”.')
      const from = endpoint(model, match[1]), to = endpoint(model, match[3])
      if (from.copy && to.copy) throw new Error('Use one copy boundary per line; both ends cannot have copy prefixes.')
      const forward: PathConnection = {
        id: crypto.randomUUID(), from: from.path, to: to.path,
        operation: from.copy ? 'exit' : to.copy ? 'enter' : 'walk',
        copy: from.copy || to.copy, input: '', evidence,
      }
      connections.push(forward)
      if (match[2] === '<->' || match[2] === '↔') connections.push({
        ...forward, id: crypto.randomUUID(), from: to.path, to: from.path,
        operation: forward.operation === 'enter' ? 'exit' : forward.operation === 'exit' ? 'enter' : 'walk',
      })
    } catch (error) {
      throw new Error(`Line ${index + 1}: ${error instanceof Error ? error.message : 'Invalid connection.'}`)
    }
  })
  if (!connections.length) throw new Error('Enter at least one connection.')
  return connections
}
