class FrontPage {
    constructor(model) {
        this.id = 'front';
        this.model = model;
    }

    init() {
        this.mazeList = document.getElementById('frontMazeList');
        this.newButton = document.getElementById('frontNew');
        this.editButton = document.getElementById('frontEdit');
        this.playButton = document.getElementById('frontPlay');
        this.importMazeInput = document.getElementById('frontImportMaze');
        this.importButton = document.getElementById('frontImportButton');
        this.exportButton = document.getElementById('frontExportButton');
        this.previewPanel = document.getElementById('frontPreviewPanel');
        this.checkAll = document.getElementById('frontCheckAll');
        this.mazeTable = document.getElementById('frontMazeTable');

        this.newButton.addEventListener('click', () => this.onNewMaze());
        this.editButton.addEventListener('click', () => this.onEdit());
        this.playButton.addEventListener('click', () => this.onPlay());
        this.importButton.addEventListener('click', () => this.importMazeInput.click());
        this.exportButton.addEventListener('click', () => this.onExportMazes());
        this.importMazeInput.addEventListener('change', e => this.onImportMaze(e.target.files));
        this.checkAll.addEventListener('click', () => this.onCheckAll());
        this.ctx = new CtxWrapper(document.getElementById('frontPreview').getContext('2d'), 2);
    }

    onNewMaze() {
        this.model.createNewMaze();
        this.model.routeTo('editor');
    }

    onImportMaze([file]) {
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
            let result = event.target.result;
            if (result) {
                this.model.importMazes(result);
                this.refreshMazeList();
            }
        });
        reader.readAsText(file);
    }

    onExportMazes() {
        this.model.exportMazes(this.checks.map((c, i) => [c, i]).filter(a => a[0].checked).map(a => a[1]));
        this.clearChecks();
    }

    refreshMazeList() {
        this.mazeList.innerHTML = '';
        this.model.mazes.forEach((maze, i) => {
            const check = document.createElement('input');
            check.type = 'checkbox';
            check.id = 'export' + i;
            check.addEventListener('click', () => this.onCheck());
            const checkCell = document.createElement('td');
            checkCell.appendChild(check);
            const name = document.createElement('td');
            name.id = 'frontMaze' + i;
            name.innerText = maze.name;
            name.addEventListener('click', () => this.selectMaze(i));
            const row = document.createElement('tr');
            row.appendChild(checkCell);
            row.appendChild(name);
            this.mazeList.appendChild(row);
        });

        if (this.model.currentMaze) {
            this.selectMaze(this.model.currentMazeIndex);
            addClass(this.previewPanel, '-active');
        } else {
            removeClass(this.previewPanel, '-active');
        }
        this.clearChecks();
    }

    selectMaze(index) {
        if (this.model.currentMaze) {
            removeClass(document.getElementById('frontMaze' + this.model.currentMazeIndex), '-active');
        }
        this.model.currentMazeIndex = index;
        addClass(document.getElementById('frontMaze' + index), '-active');
        const maze = new Maze(this.model, this.model.currentMaze);
        this.ctx.blockSize =maze.blockSize * 240 / 600;
        this.ctx.clearRect(0, 0, maze.width, maze.width);
        maze.display(this.ctx);
        this.clearChecks();
    }

    get checks() {
        return htmlCollectionToArray(this.mazeList.getElementsByTagName('input'));
    }

    clearChecks() {
        this.checks.forEach(check => check.checked = false);
        this.checkAll.checked = false;
        this.exportButton.disabled = true;
    }

    onCheckAll() {
        this.checks.forEach(check => check.checked = this.checkAll.checked);
        this.disableExportIfNeeded();
    }

    onCheck() {
        this.checkAll.checked = this.checks.every(check => check.checked);
        this.disableExportIfNeeded();
    }

    disableExportIfNeeded() {
        this.exportButton.disabled = !this.checks.some(check => check.checked);
    }

    onPlay() {
        this.model.routeTo('game');
    }

    onEdit() {
        this.model.routeTo('editor');
    }

    activate() {
        this.refreshMazeList();
    }

    deactivate() {

    }
}