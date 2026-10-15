# Fractal maze project inventory

Investigation started October 9, 2026. The current custom application is `my_way`.
The repository also contains reference implementations with substantially different
maze representations. Existing staged changes and reference sources are preserved.

## Investigation plan

- [x] Locate project notes, repository instructions, and current application.
- [x] Read the maze formats and identify independent program families.
- [x] Run the current application's tests, lint, and production build.
- [x] Open every browser implementation and capture its useful views.
- [x] Run and capture the Python player if its GUI dependencies can be supplied.
- [x] Check the command-line solvers and the separate PDA experiment.
- [x] Compare visual behavior with the originals and record concrete gaps.
- [x] Re-scan outstanding claims and produce the next implementation plan.

## Earlier notes

- [Current SilverBullet plan](http://localhost:8313/yoss/Projects/FractalMaze/Plan): current product scope
  with editing, multiple representations, legacy imports, replay, and solvers.
- Earlier product and interface plans remain in normal Git history.
- `../README.md`: current application controls and claimed supported features.
- `../../readme.md`: historical maze/image catalog and project references.
- `../../Papers/Fractal_Maze_to_PDA/Fractal_Maze_to_PDA.md`: Jay's maze-to-PDA
  method, worked transitions, and a sample solution.

## Current checks

`my_way`: all 91 tests in 9 files passed; ESLint and the TypeScript/Vite
production build passed. These checks do not establish visual quality or
complete browser interaction coverage.

## Program inventory

| Directory | What it implements | Current evidence and useful reference |
| --- | --- | --- |
| `my_way` | Custom React, TypeScript, and Vite application: library, grid player/editor, replay, solvers, analysis, import/export | Nine bundled Orel-format mazes. All checks pass. Browser movement and square-maze solving work; several complete user flows remain broken. |
| `Orelcosseron_Fractal_Maze_python` | PySide6 desktop player for recursive corridor mazes | Nine `.maze` files, including Jay's Long Path v4/v8, Weber, Carpet, and Block Maze. Strong reference for continuous recursive zoom, gate fades, circular start pads, route lines, and maze-authored colors. |
| `Orelcosseron_fractal-maze-main` | Next.js/React web version of the Orel player | Four built-in mazes: Alice, Sierpinski, Microchip, Square. The existing static export runs when mounted at its configured `/fractal-maze` path. Recursive HTML tiles and submazes. |
| `amurielagi_fractal-maze-main` | Browser player and geometric path/gate editor | Twelve supplied mazes. Colored paths, labeled submazes, gate-based moves, animated transitions, undo/redo, move table, import/export, local saves. Its geometry is substantially different from Orel's bitmask grid. |
| `koteitan_fractalblockmaze-main` | Browser fractal block pattern editor, recursive viewer, and iterative-depth solver | Editable black/white generating pattern alongside its expansion, zoom, search frontier, and solution overlay. Recursion replaces black cells. |
| `koteitan_fractal-maze-solver-main` | C++ recursive block/port solver | Builds and finds a solution with the current `MAZE_KOTEITAN` selection. Other source models include Snuke 3 and 4. No graphical interface; the README's compile-time model names are stale. |
| `koteitan_repeated-maze-main` | C repeated-maze solver/generator plus browser visualizer | Repeated blocks on an unbounded coordinate grid, directed terminals, normal/nx/ny rules. Browser draws a route; CLI BFS reproduces the supplied 13-edge solution. This is distinct from nested Orel mazes. |
| `Webpage/fractal-maze-master` | Sparecycles' older canvas player for Mark J. P. Wolf's maze | Colored wire paths, recursive submazes, built-in solutions and partial route display. Useful replay reference despite its old jQuery implementation. |
| `Webpage` | Early collection-page scaffold | Runs into `data.forEach is not a function`: `mazes.json` is an object. Rendering/reset logic is still placeholder code. |
| `Papers/Fractal_Maze_to_PDA` | Jay's Python pushdown-automaton experiment | Five hardcoded maze examples and solution paths; all five are accepted with `automata-lib` 9.2.0. Separate from the current app's PDA exporter. |
| Root `main.py` | Old launcher for the PDA experiment | Imports a package at the old path; the actual implementation now lives under `Papers/Fractal_Maze_to_PDA`. It is not the maze player's entry point. |

`Maze_Images` and `Papers` additionally hold historical image/SVG/PDF references.
Cantor and infinite-descent mazes have references but no working custom-app
representation. `infiniteRule` is a reserved type label without a definition model.
The external programs named in the README (including Daedalus and the dedicated
Alice solver) are references, not additional checked-out implementations.

## Captured evidence

See [the screenshot gallery](screenshots/index.html). Raw captures include all
nine custom-app catalog mazes, all nine Python-player mazes, all four Orel-web
mazes, Amurielagi library/player/editor, Koteitan block/repeated views, the Wolf
player, and the collection scaffold. Custom-app captures additionally show
mobile layout, import validation, replay, and a successful solver run.

The Python player was run offscreen using a temporary virtual environment. On
this case-sensitive filesystem, its loader lowercases maze names but several
filenames retain capitals. A temporary copy with lowercase filenames enabled
all nine captures without changing the repository's reference sources.

## Concrete gaps in the custom application

1. **Koteitan rendering changes the maze's construction.** The original
   `main.js:drawUnit` expands cells whose map value is `1`, leaving `0` cells
   open. `src/core/render/canvas/BlockRecursiveRenderer.ts:drawLevel` leaves
   `1` cells solid and recursively expands `0` cells. The same 4-by-4 pattern
   consequently renders a different fractal. Large start/goal squares also
   cover the rendered pattern.
2. **Real Amurielagi imports fail and discard the original maze semantics.**
   Importing the repository's twelve-maze export produces `Duplicate graph
   node id "node-1"` and disables loading. The adapter only imports the first
   maze, uses nesting depth for missing node IDs, collapses numbered gates to
   their label prefix, drops path geometry, and leaves `connectsTo` empty.
   Fixing IDs alone will not preserve a playable maze.
3. **Saved player replays have no maze to render.** Two keyboard moves and
   Save replay produce a library replay link. Opening it displays controls
   without a canvas. `ReplayPage` looks up the maze only in the projects DB;
   `playerSlice.saveReplay` stores the replay but not its maze. Bundled catalog
   loading and imported maze definitions are not recovered by this flow.
4. **The grid renderer approximates the reference's visual behavior.** The
   custom player uses conspicuous triangles, thick block outlines, square
   breadcrumbs, a large outlined player marker, and two levels of default
   detail. Orel uses circular start pads, faded gate corridors, connected route
   lines, smaller markers, an outer rim, and deeper nested detail. The custom
   `_renderGrid` overwrites the block-color background before drawing cells.
   Context changes bypass interpolation in `MazeCanvas`; CSS feedback adds a
   glow but does not implement the Python animator's pan/zoom into submazes.
5. **Mobile layout makes the primary controls hard to reach.** At 390-by-844,
   the header and telemetry push the maze down, and the direction pad begins
   below the initial viewport. Settings and session panels produce a long
   scrolling page. Replay metadata also has poor contrast against the light
   background.
6. **The editor and library are incompletely connected.** A direct
   `/editor/alice-in-wonderland` visit opens a blank New Maze: editor routes
   look up local projects, not bundled catalog entries. Library cards provide
   play links but no Edit action or saved-project listing. Editing tools exist,
   but editing an existing library maze is not an integrated user flow.
7. **Additional families remain partial.** Block and graph documents are
   observer-only, solvers/editor/PDA analysis are square-only, repeated-maze
   rules have no native importer/model, and infinite-rule support has no
   implementation. The graph renderer displays the nesting hierarchy and
   portal markers but does not draw the declared `connectsTo` relationships.
   Capability text must describe these limits accurately.

## Residual verification plan

- [x] Resolve the Orel static export's apparent blank page by mounting its
  configured base path; all four maze selections render without console errors.
- [x] Resolve missing Python Long Path/Weber/Carpet captures using a temporary
  lowercase-filename copy; all nine render successfully.
- [x] Import Amurielagi's real bundled export through the current dialog;
  capture and identify the validation failure and lost path semantics.
- [x] Import the original Koteitan generating pattern with valid open start
  and goal cells; compare its expansion rules directly with source.
- [x] Save and open a player replay through the library to confirm missing
  maze rendering independently of the unit tests.
- [x] Select Square in the browser solver and run BFS; it finds a 566-step
  solution after exploring 91,723 nodes in the captured run.
- [x] Verify all five PDA examples using an isolated dependency environment.
- [x] Play and capture the Wolf built-in short solution; it displays the
  supplied sequence of twenty direction actions.
- [x] Verify every gallery link exists and all fifteen preview images load;
  inspect the rendered [comparison overview](screenshots/comparison-overview.png).
- [x] Re-scan remaining approximation/unsupported claims. The square-to-PDA
  exporter approximates link directions and takes the final block name for
  nested links; treating that export as a faithful general solver is future
  work. The five separately tested Python examples remain useful fixtures.

Investigation complete: 42 PNG captures, a browsable gallery, and source-backed
implementation gaps. Detailed repairs and the user's preferred final visual
style are follow-on work rather than unresolved inventory questions.

## Next implementation plan

These are follow-on implementation tasks, not completed features. The requested
project investigation establishes their scope and evidence; choosing the final
visual direction remains a user preference.

1. Preserve maze geometry, gates, authored colors, and route behavior against
   representative Orel captures, including Alice, Long Path, and Carpet.
2. Implement real enter/exit camera transitions with reduced-motion support;
   keep movement and camera state consistent through nested gate transitions.
3. Make maze choice, the field, and movement controls fit the first mobile
   viewport; reduce telemetry and move secondary settings behind disclosure.
4. Make replay carry or reliably recover its exact maze definition, then verify
   saving, reopening, scrubbing, and playback for bundled and imported mazes.
5. Connect catalog and saved projects to editing, preview, play, and reopening.
6. Correct the block-substitution contract and compare depth expansions with
   the original before adding block movement or solver support.
7. Preserve Amurielagi's full geometric path/gate documents and multiple-maze
   exports through a representation suited to them; remove heuristic topology
   conversion as the compatibility contract.
8. Add repeated-maze directed-port semantics and genuine graph gameplay only
   after those models have concrete fixtures and verified movement rules.
9. Keep conceptual infinite mazes and symbolic PDA solving as later work;
   retain the existing paper/examples as references.

No application or reference implementation was rewritten during this inventory.
The passing test/build baseline and existing staged work remain intact.


## Implementation update — October 9, 2026

The findings above describe the investigation baseline. The subsequent authorized
implementation rebuilt `my_way`; the original reference programs remain intact.

Completed repairs: Orel rendering and camera transitions, phone controls and editor
alignment, persistent catalogue/project editing, immutable replay snapshots and
correct scrubbing/playback, black-cell block substitution and pattern editing,
lossless geometric import/export of all twelve Amurielagi mazes with numbered-gate
traversal, declared graph connections/gameplay, and native repeated directed-port
navigation and bounded worker solving. The catalogue now contains 24 mazes.

The repeated solver reproduces the reference 13-edge route. The production Orel
Square solver finds its 566-step route, saves it as a solver replay, and reopens
it correctly. IDDFS no longer confuses action depth with recursive depth; bounded
search outcomes are not presented as proof that an infinite maze is unsolvable.

See [current SilverBullet plan](http://localhost:8313/yoss/Projects/FractalMaze/Plan), the current
[README](../README.md), and [finished captures](screenshots/finished/index.html).
The historical screenshots and comparison gallery remain useful before/after
references. Block solving and geometric editing stay in their original programs;
infinite-rule execution and faithful general PDA solving are explicitly deferred.


## Review update — October 9, 2026

The app now has 34 maze entries and all 41 source images/diagrams/PDFs in its
Reference artwork collection. Remaining encoded sources are included: cp6 and
md3/md4/md5 repeated rules with verified original routes; all three block patterns;
Snuke 3/4 and Koteitan C++ port tables with faithful transition semantics; and the
local original Wolf wire player with its built-in solution playback. Duplicate
Python/Next.js Orel datasets remain represented by the nine corridor entries.

Movement flicker was traced to a whole-field white feedback overlay and removed.
Replays now have their own navigation destination, direct solver playback, native
port/repeated routes, and file import/export. Builder cell placement, block
selection, teleporters, metadata undo, and first-save history were repaired.
Library action alignment and full thumbnails were corrected; Guide was rebuilt.

See [current SilverBullet plan](http://localhost:8313/yoss/Projects/FractalMaze/Plan) and
[review captures](screenshots/review/index.html). Image-only rules, full geometric
authoring, block walking/solving, and general symbolic PDA execution remain
explicit limits; no rules were invented from artwork.
