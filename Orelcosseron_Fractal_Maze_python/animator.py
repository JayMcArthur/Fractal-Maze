from PySide6.QtCore import Signal, Slot, QObject, QAbstractAnimation, QPropertyAnimation, QSequentialAnimationGroup, QParallelAnimationGroup, QRect, QPointF
from enum import Enum
from directions import Direction


class Animator(QObject):

    queue_changed = Signal()

    def __init__(self, maze):
        QObject.__init__(self)

        self.maze = maze

        self.queue = []
        self.queue_changed.connect(self.queue_handler)

        self.current_animation = QSequentialAnimationGroup()
        self.current_animation.finished.connect(self.queue_handler)

    def animate_block(self, block_name, direction):
        initial_rect = self.maze.scene.sceneRect()
        block = self.maze.blocks[block_name]
        zoomed_in_rect = QRect(
            block.block.pos().toPoint(), block.block.boundingRect().size().toSize())
        zoom_horizontal_ratio = initial_rect.width()/zoomed_in_rect.width()
        zoom_vertical_ratio = initial_rect.height()/zoomed_in_rect.height()

        duration = 450

        animation_zoom = QPropertyAnimation(
            self.maze,
            b"zoom",
            parent=self,
            duration=duration,
        )
        if direction == QAbstractAnimation.Direction().Forward:
            animation_zoom.setKeyValueAt(
                0.99999, QPointF(zoom_horizontal_ratio, zoom_vertical_ratio))
        else:
            animation_zoom.setStartValue(
                QPointF(zoom_horizontal_ratio, zoom_vertical_ratio))
        animation_zoom.setEndValue(self.maze.zoom)

        animation_pan = QPropertyAnimation(
            self.maze.scene,
            b"sceneRect",
            parent=self,
            duration=duration,
        )
        if direction == QAbstractAnimation.Direction().Forward:
            animation_pan.setKeyValueAt(
                0.99999, zoomed_in_rect)
        else:
            animation_pan.setStartValue(zoomed_in_rect)
        animation_pan.setEndValue(initial_rect)

        block_animation = QParallelAnimationGroup()
        block_animation.addAnimation(animation_pan)
        block_animation.addAnimation(animation_zoom)
        return block_animation

    def drawLine(self, tile, direction, inward):
        h = hash("-".join(self.maze.block_stack))
        if h in tile.visited.keys():
            visited = tile.visited[h]
            tile.visited[h] ^= direction.value
            if visited & direction.value != 0:
                return self.hideLine(tile.lines[direction], inward)
            else:
                return self.showLine(tile.lines[direction], inward)
        else:
            tile.visited[h] = direction.value
            return self.showLine(tile.lines[direction], inward)

    def hideLine(self, line, outward):
        line.inward = not outward
        line_animation = QPropertyAnimation(
            line,
            b"length",
            parent=self,
            duration=50,
        )
        line_animation.setEndValue(0)

        full_animation = QSequentialAnimationGroup(parent=self)

        if outward:
            full_animation.addPause(50)

        opacity = QPropertyAnimation(line, b"opacity", parent=self, duration=0)
        opacity.setEndValue(0)

        full_animation.addAnimation(line_animation)
        full_animation.addAnimation(opacity)

        return full_animation

    def showLine(self, line, inward):
        line.inward = inward
        line_animation = QPropertyAnimation(
            line,
            b"length",
            parent=self,
            duration=50,
        )
        line_animation.setEndValue(line.full_length)

        full_animation = QSequentialAnimationGroup(parent=self)

        if inward:
            full_animation.addPause(50)

        opacity = QPropertyAnimation(line, b"opacity", parent=self, duration=0)
        opacity.setEndValue(1)

        full_animation.addAnimation(opacity)
        full_animation.addAnimation(line_animation)

        return full_animation

    def animate_player(self, direction, start, end, outward, inward):
        if end is None:
            if start is None:
                start = self.maze.player.pos

            if direction == Direction.NORTH:
                end = start + QPointF(0, -1)
            elif direction == Direction.EAST:
                end = start + QPointF(1, 0)
            elif direction == Direction.SOUTH:
                end = start + QPointF(0, 1)
            elif direction == Direction.WEST:
                end = start + QPointF(-1, 0)
        else:
            if direction == Direction.NORTH:
                start = end - QPointF(0, -1)
            elif direction == Direction.EAST:
                start = end - QPointF(1, 0)
            elif direction == Direction.SOUTH:
                start = end - QPointF(0, 1)
            elif direction == Direction.WEST:
                start = end - QPointF(-1, 0)

        player_animation = QPropertyAnimation(
            self.maze.player,
            b"pos",
            parent=self,
            duration=100,
        )
        player_animation.setStartValue(start)
        player_animation.setEndValue(end)

        full_animation = QParallelAnimationGroup(parent=self)
        full_animation.addAnimation(player_animation)

        if outward:
            full_animation.addAnimation(self.drawLine(
                self.maze.tiles[int(start.y())][int(start.x())], direction, False))
        if inward:
            full_animation.addAnimation(
                self.drawLine(self.maze.tiles[int(end.y())][int(end.x())], direction.opposite(), True))

        return full_animation

    def enter_blocks(self, block_names):
        for block_name in block_names:
            self.queue += [("BLOCK", block_name,
                            QAbstractAnimation.Direction().Forward)]
        self.queue_changed.emit()

    def leave_blocks(self, block_names):
        for block_name in block_names:
            self.queue += [("BLOCK", block_name,
                            QAbstractAnimation.Direction().Backward)]
        self.queue_changed.emit()

    def move_player(self, direction, reach, start=None, end=None, outward=True, inward=True):
        for i in range(reach):
            self.queue += [("PLAYER", direction, start,
                            end, i == 0 and outward, i == reach - 1 and inward)]
        self.queue_changed.emit()

    @ Slot()
    def queue_handler(self):
        if self.current_animation.state() == QAbstractAnimation.State().Running or not self.queue:
            return
        self.current_animation.clear()
        animation = self.queue.pop(0)
        if animation[0] == "BLOCK":
            _, block_name, direction = animation
            self.current_animation.addAnimation(
                self.animate_block(block_name, direction))
            if direction == QAbstractAnimation.Direction().Forward:
                self.maze.block_stack += [block_name]
            else:
                self.maze.block_stack.pop()
                self.maze.player.hide()
                self.maze.blocks[block_name].pre_render(
                    hash("-".join(self.maze.block_stack)))
                self.maze.player.show()
            self.maze.change_block.emit(self.maze.block_stack)
        elif animation[0] == "PLAYER":
            _, direction, start, end, outward, inward = animation
            self.current_animation.addAnimation(
                self.animate_player(direction, start, end, outward, inward))
        self.current_animation.start()
