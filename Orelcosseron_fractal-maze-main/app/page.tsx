"use client"

import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import Hud from '@/components/Hud'
import Maze from '@/components/Maze'
import MazeSelector from '@/components/MazeSelector'
import { SessionContext } from '@/components/context/sessionContext'
import { MazeContext, MazeContextType } from '@/components/context/mazeContext'
import MazeToJSON from '@/src/MazeToJSON'

export default function Home() {
  const [currentMazeName, setCurrentMazeName] = useState("")

  const [blockStack, setBlockStack] = useState(["0"])
  const [playerPos, setPlayerPos] = useState({ row: 0, col: 0 })
  const [prevPlayerPos, setPrevPlayerPos] = useState({ row: 0, col: 0 })
  const [lines, setLines] = useState({})
  const [isWin, setIsWin] = useState(false)
  const sessionContext = { blockStack: blockStack, setBlockStack: setBlockStack, playerPos: playerPos, setPlayerPos: setPlayerPos, prevPlayerPos: prevPlayerPos, setPrevPlayerPos: setPrevPlayerPos, lines: lines, setLines: setLines, isWin: isWin, setIsWin: setIsWin }

  const [mazeData, setMazeData]: [MazeContextType | undefined, Dispatch<SetStateAction<MazeContextType | undefined>>] | undefined = useState<MazeContextType | undefined>(undefined)

  useEffect(() => {
    if (currentMazeName)
      setMazeData(MazeToJSON(currentMazeName.toLowerCase().replaceAll(" ", "_")))
  }, [currentMazeName])

  return (
    <>
      <MazeSelector onChange={(name: string) => setCurrentMazeName(name)} />
      <SessionContext value={sessionContext}>
        <MazeContext value={mazeData}>
          <Hud>
            {mazeData && <Maze />}
          </Hud>
        </MazeContext>
      </SessionContext>
    </>
  )
}