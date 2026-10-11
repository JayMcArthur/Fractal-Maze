from PySide6.QtCore import QObject, Property
from PySide6.QtGui import QColor

from directions import Direction


class Line(QObject):
    def __init__(self, coordinates, tile_size, line_color, orientation, scene):
        QObject.__init__(self)
        self.orientation = orientation
        row = coordinates.y()
        col = coordinates.x()
        if self.orientation == Direction.NORTH:
            self.line = scene.addLine(
                tile_size * (col + 0.5), tile_size * row, tile_size * (col + 0.5), tile_size * (row + 0.5), QColor(line_color))
        elif self.orientation == Direction.EAST:
            self.line = scene.addLine(
                tile_size * (col + 0.5), tile_size * (row + 0.5), tile_size * (col + 1), tile_size * (row + 0.5), QColor(line_color))
        elif self.orientation == Direction.SOUTH:
            self.line = scene.addLine(
                tile_size * (col + 0.5), tile_size * (row + 0.5), tile_size * (col + 0.5), tile_size * (row + 1), QColor(line_color))
        elif self.orientation == Direction.WEST:
            self.line = scene.addLine(
                tile_size * col, tile_size * (row + 0.5), tile_size * (col + 0.5), tile_size * (row + 0.5), QColor(line_color))
        self.x1 = self.line.line().x1()
        self.x2 = self.line.line().x2()
        self.y1 = self.line.line().y1()
        self.y2 = self.line.line().y2()
        self.full_length = tile_size * 0.5
        self.inward = True
        self.line.setZValue(3)
        self.exit = False
        self.hide()

    def setExit(self):
        if not self.exit:
            self.exit = True
            if self.orientation == Direction.NORTH:
                self.y1 -= 0.5 * self.full_length
            if self.orientation == Direction.EAST:
                self.x2 += 0.5 * self.full_length
            if self.orientation == Direction.SOUTH:
                self.y2 += 0.5 * self.full_length
            if self.orientation == Direction.WEST:
                self.x1 -= 0.5 * self.full_length
            self.full_length *= 1.5

    def unsetExit(self):
        if self.exit:
            self.exit = False
            if self.orientation == Direction.NORTH:
                self.y1 += self.full_length / 3
            if self.orientation == Direction.EAST:
                self.x2 -= self.full_length / 3
            if self.orientation == Direction.SOUTH:
                self.y2 -= self.full_length / 3
            if self.orientation == Direction.WEST:
                self.x1 += self.full_length / 3
            self.full_length *= 2 / 3

    def hide(self,):
        self.length = 0
        self.opacity = 0

    def show(self):
        self.length = self.full_length
        self.opacity = 1

    def _length(self):
        return self.line.line().length()

    def _setLength(self, length):
        if self.inward:
            direction = self.orientation
        else:
            direction = self.orientation.opposite()

        if direction == Direction.NORTH:
            self.line.setLine(self.x1, self.y1, self.x2, self.y1 + length)
        if direction == Direction.EAST:
            self.line.setLine(self.x2 - length, self.y1, self.x2, self.y2)
        if direction == Direction.SOUTH:
            self.line.setLine(self.x1, self.y2 - length, self.x2, self.y2)
        if direction == Direction.WEST:
            self.line.setLine(self.x1, self.y1, self.x1 + length, self.y2)

    length = Property(float, _length, _setLength)

    def _opacity(self):
        return self.line.opacity()

    def _setOpacity(self, opacity):
        self.line.setOpacity(opacity)

    opacity = Property(float, _opacity, _setOpacity)
