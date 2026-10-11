import type { PathMazeDefinition, PathState } from '../model/pathMaze'

/** The surface symbol belongs to the PDA stack, not to the player’s copy trail. */
export function copyAddress(model: PathMazeDefinition, state: PathState): string[] {
  return model.surfaceSymbols?.includes(state.address[0]) ? state.address.slice(1) : state.address
}
