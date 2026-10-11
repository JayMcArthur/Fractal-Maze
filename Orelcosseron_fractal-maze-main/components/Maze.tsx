"use client"

import { useContext } from 'react'
import { MazeContext } from './context/mazeContext'
import Block from './Block'
import Player from './Player'
import Rim from './Rim'
import Tile from './Tile'
import Trophy from './Trophy'

export default function Maze() {
    const mazeData = useContext(MazeContext)
    if (mazeData) {
        return (
            <div className="maze" style={{ width: mazeData.tile_size * (mazeData.rows[0].length / 2 + 1 / 2), height: mazeData.tile_size * (mazeData.rows.length + 1 / 2) }}>
                <Rim>

                    {Object.keys(mazeData.blocks).map(name => <Block key={name} name={name} />)}

                    <Player />

                    {mazeData.trophies.map((_, id) => <Trophy key={id} id={id} />)}

                    {mazeData.rows.map((row, i) =>
                        row.match(/.{2}/g)?.map((_, j) =>
                            <Tile key={i.toString() + "." + j.toString()} row={i} col={j} />
                        )
                    )}
                </Rim>
            </div >
        )
    }
    return (<></>)
}