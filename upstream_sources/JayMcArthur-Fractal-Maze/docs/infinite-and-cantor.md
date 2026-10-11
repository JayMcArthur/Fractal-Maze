# Infinite And Cantor Mazes

Infinite and Cantor-style mazes are the main reason the logic core cannot be pure finite PDA execution.

## Core Decision

Represent ordinary finite movement as physical transitions. Represent infinite descent and Cantor-style reasoning as proof rules that produce proof transitions.

```text
physical transition -> finite movement
proof transition    -> symbolic move justified by a rule
```

## Infinite Descent

An infinite descent step represents a connection that is justified by descending through an unbounded recursive structure.

Sketch:

```yaml
proof_rules:
  - id: infinite_hop_1_to_6
    type: infinite_hop
    claim:
      from:
        prefix: S
        point: "1"
      to:
        prefix: S
        point: "6"
    induction:
      variable: S
      assumes:
        - from: "S.A.1"
          to: "S.A.6"
      proves:
        - from: "S.1"
          to: "S.6"
```

This is not a literal move sequence. It is a symbolic step the solver or explanation layer may use.

## Cantor Hop

A Cantor hop reasons over all non-empty submaze strings rather than enumerating nested states.

Sketch:

```yaml
proof_rules:
  - id: cantor_hop_1_to_3
    type: cantor_hop
    variables:
      S: any_submaze_string
      T: any_non_empty_submaze_string
    claim:
      from: "S.1"
      to: "S.3"
    assumes:
      - from: "S.T.1"
        to: "S.T.3"
    proof_path:
      - kind: physical
        from: "S.1"
        to: "S.A.1"
      - kind: assumption
        from: "S.A.1"
        to: "S.A.3"
      - kind: physical
        from: "S.A.3"
        to: "S.2"
      - kind: physical
        from: "S.2"
        to: "S.B.1"
      - kind: assumption
        from: "S.B.1"
        to: "S.B.3"
      - kind: physical
        from: "S.B.3"
        to: "S.3"
```

The exact proof language is unresolved. Sprint 1 should produce a toy executable validator for at least one small proof rule.

Implemented spike:

```yaml
id: simple_cantor
claim:
  from: "1"
  to: "3"
proof_path:
  - kind: physical
    from: "1"
    to: "A.1"
  - kind: assumption
    from: "A.1"
    to: "A.3"
  - kind: physical
    from: "A.3"
    to: "2"
  - kind: physical
    from: "2"
    to: "B.1"
  - kind: assumption
    from: "B.1"
    to: "B.3"
  - kind: physical
    from: "B.3"
    to: "3"
```

The validator currently checks:

- the proof path starts at the claimed source and ends at the claimed target
- every physical step exists as a real connection
- every assumption step has a non-empty prefix and matches the claim under that prefix
- the proof path is contiguous

This corresponds to Siggy's Simple Cantor Maze proof: presuppose `T.1` and `T.3` are connected for all non-empty submaze strings `T`, then prove `1` connects to `3`.

## Terminals In Proof Rules

Proof rules should refer to ports or terminals when the claim depends on a side of a region, not just a visible path number.

Better:

```yaml
claim:
  from_port: "S.1.right_terminal"
  to_port: "S.3.left_terminal"
```

Too coarse:

```yaml
claim:
  from: "S.1"
  to: "S.3"
```

The coarse form is acceptable only when each decision point has a single relevant default port.

## Runtime Representation

```yaml
history:
  - step_type: proof
    proof_rule: cantor_hop_1_to_3
    from:
      address: "1"
    to:
      address: "3"
    result: applied
```

## Prototype Status

The current prototype has two proof-rule levels:

- `ProofRule`: trusted proof transition for testing runtime/history shape
- `CantorHopRule`: validates a simplified Cantor proof path against physical transitions and assumption steps

Prototype test:

```sh
python3 -m unittest tests.test_logic_core.ProofRuleTests -v
```

The next implementation step is to add ports/terminals to `CantorHopRule` claims and to support sets of multiple claimed connections, not just one pair.

## Visual Consequences

The visual layer must know when a step is a proof transition.

Possible displays:

- annotated jump between decision points
- expandable proof trace
- stack/address pattern view
- warning that the step is not physical traversal

Proof transitions should not be silently animated as if the player walked the path.

## Solver Consequences

Solver result types should include:

```yaml
result: solved
```

```yaml
result: proved
proof_rules_used:
  - cantor_hop_1_to_3
```

```yaml
result: unknown
reason: requires_symbolic_reasoning
```

## Open Questions

- Are proof transitions allowed in normal play, or only solver/explanation mode?
- What proof rule language is expressive enough without becoming a theorem prover?
- Can proof rules be authored manually in the editor?
- Should proof rules be checked mechanically, or trusted as annotations at first?
- What is the smallest Cantor example that exercises the model?
- Should the first Cantor schema require terminal-level claims?
