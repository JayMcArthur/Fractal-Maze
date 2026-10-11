# Shared solution coverage — October 11, 2026

The app has **74 document variants in 49 author-grouped maze families**. **76 complete shared replays cover 66 variants**, including eleven named Wolf solutions converted to physical PDA snapshots. Five variants use checked infinite/Cantor proof certificates. Shared solutions are visible by default; opening one does not overwrite a project or populate its empty proof notebook.

The earlier publication checkpoint reconstructed and re-imported **63/63** native snapshots. The Wolf cutover checks all eleven additional routes in both source and block geometry: **22/22** complete snapshots import. The original strings are checked against the actual native controller before conversion. All 76 IDs remain unique and complete. [Wolf model review](WOLF_WIRE_MODEL_REVIEW.json), [published round-trip results](SHARED_REPLAY_CHECKS.json), [exhaustive per-variant inventory](../src/data/manifests/solution-coverage.json).

The catalog retains 31 generated solution fixtures after removing ten redundant geometric remake defaults. Balanced PDA closure recovers path, geometric and corridor witnesses missed by bounded walking; every restored native move is checked before publication. Generated proof solutions include First Cantor, Infinite Descent, Simple Cantor, Simple Infinite Hop and Nested Infinite Lemma. First Cantor opens at permitted outer gate 6 and has a checked four-connection joint Cantor certificate. Each obligation has its own descendant witness; unused obligations are removed. This proves a solution under the declared topology/rule, not source conversion completeness. Setup/repeating-word construction, scope containment, distinct tails, checked-claim composition and complete joint Cantor obligations have regression tests.

Koteitan’s original rules allow bottom-edge entry and top-edge exit. The 3×3 and 5×5 catalog patterns now choose white base cells on those edges for Play. Checked exact-coordinate solutions use 9 moves at detail 2 and 3,979 moves at detail 5, respectively. This chooses permitted entries/exits; it does not change the substitution or assert every edge point is connected.

The cp3-3 and regenerated three-register compiler examples now have complete source-guided recordings: **1,230,549** and **1,230,573** physical moves. Both run from (0,0,W0) to (0,0,W1), within coordinate 27,000. Every recovered move and compact playback position is checked against production; each embedded snapshot is about 63–64 KB. The compiled example's former (0,1) endpoints contradicted the current atomic converter and are corrected. These recordings use the existing register movement rules, not a claimed ordinary-PDA conversion. [Source/production checks](REGISTER_SOLUTION_CHECKS.json).

## Variants without a recovered solution

**5 other variants** remain without a verified replay; **three Windischer views** remain unbound pending their exact gate topology and limit-crossing rule. A bounded search or missing certificate is not a proof of impossibility. Source conversions remain WIP even when their declared model has a checked solution.

| Variant | Result | Search/model limit |
| --- | --- | --- |
| Block Maze (`block-maze`) | no-finite-route in current rules | An independently checked closed balanced relation excludes the surface trophy. All 766 legal native moves across root/every child context agree with the compiled PDA; links have one copy symbol. This does not infer a missing infinite-hop rule or change the source endpoints. |
| Easy - Noke Lieu (`1611103791037:0.9096318422296219`) | no-finite-route in current rules | The production canonical PDA closure and an independently checked closed balanced relation both exclude the surface finish without a recursion-depth cutoff. This concerns the current corridor/finish definition, not a claim about undocumented author rules. |
| Counter pump — cp3-4 (atomic) (`repeated-atomic-cp3-4`) | bounded | Repeated BFS: coordinate 65536, 1500000 states. |
| Pentation maze (`repeated-atomic-penta`) | bounded | Repeated BFS: coordinate 65536, 1500000 states. |
| Windischer (`draft-maze-images-martin-windischer-windischer-gif`) | unbound | Exact gate topology and limit-crossing interpretation remain unresolved. |
| Windischer (`draft-maze-images-martin-windischer-windischer-png`) | unbound | Exact gate topology and limit-crossing interpretation remain unresolved. |
| Windischer Recursion (`draft-maze-images-martin-windischer-windischer-recursion-jpg`) | unbound | Exact gate topology and limit-crossing interpretation remain unresolved. |
| Berkly (`draft-maze-images-mike-earnest-berkly-jpg`) | no-finite-route in current transcription | An independently checked closed balanced relation excludes the surface finish; all 64 gate anchors belong to their named traces. Original crossing/author rules remain WIP. |

