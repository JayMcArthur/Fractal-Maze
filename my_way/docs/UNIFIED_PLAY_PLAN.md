# Unified play and navigation — October 10

1. done: Inspect corridor/image topology and implement a corridor-to-PDA compiler with geometry bindings. Verify paired Alice topology and share copy transition semantics rather than infer equivalence from family names.
2. done: Add source keyboard/touch walking that follows connected traces, stops at real junctions and gates, and preserves underpasses/directed wires. Reuse the block player's field/session presentation and remove the ineffective Mark control.
3. done: Move family-specific bundled/saved replays and import into a bar beneath Play. Embed playback in Play, retain immutable snapshots and remove replay cards/counts from Library and replay navigation.
4. done: Combine Solve/Analyze in one searchable, author/type-filtered workspace. Offer corridor search, simplified PDA search and explicit proof construction with correct result replay behavior.
5. done: Replace Guide landing with a compact Home page and accessible instructional details. Update navigation, direct links and user-facing flow notes.
6. done: Protect actual keyboard junction choices, shared-PDA mappings, replay selection/import/playback and solver filters with focused behavior tests. Run unit/browser/build/lint and review desktop/phone screenshots.
7. done: Build a fresh residual plan after checking code/docs/open markers, execute its first item, and document any actual topology/proof limits.

Existing saved/imported maze and replay formats remain readable. No automatic mathematical proof or arbitrary equivalence between differently remade maze layouts is assumed. Other maze rules (tour/block expansion/directed terminals) keep their appropriate native engines within the shared Play page.

The corridor compiler now drives copy transitions through the same PDA operation used by image play. Verified shared graph mappings exist for Alice, Skeptic Play 1, Wolfram 2 / Microchip and Inner Frame. Start, finish sets and all directed copy transitions must match; a family label alone never authorizes aliasing. Revised guide layouts and copy-count variants remain distinct where that bijection fails. Alice's fourteen native ports also have their direct numbered-port check.

The exact balanced-copy search exposed v8's missing surface-trophy win on return from a copy. Goal detection is fixed, and a 510-transition witness expands to 3,540 validated grid moves. It is added as a shared solution. Initial browser verification passed 57/59 workflows; the two remaining failures were an obsolete Home link and actual phone canvas overflow, both addressed before rechecking.

## Fresh residual plan

The first browser pass is complete (60/60). The residual scan found an old independent corridor generator, stale replay/navigation documentation and a numbered-port matcher whose endpoint/rule checks needed strengthening.

1. done: Verify that edited Alice endpoints or stack operations cannot reuse the original PDA; preserve verified shared mappings and all native replay contracts in `squarePDA.test.ts`.
2. done: Replace the duplicate corridor compression in `scripts/prepare-square-solutions.py` with the production PDA compiler/search/expander and validator. Reproduce the v8 witness and publish only validated missing fixtures.
3. done: Inspect final production desktop/phone screenshots, audit every bound source player, and round-trip every native shared replay. Record actual numbers and remaining WIP interpretations.
4. done: Refresh current Home/Play/Solve documentation and check Pages/root hosting entry behavior. Measure available scope gates; explicitly leave unavailable metrics unmeasured.

Residual results: current preview edits are saved before solving, proof preview stays local, and native warning-only links to missing exits remain playable. The corridor generator reproduces eight validated witnesses, including v8, and reports Block Maze without inventing a solution. Final checks: 227 unit tests, 61 production browser workflows, 59 native replay round-trips, 28 source players / 6,378 routes, 12 desktop/phone captures and 20 static-host/deep-link/refresh checks. Type/build and lint pass. Audited authored scope has maximum cyclomatic complexity 21, maximum file size 583 lines and zero explicit any/unknown types. Unavailable metrics remain unmeasured in the report. Remaining WIP/proof/solution gaps are recorded in coverage; no unresolved in-scope action remains.
