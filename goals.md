# Fractal Mazes Web App — Product Plan and Specification

## 1. Vision

Build a browser-based fractal maze platform that lets users:

* create mazes,
* play mazes,
* import/export mazes,
* support multiple maze representations,
* solve or assist solving mazes,
* save and replay solutions,
* browse a library of known fractal mazes,
* run fully as a static site on GitHub Pages.

The app should feel like a blend of:

* a maze editor,
* a maze explorer/player,
* a maze research sandbox,
* a solution visualizer.

## 2. Product Goals

### Primary goals

1. One unified app for editing, viewing, and playing fractal mazes.
2. Support more than one maze model instead of locking the project to a single square-grid format.
3. Make importing/exporting first-class so the app can interoperate with existing tools and preserve user work.
4. Add solution capture and replay so users can study, share, and verify solutions.
5. Stay deployable on GitHub Pages with no required backend.

### Secondary goals

1. Provide optional solver assistance.
2. Provide a curated maze library with metadata.
3. Support progressive enhancement for deeper and more experimental maze types.
4. Make the internal model flexible enough to support future research ideas like PDA conversion or proof/analysis overlays.

### Non-goals for v1

* Real-time multi-user collaboration.
* Server-side storage.
* Full symbolic theorem proving about arbitrary fractal maze decidability.
* Support for every historical maze format on day one.

## 3. Key Observations from Existing Tools

### amurielagi/fractal-maze

Useful ideas:

* browser-native editor/player,
* import/export workflow,
* local persistence,
* approachable square recursive maze model.

Gaps to improve:

* appears tied to one primary representation,
* limited long-term architecture for many maze families,
* older vanilla JS structure.

### orelcosseron/fractal-maze and Fractal-Maze-Python

Useful ideas:

* strong visual feel for infinite/recursive exploration,
* good inspiration for deep zoom and recursive navigation,
* useful existing `.maze` ecosystem.

Gaps to improve:

* older implementation style,
* likely representation-specific,
* solution playback and editing can be more integrated.

### sparecycles/fractal-maze

Useful ideas:

* partial solution display and path reveal,
* simple toy player centered on a known maze,
* directness of interaction.

Gaps to improve:

* archived and read-only,
* explicitly described by its author as old toy code,
* not suitable as a direct foundation.

### koteitan/fractalblockmaze

Useful ideas:

* different recursive construction style,
* submaze/block composition model,
* solver depth concept,
* explicit visualization of search frontier and found path.

Gaps to improve:

* specialized to a specific maze family,
* solver and representation tightly coupled.

### iiJetLi/Fractal-Maze and related analyzers

Useful ideas:

* analysis pipeline from maze images into machine-readable form,
* separate analysis and solving concepts.

Gaps to improve:

* desktop-oriented and likely too specialized for the web app core.

## 4. Product Strategy

The best approach is not to pick one existing program and extend it directly.

Instead, build a **modular web platform** with:

1. a common core model for recursive mazes,
2. representation adapters for different maze families,
3. pluggable renderers,
4. pluggable solvers,
5. solution recording/replay built into the core.

This gives you a stable center while still letting you borrow ideas from older projects.

## 5. Recommended Tech Stack

### Frontend

* **TypeScript** for core logic and data modeling.
* **React** for app UI and stateful tools.
* **Vite** for build tooling and GitHub Pages deployment.
* **Zustand** or **Redux Toolkit** for app state.

### Rendering

Use a hybrid approach:

* **SVG** for editors, overlays, handles, labels, gates, and clickable structural UI.
* **Canvas** for high-depth maze rendering and animated playback.

Reason:

* SVG is easier for editing and precise interaction.
* Canvas scales better for large recursive visualizations.

### Storage

* **IndexedDB** for local projects, cached maze library, and saved solution runs.
* **localStorage** only for lightweight settings.

### Testing

* **Vitest** for core logic.
* **Playwright** for import/export, editor, and replay flows.

### Deployment

* Static SPA deployed to **GitHub Pages**.
* Optional GitHub Actions workflow to build and publish.

## 6. High-Level Architecture

### Layers

1. **Domain Core**

   * maze data model
   * representation adapters
   * solver interfaces
   * replay engine
   * import/export codecs

2. **Application Layer**

   * project management
   * editor actions
   * player session state
   * settings
   * library/catalog handling

3. **Presentation Layer**

   * editor views
   * player views
   * replay controls
   * solver views
   * import/export dialogs

### Main modules

* `core/maze-model`
* `core/representations`
* `core/render`
* `core/solver`
* `core/replay`
* `core/io`
* `app/projects`
* `app/library`
* `ui/editor`
* `ui/player`
* `ui/replay`
* `ui/solver`

