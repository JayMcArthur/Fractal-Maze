import { Context, createContext, Dispatch, SetStateAction } from 'react';

interface SessionContextType {
    blockStack: string[],
    setBlockStack: Dispatch<SetStateAction<string[]>>,
    playerPos: {
        row: number,
        col: number
    },
    setPlayerPos: Dispatch<SetStateAction<{
        row: number,
        col: number
    }>>,
    prevPlayerPos: {
        row: number,
        col: number
    },
    setPrevPlayerPos: Dispatch<SetStateAction<{
        row: number,
        col: number
    }>>,
    lines: NodeJS.Dict<NodeJS.Dict<NodeJS.Dict<{ w: boolean, s: boolean, e: boolean, n: boolean }>>>,
    setLines: Dispatch<SetStateAction<NodeJS.Dict<NodeJS.Dict<NodeJS.Dict<{ w: boolean, s: boolean, e: boolean, n: boolean }>>>>>,
    isWin: boolean,
    setIsWin: Dispatch<SetStateAction<boolean>>
}

export const SessionContext: Context<SessionContextType | undefined> = createContext<SessionContextType | undefined>(undefined)