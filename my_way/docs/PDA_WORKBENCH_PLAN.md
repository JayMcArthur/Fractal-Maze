# Image/PDA, tracing, and infinite-maze workbench

## Requested outcome
Use Jay's path-label/PDA process for image mazes; keep conversions WIP for review. Preserve source layouts with editable SVG traces. Add interactive infinite-maze/proof work rather than automatic answers. Deliver the implementation, persistence/import/export, tests, browser captures and a residual audit.

## Plan
- completed: Read Jay's guide and five existing PDA fixtures; inspect every independent source maze and source SVG geometry; map duplicates to conversions.
- completed: Extract exact guide fixtures without discarding fake-state warnings or ambiguous transitions.
- completed: Define the path-labeled pushdown model, manual stepping, stack matching and bounded search; verify existing fixture solutions.
- completed: Draft remaining image conversions with source evidence and visible WIP/uncertainty labels; keep undecoded pieces explicitly reviewable.
- completed: Implement a source-coordinate tracing workspace: path labels/polylines, copy frames/gates, transitions, start/finish, save/export, and visual review.
- completed: Attach the workbench to all maze families/reference assets, preserving authored artwork separately from movement topology.
- completed: Implement the infinite-maze rules and exploratory finite views; preserve limit/non-finite-path distinctions.
- completed: Replace automatic proof output with user-built claims, witnesses/invariants, explicit checking, and inspectable evidence.
- completed: Integrate library/player/builder/replay/guide and remove superseded approximate PDA output.
- completed: Run proportionate model/integration/browser checks, capture the new UI and document confidence for every conversion.
- completed: Build and execute a fresh residual plan.

## Constraints
Original files and staged work are preserved. Image interpretations are WIP, not asserted as verified. Mathematical conclusions must state their assumptions and route semantics. No dependency installation is authorized solely to manufacture audit metrics. Existing lint/type/unit/browser tools are available; coverage/mutation/cognitive-complexity/Halstead/dead-code/duplication/CRAP analyzers are not configured. ESLint cyclomatic complexity is available and is checked without a new dependency.

## Evidence and residual result

The source guide yields five supplied fixtures plus a separate six-copy recurrence draft. Four original inputs and the derived six-copy input reach their surface finishes; the Wolfram input does not and is replayable for review. The 31 artwork sources and 10 research diagrams all open in the workbench. The library now has 68 entries, with 34 added WIP path/proof models.

The mandatory fresh residual plan is PDA_RESIDUAL_PLAN.md. It was executed through source loading, persistence and replay, proof soundness boundaries, measured code gates, visual review and documentation. See PDA_WORKBENCH_AUDIT.md for actual measurements and PDA_CONVERSIONS.md for the WIP details still requiring visual judgment. The remaining boundaries are deliberate review/research constraints; no known implementation failure remains from these checks.
