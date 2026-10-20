# PDA Conversion

This document tracks how recursive fractal maze notation becomes executable PDA-style stack behavior.

## Existing Repo Pattern

The current PDA writeup labels path segments and records connections such as:

```text
1 -> A2
1 -> B3
A1 -> 4
B1 -> 5
B2 -> 4
2 -> A5
A2 -> 6
3 -> B4
6 -> B6
```

The new source form should prefer dotted symbolic addresses:

```text
1 -> A.2
1 -> B.3
A.1 -> 4
B.1 -> 5
B.2 -> 4
2 -> A.5
A.2 -> 6
3 -> B.4
6 -> B.6
```

## Address To Stack Rules

An address has a prefix and a decision point.

```text
B.B.A.1
```

means:

```yaml
state: "1"
stack: ["ROOT", "B", "B", "A"]
```

Connection compilation:

- `1 -> A.2`: push `A`, state becomes `2`
- `A.1 -> 4`: require stack top `A`, pop `A`, state becomes `4`
- `2 -> 5`: same stack, state becomes `5`

## Port-Level Refinement

Path labels are shorthand. When a visible path label is ambiguous, normalize it into ports before compiling to PDA states.

For Wolfram #2, the conflict is around `3` and `7`:

```text
3-7 /B
3-7 A/
```

These should not be compiled as two transitions with the same state/input pair. They should become distinct logical transitions:

```yaml
- id: enter_B_from_3_to_7
  from_port: "3.to_B"
  to_address: "B.7"
  input: "edge_3_7_enter_B"

- id: exit_A_from_3_to_7
  from_port: "A.3.exit"
  to_address: "7"
  input: "edge_A3_exit_to_7"
```

Compiled PDA states can include ports:

```text
q_3_to_B
q_3_exit_A
q_7_main
```

The visual layer may still display both states as path `3`.

## Test Status From Prototype

The standalone prototype in `src/fractal_maze_lab/` accepts known solution strings for:

- `Skeptic Play #1`
- `Jay McArthur #1`
- `Inner Frame`
- `Skeptic Play #3`
- `Wolfram #2` using the longer `path1` solution already present in the legacy script

The shorter active `Wolfram #2` path in `Papers/Fractal_Maze_to_PDA/Fractal_Maze_PDA.py` ends at `A.B.A`, not the goal `A`, under the current transition set.

Current prototype command:

```sh
python3 tools/logic_core_demo.py
```

## Wolfram #2 Repair Plan

Treat `Wolfram #2` as the first hard conversion test.

Inputs:

- `Maze_Images/Mark_J_P_Wolf/Wolfram_2.jpg`
- `Maze_Images/Mark_J_P_Wolf/Wolfram_2_-_Nested.png`
- `Maze_Images/Mark_J_P_Wolf/Wolfram_2_-_Wires.png`
- current transitions in `Papers/Fractal_Maze_to_PDA/Fractal_Maze_PDA.py`

Work:

1. Re-label visible wires/decision points from the image.
2. Re-derive every connection as address graph edges.
3. Confirm whether the shorter repair is visually correct:
   - current edge: `3-7` as `/B`
   - repaired edge: `3-7` as `A/`
4. Identify whether any remaining mismatch is:
   - incorrect solution string
   - missing transition
   - wrong direction on a transition
   - need for an explicit intermediate or fake state
   - genuine nondeterminism
   - model gap
5. Add or keep regression tests for accepted solutions.
6. Document any deliberate fake state in the conversion notes.

Prototype finding:

- The current transition set accepts `3768:(8;1)4=:@139<8A`.
- The shorter candidate `3768:(8;1)?8:)8A` accepts if `3-7` is replaced with `A/`.
- Adding both `3-7 /B` and `3-7 A/` creates nondeterminism at `A.3` on input `7`.
- A better long-term fix is not choosing one globally, but representing the two `3-7` facts as separate port-level transitions if the image confirms both are real.

## Source Format Sketch

```yaml
format: fmaze-logic-v0
id: skeptic_play_1
logic_type: address_graph

junctions:
  - "1"
  - "2"
  - "3"
  - "4"
  - "5"
  - "6"

submazes:
  - A
  - B

start:
  address: "1"

goals:
  - address: "2"

base_connections:
  - id: c_1_to_A2
    from: "1"
    to: "A.2"
    label: red
  - id: c_A1_to_4
    from: "A.1"
    to: "4"
    label: blue
```

## Open Questions

- Should base connections be directional by default?
- Should bidirectional paths be explicit two-edge shorthand?
- How do we name inputs: by color, path number, direction, or connection ID?
- Should Wolfram #2 be the first required port-level conversion?
- How much of the compiled PDA should be saved versus regenerated?
- For old grid-authored sources, the package layer now stores derived Port Graph logic; verify missing solution records before adding visual mapping.
