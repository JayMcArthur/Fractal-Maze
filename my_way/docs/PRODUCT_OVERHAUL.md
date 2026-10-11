# Product overhaul: maze-first instrument

## Reference

The experience is grounded in Orel Cosseron's `Fractal-Maze-Python`: a compact maze selector,
digital position readout, maze-defined color fields, recursive zoom transitions, direct keyboard
control, and a clear win state. The web app should preserve those strengths while adding modern
responsive controls, importing, replay, editing, solving, and analysis.

## Product structure

- `/` opens the Alice maze immediately. The maze is the product, not a marketing page.
- `/library` is a visual maze picker with live previews, completion records, and import.
- `/play/:id` owns the game/observer surface and all session controls.
- Editor, solver, analysis, replay, and docs share the same compact navigation and visual tokens.
- Bundled maze loading lives in one catalog module; routes do not duplicate file lookup/parsing.

## Capability boundaries

- `squareRecursive`: interactive play, checkpoints, partial/complete replay, editor, solver, PDA,
  and analysis.
- `blockRecursive`: import, validation, recursive rendering, depth control, and observer metadata.
- `graphLabeled`: import, validation, portal graph rendering, zoom control, and observer metadata.
- `infiniteRule`: reserved schema label only; no definition contract exists in the repository, so
  the shared renderer provides an explicit unsupported state instead of inventing semantics.

## Experience rules

- The first viewport always contains a useful maze and its primary controls.
- Maze-authored colors remain the hero; application chrome is neutral, tactile, and compact.
- Keyboard, pointer, and touch paths expose equivalent actions.
- Motion communicates moves and recursive level changes, with reduced-motion support.
- Empty, loading, blocked, observer, and completion states always explain the next action.

## Verification

- All bundled Orel mazes parse and validate.
- Catalog, player telemetry, nested exits, import families, editor, replay, and solvers stay covered.
- `npm test`, `npm run lint`, and `npm run build` must all pass before completion.
