from __future__ import annotations

import argparse
import html
import json
import sys
from pathlib import Path
from typing import Sequence

from .logic_core import ExecutionError, RuntimeState, StepRecord
from .package_loader import LoadedPackage, load_package, load_referenced_solution, replay_solution
from .package_validation import validate_package_file
from .solver import SolverResult


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="fmaze", description="Fractal Maze Lab foundation CLI.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate_parser = subparsers.add_parser("validate", help="Validate one or more Source Package manifests.")
    validate_parser.add_argument("package", nargs="+", help="Path to package.yml")
    validate_parser.set_defaults(func=_cmd_validate)

    solve_parser = subparsers.add_parser("solve", help="Run the package solver for a Source Package.")
    solve_parser.add_argument("package", help="Path to package.yml")
    solve_parser.add_argument("--state-limit", type=int, default=None, help="Maximum runtime states for graph searches.")
    solve_parser.add_argument("--depth-limit", type=int, default=None, help="Maximum nested depth for coordinate searches.")
    solve_parser.add_argument("--include-proof-edges", action="store_true", help="Allow proved package proof edges.")
    solve_parser.add_argument("--trace", action="store_true", help="Print the returned state path.")
    solve_parser.set_defaults(func=_cmd_solve)

    replay_parser = subparsers.add_parser("replay", help="Replay a package Solution Record.")
    replay_parser.add_argument("package", help="Path to package.yml")
    replay_parser.add_argument("solution", help="Solution id from the package manifest.")
    replay_parser.add_argument("--include-proof-edges", action="store_true", help="Allow proved package proof edges.")
    replay_parser.add_argument("--trace", action="store_true", help="Print every replayed step.")
    replay_parser.add_argument("--visual-trace", action="store_true", help="Print visual routes derived from replayed steps.")
    replay_parser.set_defaults(func=_cmd_replay)

    explain_parser = subparsers.add_parser("explain", help="Print package logic details useful for debugging.")
    explain_parser.add_argument("package", help="Path to package.yml")
    explain_parser.set_defaults(func=_cmd_explain)

    visualize_parser = subparsers.add_parser("visualize", help="Generate a static visual replay HTML file.")
    visualize_parser.add_argument("package", help="Path to package.yml")
    visualize_parser.add_argument("solution", help="Solution id from the package manifest.")
    visualize_parser.add_argument("--output", help="Output HTML path. Defaults to /tmp/fmaze-<maze>-<solution>.html")
    visualize_parser.set_defaults(func=_cmd_visualize)

    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except ExecutionError as exc:
        print(f"ERROR {exc}", file=sys.stderr)
        return 1


def _cmd_validate(args: argparse.Namespace) -> int:
    exit_code = 0
    for raw_path in args.package:
        result = validate_package_file(raw_path)
        if result.valid:
            print(f"PASS {raw_path}")
            continue
        exit_code = 1
        print(f"FAIL {raw_path}")
        for issue in result.issues:
            print(f"  {issue.format()}")
    return exit_code


def _cmd_solve(args: argparse.Namespace) -> int:
    package = load_package(args.package)
    result = package.solve(
        depth_limit=args.depth_limit,
        state_limit=args.state_limit,
        include_proof_edges=args.include_proof_edges,
    )
    print(_format_solver_result(package, result))
    if args.trace:
        for index, state in enumerate(result.path, start=1):
            print(f"  {index:03d}: {_format_state(state)}")
    return 0 if result.solved else 1


def _cmd_replay(args: argparse.Namespace) -> int:
    package = load_package(args.package)
    solution = load_referenced_solution(package, args.solution)
    replay = replay_solution(package, solution, include_proof_edges=args.include_proof_edges)
    runtime = package.compile_runtime(include_proof_edges=args.include_proof_edges)
    reached_goal = runtime.is_goal(replay.final_state)
    print(
        f"REPLAY {package.manifest['id']} solution={args.solution} "
        f"goal={reached_goal} final={replay.final_state.address} steps={len(replay.history)}"
    )
    if args.trace:
        for index, step in enumerate(replay.history, start=1):
            print(f"  {index:03d}: {_format_step(step)}")
    if args.visual_trace:
        for line in _format_visual_trace(package, replay.history):
            print(line)
    return 0 if reached_goal else 1


