# Complete playable mazes — active goal

Goal: get all the mazes complete and nice. This plan preserves the user's full requests, including playable block layouts backed by the same movement rules as their source drawings. Existing green checks do not establish completion of this goal.

The sections below retain chronological checkpoints. Later execution plans supersede older per-step statuses; the twelve requirements above the chronology remain the full scope.

## Requirements and execution

1. Complete: Inspect current models, source geometry, players, replay formats and outstanding interpretation/solution notes. Record the ownership boundary between canonical movement and presentation, and identify actual blockers rather than inventing transitions.
2. Complete for the 28 bound views: Build real orthogonal block geometry retaining original images as covers and selectable views. Follow their declared directed connections, start/finish and copy transitions underneath. Gate reachability, distinct-path crossings and visible positioning have contract/browser evidence. Unbound sources and remaining native models stay in items 5–7.
3. Partly complete: The canonical source/block session owns physical position, walks, PDA crossings and checked proof actions. Cell-sized block keys, source intersection walking, physical undo/restart, depth and location maps are implemented. All 1,320 declared gates have checked physical witnesses in both layouts: 1,288 finite approaches and 32 Cantor proof-assisted approaches. Exhaustive arbitrary-context/history and original source-fidelity review remain open.
4. Pending final coverage audit: New recordings include physical walks and immutable selected geometry; playback, pause/resume (including the final movement), seeking and export/import are implemented. Old gate-only recordings remain playable. Audit every solver-default and saved-recording contract alongside the remaining model cutovers.
5. Complete: Port rules compile to the canonical PDA, including stack-symbol replacement and differing root copies. Bundled reachable states through depth four and every imported replacement context through depth four preserve the reference transitions. Native port gameplay/renderer/worker branches are removed. Old recordings use the canonical physical player and retain their original export; new replacement recordings group each pop/push pair into one move. Surface symbols do not increase play depth.
6. Complete for recursive navigation: Omeometo uses exact radix coordinates and aligned copy-boundary movement, with no fixed manual recursion cap or global expanded play grid. Zoom retains position/history; actual copy depth drives its parent inset. The original 1,756-move solution and depth-80 boundary moves pass. Search remains explicitly finite. Ordinary-PDA equivalence for this variable-coordinate model remains a separate unresolved model audit; this is not a claimed PDA cutover.
7. Pending travel-surface clarification: Complete source interpretation and block presentation for remaining image drafts, including Windischer's layer/limit rules. Preserve the prior v6 image-mapping deferral while making the six-copy block model usable; audit it again before claiming full image coverage.
8. Pending remaining solution investigation: First Cantor, Infinite Descent and both Koteitan patterns now have checked shared solutions. Revisit the seven remaining variants against the actual source topology and upstream rules: Block Maze, Easy/Noke Lieu, counter-pump/pentation/register mazes and Berkly. Recover and validate shared solutions or obtain an actual mathematical classification; bounded failure alone is insufficient.
9. Complete for the supported finite certificate contracts: Legal setup trails, arbitrary repeat words, nested checked claims and joint Cantor connections are constructible. Both original First Cantor and Infinite Descent solutions now have manual browser construction evidence. Saved witness details and left/right comparison are available; exhaustive usability and source interpretation review remain in items 7 and 10. This is not a complete mathematical decision procedure.
10. In progress: All 49 families have inspected desktop/phone initial captures. At catalog starts, 56 center/corner clicks across all 28 bound drawings retain visible markers within their views. Audit deeper histories for the reported center-X disappearance, all author collections, Build and solver choices, session controls, image/block defaults and maze-local solution discovery. Inspect desktop/phone screenshots for every maze family rather than just representative pages.
11. Pending: Complete security, performance and scoped cleanup checks; verify Pages and root website builds and refresh/deep-link behavior. Update upstream adoption notes and all current coverage/verification artifacts.
12. Pending: Perform a fresh residual sweep and a requirement-by-requirement completion audit. Keep the goal active until every required item has direct current-state evidence.

## Movement and layout ownership

`PathMazeDefinition` owns connected-path states, directed transitions, recursive copy addresses and proof rules. Geometry owns the location within a path, its drawn segments, copy frames and anchors. A block layout must change only geometry, not infer new PDA transitions from touching pixels. A visual crossing between separate paths remains a crossing; the player cannot switch paths there. Both source and block layouts must be reachable by the same declared transition witnesses.

The current native expansion, repeated-register, graph and tour models need explicit review before a full canonical cutover. A single-stack PDA must not be claimed to represent richer rules unless equivalence is established. Source WIP labels may be removed only when the actual drawing interpretation has been checked.

## Current evidence and residuals for orthogonal layouts

The new `createBlockArtwork` conversion retains the original source and generates snapped, axis-aligned floor geometry. All 28 bound source fixtures pass the gate-on-path and orthogonality contract; the directed-stroke contract passes. The first browser run reproduced a Snuke arrival freeze: overlapping first segments were counted as separate identical directional choices. Block junction aliases now share a neighbor, and original image crossings retain their existing endpoint-only joins. Source walking regressions and the Snuke onward-route regression pass. Six targeted browser workflows pass, including source depth transitions, two nested entries in the new block view and changing back to the original SVG without resetting the PDA path/address.

Additional checked progress: all 28 bound layouts pass gate-arrival keyboard continuation checks. Eight desktop/phone captures cover Snuke 3, Skeptic Play 1, Wolfram 1 and Inner Frame, with no page errors or horizontal overflow. Block views have a local camera and a whole-maze/parent-position inset. Saved runs retain their selected immutable block artwork alongside the original source; export/import validates that layout. Two browser regressions check nested depth, source/block switching and saved block playback.

On October 10, a fresh run passed all 269 unit tests across 31 files, all 73 production browser workflows, lint and the Pages production build. The build still reports large catalog/artwork/replay chunks. These checks cover implemented behavior; they do not establish completion of the pending requirements.

Remaining in the layout work: review collapsed anchors, longer histories and every maze family. A snapped block drawing alone does not complete finite-expansion or unresolved-model work in items 5–12.

## Canonical physical session checkpoint

`pathSession` owns address/path/point history and both walk and compound crossing moves. `usePathSession` owns live session actions; `usePathMotion` only animates the displayed frame. The renderer no longer stores an independent lasting walk position. Returning to the same PDA path at a different physical point keeps the run; returning to the same full position removes its detour. Undo works before the first gate, restart restores the real start, and a drawn finish must be reached before reporting success.

`NativeRoute.physical` stores these moves and positions alongside the exact PDA witness. Import checks physical path geometry/direction and copy witnesses before normalization. New walk-only recordings are saveable. Existing bundled and saved gate-only contracts remain readable, as requested.

The minimized Daedalus regression exposed duplicate destination attachments in the old pointer/replay route graph: a 10-unit junction walk became a 70-unit detour. Keyboard movement, pointer routing and physical replay validation now use one junction graph. A layout-switch regression also caught an off-stroke source start anchor; projecting a walk now retains that short anchor-to-path segment instead of dropping the move.

