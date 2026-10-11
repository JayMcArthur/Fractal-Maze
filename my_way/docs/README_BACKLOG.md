# README maze backlog and Daedalus refresh

The root README’s three “Mazes to Add” links were checked against the actual catalog on October 10, 2026. The original maze list, source notes and staged files are preserved; root README links now follow the renamed Python folder and identify the current browser app.

| Source | Current result |
| --- | --- |
| [Siggy’s infinite fractal mazes](https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/) | Simple Cantor, First Cantor and Infinite Descent retain exact SVG curves, finite movement and a manual proof notebook. Extra movement rules require constructed witnesses. |
| [Omeometo’s article](https://omeometo.hatenablog.com/entry/2018/12/28/155549) | Its final 256×256 puzzle is exactly the existing Koteitan 4×4 pattern: all 65,536 pixels match the depth-four expansion. The existing `koteitan-block` ID is preserved and correctly attributed. Native finite play, worker BFS, zoom, endpoint editing and immutable replays are now integrated. |
| [Backlot](https://puzzles.mit.edu/2020/puzzle/backlot/) / [published solution](https://puzzles.mit.edu/2020/puzzle/backlot/solution/) | Added a constrained recursive grid tour, rather than a corridor model that drops the dots/counts. All 9×9 walls, eleven dots, numbered lines and oriented studios are transcribed from the source image. Navigation checks every room independently and prohibits retracing. The supplied tour remains optional. |

## Backlot extraction and independent check

[prepare-backlot.py](../scripts/prepare-backlot.py) reads the original raster’s corridor midpoints and enumerates simple paths through the required dots and row/column totals. It recovers 113 undirected corridor edges. Local search yields:

| Gates | Valid local paths before studio constraints |
| --- | --- |
| N–E | 3 |
| N–S | 0 |
| N–W | 1 |
| E–S | 1 |
| E–W | 0 |
| S–W | 1 |

These independently match the published solution. Two N–E candidates require impossible studio pairs. Finite composition starts with N–W, then enables E–S, S–W and the remaining N–E route. The resulting **337 moves** visit six rooms in the published order and reach **depth three**. Local cell counts are 59, 55, 57, 59, 55 and 57. All visited-cell histories, dots and numbered counts are checked in the runtime and replay importer. [Full local routes](BACKLOT_LOCAL_ROUTES.json) contain spoilers.

A blue studio counts once in its parent. Entering pushes a fresh room through the facing gate; exiting resumes at the parent’s adjacent square. Undo changes a drawing, while walking backward is prohibited. Completed rooms can be inspected with the exit-marking instructions. The app does not automatically reveal the puzzle’s final emoji.

## Omeometo’s finite witness

[prepare-block-solution.py](../scripts/prepare-block-solution.py) verifies the exact source pixels and independently runs BFS on the depth-five 1024×1024 grid. Its **1,756-move** witness matches the browser solver. The depth-four expansion is disconnected between the chosen regions; that is not an infinite nonreachability proof. White substitution cells stay open at deeper levels. Start/goal are projected from their base-cell centers, within the source’s open bottom/top regions; those regions extend to the original border entrances.

Finite play allows grids up to 2048×2048, with the depth selector reflecting that limit. Changing depth or pattern starts a new run. Editing the pattern or endpoints removes the now-stale supplied route. The original article’s explanatory diagrams remain research illustrations, rather than invented playable puzzles.

## Daedalus 3.5

The [official page](https://www.astrolog.org/labyrnth/daedalus.htm) links the author’s [CruiserOne/Daedalus repository](https://github.com/CruiserOne/Daedalus). A fresh source snapshot at `32af46ddf22e53c9bfd7bd7eacca1e249c60a5e8` (November 7, 2024) is preserved with its license and attribution in `upstream_sources/CruiserOne-Daedalus`. The manifest records this tenth repository, including Jay’s separate newer workbench.

`create3.cpp`’s `CreateMazeFractal2` generates recursive wire layouts, separates over/under crossings, and rejects layouts lacking a finite connection after recursively merging homologous pin sets. This supports keeping circuit connectivity separate from visual crossings. Its generation and full Windows interface were inspected as source, not executed or ported into the browser. No Windows runtime is installed here. The three existing Daedalus artwork conversions remain WIP with their explicit crossing/layout notes.

## Compiler construction recovered in the residual audit

The committed three-register example `3dcp.maze` omits its boundary sections. Running the current `nd-to-2d` compiler followed by `hs2maze` reconstructs normal/nx/ny/zero sections from `cp_n3.hs`. It is included as **Three-register counter pump — compiled (WIP)**. The compiler’s setup/teardown explicitly preserve the canonical `(0,1)` register/maze row, so its start is `(0,1,W0)` and its finish `(0,1,W1)`. A 300,000-state BFS finds no route within its budget. This neither proves failure nor supports publishing a supplied solution.

All 31 original `Maze_Images` files are covered by reference records. Geocaching’s `#` is removed only from the URL-safe asset filename; its original source path is preserved.

## Unfinished conversion and WIP review

Windischer's playable conversion remains in scope. Jay's instruction to skip one image mapping applied to v6. Windischer's travel surface and homologous layer gates remain unconfirmed; its three artwork views and conversion workspaces are retained. Berkly's colored and black wires are bound, but its crossing rule still needs review; the delivered WIP separate-wire candidate has no finite witness. Neither is presented as a verified source-maze proof.

On October 10 the continuation checked Windischer’s author-linked original GIF: it is the same 1200×1200 source resolution, so it supplies no higher-resolution terminal evidence. The author’s [November 2006 post](https://www.mathpuzzle.com/17Dec06.html) confirms one limit point but gives no terminal table or traversal rule. The Berkeley forum provenance link for other recursive maze drawings was retrieved directly and returned HTTP 403; it cannot confirm Berkly’s crossings. No graph change is inferred from these missing details.