def _cmd_explain(args: argparse.Namespace) -> int:
    package = load_package(args.package)
    print(f"PACKAGE {package.manifest['id']}: {package.manifest['title']}")
    print(f"  primary_authoring={package.manifest['primary_authoring']}")
    print(f"  strategy={package.logic['strategy']} source_model={package.logic['source_model']}")

    solutions = package.manifest.get("solutions", [])
    if solutions:
        print("  solutions=" + ", ".join(solution["id"] for solution in solutions))
    if package.visual is not None:
        views = package.visual.get("views", [])
        assets = package.visual.get("assets", [])
        routes = package.visual.get("routes", [])
        activation_points = package.visual.get("activation_points", [])
        default_view = package.visual.get("default_view")
        print(
            f"  visual={package.visual.get('format')} default_view={default_view} "
            f"views={len(views)} assets={len(assets)} routes={len(routes)} activation_points={len(activation_points)}"
        )
        view_labels = [
            f"{view.get('id')}:{view.get('kind')}"
            for view in views
            if isinstance(view, dict)
        ]
        if view_labels:
            print("  visual_views=" + ", ".join(view_labels))

    if package.port_graph is not None:
        graph = package.port_graph
        print(f"  start={graph.start} goals={','.join(str(goal) for goal in sorted(graph.goals))}")
        print(f"  ports={len(graph.ports)} transitions={len(graph.transitions)} groups={len(graph.transition_groups)}")
        ambiguous = graph.ambiguous_inputs()
        if ambiguous:
            rendered = ", ".join(f"{point}:{input}" for point, input in ambiguous)
            print(f"  ambiguous_inputs={rendered}")
        if graph.proof_edges:
            print("  proof_edges=" + ", ".join(sorted(graph.proof_edges)))
        return 0

    if package.fractal_block_maze is not None:
        pattern = package.fractal_block_maze.pattern
        print(f"  pattern_unit={pattern.unit}")
        print(f"  entry={package.fractal_block_maze.entry_direction} goal={package.fractal_block_maze.goal_direction}")
        return 0

    if package.tiled_port_graph is not None:
        graph = package.tiled_port_graph
        print(f"  start={_format_state(graph.start)} goals={','.join(_format_state(goal) for goal in sorted(graph.goals))}")
        print("  sections=" + graph.to_sections_text())
        return 0

    modeling_status = package.logic.get("modeling_status")
    if isinstance(modeling_status, dict):
        print(f"  modeling_status={modeling_status.get('status', 'unknown')}")
        notes = modeling_status.get("notes")
        if notes:
            print(f"  notes={notes}")

    return 0


def _cmd_visualize(args: argparse.Namespace) -> int:
    package = load_package(args.package)
    solution = load_referenced_solution(package, args.solution)
    replay = replay_solution(package, solution)
    output = Path(args.output) if args.output else Path("/tmp") / f"fmaze-{package.manifest['id']}-{args.solution}.html"
    output.write_text(_build_visual_replay_html(package, args.solution, replay.history), encoding="utf-8")
    print(output)
    return 0


def _format_solver_result(package: LoadedPackage, result: SolverResult) -> str:
    final = _format_state(result.path[-1]) if result.path else "none"
    parts = [
        f"SOLVE {package.manifest['id']}",
        f"status={result.status.value}",
        f"explored={result.explored}",
        f"path_length={len(result.path)}",
        f"final={final}",
    ]
    if result.bound is not None:
        parts.append(f"bound={result.bound}")
    if result.explanation:
        parts.append(f"explanation={result.explanation!r}")
    return " ".join(parts)


def _format_state(state: object) -> str:
    if isinstance(state, RuntimeState):
        return str(state.address)
    if isinstance(state, tuple):
        return ".".join(f"{x},{y}" for x, y in state)
    terminal = getattr(state, "terminal", None)
    if terminal is not None:
        return f"({state.x},{state.y},{terminal})"
    return str(state)


