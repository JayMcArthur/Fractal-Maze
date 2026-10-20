# Fractal Mazes

This repo contains all the Fractal mazes I have found online as well as I have developed.

It also includes Oreclosseron's Python Fractal Maze [application](./Orelcosseron_Fractal_Maze_python/README.md).
I have added some more mazes to it and plan to add more functionality to view the path once it is complete.

I have also developed a method to convert a fractal maze to a PDA.
[This readme](./Papers/Fractal_Maze_to_PDA/Fractal_Maze_to_PDA.md) gives a view of how to do this and provides some examples.

If I missed any mazes or missed labeled anything feel free to create a pull request and I can merge in the fixes

## Current application

The combined browser app is in [my_way](./my_way/README.md). It includes Library, Play, Build, Solve, Replays, and a manual proof notebook. Run `npm install` and `npm run dev` from `my_way` to open it locally.

Library groups drawings and remakes under Maze view. Play follows the selected maze’s movement rules; Build opens corridor editing or image/PDA conversion. Unfinished image drafts open conversion review until their endpoints are assigned. Source interpretations remain labeled WIP for review.

[Upstream additions / adopted features](./my_way/docs/UPSTREAM_CHANGELOG.md) · [Hosting and security](./my_way/docs/STATIC_HOSTING.md) · [Shared solution coverage](./my_way/docs/SOLUTION_COVERAGE.md)

[Maze coverage](./my_way/docs/PDA_CONVERSIONS.md) · [Product flows](./my_way/docs/PRODUCT_FLOWS.md) · [Refreshed upstream programs](./my_way/docs/UPSTREAM_REFRESH.md) · [Current review screenshots](./my_way/docs/screenshots/backlog/index.html)

# List of Mazes

