import type { PathMazeDefinition } from '../model/pathMaze'
import { balancedPathSearch } from '../pathMaze/balancedSearch'
import { searchPaths } from '../pathMaze/traversal'

self.onmessage = (
  event: MessageEvent<{ model: PathMazeDefinition; method: 'balanced' | 'bounded'; depth: number }>
) => {
  const { model, method, depth } = event.data
  try {
    if (method === 'balanced') {
      const route = balancedPathSearch(model)
      self.postMessage({
        route,
        message: route
          ? `Finite route found: ${route.edges.length} PDA transitions.`
          : model.allowedRule === 'finite'
            ? 'No finite route exists in this model.'
            : 'No finite route exists in this model. Infinite movement rules require a separate proof.',
      })
    } else {
      const result = searchPaths(model, depth)
      self.postMessage({
        route: result.route,
        message: result.route
          ? `Finite route found: ${result.route.edges.length} PDA transitions.`
          : `${result.visited} states inspected. ${result.limited ? 'Search limits reached; reachability remains unknown.' : 'Reachable states exhausted in this model.'}`,
      })
    }
  } catch (error) {
    self.postMessage({
      route: null,
      message: error instanceof Error ? error.message : 'PDA search failed.',
    })
  }
}
