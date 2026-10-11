from PySide6.QtCore import QObject, QRect, Qt, Property, QPropertyAnimation
from PySide6.QtGui import QColor


class Trophy(QObject):

    def __init__(self, row, col, trophy_color, path_color, tile_size, scene):
        QObject.__init__(self)

        self.drawing_1 = scene.addEllipse(
            QRect(-0.4 * tile_size, -0.2 * tile_size, tile_size * 0.8, tile_size * 0.4), QColor(trophy_color))
        self.drawing_1.setPos(tile_size * (col + 0.5), tile_size * (row + 0.5))
        self.drawing_2 = scene.addEllipse(
            QRect(-0.2 * tile_size, -0.4 * tile_size, tile_size * 0.4, tile_size * 0.8), QColor(trophy_color))
        self.drawing_2.setPos(tile_size * (col + 0.5), tile_size * (row + 0.5))
        self.drawing_3 = scene.addEllipse(
            QRect(-0.2 * tile_size, -0.4 * tile_size, tile_size * 0.4, tile_size * 0.8), QColor(trophy_color))
        self.drawing_3.setPos(tile_size * (col + 0.5), tile_size * (row + 0.5))
        self.drawing_3.setRotation(45)
        self.drawing_4 = scene.addEllipse(
            QRect(-0.2 * tile_size, -0.4 * tile_size, tile_size * 0.4, tile_size * 0.8), QColor(trophy_color))
        self.drawing_4.setPos(tile_size * (col + 0.5), tile_size * (row + 0.5))
        self.drawing_4.setRotation(-45)
        self.drawing_1.setZValue(5)
        self.drawing_2.setZValue(5)
        self.drawing_3.setZValue(5)
        self.drawing_4.setZValue(5)

        self.m_rotation = QPropertyAnimation(
            self,
            b"rotation",
            parent=self,
            duration=750,
        )
        self.m_rotation.setStartValue(0)
        self.m_rotation.setEndValue(45)
        self.m_rotation.setLoopCount(-1)
        self.m_rotation.start()

    def _rotation(self):
        return self.drawing_1.rotation()

    def _setRotation(self, angle):
        self.drawing_1.setRotation(angle)
        self.drawing_2.setRotation(angle)
        self.drawing_3.setRotation(45+angle)
        self.drawing_4.setRotation(-45+angle)

    rotation = Property(float, _rotation, _setRotation)

    def show(self):
        self.drawing_1.show()
        self.drawing_2.show()
        self.drawing_3.show()
        self.drawing_4.show()

    def hide(self):
        self.drawing_1.hide()
        self.drawing_2.hide()
        self.drawing_3.hide()
        self.drawing_4.hide()
