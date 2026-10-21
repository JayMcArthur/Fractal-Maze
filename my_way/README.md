# Fractal Maze

A local-first React/TypeScript application for recursive mazes, with block play,
maze-local replays, finite search, manual proof construction and browser authoring.
Original programs and drawings remain source references and maze covers.

## Run

From `my_way`:

```bash
nix develop path:. --command npm ci
nix develop path:. --command npm run dev
```

The locked Nix environment provides Node 22.23.3, Chromium and the Python tools
used for offline checks. Prefix noninteractive build/test commands with
`nix develop path:. --command` too. Other hosts use the exact Node version in
`.node-version`, then `npm ci`. Open the Vite URL at `/Fractal-Maze/`.

## Play and solve

The public Library groups puzzles by author and prefers native block remakes.
Original/custom images are covers; new path-maze runs use block controls.
Incomplete models stay in Play with a WIP page. Use Library's separate Edit or
Edit draft action to open authoring.

Choose a shared solution or saved recording in the replay bar beneath its maze.
Play/pause, step, seek, change speed, import or export recordings there. Replays
contain independent maze snapshots, so subsequent edits do not change old runs.
Archived recordings retain their recorded layouts. The collection includes
77 checked recordings across 67 document variants; [solution coverage](docs/SOLUTION_COVERAGE.md)
records unresolved source interpretations and certificates.

**Solve & analyze** provides title/author search and author/type filters. Path
models support balanced PDA search and bounded stack search; square corridors
also support grid BFS/IDDFS. Coordinate/pattern families retain their native
searches. A bounded search failure does not prove a maze impossible.

**Proof notebook** opens over the current path-maze run. For an infinite hop,
choose the left and right starting lines and move through the two block mazes.
Each board opens on the full layout with matching line labels; blue highlights
its current line. Enable **Local view** to follow movement more closely.
Click a board to control it with the keyboard, or use its arrows and gates.
The notebook detects the common repeating copies from both recorded trails.
Use **Start repetition here** to mark finite setup routes before the repeating part.
Check and save the connection, then return to Play; a **Use proof** action stays
visible when that checked connection can be followed. Saved connections can also
be reused while building another witness. Advanced controls retain explicit copy
addresses and certificate editing. Cantor groups still require every related
witness. Claims used by a run remain fixed until their moves are undone, and
proof-assisted replays retain their evidence. The notebook begins empty.

Square controls: arrows, WASD, IJKL or on-screen arrows; Z to undo, R to restart,
H for help and F for fullscreen. Path blocks support keyboard/touch walking,
stopping at junctions and copy gates. Hold a direction key to keep moving or
retrying that direction; release it to stop. Opening a dialog, editing a field
or leaving the window cancels the hold. Unfinished runs warn before leaving.

## Movement architecture

Path-based recursive mazes use a PDA: a connected path is the finite control
state, and the copy address is the stack. Enter pushes, exit checks and pops,
and ordinary walking preserves the stack. Physical corridor geometry determines
where transitions occur. Square Play and Solve share verified corridor bindings;
geometric, recursive-port and wire imports compile through one shared path.

Infinite/Cantor hops add separately checked proof rules to that finite transition
model. Block patterns, repeated-coordinate mazes and constrained grid tours retain
their richer native state. They are not assumed equivalent to an ordinary PDA.
[Movement model and module ownership](docs/MOVEMENT_MODEL.md) describes the contracts.

## Build and import

Build creates block/path projects. The tracing workbench can use an SVG or image
to design connected paths, copy frames, directed transitions and start/finish.
Changing the source artwork preserves the PDA; the mapping must still be reviewed.
Tracing is an authoring tool, separate from block Play. The native grid-tour
constraints are not preserved by a path-only tracing project.

`.fmaze` preserves the complete native definition, artwork and proof notebook.
[PDA JSON](docs/PDA_FORMAT.md) imports/exports supported finite path transitions;
checked proof claims require the complete project or replay. Orel `.maze`,
Koteitan block JSON, Amurielagi `FRACTAL-MAZE.v2` collections and repeated directed
port text also import. Collection import saves every included maze. Geometric
source export preserves original coordinates, colors and gate numbers.

Use **Cover image** on a Library card or in Build to upload an SVG, PNG, JPEG,
WebP or GIF up to 5 MB. Covers do not replace movement geometry or rules.
Removing a custom cover restores the original/default preview.

Projects, covers and recordings live in the browser's IndexedDB. Export files
before clearing site data or moving to another browser.

[Interface surface styles](docs/VISUAL_SYSTEM.md) describes the shared visual rules
and the generated reference used for the current presentation.

## Verification

```bash
nix develop path:. --command npm test -- --maxWorkers=2
nix develop path:. --command npm run lint
nix develop path:. --command npm run build
nix develop path:. --command npm run test:browser -- --workers=2
```

The local browser suite starts Vite on port 5174. CI tests the production build.
For a running preview, set `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175/Fractal-Maze/`.
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` selects an installed Chromium. The pinned shell
sets it automatically. [Static hosting](docs/STATIC_HOSTING.md) covers Pages,
website mounts, route refreshes and worker resources.

## Source data and reference documents

After changing definitions/solution fixtures, run
`python scripts/prepare-shared-replays.py` with Vite on port 5174. After catalog
metadata, source bindings or cover geometry changes, run
`python scripts/prepare-library-index.py`. Register solutions regenerate with
`python scripts/prepare-register-solutions.py`. Offline Python tooling is not
part of the browser runtime.

[Project inventory](docs/PROJECT_INVENTORY.md),
[upstream additions and adoption](docs/UPSTREAM_CHANGELOG.md),
[historical recovery](docs/HISTORICAL_WORK_REVIEW.md) and
[PDA conversion inventory](docs/PDA_CONVERSIONS.md) preserve source provenance.
Older audits and screenshot galleries are checkpoint evidence; their source-play
requirements are superseded by block play with separate image covers.

Current planning, tickets and handoffs live in
[SilverBullet](http://localhost:8313/yoss/Projects/FractalMaze/Plan).
From the actual worktree, run `workspace notes context` and `workspace notes plan`.
Repository documents own build instructions, technical contracts and reference
snapshots; project plans stay in SilverBullet.
