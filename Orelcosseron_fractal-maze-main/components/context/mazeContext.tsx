import { Context, createContext } from 'react';

export interface MazeContextType {
    tile_size: number,
    outside_color: string,
    background_color: string,
    path_color: string,
    line_color: string,
    teleporters: NodeJS.Dict<NodeJS.Dict<{ signature: number, reach: NodeJS.Dict<number> }>>,
    blocks: NodeJS.Dict<{ row: number, col: number, width: number, height: number, color: string, exits: NodeJS.Dict<{ row: number, col: number, path: string[] }> }>,
    links: NodeJS.Dict<NodeJS.Dict<Array<{ block: string[], exit: string }>>>,
    exits: NodeJS.Dict<{ orientation: number, row: number, col: number }>,
    player: { row: number, col: number, color: string },
    trophies: Array<{ row: number, col: number, color: string }>,
    rows: string[]
}

export const MazeContext: Context<MazeContextType | undefined> = createContext<MazeContextType | undefined>(undefined)