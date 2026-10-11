import { useContext } from "react";
import { SessionContext } from "./context/sessionContext";
import { MazeContext } from "./context/mazeContext";

export default function Pad() {
    const sessionContext = useContext(SessionContext);
    const mazeData = useContext(MazeContext);

    if (sessionContext && mazeData) {
        let handleUp = () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: "ArrowUp" }));
        }
        let handleLeft = () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: "ArrowLeft" }));
        }
        let handleRight = () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: "ArrowRight" }));
        }
        let handleDown = () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: "ArrowDown" }));
        }
        let handleReset = () => {
            sessionContext.blockStack.forEach((_, i) => { setTimeout(() => { sessionContext.setBlockStack(bs => { if (bs.length > 1) { return bs.slice(0, -1) } else { return bs } }) }, 350 * i) })
            sessionContext.setPlayerPos({ row: mazeData.player.row, col: mazeData.player.col })
            sessionContext.setPrevPlayerPos({ row: mazeData.player.row, col: mazeData.player.col })
            setTimeout(() => {
                sessionContext.setLines({})
                sessionContext.setIsWin(false)
            }, 350 * sessionContext.blockStack.length + 50)
        }
        return (
            <div className="pad">
                <div>
                    <button id="pad_button" onClick={handleUp} style={{ width: mazeData.tile_size / 2, height: mazeData.tile_size / 2 }}>&#9650;</button>
                </div>
                <div className="pad_middle_row" style={{ width: 3 * mazeData.tile_size / 2 }}>
                    <button id="pad_button" onClick={handleLeft} style={{ width: mazeData.tile_size / 2, height: mazeData.tile_size / 2 }}>&#9664;</button>
                    <button id="pad_button" onClick={handleReset} style={{ width: mazeData.tile_size / 2, height: mazeData.tile_size / 2 }}>&#10226;</button>
                    <button id="pad_button" onClick={handleRight} style={{ width: mazeData.tile_size / 2, height: mazeData.tile_size / 2 }}>&#9654;</button>
                </div>
                <div>
                    <button id="pad_button" onClick={handleDown} style={{ width: mazeData.tile_size / 2, height: mazeData.tile_size / 2 }}>&#9660;</button>
                </div>
            </div >
        )
    }
    return (<></>)
}