class GamePosition {
    constructor(maze, beginGate, previous = null) {
        this.beginGate = beginGate;
        this.endGate = null;
        this.maze = maze;
        this.previous = previous;
        this.next = null;
        this.id = previous ? previous.id + 1 : 0;
        this.possibleGates = this.getPossibleGates();
        if (previous) {
            previous.next = this;
        }
    }

    toData() {
        const data = [];
        let p = this;
        while (p) {
            data.push(p.endGate ? p.endGate.id : null);
            p = p.next;
        }
        return data;
    }

    loadPositions(data) {
        if (!data) return this;
        let pos = this;
        data.forEach((gateId) => {
            const gate = pos.maze.findGate(gateId);
            if(gate) pos = pos.makeMove(gate).position;
        });
        return pos;
    }

    getPossibleGates() {
        const path = this.maze.pathFor(this.beginGate, true);
        if (!path) return [];
        return Object.values(path.gates).filter(g => g !== this.beginGate);
    }

    remove() {
        if (!this.previous || this.next) {
            return this;
        }
        this.previous.next = null;
        return this.previous;
    }

    get path() {
        if (!this._path) {
            this._path = this.maze.pathFor(this.beginGate, true);
        }
        return this._path;
    }

    containsPoint(x, y) {
        const points = this.pathPoints();
        if (!points) return false;
        return points.some(point => point.x === x && point.y === y);
    }

    clearPathPoints() {
        this._points = null;
    }

    pathPoints(direction) {
        if (!this.path || !this.endGate) return null;
        if (!this._points) {
            this._points = this.path.shortestPath(this.beginGate.contactPoint, this.endGate.contactPoint);
        }
        const points = this._points.slice();
        if (direction === 'back') {
            points.reverse();
        }
        return points;
    }

    displayPathBetween(ctx, direction, color, animate) {
        return this.path.displayBetween(ctx, this.pathPoints(direction), color, animate);
    }

    displayVanishingPathBetween(ctx, direction, color) {
        return this.path.displayVanishingBetween(ctx, this.pathPoints(direction), color);
    }

    tracePath(ctx, direction, hilite, color) {
        return this.path && this.path.tracePath(ctx, this.pathPoints(direction), hilite, color);
    }

    makeMove(gate) {
        if (this.next) {
            return {
                position: this,
                type: 'noop'
            };
        }
        if (gate === this.beginGate) {
            const position = this.remove();
            if(position === this) {
                return {
                    position,
                    type: 'noop'
                };
            }
            return {
                position,
                type: (!gate.isExternal ? 'remove-out' : 'remove-in'),
                undo: {redoId: gate.id, undoId: position.endGate.id}
            };
        }
        if (gate.parent.isEndPoint && !gate.parent.isFinish ||
            gate.parent.isFinish && this.maze.level !== 0 ||
            !gate.isExternal && this.maze.level === 0 && this.maze.finish) {
            return {
                position: this,
                type: 'noop'
            };
        }
        this.endGate = gate;
        this.maze.addMove(this);
        if (gate.parent.isFinish || !gate.isExternal && this.maze.level === 0 && !this.maze.finish) {
            return {
                position: this,
                type: 'finish'
            };
        }

        if (!gate.isExternal) {
            const parentMaze = this.maze.parent.parentMaze;
            const beginGate = parentMaze.findGate(this.maze.parent.id + ':' + gate.id.split(':')[1]);
            const position = new GamePosition(parentMaze, beginGate, this);
            return {
                position,
                type: 'out',
                undo: {redoId: gate.id, undoId:beginGate.id}
            };
        }
        const parentMaze = gate.parent.maze;
        const beginGate = parentMaze.findGate('_:' + gate.id.split(':')[1]);
        const position = new GamePosition(parentMaze, beginGate, this);

        return {
            position,
            type: 'in',
            undo: {redoId: gate.id, undoId:beginGate.id}
        };
    }
}

class PathPoint {
    constructor({x, y, isHead = false}) {
        this.x = x;
        this.y = y;
        this.isHead = isHead;
    }

    toData() {
        return {
            x: this.x,
            y: this.y,
            isHead: this.isHead
        };
    }

    get id() {
        return this.x + ':' + this.y;
    }

    display(ctx, hilite) {
        if (this.isHead) {
            if (!hilite) {
                return;
            }
            ctx.fillStyle = hilite;
        }
        ctx.fillRect(this.x, this.y, 1, 1);
    }
}

