import sys

from PySide6.QtCore import QFileInfo, QDir, Slot
from PySide6.QtWidgets import QWidget, QApplication, QPushButton, QVBoxLayout, QComboBox
from PySide6.QtGui import QFontDatabase, QFont

from hud import Hud
from maze import Maze


class MainWindow(QWidget):
    def __init__(self):
        QWidget.__init__(self)
        self.setStyleSheet("background-color: #c0c0c0")

        dname = QFileInfo(__file__).absolutePath()
        QFontDatabase.addApplicationFont(
            dname + "/fonts/Digital7Mono-Yz9J4.ttf")
        font = QFont("Digital-7 Mono")
        font.setStyleHint(QFont.Monospace)
        QApplication.setFont(font)

        self.maze_list = QComboBox()
        mazes = QDir(dname + "/mazes", "*.maze")
        for maze in mazes.entryList():
            maze_name, _ = maze.split(".")
            maze_name = " ".join([word.capitalize()
                                 for word in maze_name.split("_")])
            self.maze_list.addItem(maze_name)
        self.maze_list.setStyleSheet(
            "background-color: black; color: white; font-size: 18px")

        self.hud = Hud()

        self.maze = Maze(self)

        self.maze_list.currentTextChanged.connect(self.maze.setLabyrinth)
        self.maze_list.currentTextChanged.connect(self.reactivate_reset)
        self.maze_list.currentTextChanged.connect(self.hud.reset)

        self.reset = QPushButton("Reset")
        self.reset.setStyleSheet(
            ":enabled{background-color: black; color: white; margin-left:50%; margin-right: 50%} :disabled{background-color:#c0c0c0; color:#c0c0c0; border:0px}")
        self.reset.clicked.connect(self.maze.reset)
        self.reset.clicked.connect(self.hud.reset)

        self.maze.change_block.connect(self.hud.update)
        self.maze.game_over.connect(self.hud.game_over)
        self.maze.game_over.connect(self.reset.setEnabled)

        self.layout = QVBoxLayout(self)
        self.layout.addWidget(self.maze_list)
        self.layout.addWidget(self.hud)
        self.layout.addWidget(self.maze)
        self.layout.addWidget(self.reset)

        self.maze.setLabyrinth(self.maze_list.itemText(0))

    @ Slot()
    def reactivate_reset(self, _str):
        self.reset.setEnabled(True)


if __name__ == "__main__":
    app = QApplication(sys.argv)

    main_window = MainWindow()
    main_window.show()

    sys.exit(app.exec())
