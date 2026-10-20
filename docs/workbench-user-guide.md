# Workbench User Guide

A short orientation to the Fractal Maze Lab static workbench.

## Modes

The header has two modes:

- **Browse** — load any maze from the catalogue, play it, watch a packaged
  replay, record your own solve, or submit a proof for an Infinite/Cantor hop.
- **Edit** — author a new recursive maze from scratch using address-graph
  notation. Drafts persist in your browser's localStorage; you never lose work
  by reloading the page.

The URL respects a `?package=<id>` query parameter, so README links land
directly on a specific maze.

## Browse mode

Each maze loads a strategy-appropriate view:

- **PDA (recursive port-graph) mazes** show an auto-computed graph view. Each
  point is a circle. The current point is highlighted in blue. Goals are
  outlined in green. Legal next moves appear as dashed edges with a clickable
  activation point at the midpoint. The side panel has a complete legal-action
  list with semantic labels (e.g. "2 / enter A") and shows runtime state
  (current point, address, stack, step count, status).

- **Port-ambiguous mazes (Wolfram #2)** show every distinct port as a separate
  legal action even when the visible labels match. There is no port-selector
  modal; instead, the action list disambiguates by label and direction.

- **Coordinate-path mazes (Fractal Block)** show nested grids at each
  recursion depth, with the current cell outlined in blue. Depth-limit slider
  and four-direction movement controls live on the right.

- **Reference-only mazes** show a notice rather than a playable surface.
  These are mazes whose logic has not yet been hand-modelled. The notice
  surfaces why and what is needed next.

## Playback

Choose a packaged solution from the dropdown. Buttons:

- ⟲ **Reset** — clear runtime state and rewind playback to step 0.
- ◀ **Back** — undo one step.
- ▶ **Play** / ⏸ **Pause** — autoplay at the current speed.
- ▶ **Step** — advance one step.

The speed slider controls the autoplay interval in milliseconds.

## Recording

Once you have committed at least one move, the **Download recording** button
exports your full session as a `fmaze-solution-v0` YAML file named
`<package_id>-<timestamp>.solution.yml`. The file works as a Solution Record:
drop it in `packages/source/<id>/solutions/` and the Python validator will
replay it.

## Proof submission

Maze with proof edges (Infinite Hop, Cantor Hop) show a proof section under
the legal actions. Each proof edge starts locked. Click **open proof** to see
the proof body — for Infinite Hop, this is a pair of convergence obligations;
for Cantor Hop, a chain of physical steps and presupposition steps.

Click **Submit proof** to validate. If the proof passes, the lock turns into
a checkmark. Click the proof button to take the move; history records it as
`step_type: proof`.

The TS validator mirrors the Python validator; anything the workbench
accepts also passes `python3 tools/validate_package.py`.

## Edit mode

Edit mode lets you author a new recursive maze without leaving the browser:

1. **Junctions**: declare each named decision point.
2. **Submazes**: declare each recursive container.
3. **Connections**: type address-graph connections in the form `p1 → A.p2`.
   Dots nest submazes; left of the arrow is the source point, right is the
   target.
4. **Start + goals**: pick the start junction and toggle which junctions are
   goals.

The right side shows the compiled PDA preview (port and transition counts),
a validation panel with warnings (undeclared junctions, undeclared submazes,
malformed addresses), and three buttons:

- **Play this draft** — mounts the in-memory graph in the player so you can
  test the maze immediately.
- **Download YAML** — saves `<package_id>-package.yml` and
  `<package_id>-logic.yml`. Drop both in `packages/source/<package_id>/` and
  the Python validator + workbench catalogue both pick it up.
- **Clear draft** — wipes localStorage for this draft.

## Keyboard

The graph view's activation points respond to Enter and Space when focused.
Tab moves between activation points.
