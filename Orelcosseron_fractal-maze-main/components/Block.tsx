import { useContext } from "react";
import { MazeContext } from "./context/mazeContext";
import Tile from "./Tile";

export default function Block({ name, stack = [] }: { name: string, stack?: string[] }) {
    const mazeData = useContext(MazeContext);
    if (mazeData && mazeData.blocks[name]) {
        const scale = (mazeData.blocks[name].height / (mazeData.rows.length + 1 / 2))

        return (
            <div style={{
                backgroundColor: mazeData.blocks[name].color, width: mazeData.blocks[name].width * mazeData.tile_size, height: mazeData.blocks[name].height * mazeData.tile_size, position: "absolute", marginLeft: (mazeData.blocks[name].col + 1 / 4) * mazeData.tile_size, marginTop: (mazeData.blocks[name].row + 1 / 4) * mazeData.tile_size, zIndex: 2
            }}>
                {
                    stack.length < 2 &&
                    <div style={{ transform: "scale(" + scale + ")", transformOrigin: "top left" }}>
                        {
                            mazeData.rows.map((row, i) =>
                                row.match(/.{2}/g)?.map((_, j) =>
                                    <Tile key={i.toString() + "." + j.toString()} row={i} col={j} stack={stack.concat([name])} />
                                )
                            )
                        }
                        {Object.keys(mazeData.blocks).map((blockName) => <Block key={blockName} name={blockName} stack={stack.concat([name])} />)}
                    </div>
                }
            </div>
        )
    }
    return (<></>)
}