class MazePath {
    constructor(maze, params) {
        const data = {
            color: '#0000FF',
            points: [],
            gates: []
        };
        Object.assign(data, params);

        this.maze = maze;
        this.pointBuffer = {
            seq: [],
            points: {}
        };
        this.color = data.color;
        this.points = data.points.reduce((o, p) => {
            const point = new PathPoint(p);
            o[point.id] = point;
            return o;
        }, {});
        this.gates = data.gates.reduce((o, id) => {
            o[id] = maze.findGate(id);
            return o;
        }, {});
        if (data.head) {
            this.head = new PathPoint(data.head);
        }
        else {
            this.head = new PathPoint({x: data.x, y: data.y, isHead: true});
        }
        this.addPoint(0, 0);
    }

    toData() {
        return {
            color: this.color,
            points: Object.values(this.points).map(p => p.toData()),
            gates: Object.keys(this.gates),
            head: this.head.toData()
        };
    }

    applyColor(color) {
        this.color = color;
    }

    display(ctx, hilite) {
        ctx.fillStyle = hilite ? hilite : this.color;
        Object.values(this.points).forEach(p => {
            p.display(ctx, hilite);
        });
        if (hilite) {
            Object.values(this.gates).forEach(g => {
                g.display(ctx, hilite);
            });
        }
        this.head.display(ctx, hilite ? 'green' : hilite);
    }

    displayBetween(ctx, points, color, animate) {
        ctx.fillStyle = color;
        if (!animate) {
            points.forEach(p => p.display(ctx, color));
            return {then: callback => callback()};
        }
        return new Promise(accept => {
            let i = 0;
            ctx.fillStyle = color;
            const timer = setInterval(() => {
                points[i].display(ctx, color);
                if (++i >= points.length) {
                    clearInterval(timer);
                    accept();
                }
            }, 10);
        });
    }

    displayVanishingBetween(ctx, points, color) {
        ctx.fillStyle = color;
        points.forEach(p => p.display(ctx, color));
        ctx.fillStyle = this.color;
        return new Promise(accept => {
            let i = points.length - 1;
            const timer = setInterval(() => {
                points[i--].display(ctx, color);
                if (i < 0) {
                    clearInterval(timer);
                    accept();
                }
            }, 10);
        });
    }

    tracePath(ctx, points, hilite, color) {
        return new Promise(accept => {
            let i = 0;
            const timer = setInterval(() => {
                if (i < points.length) {
                    ctx.fillStyle = hilite;
                    points[i].display(ctx, color);
                }
                if (i > 0) {
                    ctx.fillStyle = color;
                    points[i - 1].display(ctx, color);
                }
                if (++i > points.length) {
                    clearInterval(timer);
                    accept();
                }
            }, 10);
        });
    }

    shortestPath(startPoint, endPoint) {
        const list = this.findPaths(startPoint, endPoint, {p: [], m: {}});
        return list.map(info => [info, info.p.length]).reduce((r, item) => r[1] < item[1] ? r : item)[0].p;
    }

    findPaths(point, endPoint, info) {
        info = {p: info.p.slice(), m: Object.assign({}, info.m)};
        info.p.push(point);
        info.m[point.id] = point;
        if (point.id === endPoint.id) {
            return [info];
        }
        const [x, y] = point.id.split(':').map(s => parseInt(s));
        return [`${x + 1}:${y}`, `${x - 1}:${y}`, `${x}:${y + 1}`, `${x}:${y - 1}`]
            .map(id => this.points[id])
            .filter(p => p && !info.m[p.id])
            .map(p => this.findPaths(p, endPoint, info))
            .reduce((r, paths) => {
                r.push(...paths);
                return r;
            }, []);
    }

    setHead(x, y) {
        this.head.x = x;
        this.head.y = y;
    }

    addPoint(dx, dy) {
        this.head.x += dx;
        this.head.y += dy;
        const p = new PathPoint({x: this.head.x, y: this.head.y});
        this.addPointToBuffer(p);
        this.points[p.id] = p;
        const gate = this.maze.gateAtPoint(p.id);
        if (gate && !this.gates[gate.id]) {
            const anotherPath = this.maze.pathFor(gate, true);
            if (anotherPath) {
                this.merge(anotherPath);
            }
            this.gates[gate.id] = gate;
            this.clearPointBuffer();
            this.addPointToBuffer(p);
        }
    }

