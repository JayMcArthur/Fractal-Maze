import type { ReplayDocument } from '../../core/replay/ReplayDocument'
import type { PathMazeDefinition } from '../../core/model/pathMaze'
import { sessionPathRoute, pathRouteSession } from '../../core/play/pathSession'
import { portReplaySession } from '../../core/replay/portReplaySession'
import { geometricReplaySession } from '../../core/replay/geometricReplaySession'
import { compilePlayDocument } from './compilePlayDocument'
import { rulePlayDocument } from './rulePlayDocument'

/** Adapt recorded routes for playback without rewriting the snapshot used for export. */
export function prepareReplay(original: ReplayDocument): ReplayDocument {
  const route = original.nativeRoute
  if (
    route &&
    (route.type === 'pathPushdown' || route.type === 'infiniteRule') &&
    !original.playArtwork
  ) {
    const maze = rulePlayDocument(original.maze)
    if (maze) return { ...original, maze }
  }
  if (
    route?.type === 'geometricRecursive' &&
    original.maze.definition.type === 'geometricRecursive'
  ) {
    const maze = compilePlayDocument(original.maze)
    const model = maze.definition as PathMazeDefinition
    const physical = geometricReplaySession(
      original.maze.definition.maze,
      model,
      maze.artwork!,
      route
    )
    return {
      ...original,
      maze,
      nativeRoute: { type: 'pathPushdown' as const, ...sessionPathRoute(physical), physical },
    }
  }
  if (
    route &&
    (route.type === 'pathPushdown' || route.type === 'infiniteRule') &&
    route.proofSteps &&
    !route.physical &&
    original.maze.artwork?.traces.length
  ) {
    const model = original.maze.definition as PathMazeDefinition
    const physical = pathRouteSession(model, original.playArtwork ?? original.maze.artwork, route)
    return {
      ...original,
      nativeRoute: { ...route, physical },
      metrics: { ...original.metrics, totalMoves: physical.moves.length },
    }
  }
  if (
    original.nativeRoute?.type !== 'recursivePorts' ||
    original.maze.definition.type !== 'recursivePorts'
  )
    return original
  const maze = compilePlayDocument(original.maze)
  const model = maze.definition as PathMazeDefinition
  const physical = portReplaySession(
    original.maze.definition,
    model,
    maze.artwork!,
    original.nativeRoute.states
  )
  return {
    ...original,
    maze,
    nativeRoute: { type: 'pathPushdown' as const, ...sessionPathRoute(physical), physical },
  }
}
