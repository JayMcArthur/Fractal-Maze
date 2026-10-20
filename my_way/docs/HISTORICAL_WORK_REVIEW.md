# Work recovered from commit 1b31242

Commit `1b3124221e3085a00b8d7144ac363d8da2a15ef7`, **Add browser workbench and package export** (May 25, 2026), contained working source that the comparison snapshot had omitted. Its 102 retained package/document files matched the commit. Another 68 browser/core/schema/test/tool files were missing.

Those 68 files and 51 supporting files are now restored under `upstream_sources/JayMcArthur-Fractal-Maze`: **119 restored files**, including the original images needed by its validation tests. All **221 inspected archived files** match the commit byte for byte. Existing files were preserved. The React app stays the active implementation. The archived Python and Svelte programs are reference implementations; restoring them does not add their dependencies to the app or expose another player.

[Exact inventory and check scope](HISTORICAL_WORK_REVIEW.json).

| Capability in the old commit | Current app | Recovery decision |
| --- | --- | --- |
| Separate source packages, logic, visual mappings and optional solutions | Canonical maze documents, immutable selected artwork and separately loaded shared recordings | Original schemas, compiler and package tools are restored for review; current documents remain authoritative. |
| Port/address traversal with directed context changes | Path/PDA movement, physical block/source sessions; native port definitions compile to that model | Archived runtime and tests retained as a comparison oracle. Multi-symbol address rewrites must preserve their full guards before any future import. |
| Structured workbench and arrow entry such as `p1 → A.p2` | Build labels paths, copies, directed transitions and endpoints through forms | Old editor/parser/tests retained. The current Build workspace now has atomic batch entry for one-copy directed lines (`1 -> A.2`, `A.2 -> 3`) and explicit two-way arrows. Unsupported multi-copy guards are rejected rather than discarded. |
| Browser-package JSON and source-package YAML export | Lossless `.fmaze`, original-format exports and round-trip PDA JSON | Current `path-pda/1` exports now import with guarded transitions, names and endpoints preserved. Ordinary path operations are checked against the entire exported stack-guard family before accepting them. Old emitters restored. The active importer does not accept `fmaze-browser-v0` or source-package YAML. No silently lossy conversion was added. |
| Playback and solution YAML | Play has maze-local shared/saved replay selection, distance-based physical playback, pause, seek and immutable export | Original recordings/emitters restored; the current physical replay format remains active. |
| Infinite/Cantor proof body checking | Manual setup trails, arbitrary repeating words, checked lemmas and joint Cantor obligations | Do not copy old `status: proved` flags into active movement. The archived checker accepts an assumption solely because its addresses share a context; it does not establish that the assumption matches a permitted recursive claim. |
| Fractal-block visualization and repeated-tile logic | Exact recursive block navigation plus directed repeated-register movement/replay | Old implementations and tests retained. Richer coordinate/register constraints must not be weakened to ordinary PDA rules. |
| Pages deployment workflow | Active workflow builds `my_way` and deploys its static output | Archived Svelte workflow restored for reference. The active workflow already targets the current app. |

Berkly and Windischer's old packages are reference-only. They do not supply the missing authoritative gate table or a new solution. Previously saved Wolfram, Skeptic's Play and proof-example package solutions remain available for comparison; the package snapshot already contained them before this recovery.

The original Python suite passes **80 tests**. The original browser logic/editor/replay suite passes **28 tests across six files** against unchanged source and fixtures in a temporary copy. Only that temporary copy's TypeScript configuration was adjusted to run without installing the old Svelte dependency tree. The old Svelte UI itself was not rebuilt or claimed browser-tested.

## Python review and TypeScript adoption

The active application remains a static React/TypeScript browser app. It does not invoke a Python service. Python sources are retained as archival examples and existing offline investigation tools, outside the deployed browser runtime.

| Recovered Python idea | Decision in the current app |
| --- | --- |
| Explicit source/target addresses and one-way connections (`logic_core.py`, `port_graph.py`) | Adopted in the Build text-entry workflow. One copy boundary per line preserves the exact enter/pop/walk model. `↔` explicitly requests a reverse edge; `→` never does. Duplicate input labels keep distinct transition identities. The ordinary dropdown form now also preserves IDs containing hyphens. |
| Validated package interchange (`browser_export.py`, `package_validation.py`) | Applied to the current PDA JSON format. Export/import preserves all 52 current catalog/compiled path models' connection IDs, directions, inputs, copies, surface symbols and endpoints. Named exports retain their title. Malformed alphabets, changed/duplicate/missing guards, compound stack rules and unknown addresses reject before play. Earlier exports remain readable with explicitly reconstructed provenance. |
| Bounded BFS plus distinct result statuses (`solver.py`) | Keep the existing worker searches and balanced PDA closure. The old BFS supplies no new unbounded reachability algorithm. Search limits remain different from negative finite-model results and checked proofs. |
| Recursive block carry / boundary entry (`fractal_block.py`) | Retain as a comparison reference. Current radix coordinates already carry across arbitrarily deep copies and retain actual physical location. Do not replace live movement with a finite solver's boundary-entry enumeration. |
| Repeated terminal classes (`tiled_port_graph.py`) | Keep current exact shared-terminal and atomic boundary semantics. The refreshed upstream's origin-only zero rules and internal terminals are already represented; the old layer does not replace them. |
| Level/BFS graph arrangement (`graph_layout.py`) | Useful for inspecting an abstract graph, but its placement ignores copy contexts. It is not used to infer physical maze corridors or expose a port-style player. |
| Predeclared proved/assumed edges (`logic_core.py`) | Not adopted as permissions to move. Current user-built certificates and imported replay claims must pass the current checker. PDA-only import has no saved proof claims; `.fmaze` remains the export for artwork and proof notebooks. |
| Source-package YAML, CLI and static Python visualizer | Retained for comparison. Current browser import/export, maze-local replays and static deployment cover their essential workflow without a Python runtime. Old `fmaze-browser-v0`/YAML imports remain unsupported. |

Text batches report the first invalid line and make no partial changes. They accept existing path IDs or unique labels, preserve evidence, and mark the edited model WIP. Both prefixed endpoints and multi-copy addresses are deliberately rejected: they require a guarded compound transition, which cannot be represented by silently dropping prefixes.
