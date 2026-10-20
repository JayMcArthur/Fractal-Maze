# Upstream program refresh

Fresh read-only checkouts were compared with the installed programs on October 9–10, 2026. Exact repository URLs, commit IDs and dates are recorded in [the snapshot manifest](../../upstream_sources/manifest.json). Original local files and user changes are preserved.

| Repository | Result and integration |
| --- | --- |
| amurielagi/fractal-maze | Current installed code already matches the fresh source after line-ending normalization. Its twelve-maze import format and original fields remain supported. Defaults now keep the two unique puzzles; source drawings and corridor remakes replace ten redundant geometric views. |
| koteitan/fractalblockmaze | Installed code matches the January 2026 revision. Native pattern editing and the original solver remain available. |
| sparecycles/fractal-maze | No newer upstream features. Local lexical-scope and responsive-player fixes are retained. Eleven source solution strings were checked in the original player; all finish at the surface without removable decision-node detours. |
| orelcosseron/fractal-maze | Installed code matches the January 2026 revision. Nine corridor definitions remain imported. |
| orelcosseron/Fractal-Maze-Python | No newer upstream features. Local tile and maze adaptations are user work and were preserved. |
| koteitan/fractal-maze-solver | Installed code matches the February 2025 source. Exact port transitions and the known route remain integrated. |
| koteitan/repeated-maze | Substantial October 2026 update: distinct atomic W/E/N/S/C terminals, explicit boundary crossings, origin-only zero rules and directed/bidirectional text syntax. Integrated all eleven `.maze` examples and eight independently generated legal solution routes. |
| Techtress/Alice-and-the-Fractal-Hedge-Maze-Solver | Fetched the missing source program as a separate snapshot for comparison. Alice’s native/source movement is already integrated; no separate player framework was added. |
| CruiserOne/Daedalus | The separately linked desktop tool points to its author’s GitHub source. Fresh Daedalus 3.5 snapshot: November 2024, `32af46d`. Recursive wire generation and homologous-pin connectivity checks inspected; source/license preserved. Windows UI not executed or ported. |
| JayMcArthur/Fractal-Maze | Fetched the newer May 2026 workbench’s packages and docs. Its logic/visual binding and proof-flow notes informed the source/view review. Its Berkly and Windischer packages are also reference-only; they do not supply missing authoritative transitions. |

## Repeated maze additions

The app imports counter-pump cp2-3/4/5/6, cp3-2/3/4, Minsky doubling md3/4/5 and penta. Eight have checked bundled routes. cp3-3, cp3-4 and penta exceeded the independent 300,000-state search budget; no empty route or invented solution is published.

A twelfth experimental entry is regenerated from the three-register counter-pump source using current `nd-to-2d` and `hs2maze`. All normal/nx/ny/zero sections are present. Its source compiler fixes start/finish at `(0,1,W0)` / `(0,1,W1)`. A 300,000-state search finds no witness within its budget, so no empty or guessed solution is bundled.

Atomic terminal rules keep opposite sides as distinct states. Crossing a block boundary is an action. Center terminals stay inside their block. The old three-section shared-terminal format remains its existing documented representation; the explicit fourth zero section identifies the newer atomic format.

Large connection maps use batched SVG paths. Penta opens with available connections to avoid constructing hundreds of thousands of SVG nodes; Show full connection map displays its complete local map on request. The original updated browser editor, eleven maze preset files and its five required Lee scripts are copied under `public/programs/repeated-maze` and linked from Guide.

The independent source solver validated routes, including cp3-2’s 32,783 moves. Replay detour normalization is linear in route length. The source conversion script is [prepare-upstream-repeated.py](../scripts/prepare-upstream-repeated.py).

## Proof and research material

The repeated-maze snapshot includes Minsky-machine constructions, Lee-algorithm tools and Lean sources. Those are available research artifacts, separate from the app’s manual proof notebook. The Lean project has not been built or its theorems independently checked in this environment.

The continuation review also found [Bouillaguet and Cosseron’s MIDTERM paper](https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.FUN.2026.9), published May 15, 2026. It gives a finite reachability algorithm for recursive wire mazes and represents topology through wires and corresponding copy ports. Guide links to this primary source. Its algorithm is not ported; current bounded search and manually checked infinite/Cantor witnesses keep their stated semantics.

Snapshots for repeated-maze, the Techtress solver, Daedalus and Jay’s package/docs live under `upstream_sources`. The other fresh checkouts are comparison sources under `/tmp/fractal-maze-upstreams`; their commit records persist in the manifest. No local original program was reset or merged.

[Updated original editor and upstream workbench captures](screenshots/flows/index.html) show the refreshed interfaces alongside the app’s current product flows.

The root README’s non-Git program link and three maze-backlog links are checked in [README_BACKLOG.md](README_BACKLOG.md). Backlot adds a real constrained player and optional tour; Omeometo’s existing pattern now has finite navigation/search/replay and correct source attribution.

The committed `nd-to-2d` example `3dcp.maze` contains only normal rules. Rather than filling missing sections by hand, the refreshed compiler pipeline regenerates a complete port document from `cp_n3.hs`. The compiled entry is labeled WIP and retains the source’s canonical initial/final registers.