## Reproduce the search

With the development server running at `http://127.0.0.1:5174/Fractal-Maze/`, run these scripts from `my_way` in order:

```bash
python scripts/prepare-register-solutions.py
python scripts/prepare-catalog-solutions.py
python scripts/prepare-square-solutions.py
python scripts/prepare-generalized-proofs.py
python scripts/prepare-block-solutions.py
python scripts/prepare-shared-replays.py
python scripts/check-shared-replays.py
```

The catalog/proof passes use Python Playwright and NetworkX. The block recovery pass additionally uses NumPy and the dev server on port 5174; it searches offline through grid width 3125 and checks exact-coordinate replays in the app, without raising the live finite-grid limit. The corridor pass uses the production TypeScript PDA compiler, balanced search, grid expansion and replay validator through Playwright. Install their browser with `python -m playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an existing Chromium binary. The first generates the base fixture/coverage files; the following passes add corridor witnesses and attempt proof certificates. Cantor generation refines presumed surface path classes and checks the required joint obligations. Matched-descent infinite-hop search uses a finite graph of ordered path pairs to recover setup trails and productive repeating cycles; it has no arbitrary period/depth cutoff. This search does not cover every possible generalized infinite certificate. To recover only First Cantor, use `python scripts/prepare-generalized-proofs.py --maze proof-maze-images-siggy-first-cantor-svg`. Regeneration can take several minutes. These certificate searches do not assert all mazes are decidable. No unchecked or empty candidate route is published.

The current proof checker accepts finite certificates under the selected infinite-hop or joint Cantor-hop rules. It is not a complete decision procedure for arbitrary infinite derivations. First Cantor now has a checked source-model certificate from permitted gate 6. Infinite Descent has a checked certificate: both trails enter A twice, then repeat B C A C B C B C A C B C. The old period-limited search missed this twelve-copy repetition. Its source extractor also omitted a visible cyan branch because that open path had a fill; visible strokes are now included regardless of fill. Both certificates can be built with notebook controls, and the original notebooks stay empty. Berkly follows colored wires as clarified; retaining each wire at crossings remains a WIP interpretation. Its current finite transcription has a checked negative result, not an original-author impossibility proof. Easy–Noke Lieu also has no finite surface witness in its current gate model. Windischer's center crossing is not invented.

The v8 surface trophy now registers a win when returning from a copy. Its recovered witness has 510 PDA transitions and 3,540 native moves. Shared solutions are selected beneath the maze in Play; [current UI and checks](UNIFIED_PLAY.md).

The [Block Maze rule review](BLOCK_MAZE_SOURCE_REVIEW.json) records its 11 PDA states, 58 connections, full closed relation and native movement correspondence. Reproduce with `python scripts/review-block-maze.py` using Vite on port 5174 and the configured Playwright browser. This is a negative result for the current finite-only source definition, not a fabricated solution or a claim about undocumented author rules. The shipped inventory and its balanced corridor producer now retain this classification across regeneration.

Geometric fixture generation now uses the same production compiler and balanced search as Play/Solve, then validates its witness against the archived native gate contract. Regenerate just those records without changing other fixtures using `python scripts/prepare-catalog-solutions.py --type geometricRecursive`. Original drawings and all archived formats remain available.

The [Berkly model review](BERKLY_MODEL_REVIEW.json) checks an independent closed balanced relation and every declared gate anchor against its assigned trace. Reproduce with `python scripts/review-berkly.py`. The published inventory retains this scoped negative classification. `prepare-catalog-solutions.py --maze draft-maze-images-mike-earnest-berkly-jpg` regenerates only that coverage record, preserving all other fixtures. Provided solutions are discovered from current source definitions, independently of the generated replay index.

Shared solution publication emits one validated asset per recording and a metadata manifest. Run `prepare-shared-replays.py` after the source/solution passes; `check-shared-replays.py` fetches and imports all 76 published snapshots. The eleven Wolf recordings use the shared block player with the photograph retained in their maze snapshots. Current source/snapshot equality tests cover all recordings, including compiled Wolf definitions and explicit proof claims. Asset filenames include the payload hash so regenerated recordings receive new URLs. [Earlier loading verification](REPLAY_LOADING_CHECKS.json).
