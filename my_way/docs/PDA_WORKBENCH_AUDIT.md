# PDA / tracing / proof workbench audit — 2026-10-10

## Delivered scope

Path-labeled movement models use explicit enter, matching-copy exit, and same-address walk transitions. Guide fixtures retain their source tokens and helper states; alternatives are preserved rather than overwritten. The source artwork remains separate from topology. Image interpretations are WIP and have review notes. All native families and all 41 reference assets have a tracing entry point.

The notebook starts empty. Users choose claims and construct witnesses. It checks repeating-word infinite hops, strictly deeper Cantor hypotheses, complete joint hypothesis groups and earlier checked lemmas. Saved and unfinished work survives mode changes and reload. Saved evidence displays readable routes rather than JSON. Finite claims keep their direction; hop rules require bidirectional connections. Editing topology invalidates stale saved claims.

Finite search, explicit-token guide inputs and manual movement can save immutable full/partial replays. Export/import includes artwork, topology, notes, claims and unfinished witnesses. Native maze capture creates a separate WIP project. The superseded approximate PDA adapter and automatic proof output are removed.

## Initial workbench checks

- `npm run build`: pass, including TypeScript checks and production bundle.
- `npm run lint`: pass.
- `npm test`: **163 passing tests in 21 files**. The added 18 path/proof cases cover accepted guide inputs, the disputed Wolfram stack, preserved nondeterministic alternatives, matching pops, input prefixes, explicit epsilon-runner limits, document round trips, bounded-search uncertainty, faithful PDA transitions, replay integrity, descendant scope, repeating words, nested lemmas, invalidated claims, joint Cantor obligations and directed movement.
- Production Playwright: **45 passing workflows**, including 12 new workbench workflows and the 19 prior movement, solver, replay, import/export, library, guide and builder workflows. Saved-proof evidence is inspected as a readable seven-state route, not just a success message.
- Separate production sweep: **41 / 41 reference workspaces** load their artwork with WIP labeling, no page errors and no horizontal overflow. [Recorded results](WORKBENCH_SOURCE_CHECKS.json).
- Visual review: **21 desktop/phone captures**, zero page errors and zero document overflow. [Gallery](screenshots/workbench/index.html), [capture checks](screenshots/workbench/checks.json). The final captures include empty, manually checked and saved proofs, SVG paths, image drafts, partial replay, builder and guide.
- Registry regeneration is idempotent and preserves **31 unique source references**. The original staged files and original source artwork were not edited by this work.

Production browser command:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175/Fractal-Maze/ npm run test:browser
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an existing Chromium installation when needed. Run `npm run preview -- --host 127.0.0.1 --port 5175` after building.

## Desloppification measurements

Measured production scope: `src/core/pathMaze`, `src/ui/workbench`, `pathCatalog.ts`, `proofExamples.ts`, the path model, native replay construction/import and replay UI. Existing unrelated engines were not refactored for these gates.

| Gate | Actual result |
| --- | --- |
| Cyclomatic complexity < 22 | Maximum **20** (`TraceEditor`), measured with ESLint’s built-in complexity rule. The scoped limit-21 check passes. |
| Handwritten source file < 1000 lines | Maximum **509** (`WorkbenchPage.tsx`) in the measured TypeScript production scope. Generated datasets are fixture artifacts under the existing `src/data` convention. |
| Explicit `any` / `unknown` | **0** declarations/casts in the audited subsystem and replay boundaries. |
| Type checking / unused local checks / lint | Pass using configured TypeScript and ESLint. |
| Cognitive complexity < 22 | Unmeasured: no configured/installed analyzer. |
| Halstead Difficulty < 80 | Unmeasured: no configured/installed analyzer. |
| 100% statements/branches/functions/lines coverage | Unmeasured: no coverage provider configured/installed; passing tests do not establish this gate. |
| CRAP score < 25 | Unmeasured: no configured analyzer or coverage results. |
| Zero surviving mutants | Unmeasured: no configured/installed mutation tool. |
| Zero dead code | Full analyzer unavailable. TypeScript/lint checks and a manual caller/removal sweep passed; this does not certify all exports are reachable. |
| Zero duplicated code | Full analyzer unavailable. Shared source drawings and witness route rendering remove the observed duplication; manual review does not certify a repository-wide zero result. |

No dependencies, exclusions, suppressions or meaningless tests were added to manufacture a metric. Required unavailable gates are explicitly unmeasured, not reported as passing.

## Residual sweep findings resolved

