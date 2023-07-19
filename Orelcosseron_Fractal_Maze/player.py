from PySide6.QtCore import QObject, Property, QPointF, QSizeF, QRect, Qt, Signal
from PySide6.QtGui import QColor

from directions import Direction


class Player(QObject):
    win = Signal()

    def __init__(self, row, col, tile_size, player_color, path_color, scene, parent=None):
        QObject.__init__(self, parent)

        self.tile_size = tile_size

        self.drawing = scene.addEllipse(
            QRect((self.tile_size * QPointF(0.375, 0.375)).toPoint(), (self.tile_size * QSizeF(0.25, 0.25)).toSize()), Qt.NoPen, QColor(player_color))
        self.drawing.setZValue(5)

        self.pos_init = QPointF(col, row)
        self.winningPos = []
        self.reset()

    def show(self):
        self.drawing.show()

    def hide(self):
        self.drawing.hide()

    def addWinningPos(self, pos):
        if pos not in self.winningPos:
            self.winningPos += [pos]

    def removeWinningPos(self, pos):
        if pos in self.winningPos:
            self.winningPos.remove(pos)

    def _pos(self):
        return self.drawing.pos()/self.tile_size

    def _setPos(self, value):
        self.drawing.setPos(self.tile_size * value)
        if self.pos in self.winningPos:
            self.win.emit()

    pos = Property(QPointF, _pos, _setPos)

    def reset(self):
        self.pos = self.pos_init
