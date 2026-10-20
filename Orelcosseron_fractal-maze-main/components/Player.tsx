import { useContext, useEffect, useState } from "react"
import { MazeContext } from "./context/mazeContext";
import { SessionContext } from "./context/sessionContext";

export default function Player() {
    const mazeData = useContext(MazeContext);
    const sessionContext = useContext(SessionContext);

    const [activity, setActivity] = useState<{ isActive: boolean, transition: string, visibility: "visible" | "hidden" }>({ isActive: false, transition: "", visibility: "visible" })

    const playerSizeRatio = 0.25

    if (mazeData && sessionContext) {

        useEffect(() => {
            sessionContext.setPlayerPos({ row: mazeData.player.row, col: mazeData.player.col })
            sessionContext.setPrevPlayerPos({ row: mazeData.player.row, col: mazeData.player.col })
            sessionContext.setBlockStack(["0"])
            sessionContext.setLines({})
            sessionContext.setIsWin(false)
        }, [mazeData]);

        useEffect(() => {
            const handleKeyDown =
                (e: { key: string }) => {
                    if (sessionContext.isWin || activity.isActive) {
                        return
                    }
                    const directions = {
                        ArrowLeft: {
                            orientation: 1,
                            rowOffset: 0,
                            colOffset: -1
                        },
                        ArrowDown: {
                            orientation: 2,
                            rowOffset: 1,
                            colOffset: 0
                        },
                        ArrowRight: {
                            orientation: 4,
                            rowOffset: 0,
                            colOffset: 1
                        },
                        ArrowUp: {
                            orientation: 8,
                            rowOffset: -1,
                            colOffset: 0
                        }
                    }

                    if (e.key in directions) {
                        const playerRow = sessionContext.playerPos.row
                        const playerCol = sessionContext.playerPos.col

                        // PATH
                        const currentTile = parseInt(mazeData.rows[sessionContext.playerPos.row].slice(2 * sessionContext.playerPos.col, 2 * sessionContext.playerPos.col + 2))
                        for (const [directionKey, direction] of Object.entries(directions)) {
                            if (e.key == directionKey && currentTile & direction.orientation) {
                                setActivity({ isActive: true, transition: "transform 0.1s linear", visibility: "visible" })
                                sessionContext.setPrevPlayerPos(sessionContext.playerPos)
                                sessionContext.setPlayerPos((prevPlayer) => { return { row: prevPlayer.row + direction.rowOffset, col: prevPlayer.col + direction.colOffset } })
                                setTimeout(() => {
                                    setActivity({ isActive: false, transition: "", visibility: "visible" })
                                }, 100);
                                return
                            }
                        }

                        // TELEPORTER
                        if (mazeData.teleporters[playerRow] && mazeData.teleporters[playerRow][playerCol]) {
                            const teleporters = mazeData.teleporters[playerRow][playerCol].signature
                            for (const [directionKey, direction] of Object.entries(directions)) {
                                if (e.key == directionKey && teleporters & direction.orientation) {
                                    const orientation = direction.orientation
                                    if (mazeData.teleporters[playerRow] && mazeData.teleporters[playerRow][playerCol] && mazeData.teleporters[playerRow][playerCol].reach[orientation]) {
                                        const reach = mazeData.teleporters[playerRow][playerCol].reach[orientation]
                                        setActivity({ isActive: true, transition: "transform 0.075s linear", visibility: "visible" })
                                        sessionContext.setPrevPlayerPos(sessionContext.playerPos)
                                        sessionContext.setPlayerPos((prevPlayer) => {
                                            return { row: prevPlayer.row + direction.rowOffset * 0.75, col: prevPlayer.col + direction.colOffset * 0.75 }
                                        })
                                        setTimeout(() => {
                                            setActivity({ isActive: true, transition: "", visibility: "hidden" })
                                            sessionContext.setPrevPlayerPos((prevPlayer) => {
                                                return { row: prevPlayer.row + direction.rowOffset * 0.75, col: prevPlayer.col + direction.colOffset * 0.75 }
                                            })
                                            sessionContext.setPlayerPos({ row: playerRow + direction.rowOffset * (reach - 0.75), col: playerCol + direction.colOffset * (reach - 0.75) })
                                        }, 75);
                                        setTimeout(() => {
                                            setActivity({ isActive: true, transition: "transform 0.075s linear", visibility: "visible" })
                                            sessionContext.setPrevPlayerPos({ row: playerRow + direction.rowOffset * (reach - 0.75), col: playerCol + direction.colOffset * (reach - 0.75) })
                                            sessionContext.setPlayerPos({ row: playerRow + direction.rowOffset * reach, col: playerCol + direction.colOffset * reach })
                                        }, 100 * reach - 75);
                                        setTimeout(() => {
                                            setActivity({ isActive: false, transition: "", visibility: "visible" })
                                        }, 100 * reach);
                                        return
                                    }
                                }
                            }
                        }

                        // LINK
                        if (mazeData.links[playerRow] && mazeData.links[playerRow][playerCol]) {
                            for (const link of mazeData.links[playerRow][playerCol]) {
                                const exit = mazeData.exits[link.exit]
                                for (const [directionKey, direction] of Object.entries(directions)) {
                                    if (e.key == directionKey && exit && exit.orientation == (direction.orientation * 4) % 15) {
                                        setActivity({ isActive: true, transition: "transform 0.075s linear", visibility: "visible" })
                                        sessionContext.setPrevPlayerPos(sessionContext.playerPos)
                                        sessionContext.setPlayerPos((prevPlayer) => {
                                            return { row: prevPlayer.row + direction.rowOffset * 0.75, col: prevPlayer.col + direction.colOffset * 0.75 }
                                        })
                                        setTimeout(() => {
                                            setActivity({ isActive: true, transition: "", visibility: "hidden" })
                                            sessionContext.setPrevPlayerPos((prevPlayer) => {
                                                return { row: prevPlayer.row + direction.rowOffset * 0.75, col: prevPlayer.col + direction.colOffset * 0.75 }
                                            })
                                            sessionContext.setPlayerPos({ row: exit.row - direction.rowOffset * 0.75, col: exit.col - direction.colOffset * 0.75 })
                                        }, 75);
                                        setTimeout(() => {
                                            link.block.forEach((block, i) => setTimeout(() => sessionContext.setBlockStack(bs => [...bs, block]), 350 * i))
                                        }, 100);
                                        setTimeout(() => {
                                            setActivity({ isActive: true, transition: "transform 0.075s linear", visibility: "visible" })
                                            sessionContext.setPrevPlayerPos({ row: exit.row - direction.rowOffset * 0.75, col: exit.col - direction.colOffset * 0.75 })
                                            sessionContext.setPlayerPos({ row: exit.row, col: exit.col })
                                        }, 125 + 350 * link.block.length);
                                        setTimeout(() => {
                                            setActivity({ isActive: false, transition: "", visibility: "visible" })
                                        }, 200 + 350 * link.block.length);
                                        return
                                    }
                                }
                            }
                        }

                        // EXIT
                        const currentBlock = sessionContext.blockStack.length > 1 ? mazeData.blocks[sessionContext.blockStack[sessionContext.blockStack.length - 1]] : null
                        exit_loop:
                        for (const [exitName, exit] of Object.entries(mazeData.exits)) {
                            if (exit && exit.row == sessionContext.playerPos.row && exit.col == sessionContext.playerPos.col) {
                                if (currentBlock && currentBlock.exits[exitName] && currentBlock.exits[exitName].path.reduce((acc, block, i) => { return acc && block == sessionContext.blockStack[sessionContext.blockStack.length - currentBlock.exits[exitName]!.path.length + i] }, true)) {
                                    const currentExit = currentBlock.exits[exitName]
                                    for (const [directionKey, direction] of Object.entries(directions)) {
                                        if (e.key == directionKey && exit.orientation == direction.orientation) {
                                            setActivity({ isActive: true, transition: "transform 0.075s linear", visibility: "visible" })
                                            sessionContext.setPrevPlayerPos(sessionContext.prevPlayerPos)
                                            sessionContext.setPlayerPos((prevPlayer) => {
                                                return { row: prevPlayer.row + direction.rowOffset * 0.75, col: prevPlayer.col + direction.colOffset * 0.75 }
                                            })
                                            setTimeout(() => {
                                                setActivity({ isActive: true, transition: "", visibility: "hidden" })
                                                sessionContext.setPrevPlayerPos((prevPlayer) => {
                                                    return { row: prevPlayer.row + direction.rowOffset * 0.75, col: prevPlayer.col + direction.colOffset * 0.75 }
                                                })
                                                sessionContext.setPlayerPos({ row: currentExit.row - direction.rowOffset * 0.75, col: currentExit.col - direction.colOffset * 0.75 })
                                            }, 75);
                                            setTimeout(() => {
                                                currentExit.path.forEach((_, i) => setTimeout(() => sessionContext.setBlockStack(bs => { return bs.slice(0, -1) }), 350 * i))
                                            }, 100);
                                            setTimeout(() => {
                                                setActivity({ isActive: true, transition: "transform 0.075s linear", visibility: "visible" })
                                                sessionContext.setPrevPlayerPos({ row: currentExit.row - direction.rowOffset * 0.75, col: currentExit.col - direction.colOffset * 0.75 })
                                                sessionContext.setPlayerPos({ row: currentExit.row, col: currentExit.col })
                                            }, 125 + 350 * currentExit.path.length);
                                            setTimeout(() => {
                                                setActivity({ isActive: false, transition: "", visibility: "visible" })
                                            }, 200 + 350 * currentExit.path.length);
                                            break exit_loop
                                        }
                                    }
                                }
                                else if (currentBlock === null && mazeData.trophies.length == 0) {
                                    for (const [directionKey, direction] of Object.entries(directions)) {
                                        if (e.key == directionKey && exit.orientation == direction.orientation) {
                                            setActivity({ isActive: true, transition: "transform 0.1s linear", visibility: "visible" })
                                            sessionContext.setPrevPlayerPos(sessionContext.playerPos)
                                            sessionContext.setPlayerPos((prevPlayer) => { return { row: prevPlayer.row + direction.rowOffset, col: prevPlayer.col + direction.colOffset } })
                                            setTimeout(() => {
                                                setActivity({ isActive: false, transition: "", visibility: "visible" })
                                                sessionContext.setIsWin(true)
                                            }, 100);
                                            break exit_loop
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

            document.addEventListener("keydown", handleKeyDown)

            return () => {
                document.removeEventListener("keydown", handleKeyDown);
            };
        }, [mazeData, sessionContext, activity]);

        return (
            <div className="player" style={{
                position: "absolute", transform: "translate(" + (sessionContext.playerPos.col + 3 / 4 - playerSizeRatio / 2) * mazeData.tile_size + "px, " + (sessionContext.playerPos.row + 3 / 4 - playerSizeRatio / 2) * mazeData.tile_size + "px)", background: mazeData.player.color, width: mazeData.tile_size * playerSizeRatio, height: mazeData.tile_size * playerSizeRatio, borderRadius: mazeData.tile_size * playerSizeRatio / 2, zIndex: 4, visibility: activity.visibility, transition: activity.transition
            }}>
            </div >
        )
    }
    return (<></>)
}