- A guide example reported as accepted by Python actually ends inside A→B. The app requires the exact goal address and preserves that legal rejected route as a partial replay.
- SVG upload mixed DOMMatrix and SVGMatrix; it now transforms DOMPoints and retains exact curve geometry.
- Clearing all traces previously allowed catalog hydration to restore them. Hydration now applies only to original catalog documents; saved empty artwork stays empty.
- Proof drafts previously had local state separate from document history. The document now owns the draft and edits invalidate stale checks.
- Joint Cantor hypotheses require a witness for every related declaration; finite directed lemmas cannot be reversed.
- Native source capture and builder tracing preserve the original project in a separate WIP document.
- Mobile builder actions wrap within the viewport.
- Vite preview treats `#` in an asset filename incorrectly even when encoded. The Geocaching browser asset uses a safe filename; original source metadata is retained. Source checks inspect image/PDF content types, not HTTP status alone.
- Alice's thick ochre corridors require their own color mask. The draft now includes twelve candidate paths, four room frames and twenty numbered-gate pairs. Its bridge remains a review item.
- Re-running the registry generator no longer appends duplicate Inner Frame records.
- Saved proof evidence is readable, and finite claim summaries use a directed arrow.
- The guide-input runner refuses epsilon models rather than misclassifying their language; finite search/manual movement and PDA export support those transitions.

## Remaining boundaries

The requested WIP artifacts still need Jay's visual review. There are 28 bound source-artwork views out of 31. Berkly is a separate-wire crossing candidate without a finite witness. Windischer's playable conversion remains unfinished and in scope; its three views remain unbound and available for conversion review. The earlier skip attribution was incorrect and applied to v6 image mapping. Windischer's earlier guessed gates were removed. Jay v6's seven-path/six-copy recurrence is accepted, with its source center and arrivals still WIP. Exact SVG geometry is preserved, but a geometry extraction is not a proof that every path/gate interpretation is correct. [Per-artwork confidence inventory](PDA_CONVERSIONS.md).

The app checks finite certificates under explicit extra movement rules. It does not claim a complete decision procedure for arbitrary infinite/Cantor mazes or arbitrary countably nested certificates. Finite bounded-search failure is not a nonreachability proof.

Before the hosting/loading pass below, the production build reported large chunks: the entry bundle is about **3.81 MB** (756 kB gzip), and the lazily loaded trace dataset about **1.39 MB** (317 kB gzip). This is a build warning, not a failed check. Full cognitive/Halstead/coverage/CRAP/mutation/dead-code/duplication gates remain unmeasured as listed above.

## Prior source and product checks

- 84 stable document variants are grouped into 48 Library entries. Source/native views retain independent IDs and reset the run when changed.
- 44 optional bundled routes include the eleven original Wolf solutions and eight independently checked new repeated-maze routes. Empty provided routes are omitted.
- Old replay cards and playback share normalized detour removal, with catalog recovery for old records missing maze snapshots. The 32,783-step atomic route uses linear-time normalization.
- Copy current catalog maze preserves an earlier saved draft. New image workspaces save to stable IDs, preserve first-save undo and reopen after reload.
- Reference pages link to bound source players. Build separates corridor drawing, fresh image/PDA conversion, existing-maze editing and proof construction.
- The refreshed original repeated editor loads its actual maze presets and required Lee scripts; a browser regression rejects app HTML in its rule input.
- Current source gallery: 28 desktop gate-move captures and five phone captures, with zero page errors and zero phone overflow. Product flows: eleven desktop/phone captures, zero page errors and zero overflow. Four additional captures inspect Jay’s newer upstream workbench.

[Product flows](PRODUCT_FLOWS.md), [upstream comparisons](UPSTREAM_REFRESH.md), [source confidence](PDA_CONVERSIONS.md), [current source captures](screenshots/playable/index.html), and [flow captures](screenshots/flows/index.html).

Measured scope additionally includes Library cards/selectors, repeated terminal/import/render/player/validation modules, the Build landing page and pathCatalog. Existing unrelated engine complexity violations remain outside this scoped gate. Full cognitive/Halstead/coverage/CRAP/mutation/dead-code/duplication metrics remain unmeasured.

The README residual sweep adds Backlot’s constrained six-room tour and Omeometo’s finite block navigation/search/replay. Replay visualization, card actions and native replay validation have separate cohesive responsibilities. New scoped model/navigation/render code has zero explicit `any`/`unknown` types and satisfies the literal complexity limit. [Source evidence](README_BACKLOG.md), [seven current review captures](screenshots/backlog/index.html).

The final expanded measurement covers 61 source files and 646 functions. Current PDA/tour/block/replay/Library code, including the new family validation and dispatch, has maximum cyclomatic complexity 20; the unchanged square-maze validator in the shared validation file measures 32 and remains outside that subsystem audit. The largest measured source file is 509 lines, and explicit `any`/`unknown` types remain zero. Production browser inspection also confirms that Backlot conversion retains its source image, explains its native drawing constraints and links back to its original player. All 31 original artwork files have source-reference records.

The continuation’s missing-endpoint navigation regression raises the production browser total to **45**. It covers cards, alternate views, direct Play URLs and unfinished saved projects. Four more current captures show the source-review and phone Guide flows, with zero page errors and zero overflow: [source-review flows](screenshots/residual/index.html). The reference manifest now supplies author names for registry generation, so cached traces cannot overwrite corrected attribution.

