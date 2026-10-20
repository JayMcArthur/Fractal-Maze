
import { useContext, useEffect, useState } from "react"
import { MazeContext } from "./context/mazeContext";
import { SessionContext } from "./context/sessionContext";

export default function Rim({ children }: { children: any }) {
    const mazeData = useContext(MazeContext);
    const sessionContext = useContext(SessionContext);

    const [activity, setActivity] = useState({ zoom: 1, transition: "", translateRight: 0, translateBottom: 0, origin: "center" })

    const [formerStack, setFormerStack] = useState(["0"])

    const [color, setColor] = useState("white")

    if (sessionContext && mazeData && mazeData.rows && mazeData.rows[0]) {

        const mazeCenterX = (mazeData.rows[0].length / 4 + 1 / 4) * mazeData.tile_size
        const mazeCenterY = (mazeData.rows.length / 2 + 1 / 4) * mazeData.tile_size

        useEffect(() => {
            if (sessionContext.blockStack.length > 0) {
                if (sessionContext.blockStack[sessionContext.blockStack.length - 1] == "0") {
                    setColor(mazeData.outside_color)
                }
                else {
                    for (const [block_name, block] of Object.entries(mazeData.blocks)) {
                        if (block && block_name == sessionContext.blockStack[sessionContext.blockStack.length - 1]) {
                            setTimeout(() => {
                                setColor(block.color)
                            }, 300);
                            break
                        }
                    }
                }
                if (formerStack.length < sessionContext.blockStack.length) {
                    const enteringBlock = mazeData.blocks[sessionContext.blockStack[sessionContext.blockStack.length - 1]]
                    if (enteringBlock) {
                        const blockCenterX = (enteringBlock.col + 1 / 4 + enteringBlock.width / 2) * mazeData.tile_size
                        const blockCenterY = (enteringBlock.row + 1 / 4 + enteringBlock.height / 2) * mazeData.tile_size
                        setActivity({ zoom: (mazeData.rows.length + 1 / 2) / enteringBlock.height, transition: "transform 0.3s", translateRight: (mazeCenterX - blockCenterX), translateBottom: (mazeCenterY - blockCenterY), origin: blockCenterX + "px " + blockCenterY + "px" })
                        setTimeout(() => {
                            setActivity({ zoom: 1, transition: "", translateRight: 0, translateBottom: 0, origin: "center" })
                        }, 350);
                    }
                }
                else if (formerStack.length > sessionContext.blockStack.length) {
                    const exitingBlock = mazeData.blocks[formerStack[formerStack.length - 1]]
                    if (exitingBlock) {
                        const blockCenterX = (exitingBlock.col + 1 / 4 + exitingBlock.width / 2) * mazeData.tile_size
                        const blockCenterY = (exitingBlock.row + 1 / 4 + exitingBlock.height / 2) * mazeData.tile_size
                        setActivity({ zoom: (mazeData.rows.length + 1 / 2) / exitingBlock.height, transition: "", translateRight: (mazeCenterX - blockCenterX), translateBottom: (mazeCenterY - blockCenterY), origin: blockCenterX + "px " + blockCenterY + "px" })
                        setTimeout(() => {
                            setActivity({ zoom: 1, transition: "transform 0.3s", translateRight: 0, translateBottom: 0, origin: blockCenterX + "px " + blockCenterY + "px" })
                        }, 50);
                        setTimeout(() => {
                            setActivity({ zoom: 1, transition: "", translateRight: 0, translateBottom: 0, origin: "center" })
                        }, 350);
                    }
                }
                setFormerStack(sessionContext.blockStack)
            }
        }, [sessionContext.blockStack])

        return (
            <div style={{ transform: "translate(" + activity.translateRight + "px, " + activity.translateBottom + "px)", transition: activity.transition }}>
                <div style={{ transform: "scale(" + activity.zoom + ")", transition: activity.transition, transformOrigin: activity.origin }}>
                    <div style={{ position: "absolute", border: mazeData.tile_size / 4 + "px solid " + color, width: mazeData.tile_size * (mazeData.rows[0].length / 2 + 1 / 2), height: mazeData.tile_size * (mazeData.rows.length + 1 / 2), zIndex: 2 }}>
                    </div>
                    {children}
                </div>
            </div>
        )
    }
    return (<></>)
}