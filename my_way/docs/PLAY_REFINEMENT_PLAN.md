# Play refinement — October 10, 2026

1. Complete: Reproduce long source replay timing, helper-state marker loss, false junction stops, Snuke 3 movement and source/native endpoint mismatches with focused tests and production captures.
2. Complete: Remove blocked/backtrack counters and wall feedback at their producers and UI callers. Preserve legitimate replay data contracts.
3. Complete: Make source walking distinguish bends, forks and gates; make pointer gate moves single actions; preserve marker/geometry through PDA helper transitions; use distance-based animation and matching replay scheduling.
4. Complete: Align source/session controls with block Play; condense copy addresses, move gate choices beside arrows, and show the current location inside the parent copy.
5. Complete: Protect unfinished runs before navigation/view/replay changes or closing the page. Completed runs and playback remain ordinary navigation.
6. Complete: Check Skeptic Play 2 and Wolfram 0 endpoints against source models; unify verified wire/PDA views; retire the mismatched SP2 grid from its family; reduce W1/W2 choices; show W0’s existing finish. Replace bundled port graph presentations with PDA-backed corridor Play. The later port cutover also compiles imported stack replacement and root changes into the same PDA; see COMPLETE_MAZES_PLAN.md.
7. Complete: Validate actual movement, replay timing, navigation confirmation, topology and phone/desktop layouts; update notes and perform a fresh residual sweep.

## Latest steering: playable geometry and depth

8. Complete: Omeometo touch-to-keyboard movement and cell-relative marker scaling. Open the verified depth-five expansion with the local camera; retain explicit finite-expansion semantics and source references.
9. Complete: Reproduce the identified Skeptic Play 1 SVG mismatch with a frozen animation clock. Bind its depth/path readout to the displayed marker and verify nested entry and exit (0 → 1 → 2 → 1 → 0). Fix Sierpinski's additional compound-crossing/helper stop and physical undo separately.
10. Complete: Verify one-way connections remain directed and gameplay describes movement rather than teaching PDA input tokens. Retain model import/export in Build and analysis.
11. Complete: Complete the proof UI checks in PROOF_UI_PLAN.md, refresh actual screenshots/docs and execute a fresh residual sweep of these changes.

## Fresh residual plan for this correction pass

1. Complete: Verify live and replay marker/camera behavior on desktop and phone; capture the Skeptic Play 1 SVG after two nested entries and Omeometo with its whole-maze inset.
2. Complete: Validate a newly recorded compound crossing exports both underlying transitions and imports with the same depth/address; confirm undo hides intermediate bookkeeping states.
3. Complete: Run lint, production build, complete unit/browser checks and finish the proof plan's remaining phone-export check.

Continue the earlier Play requests in items 1–7 after the verified proof/Omeometo/Skeptic Play corrections.

12. Complete: Visually confirm the black bands on Inner Frame’s gate joins come from gate gradients; draw flat corridor extensions without changing geometry or movement.

## Fresh residual plan — final Play pass

1. Complete: Fix the Pages redirect startup ordering exposed by the production workflow; rerun the actual deep-link browser case and root/Pages hosting checks.
2. Complete: Verify source replay pause and seek preserve the displayed position and timing rather than finishing a long motion while paused.
3. Complete: Refresh all bound-source gate/undo checks for the condensed HUD and compound crossings; confirm every tested marker remains on its active trace and in the visible copy.
4. Complete: Confirm edited/imported Snuke rules cannot reuse the bundled source PDA; review the new corridor presentation and parent dot on desktop/phone.
5. Complete: Refresh check artifacts, solution/topology inventories, screenshots and current product notes; document mathematical/WIP limits precisely.

6. Complete: Correct the Wolfram 1 annotated scan crop using all four transformed corners; the source sweep now checks each live marker on its active trace and inside its view.
7. Complete: Reduce renderer/proof component complexity without changing output; compare four production canvas PNGs byte-for-byte and rerun proof revision, movement/camera and static-host flows.

Remaining interpretation limits: corridor rendering preserves source traces and junction rules; it is not an authored orthogonal grid remake. Omeometo remains a selected finite expansion. Native imported port rules that replace a stack symbol or change the root copy retain their exact native engine. Windischer's limit-crossing interpretation and the eleven unresolved solution variants remain WIP. The unspecific “center X” report was not independently reproduced; the confirmed compound helper stop is fixed and all 28 bound-source first gate/undo markers pass their geometry checks.

## Residual replay discoverability

1. Complete: Reproduce the disappearance of original Wolfram solutions after narrowing the view selector. Keep earlier same-maze recording snapshots in the maze's replay bar independently of its current presentation choices; do not associate Skeptic Play 2 with the unrelated retired grid.
2. Complete: Verify original playback from the photograph's bar, native saved/replay contracts and the two-choice Wolfram selector; rerun affected browser, lint/build and scope checks, then refresh evidence.

Final evidence: 236 unit tests in 30 files and 71 production browser workflows pass; 16 focused proof, movement, camera and phone workflows also pass after the final refactor. Lint and both production builds pass. All 28 source players / 6,378 drawn routes, all 70 shared replay IDs / 59 native round-trips, 20 Pages/root direct-link and refresh checks, and 12 latest desktop/phone captures pass. Four canvas PNGs are byte-for-byte identical across the renderer extraction. Scoped maximum cyclomatic complexity is 21, maximum authored file size is 606 lines, and explicit any/unknown counts are zero. Runtime dependency audit reports zero vulnerabilities. Unavailable analyzers remain explicitly unmeasured in UNIFIED_PLAY_CHECKS.json.

The first replay-discovery regression reproduced 0 original wire options instead of 11. Filtering by current view choices was the cause: the replay bar now includes earlier same-maze snapshots independently of that selector. The unrelated Sierpinski grid stays accessible as its own maze rather than appearing as Skeptic Play 2. A catalog contract checks all 70 bundles are reachable from the 49 Library entries.

Replay residual evidence: 236 unit tests and 71 full production browser workflows pass; default/root builds and lint pass. All 70 bundles are reachable from the 49 Library entries, including original wire solutions and older snapshots. The static-host follow-up passes all 20 direct-link/refresh checks. The expanded audit covers 65 TypeScript files plus CSS: maximum cyclomatic complexity 21, maximum file size 606, and no explicit any/unknown types. A final scan found no open in-scope implementation item; interpretation and finite-expansion limits remain documented above.