## 7. Core Concept: Common Recursive Maze Model

The app should define one canonical internal representation called something like `RecursiveMazeDocument`.

This canonical model should be expressive enough to represent:

* square recursive mazes,
* block/submaze mazes,
* mazes with labeled entrances/exits,
* one-way transitions,
* finite-depth approximations of infinite constructions,
* metadata and references to source material.

### Recommended canonical structure

A maze document should contain:

* `metadata`
* `representationType`
* `rootPattern`
* `expansionRules`
* `connectivityRules`
* `entryExitDefinitions`
* `viewDefaults`
* `annotations`
* `assets`
* `solverHints`

### Why this matters

This avoids hard-coding the app around only one file format. Existing formats become import/export adapters rather than the center of the system.

## 8. Supported Representation Families

### Family A — Recursive square cell mazes

For tools/models similar to amurielagi and Orel.

Characteristics:

* square base template,
* side exits/gates,
* recursion by substitution,
* often suitable for classic move navigation.

### Family B — Fractal block mazes

For tools/models similar to koteitan.

Characteristics:

* pattern of filled/open cells,
* block substitution,
* recursive zoom structure,
* solver depth as a meaningful concept.

### Family C — Labeled graph/submaze mazes

A more abstract representation.

Characteristics:

* submazes treated as nodes/regions,
* labeled portals/gates,
* edges can encode directionality or conditions,
* useful bridge model for exotic or research-oriented mazes.

### Family D — Infinite/countably infinite conceptual mazes

For Siggy/Cantor/infinite descent style work.

Characteristics:

* may not be fully materialized,
* often defined by recursive rules plus a viewport/depth,
* may need special solver or analysis modes.

## 9. File Formats

### Canonical app format

Define a new JSON format, for example:

* `.fmaze.json` for plain JSON, or
* `.fmaze` as JSON with versioning.

Recommended fields:

* `formatVersion`
* `id`
* `title`
* `author`
* `source`
* `representationType`
* `definition`
* `renderConfig`
* `solverConfig`
* `tags`
* `license`

### Compatibility adapters

Support import/export adapters for:

* Orel `.maze` where feasible,
* amurielagi export JSON,
* future custom graph/block JSON formats,
* optional image-assisted import later.

### Replay format

Use a separate structured replay object:

* `.fmaze-solution.json`

Fields:

* `mazeRef`
* `solverOrPlayer`
* `startedAt`
* `endedAt`
* `status`
* `actions[]`
* `derivedPath[]`
* `checkpoints[]`
* `metrics`

## 10. Editing Model

The editor should be mode-based.

### Editor modes

1. **Structure mode**

   * define base pattern,
   * add/remove walls or cells,
   * define gates and recursion anchors.

2. **Connectivity mode**

   * define how submazes connect,
   * add labels and directional links,
   * configure one-way terminals if supported.

3. **Entry/Exit mode**

   * choose start/end points,
   * choose gate semantics.

4. **Metadata mode**

   * author, source links, notes, tags, license.

5. **Preview mode**

   * render at multiple depths,
   * inspect recursion,
   * validate reachability assumptions.

### Editing constraints

* Every change should produce a valid document state.
* Invalid states should be visually flagged, not silently accepted.
* Undo/redo should be built in from the start.

## 11. Player Experience

The player should support two complementary ways to explore.

### Navigation mode

* move step-by-step through the maze,
* zoom in/out when transitioning recursively,
* highlight current position and local context,
* optional breadcrumbs.

### Observer mode

* watch the maze and current path from outside,
* inspect partial solution paths,
* scrub replay timeline,
* switch render styles.

### Important borrowed ideas

* Orel-style infinite/recursive visual feel.
* Wolf-style path replay and partial solution reveal.
* Koteitan-style search overlay for solver visualization.

## 12. Solver System

The solver should be optional and pluggable.

### Solver interface

Each solver should expose:

* supported representation types,
* input constraints,
* status/progress events,
* found path or proof of failure up to a limit,
* optional frontier/trace data for visualization.

### Suggested solver types

1. **Traversal solver**

   * BFS/DFS/A*/IDA* on finite expansions.
2. **Depth-bounded recursive solver**

   * suitable for recursive block mazes.
3. **Rule-based specialized solvers**

   * for specific maze families like Alice/hedge or Cantor-like classes.
4. **Manual assist solver**

   * hint engine rather than full solve.

### v1 recommendation

Implement only:

* finite expansion traversal solver,
* depth-bounded recursive solver,
* solver playback visualization.

Leave symbolic/PDA-driven solvers for later phases.

## 13. Solution Recording and Replay

This should be a first-class subsystem, not an afterthought.

