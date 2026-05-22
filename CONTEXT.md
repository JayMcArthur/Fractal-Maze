# Fractal Maze Lab

This context describes the domain language for a workbench used to view, play, edit, and understand fractal mazes.

## Language

**Fractal Maze Lab**:
A workbench for exploring fractal mazes through viewing, playing, editing, validation, solving, and explanation. It is broader than a player because it includes authoring and understanding tools.
_Avoid_: Game, player, theory lab

**Fractal Maze**:
A maze whose navigable structure can include recursive or self-similar regions, where entering or exiting a region changes the current nesting context.
_Avoid_: Recursive game level, nested picture

**Workbench**:
The combined user experience for viewing, playing, editing, and understanding a maze. A workbench includes player-facing flows and expert tools without treating either as a separate product.
_Avoid_: App mode, standalone tool

**Implementation Slice**:
A deliverable increment that proves one useful path through the Fractal Maze Lab, from maze data through user-facing behavior. A slice may be narrow, but it should connect enough parts of the system to validate the design.
_Avoid_: Phase, component batch

**Maze Package**:
The complete distributable description of one maze, including metadata and references to source logic, visual mapping, generated runtime data, and optional solutions. A package keeps archival identity separate from any one file format.
_Avoid_: Maze file, level file

**Source Package**:
A human-authored Maze Package manifest written for review, editing, fixtures, and long-term maintenance. A Source Package identifies the maze and references package-adjacent logic, visual mapping, solution record, generated artifact, and provenance files. Source packages prefer readable structured text such as YAML.
_Avoid_: Runtime bundle, browser artifact

**Package Manifest**:
The top-level file that gives a Maze Package its identity and references its related logic, visual mapping, solution record, generated artifact, and provenance files. A package manifest keeps each file type independently versionable.
_Avoid_: Inline package, monolithic maze file

**Primary Authoring Representation**:
The representation inside a Source Package that users are expected to edit as the source of truth for a maze. A Source Package may preserve several authored or imported representations, but one must be declared primary so generated logic, validation, and editor behavior have a clear authority.
_Avoid_: Generated graph, runtime view, default tab

**Browser Package**:
A generated Maze Package artifact optimized for static browser loading. Browser packages prefer JSON and may include normalized or compiled runtime data derived from a Source Package.
_Avoid_: Source package, hand-authored file

**Solution Record**:
A referenced file that records one solution, replay, or proof path for a Maze Package. Solution records are logical-first: their authoritative steps are logic transitions, with optional visual checkpoints for playback or explanation. Solution records are separate from the Source Package by default so alternate solutions, generated solver output, and proof explanations can be edited and tested independently.
_Avoid_: Inline solution, path string

**Visual Checkpoint**:
An optional playback marker inside a Solution Record that helps animate or explain a logical step without becoming a logical transition. Visual checkpoints can preserve important intermediate visual positions while keeping solver output logical-first.
_Avoid_: Transition, decision point

**Source Maze**:
The canonical human-authored logical definition of a maze. For the first implementation slice, the source maze is graph-based YAML rather than the old grid format.
_Avoid_: PDA, visual file, legacy maze

**Legacy Maze**:
An old grid-format maze that mixed tile paths, recursive blocks, links, exits, colors, and rendering metadata. Legacy maze data has been normalized into package logic and is not the canonical authoring format.
_Avoid_: Source maze

**Logical Object**:
A named maze element that participates in movement or nesting, such as a state, edge, region, block, exit, portal, or link. Visual drawing creates or edits logical objects rather than defining gameplay directly.
_Avoid_: Shape, drawing, pixel

**Editor Surface**:
The authoring experience for changing a maze through drawing, structured forms, text-like logical descriptions, and advanced PDA inspection. The editor surface is multi-representation because fractal maze behavior can be too precise for drawing alone.
_Avoid_: Drawing tool, PDA editor

**Image Overlay**:
A visual reference image with logical objects placed on top of it. An image overlay can guide tracing and presentation, but it does not determine legal movement.
_Avoid_: Image maze, gameplay image

**Authored Vector View**:
A vector visual representation of a maze whose paths, shapes, labels, and regions can be linked to logical objects for crisp rendering, highlighting, and playback. An Authored Vector View may replace or accompany an Image Overlay, but it does not define legal movement by itself.
_Avoid_: Hand drawing, SVG logic, vector maze

**Generated View**:
A visual representation produced from structured maze data, such as a grid, block pattern, repeated tile system, or normalized graph. A Generated View can be useful for consistent rendering and editor feedback, but it remains separate from the logical rules it presents.
_Avoid_: Runtime view, source logic, auto maze

**Visual Mapping**:
A package-adjacent file that maps logical objects to visual assets, anchors, geometry, labels, and playback presentation. Visual mappings are separate from Source Packages because the graphics layer must not become the source of maze logic.
_Avoid_: Source logic, maze rules, inline graphics

