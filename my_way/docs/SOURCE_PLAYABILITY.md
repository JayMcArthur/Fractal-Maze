# Playing on the original images — October 10

Alice's source drawing was broken visually: the corridor extractor used its original **1452×1452** pixels, while inherited draft metadata rendered the image at **1200×1200**. Rings, highlights and the player therefore missed the actual corridors. The extractor now owns the native dimensions and displays the complete drawing, including all outer terminal labels. Earlier saved/exported Alice files with the exact bad size stamp also render correctly in the player, preview and trace editor. Their stored maze definitions and replay snapshots stay intact, and deliberately scaled artwork keeps its own coordinates. The source drawing remains Alice's Library cover. Play opens its block display; the original drawing remains selectable.

First Cantor had a second source-rendering defect: its blue finish rectangle was omitted from the trace graph. The model treated the blue branches as one path, but the player could not walk between their separate strokes. The binding generator now derives a connecting trace and finish point from the original SVG's filled rectangle. Unmarked crossings elsewhere still remain separate. Regeneration preserves the exact SVG curves and is idempotent.

Image gate controls show the printed path labels, including labels above nine, rather than the ASCII tokens used internally by the guide PDA. Players click the highlighted corridor to walk and a gate ring to cross into or out of a copy. The copy stack determines the actual level; reaching an exit inside a smaller copy does not finish the surface maze. New source/block recordings retain physical walks and copy/gate transitions; old gate-only recordings reconstruct their original anchor travel. Block keyboard movement advances one cell, while source movement follows bends to a junction or gate.

## What is playable

All **28 bound raster/SVG/PDF-derived source players** were checked for every incoming-gate to outgoing-gate route and every declared finish route: **6,378 drawn routes**. The production browser opens each drawing, clicks a real image gate and undoes that move. The source asset dimensions, page errors and horizontal overflow are checked. [Per-player results](SOURCE_PLAYER_CHECKS.json) and [all source captures](screenshots/source-playability/index.html).

Backlot's source-grid player and Omeometo's exact block pattern are also playable, bringing the non-deferred puzzle-asset count to 30. All 43 source/reference assets remain available, including research diagrams that are illustrations rather than separate mazes.

Ten redundant geometric remakes have been removed from default families, catalog and bundled replay fixtures. The two unique geometric originals remain. The original format, original reference editor and imported geometric projects remain supported. Saved documents and replay snapshots are not deleted. Current counts: **74 document variants, 49 maze families, 74 complete shared replays covering 64 variants**.

## Earlier source-sweep verification and limits

- 209 unit tests pass, including image pixel coordinates, Alice's full source bounds and the blue finish junction regression.
- All 54 production browser workflows pass on the final build, including native-image play, Alice's source solution playback and import/play/export of an older saved Alice drawing.
- All 58 remaining native shared bundles round-trip through replay import validation; eleven original wire strings have their separate player checks. No bundle is partial or has a duplicate ID.
- Build/type checking and lint pass. SVG generator reruns produce byte-identical output without duplicate junction traces.

Geometry and navigation checks validate the declared models. They do not independently prove every WIP source interpretation. Berkly still has no verified finite solution in its separate-wire candidate; Infinite Descent now has a checked setup/repeating-word proof certificate. Source movement works without supplying an automatic proof. Windischer's three spiral views remain unbound conversion workspaces with their original drawings. They remain in scope: Jay's instruction to skip one image mapping applied to v6.

Reproduce the source sweep with the dev and production preview servers running:

```bash
python scripts/audit-source-playability.py
```

Install Python Playwright/Pillow and Chromium, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. The script checks real production interactions and exports its source-gallery and geometry results.

## Unified Play follow-up

The source sweep was rerun after adding keyboard/touch junction walking and the shared field/session UI. All 28 players and 6,378 drawn routes pass again. That checkpoint passed 227 unit tests, 61 production browser workflows and 59 validated native bundled snapshots. [Current report](UNIFIED_PLAY.md) and [current screenshots](screenshots/unified-play/index.html) supersede the earlier navigation and replay placement.