def _format_step(step: StepRecord) -> str:
    details = (
        f"{step.step_type} {step.transition_id} input={step.input!r} "
        f"{step.source} {list(step.stack_before)} -> {step.target} {list(step.stack_after)}"
    )
    if step.explanation:
        return f"{details} explanation={step.explanation!r}"
    return details


def _format_visual_trace(package: LoadedPackage, history: tuple[StepRecord, ...]) -> list[str]:
    if package.visual is None:
        return ["VISUAL none"]
    routes_by_transition = {
        route["transition_id"]: route
        for route in package.visual.get("routes", [])
        if isinstance(route, dict) and isinstance(route.get("transition_id"), str)
    }
    segments_by_id = {
        segment["id"]: segment
        for segment in package.visual.get("route_segments", [])
        if isinstance(segment, dict) and isinstance(segment.get("id"), str)
    }
    lines = [f"VISUAL default_view={package.visual.get('default_view')}"]
    for index, step in enumerate(history, start=1):
        route = routes_by_transition.get(step.transition_id)
        if route is None:
            lines.append(f"  {index:03d}: {step.transition_id} route=missing")
            continue
        segment_ids = list(route.get("segments", []))
        elements = [
            segments_by_id[segment_id].get("element", segment_id)
            for segment_id in segment_ids
            if segment_id in segments_by_id
        ]
        rendered_elements = ",".join(str(element) for element in elements) if elements else "none"
        lines.append(f"  {index:03d}: {step.transition_id} route={route['id']} elements={rendered_elements}")
    return lines


