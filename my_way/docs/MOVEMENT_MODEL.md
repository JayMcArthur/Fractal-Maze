# Movement models

The maze's rules own legal movement. Block geometry locates the player and the
places where a transition happens; covers and original drawings are references.
Play, solving, proofs and recordings must preserve those rules.

## The PDA foundation

For a path maze, logical state is `PathState`: a connected path ID and a copy
address, ordered from the surface to the current copy. The path ID is the finite
control state; the address is the stack. `PathConnection` declares a directed move:

| Operation | Path | Stack |
| --- | --- | --- |
| `walk` | Move to the destination path | Unchanged |
| `enter` | Move to the destination path | Push the declared copy |
| `exit` | Move to the destination path | Pop only when the top matches the declared copy |

`core/pathMaze/traversal.ts` implements these transitions. One-way connections
stay one-way. Internal helper paths can combine primitive transitions into one
physical crossing. Some imports use a surface symbol to retain root identity;
`copyAddress` removes those internal symbols from the displayed maze depth.

`core/play/pathSession.ts` adds physical positions and walking history. A path
ID alone does not locate the dot within a corridor. Gates connect the geometry
to the logical transitions; returning to the same physical position trims a
loop. `usePathSession` owns the interactive session, animation and unfinished-run
guard. Saving records the logical route and physical witness together.

`core/play/compactBlockArtwork.ts` shortens long straight corridors for new path
runs and solver previews. Strictly increasing axis maps remove whole grid strips
while keeping feature levels distinct. Traces, gates, copy frames, view bounds
and endpoints move together. An axis reduction is rejected if it changes a gate's
direction or breaks an existing aligned copy port. The logical PDA is unchanged;
native grids and coordinate-based models keep their own dimensions. Newly saved
solutions retain the compact physical witness and `playArtwork`, separately from
the original maze snapshot. Existing recordings keep their recorded layout.

Keyboard-driven players share `useMovementKeyboard`: one immediate step, then
retries after 250 ms and every 120 ms while held. An animation may finish after
release; no further attempts are scheduled. Release, blur, hidden pages, editable
focus, dialogs, disabled play and unmount cancel the hold. Timers use the latest
movement callback so successive moves retain the current position and copy stack.

Square corridors retain their native grid for cell movement. `squarePlayPDA`
compiles connected corridors and uses a source PDA only after verifying its
correspondence to the grid. Play's store and Solve use that same binding. Hiding
an old drawing from the public selector must not remove its verified model
correspondence or its recordings.

## Infinite hops are an additional rule

An infinite copy hierarchy already fits the stack model: each ordinary move
still has a finite address. An **infinite hop** changes what counts as a legal
connection. Ordinary PDA transitions and finite-route search do not perform it.

`PathMazeDefinition.allowedRule` declares `finite`, `infiniteHop` or `cantorHop`.
`core/pathMaze/proofs.ts` checks finite witnesses, two repeating-word trails for
infinite hops, and joint hypotheses used strictly deeper for Cantor hops. The
supported hop rules require bidirectional ordinary connections. Saved lemmas
are rechecked in dependency order against the current topology.

`core/play/proofMovement.ts` makes only checked connections available in Play,
while requiring a physical approach and arrival when artwork is present. A
proof-assisted recording retains the claims and proof steps. It must not be
presented as a finite PDA solution. The notebook checks the supported certificates;
it does not decide every possible infinite derivation.

## Native families with additional state

| Definition | State that must be retained |
| --- | --- |
| `pathPushdown`, `infiniteRule` | Path, copy stack, and separately checked proof claims |
| `squareRecursive` | Grid position and copy stack, with a verified corridor PDA binding |
| `geometricRecursive`, `recursivePorts`, fixed `legacyWire` | Compiled path PDA and gate geometry |
| `blockRecursive` | Exact radix coordinates and recursive pattern occupancy |
| `repeatedDirected` | Terminal and two unbounded coordinates, including axis/origin rules |
| `recursiveTour` | Room/copy state, visited cells, dots, line counts and noncrossing constraints |
| `graphLabeled` | Explicit portal graph and declared directed connections |

The richer native families are not silently reduced to an ordinary single-stack
PDA. A conversion would need to preserve all their constraints and establish
equivalence first.

## Ownership and file contracts

- `app/library/compilePlayDocument.ts` owns the supported native-to-path
  conversions used by Play, Solve, Build and archived route adaptation. It
  returns other definitions unchanged and does not mutate the source document.
- `app/library/rulePlayDocument.ts` supplies missing corridor geometry for a
  rule-only model. It is a presentation step; it preserves the movement rules.
- `app/library/prepareReplay.ts` adapts recorded routes for playback. Export
  retains the original immutable snapshot, including its recorded layout.
- `.fmaze` stores the complete native document, artwork and proof notebook.
  [PDA JSON](PDA_FORMAT.md) stores the supported finite transition specification
  and declares the additional movement rule; it does not export checked claims.
  `.fmaze-solution.json` stores an independent maze snapshot and route evidence.

The solver route coordinates loading. `SolverMazePicker` owns library filters
and saved-project overlays; `SolveWorkspace` owns compilation and method choice
for the selected maze. Workers own searches and terminate on cancellation or
workspace unmount.
