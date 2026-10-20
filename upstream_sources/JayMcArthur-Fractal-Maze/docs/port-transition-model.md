# Port Transition Model

The Wolfram #2 conversion shows that path labels alone are too coarse for some recursive mazes. A line number or path label can be useful display language, but it may not uniquely identify the logical transition available at a location.

Prior-art support:

- Amurielagi represents user-visible movement through `Gate` objects and paths connecting gates.
- Sparecycles attaches semantic actions to node directions: path traversal, enter, and exit.
- Orelcosseron exposes exits and links as separate logical objects.
- Koteitan's recursive grid enters black cells through boundary sides.
- Koteitan's Repeated Maze uses atomic ports such as `W0`, `E1`, `N2`, `S3`, and temporary `C` center terminals.
- iiJetLi's analyzer emits pins and connection sets that are naturally port-graph data.

## Problem

The legacy PDA notation can express:

```text
3-7 /B
3-7 A/
```

These may both be real maze facts:

- `3 -> B.7`: from decision point `3`, enter submaze `B` and arrive at `7`
- `A.3 -> 7`: from inside submaze `A` at `3`, exit `A` and arrive at parent `7`

If the runtime input is only `7`, then at `A.3` both transitions can appear legal:

```text
A.3 --7--> A.B.7
A.3 --7--> 7
```

That creates nondeterminism even if the visual maze itself has distinct endpoints, sides, terminals, or route contexts.

## Decision

Use port-level transitions when path labels are ambiguous.

Simple mazes may continue to use path labels as shorthand. Hard conversions should refine decision points into ports or terminals.

```text
path label: 3
ports:      3.enter_B, 3.exit_A, 3.main
```

## Source Shape

```yaml
points:
  - id: "3"
    label: "3"
  - id: "7"
    label: "7"

ports:
  - id: "3.to_B"
    point: "3"
    kind: enter_terminal
    submaze: B
  - id: "A.3.exit"
    point: "3"
    required_prefix_suffix: [A]
    kind: exit_terminal
    submaze: A

connections:
  - id: enter_B_from_3_to_7
    from_port: "3.to_B"
    to_address: "B.7"
    input: "edge_3_7_enter_B"
    effect:
      type: push
      symbol: B

  - id: exit_A_from_3_to_7
    from_port: "A.3.exit"
    to_address: "7"
    input: "edge_A3_exit_to_7"
    effect:
      type: pop
      symbol: A
```

## Runtime Shape

The logical runtime can still store stack plus point, but transition matching may include a selected port.

```yaml
current:
  address: "A.3"
  active_port: "A.3.exit"
```

The selected port can come from:

- the visual activation point the player reached
- a solver-chosen transition id
- a playback step
- an editor/test command

If the user input is only a direction or label, the engine should resolve it to a unique port. If several ports match, deterministic play should reject the move as ambiguous.

## PDA Compilation

Port-level transitions compile to normal PDA behavior:

```text
from PDA state: 3.exit_A
stack top: A
input: edge_A3_exit_to_7
to PDA state: 7.main
stack action: pop A
```

or:

```text
from PDA state: 3.to_B
stack top: any
input: edge_3_7_enter_B
to PDA state: 7.main
stack action: push B
```

The PDA state set becomes larger than the visible path-label set. That is acceptable because ports are logical states.

## Relationship To Cantor Mazes

Cantor-style proofs should also use ports or terminals. A proof rule should not claim only `1 -> 3` if the real statement is about a specific boundary terminal or side of `1` and `3`.

```yaml
proof_rules:
  - id: cantor_terminal_hop
    type: cantor_hop
    claim:
      from_port: "S.1.right_terminal"
      to_port: "S.3.left_terminal"
```

This makes proof visualization more precise because the visual layer can highlight the exact terminals involved.

## Relationship To Fractal Block Maze

Koteitan's repeating-maze formalization discusses terminals and ports. That suggests Fractal Block Maze-style logic should not be modeled as just coordinates plus movement directions.

It likely needs:

- a symbolic coordinate/depth address
- a local block or tile identity
- ports on the boundary of that block
- generator rules that connect compatible ports across scales

```yaml
address:
  kind: block_coord
  x: X
  y: Y
  depth: D
  port: east_terminal

generator:
  from_port: east_terminal
  to_port: west_terminal
  neighbor:
    x: X + 1
    y: Y
    depth: D
```

## Relationship To Repeated/Tiled Mazes

Repeated Maze-style systems use ports as the native source model, not as a refinement of path labels. The same terminal may have multiple physical names depending on which adjacent block is used, so the solver may use canonical states while the package preserves authored terminals.

```yaml
block_classes:
  normal:
    ports:
      - from: W0
        to: N2
  nx:
    ports:
      - from: E0
        to: E1
  ny:
    ports:
      - from: N0
        to: N1
  zero:
    ports:
      - from: W0
        to: C0
```

Compilation may normalize terminal indices for comparison and fixtures. That should produce derived ids, not overwrite the author's labels.

## Migration Rule

Start with path-level states for simple examples. Promote a path label to ports when:

- two transitions share the same visible endpoints but have different stack behavior
- a line has multiple entrances/exits with different meanings
- a visual route reaches a boundary terminal
- a proof rule depends on a specific side or terminal
- deterministic play cannot resolve a move from label alone

## Open Questions

- Should ports be required in source files, or generated during normalization?
- Should transition inputs be user-facing labels, transition ids, or both?
- Should a port be part of the address string, such as `A.3@exit`, or a separate field?
- How do image overlays infer or display ports without clutter?
- Should repeated-maze canonicalization live in the package loader, the solver, or a shared normalization module?