    addPointToBuffer(p) {
        let bp = this.pointBuffer.points[p.id];
        if (bp) {
            bp.refCount++;
        }
        else {
            bp = new PathPoint(p);
            bp.refCount = this.points[p.id] ? 2 : 1;
        }
        this.pointBuffer.seq.push(bp);
    }

    clearPointBuffer() {
        this.pointBuffer.points = {};
        this.pointBuffer.seq.length = 0;
    }

    containsGate(gate) {
        return gate && !!this.gates[gate.id];
    }

    startEditing(editor) {
        editor.enablePathPanel();
        this.addPoint(0, 0);
    }

    save(editor) {
        if (Object.keys(this.gates).length > 1) {
            this.maze.addPath(this);
        }
        editor.disablePathPanel();
        this.clearPointBuffer();
    }

    move(x, y) {
        this.addPoint(x, y);
    }

    editDelete() {
        this.maze.deletePath(this);
        this.gates = {};
    }

    editBackspace() {
        if (this.pointBuffer.seq.length <= 1) return;
        const bp = this.pointBuffer.seq.pop();
        bp.refCount--;
        if (bp.refCount === 0) {
            delete this.points[bp.id];
        }
        const last = this.pointBuffer.seq[this.pointBuffer.seq.length - 1];
        this.head.x = last.x;
        this.head.y = last.y;
    }

    merge(path) {
        Object.assign(this.points, path.points);
        Object.assign(this.gates, path.gates);
        path.editDelete();
    }

}

class Gate {
    static gates(parent, gatesPerSide, isExternal) {
        const width = isExternal ? 1 : 3;
        let offset0 = Math.floor((parent.width - gatesPerSide * width) / (gatesPerSide + 1));
        const offset = offset0 + width;
        const gates = [];
        let x = offset0;
        let y = 0;
        let id = 0;
        for (let i = 0; i < gatesPerSide; i++, x += offset, id++) gates.push(new Gate(parent, id, x, y, 'n', isExternal));
        x = parent.width - width;
        y = offset0;
        for (let i = 0; i < gatesPerSide; i++, y += offset, id++) gates.push(new Gate(parent, id, x, y, 'e', isExternal));
        x = parent.width - offset;
        y = parent.width - width;
        for (let i = 0; i < gatesPerSide; i++, x -= offset, id++) gates.push(new Gate(parent, id, x, y, 's', isExternal));
        x = 0;
        y = parent.width - offset;
        for (let i = 0; i < gatesPerSide; i++, y -= offset, id++) gates.push(new Gate(parent, id, x, y, 'w', isExternal));
        return gates;
    }

    constructor(parent, index, dx, dy, orientation, isExternal) {
        this.parent = parent;
        this.index = index;
        this.dx = dx;
        this.dy = dy;
        this.orientation = orientation;
        this.isExternal = isExternal;
        this.width = isExternal ? 1 : 3;
        this.isGate = true;
    }

    get id() {
        return this.parent.id + ':' + this.index;
    }

    get x() {
        return this.parent.x + this.dx;
    }

    get y() {
        return this.parent.y + this.dy;
    }

    get pathX0() {
        switch (this.orientation) {
            case 'n':
                return this.x + Math.floor(this.width / 2);
            case 'e':
                return this.isExternal ? this.x + this.width : this.x - 1;
            case 's':
                return this.x + Math.floor(this.width / 2);
            case 'w':
                return this.isExternal ? this.x - 1 : this.x + this.width;
        }
    }

    get pathY0() {
        switch (this.orientation) {
            case 'n':
                return this.isExternal ? this.y - 1 : this.y + this.width;
            case 'e':
                return this.y + Math.floor(this.width / 2);
            case 's':
                return this.isExternal ? this.y + this.width : this.y - 1;
            case 'w':
                return this.y + Math.floor(this.width / 2);
        }
    }

    get contactPoint() {
        return new PathPoint({x: this.pathX0, y: this.pathY0});
    }

    display(ctx, hilite) {
        ctx.fillStyle = hilite ? hilite : 'black';
        ctx.fillRect(this.x, this.y, this.width, this.width);
    }

    containsPoint(x, y) {
        return x >= this.x && x < this.x + this.width && y >= this.y && y < this.y + this.width;
    }
}

class EndPoint {
    constructor(maze, params) {
        const data = {
            x: params.id === 'F' ? 35 : 25,
            y: 60
        };
        Object.assign(data, params);

        this.maze = maze;
        this.x = data.x;
        this.y = data.y;
        this.width = 5;
        this.id = data.id;
        this.gates = Gate.gates(this, 1, true);
        this.isEndPoint = true;
        this.moving = false;
    }

