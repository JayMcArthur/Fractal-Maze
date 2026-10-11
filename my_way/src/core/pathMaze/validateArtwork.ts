import type { MazeArtwork, PathMazeDefinition } from '../model/pathMaze'
import type { ValidationIssue } from '../validate/ValidationResult'
import { reachesGoal, sameState } from './traversal'
import { nearestTracePoint } from './artworkRoutes'

export function validateArtwork(
  artwork: MazeArtwork,
  model: PathMazeDefinition
): ValidationIssue[] {
  const issues = validateArtworkViews(artwork, model)
  const gates = artwork.gates ?? []
  const report = (code: string, message: string, severity: 'warning' | 'error' = 'error') =>
    issues.push({ severity, code, message })
  if (new Set(gates.map((gate) => gate.edge)).size !== gates.length)
    report('ARTWORK_GATE_IDS', 'Each connection needs one source gate binding.')
  const near = (path: string, point: [number, number]) => {
    const hit = nearestTracePoint(
      artwork.traces.filter((trace) => trace.path === path),
      point
    )
    return hit && hit.distance <= artwork.bounds[2] / 100
  }
  for (const gate of gates) {
    const edge = model.connections.find((edge) => edge.id === gate.edge)
    if (!edge) report('ARTWORK_GATE_EDGE', `Source gate ${gate.edge} has no PDA connection.`)
    else if (
      !near(edge.from, gate.from) ||
      !near(edge.to, gate.to) ||
      (gate.arrivalFrom && !near(edge.to, gate.arrivalFrom))
    )
      report(
        'ARTWORK_GATE_PATH',
        `Source gate ${gate.edge} must touch its departure and arrival paths.`
      )
  }
  if (model.connections.some((edge) => !gates.some((gate) => gate.edge === edge.id)))
    report(
      'ARTWORK_PENDING',
      'WIP: place departure and arrival anchors for every connection.',
      'warning'
    )
  for (const finish of artwork.finishes ?? []) {
    if (!reachesGoal(model, finish.state) || !near(finish.state.path, finish.point))
      report('ARTWORK_FINISH', 'Every source finish must touch a declared finish path and address.')
  }
  for (const [name, state, point] of [
    ['entry', model.start, artwork.start],
    ['finish', model.goal, artwork.goal],
    ...(model.alternateGoals ?? []).map(
      (state) =>
        [
          'finish',
          state,
          artwork.finishes?.find((finish) => sameState(state, finish.state))?.point,
        ] as const
    ),
  ] as const) {
    if (state && (!point || !near(state.path, point)))
      report('ARTWORK_PENDING', `WIP: place the source ${name} on its labeled path.`, 'warning')
  }
  return issues
}

function validateArtworkViews(artwork: MazeArtwork, model: PathMazeDefinition): ValidationIssue[] {
  const paths = artwork.views?.flatMap((view) => view.paths) ?? []
  const invalid = new Set(paths).size !== paths.length || paths.some(
    (id) => !model.paths.some((path) => path.id === id)
  ) || artwork.views?.some((view) => {
    const [x, y, width, height] = view.bounds
    return artwork.traces.filter((trace) => view.paths.includes(trace.path)).some(
      (trace) => trace.points.some(([px, py]) => px < x || px > x + width || py < y || py > y + height)
    )
  })
  return invalid ? [{
    severity: 'error', code: 'ARTWORK_VIEW',
    message: 'Source views must name distinct known paths and include all their trace points. Adjust the crop or show the whole artwork.',
  }] : []
}
