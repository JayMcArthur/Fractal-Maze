# Fractal-Maze

Inspired by [this question](https://puzzling.stackexchange.com/questions/37675/alice-and-the-fractal-hedge-maze), which is also used as the default maze. 

To launch the game, simply run:

    python ./main.py

You can select a maze in the drop-down menu at the top of the screen. 

The game can be played using ZQSD (french keyboard layout), WASD, IJKL or the arrow keys, but if that still does not fit your keyboard layout you can customize the keys in `keyPressEvent` in `maze.py`.

To create your own fractal maze, you can copy and edit any `*.maze` file in the `mazes` folder using the pseudocode described in them.
