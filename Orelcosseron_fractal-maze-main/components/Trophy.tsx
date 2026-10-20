import { useContext } from "react"
import { MazeContext } from "./context/mazeContext";
import { SessionContext } from "./context/sessionContext";

export default function Trophy({ id }: { id: number }) {
    const mazeData = useContext(MazeContext);
    const sessionContext = useContext(SessionContext)
    if (mazeData && sessionContext) {

        const trophy = mazeData.trophies[id]

        const trophySizeRatio = 0.8

        if (sessionContext.blockStack.length == 1) {
            return (
                <>
                    <div style={{
                        position: "absolute", marginLeft: (trophy.col + 3 / 4 - trophySizeRatio / 2) * mazeData.tile_size, marginTop: (trophy.row + 3 / 4 - trophySizeRatio / 4) * mazeData.tile_size, border: "1px solid " + trophy.color, width: mazeData.tile_size * trophySizeRatio, height: mazeData.tile_size * trophySizeRatio / 2, borderRadius: mazeData.tile_size * trophySizeRatio / 2, zIndex: 4, animation: "0.75s infinite trophy_1", animationTimingFunction: "linear"
                    }}></div>
                    <div style={{
                        position: "absolute", marginLeft: (trophy.col + 3 / 4 - trophySizeRatio / 2) * mazeData.tile_size, marginTop: (trophy.row + 3 / 4 - trophySizeRatio / 4) * mazeData.tile_size, border: "1px solid " + trophy.color, width: mazeData.tile_size * trophySizeRatio, height: mazeData.tile_size * trophySizeRatio / 2, borderRadius: mazeData.tile_size * trophySizeRatio / 2, zIndex: 4, animation: "0.75s infinite trophy_2", animationTimingFunction: "linear"
                    }}></div>
                    <div style={{
                        position: "absolute", marginLeft: (trophy.col + 3 / 4 - trophySizeRatio / 2) * mazeData.tile_size, marginTop: (trophy.row + 3 / 4 - trophySizeRatio / 4) * mazeData.tile_size, border: "1px solid " + trophy.color, width: mazeData.tile_size * trophySizeRatio, height: mazeData.tile_size * trophySizeRatio / 2, borderRadius: mazeData.tile_size * trophySizeRatio / 2, zIndex: 4, animation: "0.75s infinite trophy_3", animationTimingFunction: "linear"
                    }}>
                    </div >
                    <div style={{
                        position: "absolute", marginLeft: (trophy.col + 3 / 4 - trophySizeRatio / 2) * mazeData.tile_size, marginTop: (trophy.row + 3 / 4 - trophySizeRatio / 4) * mazeData.tile_size, border: "1px solid " + trophy.color, width: mazeData.tile_size * trophySizeRatio, height: mazeData.tile_size * trophySizeRatio / 2, borderRadius: mazeData.tile_size * trophySizeRatio / 2, zIndex: 4, animation: "0.75s infinite trophy_4", animationTimingFunction: "linear"
                    }}>
                    </div >
                </>
            )
        }
    }
    return (<></>)
}