**Visual View**:
One presentation of a maze inside a Visual Mapping, such as an Image Overlay, Authored Vector View, or generated presentation. A Maze Package may have multiple Visual Views for the same logic, with one preferred for default playback.
_Avoid_: Mode, renderer, screen

**Traversal**:
A user-facing movement from one meaningful decision point to another. A traversal may pass through intermediate visual positions without exposing each one as a separate player choice.
_Avoid_: Move, animation frame

**Transition**:
A logic-level change in maze state caused by an input symbol. A transition is the core movement primitive for validation, runtime, solving, and PDA compilation.
_Avoid_: Step, path drawing

**Port**:
A specific logical endpoint or side of a decision point where a transition can begin or end. Ports distinguish maze facts that share the same visible path label but have different recursion behavior.
_Avoid_: Path number, visual endpoint

**Terminal**:
A boundary port of a maze or submaze used to enter, exit, or connect recursive structure. Terminals are the formal version of entrances and exits.
_Avoid_: Door, tile edge

**Decision Point**:
A location where the player, solver, or explanation flow has a meaningful choice about what to do next. Long corridors and forced path segments may be represented visually without becoming decision points.
_Avoid_: Tile, pixel coordinate

**Point ID**:
The stable canonical identifier for a decision point or logical point inside maze logic. Point IDs are used by packages, validation, solving, and runtime state; visual labels are display text and must not be treated as canonical identity.
_Avoid_: Label, path number

**Visual Label**:
Display text shown on an image, graph, grid, or editor surface. A visual label may match puzzle notation, but it is not the canonical logical identity of a point or transition.
_Avoid_: Point ID, logical state

**Visual Position**:
The player's displayed location in a rendered maze view. A visual position may change many times during a traversal without changing the logical state.
_Avoid_: State, PDA state

**Visual Route Segment**:
A reusable piece of drawn path geometry inside a Visual View. A Visual Route Segment can be shared by several visual routes and does not imply a logical choice by itself.
_Avoid_: Transition, decision point, edge

**Visual Route**:
An ordered visual path through one or more Visual Route Segments used to highlight, animate, or explain a logical transition or transition group. A Visual Route references logic; it does not make movement legal by itself.
_Avoid_: Transition, solution step, path rule

**Visited Route**:
The visual route history already taken in a play or replay session. A Visited Route is derived from logical transition history and can be extended, undone, or branched without becoming the source of movement rules.
_Avoid_: Solution, runtime state, path rule

**Route Preview**:
A temporary visual highlight of a possible next Visual Route before committing the corresponding logical transition. Route previews help inspect available actions without changing logical runtime state.
_Avoid_: Traversal, transition, visited route

**Activation Point**:
A visual position or logical object that triggers a transition when reached or selected. Activation points connect visual navigation to the underlying maze logic.
_Avoid_: Button, collision point

**Visual Navigation State**:
The temporary display-side state of a play session, including current view, visual position, selected path segment, and animation progress. Visual navigation state can change without changing the logical runtime state.
_Avoid_: Runtime state

**Logical Runtime State**:
The play-session state used by validation, solving, and PDA execution, including the current decision point or PDA state, stack, history, and goal status. Logical runtime state only changes through validated transitions.
_Avoid_: Visual state, screen position

**Address Graph**:
A source-logic representation where locations are written as submaze-addressed decision points, such as `1`, `A.2`, or `B.B.A.1`. Address graphs are the preferred human and editor representation for recursive maze logic.
_Avoid_: Raw PDA

**Symbolic Address**:
A structured location in maze logic that may include a decision point, nested submaze path, coordinates, depth, or symbolic parameters. Symbolic addresses generalize stack addresses so non-nested fractal structures can also be represented.
_Avoid_: Screen coordinate, raw state

**Proof Rule**:
A symbolic rule that justifies a high-level transition which cannot be represented as a finite sequence of ordinary physical transitions, such as an infinite descent or Cantor-style hop.
_Avoid_: PDA transition, shortcut

**Physical Transition**:
An ordinary finite transition through the maze logic, including entering or exiting recursive structure through PDA-style stack changes.
_Avoid_: Proof rule

**Proof Transition**:
A high-level transition justified by a proof rule rather than by enumerating every physical transition. Proof transitions are needed for infinite descent and Cantor-style behavior.
_Avoid_: Physical transition, animation shortcut

**Logic Core**:
The executable rule model for a maze: symbolic addresses, physical transitions, execution strategies such as PDA-style stack execution, and optional proof rules for infinite or Cantor-style behavior.
_Avoid_: PDA only, visual model

