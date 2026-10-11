import { useContext } from "react";
import { SessionContext } from "./context/sessionContext";
import { MazeContext } from "./context/mazeContext";
import Pad from "./Pad";

export default function Hud({ children }: { children: any }) {
    const sessionContext = useContext(SessionContext);
    const mazeData = useContext(MazeContext);

    return (
        (sessionContext && mazeData) &&
        <section style={{ width: mazeData.tile_size * (mazeData.rows[0].length / 2 + 1 / 2) }}>
            {!sessionContext.isWin && <h1 id="hud">Position: {sessionContext.blockStack.join("←")}</h1>}
            {sessionContext.isWin && <h1 id="hud">Congratulations, you {mazeData.trophies.length > 0 ? mazeData.trophies.length > 1 ? "reached one of the goals" : "reached the goal" : "escaped"}!</h1>}
            {children}
            <Pad />
        </section>
    )
}