The final user-adjusted scope check reads the live catalog and reference manifest: **84 variants, 48 families, 44 bundled routes, 43 reference assets and 10 refreshed repository records**. Every one of the 30 non-deferred puzzle assets has a playable document and launch link. There are no duplicate IDs, missing documents, missing family views, missing reference files, empty/broken bundled targets or browser page errors. Only Windischer’s three explicitly deferred views have incomplete endpoints and launch into conversion review. This final continuation changes documentation only; the previously passed 163 unit tests, 45 production browser workflows, lint and build remain the implementation verification.

## Author / proof / solution / hosting pass — October 10

The Library now groups/filter families and references by author. Build has two primary choices and two secondary choices, including an empty manual proof notebook. Two-sided proofs can include independent setup trails, a common repeating copy word and distinct fixed tails. Scope containment is enforced; checked claims can compose a start-to-finish proof solution. Multiple proofs retain their evidence while the proven-connection list merges identical endpoints.

- 206 unit tests in 24 files pass. 51 production browser workflows pass, including author/reference filters, phone Build, scoped setup proofs, save/play/export/import, default shared proof examples, wire sandbox controls and static route restoration.
- After the final square-validation cleanup, all 206 unit tests and 19 focused production proof/import/replay workflows pass. Build/type checks and lint pass. Default and root-base production builds pass. Six direct static routes and their refreshes pass under `/Fractal-Maze/` and `/`, without page errors or CSP violations. [Captures and checks](screenshots/authors-proofs/index.html).
- 79 complete bundles cover 69 document variants. All 68 native bundles reconstruct and round-trip through replay validators, including provided source routes; all IDs are unique. Eleven original wire strings retain their separate player check. [Results](SHARED_REPLAY_CHECKS.json). No empty or unchecked route is labeled a solution.
- Full dependency audit: zero vulnerabilities after React Router 7.18.4, Vite 7.3.7 and Vitest/UI 4.1.11 updates. Shared documents validate before storage, files have size caps, native/proof imports validate transitions and the legacy wire frame is sandboxed. Production CSP blocks eval; Zod uses its ordinary parsing path instead.
- Default entry: about 357.42 kB / 112.22 kB gzip, down from 3.81 MB / 756 kB gzip. Catalog/model/artwork chunks remain large but load on demand; their build warnings are retained. No performance benchmark or all-device frame-rate guarantee is claimed.
- Current audited production scope adds Library, Build, project storage, static/shared IO and validators to the prior proof/replay scope. ESLint cyclomatic maximum is **21** (`validatePorts`); largest handwritten file remains **509** lines (`WorkbenchPage.tsx`). Explicit `any` / `unknown` type nodes are **0** across the 72 audited files, measured with the TypeScript syntax tree. [Measurement record](CODE_AUDIT_MEASUREMENTS.json). Type checking and lint pass.
- Four untouched original functions exceed that scoped cyclomatic limit: `PlayerPage` 42, `CanvasRenderer.drawLevel` 34, `SolverPage` 27 and `parseMazeText` 27. They remain cleanup candidates rather than being hidden behind exclusions. Square validation now separates grid/bounds/topology checks and the dispatcher removes branches made unreachable by header validation.
- Cognitive complexity, Halstead Difficulty, full statement/branch/function/line coverage, CRAP, mutation survival and complete dead-code/duplication analyses remain unmeasured: this repository has no configured analyzers/providers for those gates. Passing tests and the manual sweep do not certify those results.

[Remaining solution gaps](SOLUTION_COVERAGE.md): Eleven other variants have no recovered verified solution, including First Cantor/Infinite Descent certificates and two WIP finite gate/path interpretations. Three Windischer views remain unbound and in scope; the earlier skip attribution was incorrect. The bounded generalized proof search is not a completeness theorem. [Upstream adoptions](UPSTREAM_CHANGELOG.md) and [hosting/security setup](STATIC_HOSTING.md) record the new request's deliverables. The static artifact and Pages workflow are prepared; no publication occurred.

## Source-player follow-up — October 10

This follow-up supersedes the preceding default catalog/replay counts: **74 variants, 48 families, 69 shared replays covering 59 variants**. Ten duplicate geometric defaults were removed, while the two unique originals and imported geometric documents remain supported. Alice now uses the complete native-pixel drawing; older saved Alice files render correctly without changing their stored definitions. First Cantor's trace now includes its original filled blue finish junction.

All 28 bound source players pass 6,378 drawn-route checks and actual production gate-click/undo checks, with no page errors or horizontal overflow. The focused changed production files satisfy the existing cyclomatic limit of 21. This is a source-playability follow-up, not a repeat of every historical audit metric. [Current verification, gallery and limitations](SOURCE_PLAYABILITY.md).

Unified Play follow-up: the [current report](UNIFIED_PLAY.md) and [checks](UNIFIED_PLAY_CHECKS.json) record the newer Home, maze-local replays, shared PDA engine and combined solver. Earlier counts and navigation in this document describe its original pass.
