# Fractal maze implementation plan

The October 9 inventory establishes the visual references and broken user flows.
Finish the existing application with faithful maze semantics and working browser
flows. Preserve the original reference programs and the user's staged changes.

## Implementation

- [x] Restore Orel corridor geometry, rim, start pads, gate fades, route lines,
  nested context colors, and readable recursive detail.
- [x] Animate the camera through entry/exit and nested gates; honor reduced motion.
- [x] Fit maze selection, maze, and movement controls in the first mobile viewport.
- [x] Persist the exact maze with each replay; verify save, reopen, scrub, and play.
- [x] Connect bundled mazes and saved projects to editor, preview, play, and reload.
- [x] Correct Koteitan black-cell substitution and make its pattern/depth view useful.
- [x] Replace lossy Amurielagi conversion with geometric path/gate semantics;
  support the full twelve-maze collection and preserve it through export.
- [x] Render actual graph connections and implement declared portal traversal.
- [x] Add directed repeated-maze documents, viewing, navigation, and bounded solving.
- [x] Keep player/solver/replay capability messages accurate for each representation.
- [x] Verify meaningful regressions, lint, build, and actual desktop/mobile flows.
- [x] Update documentation and capture the finished application.

## Boundaries

The application remains a static site with client-side persistence and workers.
Orel square, geometric gate, fractal block, and repeated directed-port rules have
separate definitions. Conceptual Cantor/infinite-rule mazes and general symbolic
PDA solving remain later research work, as specified in the inventory.

## Completion audit

Before completion, re-scan incomplete paths and unsupported claims, create a
fresh residual checklist, and execute it against source, tests, and browser
behavior. Passing unit tests alone do not establish finished user flows.

## Residual plan — October 9 implementation audit

The first implementation and six browser workflows pass. The new sweep found
stale documentation, import routing that lost documents on reload, an editor
loading error that silently created a new maze, and IDDFS conflating action depth
with recursive depth. Routing and solver fixes are implemented; execute these
remaining checks before completion:

- [x] Check normal-motion camera entry/exit and multi-level links in the browser,
  alongside the existing reduced-motion rim and inverse-frame tests.
- [x] Verify imported documents reopen by persistent URL, unknown editor/player
  URLs show explicit errors, and saved edits feed solver selection.
- [x] Run the built static application and both solver workers; replay the
  reference repeated route and solve/save/reopen the Orel Square solution.
- [x] Inspect the complete finished screenshot gallery on desktop and phone,
  including the original geometry references; check captures for browser errors.
- [x] Rewrite README and guide capabilities, label the PDA approximation, and
  distinguish historical inventory findings from current completed work.
- [x] Remove touched obsolete observer styles and verify exported native patterns
  use the edited document; retain only the original reference programs for block
  solving and the explicitly deferred infinite/symbolic work.
- [x] Run final lint, unit, browser, and build checks; record available checks
  and the absence of configured coverage/mutation/complexity analyzers honestly.


## Verified result

- 102 unit/contract tests pass across 11 files; ESLint and TypeScript/Vite build pass.
- 10 browser workflows pass against the production preview, including both solver
  workers, the 13-edge repeated route, and the 566-step Orel Square replay.
- Normal-motion two-level camera entry/exit and reduced-motion one-level entry/exit
  reach the correct context and rim. Repeated names within a finite nested link
  are valid; they do not imply a circular data structure.
- Imported geometric URLs survive reload; all twelve documents are saved and
  preserve source data on export. Saved catalogue edits are searchable and are
  loaded by the solver. Unknown editor URLs do not create replacement projects.
- Phone controls fit the initial viewport; the phone editor's SVG and canvas
  dimensions match. Pattern exports use the current edited definition and depth.
- Thirty finished screenshots exist and load, with zero recorded browser errors.
  Every bundled Orel and geometric maze is captured. Original reference programs,
  prior captures, staged image additions, and directory renames are preserved.
- The largest production JavaScript bundle is about 738 kB (175 kB gzip), largely
  including the geometric collection. Vite reports its standard size warning;
  this is recorded and does not prevent the static build or worker operation.

Configured verification consists of unit tests, ESLint, TypeScript, Vite, and the
new behavioral browser suite. No configured analyzers are available for cyclomatic
complexity, cognitive complexity, Halstead Difficulty, CRAP, coverage percentages
(statements/branches/functions/lines), surviving mutants, automated dead-code
counts, or duplication counts. Those metrics remain unmeasured; no proxy results,
exclusions, suppressions, or meaningless metric tests were added. Touched source
was manually reviewed for unused paths and old heuristics; obsolete observer UI,
lossy graph conversion, and unused trail/visited-map branches were removed.

The residual plan is complete. Remaining limitations are the explicit boundaries:
block navigation/solving and geometric editing use the original programs;
infinite-rule execution and faithful general symbolic/PDA solving are deferred.
The experimental PDA download is clearly labeled. No deployment or git commit was
requested or performed.


## Follow-up review

The subsequent UI, replay, builder and complete-source review is recorded in
[REVIEW_PLAN.md](REVIEW_PLAN.md). Current verification is 118 unit tests and
19 production browser workflows; the catalogue has 34 entries plus 41 reference
assets. [New screenshots](screenshots/review/index.html) show the reviewed result.
Earlier numbers above describe the initial implementation checkpoint.
