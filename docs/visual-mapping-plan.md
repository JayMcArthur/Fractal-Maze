# Visual Mapping Plan

Visual Mapping is the package-adjacent layer that lets the workbench draw,
play back, and explain maze logic without making images or geometry the source
of truth.

## Position In The Roadmap

Design Visual Mapping before Browser Package JSON export.

The Browser Package should be a generated artifact that joins validated logic,
solutions, and visual mapping references. If export happens first, it will
either omit visual hooks or accidentally hard-code a rendering model before the
graphics layer has been named.

## Layer Boundary

Source Package:

- owns package identity, primary authoring representation, logic references,
  solutions, and provenance
- must validate and replay without images

Logic file:

- owns points, ports, transitions, proof edges, runtime strategy, and solver
  behavior
- treats visual labels as display metadata only

Visual Mapping file:

- owns image references, geometry, anchors, activation points, path presentation,
  labels, and playback checkpoints
- references logical object ids instead of defining movement

Browser Package:

- generated JSON artifact for static loading
- combines normalized runtime data with visual mapping data that has already
  been validated against package logic

Each Source Package should start with one optional `visual.yml` referenced from
the Package Manifest. That Visual Mapping may contain multiple Visual Views.
Splitting one package into several visual mapping files can wait until package
size or ownership makes it necessary.

Visual Mapping is optional for a valid Source Package. Logic validation,
solution replay, and package loading must continue to work without visuals.
When a Package Manifest references a Visual Mapping, that file should validate
strictly against the package logic and referenced assets.

## View Preference

A Visual Mapping may provide several Visual Views for the same maze logic.

Default playback should prefer:

1. Authored Vector View
2. Generated View, when the maze family has natural generated geometry
3. Image Overlay

This is a playback-quality preference, not an archival rule. When an original
source image exists, keep it available as a source/reference view even if a
clean vector view is the default playable view.

## Vector Binding Policy

Authored Vector Views may use SVG element ids or embedded data attributes as an
authoring convenience, but Visual Mapping is the canonical binding layer.

For example, an SVG path may have a stable element id:

```xml
<path id="path-p3-to-p7-enter-b" />
```

The package-level binding should still live in `visual.yml`:

```yaml
vector_bindings:
  - id: p3_to_p7_enter_b_binding
    view: clean_vector
    element: "#path-p3-to-p7-enter-b"
    transition_id: t_p3_to_mB_p7
```

For an Authored Vector View, the external SVG may be the canonical geometry
source. Visual Mapping is the canonical package binding source between that
geometry and logic.

Authored Vector Views should usually reference external SVG elements rather than
duplicate the SVG geometry inline. Inline geometry remains valid for Image
Overlays, generated visuals, and small package-authored annotations.

```yaml
route_segments:
  - id: seg_p1_to_p2
    view: clean_vector
    element: "#path-p1-p2"

  - id: scan_seg_p1_to_p2
    view: source_scan
    geometry:
      kind: polyline
      points:
        - { x: 120, y: 240 }
        - { x: 180, y: 230 }
```

## Binding Targets

Visual geometry should bind to the most precise logical object it represents:

- point anchors bind to Point IDs
- clickable endpoints and terminals bind to Port IDs
- one directed playable action binds to a Transition ID
- visible two-way path geometry binds to a Transition Group ID
- proof marks and proof jumps bind to a Proof Edge ID
- replay-only animation markers bind to Visual Checkpoint IDs
- submaze outlines or regions may bind to region ids after regions become
  first-class package objects

When a visible path represents a two-way route, bind the shared visual geometry
to the transition group. Runtime direction selection can still resolve to the
forward or reverse transition.

## Visual Route Network

Visual path geometry should be reusable. A single drawn path may fork or share
segments across several logical transitions, so Visual Mapping separates route
geometry from transition bindings.

```yaml
route_segments:
  - id: seg_p3_to_junction_1
    view: clean_vector
    geometry:
      kind: polyline
      points:
        - { x: 120, y: 240 }
        - { x: 150, y: 250 }

  - id: seg_junction_1_to_p7
    view: clean_vector
    geometry:
      kind: polyline
      points:
        - { x: 150, y: 250 }
        - { x: 180, y: 230 }

routes:
  - id: route_p3_to_p7_enter_b
    transition_id: t_p3_to_mB_p7
    segments:
      - seg_p3_to_junction_1
      - seg_junction_1_to_p7

  - id: route_p3_to_p7_exit_a
    transition_id: t_mA_p3_to_p7
    segments:
      - seg_p3_to_junction_1
      - seg_junction_1_to_p7
```

A visual junction is not automatically a logical Decision Point. If the player
can choose there, model it as a Decision Point in logic. If it only supports
path drawing, highlighting, or animation, keep it visual-only.

## Highlighting Model

Highlighting should be history-first, then choice-focused:

- show the Visited Route derived from committed logical transition history
- show Available Activation Points for legal next transitions
- show a Route Preview only when an available action is hovered, focused, or
  otherwise inspected
- when a move commits, append that Visual Route to the Visited Route
- when undo happens, remove the last Visual Route
- when a new move happens after undo, discard future visual history and append
  the new Visual Route