### Recordable action types

* move
* zoom in
* zoom out
* portal/gate traversal
* solver step
* checkpoint
* annotation

### Replay features

* play/pause/step/scrub
* change speed
* show only final path or full exploration
* overlay decision points
* export replay JSON

### Nice stretch features

* compare two solutions side by side,
* human vs solver replay,
* shortest known vs submitted path.

## 14. Validation and Analysis

The system should validate mazes at edit/import time.

### Validation checks

* format version compatibility,
* missing gates or invalid references,
* disconnected start/end definitions,
* illegal recursion references,
* unsupported feature combinations for a representation.

### Optional analysis features

* finite-depth solvability checks,
* estimated branching factor,
* reachable gate summary,
* repeated-state detection,
* export to graph/PDA intermediate forms later.

## 15. GitHub Pages Constraints and Design Implications

Because the app should run on GitHub Pages:

* no required backend,
* all import/export must happen client-side,
* all solving must happen in browser,
* large solving jobs should use Web Workers,
* persistence should be local or file-based,
* optional catalog content can be committed as static JSON in the repo.

### Practical implication

Build the app as a static-first research tool. Treat cloud sync as a future enhancement, not a dependency.

## 16. Recommended Information Architecture

Top-level sections:

1. **Library** — browse included mazes and examples.
2. **Editor** — create and modify mazes.
3. **Player** — play a maze manually.
4. **Replay** — inspect recorded solutions.
5. **Solver** — run supported solvers and inspect progress.
6. **Import/Export** — file operations and compatibility tools.
7. **Docs** — format specs, controls, and representation notes.

## 17. Suggested Repository Structure

```text
src/
  app/
    routes/
    store/
    projects/
    library/
  core/
    model/
    representations/
      squareRecursive/
      blockRecursive/
      graphRecursive/
    io/
      formats/
      adapters/
    render/
      canvas/
      svg/
    replay/
    solver/
      common/
      traversal/
      depthBounded/
    validate/
    workers/
  ui/
    components/
    editor/
    player/
    replay/
    solver/
    library/
  data/
    mazes/
    examples/
    manifests/
  docs/
```

## 18. Phased Roadmap

### Phase 0 — Research and normalization

* catalog known maze families,
* inspect existing formats,
* define canonical data model,
* define representation boundaries.

### Phase 1 — MVP

* library page,
* square recursive representation,
* import/export for canonical JSON,
* basic editor,
* manual player,
* solution recording and replay,
* local persistence.

### Phase 2 — Compatibility

* Orel `.maze` import,
* amurielagi JSON import/export adapter,
* better render controls,
* validation UI.

### Phase 3 — Solvers

* finite-depth solver,
* depth-bounded recursive solver,
* animated frontier/path visualization,
* worker-based long-running solve tasks.

### Phase 4 — Additional representations

* block maze representation,
* graph/labeled portal representation,
* one-way and terminal semantics.

### Phase 5 — Research tools

* analysis views,
* graph export,
* PDA/export experiments,
* advanced infinite-maze support.

## 19. Priority Recommendations

If you want the fastest path to a strong public demo:

1. Build a polished square-recursive MVP first.
2. Make replay excellent early.
3. Add compatibility import for existing `.maze` files quickly.
4. Then add block-maze support as the second representation.

This gives you something usable quickly while preserving the long-term architecture.

## 20. Concrete v1 Spec

### Must-have

* create/edit square recursive mazes,
* load bundled mazes,
* import/export canonical JSON,
* import at least one legacy format,
* play manually,
* record and replay solutions,
* deploy on GitHub Pages.

### Should-have

* animated zoom and path overlays,
* validation warnings,
* autosave,
* shareable file exports,
* depth preview.

### Nice-to-have

* solver visualization,
* block-maze support,
* multiple render styles,
* keyboard-first controls,
* mobile-friendly viewer.

## 21. Open Design Decisions

Recommended decisions:

* **Canonical format:** create your own versioned JSON format.
* **Main UI stack:** React + TypeScript + Vite.
* **Deep rendering:** Canvas.
* **Precise editing:** SVG.
* **Local persistence:** IndexedDB.
* **Heavy solver work:** Web Workers.
* **First representation:** square recursive.
* **Second representation:** fractal block maze.

## 22. Final Recommendation

Build this as a **modular static web platform for recursive maze research and play**, not just a single-purpose maze viewer.

The strongest foundation is:

* one canonical recursive maze document format,
* representation adapters for legacy and alternate models,
* a polished player/editor/replay core,
* solver support layered on top.

That gives you a path to ship something practical on GitHub Pages while still leaving room for more ambitious work like infinite-maze analysis, PDA conversion, and specialized solvers.