    get isFinish() {
        return this.id === 'F';
    }

    toData() {
        return {
            id: this.id,
            x: this.x,
            y: this.y
        };
    }

    display(ctx, hilite) {
        ctx.fillStyle = hilite ? hilite : 'black';
        ctx.fillRect(this.x, this.y, this.width, this.width);
        ctx.font = 3;
        const m = ctx.measureText('S');
        ctx.fillStyle = 'white';
        ctx.fillText(this.id, this.x + (this.width - m.width) / 2, this.y + (this.width + m.actualBoundingBoxAscent) / 2);
        this.gates.forEach(gate => gate.display(ctx, hilite));
    }

    startEditing() {
        this.moving = true;
    }

    editDelete() {
        if (this.isFinish && !this.gates.some(gate => this.maze.pathFor(gate, true))) {
            this.maze.finish = null;
            this.deleted = true;
        }
    }

    save() {
        if (!this.deleted) this.moving = false;
    }

    move(dx, dy) {
        if (this.gates.some(gate => this.maze.pathFor(gate, true))) {
            return;
        }
        this.x += dx;
        this.y += dy;
    }

    objectAt(x, y, pageId) {
        let gate = this.gates.reduce((o, g) => (o || (g.containsPoint(x, y) ? g : null)), null);
        if (gate) {
            return pageId === 'editor' ? this.maze.pathFor(gate) : gate;
        }
        return (x >= this.x && x < this.x + this.width && y >= this.y && y < this.y + this.width) ? this : null;
    }

    gateAtPoint(pointId) {
        return this.gates.find(gate => gate.contactPoint.id === pointId);
    }

    findGate(gateId) {
        return this.gates.find(gate => gate.id === gateId);
    }

    startingGate() {
        return this.gates.find(gate => this.maze.pathFor(gate, true));
    }
}

class SubMaze {
    constructor(maze, params) {
        const loc = maze.width / 2;
        const data = {
            x: loc,
            y: loc
        };
        Object.assign(data, params);

        this.parentMaze = maze;
        this.level = this.parentMaze.level + 1;
        this.id = data.id;
        this.x = data.x;
        this.y = data.y;
        this.width = this.parentMaze.subMazeWidth;
        this.gates = Gate.gates(this, this.parentMaze.size, true);
        this.deleted = false;
    }

    get maze() {
        if (!this._model) {
            this._model = new Maze(this.parentMaze.model, this.parentMaze.toData(), this, this.level);
        }
        return this._model;
    }

    toData() {
        return {
            id: this.id,
            x: this.x,
            y: this.y
        };
    }

    save() {
        if (!this.deleted) {
            this.parentMaze.addSubMaze(this);
        }
    }

    display(ctx, hilite) {
        ctx.fillStyle = hilite ? hilite : '#AAA';
        ctx.fillRect(this.x, this.y, this.width, this.width);
        ctx.font = 5;
        const m = ctx.measureText(this.id);
        ctx.fillStyle = 'black';
        ctx.fillText(this.id, this.x + (this.width - m.width) / 2, this.y + (this.width + m.actualBoundingBoxAscent) / 2);
        this.gates.forEach(gate => gate.display(ctx, hilite));
    }

    move(dx, dy) {
        if (this.gates.some(gate => this.parentMaze.pathFor(gate, true))) {
            return;
        }
        this.x += dx;
        this.y += dy;
    }

    objectAt(x, y, pageId) {
        let gate = this.gates.reduce((o, g) => (o || (g.containsPoint(x, y) ? g : null)), null);
        if (gate) {
            return pageId === 'editor' ? this.parentMaze.pathFor(gate) : gate;
        }
        return (x >= this.x && x < this.x + this.width && y >= this.y && y < this.y + this.width) ? this : null;
    }

    gateAtPoint(pointId) {
        return this.gates.find(gate => gate.contactPoint.id === pointId);
    }

    findGate(gateId) {
        return this.gates.find(gate => gate.id === gateId);
    }

    startEditing() {
        this.parentMaze.removeSubMaze(this);
    }

    editDelete() {
        if (!this.gates.some(gate => this.parentMaze.pathFor(gate, true))) {
            this.parentMaze.removeSubMaze(this);
            this.deleted = true;
        }
    }
}