| Name                       | Author            | Maze Image                                                                                                                                                                   | Online Links                                                                                                      | .maze                                                                                                                                                                    |
|----------------------------|-------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Alice and the Hedge Maze   | Mike Earnest      | [Image](./Maze_Images/Mike_Earnest/Alice_and_the_Hedge_Maze.png)                                                                                                             | [Post](https://puzzling.stackexchange.com/questions/37675/alice-and-the-fractal-hedge-maze)                       | [Maze](./Orelcosseron_Fractal_Maze_python/mazes/1_-_alice_in_wonderland.maze)                                                                                                   |
| Berkly                     | Mike Earnest      | [Image](./Maze_Images/Mike_Earnest/Berkly.jpg)                                                                                                                               | ?????                                                                                                             |                                                                                                                                                                          |
| Geocaching - Easter 13-#10 | Amurielagi        | [Image](./Maze_Images/Geocaching_Easter_13-%2310.png)                                                                                                                          | [Github Repo](https://github.com/amurielagi/fractal-maze)                                                         |                                                                                                                                                                          |
| A Long Path v*             | Jay McArthur      | [Image](./Maze_Images/Jay_McArthur_-_A_Long_Path_v6.png)                                                                                                                     | N/A -> This Repo                                                                                                  | [Maze v4](./Orelcosseron_Fractal_Maze_python/mazes/5_-_Jay_McArthur_-_A_Long_Path_v4.maze), [Maze v8](./Orelcosseron_Fractal_Maze_python/mazes/6_-_Jay_McArthur_-_A_Long_Path_v8.maze) |
| Luegarua                   | Luegarua          | [Image](./Maze_Images/Luegarua.webp)                                                                                                                                         | [Reddit](https://www.reddit.com/r/mazes/comments/12k2v79/recursive_fractal_maze/)                                 |                                                                                                                                                                          |
| Skeptic Play Circle        | Siggy             | [Image](./Maze_Images/Siggy/Skeptic_Play_1.jpg), [New Image](./Maze_Images/Siggy/Skeptic_Play_1.svg), [Steps](./Maze_Images/Siggy/Skeptic_Play_1_Steps.svg)                  | [Post](https://skepticsplay.blogspot.com/2010/10/fractal-maze.html)                                               | [Maze](./Orelcosseron_Fractal_Maze_python/mazes/4_-_square.maze)                                                                                                                |
| Skeptic Play Sierpinksi    | Siggy             | [Image](./Maze_Images/Siggy/Skeptic_Play_2.jpg)                                                                                                                              | [Post](https://skepticsplay.blogspot.com/2014/02/fractal-maze-2-sierpinski-paths.html)                            | [Maze](./Orelcosseron_Fractal_Maze_python/mazes/2_-_sierpinski.maze)                                                                                                            |
| Skeptic Play Carpet        | Siggy             | [Image](./Maze_Images/Siggy/Skeptic_Play_3.png), [Revised](./Maze_Images/Siggy/Skeptic_Play_3_Alt.png)                                                                       | [Post](http://skepticsplay.blogspot.com/2014/06/fractal-maze-3-walls-and-carpets.html)                            |                                                                                                                                                                          |
| Simple Cantor              | Siggy             | [Image](./Maze_Images/Siggy/Simple_Cantor_Maze.svg)                                                                                                                          | [Post](https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/)                              |                                                                                                                                                                          |
| First Cantor               | Siggy             | [Image](./Maze_Images/Siggy/First_Cantor.svg)                                                                                                                                | [Post](https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/)                              |                                                                                                                                                                          |
| Infinite Descent           | Siggy             | [Image](./Maze_Images/Siggy/Infinite_Descent.svg)                                                                                                                            | [Post](https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/)                              |                                                                                                                                                                          |
| The Inner Frame            | Matthias Weber    | [PDF](./Maze_Images/The_Inner_Frame.pdf)                                                                                                                                     | [Post](https://theinnerframe.org/2021/01/29/fractal-maze/)                                                        | [Maze](./Orelcosseron_Fractal_Maze_python/mazes/7_-_Matthias_Weber_-_Fractal_Maze.maze)                                                                                         |
| Daedalus 1                 | Walter D. Pullen  | [Image](./Maze_Images/Daedalus_1.gif)                                                                                                                                        | [Image](https://www.astrolog.org/labyrnth/maze/fractal2.gif)                                                      |                                                                                                                                                                          |
| Daedalus 2                 | Ed Pegg Jr        | [Image](./Maze_Images/Ed_Pegg_Jr/Daedalus_2.jpg)                                                                                                                             | [Post (Scene 21)](http://numb3rs.wolfram.com/406/)                                                                |                                                                                                                                                                          |
| Daedalus 3                 | Ed Pegg Jr        | [Image](./Maze_Images/Ed_Pegg_Jr/Daedalus_3.gif)                                                                                                                             | [Image](http://www.mathpuzzle.com/DaedRecursive.gif)                                                              |                                                                                                                                                                          |
| Wolfram 0                  | Mark J. P. Wolf   | [Image](./Maze_Images/Mark_J_P_Wolf/Wolfram_0.jpg)                                                                                                                           | [Image](http://www.mathpuzzle.com/FractalMazeSimple.gif)                                                          |                                                                                                                                                                          |
| Wolfram 1                  | Mark J. P. Wolf   | [Image](./Maze_Images/Mark_J_P_Wolf/Wolfram_1.gif), [Solution](./Maze_Images/Mark_J_P_Wolf/Wolfram_1_-_Solution.jpg)                                                         | [Image](http://www.mathpuzzle.com/FractalMaze.gif)                                                                |                                                                                                                                                                          |
| Wolfram 2                  | Mark J. P. Wolf   | [Image](./Maze_Images/Mark_J_P_Wolf/Wolfram_2.jpg), [Nested](./Maze_Images/Mark_J_P_Wolf/Wolfram_2_-_Nested.png), [Wires](./Maze_Images/Mark_J_P_Wolf/Wolfram_2_-_Wires.png) | [Post](https://maa.org/editorial/mathgames/mathgames_11_24_03.html), [Image](https://i.stack.imgur.com/fTl1w.gif) | [Maze](./Orelcosseron_Fractal_Maze_python/mazes/3_-_microchip.maze)                                                                                                             |
| Spiral Maze                | Martin Windischer | [Image](./Maze_Images/Martin_Windischer/Windischer.png), [Recursion Points](./Maze_Images/Martin_Windischer/Windischer_Recursion.jpg)                                        | [Post](https://www.mathpuzzle.com/17Dec06.html)                                                                   |                                                                                                                                                                          ||
| Fractal Block Maze         | Koteitan          | [Image](https://koteitan.github.io/fractalblockmaze/)                                                                                                                        | <<<                                                                                                               |                                                                                                                                                                          |
| Snuke 1                    | Snuke_            | [Image](./Maze_Images/snuke/Snuke_1.jpg)                                                                                                                                     | [twitter](https://x.com/snuke_/status/1508804002942980098/photo/1)                                                |
| Snuke 2                    | Snuke_            | [Image](./Maze_Images/snuke/Snuke_2.jpg)                                                                                                                                     | [twitter](https://x.com/snuke_/status/1508804002942980098/photo/2)                                                |
| Snuke 3                    | Snuke_            | [Image](./Maze_Images/snuke/Snuke_3.png)                                                                                                                                     | [twitter](https://x.com/snuke_/status/1508804002942980098/photo/3)                                                |
| Snuke 4                    | Snuke_            | [Image](./Maze_Images/snuke/Snuke_4.png)                                                                                                                                     | [twitter](https://x.com/snuke_/status/1508804002942980098/photo/4)                                                |

### Mazes to Add

- https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/
- https://omeometo.hatenablog.com/entry/2018/12/28/155549
- https://puzzles.mit.edu/2020/puzzle/backlot/
  - https://puzzles.mit.edu/2020/puzzle/backlot/solution/

### Fractal Maze Programs

- Alice and the Hedge Maze Solver
  - https://github.com/Techtress/Alice-and-the-Fractal-Hedge-Maze-Solver/blob/master/MazeSolver.cpp
  - Only for this maze but can possibly extend
- Web Player
  - https://github.com/amurielagi/fractal-maze
  - https://amurielagi.github.io/fractal-maze/
  - Has import and export
- Fractal Block Maze
  - https://github.com/koteitan/fractalblockmaze
  - https://koteitan.github.io/fractalblockmaze/
  - This is a different way to approach building mazes. Want to work in this style of connections between submazes
- Daedalus Maze Generator
  - https://www.astrolog.org/labyrnth/daedalus.htm
  - Just cool program
- Mark J. P Wolf Maze Player
  - https://sparecycles.github.io/fractal-maze/
  - https://github.com/sparecycles/fractal-maze
  - This is cool as it can display solutions partway. Want to work in the solution player
- Oreclosseron's Fractal Maze Player
  - https://orelcosseron.github.io/fractal-maze/
  - https://github.com/orelcosseron/fractal-maze
  - https://github.com/orelcosseron/Fractal-Maze-Python
  - This shows the infiniteness of the mazes
  - Like how it looks. Want to work in the player
- Fractal Maze Solver
  - https://github.com/koteitan/fractal-maze-solver/
- Fractal Maze Repeated
  - Has one way terminal. Might be good for some of Snuke's mazes. Has solver

### Interesting Papers

- [Omeometo's Diary](./Papers/Fractal_maze_etc.-omeometo's_diary.pdf) - [Online Link](https://omeometo.hatenablog.com/entry/2018/12/28/155549)
- [Fractal Maze to PDA](./Papers/Fractal_Maze_to_PDA/Fractal_Maze_to_PDA.md)
- [Decidability of Fractal Maze](./Papers/Decidability_of_fractal_maze-Theoretical_Computer_Science_Stack_Exchange.pdf) - [Online Link](https://cstheory.stackexchange.com/questions/11024/decidability-of-fractal-maze)
- [Complexity of reachability in fractal mazes with traps](./Papers/Fractal_mazes_with_traps.pdf) - [Online Link](https://cstheory.stackexchange.com/questions/52040/complexity-of-reachability-in-fractal-mazes-with-traps)
- [Fractal maze](https://freethoughtblogs.com/atrivialknot/2020/02/19/fractal-maze/)
- [Solving Fractal Mazes](https://freethoughtblogs.com/atrivialknot/2023/10/18/solving-fractal-mazes/)
- [Infinite Fractal Mazes](https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/)
- [CONNECTEDNESS PROPERTIES OF SELF-SIMILAR GRAPHS](https://ruor.uottawa.ca/server/api/core/bitstreams/8b7238c3-dde1-40ca-99dc-c00c64061cd0/content)