**Maze Foundation**:
The non-visual foundation that makes maze packages trustworthy: source logic, package shape, import/export expectations, validation, solving, proof support, fixtures, and regression tests. The Maze Foundation is built before the web workbench because it defines what the workbench can safely display, play, edit, and explain.
_Avoid_: Backend, engine, bottom layers

**Fractal Block Maze**:
A fractal-like maze where infinitely many recursive structures are adjacent rather than only nested, allowing movement that can expose or access many depths of structure. It is related to recursive fractal mazes but may need coordinate-like addressing in addition to stack-style nesting.
_Avoid_: Normal fractal maze

**Grid-Authored Recursive Maze**:
A maze drawn and edited as a tile grid, while its logic still normalizes to recursive blocks, exits, links, terminals, and port-level transitions. Grid cells guide visual traversal, path compression, and editor feedback; they are not automatically the logical runtime state.
_Avoid_: Fractal Block Maze, tile-only maze

## Example Dialogue

Dev: Is Fractal Maze Lab just a game?

Domain expert: No. Playing is the first visible workflow, but the lab must also let people inspect, edit, validate, solve, and explain fractal mazes.

Dev: So the player is part of the workbench?

Domain expert: Yes. The player is one workflow inside the Fractal Maze Lab.

Dev: Should the first implementation slice build every planned feature?

Domain expert: No. It should prove the new maze format with enough compiler, runtime, rendering, and playback behavior to expose whether the design is viable.

Dev: Should we keep authoring mazes in the old grid format?

Domain expert: No. The old grid-format files were compatibility inputs, and the lab now uses cleaner package logic for new work.

Dev: Can users define a maze just by drawing paths?

Domain expert: Not always. Drawing should be available, but recursive links, one-way movement, and unusual rules also need structured logical editing.

Dev: Does every visible step along a path need to be a separate logical move?

Domain expert: No. The lab distinguishes a traversal between decision points from lower-level visual animation along a path.

Dev: Can the player move visually without advancing the PDA?

Domain expert: Yes. Visual position can change independently until the player reaches or selects an activation point that advances logical state.

Dev: What happens when the player reaches an activation point?

Domain expert: The visual layer proposes a transition, and the logical runtime validates it before changing the logical state or stack.

Dev: Does every maze compile to an ordinary PDA?

Domain expert: No. Ordinary recursive mazes use PDA-style stack execution, but the logic core is based on symbolic addresses so infinite, Cantor-style, and block-maze cases can add proof rules or other execution strategies.

Dev: Are Fractal Block Mazes just another recursive PDA maze?

Domain expert: Not exactly. They involve adjacent infinite fractal structures, so the logic core needs to consider coordinate-like access as well as nested stack addresses.

Dev: Does a maze drawn on a grid need a separate grid runtime?

Domain expert: Not automatically. Inner Frame and Skeptic Play 3 are grid-authored recursive mazes: their tile grids should import into exits, links, blocks, ports, and PDA-style transitions. A separate coordinate strategy is reserved for cases where the grid itself is the recursive state machine, such as Koteitan-style Fractal Block Maze behavior.

Dev: Why are path labels not enough for Wolfram #2?

Domain expert: The same visible labels can describe different ports with different recursion behavior, so the logic needs port-level transitions instead of only path-number transitions.

Dev: What is the concrete Wolfram #2 fix?

Domain expert: Store both semantic moves as ports. The visible `3` to `7` move can mean entering `B` from `3`, or exiting `A` from `A.3`. The package keeps both transitions, and replay/player actions select the intended port before the PDA stack runtime applies the visible input.

Dev: Are maze paths assumed to be two-way?

Domain expert: No. Runtime transitions are directed. Source Packages may group a forward and reverse transition as `direction: two_way` for editing and display, but one-way paths use `direction: one_way` and do not get an automatic reverse move.

Dev: What makes a Source Package trustworthy before the UI exists?

Domain expert: Package validation runs before package loading. It checks manifest references, supported formats and strategies, port and transition references, transition group shape, Solution Record transition ids, and any Solution Record marked `expects_goal: true` must replay to a declared goal.

Dev: How do Cantor or uncountable proof moves fit a PDA maze?

Domain expert: They are optional proof edges on the same Port Graph. Physical mode ignores them. Proof-assisted mode can use them only after a solution submits or enables the proof edge. The proof edge carries a structured proof body, and the replay records the actual crossing as `step_type: proof`, so the maze remains PDA-like while preserving that the player did not physically traverse that gap.

Dev: What is the difference between Infinite Hop and Cantor Hop proof validation?

Domain expert: Infinite Hop proves a zero-width hop by checking convergence obligations, such as `p1 -> A.p1` and `p2 -> A.p2`. Cantor Hop proves a recursive connection by declaring presuppositions inside all non-empty submaze strings, then validating a finite chain that uses physical steps plus those presupposed inner connections.
