from PySide6.QtCore import Slot
from PySide6.QtWidgets import QLabel


class Hud(QLabel):
    def __init__(self, parent=None):
        QLabel.__init__(self, "Position: 0", parent=parent)
        self.setStyleSheet(
            "background-color: black; color: white; padding:10px; font-size:16px")

    @Slot()
    def reset(self, _str=""):
        self.setText("Position: 0")

    @Slot()
    def update(self, stack):
        stack[0] = "Position: 0"
        self.setText("←".join(stack))

    @Slot()
    def game_over(self, b):
        self.setText("Congratulations, you escaped!")
