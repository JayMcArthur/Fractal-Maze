# Fractal Maze Lab

A static-deployable workbench for viewing, playing, replaying, editing, and
understanding fractal mazes. Built on a Python foundation that validates and
exports Browser Packages; the workbench itself is a Svelte 5 + Vite app that
runs in any modern browser without a backend.

## Open the workbench

- **Live:** browse the deployed Pages site (path: `web/dist/` after CI builds it).
- **Local:** `cd web && npm install && npm run dev`, then open the URL Vite
  prints. Append `?package=<id>` to deep-link to one maze.

## What it does today

- Plays four maze families through a single workbench surface:
  - normal recursive PDA mazes (Skeptic Play #1, Wolfram #1, Alice, ...)
  - port-ambiguous recursive mazes (Wolfram #2)
  - Infinite Hop and Cantor Hop proof mazes with a working proof submission UX
  - Koteitan's Fractal Block Maze (coordinate-path runtime with depth control)
- Replays packaged solutions at variable speed.
- Records your own play session and downloads it as a `fmaze-solution-v0`
  YAML that round-trips through the Python validator.
- Lets you author a brand-new recursive maze from scratch via the address-graph
  editor (`1 → A.p2` style), with live PDA preview, live validation, draft
  persistence in localStorage, and YAML export.

## Open in the workbench

| Name                       | Author            | Maze Image                                                                                                                                                                   | Online Links                                                                                                      | Workbench                                                                                                                                                              | Package                                                                                                                                                                  |
|----------------------------|-------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Alice and the Hedge Maze   | Mike Earnest      | [Image](./Maze_Images/Mike_Earnest/Alice_and_the_Hedge_Maze.png)                                                                                                             | [Post](https://puzzling.stackexchange.com/questions/37675/alice-and-the-fractal-hedge-maze)                       | [Play](./web/dist/index.html?package=alice_and_the_hedge_maze)                                                                                                         | [Package](./packages/source/alice_and_the_hedge_maze/package.yml)                                                                                                       |
| Berkly                     | Mike Earnest      | [Image](./Maze_Images/Mike_Earnest/Berkly.jpg)                                                                                                                               | ?????                                                                                                             | [Play](./web/dist/index.html?package=berkly)                                                                                                                           | [Package](./packages/source/berkly/package.yml)                                                                                                                         |
| Geocaching - Easter 13-#10 | Amurielagi        | [Image](./Maze_Images/Geocaching_Easter_13-#10.png)                                                                                                                          | [Github Repo](https://github.com/amurielagi/fractal-maze)                                                         | [Play](./web/dist/index.html?package=geocaching_easter_13_10)                                                                                                          | [Package](./packages/source/geocaching_easter_13_10/package.yml)                                                                                                        |
| A Long Path v*             | Jay McArthur      | [Image](./Maze_Images/Jay_McArthur_-_A_Long_Path_v6.png)                                                                                                                     | N/A -> This Repo                                                                                                  | [Play](./web/dist/index.html?package=jay_mcarthur_1)                                                                                                                   | [Package](./packages/source/jay_mcarthur_1/package.yml)                                                                                                                 |
| Luegarua                   | Luegarua          | [Image](./Maze_Images/Luegarua.webp)                                                                                                                                         | [Reddit](https://www.reddit.com/r/mazes/comments/12k2v79/recursive_fractal_maze/)                                 | [Play](./web/dist/index.html?package=luegarua_recursive_fractal_maze)                                                                                                  | [Package](./packages/source/luegarua_recursive_fractal_maze/package.yml)                                                                                                |
| Skeptic Play Circle        | Siggy             | [Image](./Maze_Images/Siggy/Skeptic_Play_1.jpg), [SVG](./Maze_Images/Siggy/Skeptic_Play_1.svg), [Steps](./Maze_Images/Siggy/Skeptic_Play_1_Steps.svg)                        | [Post](https://skepticsplay.blogspot.com/2010/10/fractal-maze.html)                                               | [Play](./web/dist/index.html?package=skeptic_play_1)                                                                                                                   | [Package](./packages/source/skeptic_play_1/package.yml)                                                                                                                 |
| Skeptic Play Sierpinski    | Siggy             | [Image](./Maze_Images/Siggy/Skeptic_Play_2.jpg)                                                                                                                              | [Post](https://skepticsplay.blogspot.com/2014/02/fractal-maze-2-sierpinski-paths.html)                            | [Play](./web/dist/index.html?package=skeptic_play_2_sierpinski)                                                                                                        | [Package](./packages/source/skeptic_play_2_sierpinski/package.yml)                                                                                                      |
| Skeptic Play Carpet        | Siggy             | [Image](./Maze_Images/Siggy/Skeptic_Play_3.png), [Revised](./Maze_Images/Siggy/Skeptic_Play_3_Alt.png)                                                                       | [Post](http://skepticsplay.blogspot.com/2014/06/fractal-maze-3-walls-and-carpets.html)                            | [Play](./web/dist/index.html?package=skeptic_play_3)                                                                                                                   | [Package](./packages/source/skeptic_play_3/package.yml)                                                                                                                 |
| Simple Cantor              | Siggy             | [Image](./Maze_Images/Siggy/Simple_Cantor_Maze.svg)                                                                                                                          | [Post](https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/)                              | [Play](./web/dist/index.html?package=simple_cantor_maze)                                                                                                               | [Package](./packages/source/simple_cantor_maze/package.yml)                                                                                                             |
| First Cantor               | Siggy             | [Image](./Maze_Images/Siggy/First_Cantor.svg)                                                                                                                                | [Post](https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/)                              | [Play](./web/dist/index.html?package=first_cantor)                                                                                                                     | [Package](./packages/source/first_cantor/package.yml)                                                                                                                   |
| Infinite Descent           | Siggy             | [Image](./Maze_Images/Siggy/Infinite_Descent.svg)                                                                                                                            | [Post](https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/)                              | [Play](./web/dist/index.html?package=infinite_descent)                                                                                                                 | [Package](./packages/source/infinite_descent/package.yml)                                                                                                               |
| The Inner Frame            | Matthias Weber    | [PDF](./Maze_Images/The_Inner_Frame.pdf)                                                                                                                                     | [Post](https://theinnerframe.org/2021/01/29/fractal-maze/)                                                        | [Play](./web/dist/index.html?package=inner_frame)                                                                                                                      | [Package](./packages/source/inner_frame/package.yml)                                                                                                                    |
| Daedalus 1                 | Walter D. Pullen  | [Image](./Maze_Images/Daedalus_1.gif)                                                                                                                                        | [Image](https://www.astrolog.org/labyrnth/maze/fractal2.gif)                                                      | [Play](./web/dist/index.html?package=daedalus_1)                                                                                                                       | [Package](./packages/source/daedalus_1/package.yml)                                                                                                                     |
| Daedalus 2                 | Ed Pegg Jr        | [Image](./Maze_Images/Ed_Pegg_Jr/Daedalus_2.jpg)                                                                                                                             | [Post (Scene 21)](http://numb3rs.wolfram.com/406/)                                                                | [Play](./web/dist/index.html?package=daedalus_2)                                                                                                                       | [Package](./packages/source/daedalus_2/package.yml)                                                                                                                     |
| Daedalus 3                 | Ed Pegg Jr        | [Image](./Maze_Images/Ed_Pegg_Jr/Daedalus_3.gif)                                                                                                                             | [Image](http://www.mathpuzzle.com/DaedRecursive.gif)                                                              | [Play](./web/dist/index.html?package=daedalus_3)                                                                                                                       | [Package](./packages/source/daedalus_3/package.yml)                                                                                                                     |
| Wolfram 0                  | Mark J. P. Wolf   | [Image](./Maze_Images/Mark_J_P_Wolf/Wolfram_0.jpg)                                                                                                                           | [Image](http://www.mathpuzzle.com/FractalMazeSimple.gif)                                                          | [Play](./web/dist/index.html?package=wolfram_0)                                                                                                                        | [Package](./packages/source/wolfram_0/package.yml)                                                                                                                      |
| Wolfram 1                  | Mark J. P. Wolf   | [Image](./Maze_Images/Mark_J_P_Wolf/Wolfram_1.gif), [Solution](./Maze_Images/Mark_J_P_Wolf/Wolfram_1_-_Solution.jpg)                                                         | [Image](http://www.mathpuzzle.com/FractalMaze.gif)                                                                | [Play](./web/dist/index.html?package=wolfram_1)                                                                                                                        | [Package](./packages/source/wolfram_1/package.yml)                                                                                                                      |
| Wolfram 2                  | Mark J. P. Wolf   | [Image](./Maze_Images/Mark_J_P_Wolf/Wolfram_2.jpg), [Nested](./Maze_Images/Mark_J_P_Wolf/Wolfram_2_-_Nested.png), [Wires](./Maze_Images/Mark_J_P_Wolf/Wolfram_2_-_Wires.png) | [Post](https://maa.org/editorial/mathgames/mathgames_11_24_03.html), [Image](https://i.stack.imgur.com/fTl1w.gif) | [Play](./web/dist/index.html?package=wolfram_2)                                                                                                                        | [Package](./packages/source/wolfram_2/package.yml)                                                                                                                      |
| Spiral Maze                | Martin Windischer | [Image](./Maze_Images/Martin_Windischer/Windischer.png), [Recursion Points](./Maze_Images/Martin_Windischer/Windischer_Recursion.jpg)                                        | [Post](https://www.mathpuzzle.com/17Dec06.html)                                                                   | [Play](./web/dist/index.html?package=spiral_maze_windischer)                                                                                                           | [Package](./packages/source/spiral_maze_windischer/package.yml)                                                                                                         |
| Fractal Block Maze         | Koteitan          | [Image](https://koteitan.github.io/fractalblockmaze/)                                                                                                                        | <<<                                                                                                               | [Play](./web/dist/index.html?package=koteitan_fractal_block_default)                                                                                                   | [Package](./packages/source/koteitan_fractal_block_default/package.yml)                                                                                                 |

### Foundation-only fixtures (not in the README maze list above)

- `infinite_hop_1` — synthetic Infinite Hop proof maze for testing the
  proof-submission UX
- `cantor_proof_1` — synthetic Cantor Hop proof maze
- `tiny_repeated_tiled` — minimal repeated-tile-port fixture

### Mazes to add

- https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/
- https://omeometo.hatenablog.com/entry/2018/12/28/155549
- https://puzzles.mit.edu/2020/puzzle/backlot/

## How it is built

```text
Source Package (YAML)                — hand-authored, archival
        │
        ▼  Python validation
Validated Source Package
        │
        ▼  Python export (tools/export_browser_package.py)
Browser Package (JSON)               — committed under packages/browser/
        │
        ▼  static fetch from web/
Svelte 5 Workbench                   — TS port of the logic core
   ├── auto graph view + player
   ├── fractal block view + depth control
   ├── proof submission editor
   ├── solution playback + recording
   └── address-graph editor (authoring)
```

The Python foundation is the single source of validation truth. Every
`fmaze-solution-v0` YAML produced by the workbench round-trips through
`python3 tools/validate_package.py` without modification.

## Project layout

```text
docs/                   architecture, milestone spec, design notes
src/fractal_maze_lab/   Python foundation (logic core, validation, export)
packages/source/        hand-authored Source Package YAML
packages/browser/       generated Browser Package JSON (committed)
schemas/                JSON Schemas for every layer
tools/                  CLIs: validate, export, fmaze run
tests/                  Python unittest
web/                    Svelte 5 + Vite workbench
.github/workflows/      CI + Pages deployment
```

## Running the Python foundation

```sh
python3 -m unittest discover -s tests -v
python3 tools/validate_package.py packages/source/skeptic_play_1/package.yml
python3 tools/export_browser_package.py --all
python3 tools/fmaze.py solve packages/source/skeptic_play_1/package.yml
```

## Running the workbench

```sh
cd web
npm install
npm run dev
npm test            # vitest
npm run build       # vite -> dist/
```

## Other fractal maze programs and references

### Programs

- Alice and the Hedge Maze Solver — https://github.com/Techtress/Alice-and-the-Fractal-Hedge-Maze-Solver/blob/master/MazeSolver.cpp
- Web Player — https://github.com/amurielagi/fractal-maze
- Fractal Block Maze — https://github.com/koteitan/fractalblockmaze
- Fractal Maze Solver — https://github.com/koteitan/fractal-maze-solver
- Repeated Maze — https://github.com/koteitan/repeated-maze
- Daedalus Maze Generator — https://www.astrolog.org/labyrnth/daedalus.htm
- Mark J. P Wolf Maze Player — https://github.com/sparecycles/fractal-maze
- Oreclosseron's Fractal Maze Player — https://github.com/orelcosseron/fractal-maze

### Papers

- [Omeometo's Diary](./Papers/Fractal_maze_etc.-omeometo's_diary.pdf) — [Online](https://omeometo.hatenablog.com/entry/2018/12/28/155549)
- [Fractal Maze to PDA](./Papers/Fractal_Maze_to_PDA/Fractal_Maze_to_PDA.md)
- [Decidability of Fractal Maze](./Papers/Decidability_of_fractal_maze-Theoretical_Computer_Science_Stack_Exchange.pdf) — [Online](https://cstheory.stackexchange.com/questions/11024/decidability-of-fractal-maze)
- [Complexity of reachability in fractal mazes with traps](./Papers/Fractal_mazes_with_traps.pdf) — [Online](https://cstheory.stackexchange.com/questions/52040/complexity-of-reachability-in-fractal-mazes-with-traps)
- [Fractal maze](https://freethoughtblogs.com/atrivialknot/2020/02/19/fractal-maze/)
- [Solving Fractal Mazes](https://freethoughtblogs.com/atrivialknot/2023/10/18/solving-fractal-mazes/)
- [Infinite Fractal Mazes](https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/)
- [Connectedness Properties of Self-Similar Graphs](https://ruor.uottawa.ca/server/api/core/bitstreams/8b7238c3-dde1-40ca-99dc-c00c64061cd0/content)

## Contributing

Adding a maze: drop a `packages/source/<id>/package.yml` + `logic.yml`, run
`python3 tools/validate_package.py <path>` to confirm it parses, run
`python3 tools/export_browser_package.py --all` to generate the JSON, and
include the maze image in `Maze_Images/`. The README list and the workbench
catalogue both pick it up automatically.

PRs welcome.
