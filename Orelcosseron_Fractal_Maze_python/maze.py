from PySide6.QtWidgets import QHBoxLayout, QGraphicsScene, QGraphicsView
from PySide6.QtGui import QTransform, QPixmap
from PySide6.QtCore import Signal, Property, QPointF, Slot, Qt, QRect, QFileInfo, QFile, QIODevice, QTextStream

from directions import Direction
from tiles import Tile
from block import Block
from player import Player
from trophy import Trophy
from animator import Animator


class Maze(QGraphicsView):

    change_block = Signal(list)
    game_over = Signal(bool)

    def __init__(self, parent=None):
        QGraphicsView.__init__(self, parent)
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.setFrameStyle(0)

        self.scene = QGraphicsScene()
        self.animator = Animator(self)

        self.change_block.connect(self.redraw_blocks)

    @ Slot()
    def setLabyrinth(self, maze_name):
        self.scene.clear()
        self.scene = QGraphicsScene()
        self.setTransform(QTransform())
        self.tiles = []
        self.blocks = {}
        self.exits = {}
        self.trophies = []
        self.block_stack = ["0"]
        self.win = False

        maze_name = "_".join([word.lower()
                              for word in maze_name.split(" ")])
        f = QFile(QFileInfo(__file__).absolutePath() +
                  "/mazes/" + maze_name + ".maze")
        f.open(QIODevice.ReadOnly)
        lines = QTextStream(f)
        i = 0
        while not lines.atEnd():
            line = lines.readLine()
            line = line.replace("\n", "").strip()

            if line == "" or line[0] == "#":
                continue

            if line[:9] == "TILE_SIZE":
                _, tile_size = line.split(" ")
                self.tile_size = int(tile_size)
                continue

            if line[:13] == "OUTSIDE_COLOR":
                _, self.outside_color = line.split(" ")
                self.setStyleSheet("background-color: " + self.outside_color)
                continue

            if line[:16] == "BACKGROUND_COLOR":
                _, self.background_color = line.split(" ")
                continue

            if line[:10] == "PATH_COLOR":
                _, self.path_color = line.split(" ")
                continue

            if line[:10] == "LINE_COLOR":
                _, self.line_color = line.split(" ")
                continue

            if line[:8] == "TELEPORT":
                _, teleport_row, teleport_col, teleport_spec = line.split(" ")
                teleport_direction, teleport_reach = teleport_spec.split("+")
                self.tiles[int(teleport_row)][int(teleport_col)].setTeleporter(
                    Direction(int(teleport_direction)), int(teleport_reach))
                continue

            if line[:5] == "BLOCK":
                _, block_name, block_row, block_col, width, height, block_color = line.split(
                    " ")
                self.blocks[block_name] = Block(
                    int(block_row), int(block_col), int(width), int(height), self.tile_size, block_name, block_color, self.scene)
                continue

            if line[:4] == "LINK":
                _, block_name, exit_name, link_row, link_col = line.split(" ")
                block_path = block_name.split("+")
                exit_tile = self.tiles[self.exits[exit_name]
                                       [0]][self.exits[exit_name][1]]
                self.tiles[int(link_row)][int(link_col)].setLink(
                    block_path[-1], exit_tile, exit_name)
                self.blocks[block_path[-1]].add_exit(
                    exit_name, int(link_row), int(link_col), block_path)
                continue

            if line[:4] == "EXIT":
                _, exit_name, exit_orientation, exit_row, exit_col = line.split(
                    " ")
                self.player.addWinningPos(self.tiles[int(exit_row)][int(exit_col)].setExit(
                    exit_name, Direction(int(exit_orientation))))
                self.exits[exit_name] = (int(exit_row), int(exit_col))
                continue

            if line[:6] == "PLAYER":
                _, player_row, player_col, player_color = line.split(" ")
                self.player = Player(
                    int(player_row), int(player_col), self.tile_size, player_color, self.path_color, self.scene)
                self.tiles[int(player_row)][int(player_col)].setStartingPoint()
                self.player.win.connect(self._game_over)
                continue

            if line[:6] == "TROPHY":
                _, trophy_row, trophy_col, trophy_color = line.split(" ")
                self.trophies += [Trophy(int(trophy_row),
                                         int(trophy_col), trophy_color, self.path_color, self.tile_size, self.scene)]
                self.tiles[int(trophy_row)][int(trophy_col)].setStartingPoint()
                self.player.addWinningPos(
                    self.tiles[int(trophy_row)][int(trophy_col)].coordinates)
                continue

            self.tiles += [[Tile(i, j, int(line[2*j:2*j+2]), self.tile_size, self.background_color, self.path_color, self.line_color, self.scene)
                            for j in range(len(line) >> 1)]]
            for tile in self.tiles[-1]:
                self.change_block.connect(tile.refresh)
            i += 1

        self.player.hide()
        for trophy in self.trophies:
            trophy.hide()
        for _ in range(5):
            for block in self.blocks.values():
                for exit in self.exits:
                    if exit in block.exits:
                        self.tiles[self.exits[exit][0]
                                   ][self.exits[exit][1]].showExit(exit)
                    else:
                        self.tiles[self.exits[exit][0]
                                   ][self.exits[exit][1]].hideExit(exit)
                block.pre_render()
            for block in self.blocks.values():
                block.render()
        for exit in self.exits:
            if len(self.trophies) == 0:
                self.tiles[self.exits[exit][0]
                           ][self.exits[exit][1]].showExit(exit)
            else:
                self.tiles[self.exits[exit][0]
                           ][self.exits[exit][1]].hideExit(exit)

        for trophy in self.trophies:
            trophy.show()
        self.player.show()
        f.close()

        self.setScene(self.scene)
        self.setFixedSize(self.scene.sceneRect().size().toSize())
        self.parent().setFixedSize(self.parent().layout.minimumSize())

    def _zoom(self):
        return QPointF(self.transform().m11(), self.transform().m22())

    def _setZoom(self, scale):
        self.setTransform(QTransform(scale.x(), self.transform().m12(), self.transform().m13(), self.transform().m21(), scale.y(),
                                     self.transform().m23(), self.transform().m31(), self.transform().m32(), self.transform().m33()))

    zoom = Property(QPointF, _zoom, _setZoom)

    @ Slot()
    def reset(self):
        self.player.reset()
        for row in self.tiles:
            for tile in row:
                tile.reset()
        for block in self.blocks.values():
            block.reset()
        self.animator.leave_blocks(self.block_stack[1:][::-1])

    def _game_over(self):
        if self.block_stack[-1] != "0":
            return
        self.win = True
        self.setStyleSheet("background-color: black")
        for trophy in self.trophies:
            trophy.m_rotation.stop()
        self.scene.clear()
        self.scene.addPixmap(
            QPixmap(QFileInfo(__file__).absolutePath() + "/images/game_over.jpg"))
        self.scene.setSceneRect(self.scene.itemsBoundingRect())
        self.fitInView(
            self.scene.itemsBoundingRect(), Qt.KeepAspectRatio)
        self.game_over.emit(False)

    def keyPressEvent(self, event):
        if self.win or self.animator.current_animation.state().value == 2:
            return

        if event.key() in [Qt.Key_Z, Qt.Key_W, Qt.Key_I, Qt.Key_Up]:
            direction = Direction.NORTH
        elif event.key() in [Qt.Key_Q, Qt.Key_A, Qt.Key_J, Qt.Key_Left]:
            direction = Direction.WEST
        elif event.key() in [Qt.Key_S, Qt.Key_K, Qt.Key_Down]:
            direction = Direction.SOUTH
        elif event.key() in [Qt.Key_D, Qt.Key_L, Qt.Key_Right]:
            direction = Direction.EAST
        else:
            return

        tile = self.tiles[int(self.player.pos.y())][int(self.player.pos.x())]

        if direction in tile.reach:
            self.animator.move_player(direction, tile.reach[direction])

        if direction in tile.linked_block:
            block_name, exit_name = tile.linked_block[direction]
            exit_tile = self.tiles[self.exits[exit_name]
                                   [0]][self.exits[exit_name][1]]
            self.animator.move_player(direction, 1, inward=False)
            self.animator.enter_blocks(
                self.blocks[block_name].block_path[exit_name])
            self.animator.move_player(
                direction, 1, end=exit_tile.coordinates, outward=False)

        if direction in tile.exit_name:
            if self.block_stack[-1] != '0':
                exit_name = tile.exit_name[direction]
                current_block = self.blocks[self.block_stack[-1]]

                if exit_name in current_block.exits.keys() and current_block.block_path[exit_name] == self.block_stack[-len(current_block.block_path[exit_name]):]:
                    self.animator.move_player(direction, 1, inward=False)
                    self.animator.leave_blocks(
                        current_block.block_path[exit_name][::-1])
                    self.animator.move_player(
                        direction, 1, end=current_block.exits[exit_name], outward=False)
            elif len(self.trophies) == 0:
                self.animator.move_player(direction, 1, inward=False)

    @ Slot()
    def redraw_blocks(self, init=False):
        for block in self.blocks.values():
            block.render(hash("-".join(self.block_stack)))

        if self.block_stack[-1] == '0':
            self.setStyleSheet(
                "background-color: " + self.outside_color)
            for exit in self.exits:
                if len(self.trophies) == 0:
                    self.tiles[self.exits[exit][0]
                               ][self.exits[exit][1]].showExit(exit)
                else:
                    self.tiles[self.exits[exit][0]
                               ][self.exits[exit][1]].hideExit(exit)
            for trophy in self.trophies:
                trophy.show()
        else:
            for trophy in self.trophies:
                trophy.hide()
            current_block = self.blocks[self.block_stack[-1]]
            self.setStyleSheet("background-color: " + current_block.color)
            for exit in self.exits:
                if exit in current_block.exits and current_block.block_path[exit] == self.block_stack[-len(current_block.block_path[exit]):]:
                    self.tiles[self.exits[exit][0]
                               ][self.exits[exit][1]].showExit(exit)
                else:
                    self.tiles[self.exits[exit][0]
                               ][self.exits[exit][1]].hideExit(exit)