class Maze {
    constructor(model, params = {}, parent = null, level = 0) {
        const data = {
            uid: Date.now() + ':' + Math.random(),
            name: 'Maze 1',
            size: 2,
            nextSubMazeIdCode: 'A'.charCodeAt(0),
            paths: [],
            startingPoint: {id: 'S'},
            finish: {id: 'F'},
            subMazes: []
        };
        Object.assign(data, params);

        this.uid = data.uid;
        this.model = model;
        this.level = level;
        this.parent = parent;
        this.name = data.name;
        this.id = '_';
        this.x = 0;
        this.y = 0;
        this.size = data.size;
        this.nextSubMazeIdCode = data.nextSubMazeIdCode;
        this.subMazes = data.subMazes.reduce((o, s) => {
            const subMaze = new SubMaze(this, s);
            o[subMaze.id] = subMaze;
            return o;
        }, {});
        this.startingPoint = new EndPoint(this, data.startingPoint);
        this.finish = data.finish ? new EndPoint(this, data.finish) : null;
        this.paths = [];
        this.paths = data.paths.map(path => new MazePath(this, path));
        this.moves = {};
    }

    toData() {
        return {
            uid: this.uid,
            token: 'FRACTAL-MAZE.v1',
            name: this.name,
            size: this.size,
            nextSubMazeIdCode: this.nextSubMazeIdCode,
            paths: this.paths.map(p => p.toData()),
            startingPoint: this.startingPoint.toData(),
            finish: this.finish ? this.finish.toData() : null,
            subMazes: Object.values(this.subMazes).map(s => s.toData())
        };
    }

    removeMove(move) {
        delete this.moves[move.id];
    }

    addMove(move) {
        this.moves[move.id] = move;
    }

    get width() {
        if (this.size > 6) return 200;
        if (this.size > 4) return 150;
        return 100;
    }

    get blockSize() {
        if (this.size > 6) return 3;
        if (this.size > 4) return 4;
        return 6;
    }

    get subMazeWidth() {
        if (this.size > 3) return this.size * 3 + 2;
        return this.size * 4 + 3;
    }

    get sizeFinalized() {
        return this.paths.length > 0 || Object.keys(this.subMazes).length > 0;
    }

    get size() {
        return this._size;
    }

    set size(value) {
        this._size = value;
        this.gates = Gate.gates(this, value, false);
    }

    get nextSubMazeId() {
        return String.fromCharCode(this.nextSubMazeIdCode++);
    }

    pathFor(gate, suppressNewPathCreation) {
        const path = this.paths.find(p => p.containsGate(gate));
        if (path || suppressNewPathCreation) return path;

        return new MazePath(this, gate.contactPoint);
    }

    addPath(path) {
        if (this.paths.indexOf(path) === -1) {
            this.paths.push(path);
        }
    }

    deletePath(path) {
        const index = this.paths.indexOf(path);
        if (index !== -1) {
            this.paths.splice(index, 1);
        }
    }

    clone() {
        return this;
    }

    newSubMaze() {
        return new SubMaze(this, {id: this.nextSubMazeId});
    }

    addSubMaze(subMaze) {
        this.subMazes[subMaze.id] = subMaze;
    }

    removeSubMaze(subMaze) {
        delete this.subMazes[subMaze.id];
    }

    display(ctx) {
        if (this.finish && !this.finish.moving) this.finish.display(ctx);
        if (!this.startingPoint.moving) this.startingPoint.display(ctx);
        Object.values(this.subMazes).forEach(s => s.display(ctx));
        this.gates.forEach(gate => gate.display(ctx));
        this.paths.forEach(path => path.display(ctx));
    }

    objectAt(x, y, pageId, includeMoves) {
        x = Math.floor(x / this.blockSize);
        y = Math.floor(y / this.blockSize);
        let object = this.gates.reduce((o, g) => (o || (g.containsPoint(x, y) ? g : null)), null);
        if (object) {
            return pageId === 'editor' ? this.pathFor(object) : object;
        }
        object = Object.values(this.subMazes).reduce((o, s) => (o || s.objectAt(x, y, pageId)), null);
        if (object) {
            return object;
        }
        const endpoints = [];
        if (!this.startingPoint.moving) endpoints.push(this.startingPoint);
        if (this.finish && !this.finish.moving) endpoints.push(this.finish);
        object = endpoints.reduce((o, s) => (o || s.objectAt(x, y, pageId)), null);
        if (object) {
            return object;
        }
        if (includeMoves) {
            const moves = Object.values(this.moves).filter(move => move.containsPoint(x, y));
            if (moves.length) return {isMoveSet: true, moves};
        }
        return null;
    }

