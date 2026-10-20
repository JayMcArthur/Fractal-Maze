import type { MazeArtwork } from '../model/pathMaze'

/** Earlier Alice exports kept thumbnail dimensions on native-pixel traces. */
export function artworkDisplayGeometry(artwork: MazeArtwork): Pick<MazeArtwork, 'width' | 'height' | 'bounds'> {
  const earlierBounds = [80, 80, 1292, 1292]
  if (
    artwork.asset === 'references/Maze_Images/Mike_Earnest/Alice_and_the_Hedge_Maze.png' &&
    artwork.width === 1200 && artwork.height === 1200 &&
    artwork.bounds.every((value, index) => value === earlierBounds[index])
  ) return { width: 1452, height: 1452, bounds: [0, 0, 1452, 1452] }
  return artwork
}