Focused evidence covers all 28 bound views in both geometries: first physical walk/cross export/import, source/block history projection, gate round trips and longer four-crossing histories. Ten session regressions and three new browser workflows cover undo/restart, detour identity, directed import rejection, drawn finish, one-cell block movement, walking-only recording, immutable import and final-movement pause/resume. All 279 unit tests, 76 production browser workflows, the production build and strict scoped lint pass after the final floor-junction/label refinement. [Recorded checks and measured limits](PATH_SESSION_CHECKS.json).

The longer-history sweep caught Wolfram 2's repeated vertices and interior block-floor crossings being treated as different junctions. Same-path block floors now join where they touch, including repeated vertices within one stroke. Different paths still have separate crossings, and original-image strokes still use their source endpoint junctions. Layout projection and physical import both pass after this fix.

Fresh residual plan for this controller pass:

1. Complete: Verify the final production browser suite and refresh the measured scoped literal cyclomatic report after the floor-junction refinement. All 76 production workflows pass, and the 16-file scope has maximum cyclomatic complexity 21 with no explicit any/unknown types.
2. Complete: Inspect desktop/phone play captures after controller changes and update stale movement/recording documentation. Eight refreshed captures have no page errors or horizontal overflow. Block labels, rings and highlights now scale with their cells; the board gutter matches its wall color.
3. Partly complete: Longer mixed histories and view projection pass across all 28 bound views in both geometries. Every-bound-gate physical-history coverage remains part of the global audit before closing movement coverage.
4. Continue the actual remaining model work: imported stack replacement/root rules, Omeometo unbounded recursion, unresolved source/proof/solution coverage and full visual/security/static-host completion. The full goal remains active.

Next port-rule investigation: the actual `portMoves` reference matches `fromBlock` only when leaving a copy. Entering matches the port and pushes `toBlock`; a zero-depth rule either keeps or replaces the current stack symbol according to `stayKeepsBlock`. Root replacement is legal, root exit is not. The remaining compiler must preserve these rules, including different root start/goal symbols; adding an invented `fromBlock` guard to entering or walking would change the puzzle.

Port cutover execution — complete:

1. Compile symbol replacement into an ordinary pop/push helper pair; use distinguishable surface symbols when root identity can vary. Preserve the simpler root-invariant model and its exact Snuke source binding.
2. Keep surface symbols out of play depth, copy breadcrumbs and drawn frames. Crossings replacing a symbol must remain one physical action at the same depth.
3. Extend exact balanced search to nonempty endpoint stacks by internal entry/finish wrappers, retaining only original transitions in its returned witness.
4. Remove the native port gameplay branch, convert old port replay states into the canonical player, and preserve all real saved/imported route contracts.
5. Verify all bundled states through depth four, imported replacements/root changes, directed exits, solver search, physical replay and desktop/phone presentation. Finish with a fresh residual sweep of the full goal.

Port checkpoint: all 283 unit tests across 32 files, all 78 production browser workflows, lint and the Pages production build pass. Exact balanced search now accepts nonempty initial/finish stacks without adding synthetic transitions to the returned witness or its shortest-route cost. Koteitan's static nested drawing uses reusable SVG instances: 7,023 board nodes become 261, with a pixel-identical desktop board comparison. The 22-file production scope has maximum cyclomatic complexity 21 and no explicit any/unknown types. [Measurements and remaining unmeasured gates](PORT_PDA_CHECKS.json). [Production desktop/phone play and replay captures](screenshots/port-pda/index.html).

## Fresh residual plan after port cutover

1. Complete: Compare `koteitan_fractalblockmaze-main/mazesolver.js` variable-length positions, carrying movement and boundary entry with `core/model/blockExpansion.ts` and `core/blockMaze/grid.ts`. Separate exact recursive movement from display/search truncation before defining the new position/adjacency contract. The existing depth-five route remains a finite-grid witness.
2. Complete: Implement and check that recursive contract, its depth/location display and route recording, including small-cell to large-cell returns and aligned sibling boundary crossings. Do not flatten it into a fixed grid or invent unrestricted sibling connections.
3. Continued in items 7–9: Complete Windischer/source interpretation, missing shared solutions and the requested proof construction, as specified in items 7–9 above.
4. Pending: Finish every-family movement/replay and desktop/phone audits, center-X investigation, security/performance cleanup and both hosting builds, as specified in items 3–4 and 10–11.
5. Pending: Re-scan the full original requirements and artifacts before declaring the goal complete; current green tests only certify implemented behavior.

The top residual investigation has begun: upstream positions are arrays of unit-cell coordinates ending at the first white cell, rather than uniform finest-grid cells. `searchnext` carries coordinates across copy boundaries, truncates a destination when an ancestor cell is white, and recursively explores the entered edge when its entire address is black. `rectry` is bounded by the solver's requested depth, which limits search rather than the underlying substitution. The source solver starts from bottom-boundary entries and accepts a top-boundary exit; the app currently projects fixed white start/goal cells to their centers. An unbounded implementation must retain the aligned boundary interval when crossing sibling copies; merely popping/pushing a neighboring copy name loses that geometric constraint.

## Recursive block checkpoint and fresh residual plan

The recursive position and replay contracts are implemented. Coordinates retain all radix digits; rendering approximates only the visible local window. The copy stack ends at the first white cell. Zoom does not reset the run or change finite-search detail. New recordings include exact positions and each move's detail, while old finite-grid recordings keep their original contract/export. The declared start/goal base white cells are regions for new recursive movement; existing source recordings retain their original projected-center finish validation. A complete source endpoint/PDA equivalence audit remains open.

Verification: 288 unit tests across 33 files, all 80 production browser workflows, lint and the Pages production build pass. The 12-file production scope has maximum cyclomatic complexity 21, maximum 329 source lines and no explicit any/unknown types. Eight inspected desktop/phone captures cover base detail, detail-25 zoom preserving history, actual copy depth four and the supplied solution finish, with no page errors or horizontal overflow. [Measurements and unmeasured gates](RECURSIVE_BLOCK_CHECKS.json). [Production captures](screenshots/recursive-block/index.html).

Fresh residual sweep:

1. Continued in the later residual plan: Reconstruct Windischer's layer terminal table from the original drawing, annotated recursion image and author post. Correct the stale skip attribution: Jay deferred v6 image mapping, not Windischer. Keep unknown gates explicit until homologous boundary intervals are established.
2. Pending: Audit ordinary-PDA equivalence and source endpoint correspondence for the variable-coordinate model; review repeated-register, graph and tour semantics before claiming all mazes share one PDA.
3. Pending: Revisit the eleven other variants lacking shared solutions, starting with source endpoint/topology evidence for the two endpoint-less Koteitan patterns. Distinguish absent puzzle endpoints from bounded search failure.
4. Pending: Complete arbitrary nested and joint proof construction and verify examples against actual source mazes.
5. Pending: Audit every bound gate, mixed walk/cross replay and view projection; reproduce the reported center-X disappearance and review all maze families on desktop/phone.
6. Pending: Finish security/performance cleanup, upstream adoption accounting and both root/Pages hosting checks. Preserve the requested complete scope in the final requirement audit.

