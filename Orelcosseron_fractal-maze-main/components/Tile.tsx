import { useContext, useEffect, useState } from "react"
import { MazeContext } from "./context/mazeContext";
import { SessionContext } from "./context/sessionContext";

export default function Tile({ row, col, stack = [] }: { row: number, col: number, stack?: string[] }) {
    const mazeData = useContext(MazeContext);
    const sessionContext = useContext(SessionContext)

    if (mazeData && sessionContext) {

        const checkPath = (path: string[]) => {
            const pathInternal = stackInternal.split(".")
            return path.reduce((acc, block, i) => { return acc && block == pathInternal[pathInternal.length - path.length + i] }, true)
        }

        const [isLeaving, setIsLeaving] = useState(false);

        const [stackInternal, setStackInternal] = useState(stack.length > 0 ? "0." + stack.join(".") : "0");

        const type = parseInt(mazeData.rows[row].slice(2 * col, 2 * col + 2))

        const teleporters = (mazeData.teleporters[row] && mazeData.teleporters[row][col]) ? mazeData.teleporters[row][col] : { signature: 0, reach: {} }

        let links = 0
        if (mazeData.links[row] && mazeData.links[row][col]) {
            mazeData.links[row][col].forEach(link => {
                const exit = mazeData.exits[link.exit]?.orientation
                if (exit == 1) {
                    links |= 4
                }
                else if (exit == 2) {
                    links |= 8
                }
                else if (exit == 4) {
                    links |= 1
                }
                else if (exit == 8) {
                    links |= 2
                }
            })
        }

        let exits = 0
        for (const [exitName, exit] of Object.entries(mazeData.exits)) {
            const stackLength = sessionContext.blockStack.length + stack.length
            const currentBlock = stack.length > 0 ? stack[stack.length - 1] : sessionContext.blockStack[sessionContext.blockStack.length - 1]
            if ((stackLength == 1 && mazeData.trophies.length == 0 || stackLength > 1 && mazeData.blocks[currentBlock] && mazeData.blocks[currentBlock].exits[exitName] && checkPath(mazeData.blocks[currentBlock].exits[exitName].path)) && exit && exit.row == row && exit.col == col) {
                exits |= exit.orientation
            }
        }

        const isStartingPosition = (mazeData.player.row == row && mazeData.player.col == col)

        let isTrophy = false
        for (const trophy of mazeData.trophies) {
            if (trophy.row == row && trophy.col == col) {
                isTrophy = true
                break
            }
        }

        const pathW = <div style={{ background: mazeData.path_color, width: mazeData.tile_size / 4, height: mazeData.tile_size / 2, position: "absolute", marginLeft: 0, marginTop: 1 / 4 * mazeData.tile_size }}></div>
        const pathS = <div style={{ background: mazeData.path_color, width: mazeData.tile_size / 2, height: mazeData.tile_size / 4, position: "absolute", marginLeft: mazeData.tile_size / 4, marginTop: 3 / 4 * mazeData.tile_size }}></div>
        const pathE = <div style={{ background: mazeData.path_color, width: mazeData.tile_size / 4, height: mazeData.tile_size / 2, position: "absolute", marginLeft: 3 / 4 * mazeData.tile_size, marginTop: 1 / 4 * mazeData.tile_size }}></div>
        const pathN = <div style={{ background: mazeData.path_color, width: mazeData.tile_size / 2, height: mazeData.tile_size / 4, position: "absolute", marginLeft: mazeData.tile_size / 4, marginTop: 0 }}></div>

        const teleporterW = <div style={{ background: "linear-gradient(to left, " + mazeData.path_color + ", oklch(from " + mazeData.path_color + " clamp(0, l - 0.2, 1) c h))", width: mazeData.tile_size / 2, height: mazeData.tile_size / 2, position: "absolute", marginLeft: -mazeData.tile_size / 4, marginTop: mazeData.tile_size / 4, zIndex: 2 }}></div>
        const teleporterS = <div style={{ background: "linear-gradient(to bottom, " + mazeData.path_color + ", oklch(from " + mazeData.path_color + " clamp(0, l - 0.2, 1) c h))", width: mazeData.tile_size / 2, height: mazeData.tile_size / 2, position: "absolute", marginLeft: mazeData.tile_size / 4, marginTop: 3 / 4 * mazeData.tile_size, zIndex: 2 }}></div>
        const teleporterE = <div style={{ background: "linear-gradient(to right, " + mazeData.path_color + ", oklch(from " + mazeData.path_color + " clamp(0, l - 0.2, 1) c h))", width: mazeData.tile_size / 2, height: mazeData.tile_size / 2, position: "absolute", marginLeft: 3 / 4 * mazeData.tile_size, marginTop: mazeData.tile_size / 4, zIndex: 2 }}></div>
        const teleporterN = <div style={{ background: "linear-gradient(to top, " + mazeData.path_color + ", oklch(from " + mazeData.path_color + " clamp(0, l - 0.2, 1) c h))", width: mazeData.tile_size / 2, height: mazeData.tile_size / 2, position: "absolute", marginLeft: mazeData.tile_size / 4, marginTop: -mazeData.tile_size / 4, zIndex: 2 }}></div>

        const linkW = <div style={{ background: "linear-gradient(to left, " + mazeData.path_color + ", rgb(from " + mazeData.path_color + " r g b / 0))", width: mazeData.tile_size / 2, height: mazeData.tile_size / 2, position: "absolute", marginLeft: -mazeData.tile_size / 4, marginTop: mazeData.tile_size / 4, zIndex: 2 }}></div>
        const linkS = <div style={{ background: "linear-gradient(to bottom, " + mazeData.path_color + ", rgb(from " + mazeData.path_color + " r g b / 0))", width: mazeData.tile_size / 2, height: mazeData.tile_size / 2, position: "absolute", marginLeft: mazeData.tile_size / 4, marginTop: 3 / 4 * mazeData.tile_size, zIndex: 2 }}></div>
        const linkE = <div style={{ background: "linear-gradient(to right, " + mazeData.path_color + ", rgb(from " + mazeData.path_color + " r g b / 0))", width: mazeData.tile_size / 2, height: mazeData.tile_size / 2, position: "absolute", marginLeft: 3 / 4 * mazeData.tile_size, marginTop: mazeData.tile_size / 4, zIndex: 2 }}></div>
        const linkN = <div style={{ background: "linear-gradient(to top, " + mazeData.path_color + ", rgb(from " + mazeData.path_color + " r g b / 0))", width: mazeData.tile_size / 2, height: mazeData.tile_size / 2, position: "absolute", marginLeft: mazeData.tile_size / 4, marginTop: -mazeData.tile_size / 4, zIndex: 2 }}></div>

        const pathExitW = <div key="pathExit" style={{ background: mazeData.path_color, width: mazeData.tile_size / 2, height: mazeData.tile_size / 2, position: "absolute", marginLeft: -mazeData.tile_size / 4, marginTop: mazeData.tile_size / 4, zIndex: 2 }}></div>
        const pathExitS = <div key="pathExit" style={{ background: mazeData.path_color, width: mazeData.tile_size / 2, height: mazeData.tile_size / 2, position: "absolute", marginLeft: mazeData.tile_size / 4, marginTop: 3 / 4 * mazeData.tile_size, zIndex: 2 }}></div>
        const pathExitE = <div key="pathExit" style={{ background: mazeData.path_color, width: mazeData.tile_size / 2, height: mazeData.tile_size / 2, position: "absolute", marginLeft: 3 / 4 * mazeData.tile_size, marginTop: mazeData.tile_size / 4, zIndex: 2 }}></div>
        const pathExitN = <div key="pathExit" style={{ background: mazeData.path_color, width: mazeData.tile_size / 2, height: mazeData.tile_size / 2, position: "absolute", marginLeft: mazeData.tile_size / 4, marginTop: -mazeData.tile_size / 4, zIndex: 2 }}></div>

        const backgroundExitW = <div key="backgroundExit" style={{ background: mazeData.background_color, width: mazeData.tile_size / 4, height: mazeData.tile_size, position: "absolute", marginLeft: -mazeData.tile_size / 4, marginTop: 0, zIndex: 2 }}></div>
        const backgroundExitS = <div key="backgroundExit" style={{ background: mazeData.background_color, width: mazeData.tile_size, height: mazeData.tile_size / 4, position: "absolute", marginLeft: 0, marginTop: mazeData.tile_size, zIndex: 2 }}></div>
        const backgroundExitE = <div key="backgroundExit" style={{ background: mazeData.background_color, width: mazeData.tile_size / 4, height: mazeData.tile_size, position: "absolute", marginLeft: mazeData.tile_size, marginTop: 0, zIndex: 2 }}></div>
        const backgroundExitN = <div key="backgroundExit" style={{ background: mazeData.background_color, width: mazeData.tile_size, height: mazeData.tile_size / 4, position: "absolute", marginLeft: 0, marginTop: -mazeData.tile_size / 4, zIndex: 2 }}></div>

        const exitW = [backgroundExitW, pathExitW]
        const exitS = [backgroundExitS, pathExitS]
        const exitE = [backgroundExitE, pathExitE]
        const exitN = [backgroundExitN, pathExitN]

        const central_path = <div style={{ background: mazeData.path_color, width: mazeData.tile_size / 2, height: mazeData.tile_size / 2, position: "absolute", marginLeft: mazeData.tile_size / 4, marginTop: mazeData.tile_size / 4 }}></div>

        const roundTileRatio = 1
        const roundTile = <div style={{ background: mazeData.path_color, width: mazeData.tile_size * roundTileRatio, height: mazeData.tile_size * roundTileRatio, position: "absolute", borderRadius: mazeData.tile_size * roundTileRatio / 2, marginLeft: mazeData.tile_size * (1 - roundTileRatio) / 2, marginTop: mazeData.tile_size * (1 - roundTileRatio) / 2 }}></div>

        const lineW = <div style={{ background: mazeData.line_color, width: mazeData.tile_size / 2, height: 1, position: "absolute", marginLeft: 0, marginTop: mazeData.tile_size / 2, zIndex: 3 }}></div>
        const lineS = <div style={{ background: mazeData.line_color, width: 1, height: mazeData.tile_size / 2, position: "absolute", marginLeft: mazeData.tile_size / 2, marginTop: mazeData.tile_size / 2, zIndex: 3 }}></div>
        const lineE = <div style={{ background: mazeData.line_color, width: mazeData.tile_size / 2, height: 1, position: "absolute", marginLeft: mazeData.tile_size / 2, marginTop: mazeData.tile_size / 2, zIndex: 3 }}></div>
        const lineN = <div style={{ background: mazeData.line_color, width: 1, height: mazeData.tile_size / 2, position: "absolute", marginLeft: mazeData.tile_size / 2, marginTop: 0, zIndex: 3 }}></div>

        const lineTeleporterW = <div style={{ background: "linear-gradient(to left, " + mazeData.line_color + ", oklch(from " + mazeData.line_color + " clamp(0, l - 0.2, 1) c h))", width: mazeData.tile_size * 3 / 4, height: 1, position: "absolute", marginLeft: -mazeData.tile_size / 4, marginTop: mazeData.tile_size / 2, zIndex: 3 }}></div>
        const lineTeleporterS = <div style={{ background: "linear-gradient(to bottom, " + mazeData.line_color + ", oklch(from " + mazeData.line_color + " clamp(0, l - 0.2, 1) c h))", width: 1, height: mazeData.tile_size * 3 / 4, position: "absolute", marginLeft: mazeData.tile_size / 2, marginTop: mazeData.tile_size / 2, zIndex: 3 }}></div>
        const lineTeleporterE = <div style={{ background: "linear-gradient(to right, " + mazeData.line_color + ", oklch(from " + mazeData.line_color + " clamp(0, l - 0.2, 1) c h))", width: mazeData.tile_size * 3 / 4, height: 1, position: "absolute", marginLeft: mazeData.tile_size / 2, marginTop: mazeData.tile_size / 2, zIndex: 3 }}></div>
        const lineTeleporterN = <div style={{ background: "linear-gradient(to top, " + mazeData.line_color + ", oklch(from " + mazeData.line_color + " clamp(0, l - 0.2, 1) c h))", width: 1, height: mazeData.tile_size * 3 / 4, position: "absolute", marginLeft: mazeData.tile_size / 2, marginTop: -mazeData.tile_size / 4, zIndex: 3 }}></div>

        const lineLinkW = <div style={{ background: "linear-gradient(to left, " + mazeData.line_color + ", rgb(from " + mazeData.line_color + " r g b / 0))", width: mazeData.tile_size * 3 / 4, height: 1, position: "absolute", marginLeft: -mazeData.tile_size / 4, marginTop: mazeData.tile_size / 2, zIndex: 3 }}></div>
        const lineLinkS = <div style={{ background: "linear-gradient(to bottom, " + mazeData.line_color + ", rgb(from " + mazeData.line_color + " r g b / 0))", width: 1, height: mazeData.tile_size * 3 / 4, position: "absolute", marginLeft: mazeData.tile_size / 2, marginTop: mazeData.tile_size / 2, zIndex: 3 }}></div>
        const lineLinkE = <div style={{ background: "linear-gradient(to right, " + mazeData.line_color + ", rgb(from " + mazeData.line_color + " r g b / 0))", width: mazeData.tile_size * 3 / 4, height: 1, position: "absolute", marginLeft: mazeData.tile_size / 2, marginTop: mazeData.tile_size / 2, zIndex: 3 }}></div>
        const lineLinkN = <div style={{ background: "linear-gradient(to top, " + mazeData.line_color + ", rgb(from " + mazeData.line_color + " r g b / 0))", width: 1, height: mazeData.tile_size * 3 / 4, position: "absolute", marginLeft: mazeData.tile_size / 2, marginTop: -mazeData.tile_size / 4, zIndex: 3 }}></div>

        const lineExitW = <div style={{ background: mazeData.line_color, width: mazeData.tile_size * 3 / 4, height: 1, position: "absolute", marginLeft: -mazeData.tile_size / 4, marginTop: mazeData.tile_size / 2, zIndex: 3 }}></div>
        const lineExitS = <div style={{ background: mazeData.line_color, width: 1, height: mazeData.tile_size * 3 / 4, position: "absolute", marginLeft: mazeData.tile_size / 2, marginTop: mazeData.tile_size / 2, zIndex: 3 }}></div>
        const lineExitE = <div style={{ background: mazeData.line_color, width: mazeData.tile_size * 3 / 4, height: 1, position: "absolute", marginLeft: mazeData.tile_size / 2, marginTop: mazeData.tile_size / 2, zIndex: 3 }}></div>
        const lineExitN = <div style={{ background: mazeData.line_color, width: 1, height: mazeData.tile_size * 3 / 4, position: "absolute", marginLeft: mazeData.tile_size / 2, marginTop: -mazeData.tile_size / 4, zIndex: 3 }}></div>

        const defaultLineW = (type & 1) != 0 ? lineW : (teleporters.signature & 1) != 0 ? lineTeleporterW : (links & 1) != 0 ? lineLinkW : (exits & 1) != 0 ? lineExitW : null
        const defaultLineS = (type & 2) != 0 ? lineS : (teleporters.signature & 2) != 0 ? lineTeleporterS : (links & 2) != 0 ? lineLinkS : (exits & 2) != 0 ? lineExitS : null
        const defaultLineE = (type & 4) != 0 ? lineE : (teleporters.signature & 4) != 0 ? lineTeleporterE : (links & 4) != 0 ? lineLinkE : (exits & 4) != 0 ? lineExitE : null
        const defaultLineN = (type & 8) != 0 ? lineN : (teleporters.signature & 8) != 0 ? lineTeleporterN : (links & 8) != 0 ? lineLinkN : (exits & 8) != 0 ? lineExitN : null

        const defaultPathW = (type & 1) != 0 ? pathW : (teleporters.signature & 1) != 0 ? teleporterW : (links & 1) != 0 ? linkW : (exits & 1) != 0 ? exitW : null
        const defaultPathS = (type & 2) != 0 ? pathS : (teleporters.signature & 2) != 0 ? teleporterS : (links & 2) != 0 ? linkS : (exits & 2) != 0 ? exitS : null
        const defaultPathE = (type & 4) != 0 ? pathE : (teleporters.signature & 4) != 0 ? teleporterE : (links & 4) != 0 ? linkE : (exits & 4) != 0 ? exitE : null
        const defaultPathN = (type & 8) != 0 ? pathN : (teleporters.signature & 8) != 0 ? teleporterN : (links & 8) != 0 ? linkN : (exits & 8) != 0 ? exitN : null

        useEffect(() => {
            if (stack.length == 0 && (isLeaving || (sessionContext.playerPos.row == row && sessionContext.playerPos.col == col))) {
                if (sessionContext.playerPos.row == row && sessionContext.playerPos.col == col && isTrophy && sessionContext.blockStack.length == 1) {
                    sessionContext.setIsWin(true)
                    return
                }

                let scl = sessionContext.lines
                if (!scl[stackInternal]) {
                    scl[stackInternal] = {}
                }
                if (!scl[stackInternal][row]) {
                    scl[stackInternal][row] = {}
                }
                if (!scl[stackInternal][row][col]) {
                    scl[stackInternal][row][col] = { w: false, s: false, e: false, n: false }
                }

                const playerRow = isLeaving ? sessionContext.playerPos.row : sessionContext.prevPlayerPos.row
                const playerCol = isLeaving ? sessionContext.playerPos.col : sessionContext.prevPlayerPos.col
                if (playerRow - row == 0 && playerCol - col < 0) {
                    scl[stackInternal][row][col].w = !scl[stackInternal][row][col].w
                    sessionContext.setLines(scl)
                }
                else if (playerRow - row > 0 && playerCol - col == 0) {
                    scl[stackInternal][row][col].s = !scl[stackInternal][row][col].s
                    sessionContext.setLines(scl)
                }
                else if (playerRow - row == 0 && playerCol - col > 0) {
                    scl[stackInternal][row][col].e = !scl[stackInternal][row][col].e
                    sessionContext.setLines(scl)
                }
                else if (playerRow - row < 0 && playerCol - col == 0) {
                    scl[stackInternal][row][col].n = !scl[stackInternal][row][col].n
                    sessionContext.setLines(scl)
                }
            }
            setIsLeaving(sessionContext.playerPos.row == row && sessionContext.playerPos.col == col)
        }, [sessionContext.playerPos])

        useEffect(() => {
            setStackInternal(sessionContext.blockStack.concat(stack).join("."))
        }, [sessionContext.blockStack])

        return (
            <div style={{
                position: "absolute", marginLeft: (col + 1 / 4) * mazeData.tile_size, marginTop: (row + 1 / 4) * mazeData.tile_size, background: mazeData.background_color, width: mazeData.tile_size, height: mazeData.tile_size
            }}>
                {defaultPathW}
                {defaultPathS}
                {defaultPathE}
                {defaultPathN}

                {(type | teleporters.signature | links | exits) != 0 && central_path}

                {(isStartingPosition || isTrophy) && roundTile}

                {sessionContext.lines[stackInternal] && sessionContext.lines[stackInternal][row] && sessionContext.lines[stackInternal][row][col] && sessionContext.lines[stackInternal][row][col].w && defaultLineW}
                {sessionContext.lines[stackInternal] && sessionContext.lines[stackInternal][row] && sessionContext.lines[stackInternal][row][col] && sessionContext.lines[stackInternal][row][col].s && defaultLineS}
                {sessionContext.lines[stackInternal] && sessionContext.lines[stackInternal][row] && sessionContext.lines[stackInternal][row][col] && sessionContext.lines[stackInternal][row][col].e && defaultLineE}
                {sessionContext.lines[stackInternal] && sessionContext.lines[stackInternal][row] && sessionContext.lines[stackInternal][row][col] && sessionContext.lines[stackInternal][row][col].n && defaultLineN}
            </div >
        )
    }
    return (<></>)
}