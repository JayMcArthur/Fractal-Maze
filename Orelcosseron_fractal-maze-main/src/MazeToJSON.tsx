export default function MazeToJSON(name: string) {
    try {
        const fileLines: string = require("./mazes/" + name + ".js").maze
        let tile_size: number = 0
        let outside_color: string = "white"
        let background_color: string = "white"
        let path_color: string = "white"
        let line_color: string = "white"
        let teleporters: NodeJS.Dict<NodeJS.Dict<{ signature: number, reach: NodeJS.Dict<number> }>> = {}
        let blocks: NodeJS.Dict<{ row: number, col: number, width: number, height: number, color: string, exits: NodeJS.Dict<{ row: number, col: number, path: string[] }> }> = {}
        let links: NodeJS.Dict<NodeJS.Dict<Array<{ block: string[], exit: string }>>> = {}
        let exits: NodeJS.Dict<{ orientation: number, row: number, col: number }> = {}
        let player: { row: number, col: number, color: string } = { row: 0, col: 0, color: "" }
        let trophies: Array<{ row: number, col: number, color: string }> = []
        let rows: string[] = []


        for (let line of fileLines.split("\n")) {
            line = line.trim()

            if (line == "" || line[0] == "#") { continue }

            if (line.slice(0, 9) == "TILE_SIZE") {
                tile_size = parseInt(line.split(" ")[1])
                continue
            }

            if (line.slice(0, 13) == "OUTSIDE_COLOR") {
                outside_color = line.split(" ")[1]
                continue
            }

            if (line.slice(0, 16) == "BACKGROUND_COLOR") {
                background_color = line.split(" ")[1]
                continue
            }

            if (line.slice(0, 10) == "PATH_COLOR") {
                path_color = line.split(" ")[1]
                continue
            }

            if (line.slice(0, 10) == "LINE_COLOR") {
                line_color = line.split(" ")[1]
                continue
            }

            if (line.slice(0, 8) == "TELEPORT") {
                const teleporter = line.split(" ")
                const teleporter_spec = teleporter[3].split("+")

                const row = parseInt(teleporter[1])
                const col = parseInt(teleporter[2])
                if (!(row in teleporters)) {
                    teleporters[row] = {}
                }
                if (teleporters[row] && !(col in teleporters[row])) {
                    teleporters[row][col] = { signature: 0, reach: {} }
                }
                if (teleporters[row] && teleporters[row][col]) {
                    teleporters[row][col].signature += parseInt(teleporter_spec[0])
                    teleporters[row][col].reach[parseInt(teleporter_spec[0])] = parseInt(teleporter_spec[1])
                }
                continue
            }

            if (line.slice(0, 5) == "BLOCK") {
                const block = line.split(" ")
                blocks[block[1]] = { row: parseInt(block[2]), col: parseInt(block[3]), width: parseInt(block[4]), height: parseInt(block[5]), color: block[6], exits: {} }
                continue
            }

            if (line.slice(0, 4) == "LINK") {
                const link = line.split(" ")

                const blockPath = link[1].split("+")

                const row = parseInt(link[3])
                const col = parseInt(link[4])
                if (!links[row]) {
                    links[row] = {}
                }

                if (!links[row][col]) {
                    links[row][col] = []
                }

                links[row][col].push({ block: blockPath, exit: link[2] })
                const blockName = blockPath[blockPath.length - 1]
                if (blocks[blockName]) {
                    blocks[blockName].exits[link[2]] = { row: row, col: col, path: blockPath }
                }
                continue
            }

            if (line.slice(0, 4) == "EXIT") {
                const exit = line.split(" ")
                exits[exit[1]] = { orientation: parseInt(exit[2]), row: parseInt(exit[3]), col: parseInt(exit[4]) }
                continue
            }

            if (line.slice(0, 6) == "PLAYER") {
                const player_info = line.split(" ")
                player = { row: parseInt(player_info[1]), col: parseInt(player_info[2]), color: player_info[3] }
                continue
            }

            if (line.slice(0, 6) == "TROPHY") {
                const trophy = line.split(" ")
                trophies.push({ row: parseInt(trophy[1]), col: parseInt(trophy[2]), color: trophy[3] })
                continue
            }

            rows.push(line)
        }
        return ({ tile_size: tile_size, outside_color: outside_color, background_color: background_color, path_color: path_color, line_color: line_color, teleporters: teleporters, blocks: blocks, links: links, exits: exits, player: player, trophies: trophies, rows: rows });
    }
    catch (error) {
        alert(error)
        return ({ tile_size: 0, outside_color: "", background_color: "", path_color: "", line_color: "", teleporters: {}, blocks: {}, links: {}, exits: {}, player: { row: 0, col: 0, color: "" }, trophies: [], rows: [] });
    }
}