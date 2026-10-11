# Logic Core

The logic core is the executable rule model for Fractal Maze Lab. It must answer what moves are legal, how a move changes logical state, whether a goal has been reached, and how a solution or proof should be recorded.

## Current Decision

Use symbolic address logic as the base model.

```text
Logic Core =
  Symbolic Addresses
  + Physical Transitions
  + Execution Strategies
  + Optional Proof Rules
```

PDA-style stack execution is the first concrete execution strategy because normal recursive mazes fit it well. Infinite, Cantor, and Fractal Block Maze cases may add proof rules or coordinate-like address strategies.

Prior-art review in `docs/prior-art-analysis.md` refines this into a pluggable execution-strategy model:

- `pda_stack` for Alice/Orelcosseron-style recursive rooms
- `coordinate_path` for Koteitan Fractal Block Maze-style generated coordinate paths
- `tiled_port_graph` for Repeated Maze-style infinite grids with block-dependent port sets
- `proof_rule` for Cantor and infinite reasoning
- future strategies for higher-dimensional or generated maze families

## Symbolic Addresses

A symbolic address is a structured logical location. It is not a screen coordinate.

Recursive examples:

```text
1
A.2
B.B.A.1
```

These mean:

```text
1       -> root level, decision point 1
A.2     -> inside A, decision point 2
B.B.A.1 -> inside B, then B, then A, decision point 1
```

Coordinate/depth examples for future Fractal Block Maze work:

```yaml
address:
  kind: block_coord
  x: 3
  y: -1
  depth: 4
  local: north_gate
```

Repeated/tiled port graph examples:

```yaml
address:
  kind: repeated_grid
  x: 4
  y: 0
  terminal:
    side: N
    index: 3
```

Symbolic examples for proof rules:

```yaml
address:
  kind: pattern
  prefix: S
  point: "1"
```

## Ports And Terminals

A decision point can have multiple logical ports. Ports are needed when a visible label is not enough to choose a unique transition.

Example:

```text
A.3 --7--> A.B.7
A.3 --7--> 7
```

Both may mention visible labels `3` and `7`, but they use different terminals and stack behavior. The normalized logic should represent these as different ports or transition ids.

Port-aware runtime may carry:

```yaml
current:
  address: "A.3"
  active_port: "A.3.exit"
```

Simple mazes can omit explicit ports and use a generated default port per decision point.

Repeated/tiled mazes should keep edge terminals as first-class ports. A canonical solver state may collapse equivalent physical terminals, but the source package should preserve the original terminal identity:

```yaml
terminal:
  block_class: normal
  side: W
  index: 0
canonical_state:
  axis: E
  x: 3
  y: 1
  index: 0
```

## Physical Transitions

A physical transition is an ordinary finite move through the maze logic.

Recursive enter:

```yaml
from: "1"
to: "A.2"
input: "red_path"
effect:
  strategy: pda_stack
  type: push
  symbol: A
```

Recursive exit:

```yaml
from: "A.1"
to: "4"
input: "blue_path"
effect:
  strategy: pda_stack
  type: pop
  symbol: A
```

Same-level path:

```yaml
from: "2"
to: "5"
input: "walk"
effect:
  strategy: pda_stack
  type: none
```

Generated tiled transition:

```yaml
from:
  kind: repeated_grid
  x: X
  y: Y
  terminal: "W0"
to:
  kind: repeated_grid
  x: X
  y: Y
  terminal: "N2"
effect:
  strategy: tiled_port_graph
  block_class: normal
  type: port_edge
```

## Runtime State

Recursive runtime state can be stored as state plus stack:

```yaml
current:
  state: "1"
  stack: ["ROOT", "B", "B", "A"]
```

For display, this may render as:

```text
B.B.A.1
```

Runtime history should record enough to replay, debug, undo, and explain:

```yaml
history:
  - step_type: physical
    input: "red_path"
    from:
      state: "1"
      stack: ["ROOT"]
    to:
      state: "2"
      stack: ["ROOT", "A"]
    transition_id: t_enter_A_2
```

For repeated/tiled mazes, runtime state uses coordinates plus terminal identity:

```yaml
current:
  strategy: tiled_port_graph
  x: 0
  y: 0
  terminal: W0
```

Bounded solvers may additionally record canonical states and search limits so `unknown` and `unsolved_with_bound` are not confused with a proof of no solution.

## Proof Transitions

A proof transition is a high-level logical step justified by a proof rule. It is not a normal animation shortcut.

```yaml
history:
  - step_type: proof
    proof_rule: cantor_hop_1_to_3
    from:
      address: "1"
    to:
      address: "3"
    explanation_trace: proof_trace_001
```

The player and solver may treat proof transitions differently:

- normal play may disallow proof transitions
- solver mode may use proof transitions
- explanation mode should expand them
- visual playback may render them as a special annotated jump

## Determinism

Playable runtime should prefer deterministic transitions for a given logical state, input, and execution context.

The compiler or validator should report:

- duplicate transitions for the same input and context
- transitions with missing targets
- stack pops that do not match declared submaze symbols
- proof rules with unbound variables
- visual activation points that target no logical transition

Nondeterminism may be useful for theory or solver modes, but it should be explicit.

## Open Questions

- Should source files store compact address strings or structured address objects?
- Should ports be part of address strings or separate normalized objects?
- How much stack rewriting is needed beyond push, pop, and no-op?
- Should proof transitions ever be available during normal play?
- How should the engine report `unknown` when a symbolic rule cannot be applied?
- What is the minimal common interface for stack and coordinate execution strategies?
- What common solver interface should cover bounded DFS, BFS, iterative deepening, coordinate search, and proof-assisted search?
- Should package files store both authored terminal ids and canonicalized solver ids?
- How much compiler provenance should be mandatory when a maze is generated from a state machine?