The top residual item has begun. The [author post](https://www.mathpuzzle.com/17Dec06.html) was retrieved again and confirms a design with one central limit point, without an explicit central-crossing rule or terminal table. Existing candidate fragments remain unbound rather than being presented as a solved maze. The solution-inventory producer now records unbound endpoints/topology instead of incorrectly saying the conversion was skipped by request.

The inventory review also confirmed that `koteitan-block-3` and `koteitan-block-5` have no declared endpoints. Their previous bounded-search classification was incorrect: `searchBlock` returns before exploring when endpoints are absent. The producer and inventory now record `missing-endpoints`. Shared-solution inventory checks pass after these metadata corrections.

## Infinite solution checkpoint and fresh residual plan

Both original Siggy examples now have checked shared solutions. First Cantor uses permitted surface gate 6 and a joint certificate with four witnessed obligations. Infinite Descent uses two setup entries into A on each side and repeats the twelve-copy word B C A C B C B C A C B C inside AA. Its visible cyan branch was previously omitted by a fill-only extraction filter. Extraction now includes visible strokes regardless of fill, and the declared model has 22 directed connections. Original drawings and empty proof notebooks are preserved.

Matched-descent recovery now searches a finite graph of ordered path pairs, with balanced finite programs around each shared descent, rather than imposing a short period cutoff. This sound certificate search does not decide every generalized infinite proof. Both real certificates can be constructed with notebook controls and replayed/exported/imported. Companion/right witness details are collapsed by default to reduce the proof evidence wall.

Current verification: 291 unit tests across 33 files, 85 production browser workflows, lint and the Pages build pass. There are 72 complete shared solutions covering 62 variants and 29 generated solution fixtures. Source interpretations remain WIP. [Current checks](INFINITE_SOLUTION_CHECKS.json).

Fresh residual sweep:

1. Complete: Reconcile current inventory, source/PDA connection counts, solution notes and documentation against the two recovered proof fixtures. Verify all shared replay snapshots through serialization/import; inspect both examples on desktop and phone. Keep historical checkpoint artifacts explicitly historical.
2. Pending: Resolve Windischer's travel surface and homologous layer gates from the original source evidence; the question about gray corridors versus white ribbons is still pending. Do not add an assumed center crossing. Preserve the v6 image-mapping deferral.
3. Complete for Koteitan: Original README/solver semantics permit bottom entry and top exit. Both patterns now use open base cells on those edges and have checked solutions. The seven other missing solution variants remain in item 8.
4. Pending: Audit variable-coordinate, repeated-register, graph and tour rules for ordinary-PDA equivalence; do not claim all native models have been converted.
5. Pending: Finish every-bound-gate and every-family movement/replay, center-X and desktop/phone visual reviews. The current representative captures do not close that requirement.
6. Pending: Finish security/performance cleanup, upstream adoption accounting and root/Pages refresh/deep-link verification, then audit every original request before closing the full goal.
7. Complete: Saved proof evidence describes the recorded repeating trails without asking the reader to check an already checked replay. Editable notebooks retain the construction instructions.

The top residual item has been executed: fixture inventory and active notes are reconciled, all 61 native snapshots pass serialization/import, and ten production desktop/phone captures have no errors or horizontal overflow. Representative screenshots were inspected; these do not replace every-family coverage. Historical reports remain dated checkpoints rather than claims of current completion.

## Koteitan endpoints, shared solutions and audit continuation

The original block solver seeds open bottom-edge regions and accepts a top-edge exit. The previously inactive 3×3 and 5×5 templates now choose permitted open bottom/top base cells for Play, rather than leaving both endpoints null. This does not assert that all boundary points are connected. The exact substitution and recursive movement are unchanged.

The 3×3 detail-two route has 9 moves. The 5×5 detail-five route has 3,979 moves; its 3,125-wide expansion exceeds the live finite solver limit. `prepare-block-solutions.py` searches that expansion offline and validates the published exact-coordinate recording through production movement/replay import. Playback renders only its local window. New documents open at base detail one, support keyboard movement/undo and offer their solutions beneath Play. Older snapshots keep their recorded null endpoints.

Current inventory: 74 shared solutions covering 64 variants, 31 generated fixtures, seven other variants without verified solutions and three unbound Windischer views. All 63 native snapshots serialize/import successfully; eleven original wire strings retain their separate player contract. Both production/root builds pass 40 static direct-link/refresh checks, including solver-worker execution on each mount. Runtime and complete dependency audits report zero known vulnerabilities.

The full authored TypeScript scan found one literal cyclomatic violation: `parseMazeText` at 27. Grid decoding/validation is now a cohesive private helper, reducing the named-directive parser to 21. Existing invalid-grid, complete-format round-trip and shared solution checks pass (78 focused tests). No explicit any/unknown types or authored files of 1000 lines occur in the 201-file production scope. Other analyzer gates remain unmeasured.

Next residual plan:

1. Complete for the initial-view pass: 98 captures cover all 49 families on desktop/phone, with no errors or horizontal overflow. Fourteen board sheets were inspected. Register Play/replay defaults now show available connections; the full map remains optional. All 293 unit and 88 production browser tests, lint and Pages/root builds pass after the parser cleanup. Current evidence is in BLOCK_SOURCE_CHECKS.json, CODE_QUALITY_CHECKS.json and STATIC_HOSTING_CHECKS.json.
2. Pending: Revisit Block Maze, Easy/Noke Lieu, Berkly, cp3-3, cp3-4, penta and the three-register compiler example using source topology/register rules, not just larger search caps.
3. Pending: Complete Windischer interpretation and the native-model equivalence review; the v6 image mapping remains deferred by request.
4. Pending: Audit every bound gate and mixed physical replay/view history, including the reported center-X disappearance. Initial-view screenshots do not prove these behaviors.
5. Pending: Reconcile upstream adoption and security/performance findings and run the full requirement completion audit. Keep the goal active while required work remains.

Fresh residual sweep after the initial-view/security pass:

1. Complete for catalog starts: 56 original-drawing center/top-left X-area clicks across all 28 bound players preserve a visible marker within its view, with no page errors. The source render/controller has no center-X control; those marks belong to the original images. Deeper-history reproduction remains in item 3. [Results](SOURCE_POINTER_CHECKS.json).
2. Complete for framing: `RepeatedRenderer` now frames the current copy and every legal destination, labels visible copies and highlights current ownership across coincident atomic boundary terminals. Full-map remains optional. Three focused browser workflows pass; 400 production frames across all 17 register documents on desktop/phone keep the marker and legal arrows visible. The register rules and recordings are unchanged. Old trails are clipped to the maze area after screenshot review; final verification follows with item 5.
3. Pending: Audit every-bound-gate physical histories and longer mixed replay/view projection; initial screenshots and finite replay import do not prove this requirement.
4. Pending: Revisit the seven missing solutions and Windischer topology and review ordinary-PDA equivalence for richer native models.
5. Complete for default-block choices: Each bound source Play session now starts with the same block artwork as its renderer. Original drawings remain selectable and retain their cover role; recordings keep their selected geometry. All 34 focused workflows and 293 unit tests pass. The production source sweep covers all 28 documents on desktop/phone: 224 legal compound crossings, source/block switching and 112 nested center/corner clicks preserve visible markers and expected path/depth. This does not close the every-gate, all alternate-layout or source-fidelity audit.

Fresh residual sweep after the default-block cutover:

1. Complete for the final refresh: All 92 production browser workflows pass after the default-block and motion fixes. A trace reproduced an immediate post-switch walk beginning at stale block coordinates while its session held source coordinates. Layout selection now projects the session in the same event, move-free frames synchronize the marker before input, and rejected walks never animate. Static instructions remove a measured 19px control jump; canonical busy state guards keyboard, pointer and touch movement. The affected three workflows passed three consecutive runs. Fourteen block/source sheets have been inspected, including Inner Frame. Refresh every-family initial captures, source/register sweeps and static-hosting evidence on the final build.
2. Pending: Cover every reachable bound gate with physical histories and longer mixed replay/view projection. The new four-crossing source sweep does not prove every gate or arbitrary replay history.
3. Pending: Investigate Block Maze, Easy/Noke Lieu, Berkly and the four register examples against their actual source rules. Keep missing shared solutions explicit; bounded search failures do not classify infinite reachability.
4. Pending: Resolve Windischer's travel surface/topology and review the richer native models for an appropriate underlying position representation. Preserve the requested v6 image-mapping deferral.
5. Pending: Audit the full original requirements, proof construction/usability, upstream adoption and remaining optimization/security findings before marking the goal achieved.


The final build passed 293 unit tests, 92 browser workflows, lint, both builds, 40 static-hosting checks, 400 sampled register frames and the 28-document source/block sweep. All 98 family captures were refreshed with no page errors or horizontal overflow. These checks retain the scopes stated in their reports; they do not establish every source interpretation or every possible route.

Fresh residual plan for the completion-status review:

1. Complete for fresh catalog cards: Check production Library covers against the original assets after the block-default cutover. Record actual image URLs for every family with source artwork and distinguish absent assets from mismatches.
2. Pending: Exercise every reachable bound gate and longer mixed walk/cross histories in both layouts; four selected crossings per document do not cover every gate.
3. Pending: Investigate source rules for the seven variants lacking shared solutions: Block Maze, Easy/Noke Lieu, Berkly, cp3-3, cp3-4, penta and the three-register compiler example.
4. Pending: Resolve Windischer topology and review register, variable-coordinate, graph and tour models before claiming one ordinary PDA for every maze. The v6 image mapping remains deferred by request.
5. Pending: Finish proof usability/construction and the original-request audit, including upstream adoption, optimization and security findings. The full goal remains active.

The top residual item passed: all 25 Library families whose canonical document carries an original image asset use that exact asset on desktop and phone (50 cover checks), with no failed resources or page errors. Generated block artwork remains the Play default. This excludes saved overrides and asset-less diagrams. [Cover evidence](LIBRARY_COVER_CHECKS.json). All fourteen refreshed family board sheets and representative register replay captures were inspected. Seven missing solutions, Windischer binding, richer-model equivalence, exhaustive gate histories and proof/completion review remain open.


Every-gate audit execution plan:

1. Complete for declared finite reachability: Use balanced PDA reachability with an accepting stack-drain suffix to recover a finite approach to each bound gate, without a depth cutoff. Validate each real edge after removing the audit-only suffix, group helper operations into actual player crossings, and report finite-unreachable or non-manual cases separately.
2. Complete for the declared finite witnesses: Follow each recovered crossing witness in source/block geometry, interleave physical walking and repeated view projection, and validate exported/imported recordings. Record precise failing maze, gate and history rather than masking failures.
3. Pending: Exercise representative longer witnesses in production Play on desktop/phone, including undo/seek and layout switching. Keep core-contract evidence distinct from UI evidence.
4. Pending: Return to seven missing solutions, Windischer interpretation, richer-model representation and proof usability after resolving any movement defects exposed here.

Initial enumeration checkpoint, superseded by the verified passes below: 1,320 declared gates across 28 bound documents, with 1,285 covered by legal compound crossing witnesses. The remaining 32 are in First Cantor (26) and Simple Cantor (6), whose proofs extend finite reachability. Five helper-target approaches do not form player decisions themselves; two occur inside other valid compound witnesses and three Skeptic Play 2 helper operations still need a player-reachability review. [Approach witnesses](SOURCE_GATE_APPROACHES.json). The full physical/mixed-history audit is still running; this enumeration does not claim geometry or UI completion.


Directed movement findings during the every-gate audit:

- The first arbitrary-walk pass found 28 disconnected departures in Snuke 1–4. Walking away along a one-way branch can correctly make another gate unreachable, but the UI and canonical crossing previously allowed that gate to jump copies. The engine now rejects disconnected departures/arrivals and live controls disable them.
- Opposite directed strokes now use the same orthogonal bend in reverse, removing an artificial return path created by the older conversion. Directed interior crossings remain separate; collinear shared segments still support keyboard continuation.
- Snuke 1 has coincident block prefixes for two source branches. Projection now selects a correspondence reachable from the previous point and toward the next recorded crossing. An invalid crossing projection throws rather than silently dropping the PDA step.
- Four regression loops were observed failing before their fixes. Eighty-two focused tests and the full 297-test unit suite now pass. Production browser/static refresh and a final source-hashed every-gate pass are running.

The gate audit now walks along each selected gate approach, rather than demanding an unreachable gate after an arbitrary one-way detour. Helper-only operations use actual compound player witnesses. The intermediate 3-failure pass pinpointed Snuke 1 projection; it is not evidence of final completion. The current seven missing solutions, Windischer binding, richer model review, full proof usability and original-request completion audit remain open.

The next missing-solution review has begun for Block Maze. Its current finite-only native rules have single-copy links; all 766 legal moves in root and each of the ten child contexts map to the compiled PDA. An independently checked closed balanced relation over 11 states/58 connections excludes the surface trophy (path 10 to path 1). The producer's earlier bounded-search classification is weaker than this new evidence and needs reconciliation. [Rule review](BLOCK_MAZE_SOURCE_REVIEW.json), [reproduction](../scripts/review-block-maze.py). No source endpoints or infinite-hop rules were changed.


The final every-gate pass is complete for declared finite witnesses: 1,288 of 1,320 gates, 21,246 crossings, 19,249 interleaved walks, 23,822 projections and 5,152 replay imports, with no failures or source changes during the audit. The remaining 32 gates require proof-enabled reachability, and no source-fidelity or exhaustive arbitrary-history claim follows. The full 297-unit suite, 93-production-workflow suite, additional Snuke 1 branch/undo browser regression, lint, Pages/root builds and 40 static-hosting checks pass. Sixteen Snuke source/block presentation captures have no page errors or horizontal overflow; representative phone captures were inspected.

Fresh residual plan after directed movement verification:

1. Complete: Reconcile the Block Maze source-rule result in the solution-inventory producer and shipped coverage file. Re-run its actual balanced producer and shared-inventory tests; preserve existing solution bundles.
2. Complete for the declared infinite/Cantor contracts: User-checked claims extend live physical Play through `proofCrossing` and `crossProofSession`, separate from ordinary connection actions in the same canonical session. All 32 gates outside finite reachability pass with exact endpoint/address correspondence, visible source/block arrival, undo and replay validation. The notebook remains user-constructed.
3. Pending: Review the six other missing solutions against original geometry/register rules and resolve Windischer topology. Preserve the v6 image-mapping deferral.
4. Pending: Finish richer-model position/representation review, every original request, proof usability and remaining optimization/security findings. The full goal remains active.

The top residual item has been executed: the production balanced corridor generator regenerated all nine results, preserved existing fixtures and classified Block Maze as `no-finite-route`; shared-inventory checks pass. Six other variants still need verified solutions, alongside three unbound Windischer views and the deferred v6 image mapping. The finite-gate pass does not close the proof-enabled or full original-request audit.

Status review: the current shared-inventory regression passes all 32 checks after the Block Maze metadata update. TypeScript and lint pass again. The source/block finite-gate evidence remains valid for unchanged movement logic; its source hash predates the inventory metadata update. The goal remains active.

Live checked-proof cutover:

1. Complete: Checked-claim actions use the canonical physical session. Departure/arrival anchors come from actual proof witnesses, including nested lemmas and joint hypotheses; address substitution is preserved. Stale and physically disconnected claims are rejected.
2. Complete: Live movement choices, drawing animation and source/block projection use the checked action. Schematic examples expose their controls; duplicate proofs expose one usable destination. The layout selector remains available after finishing.
3. Complete for supported physical proof contracts: Saved sessions retain proof steps/claims, validate physical actions on import and expose the used proof during playback. Undo, detour trimming, nested/reversed boundaries, pause/resume and exact final positions pass.
4. Complete for the declared certificates: Manual Cantor/Infinite Descent construction and live block/source use, undo, pause/resume, immutable export/import and exact drawn finishes pass on the final production build. Nine core proof-session regressions cover nested/composite claims, address substitution, stale/forged evidence and physical history. All 32 proof gates pass the separate audit.
5. Pending: Run a fresh residual sweep against the complete original request and continue the next actual missing item.

Checked-proof gate evidence: all 32 previously finite-unreachable Cantor gates have exact proof-assisted approaches. Both layouts passed 196 walks, 152 ordinary crossings, 78 checked actions, 230 projections and 128 replay imports. The audit explicitly loads checked fixture claims; the notebook/normal Play never automatically inserts them. The source remained unchanged during the final gate pass, which includes the final production implementation and all nine proof-session regressions. [Evidence](PROOF_GATE_CHECKS.json).

Fresh residual plan after the live-proof cutover:

1. Complete for all twelve imported templates and the declared boundary contract, verified below: Audit native geometric gate/corridor rules for a canonical physical PDA and block conversion. Preserve actual source memberships, surface-only finishes, boundary indices and archived native recordings. At that checkpoint the player called `geometricChoices`/`geometricMove`. The verified cutover below removes that player and distinguishes the archived arrival-gate exclusion from physical backtracking.
2. Pending: Reconcile missing-solution classifications after source/native rule verification. Block Maze and Easy–Noke Lieu have checked negative results under their current finite models; Berkly and four register mazes still need the source/model/solution investigation. Preserve originals rather than fabricating successful recordings.
3. Pending: Resolve Windischer's travel surface and limit crossings; keep all three views in scope and v6 image mapping deferred as requested.
4. Pending: Measure actual initial loading and partition the large catalog/artwork/replay chunks where it improves static-host startup. Finish the original-request audit, richer-model rendering/position review and security cleanup.

The top residual item has begun. Easy–Noke Lieu has 11 connected-path states and 32 copy transitions (A/B). An independently checked closed balanced relation excludes the surface finish component 5 from start component 0, and the production balanced witness routine returns null. The corridor relation overapproximates native choice rules by allowing immediate reversal, so the negative result holds for current native finite routes as well. This does not certify the original author's intended finish rule. [Evidence](NOKE_LIEU_MODEL_REVIEW.json). The geometric Play/block cutover remains unfinished.

Final live-proof verification: 306 unit tests across 34 files pass; the 95-workflow production suite passes, followed by three affected workflows on the final label-refined build. Lint, Pages/root builds and 40 static-host checks pass. All four refreshed proof captures were visually inspected; internal claim UUIDs no longer appear in the movement description. Measured production scope contains 204 files, maximum literal cyclomatic complexity 21, maximum file size 553 lines and zero explicit any/unknown types. Unavailable analyzers stay listed rather than being claimed green. [Verification](LIVE_PROOF_CHECKS.json). The fresh residual plan above remains active; the original goal is not complete.

Port-root residual revalidation: `compilePortPDA` already includes every internal surface symbol in `copies`, and validation requires that relationship. `claimError` therefore accepts those declared symbols. The earlier suspected omitted-root bug is not present; no speculative proof-validator change is needed.


Native geometric cutover execution plan:

1. Complete for the twelve imported templates and the declared boundary contract: Compile all valid FRACTAL-MAZE.v2 corridor memberships and numbered copy boundaries into `PathMazeDefinition`. Retain a hidden surface symbol so explicit finishes and outer exits remain surface-only. Recover exact unit-cell floor geometry from four-neighbor pixels, not their incidental array order; preserve bends, branches and blocked boundary arrivals.
2. Complete: Route geometric Play, Solve and Build through the shared physical player and canonical PDA. Keep original source drawings for covers and original-format export. Remove the replaced gate-only player and renderer interaction controls.
3. Complete: Adapt archived geometric recordings to canonical physical sessions with one frame per original action, including the final finish action, while preserving original export. New recordings use physical PDA sessions.
4. Complete for the twelve templates/declared boundary contract: Verify all twelve imported geometric templates, every native legal transition in surface and child contexts, surface-only finishes, full physical source solutions, backtracking/undo, solver, save/import/playback, and desktop/phone presentation.
5. Complete for classification: Reconcile Easy–Noke Lieu's negative finite-model classification using the actual production compiler/search in the fixture generator. The producer regenerated both geometric records and preserved all other fixtures; no finite route exists under the current geometric definition. Original author intent remains open. A fresh residual sweep follows.

The preceding status-only goal turn is classified as no progress. The initial inspection confirmed `FormatPlayer` still mounted `GeometricPlayer`; that component and interaction wiring have now been removed. All twelve geometric source templates have connected four-neighbor pixel corridors. Two templates contain unbound boundary gates; these need visible dead ends rather than invented corridor connections.


Geometric cutover findings: all twelve source floor bitmaps are retained exactly, including branches/loops and their declared copy memberships. All 24,442 native legal moves across surface and two nested contexts per copy have matching canonical states, physical departure/arrival and visible depth. Live geometric movement now permits immediate physical reversal, unlike the old gate selector's arrival-gate exclusion; history trims only at the same address/path/point. An imported unbound boundary is represented as a dead end with a legal return. Explicit finish actions consume the hidden surface symbol and remain separate from entering the finish corridor. Original diagram covers/source exports and archived gate recordings are preserved.

Final presentation review found and corrected a crowded 21-crossing button list in Tsat: large lists now live in a foldout beside the arrow controls. Replay evidence describes physical moves and human path labels rather than internal gate IDs. Three refreshed desktop/phone captures were inspected, including the exact finished dot after the final animation.

Fresh residual plan after geometric conversion:

1. Complete for baseline and Home: Measure actual cold-route resource loads for Home, Library, Alice and geometric Play on the production static build; identify which catalog, artwork and replay dependencies load before first interaction. Record measured decoded/transfer bytes and resource names before choosing a partition, without treating local preview timing as user-network performance.
2. Pending: Investigate Berkly and cp3-3/cp3-4/penta/cp-n3-godel source/model/solution rules. Keep the two checked negative finite-model results distinct from these five unresolved cases.
3. Pending: Resolve Windischer's travel surface and homologous layer gates from source evidence, preserving the pending interpretation question and v6 mapping deferral.
4. Pending: Review repeated-register, variable-coordinate, graph and tour position contracts and the requested underlying representation. Preserve constraints which cannot be represented by an ordinary PDA rather than silently weakening puzzle rules.
5. Pending: Complete the original-request audit, upstream additions/adoption accounting and remaining security/performance findings; reconcile every current verification artifact and retained WIP claim before closing the goal.

Final geometric verification passes 312 unit tests across 35 files, all 99 production browser workflows, lint, Pages/root builds and 56 static-host refresh/deep-link checks, including the new balanced PDA worker on both mounts. Three refreshed captures were inspected. The all-template check matches 24,442 legal native moves to canonical physical states. [Full evidence](GEOMETRIC_PDA_CHECKS.json). Unavailable analyzer gates and source-interpretation limits remain explicit.

The new startup residual was executed: cold Home loads 3,733,756 decoded JavaScript bytes, Library 3,753,010 and both selected Play routes 5,001,554 before interaction. Home imports the complete catalog/path catalog through its Alice preview. The next scoped change extracts the existing square renderer as its own module and loads only Alice’s source for Home; rendering and the shared player stay intact. Before/after resource measurements and exact canvas hashes are being checked. Library/Play partitioning remains separate work.

Home follow-on verification is complete: decoded cold-route JavaScript decreases by 87.9%, from 3,733,756 to 450,376 bytes, and the exact preview canvas hash is unchanged. The existing square canvas implementation now owns its drawing/camera in its own module; Home imports only Alice. All 31 affected production workflows and 56 static-host cases pass, as do production/type checks, lint and the three changed files' complexity/type checks. Current production scope is 208 TypeScript files with maximum cyclomatic 21 and no explicit any/unknown types. [Measurements](HOME_STARTUP_CHECKS.json).

Fresh residual plan after Home loading cleanup:

1. In progress for investigation: Separate shared replay metadata from full route payloads, so a live Play page can list all solutions without eagerly loading every recording. Audit `bundledReplays.ts`, MazeReplayBar, MazePlayArea, PlayerPage, ReplayPage, both native replay projection tests and the solution/audit generators. Preserve all 74 visible defaults and immutable export/import contracts; verify cold-route bytes before/after actual implementation.
2. Pending: Partition Library/catalog/source model loads without replacing original covers or losing author/variant grouping, source/compiled equivalence, exports and Build/Solve entry points. Current Library loads 3.75 MB of decoded JavaScript; Play loads 5 MB before interaction.
3. Pending: Investigate the five unresolved source/register solutions (Berkly, cp3-3, cp3-4, penta, cp-n3-godel), with the two negative finite-model cases kept distinct.
4. Pending: Resolve Windischer source topology and the richer-model position contracts; keep the v6 mapping deferral explicit.
5. Pending: Reconcile upstream adoption, security findings, proof usability and every original requirement against the final artifacts before declaring the full goal complete.

The top new residual has begun: `bundledReplays.ts` synchronously imports every generated route, and MazeReplayBar imports that module just to render choices. The same module builds provided routes while iterating all catalog definitions. The measured 1,178,827-byte replay chunk loads before any replay selection. Call-site enumeration confirms two typed projection regressions filter on `bundle.route.type`, and the Cantor gate/repeated presentation audits consume full claims/routes. A metadata/payload separation must update those real consumers rather than adding a route-less compatibility placeholder.

Final keyboard residual review found that an ordinary child exit can lead to a path which is also a surface finish. Its arrow must still point outside the child, rather than toward the parent finish location. `sourceGateDirection` now receives the actual model and applies special finish geometry only to internal surface-symbol exits. Both the explicit-finish direction and that child-exit regression pass; 35 focused unit tests, all 26 affected production source/block workflows, lint, Pages/root builds and the final 56 static-host checks pass. Core topology and old replay contracts are unchanged.

Additional explicit model-review scope: the original Wolf wire iframe still has its own movement and string solutions. It must be audited against Wolfram 2’s source PDA before claiming one underlying model for those two views or replacing archived playback. Include this alongside register, coordinate, graph and tour models in the remaining representation audit; preservation of original exports is required.


Shared replay loading execution plan:

The preceding goal turn is progress: canonical geometric Play/Solve/Build, exact source floors, archived replay projection and the Home startup reduction were implemented and verified. Current inspection confirms the next scoped bottleneck: loading `bundledReplays.ts` eagerly constructs all provided routes and imports every generated route just to list replay choices.

1. Complete: Move shared replay preparation to an offline producer that emits immutable per-solution snapshots and a small metadata manifest. Generate all 63 native recordings and 11 wire strings using current production builders/validators; preserve stable IDs and all existing solution routes/types.
2. Complete: Replace the eager replay module with a typed metadata list and an asynchronous selected-asset loader. Update Play/legacy links, wire playback, proof labels, native projection tests and real audit consumers; remove runtime source enumeration and route-array imports.
3. Complete: Verify all 74 payload/index bindings, current source freshness, complete solution imports, proof evidence, old native exports, selected-only requests, errors/maze mismatches, static mounts and production browser workflows. Compare cold-route bytes with the current 5 MB Play baseline.
4. Complete: Reconcile generator instructions/check artifacts and inspect the next Library/catalog payload seam before concluding this checkpoint. Retain all remaining source, richer-model, upstream/security and full-goal requirements in the residual plan.

The status-only preceding goal turn is classified as no progress. Revalidation confirms the 74 recording assets were generated, but live Play still used the eager route module. The current continuation replaces that module and all payload-consuming callers; fresh catalog comparisons and real HTTP selection/error tests will verify the cutover.

Fresh residual execution plan after the shared recording cutover:

1. Complete for the current transcription: Re-examine Berkly’s original colored/black wires and gate assignments, then independently check a closed balanced relation against production. All 64 gate anchors belong to their declared traces; the surface goal is excluded. The crossing interpretation and original author rules remain WIP. `review-berkly.py` and BERKLY_MODEL_REVIEW.json record the exact scope. The catalog producer regenerated only Berkly’s coverage; it now reads provided routes from source definitions rather than its own generated replay index.
2. Complete for partition/solution/projection investigation: Enumerate the original Wolf player’s source graph, copy transitions and eleven direction strings; compare them with Wolfram 2’s photo PDA. Record the mapping or mismatches before unifying the remaining wire playback. Do not infer equivalence from shared titles.
3. Pending: Partition Library/catalog data. Current dependency inspection finds LibraryMazeCard loading every full model through the catalog barrel, mazeViews importing that eager catalog, and LibraryPage eagerly importing pathCatalog helpers. Covers and saved overrides require an explicit metadata/preview boundary, not another forwarding wrapper.
4. Pending: Investigate cp3-3/cp3-4/penta/cp-n3-godel against actual register/source rules; preserve unsolved and negative finite-model classifications.
5. Pending: Resolve Windischer topology; review register, variable-coordinate, graph and tour position contracts, retaining constraints beyond an ordinary PDA and the requested v6 deferral.
6. Pending: Finish proof usability, original-request coverage, upstream adoption accounting and remaining security/performance review. The goal remains active.

Shared recording completion evidence: 386 unit tests/35 files, 103 production browser workflows, four final dev loading workflows, lint, Pages/root builds and 64 static hosting checks pass. All 74 assets fetch (63 native imports and 11 checked wire strings); all native snapshot definitions/artwork equal their current sources. Cold Play decreases by 23.12%; Library remains 3.75 MB. The 32 proof gates/128 proof replay imports and 400 register frames pass through the new loader. Publication serializes before browser-to-Python transfer, preserving omitted fields. Both the producer and coverage recovery now consume source definitions rather than each other’s generated index.

The top model residual has progressed: Wolf’s actual 18 connected circuits match Wolfram 2’s photo PDA, and all eleven solutions finish at the same surface goal. Actual copy pins identify 370 crossings over 47 distinct edges, avoiding ambiguous same-path pin selection. The prototype creates physical source sessions and projects every route into both photo and block layouts; all 22 complete snapshots import. The live iframe cutover and unbound boundary dead-end behavior are still unimplemented. The next execution plan is:

1. In progress for caller/contract inspection: Replace the live Wolf wire player with the shared photo/block PDA and publish its eleven named recordings as canonical physical snapshots. Direct old maze/replay URLs, original document export, snapshot identity and named solution labels must remain reviewable. Current caller enumeration identifies FormatPlayer’s iframe/button branch, MazePlayArea’s wire result branch, SolverPage/WorkbenchPage conversion dispatch and four old iframe workflows. The existing public original program remains a reference source. Resolve unbound port semantics explicitly before claiming exhaustive native equivalence.
2. Pending: Partition Library/catalog/source loads while preserving original covers, author/variant grouping, saved overrides and every Build/Solve/Play link. Initial seams are documented above.
3. Pending: Investigate four register/compiler sources, Windischer topology and richer position models. Berkly’s negative result is only for its WIP transcription; v6’s source mapping remains deferred.
4. Pending: Complete the full original-request, proof-usability, upstream additions/adoption, security/performance and verification-artifact audit. The goal remains active.

Wolf shared-player execution plan:

The preceding turn is progress: the selected-only recording loader and all 74 assets were implemented/verified, Berkly’s finite candidate was checked independently, and all eleven native Wolf routes projected into source/block physical sessions. Current files confirm the separate iframe still needs removal.

1. Complete: Fixed legacyWire documents compile to the photo PDA in Play/Solve/Build. All eleven direction strings are published as complete physical snapshots with stable IDs and names. The iframe result type, parent bridge and obsolete Play controls are removed; the public original reference program and original document export remain.
2. Complete for the declared connected-wire contract: All 54 connected native pin callbacks and 16 surface boundary guards match. The 21 unbound parent pins have no continuing wire; shared Play treats them as corridor endpoints instead of landing on invisible empty nodes. This is an explicit movement refinement, not full original-controller identity.
3. Complete for the scoped cutover: Full verification passes 398 unit tests, 106 production browser workflows and 72 Pages/root hosting cases. The 32 proof gates/128 imports and 400 register frames pass the plain snapshot loader. Returning from a saved replay exposed a source-document loading race; PlayerPage now scopes its loaded result to both maze and replay selection before initializing the export draft. All original exports and eleven named physical replays pass. Source fidelity and richer-model requirements remain outside this cutover's claim.
4. Complete for Wolf checkpoint: README, coverage, upstream adoption and hosting notes reflect shared playback. [Evidence](WIRE_PDA_CHECKS.json). Library loading follows below; the full goal remains active.

Fresh residual plan after the October 11 status check:

1. Complete: Wolf's full production/static-host verification and proof/register consumers pass; the checkpoint artifacts distinguish declared connectivity from WIP source fidelity.
2. Complete: Library uses `catalogIndex.ts` and an offline-generated card/reference index. All 74 variants, 43 reference bindings, original covers, review badges, author/view grouping and saved overrides are checked against actual models. Saved projects still render their document lazily; current-catalog copies remain separate. Cold Library JavaScript decreases by 86.96%, total decoded resources by 88.05%, and Home's exact bitmap is unchanged. Full verification passes 400 unit tests, 107 production browser workflows and 72 static hosting cases; all 98 desktop/phone covers decode. [Evidence](LIBRARY_LOADING_CHECKS.json).
3. Pending: Investigate cp3-3/cp3-4/penta/cp-n3-godel solutions and richer register/coordinate/graph/tour contracts. Retain the three scoped negative finite-model results separately.
4. Pending: Resolve Windischer's actual travel surface, retain the v6 mapping deferral and audit source fidelity before removing WIP labels.
5. Pending: Complete proof usability, upstream additions/adoptions, remaining security/performance findings and the requirement-by-requirement final audit. The goal remains active.

Fresh residual execution plan after Library loading:

The preceding goal turn is progress: the replay/export race was fixed and the Wolf controls were verified. This turn completes Wolf production/static checks and the Library metadata/cover partition. Runtime and full dependency audits report zero known vulnerabilities; all 210 authored TypeScript files meet the available literal cyclomatic (<22), line-count (<1000) and explicit any/unknown limits. Eight unavailable analyzer metrics remain unmeasured.

1. In progress for replay publication and endpoint correction: `review-register-sources.py` follows first-match Haskell instructions and checks every requested outlet/crossing against the published atomic ports. The extended pass recovers cp3-3's complete 615,746-instruction computation (1,230,549 legal maze moves), ending at (0,0,W1). cp-n3 also has a complete computation from its current (0,1,W0), with 1,230,574 legal moves ending at (0,0,W1), contradicting its configured (0,1,W1). Verify the canonical atomic-origin start and correct that actual source/model mismatch before publication. Both stay within coordinate 27,000. The upstream compiler contains legacy offset commentary, while its newer atomic converter uses the origin; the legal port trace, rather than those comments, determines the finding. Neither run is a published replay yet. [Source evidence](REGISTER_SOURCE_REVIEW.json).
2. Pending: Recover and validate complete cp3-3/cp3-4 routes or checked compressed computation certificates. Preserve the supplied Pentation initial_a=4; its README's small initial_a=1 example is a different input and must not replace the shipped maze. A legal prefix or bounded failure is not a solution or impossibility proof.
3. Pending: Audit rule-only guide Play surfaces. Guide 3 has no artwork; Guide 6's old source placeholder has no bound traces/gates. The v6 image-mapping deferral remains explicit. Check the simple proof drawings too; schematic source art must not be confused with physical block movement. Complete the requested block gameplay where the actual model is known, while retaining original exports and source covers.
4. Pending: Resolve Windischer's travel surface and gate correspondence from source evidence; do not invent an infinite-center crossing.
5. Pending: Review exact register/coordinate/graph/tour position contracts and finish the original-request audit, proof usability, upstream accounting and remaining security/performance findings. Play still loads the full catalog; the small card index adds about 33 KB there until that separate seam is addressed. Library copy labels and remaining internal model terminology need the final UI/copy sweep. The goal remains active.


Register solution publication execution plan:

The preceding status turn is no progress. Revalidation confirms both recorded computations are terminal, not running jobs. cp3-3 retains 1,230,549 moves after exact-state loop removal; the canonical-origin cp-n3 computation retains 1,230,573 and legally halts at (0,0,W1). A translation-pattern probe encodes cp3-3 as 277 runs / 2,455 stored moves / about 37 KB, so a compact physical recording is practical without changing register movement rules.

1. Complete: Check both raw recovered routes against the production repeatedNeighbors implementation, reproducing the compiled example's incorrect finish. Correct catalog and regeneration endpoints to the newer atomic origin convention while retaining source provenance and WIP interpretation.
2. Complete: Add compact repeated-route snapshots recording translated patterns/counts. Production import must check every distinct boundary-rule case, reject illegal/unsafe/noncanonical runs, retain existing full-state contracts and support fast seek/trail without expanding millions of states. Protect these behaviors with meaningful malformed-import, differential and playback regressions.
3. Complete: Publish both source-guided solutions as lazy shared snapshots under their mazes, regenerate affected coverage/index/check artifacts and verify pause/seek/export/import on production/static builds. No computation prefix may be published as a complete route.
4. Pending: Continue actual cp3-4 and Pentation input investigation, rule-only guide block surfaces, Windischer mapping, richer model contracts, proof usability and the full original-request/security/upstream audit.


Fresh residual plan after register publication:

1. In progress for model/layout inventory: Supply physical block surfaces for rule-only path models, beginning with the eight-copy guide, six-copy v6 recurrence and two simple infinite examples. The source mapping for v6 remains deferred. The current authoritative sweep finds six rule-only variants: guide 2/3/4/6 and simple/nested infinite hop. None has bound traces or gates. Guide 2/4 contain helper paths and disputed source mappings; they need separate helper/endpoint reconciliation instead of borrowing a different maze's drawing. Existing portArtwork already supplies geometry for directed rules but assumes its replacement-helper shape. Audit that seam before generalizing it; actual legal witnesses and replay imports must prove any generated blocks retain the exact model. [Inventory](RULE_ONLY_PLAY_REVIEW.json).
2. Pending: Follow the supplied cp3-4 and Pentation source computations further with a bounded-memory trace; preserve Pentation initial_a=4. Recover real complete routes/certificates, not larger arbitrary BFS bounds or smaller inputs.
3. Pending: Resolve Windischer's actual travel surface and homologous gates without inventing an infinite-center jump; retain original views/covers and WIP source fidelity.
4. Pending: Review exact coordinate/register/graph/tour contracts and any ordinary-PDA claim, proof usability, upstream accounting and all original UI/visual/security requirements. Play's catalog partition and Library's remaining copy/model terminology are still open.

The top new residual has begun: RULE_ONLY_PLAY_REVIEW.json records each exact model's paths/copies/edges, zero bound traces/gates, helper IDs and source asset. The six-copy guide is a known recurrence with 24 edges, rather than a recovered v6 image layout. The existing generic-looking port corridor generator has port-specific helper assumptions; blindly reusing it for guide 2/4 would be an unverified substitution.


Register checkpoint verification: 410 unit tests / 38 files, 109 production browser workflows, lint, Pages/root builds and 80 mount/deep-link/refresh checks pass. All 76 shared snapshots fetch/import with unique complete IDs, covering 66 variants. Each recovered raw move and compact indexed position was independently compared in production before publication. Current authored TypeScript scope is 213 files, maximum classic cyclomatic 21, maximum source length 557 and zero explicit any/unknown types; the eight unavailable analyzer gates remain unmeasured. Both new exports stay below the 20 MB import limit, and pause, mid-run seek, backward/forward steps, final goal, saved import and selected-only requests have production evidence. The refreshed Library producer succeeded after an initial dev-context reload; the full snapshot checker likewise passed after that context's initial reload. No retry layer or weakened assertion was added. The full original goal remains active.

## October 12 source recovery and loading follow-up

- Complete: restore the omitted historical 1b31242 source/schema/tool/test files and supporting originals. 119 recovered files and all 221 inspected archival files match the commit exactly. Python 80 and browser-logic 28 historical tests pass; no old Svelte framework is installed into the active app. [Recovery and adoption review](HISTORICAL_WORK_REVIEW.md).
- Complete: selected-document Play/Solve loading. All 74 generated documents preserve canonical definitions and hydrated artwork. Concurrent loads coalesce while edits remain independent; failure is retryable. Production Play decoded JavaScript falls 79%, from 3.88 MB to 824 KB. Home's rendered preview is unchanged.
- Complete for cp3-4: exact supplied source halts after 20,256,567 instructions; every one of the 40,511,987 physical moves is checked against production. 587 compact runs store 5,185 moves. Production playback, pause, seek and export/import pass; the replay is published beneath its maze. Shared inventory is now 77 recordings across 67 variants.
- Complete: simple proof-example blocks have disjoint paths and exactly aligned parent/child boundary ports; original models and source data remain unchanged.
- Investigated: supplied Pentation initial_a=4 follows 20,538,770 legal moves in 10,000,000 instructions without halting inside that budget. Its source documentation describes the explosive register encoding. This is neither an impossibility proof nor a complete solution.
- Investigated: the Windischer archive supplies no authoritative missing topology. Travel-surface/center-rule clarification is pending; do not treat image annotations as a verified gate map.

Local full checks passed 432 units, 129 production browser workflows, 100 Pages/root deep-link checks and all 77 published imports. After the final proof-layout alignment, 26 affected units and 24 affected production browser workflows pass; lint, Pages build and measured TypeScript quality pass. The exact ordering and runtime boundaries are recorded in [continuation checks](CONTINUATION_CHECKS.json). Four other variants still lack verified solutions; three Windischer views are unbound. Items 7–12 retain their remaining scope, including richer-model/source-fidelity review and the final requirement audit.