def _build_visual_replay_html(package: LoadedPackage, solution_id: str, history: tuple[StepRecord, ...]) -> str:
    if package.visual is None:
        raise ExecutionError("package has no visual mapping")
    view_id = str(package.visual.get("default_view") or "")
    views = {
        view["id"]: view
        for view in package.visual.get("views", [])
        if isinstance(view, dict) and isinstance(view.get("id"), str)
    }
    assets = {
        asset["id"]: asset
        for asset in package.visual.get("assets", [])
        if isinstance(asset, dict) and isinstance(asset.get("id"), str)
    }
    view = views.get(view_id)
    if view is None:
        raise ExecutionError(f"visual default view {view_id!r} is missing")
    if view.get("kind") != "authored_vector":
        raise ExecutionError("visualize currently requires an authored_vector default view")
    asset = assets.get(view.get("asset"))
    if asset is None:
        raise ExecutionError(f"visual view {view_id!r} references missing asset {view.get('asset')!r}")
    if asset.get("media_type") != "image/svg+xml":
        raise ExecutionError("visualize currently requires an SVG asset")
    svg_path = package.root / str(asset["href"])
    svg = svg_path.read_text(encoding="utf-8")
    svg = svg.replace("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>", "").strip()

    routes_by_transition = {
        route["transition_id"]: route
        for route in package.visual.get("routes", [])
        if isinstance(route, dict) and isinstance(route.get("transition_id"), str)
    }
    segments_by_id = {
        segment["id"]: segment
        for segment in package.visual.get("route_segments", [])
        if isinstance(segment, dict) and isinstance(segment.get("id"), str)
    }
    steps = []
    for index, step in enumerate(history, start=1):
        route = routes_by_transition.get(step.transition_id)
        elements: list[str] = []
        route_id = None
        if route is not None:
            route_id = route["id"]
            for segment_id in route.get("segments", []):
                segment = segments_by_id.get(segment_id)
                if segment is not None and isinstance(segment.get("element"), str):
                    elements.append(segment["element"][1:])
        steps.append(
            {
                "index": index,
                "transition": step.transition_id,
                "route": route_id,
                "elements": elements,
                "source": str(step.source),
                "target": str(step.target),
            }
        )

    payload = json.dumps(steps)
    transitions = [
        {
            "id": transition.id,
            "source": str(transition.source),
            "target": str(transition.target),
            "input": transition.input,
            "fromPort": transition.from_port,
        }
        for transition in (package.port_graph.transitions if package.port_graph is not None else [])
    ]
    action_presentations = {
        action["transition_id"]: action
        for action in package.visual.get("action_presentations", [])
        if isinstance(action, dict) and isinstance(action.get("transition_id"), str)
    }
    activation_points = {
        activation["transition_id"]: activation
        for activation in package.visual.get("activation_points", [])
        if isinstance(activation, dict) and isinstance(activation.get("transition_id"), str)
    }
    visual_actions = []
    for transition in transitions:
        action = action_presentations.get(transition["id"], {})
        activation = activation_points.get(transition["id"], {})
        route = routes_by_transition.get(transition["id"], {})
        element_ids: list[str] = []
        for segment_id in route.get("segments", []):
            segment = segments_by_id.get(segment_id)
            if segment is not None and isinstance(segment.get("element"), str):
                element_ids.append(segment["element"][1:])
        visual_actions.append(
            {
                **transition,
                "label": action.get("label", transition["input"]),
                "order": action.get("order", 0),
                "activationElement": str(activation.get("element", ""))[1:] if activation.get("element") else None,
                "route": route.get("id"),
                "elements": element_ids,
            }
        )
    anchors_by_point = {
        str(anchor["logical_object"]): str(anchor["element"])[1:]
        for anchor in package.visual.get("anchors", [])
        if isinstance(anchor, dict)
        and isinstance(anchor.get("logical_object"), str)
        and isinstance(anchor.get("element"), str)
        and str(anchor["element"]).startswith("#")
    }
    view_box = view.get("coordinate_space", {}).get("view_box", [0, 0, 210, 297])
    player_payload = json.dumps(
        {
            "start": str(package.port_graph.start) if package.port_graph is not None else "",
            "goals": [str(goal) for goal in sorted(package.port_graph.goals)] if package.port_graph is not None else [],
            "actions": sorted(visual_actions, key=lambda item: (item["order"], item["id"])),
            "anchors": anchors_by_point,
            "viewBox": view_box,
        }
    )
    title = html.escape(f"{package.manifest['title']} / {solution_id}")
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <style>
    :root {{
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f7f7f4;
      color: #202124;
    }}
    body {{
      margin: 0;
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
    }}
    header {{
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-bottom: 1px solid #d9d8d2;
      background: #ffffff;
    }}
    h1 {{
      font-size: 15px;
      font-weight: 650;
      margin: 0;
      min-width: 210px;
    }}
    button {{
      height: 32px;
      min-width: 34px;
      border: 1px solid #bab9b2;
      background: #fff;
      color: #202124;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 650;
    }}
    button:hover {{ background: #f0f4ff; }}
    input[type="range"] {{
      flex: 1;
      min-width: 180px;
    }}
    output {{
      font-variant-numeric: tabular-nums;
      min-width: 112px;
      font-size: 13px;
    }}
    main {{
      display: grid;
      grid-template-columns: minmax(0, 1fr) 330px;
      min-height: 0;
    }}
    .stage {{
      position: relative;
      min-width: 0;
      min-height: 0;
      overflow: auto;
      padding: 14px;
      background: #ecebe5;
    }}
    .stage svg {{
      width: min(100%, 980px);
      height: auto;
      display: block;
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 1px 8px rgba(0,0,0,.16);
    }}
    aside {{
      border-left: 1px solid #d9d8d2;
      background: #fff;
      padding: 12px;
      font-size: 13px;
      min-height: 0;
      display: grid;
      grid-template-rows: auto auto auto auto auto minmax(0, 1fr);
      gap: 0;
    }}
    #steps {{
      min-height: 0;
      overflow: auto;
      overscroll-behavior: contain;
      border-top: 1px solid #ecebe5;
    }}
    .step {{
      display: grid;
      grid-template-columns: 40px 1fr;
      gap: 8px;
      padding: 7px 6px;
      border-bottom: 1px solid #ecebe5;
    }}
    .step.active {{
      background: #eef4ff;
      outline: 1px solid #99b8ff;
    }}
    .panel-title {{
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: #555;
      margin: 6px 0 8px;
    }}
    .player-state {{
      display: grid;
      gap: 4px;
      padding: 8px;
      border: 1px solid #dddcd6;
      border-radius: 6px;
      background: #fafaf8;
      margin-bottom: 10px;
      font-variant-numeric: tabular-nums;
    }}
    .context-badge {{
      position: sticky;
      top: 10px;
      width: fit-content;
      max-width: calc(100% - 20px);
      margin: 0 0 -34px 10px;
      padding: 5px 8px;
      border: 1px solid rgba(32,33,36,.2);
      border-radius: 6px;
      background: rgba(255,255,255,.9);
      color: #202124;
      font-size: 12px;
      font-weight: 700;
      z-index: 2;
      box-shadow: 0 1px 4px rgba(0,0,0,.12);
    }}
    .actions {{
      display: grid;
      gap: 6px;
      margin-bottom: 14px;
    }}
    .action {{
      width: 100%;
      height: auto;
      min-height: 34px;
      text-align: left;
      padding: 7px 8px;
      font-weight: 600;
    }}
    .num {{
      font-variant-numeric: tabular-nums;
      color: #666;
    }}
    .transition {{
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      overflow-wrap: anywhere;
    }}
    .meta {{
      color: #666;
      margin-top: 2px;
    }}
    svg .fmaze-overlay {{
      pointer-events: none;
    }}
    svg .fmaze-overlay-route {{
      fill: none !important;
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
      vector-effect: non-scaling-stroke;
    }}
    svg .fmaze-visited {{
      stroke: rgba(242,183,5,.42) !important;
      stroke-width: 7px !important;
    }}
    svg .fmaze-current {{
      stroke: #0b5fff !important;
      stroke-width: 8px !important;
      filter: drop-shadow(0 0 2px rgba(11,95,255,.75));
    }}
    svg .fmaze-preview {{
      stroke: #d35c00 !important;
      stroke-width: 6px !important;
      filter: drop-shadow(0 0 2px rgba(211,92,0,.75));
    }}
    svg .fmaze-marker {{
      vector-effect: non-scaling-stroke;
      stroke-width: 1.8px;
      paint-order: stroke fill;
    }}
    svg .fmaze-available {{
      fill: rgba(18,161,80,.16);
      stroke: #12a150;
      filter: drop-shadow(0 0 1.5px rgba(18,161,80,.7));
    }}
    svg .fmaze-focus {{
      fill: #c21d32;
      stroke: #ffffff;
      filter: drop-shadow(0 0 1.8px rgba(194,29,50,.8));
    }}
    @media (max-width: 820px) {{
      main {{ grid-template-columns: 1fr; }}
      aside {{ border-left: 0; border-top: 1px solid #d9d8d2; max-height: 38vh; }}
      header {{ flex-wrap: wrap; }}
      h1 {{ min-width: 100%; }}
    }}
  </style>
</head>
<body>
  <header>
    <h1>{title}</h1>
    <button id="prev" title="Previous replay step">Prev</button>
    <button id="play" title="Play or pause replay">Play</button>
    <button id="next" title="Next replay step">Next</button>
    <input id="slider" type="range" min="0" max="{len(steps)}" value="0">
    <output id="status">0 / {len(steps)}</output>
  </header>
  <main>
    <div class="stage">
      <div id="context-badge" class="context-badge">Top layer</div>
      {svg}
    </div>
    <aside>
      <div class="panel-title">Player</div>
      <div class="player-state">
        <div>State: <strong id="player-state"></strong></div>
        <div>Goal: <strong id="player-goal"></strong></div>
      </div>
      <div id="actions" class="actions"></div>
      <button id="undo" title="Undo last player move">Undo</button>
      <button id="reset" title="Reset player">Reset</button>
      <div class="panel-title">Replay</div>
      <div id="steps"></div>
    </aside>
  </main>
  <script>
    const steps = {payload};
    const player = {player_payload};
    let index = 0;
    let timer = null;
    let playerState = parseAddress(player.start);
    let playerHistory = [];
    let cameraAnimation = null;
    let cameraContext = null;
    const slider = document.getElementById('slider');
    const status = document.getElementById('status');
    const list = document.getElementById('steps');
    const play = document.getElementById('play');
    const actions = document.getElementById('actions');
    const playerStateLabel = document.getElementById('player-state');
    const playerGoalLabel = document.getElementById('player-goal');
    const contextBadge = document.getElementById('context-badge');
    const svgRoot = document.querySelector('.stage svg');
    let overlayLayer = null;

    function byId(id) {{
      return document.getElementById(id);
    }}

    function overlay() {{
      if (!svgRoot) return null;
      if (!overlayLayer) {{
        overlayLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        overlayLayer.setAttribute('class', 'fmaze-overlay');
        svgRoot.appendChild(overlayLayer);
      }}
      return overlayLayer;
    }}

    function clearOverlay() {{
      const layer = overlay();
      if (layer) layer.innerHTML = '';
    }}

    function allElements() {{
      return [...new Set([
        ...steps.flatMap(step => step.elements),
        ...player.actions.flatMap(action => [...action.elements, action.activationElement].filter(Boolean)),
        ...Object.values(player.anchors)
      ])].map(byId).filter(Boolean);
    }}

    function parseAddress(raw) {{
      const parts = String(raw).split('.').filter(Boolean);
      return {{ prefix: parts.slice(0, -1), point: parts[parts.length - 1] || '' }};
    }}

    function renderAddress(address) {{
      return [...address.prefix, address.point].filter(Boolean).join('.');
    }}

    function renderContext(address, mode) {{
      const layer = address.prefix.length ? `Submaze ${{address.prefix.join('.')}}` : 'Top layer';
      contextBadge.textContent = mode === 'replay' ? `Replay: ${{layer}}` : layer;
    }}

    function suffixMatches(prefix, suffix) {{
      if (suffix.length === 0) return true;
      if (prefix.length < suffix.length) return false;
      return suffix.every((part, offset) => prefix[prefix.length - suffix.length + offset] === part);
    }}

    function actionMatches(address, action) {{
      const source = parseAddress(action.source);
      return address.point === source.point && suffixMatches(address.prefix, source.prefix);
    }}

    function applyAction(address, action) {{
      const source = parseAddress(action.source);
      const target = parseAddress(action.target);
      const base = source.prefix.length === 0 ? address.prefix : address.prefix.slice(0, -source.prefix.length);
      return {{ prefix: [...base, ...target.prefix], point: target.point }};
    }}

    function clearVisualClasses() {{
      for (const el of allElements()) {{
        el.onclick = null;
        el.style.cursor = '';
      }}
      clearOverlay();
    }}

    function clearReplayRows() {{
      document.querySelectorAll('.step.active').forEach(row => row.classList.remove('active'));
    }}

    function cloneRoute(ids, className) {{
      const layer = overlay();
      if (!layer) return;
      for (const id of ids) {{
        const source = byId(id);
        if (!source) continue;
        const clone = source.cloneNode(true);
        clone.removeAttribute('id');
        clone.removeAttribute('style');
        clone.setAttribute('class', `fmaze-overlay-route ${{className}}`);
        layer.appendChild(clone);
      }}
    }}

    function elementCenter(id) {{
      const el = byId(id);
      if (!el) return null;
      const box = el.getBBox();
      return {{ x: box.x + box.width / 2, y: box.y + box.height / 2 }};
    }}

    function drawMarker(id, className, radius) {{
      const center = elementCenter(id);
      const layer = overlay();
      if (!center || !layer) return;
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      marker.setAttribute('class', `fmaze-marker ${{className}}`);
      marker.setAttribute('cx', center.x);
      marker.setAttribute('cy', center.y);
      marker.setAttribute('r', radius);
      layer.appendChild(marker);
    }}

    function renderList() {{
      list.innerHTML = steps.map(step => `
        <div class="step" id="row-${{step.index}}">
          <div class="num">${{String(step.index).padStart(3, '0')}}</div>
          <div>
            <div class="transition">${{step.transition}}</div>
            <div class="meta">${{step.source}} -> ${{step.target}}</div>
          </div>
        </div>
      `).join('');
    }}

    function setIndex(next) {{
      index = Math.max(0, Math.min(steps.length, next));
      slider.value = index;
      status.value = `${{index}} / ${{steps.length}}`;
      renderReplay();
    }}

    function replayAddress() {{
      return index > 0 ? parseAddress(steps[index - 1].target) : parseAddress(player.start);
    }}

    function renderReplay() {{
      clearVisualClasses();
      clearReplayRows();
      for (let i = 0; i < index; i++) {{
        cloneRoute(steps[i].elements, 'fmaze-visited');
      }}
      if (index > 0) {{
        const current = steps[index - 1];
        cloneRoute(current.elements, 'fmaze-current');
        const row = byId(`row-${{current.index}}`);
        row?.classList.add('active');
        if (row) {{
          list.scrollTop = row.offsetTop - list.clientHeight / 2 + row.clientHeight / 2;
        }}
      }}
      const state = replayAddress();
      const anchorId = player.anchors[state.point];
      if (anchorId) drawMarker(anchorId, 'fmaze-focus', 2.8);
      renderContext(state, 'replay');
      updateCameraForState(state, [], 'replay');
    }}

    function legalActions() {{
      return legalActionsFor(playerState);
    }}

    function legalActionsFor(address) {{
      return player.actions.filter(action => actionMatches(address, action));
    }}

    function renderPlayer() {{
      clearVisualClasses();
      clearReplayRows();
      for (const entry of playerHistory) {{
        cloneRoute(entry.elements, 'fmaze-visited');
      }}
      const stateText = renderAddress(playerState);
      renderContext(playerState, 'player');
      playerStateLabel.textContent = stateText;
      playerGoalLabel.textContent = player.goals.includes(stateText) ? 'reached' : 'not reached';
      const available = legalActions();
      const anchorId = player.anchors[playerState.point];
      if (anchorId) drawMarker(anchorId, 'fmaze-focus', 2.8);
      actions.innerHTML = available.map((action, actionIndex) => `
        <button class="action" data-transition="${{action.id}}">
          ${{actionIndex + 1}}. ${{action.label}} <span class="meta">${{action.target}}</span>
        </button>
      `).join('') || '<div class="meta">No legal actions</div>';
      for (const action of available) {{
        if (action.activationElement) drawMarker(action.activationElement, 'fmaze-available', 4.4);
      }}
      actions.querySelectorAll('button[data-transition]').forEach(button => {{
        const action = player.actions.find(candidate => candidate.id === button.dataset.transition);
        button.addEventListener('mouseenter', () => cloneRoute(action.elements, 'fmaze-preview'));
        button.addEventListener('mouseleave', () => {{
          renderPlayer();
        }});
        button.addEventListener('click', () => commitAction(action));
      }});
      const activationCounts = available.reduce((counts, action) => {{
        if (action.activationElement) counts[action.activationElement] = (counts[action.activationElement] || 0) + 1;
        return counts;
      }}, {{}});
      for (const action of available) {{
        const el = action.activationElement ? byId(action.activationElement) : null;
        if (el && activationCounts[action.activationElement] === 1) {{
          el.onclick = () => commitAction(action);
          el.style.cursor = 'pointer';
        }}
      }}
      updateCameraForState(playerState, available, 'player');
    }}

    function elementBounds(ids) {{
      const boxes = ids.map(byId).filter(Boolean).map(el => el.getBBox());
      if (boxes.length === 0) return null;
      const minX = Math.min(...boxes.map(box => box.x));
      const minY = Math.min(...boxes.map(box => box.y));
      const maxX = Math.max(...boxes.map(box => box.x + box.width));
      const maxY = Math.max(...boxes.map(box => box.y + box.height));
      return {{ x: minX, y: minY, width: maxX - minX, height: maxY - minY }};
    }}

    function paddedViewBox(bounds, pad) {{
      const root = player.viewBox;
      const rootAspect = root[2] / root[3];
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      let width = Math.max(44, bounds.width + pad * 2);
      let height = Math.max(44 / rootAspect, bounds.height + pad * 2);
      if (width / height > rootAspect) {{
        height = width / rootAspect;
      }} else {{
        width = height * rootAspect;
      }}
      width = Math.min(width, root[2]);
      height = Math.min(height, root[3]);
      let x = centerX - width / 2;
      let y = centerY - height / 2;
      x = Math.max(root[0], Math.min(x, root[0] + root[2] - width));
      y = Math.max(root[1], Math.min(y, root[1] + root[3] - height));
      return [x, y, width, height];
    }}

    function parseViewBox() {{
      const raw = svgRoot?.getAttribute('viewBox');
      const values = raw ? raw.split(/\\s+/).map(Number).filter(Number.isFinite) : [];
      return values.length === 4 ? values : player.viewBox;
    }}

    function setViewBox(values) {{
      svgRoot.setAttribute('viewBox', values.map(value => value.toFixed(3).replace(/\\.000$/, '')).join(' '));
    }}

    function moveCamera(target, animated) {{
      if (!svgRoot) return;
      if (cameraAnimation) cancelAnimationFrame(cameraAnimation);
      if (!animated) {{
        setViewBox(target);
        return;
      }}
      const start = parseViewBox();
      const duration = 360;
      const startTime = performance.now();
      function frame(now) {{
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const next = start.map((value, offset) => value + (target[offset] - value) * eased);
        setViewBox(next);
        if (t < 1) {{
          cameraAnimation = requestAnimationFrame(frame);
        }} else {{
          cameraAnimation = null;
        }}
      }}
      cameraAnimation = requestAnimationFrame(frame);
    }}

    function updateCameraForState(state, available, mode) {{
      if (!svgRoot || !Array.isArray(player.viewBox)) return;
      const nextContext = `${{mode}}:${{state.prefix.join('.')}}`;
      if (nextContext === cameraContext) return;
      cameraContext = nextContext;
      if (state.prefix.length === 0) {{
        moveCamera(player.viewBox, true);
        return;
      }}
      const focusIds = [
        player.anchors[state.point],
        ...available.map(action => action.activationElement)
      ].filter(Boolean);
      const bounds = elementBounds(focusIds);
      if (!bounds) {{
        moveCamera(player.viewBox, true);
        return;
      }}
      moveCamera(paddedViewBox(bounds, 22), true);
    }}

    function commitAction(action) {{
      stop();
      index = 0;
      slider.value = 0;
      status.value = `0 / ${{steps.length}}`;
      playerState = applyAction(playerState, action);
      playerHistory.push(action);
      renderPlayer();
    }}

    function resetPlayer() {{
      stop();
      index = 0;
      slider.value = 0;
      status.value = `0 / ${{steps.length}}`;
      playerState = parseAddress(player.start);
      playerHistory = [];
      renderPlayer();
    }}

    function stop() {{
      clearInterval(timer);
      timer = null;
      play.textContent = 'Play';
    }}

    renderList();
    setIndex(0);
    slider.addEventListener('input', event => setIndex(Number(event.target.value)));
    document.getElementById('prev').addEventListener('click', () => setIndex(index - 1));
    document.getElementById('next').addEventListener('click', () => setIndex(index + 1));
    play.addEventListener('click', () => {{
      if (timer) {{
        stop();
        return;
      }}
      play.textContent = 'Pause';
      timer = setInterval(() => {{
        if (index >= steps.length) {{
          stop();
          return;
        }}
        setIndex(index + 1);
      }}, 650);
    }});
    document.getElementById('undo').addEventListener('click', () => {{
      stop();
      playerHistory.pop();
      playerState = playerHistory.reduce((state, action) => applyAction(state, action), parseAddress(player.start));
      renderPlayer();
    }});
    document.getElementById('reset').addEventListener('click', resetPlayer);
    window.addEventListener('keydown', event => {{
      if (event.key === 'ArrowLeft') setIndex(index - 1);
      if (event.key === 'ArrowRight') setIndex(index + 1);
      if (/^[1-9]$/.test(event.key)) {{
        const action = legalActions()[Number(event.key) - 1];
        if (action) commitAction(action);
      }}
      if (event.key === ' ') {{
        event.preventDefault();
        play.click();
      }}
    }});
  </script>
</body>
</html>
"""


if __name__ == "__main__":
    raise SystemExit(main())
