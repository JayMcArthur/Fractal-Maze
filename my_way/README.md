# Fractal Maze

A local-first React/TypeScript application for recursive mazes. It uses the original
programs in this repository as geometry and movement references, with a shared
library, imports, exports, and browser persistence.

## Planning

Current plans, tickets and handoffs live in [SilverBullet](http://localhost:8313/yoss/Projects/FractalMaze/Plan).
From this checkout, run `workspace notes context` and `workspace notes plan`.
Build instructions, formats and source references remain in this repository.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL at `/Fractal-Maze/`. The application opens on Home. Bound source mazes open their block remake in Play; their original drawings remain selectable and serve as covers.

## What works

The library groups 74 document variants into 49 maze entries by author, with selectable source drawings and remakes. It includes nine Orel corridor mazes, two unique Amurielagi geometric mazes, Koteitan block patterns, legacy and updated repeated mazes, recursive ports, the original Wolf wire player, source/PDA conversions and infinite-rule examples. Saved projects remain independent. Reference artwork preserves all 41 original assets plus two README-backlog sources. Of 31 puzzle-artwork assets, 28 have bound source routes; Berkly is a crossing candidate and Windischer’s three views remain unbound. Image interpretations remain WIP until reviewed.

| Representation | View / navigate | Edit | Solve |
| --- | --- | --- | --- |
| Orel square recursion | Keyboard/touch movement; animated entry/exit; authored colors, circular pads, fading gates, route lines | Grid, blocks, links, exits, player, trophies, teleporters, metadata; document undo/redo | Simplified PDA balanced search, grid BFS and IDDFS in workers |
| Amurielagi geometric recursion | Shared PDA block player retaining every source floor cell; keyboard/click movement, copy depth, undo and physical replays | Edit the compiled paths/geometry in Build; original-format export remains available | Exact balanced PDA or bounded search; checked Tsat solution |
| Omeometo / Koteitan block recursion | Exact recursive movement, zoom without resetting, undo; actual copy depth and immutable replays | Edit base cells and start/goal, save, export | Bounded worker BFS; 1,756-move depth-five source witness |
| Backlot grid tours | Actual dots, line counts, noncrossing paths and oriented recursive studios; undo and room review | Canonical import/export; WIP source conversion | Optional validated 337-move, six-room tour and replays |
| Labeled portal graph | Draw and traverse declared connections; respect one-way arrows | Import canonical graph documents | Manual portal traversal |
| Repeated directed ports | Shared-terminal legacy rules and distinct atomic W/E/N/S/C terminals; origin rules; batched connection maps | Import port rules | Bounded BFS in a worker; bundled source solutions; saved replays |
| Recursive ports | Shared PDA-backed block movement for bundled and imported rules, including copy replacement and root changes | Import canonical definitions | Exact balanced PDA search or bounded stack BFS; verified Koteitan route; maze-local replays |
| Path-labeled PDA | Source artwork, connected-path highlights, explicit copy stack, manual traversal | Source-coordinate SVG/raster tracing, connected paths, frames, directed transitions and endpoints | Bounded BFS, supplied guide inputs, saved full/partial replays |
| Infinite/Cantor rules | Original source SVGs and finite movement | Empty proof notebook: choose claims, build witnesses, add joint Cantor hypotheses and reuse checked lemmas | Explicit proof checking under the selected movement rules |
| Wolf wire maze | Shared PDA block/source movement, copy depth, undo and physical replay playback | Inspect the compiled model in Build; original-format export retained | Balanced PDA search and eleven named source solutions |

`.fmaze` preserves each native definition. Orel `.maze`, Koteitan block JSON,
Amurielagi `FRACTAL-MAZE.v2` collections, and repeated directed-port text import
through the same dialog. A collection import saves every maze. Geometric source
export preserves coordinates, colors, gate numbers, and original source fields.

Replays include an immutable maze snapshot. Choose shared solutions or saved recordings
in the bar beneath the maze in Play. Play/pause, step, seek, adjust speed, export or
import `.fmaze-solution.json` files there. Solver results open in the same player.
Shared choices use a small index; a recording loads only when selected.
The 76 bundled solutions cover 66 document variants; Wolf's eleven original solutions
now use the shared physical replay player. [Coverage](docs/SOLUTION_COVERAGE.md) records remaining gaps.
The cp3-3 and compiled three-register examples have source-checked solutions of about 1.23 million moves each, stored as compact translated patterns. Regenerate them with `python scripts/prepare-register-solutions.py`; their atomic start/finish use the origin.
After changing catalog definitions or solution fixtures, regenerate the published
recordings with `python scripts/prepare-shared-replays.py` using Vite on port 5174.
After changing catalog metadata, source bindings or cover geometry, run
`python scripts/prepare-library-index.py` to refresh Library's card index and static
covers. Original artwork remains the cover where available; saved projects render
their current document.

**Solve & analyze** combines title/author search, author/type filters, view selection,
PDA simplification, balanced copy search, grid BFS/IDDFS and manual proof construction.
Source drawings support keyboard/touch walking, stopping at junctions and copy gates.
Alice, Square, Microchip and Inner Frame have verified source/corridor PDA mappings.

Orel controls: arrows, WASD, IJKL, or the on-screen buttons to move; Z to undo;
R to restart; H for help; F for fullscreen. On phones,
secondary controls are under Settings. The square editor also fits a phone.

## Trace and review an image

Open **Build → Convert a drawing** for a new image/PDA project, or **Library → Reference artwork → Review WIP / trace** for an existing source. The workbench keeps the source layout separate from its movement model.
Assign one label per connected path, merge split fragments by assigning the same label,
place copy frames, and review directed transitions before choosing start/finish.
SVG curves and transforms stay exact until their vertices are edited. You can upload
an SVG/raster drawing or select another source layout without replacing the PDA.

**Save workbench** preserves the model, artwork, review notes and unfinished proof.
**Export workbench** creates a complete `.fmaze`; **Export PDA** creates its finite
transition specification. **Play** provides source walking and explicit stack movement. **Solve & analyze** provides
finite-route search and guide-input replay. A rejected input retains its last legal
route for inspection and saves as a partial replay when it has not reached the goal.

**Proof notebook** lets you choose the rule and endpoints, construct each witness
with legal moves, then select **Check my proof**. Left/right setup trails can reach separate anchors before a shared repeating word such as BAC. Copy-address comparisons are available in a foldout. Multiple proofs can support one connection; checked claims compose into replayable proof solutions. Cantor groups require a witness for
every related connection. Saved claims are rechecked after topology changes. The
source artwork stays in Trace & PDA; the proof screen focuses on the claim and trails. Copy addresses, trail histories and related Cantor hypotheses open only when needed.

## Verification

```bash
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:browser
```

The local browser suite starts Vite on port 5174. CI checks the production preview after building. To check a running production preview:

```bash
npm run preview -- --host 127.0.0.1 --port 5175
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175/Fractal-Maze/ npm run test:browser
```

`PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an already installed Chromium binary.
The earlier renderer/proof checkpoint passed 236 unit tests and 71 production browser workflows, plus 16 focused workflows. Latest checks pass 306 unit tests and 95 production browser workflows, plus three affected workflows rechecked after the final proof-label cleanup, lint and Pages/root builds: [current block/source checks](docs/BLOCK_SOURCE_CHECKS.json). [Current checks](docs/UNIFIED_PLAY_CHECKS.json), [Play screenshots](docs/screenshots/play-refinement/index.html) and [proof screenshots](docs/screenshots/proof-cleanup/index.html) record that checkpoint; [Workbench audit](docs/PDA_WORKBENCH_AUDIT.md) records earlier audit measurements.
Tests cover persistence, complete collection import/source export, pattern editing,
replay independence and playback, mobile controls/editor alignment, camera entry
and exit with normal/reduced motion, graph traversal, repeated-maze solving, and
all three production solver workers, normal movement without a field flash, first-save undo history, and replay file import.

[Project inventory](docs/PROJECT_INVENTORY.md) records the original programs,
notes, and baseline failures. [Finished screenshot gallery](docs/screenshots/finished/index.html)
contains 30 captures, including every bundled corridor and geometric maze.
[Latest review screenshots](docs/screenshots/review/index.html) show the updated library, guide, builder, and new maze families.
[PDA conversion inventory](docs/PDA_CONVERSIONS.md) identifies which drafts need gate/crossing review. [Workbench screenshots](docs/screenshots/workbench/index.html) show tracing, proof construction and phone layouts. The [current SilverBullet plan](http://localhost:8313/yoss/Projects/FractalMaze/Plan) tracks remaining work; the linked checks record implementation evidence.

## Limits

Search limits do not prove an infinite recursive maze unsolvable. IDDFS action
depth is independent of the recursion-depth cap. Repeated search bounds both
coordinates and explored states; manual navigation has no coordinate cap.

Block movement, finite expansion solving and pattern editing are native app features.
Geometric Play, Solve and Build now share the physical PDA. All twelve imported geometric templates retain their exact unit-cell layouts; original drawings remain covers and original-format exports. Archived geometric recordings keep their original export while playing on the shared canvas.
The tracing workbench can capture those layouts into a separate PDA project. PDA JSON
exports the declared push/pop/walk transitions and exact finish address. Image interpretations
remain WIP until reviewed; extracted raster fragments and boundary candidates need inspection.

The proof notebook checks supplied finite witnesses, repeating-word infinite hops, joint
Cantor hypotheses at strictly deeper copies, and previously checked lemmas. It does not
claim completeness for every infinite derivation or decide arbitrary infinite-rule mazes.
It begins empty and never supplies a finished proof automatically. Koteitan port mazes use exact balanced PDA search; their verified source solutions are available in the maze's replay bar. Omeometo opens its base pattern and reveals smaller copies on zoom. Movement retains exact radix coordinates, with no fixed recursion-depth cap or global expanded grid. Its copy address controls the depth display and parent-location inset. Search detail is independent and bounded; the original depth-five witness remains available. This coordinate model has not been proved equivalent to an ordinary PDA.

The app is static and stores projects/replays in the browser's IndexedDB. Clearing
site data removes those records; exported files remain independent artifacts.

[Product and navigation flows](docs/PRODUCT_FLOWS.md) map browsing, building, source conversion, solving, playback and manual proofs. [Upstream refresh](docs/UPSTREAM_REFRESH.md) records fresh repository comparisons and the newer repeated-maze integrations. [Source conversion inventory](docs/PDA_CONVERSIONS.md) separates bound WIP models from unresolved source interpretations.

[README backlog and Daedalus refresh](docs/README_BACKLOG.md) documents the remaining source interpretations and the new constrained/block players.

[Upstream additions and what we adopted](docs/UPSTREAM_CHANGELOG.md) lists all ten refreshed programs. [Static hosting and security](docs/STATIC_HOSTING.md) covers GitHub Pages and website deployment. [Current review gallery](docs/screenshots/authors-proofs/index.html) shows author collections, Build and proof replay.

[Source image playability audit](docs/SOURCE_PLAYABILITY.md) records the Alice pixel-space correction, SVG finish-junction fix and every tested source player. Duplicate geometric remake views are removed; Home opens Alice in its block view; both views remain selectable.

[Unified Play report](docs/UNIFIED_PLAY.md) records the shared movement model, maze-local replay bar, combined solver, Home and final verification. [Current screenshots](docs/screenshots/play-refinement/index.html).

Checked claims are now usable in live source/block Play and physical replay recording. [Live proof checks](docs/LIVE_PROOF_CHECKS.json) record manual construction, saved playback and the 32 previously finite-unreachable Cantor gate checks. The full maze/model/source completion work remains in [current SilverBullet plan](http://localhost:8313/yoss/Projects/FractalMaze/Plan).

The geometric cutover covers all twelve import templates and both remaining catalog originals; [checks](docs/GEOMETRIC_PDA_CHECKS.json) record 24,442 native move correspondences, 312 unit tests and 99 production browser workflows. Home’s exact Alice preview now loads 450 KB of decoded JavaScript instead of 3.7 MB; [startup checks](docs/HOME_STARTUP_CHECKS.json) preserve the identical canvas hash and final 31-workflow/56-hosting checks. Library and Play data loading remain in the active completion plan.

The October 12 recovery restores the source omitted from historical commit `1b31242`: [what was recovered and what the current app uses](docs/HISTORICAL_WORK_REVIEW.md). The current app has 77 shared recordings across 67 variants, including cp3-4's checked 40.5-million-move solution. [Current solution gaps](docs/SOLUTION_COVERAGE.md) remain explicit. Play now loads only its selected document and uses 79% less decoded JavaScript; [static hosting and loading evidence](docs/STATIC_HOSTING.md).