Available-action discovery flows from logic to visuals: the runtime reports
legal transition ids from the current logical state, then the visual layer finds
the Activation Points and Visual Routes bound to those transitions or their
transition groups.

## Interaction Model

The first interactive visual layer should support endpoint selection and
keyboard/list selection:

- endpoint selection activates an Available Activation Point
- keyboard or action-list selection chooses a legal logical transition
- Route Preview shows the route for the selected or focused action

Visual Route Segments are not direct click targets in the first model. Shared
route geometry can make path clicks ambiguous, while endpoints and action lists
resolve cleanly to a port or transition before the logic runtime validates the
move.

## Action Presentation

Visual Mapping may provide presentation hints for legal actions, but keyboard
bindings should be assigned by the UI at runtime.

```yaml
action_presentations:
  - id: action_p3_to_p7_enter_b
    transition_id: t_p3_to_mB_p7
    label: "7 / enter B"
    order: 10
    activation_point: p3_to_p7_endpoint
    route: route_p3_to_p7_enter_b
```

These hints support action lists, endpoint labels, hover/focus text, and
deterministic ordering. They do not replace logical transition validation.

## Editing Boundary

Committed Visual Mapping files are binding-only: every referenced logical
object must already exist in package logic.

An Editor Surface may create or revise graphics and logic together while a maze
is being authored. Before the result becomes a valid Source Package, Visual
Mapping must reference premade logic objects and package validation must reject
unbound visual objects.

## Solution Playback

Solution Records remain logical-first. A normal replay stores transition ids and
proof edge ids; the Visited Route is reconstructed from those logical steps plus
Visual Mapping.

Use Visual Checkpoints only when the default reconstruction is not expressive
enough, such as:

- pausing at an intermediate visual position
- showing a proof annotation
- selecting an alternate animation route for the same logical transition
- preserving imported playback detail from an original source

## Initial Visual Mapping Shape

Start with enough shape to render and inspect one Port Graph package.

```yaml
format: fmaze-visual-v0
maze: wolfram_2
logic: logic.yml
assets:
  - id: source_image
    href: ../../../Maze_Images/Mark_J_P_Wolf/Wolfram_2.jpg
    media_type: image/jpeg
views:
  - id: main
    asset: source_image
    coordinate_space:
      kind: image_pixels
      width: 0
      height: 0
anchors:
  - id: p3_anchor
    logical_object: p3
    view: main
    position: { x: 0, y: 0 }
activation_points:
  - id: p3_to_mB_p7_hotspot
    transition_id: t_p3_to_mB_p7
    view: main
  shape:
    kind: circle
    center: { x: 0, y: 0 }
    radius: 8
```

Zero coordinates are acceptable while bootstrapping a fixture, but validation
should distinguish placeholder geometry from reviewed geometry.

## Current Supported Boundary

The first official Visual Mapping slice is implemented for
`packages/source/skeptic_play_1/visual.yml`.

Supported now:

- optional `visual` reference in `package.yml`
- `fmaze-visual-v0` schema
- multiple Visual Views in one `visual.yml`
- Authored Vector View backed by external SVG
- Image Overlay source/reference view
- anchors bound to logical objects
- activation points bound to transitions and ports
- route segments bound to SVG element selectors
- routes bound to transitions
- action presentation hints
- full Skeptic Play #1 transition, port, action, and point-anchor coverage
- visual replay tracing from logical Solution Records through Visual Routes
- `fmaze explain` visual summary
- `fmaze replay --visual-trace`
- package validation for:
  - visual format and package maze id
  - visual logic reference
  - asset file existence
  - view asset compatibility
  - default view consistency
  - known logic object, transition, port, route, and route segment references
  - activation point transition/port consistency
  - referenced SVG element id existence

Not supported yet:

- SVG element type compatibility checks
- label collision checks
- image dimension and bounds checks
- Visual Checkpoints in real Solution Records
- Wolfram #2 visual ambiguity fixture

## Validation Rules

The first validator should check:

- `format` is supported
- referenced logic file matches the package logic file
- every `logical_object` exists as a point, port, transition, proof edge, or
  transition group
- every `transition_id` exists in package logic
- every asset `href` resolves
- every referenced SVG element id exists in its asset
- every visual item references a known view
- geometry is structurally valid for its declared shape kind

Later validation can check image dimensions, anchor bounds, label collisions,
solution visual checkpoints, and SVG element type compatibility.

## First Slices

Use `skeptic_play_1` for the first serious visual mapping slice because it has
existing vector assets and can prove Authored Vector View mechanics before the
harder ambiguity case.

Then use `wolfram_2` as the second visual mapping slice because it proves the
graphics layer can distinguish two visually similar `3` to `7` facts by
separate ports and activation points.

Deliverables:

- `schemas/visual.schema.json`
- one hand-authored `packages/source/skeptic_play_1/visual.yml`
- one hand-authored `packages/source/wolfram_2/visual.yml`
- package manifest support for optional `visual`
- validator checks for visual references
- `fmaze explain` prints visual mapping summary when present

Exit criteria:

- visual mapping validates without changing logic semantics
- Skeptic Play #1 uses external SVG element hooks for route segments and
  activation points
- Wolfram #2 can name the two `3` to `7` activation points separately
- Browser Package export has enough information to preserve logical ids,
  visual anchors, and activation targets
