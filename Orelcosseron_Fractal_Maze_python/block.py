from PySide6.QtCore import QObject, QRect, Qt, QPointF
from PySide6.QtGui import QColor, QPixmap, QPainter
from PySide6.QtWidgets import QApplication


class Block(QObject):
    def __init__(self, row, col, width, height, tile_size, name, color, scene):
        QObject.__init__(self)

        self.name = name
        self.color = color
        self.exits = {}

        self.block = scene.addRect(QRect(0, 0, tile_size * width, tile_size * height),
                                   Qt.NoPen, QColor(color))
        self.block.setPos(tile_size * col, tile_size * row)

        self.recursion_pixmap = {}
        self.painters = {}
        self.block_path = {}

    def add_exit(self, name, row, col, block_path=None):
        self.exits[name] = QPointF(col, row)
        self.block_path[name] = block_path if block_path is not None else [
            self.name]

    def pre_render(self, position="Default"):
        if position not in self.recursion_pixmap:
            self.recursion_pixmap[position] = QPixmap(
                self.block.boundingRect().size().toSize())
            self.recursion_pixmap[position].fill(self.color)
            self.painters[position] = QPainter(self.recursion_pixmap[position])
        self.block.scene().render(self.painters[position])

    def render(self, position="Default"):
        position = position if position in self.recursion_pixmap else "Default"
        pos = self.block.pos()
        scene = self.block.scene()
        scene.removeItem(self.block)
        self.block = scene.addPixmap(self.recursion_pixmap[position])
        self.block.setPos(pos)

    def reset(self):
        for name in list(self.recursion_pixmap.keys()):
            if name != "Default":
                self.painters.pop(name)
                self.recursion_pixmap.pop(name)
        self.render(self.block.scene())

    def __del__(self):
        for name in list(self.recursion_pixmap.keys()):
            self.painters.pop(name)
            self.recursion_pixmap.pop(name)
