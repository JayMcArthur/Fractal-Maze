import type { BlockRecursiveDefinition } from '../model/blockRecursive'
import { expandBlock, searchBlock } from '../blockMaze/grid'
self.onmessage = (event: MessageEvent<{ definition: BlockRecursiveDefinition; depth: number }>) => {
  self.postMessage(searchBlock(expandBlock(event.data.definition, event.data.depth)))
}
