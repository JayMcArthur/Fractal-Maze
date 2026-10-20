import { solveRepeated } from '../solver/traversal/repeatedSolver'
import type { RepeatedDirectedDefinition } from '../model/repeatedDirected'

self.onmessage = (event: MessageEvent<{ definition: RepeatedDirectedDefinition; limit: number }>) => {
  self.postMessage(solveRepeated(event.data.definition, event.data.limit))
}