    gateAtPoint(pointId) {
        return this.gates.find(gate => gate.contactPoint.id === pointId) ||
            (this.finish && !this.finish.moving && this.finish.gateAtPoint(pointId)) ||
            (!this.startingPoint.moving && this.startingPoint.gateAtPoint(pointId)) ||
            Object.values(this.subMazes).reduce((o, s) => (o || s.gateAtPoint(pointId)), null);
    }

    findGate(gateId) {
        return this.gates.find(gate => gate.id === gateId) ||
            (this.finish && !this.finish.moving && this.finish.findGate(gateId)) ||
            (!this.startingPoint.moving && this.startingPoint.findGate(gateId)) ||
            Object.values(this.subMazes).reduce((o, s) => (o || s.findGate(gateId)), null);
    }
}

class Model {
    constructor() {
        this.gridSize = 100;
        this.pages = {};
        this.mazes = [];
        this.currentMazeIndex = null;
    }

    get currentMaze() {
        if (this.currentMazeIndex !== null && this.mazes.length) {
            return this.mazes[this.currentMazeIndex];
        }
        return null;
    }

    start() {
        let initMazes;
        const serializedMazes = localStorage.getItem('fractal.mazes');
        if (serializedMazes) {
            initMazes = Promise.resolve().then(() => {
                this.importMazes(serializedMazes);
            });
        }
        else {
            initMazes = fetch('fractal-maze-export.json')
                .then(response => response.text())
                .then(starterSetMazes => {
                    if (starterSetMazes) this.importMazes(starterSetMazes);
                });
        }
        initMazes.then(() => {
            if (this.mazes.length) {
                this.currentMazeIndex = 0;
            }
            this.activatePage(this.currentPage.id);
        });
    }

    get savedGames() {
        const gamesString = localStorage.getItem('fractal.games');
        return gamesString ? JSON.parse(gamesString) : {};
    }

    set savedGames(games) {
    }

    saveGame(mazeUid, game) {
        const games = this.savedGames;
        games[mazeUid] = game;
        localStorage.setItem('fractal.games', JSON.stringify(games));
    }

    clearGame(mazeUid) {
        const games = this.savedGames;
        delete games[mazeUid];
        localStorage.setItem('fractal.games', JSON.stringify(games));
    }

    loadGame(mazeUid) {
        return this.savedGames[mazeUid];
    }

    addPage(page) {
        this.pages[page.id] = page;
        page.init();
        this.currentPage = page;
    }

    importMazes(json) {
        JSON.parse(json)
            .filter(maze => maze.token === 'FRACTAL-MAZE.v1')
            .filter(maze => !this.mazes.some(m => maze.uid === m.uid))
            .forEach(maze => this.mazes.push(maze));
        this.saveMazes();
    }

    exportMazes(indexes) {
        const mazes = this.mazes.filter((m, i) => indexes.indexOf(i) !== -1);
        const file = new Blob([JSON.stringify(mazes)], {type: 'json'});
        const fileName = 'fractal-maze-export.json';
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, fileName);
        else { // Others
            const a = document.createElement('a'),
                url = window.URL.createObjectURL(file);
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    }

    createNewMaze() {
        let maze = new Maze(model).toData();
        this.mazes.push(maze);
        this.currentMazeIndex = this.mazes.length - 1;
        return maze;
    }

    replaceCurrentMaze(maze) {
        this.mazes.splice(this.currentMazeIndex, 1, maze);
        this.saveMazes();
    }

    deleteCurrentMaze() {
        this.mazes.splice(this.currentMazeIndex, 1);
        if (this.mazes.length) {
            if (this.currentMazeIndex >= this.mazes.length) {
                this.currentMazeIndex = this.mazes.length - 1;
            }
        } else {
            this.currentMazeIndex = null;
        }
        this.saveMazes();
    }

    saveMazes() {
        localStorage.setItem('fractal.mazes', JSON.stringify(this.mazes));
        if (this.mazes.length && this.currentMazeIndex === null) {
            this.currentMazeIndex = 0;
        }
    }


    activatePage(pageId) {
        this.currentPage = this.pages[pageId];
        this.currentPage.activate();
        addClass(document.getElementById(this.currentPage.id), '-active');
    }

    routeTo(pageId) {
        this.currentPage.deactivate();
        removeClass(document.getElementById(this.currentPage.id), '-active');
        this.activatePage(pageId);
    }
}