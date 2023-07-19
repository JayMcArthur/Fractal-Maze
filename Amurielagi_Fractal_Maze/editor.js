class EditorPage {
    constructor(model) {
        this.id = 'editor';
        this.model = model;
        this.keyTimer = {};
    }

    init() {
        this.name = document.getElementById('editorName');
        this.size = document.getElementById('editorSize');
        this.canvas = document.getElementById('editorCanvas');
        this.ctx = new CtxWrapper(this.canvas.getContext('2d'), 6);
        this.baseCtx = new CtxWrapper(document.getElementById('editorBaseCanvas').getContext('2d'), 6);
        this.save = document.getElementById('editorSave');
        this.cancel = document.getElementById('editorCancel');
        this.delete = document.getElementById('editorDelete');
        this.newSubMaze = document.getElementById('editorNewSubMaze');
        this.pathPanel = document.getElementById('editorPath');
        this.pathColor = document.getElementById('editorPathColor');

        this.save.addEventListener('click', () => this.onSave());
        this.cancel.addEventListener('click', () => this.onCancel());
        this.delete.addEventListener('click', () => this.onDelete());
        this.size.addEventListener('change', () => this.onSizeChange());
        this.name.addEventListener('change', () => this.onNameChange());
        this.newSubMaze.addEventListener('click', () => this.onNewSubMaze());
        window.addEventListener('keydown', e => this.onKeyDown(e));
        window.addEventListener('keyup', e => this.onKeyUp(e));
        this.canvas.addEventListener('click', e => this.onMouseClick(e));
        this.pathColor.addEventListener('change', () => this.onPathColorChange());
    }

    onSave() {
        if (this.maze.startingPoint.moving || this.maze.finish && this.maze.finish.moving) {
            return;
        }
        this.model.replaceCurrentMaze(this.maze.toData());
        this.model.routeTo('front');
    }

    onSizeChange() {
        this.maze.size = parseInt(this.size.value);
        this.ctx.blockSize = this.maze.blockSize;
        this.baseCtx.blockSize = this.maze.blockSize;
        this.refreshBaseMaze();
    }

    onNameChange() {
        this.maze.name = this.name.value;
    }

    onNewSubMaze() {
        this.size.disabled = true;
        this.setActiveObject(this.maze.newSubMaze());
        this.newSubMaze.blur();
    }

    enablePathPanel() {
        addClass(this.pathPanel, '-active');
        this.pathColor.value = this.activeObject.color;
    }

    disablePathPanel() {
        removeClass(this.pathPanel, '-active');
    }

    onPathColorChange() {
        this.activeObject.applyColor(this.pathColor.value);
        this.pathColor.blur();
        this.setActiveObject(this.activeObject);
        this.refreshBaseMaze();
    }

    onMouseClick(e) {
        if (!this.isActive || e.button !== 0) return;
        const o = this.maze.objectAt(e.offsetX, e.offsetY, 'editor');
        if (!o) {
            return;
        }
        this.setActiveObject(o);
        o.startEditing(this);
        this.refreshBaseMaze();
    }

    onKeyDown(e) {
        if (!this.isActive || !this.activeObject || this.keyTimer[e.keyCode]) {
            return;
        }
        this.doKeyOperation(e.keyCode);
        if ([37, 38, 39, 40].indexOf(e.keyCode) !== -1) {
            this.keyTimer[e.keyCode] = setInterval(() => this.doKeyOperation(e.keyCode), 80);
        }
    }

    onKeyUp(e) {
        if (!this.isActive) {
            return;
        }
        const id = this.keyTimer[e.keyCode];
        if (id) {
            clearInterval(id);
            delete this.keyTimer[e.keyCode];
        }
    }

    doKeyOperation(keyCode) {
        this.clearCanvas(this.ctx);
        switch (keyCode) {
            case 8: // BACKSPACE
                if (this.activeObject.editBackspace) this.activeObject.editBackspace();
                break;
            case 46: // DELETE
                if (this.activeObject.editDelete) {
                    this.activeObject.editDelete();
                    this.setActiveObject(null);
                }
                break;
            case 37: // LEFT
                this.activeObject.move(-1, 0);
                break;
            case 38: // UP
                this.activeObject.move(0, -1);
                break;
            case 39: // RIGHT
                this.activeObject.move(1, 0);
                break;
            case 40: // DOWN
                this.activeObject.move(0, 1);
                break;
            case 27: // ESC
            case 13: // ENTER
                this.setActiveObject(null);
                break;
        }
        this.setActiveObject(this.activeObject);
    }

    setActiveObject(o) {
        if (this.activeObject && this.activeObject !== o) {
            this.activeObject.save(this);
            this.clearCanvas(this.ctx);
            this.refreshBaseMaze();
        }

        this.activeObject = o;
        if (!o) {
            this.clearCanvas(this.ctx);
        }
        else {
            this.displayEditorCanvas();
        }
        this.size.disabled = this.maze.sizeFinalized;
    }

    clearCanvas(ctx) {
        ctx.clearRect(0, 0, this.maze.width, this.maze.width);
    }

    displayEditorCanvas() {
        if (this.activeObject) {
            this.activeObject.display(this.ctx, 'gold');
        }
    }

    onDelete() {
        if (confirm('Are you sure you want to delete this maze?')) {
            this.model.deleteCurrentMaze();
            this.model.routeTo('front');
        }
    }

    onCancel() {
        this.model.routeTo('front');
    }

    refreshBaseMaze() {
        this.clearCanvas(this.baseCtx);
        this.maze.display(this.baseCtx);
    }

    activate() {
        this.isActive = true;
        this.maze = new Maze(this.model, this.model.currentMaze);
        this.name.value = this.maze.name;
        this.size.value = this.maze.size;
        this.size.disabled = this.maze.sizeFinalized;
        this.onSizeChange();
        this.refreshBaseMaze();
    }

    deactivate() {
        this.isActive = false;
        this.clearCanvas(this.ctx);
        this.clearCanvas(this.baseCtx);
    }
}