# Fractal Maze Lab — MVP Spec

This spec defines the first end-to-end shippable Fractal Maze Lab: every curated
maze in the archive is loadable, playable, replayable, and (for proof mazes)
solvable through proof submission, inside a static browser workbench. The
workbench also includes an address-graph editor that lets a user author a new
recursive Source Package from scratch and play it without leaving the browser.

Python remains the trusted foundation. The browser is the only runtime users
touch; Python's job is validation, normalization, and Browser Package export at
build time. This is the goal target for the `/goal` feature and is intended to
be decomposable into sequenced milestones with concrete acceptance criteria.

## Goal Statement

Ship a static-deployable Fractal Maze Lab workbench that lets a user open the
curated archive, play any of the four supported maze families, submit proofs to
cross infinite and Cantor edges, replay authored Solution Records, record their
own solutions, and author a new small recursive maze using the address-graph
editor — all without a server and with the Python foundation as the single
source of validation truth.

## Scope

### In scope

- Static browser workbench under `web/`, deployable to GitHub Pages.
- Browser Package JSON export pipeline owned by Python, emitting one artifact
  per Source Package into `packages/browser/`.
- Workbench play, replay, and proof submission for four maze families:
  - Normal recursive PDA (Skeptic Play #1, Wolfram #1, Alice and the Hedge,
    etc.)
  - Port-ambiguous recursive (Wolfram #2)
  - Infinite Hop and Cantor Hop proof mazes
  - Fractal Block Maze (Koteitan default pattern)
- Address-graph editor: authoring a new recursive Source Package using
  `1 → A.2` connection notation with live PDA preview and live validation.
- Two visual fallback strategies per package, chosen by Visual Mapping:
  - Auto-generated graph layout (default for any package without an authored
    view).
  - Image overlay over the source image already in the repo, with hand-placed
    point and port anchors.
- Hand-authored Source Package for every maze listed in the README table.
- Solution recording: a player's session can be exported as a
  `fmaze-solution-v0` file that round-trips through Python validation.
- Foundation parity: the Python CLI continues to validate, solve, replay, and
  explain every package shipped in the archive.

### Out of scope

- Authored Vector View (SVG) per maze beyond what already exists for
  Skeptic Play #1. Other mazes get auto graph or image overlay.
- Drawing tools: pen, freehand path drawing, wall painting, tile painting.
- Grid editor mode and grid-source authoring format.
- Image overlay tracing tools (the editor cannot create new image-overlay
  anchors; image overlay is build-time only).
- Server, login, multiplayer, sharing endpoints, hosted persistence beyond
  localStorage and downloaded files.
- GitHub PR flow from the editor.
- Symbolic infinite parameter generators beyond what is needed for Infinite Hop
  and Cantor Hop proof rules already in the foundation.
- Pyodide. The browser runs a TypeScript port of the logic core, not the
  Python core itself.
- New maze families not already represented in the foundation (e.g. arbitrary
  rewrite PDAs, traps-mazes from the linked paper).
- Mobile-first responsive UI. Desktop browser is the target; reasonable mobile
  fallback is acceptable but not validated.

## Non-Goals

- Replacing or wrapping the deleted Orelcosseron pygame player. The MVP does
  not ship a desktop runtime.
- Reproducing every visual quirk of source images. Image overlays are
  archival-fidelity, not pixel-perfect renderings.
- Pedagogical content beyond what proof submission naturally surfaces (no
  tutorials, lesson plans, or guided onboarding).

## Decisions Already Made

| Decision                          | Choice                                                             |
|-----------------------------------|--------------------------------------------------------------------|
| Done definition                   | Full curated archive playable + address-graph editor authoring     |
| Target surface                    | Static browser only; Python is build-time                          |
| Supported families                | Recursive PDA, port-ambiguous, Infinite/Cantor proof, Fractal Block|
| Editor scope                      | Address-graph authoring with live PDA preview                      |
| Proof UX                          | Player submits a proof body before the proof edge unlocks          |
| Visual fallback                   | Auto-generated graph layout + opt-in image overlay                 |
| Editor I/O                        | Download YAML + localStorage drafts                                |
| Stack                             | TypeScript + Vite + Svelte 5                                       |
| Logic-core runtime                | TypeScript port of the Python logic core, generated/maintained     |
| Spec depth                        | Milestone-gated with acceptance criteria                           |

## Architecture Overview

```text
Source Package (YAML)                 — hand-authored, archival
        │
        ▼  Python validation (existing)
Validated Source Package
        │
        ▼  Python export (M1)
Browser Package (JSON)                — committed under packages/browser/
        │
        ▼  Static fetch from web/
Svelte 5 Workbench
   ├── TS Logic Core (port of Python) — owns transitions, stack, proofs
   ├── Runtime Store                  — current point, stack, history
   ├── Visual Store                   — current view, route preview, anchors
   ├── Player Surface                 — graph/image-overlay view + controls
   ├── Replay Surface                 — solution playback + recording
   ├── Proof Surface                  — proof body editor for proof edges
   └── Editor Surface                 — address-graph authoring + PDA preview
```

Cross-cutting rules already encoded in the foundation and preserved here:

- Maze logic is not owned by visuals. Visuals consume runtime state; they do
  not validate moves.
- Visual navigation state is separate from logical runtime state.
- Proof transitions are visible as proof transitions in history and replay.
- Raw PDA is never the primary authoring format.
- Point IDs are canonical; visual labels are display-only.

## File Layout

```text
docs/                       — existing; add mvp-spec.md (this file)
src/fractal_maze_lab/       — existing Python foundation
tools/                      — existing CLIs; add export_browser_package.py
packages/source/            — existing; expand to cover full README table
packages/browser/           — NEW; generated JSON artifacts, committed
schemas/                    — existing; add browser-package.schema.json
web/                        — NEW; Svelte 5 + Vite workbench
  src/
    logic-core/             — TS port of fractal_maze_lab.logic_core
    runtime/                — runtime + history stores
    visual/                 — view stores, graph layout, image overlay
    surfaces/
      player/
      replay/
      proof/
      editor/
    packages/               — fetch + index of packages/browser/
  public/
  index.html
  vite.config.ts
  package.json
.github/workflows/          — NEW; CI for python tests + web build + pages
```

## Milestones

Each milestone is shippable. A milestone is "done" only when every acceptance
criterion is verifiable in a fresh clone.

### M1 — Browser Package JSON Export + Auto Graph Layout

Build the bridge between Python's validated YAML packages and a JSON shape the
browser can fetch. Compute graph layouts deterministically at export time so
the browser never needs a layout engine for the fallback view.

Touch points:

- `schemas/browser-package.schema.json` (new)
- `src/fractal_maze_lab/browser_export.py` (new)
- `src/fractal_maze_lab/graph_layout.py` (new — deterministic level/force layout)
- `tools/export_browser_package.py` (new CLI)
- `packages/browser/<id>.json` (committed outputs)
- `tests/test_browser_export.py` (new)

Acceptance:

- `python3 tools/export_browser_package.py --all` produces one JSON per Source
  Package under `packages/browser/`.
- Each Browser Package validates against `browser-package.schema.json`.
- Every Browser Package contains: logic (points, ports, transitions, proof
  edges, transition groups), referenced solutions inlined or linked, visual
  mapping if present, and an `auto_graph_layout` block with deterministic
  `(x, y)` per point and per port endpoint.
- Round-trip test: loading the Browser Package and replaying its known
  Solution Record reaches the declared goal for every package that ships with
  `expects_goal: true`.
- The Wolfram #2 ambiguous port graph is represented with both ports preserved.
- The Koteitan Fractal Block package exports its coordinate_path layout in a
  shape distinct from PDA packages but using the same Browser Package envelope.

### M2 — Static Browser Reader: One Maze, End-to-End

Stand up the Svelte 5 + Vite workbench. Port enough of the logic core to
execute PDA transitions and resolve legal next moves. Render the auto graph
view. Let the player commit transitions and see runtime state.

Touch points:

- `web/` Svelte 5 + Vite scaffold
- `web/src/logic-core/` TS port of `port_graph`, `logic_core` (PDA portion
  only at this milestone)
- `web/src/runtime/` runtime store with history and undo
- `web/src/visual/graph-view.svelte`
- `web/src/surfaces/player/player.svelte`
- `web/src/packages/index.ts` (loads from `packages/browser/`)
- `tests/web/` Vitest unit tests for logic-core TS port
- `.github/workflows/web-build.yml`

Acceptance:

- `npm run dev` from `web/` launches the workbench.
- Workbench loads `packages/browser/skeptic_play_1.json` and renders the auto
  graph view.
- Player can take any legal transition by clicking an activation point or
  selecting it from a keyboard-driven action list.
- Runtime state (current Point ID, stack/address) is visible and updates on
  every committed transition.
- Visited Route is highlighted; undo and redo work.
- TS logic core test parity: the same transition sequence produces the same
  stack and history as Python logic core for Skeptic Play #1.

### M3 — All Four Maze Families Playable

Extend the TS logic core and the player surface to handle port ambiguity,
coordinate_path strategy, and proof edges in display-only mode. Proof edges
appear in the action list but are locked until M4.

Touch points:

- `web/src/logic-core/` extend for: port resolution, coordinate_path runtime,
  proof edge metadata
- `web/src/surfaces/player/port-selector.svelte` (new)
- `web/src/visual/coordinate-view.svelte` (new — coordinate_path renderer)
- `web/src/visual/image-overlay-view.svelte` (new — uses authored anchors)
- `packages/source/wolfram_2/visual.yml` (new image overlay)
- `packages/source/koteitan_fractal_block_default/visual.yml` (new)
- `packages/source/infinite_hop_1/visual.yml`, `cantor_proof_1/visual.yml`

Acceptance:

- Every package currently under `packages/source/` exports to
  `packages/browser/` and loads in the workbench.
- When two transitions share a visible label (Wolfram #2), the player sees a
  port selector before the move commits.
- Koteitan Fractal Block renders its coordinate view with depth control and
  accepts coordinate moves.
- Proof edges appear in the action list with a lock indicator and an
  "explain rule" inspector, but cannot be committed yet.
- Image overlay view renders for at least: Skeptic Play #1, Wolfram #1,
  Wolfram #2, Simple Cantor, Koteitan Fractal Block. Other packages may use
  auto graph.

### M4 — Proof Submission UX

Let the player submit a proof body for an Infinite Hop or Cantor Hop proof
edge. The TS logic core validates the proof against the foundation's
convergence and presupposition rules before unlocking the crossing.

Touch points:

- `web/src/logic-core/proofs.ts` — validate convergence obligations
  (Infinite Hop) and presupposition chains (Cantor Hop), parity with
  `src/fractal_maze_lab/logic_core.py`
- `web/src/surfaces/proof/proof-editor.svelte`
- `web/src/runtime/history.ts` extend with `step_type: proof`
- `tests/web/proofs.spec.ts`

Acceptance:

- Selecting a locked proof edge opens a proof editor pre-populated with the
  rule's obligations.
- Infinite Hop proof editor surfaces convergence pairs (`p1 → A.p1`,
  `p2 → A.p2`) and accepts a submitted body or rejects it with a specific
  error.
- Cantor Hop proof editor accepts a finite chain of physical steps plus
  presupposition steps and validates each step against the rule.
- Once accepted, the proof edge commits and history records the move as
  `step_type: proof` with the proof body attached.
- Replay of a saved session that includes a proof move reconstructs the
  proof body in history.
- Foundation parity test: any proof body that the TS validator accepts must
  also be accepted by `src/fractal_maze_lab/logic_core.py`, and vice versa.

### M5 — Solution Playback and Recording

Replay any committed Solution Record at variable speed. Let the player record
their own play session and download it as a `fmaze-solution-v0` file that
round-trips through Python validation.

Touch points:

- `web/src/surfaces/replay/replay.svelte`
- `web/src/runtime/recorder.ts`
- `web/src/runtime/exporter.ts` (writes `fmaze-solution-v0` YAML)
- `tests/web/replay.spec.ts`
- `tests/test_recorded_solutions.py` (Python validates browser-recorded
  solutions in fixtures)

Acceptance:

- Every committed `solutions/*.yml` for every package replays cleanly in the
  workbench, including proof-assisted ones.
- Replay supports play, pause, step, reverse-step, and speed control.
- Recording captures every committed transition (physical and proof) and
  produces a downloadable `<package_id>-<timestamp>.solution.yml`.
- A recorded solution downloaded from the browser passes
  `python3 tools/validate_package.py` and replays through `fmaze replay`.

### M6 — Full Curated Archive Packaging

Hand-author Source Packages for every row in the README maze table that does
not yet have one. Auto graph view must work for all; image overlay anchors
authored for the headline set.

Touch points:

- `packages/source/<each_remaining_maze>/package.yml`, `logic.yml`,
  `solutions/*.yml` where a known solution exists
- README maze table updated to link each package
- `tests/test_archive_coverage.py` (asserts every README row has a package)

Acceptance:

- Every row in the README "List of Mazes" table has a Package link.
- Every package validates and exports to a Browser Package.
- Every Browser Package loads in the workbench without errors.
- Packages where the maze is reference-only (no playable logic yet) declare
  this in their manifest and surface as "reference-only" in the workbench
  catalogue rather than failing to load.
- Image overlay anchors authored for: Skeptic Play #1, Skeptic Play
  Sierpinski, Skeptic Play Carpet, Wolfram #1, Wolfram #2, Daedalus 1,
  Daedalus 2, Spiral Maze, Koteitan Fractal Block, Simple Cantor, First
  Cantor, Infinite Descent.

### M7 — Address-Graph Editor Authoring

Let the user create a new Source Package from blank inside the workbench,
using address connections like `1 → A.2`, with a live PDA preview pane and a
live validation panel. Drafts persist in localStorage; export downloads a
YAML zip.

Touch points:

- `web/src/surfaces/editor/editor.svelte`
- `web/src/surfaces/editor/connection-list.svelte`
- `web/src/surfaces/editor/pda-preview.svelte`
- `web/src/surfaces/editor/validation-panel.svelte`
- `web/src/runtime/drafts.ts` (localStorage)
- `web/src/runtime/exporter.ts` (YAML zip)
- `web/src/logic-core/compile-address-graph.ts` (TS parity with Python
  address-graph → PDA compiler)
- `tests/web/editor.spec.ts`

Acceptance:

- A new user can create a fresh package in the editor: declare junctions,
  declare submazes, add connections in `1 → A.2` form, mark start and goal,
  and see PDA transitions update live in the preview.
- Validation panel surfaces every error the Python validator would report:
  unknown points, malformed addresses, missing start, unreachable goal,
  ambiguous ports.
- Draft auto-saves to localStorage on every change; reload restores draft.
- Export produces a downloadable `.zip` containing `package.yml`,
  `logic.yml`, and an empty `solutions/` directory in the expected Source
  Package shape.
- A downloaded zip placed under `packages/source/<id>/` passes
  `python3 tools/validate_package.py <id>` without modification.
- The user can switch from editor to player on the in-memory draft and play
  the maze without going through file I/O.

### M8 — Polish and Definition of Done

Final cleanup, deploy, and README rewrite. Bring the repo to a state where a
visitor can land, click a link, and play any maze in the workbench within
ten seconds.

Touch points:

- `README.md` rewritten around the workbench, with maze table preserved
- `Webpage/` and `Orelcosseron_Fractal_Maze/` confirmed deleted in main
- `.github/workflows/pages.yml` deploys `web/dist/` to GitHub Pages
- `docs/workbench-user-guide.md` (short — orient a new user, not a tutorial)

Acceptance:

- Repo deploys to GitHub Pages on push to main.
- README links land on the deployed workbench with the named maze preselected.
- Every milestone's acceptance criteria from M1 through M7 still pass in CI.
- Foundation CLI (`fmaze validate`, `solve`, `replay`, `explain`) still passes
  every test in `tests/`.

## Risks and Mitigations

| Risk                                                                 | Mitigation                                                                                                                                |
|----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| TS port of logic core drifts from Python and accepts invalid proofs. | Foundation parity tests in every milestone; CI runs both Python and TS proof validation against the same proof bodies.                    |
| Image overlay anchor authoring is more work than estimated.          | M3 requires anchors only for the headline set; auto graph is acceptable everywhere else; M6 expands coverage but does not block ship.     |
| Auto graph layout is unreadable for large recursive packages.        | Layout is deterministic and computed at export; can be hand-tuned in `visual.yml` overrides per package without code changes.             |
| Address-graph editor inherits ambiguity from underdocumented PDA semantics. | M7 explicitly reuses the same compiler the Python foundation uses, ported to TS; the editor cannot invent semantics the foundation lacks. |
| Cantor Hop proof submission UX is too abstract for a casual player.  | Proof editor pre-populates obligations from the rule; "explain rule" inspector is mandatory in M3 before lock UI ships in M4.             |
| Fractal Block coordinate view doesn't share enough with PDA view.    | Coordinate view is a separate Svelte component; M3 explicitly scopes it as a sibling, not a generalization.                               |
| GitHub Pages bundle bloats past acceptable size.                     | Browser Packages are fetched on demand, not bundled; only the catalogue index ships with the app.                                         |

## Definition of Done

The MVP is shipped when:

1. Every milestone M1 through M8 has every acceptance criterion green in CI on
   the main branch.
2. A first-time visitor can open the deployed workbench, pick any maze from
   the catalogue, play it (or submit a proof to cross it), and the experience
   matches the foundation's notion of a valid solve.
3. A user can author a new small recursive maze in the editor and play it
   without leaving the browser.
4. The Python foundation continues to be the single source of validation
   truth: any Browser Package or recorded solution that the workbench produces
   must validate through the Python CLI without modification.
5. The README points a visitor at the workbench within the first paragraph.

## Open Items for Future Versions (Explicitly Deferred)

- Authored Vector View beyond Skeptic Play #1.
- Drawing-based editor (pen, walls, tiles).
- Grid source format and grid editor mode.
- Image overlay tracing inside the editor.
- GitHub PR flow from the editor.
- Symbolic infinite parameter generators beyond Infinite/Cantor Hop.
- Hosted multiplayer, sharing endpoints, accounts.
- Mobile-validated UI.
- New maze families (traps mazes, arbitrary rewrite PDAs).
- Desktop runtime (pygame revival).
