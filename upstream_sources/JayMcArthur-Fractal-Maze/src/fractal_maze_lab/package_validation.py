from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET

import yaml
from jsonschema import Draft202012Validator

from .logic_core import Address, AddressGraph, Connection, ExecutionError, ProofEdge, ProofPathStep
from .tiled_port_graph import Terminal, TiledPortEdge, TiledPortGraph, TiledState


@dataclass(frozen=True)
class ValidationIssue:
    path: str
    message: str

    def format(self) -> str:
        return f"{self.path}: {self.message}"


@dataclass(frozen=True)
class PackageValidationResult:
    issues: tuple[ValidationIssue, ...]

    @property
    def valid(self) -> bool:
        return not self.issues


def validate_package_file(path: str | Path) -> PackageValidationResult:
    manifest_path = Path(path)
    issues: list[ValidationIssue] = []
    manifest = _load_yaml_mapping(manifest_path, str(manifest_path), issues)
    if manifest is None:
        return PackageValidationResult(tuple(issues))

    root = manifest_path.parent
    _validate_schema(manifest, "package.schema.json", str(manifest_path), issues)
    _validate_manifest(manifest, str(manifest_path), issues)

    logic: dict[str, Any] | None = None
    logic_ref = manifest.get("logic")
    if isinstance(logic_ref, dict) and isinstance(logic_ref.get("href"), str):
        logic_path = root / logic_ref["href"]
        logic = _load_yaml_mapping(logic_path, _display_path(logic_path), issues)
        if logic is not None:
            _validate_schema(logic, "logic.schema.json", _display_path(logic_path), issues)
            if logic.get("format") != logic_ref.get("format"):
                issues.append(ValidationIssue(_display_path(logic_path), "logic format does not match package reference"))
            _validate_logic(logic, _display_path(logic_path), issues)
    validation_runtime = _build_validation_runtime(logic) if logic is not None else None
    transition_ids = set(validation_runtime[1]) if validation_runtime is not None else _collect_transition_ids(logic)
    proof_edge_ids = set(validation_runtime[2]) if validation_runtime is not None else _collect_proof_edge_ids(logic)

    visual_ref = manifest.get("visual")
    if isinstance(visual_ref, dict) and isinstance(visual_ref.get("href"), str):
        visual_path = root / visual_ref["href"]
        visual = _load_yaml_mapping(visual_path, _display_path(visual_path), issues)
        if visual is not None:
            _validate_schema(visual, "visual.schema.json", _display_path(visual_path), issues)
            if visual.get("format") != visual_ref.get("format"):
                issues.append(ValidationIssue(_display_path(visual_path), "visual format does not match package reference"))
            _validate_visual(
                visual,
                _display_path(visual_path),
                root,
                manifest,
                logic_ref,
                logic,
                transition_ids,
                proof_edge_ids,
                issues,
            )

    for index, solution_ref in enumerate(_list_value(manifest, "solutions"), start=1):
        ref_path = f"{manifest_path}:solutions[{index}]"
        if not isinstance(solution_ref, dict):
            issues.append(ValidationIssue(ref_path, "solution reference must be a mapping"))
            continue
        _require_field(solution_ref, "id", ref_path, issues)
        _require_field(solution_ref, "href", ref_path, issues)
        if solution_ref.get("format") != "fmaze-solution-v0":
            issues.append(ValidationIssue(ref_path, f"unsupported solution format {solution_ref.get('format')!r}"))
        if isinstance(solution_ref.get("href"), str):
            solution_path = root / solution_ref["href"]
            solution = _load_yaml_mapping(solution_path, _display_path(solution_path), issues)
            if solution is not None:
                _validate_schema(solution, "solution.schema.json", _display_path(solution_path), issues)
                _validate_solution(
                    solution,
                    _display_path(solution_path),
                    transition_ids,
                    proof_edge_ids,
                    validation_runtime,
                    issues,
                )

    return PackageValidationResult(tuple(issues))


def _validate_manifest(manifest: dict[str, Any], path: str, issues: list[ValidationIssue]) -> None:
    for field in ("format", "id", "title", "primary_authoring", "logic"):
        _require_field(manifest, field, path, issues)
    if manifest.get("format") != "fmaze-package-v0":
        issues.append(ValidationIssue(path, f"unsupported package format {manifest.get('format')!r}"))
    if manifest.get("primary_authoring") not in {
        "port_graph",
        "fractal_block_pattern",
        "repeated_tile_ports",
        "reference_record",
    }:
        issues.append(ValidationIssue(path, f"unsupported primary_authoring {manifest.get('primary_authoring')!r}"))
    logic_ref = manifest.get("logic")
    if not isinstance(logic_ref, dict):
        issues.append(ValidationIssue(path, "logic must be a mapping"))
    else:
        _require_field(logic_ref, "href", f"{path}:logic", issues)
        if logic_ref.get("format") != "fmaze-logic-v0":
            issues.append(ValidationIssue(f"{path}:logic", f"unsupported logic format {logic_ref.get('format')!r}"))
    if "solutions" in manifest and not isinstance(manifest["solutions"], list):
        issues.append(ValidationIssue(path, "solutions must be a list"))
    visual_ref = manifest.get("visual")
    if visual_ref is not None:
        if not isinstance(visual_ref, dict):
            issues.append(ValidationIssue(path, "visual must be a mapping"))
        else:
            _require_field(visual_ref, "href", f"{path}:visual", issues)
            if visual_ref.get("format") != "fmaze-visual-v0":
                issues.append(ValidationIssue(f"{path}:visual", f"unsupported visual format {visual_ref.get('format')!r}"))


def _validate_logic(logic: dict[str, Any], path: str, issues: list[ValidationIssue]) -> None:
    for field in ("format", "id", "strategy", "source_model"):
        _require_field(logic, field, path, issues)
    if logic.get("format") != "fmaze-logic-v0":
        issues.append(ValidationIssue(path, f"unsupported logic format {logic.get('format')!r}"))
    if logic.get("strategy") not in {"pda_stack", "coordinate_path", "tiled_port_graph", "reference_record"}:
        issues.append(ValidationIssue(path, f"unsupported strategy {logic.get('strategy')!r}"))
    if logic.get("source_model") not in {"port_graph", "fractal_block_pattern", "repeated_tile_ports", "reference_record"}:
        issues.append(ValidationIssue(path, f"unsupported source_model {logic.get('source_model')!r}"))
    if logic.get("strategy") == "reference_record" or logic.get("source_model") == "reference_record":
        _validate_reference_record_logic(logic, path, issues)
        return
    for field in ("start", "goals"):
        _require_field(logic, field, path, issues)

    if logic.get("strategy") == "coordinate_path" or logic.get("source_model") == "fractal_block_pattern":
        _validate_fractal_block_logic(logic, path, issues)
        return
    if logic.get("strategy") == "tiled_port_graph" or logic.get("source_model") == "repeated_tile_ports":
        _validate_tiled_port_graph_logic(logic, path, issues)
        return

    if logic.get("strategy") != "pda_stack" or logic.get("source_model") != "port_graph":
        return

    _validate_unique_ids(_list_value(logic, "points"), "point", path, issues)
    ports = _list_value(logic, "ports")
    _validate_unique_ids(ports, "port", path, issues)

    port_ids = {item["id"] for item in ports if isinstance(item, dict) and isinstance(item.get("id"), str)}
    transition_ids: set[str] = set()
    for index, transition in enumerate(_list_value(logic, "transitions"), start=1):
        _validate_transition(transition, f"{path}:transitions[{index}]", port_ids, transition_ids, issues)

    group_ids: set[str] = set()
    for index, group in enumerate(_list_value(logic, "transition_groups"), start=1):
        group_path = f"{path}:transition_groups[{index}]"
        if not isinstance(group, dict):
            issues.append(ValidationIssue(group_path, "transition group must be a mapping"))
            continue
        group_id = group.get("id")
        if not isinstance(group_id, str):
            issues.append(ValidationIssue(group_path, "missing required field 'id'"))
        elif group_id in group_ids:
            issues.append(ValidationIssue(group_path, f"duplicate transition group id {group_id!r}"))
        else:
            group_ids.add(group_id)
        direction = group.get("direction")
        if direction not in {"one_way", "two_way"}:
            issues.append(ValidationIssue(group_path, f"unsupported transition group direction {direction!r}"))
        keys = [key for key in ("forward", "reverse") if key in group]
        if direction == "one_way" and keys != ["forward"]:
            issues.append(ValidationIssue(group_path, "one_way group must contain only forward"))
        if direction == "two_way" and keys != ["forward", "reverse"]:
            issues.append(ValidationIssue(group_path, "two_way group must contain forward and reverse"))
        for key in keys:
            _validate_transition(group[key], f"{group_path}:{key}", port_ids, transition_ids, issues)
    _validate_proof_edges(_list_value(logic, "proof_edges"), path, transition_ids, issues)


def _validate_reference_record_logic(logic: dict[str, Any], path: str, issues: list[ValidationIssue]) -> None:
    if logic.get("strategy") != "reference_record":
        issues.append(ValidationIssue(path, "reference_record source_model must use reference_record strategy"))
    if logic.get("source_model") != "reference_record":
        issues.append(ValidationIssue(path, "reference_record strategy must use reference_record source_model"))
    status = logic.get("modeling_status")
    if not isinstance(status, dict):
        issues.append(ValidationIssue(path, "reference record must include modeling_status"))
        return
    if status.get("status") not in {"reference_only", "planned", "partial", "playable", "solved"}:
        issues.append(ValidationIssue(f"{path}:modeling_status", f"unsupported status {status.get('status')!r}"))


def _validate_fractal_block_logic(logic: dict[str, Any], path: str, issues: list[ValidationIssue]) -> None:
    if logic.get("strategy") != "coordinate_path":
        issues.append(ValidationIssue(path, "fractal_block_pattern logic must use coordinate_path strategy"))
    if logic.get("source_model") != "fractal_block_pattern":
        issues.append(ValidationIssue(path, "coordinate_path logic currently requires fractal_block_pattern source_model"))

    pattern = logic.get("pattern")
    if not isinstance(pattern, dict):
        issues.append(ValidationIssue(path, "missing required mapping 'pattern'"))
        return
    rows = pattern.get("rows")
    pattern_path = f"{path}:pattern"
    if not isinstance(rows, list) or not rows:
        issues.append(ValidationIssue(pattern_path, "rows must be a non-empty list"))
        return
    unit = len(rows)
    for y, row in enumerate(rows):
        row_path = f"{pattern_path}.rows[{y}]"
        if not isinstance(row, list):
            issues.append(ValidationIssue(row_path, "row must be a list"))
            continue
        if len(row) != unit:
            issues.append(ValidationIssue(row_path, f"row length {len(row)} does not match square unit {unit}"))
        for x, value in enumerate(row):
            if value not in (0, 1):
                issues.append(ValidationIssue(f"{row_path}[{x}]", "cell must be 0 or 1"))

    for section in ("entry", "goal"):
        value = logic.get(section)
        section_path = f"{path}:{section}"
        if not isinstance(value, dict):
            issues.append(ValidationIssue(section_path, f"{section} must be a mapping"))
            continue
        if value.get("direction") not in {"west", "east", "north", "south"}:
            issues.append(ValidationIssue(section_path, f"unsupported direction {value.get('direction')!r}"))

    solver = logic.get("solver")
    if solver is not None:
        if not isinstance(solver, dict):
            issues.append(ValidationIssue(f"{path}:solver", "solver must be a mapping"))
        elif not isinstance(solver.get("default_depth_limit"), int) or solver.get("default_depth_limit") < 1:
            issues.append(ValidationIssue(f"{path}:solver", "default_depth_limit must be a positive integer"))


def _validate_tiled_port_graph_logic(logic: dict[str, Any], path: str, issues: list[ValidationIssue]) -> None:
    if logic.get("strategy") != "tiled_port_graph":
        issues.append(ValidationIssue(path, "repeated_tile_ports logic must use tiled_port_graph strategy"))
    if logic.get("source_model") != "repeated_tile_ports":
        issues.append(ValidationIssue(path, "tiled_port_graph logic currently requires repeated_tile_ports source_model"))

    start = _parse_tiled_state_for_validation(logic.get("start"), f"{path}:start", issues)
    goals = [
        state
        for index, goal in enumerate(_list_value(logic, "goals"), start=1)
        if (state := _parse_tiled_state_for_validation(goal, f"{path}:goals[{index}]", issues)) is not None
    ]
    block_classes = logic.get("block_classes")
    if not isinstance(block_classes, dict):
        issues.append(ValidationIssue(path, "missing required mapping 'block_classes'"))
        return
    expected_classes = {"normal", "nx", "ny", "zero"}
    actual_classes = set(block_classes)
    for missing in sorted(expected_classes - actual_classes):
        issues.append(ValidationIssue(f"{path}:block_classes", f"missing block class {missing!r}"))
    for extra in sorted(actual_classes - expected_classes):
        issues.append(ValidationIssue(f"{path}:block_classes", f"unknown block class {extra!r}"))

    sections: dict[str, list[str]] = {}
    for block_class in sorted(expected_classes):
        class_path = f"{path}:block_classes:{block_class}"
        block_data = block_classes.get(block_class)
        if not isinstance(block_data, dict):
            issues.append(ValidationIssue(class_path, "block class must be a mapping"))
            continue
        edges = block_data.get("edges")
        if not isinstance(edges, list):
            issues.append(ValidationIssue(class_path, "edges must be a list"))
            continue
        raw_edges: list[str] = []
        for index, edge in enumerate(edges, start=1):
            edge_path = f"{class_path}:edges[{index}]"
            if not isinstance(edge, str):
                issues.append(ValidationIssue(edge_path, "edge must be a string"))
                continue
            try:
                TiledPortEdge.parse(edge)
            except ValueError as exc:
                issues.append(ValidationIssue(edge_path, str(exc)))
                continue
            raw_edges.append(edge)
        sections[block_class] = raw_edges

    if start is not None and goals and not any(issue.path.startswith(f"{path}:block_classes") for issue in issues):
        graph = TiledPortGraph.from_sections(str(logic.get("id", "")), sections, start=start, goals=set(goals))
        for error in graph.validation_errors():
            issues.append(ValidationIssue(path, error))

    solver = logic.get("solver")
    if solver is not None:
        if not isinstance(solver, dict):
            issues.append(ValidationIssue(f"{path}:solver", "solver must be a mapping"))
        elif "default_state_limit" in solver and (
            not isinstance(solver.get("default_state_limit"), int) or solver.get("default_state_limit") < 1
        ):
            issues.append(ValidationIssue(f"{path}:solver", "default_state_limit must be a positive integer"))


def _parse_tiled_state_for_validation(raw: Any, path: str, issues: list[ValidationIssue]) -> TiledState | None:
    if not isinstance(raw, dict):
        issues.append(ValidationIssue(path, "tiled state must be a mapping"))
        return None
    for field in ("x", "y", "terminal"):
        _require_field(raw, field, path, issues)
    if not isinstance(raw.get("x"), int) or raw.get("x") < 0:
        issues.append(ValidationIssue(path, "x must be a non-negative integer"))
        return None
    if not isinstance(raw.get("y"), int) or raw.get("y") < 0:
        issues.append(ValidationIssue(path, "y must be a non-negative integer"))
        return None
    try:
        terminal = Terminal.parse(str(raw.get("terminal")))
    except ValueError as exc:
        issues.append(ValidationIssue(path, str(exc)))
        return None
    return TiledState(raw["x"], raw["y"], terminal)


def _validate_transition(
    transition: Any,
    path: str,
    port_ids: set[str],
    transition_ids: set[str],
    issues: list[ValidationIssue],
) -> None:
    if not isinstance(transition, dict):
        issues.append(ValidationIssue(path, "transition must be a mapping"))
        return
    for field in ("id", "from_port", "source", "target", "input"):
        _require_field(transition, field, path, issues)
    transition_id = transition.get("id")
    if isinstance(transition_id, str):
        if transition_id in transition_ids:
            issues.append(ValidationIssue(path, f"duplicate transition id {transition_id!r}"))
        transition_ids.add(transition_id)
    from_port = transition.get("from_port")
    if isinstance(from_port, str) and from_port not in port_ids:
        issues.append(ValidationIssue(path, f"transition references missing port {from_port!r}"))


def _validate_solution(
    solution: dict[str, Any],
    path: str,
    transition_ids: set[str],
    proof_edge_ids: set[str],
    validation_runtime: tuple[AddressGraph, dict[str, Connection], dict[str, ProofEdge]] | None,
    issues: list[ValidationIssue],
) -> None:
    for field in ("format", "id", "maze", "logic", "steps"):
        _require_field(solution, field, path, issues)
    if solution.get("format") != "fmaze-solution-v0":
        issues.append(ValidationIssue(path, f"unsupported solution format {solution.get('format')!r}"))
    steps = solution.get("steps")
    if not isinstance(steps, list):
        issues.append(ValidationIssue(path, "steps must be a list"))
        return
    for index, step in enumerate(steps, start=1):
        step_path = f"{path}:steps[{index}]"
        if not isinstance(step, dict):
            issues.append(ValidationIssue(step_path, "solution step must be a mapping"))
            continue
        has_transition = "transition_id" in step
        has_proof_edge = "proof_edge_id" in step
        has_prove_edge = "prove_edge_id" in step
        if sum((has_transition, has_proof_edge, has_prove_edge)) != 1:
            issues.append(ValidationIssue(step_path, "step must contain exactly one of 'transition_id', 'proof_edge_id', or 'prove_edge_id'"))
            continue
        transition_id = step.get("transition_id")
        proof_edge_id = step.get("proof_edge_id")
        if has_transition and not isinstance(transition_id, str):
            issues.append(ValidationIssue(step_path, "field 'transition_id' must be a string"))
        elif has_transition and transition_ids and transition_id not in transition_ids:
            issues.append(ValidationIssue(step_path, f"unknown transition {transition_id!r}"))
        if has_proof_edge and not isinstance(proof_edge_id, str):
            issues.append(ValidationIssue(step_path, "field 'proof_edge_id' must be a string"))
        elif has_proof_edge and proof_edge_ids and proof_edge_id not in proof_edge_ids:
            issues.append(ValidationIssue(step_path, f"unknown proof edge {proof_edge_id!r}"))
        prove_edge_id = step.get("prove_edge_id")
        if has_prove_edge and not isinstance(prove_edge_id, str):
            issues.append(ValidationIssue(step_path, "field 'prove_edge_id' must be a string"))
        elif has_prove_edge and proof_edge_ids and prove_edge_id not in proof_edge_ids:
            issues.append(ValidationIssue(step_path, f"unknown proof edge {prove_edge_id!r}"))
    if solution.get("expects_goal") is True and validation_runtime is not None:
        _validate_solution_reaches_goal(solution, path, validation_runtime, issues)


def _validate_solution_reaches_goal(
    solution: dict[str, Any],
    path: str,
    validation_runtime: tuple[AddressGraph, dict[str, Connection], dict[str, ProofEdge]],
    issues: list[ValidationIssue],
) -> None:
    graph, transitions, proof_edges = validation_runtime
    state = graph.initial_state()
    enabled_proof_edges = {edge.id for edge in proof_edges.values() if edge.enabled_by_default}
    for index, step in enumerate(solution.get("steps", []), start=1):
        if not isinstance(step, dict):
            return
        if isinstance(step.get("prove_edge_id"), str):
            proof_edge_id = step["prove_edge_id"]
            edge = proof_edges.get(proof_edge_id)
            if edge is None:
                return
            errors = edge.proof_validation_errors(graph)
            if errors:
                issues.append(ValidationIssue(f"{path}:steps[{index}]", f"submitted proof is invalid: {'; '.join(errors)}"))
                return
            enabled_proof_edges.add(proof_edge_id)
            continue
        if isinstance(step.get("proof_edge_id"), str):
            proof_edge_id = step["proof_edge_id"]
            if proof_edge_id not in proof_edges:
                return
            if proof_edge_id not in enabled_proof_edges:
                issues.append(ValidationIssue(f"{path}:steps[{index}]", f"proof edge {proof_edge_id!r} used before proof submission"))
                return
            try:
                state, _ = graph.apply_proof_edge(state, proof_edge_id)
            except ExecutionError as exc:
                issues.append(ValidationIssue(f"{path}:steps[{index}]", f"solution replay failed: {exc}"))
                return
            continue
        if not isinstance(step.get("transition_id"), str):
            return
        transition_id = step["transition_id"]
        transition = transitions.get(transition_id)
        if transition is None:
            return
        try:
            state, record = graph.apply(graph.with_port(state, transition.from_port or ""), transition.input)
        except ExecutionError as exc:
            issues.append(ValidationIssue(f"{path}:steps[{index}]", f"solution replay failed: {exc}"))
            return
        if record.transition_id != transition_id:
            issues.append(
                ValidationIssue(
                    f"{path}:steps[{index}]",
                    f"solution selected {transition_id!r} but replay applied {record.transition_id!r}",
                )
            )
            return
    if not graph.is_goal(state):
        issues.append(ValidationIssue(path, f"expected goal but replay ended at {state.address}"))


def _build_validation_runtime(logic: dict[str, Any] | None) -> tuple[AddressGraph, dict[str, Connection], dict[str, ProofEdge]] | None:
    if logic is None:
        return None
    if logic.get("strategy") != "pda_stack" or logic.get("source_model") != "port_graph":
        return None
    try:
        graph = AddressGraph(
            id=str(logic["id"]),
            start=Address.parse(str(logic["start"])),
            goals={Address.parse(str(goal)) for goal in logic.get("goals", [])},
        )
        transitions: dict[str, Connection] = {}
        for transition_data in _iter_transition_data(logic):
            transition = Connection(
                id=str(transition_data["id"]),
                source=Address.parse(str(transition_data["source"])),
                target=Address.parse(str(transition_data["target"])),
                input=str(transition_data["input"]),
                from_port=str(transition_data["from_port"]),
            )
            graph.connections.append(transition)
            transitions[transition.id] = transition
        proof_edges: dict[str, ProofEdge] = {}
        for edge_data in _list_value(logic, "proof_edges"):
            proof = edge_data.get("proof", {}) if isinstance(edge_data.get("proof", {}), dict) else {}
            proof_steps = tuple(
                ProofPathStep.parse(str(step["kind"]), str(step["source"]), str(step["target"]))
                for step in proof.get("steps", [])
            )
            edge = ProofEdge.parse(
                id=str(edge_data["id"]),
                source=str(edge_data["source"]),
                target=str(edge_data["target"]),
                input=str(edge_data["input"]),
                proof_type=str(edge_data["proof_type"]),
                status=edge_data["status"],
                explanation=str(edge_data.get("explanation", "")),
                enabled_by_default=bool(edge_data.get("enabled_by_default", False)),
                proof_steps=proof_steps,
                proof_method=proof.get("method"),
            )
            proof_edges[edge.id] = edge
        graph.proof_edges = proof_edges
        return graph, transitions, proof_edges
    except (KeyError, TypeError, ValueError):
        return None


def _collect_transition_ids(logic: dict[str, Any] | None) -> set[str]:
    if logic is None:
        return set()
    ids: set[str] = set()
    for transition in _iter_transition_data(logic):
        if isinstance(transition, dict) and isinstance(transition.get("id"), str):
            ids.add(transition["id"])
    return ids


def _collect_proof_edge_ids(logic: dict[str, Any] | None) -> set[str]:
    if logic is None:
        return set()
    return {
        edge["id"]
        for edge in _list_value(logic, "proof_edges")
        if isinstance(edge, dict) and isinstance(edge.get("id"), str)
    }


def _validate_visual(
    visual: dict[str, Any],
    path: str,
    package_root: Path,
    manifest: dict[str, Any],
    logic_ref: Any,
    logic: dict[str, Any] | None,
    transition_ids: set[str],
    proof_edge_ids: set[str],
    issues: list[ValidationIssue],
) -> None:
    if visual.get("format") != "fmaze-visual-v0":
        issues.append(ValidationIssue(path, f"unsupported visual format {visual.get('format')!r}"))
    if visual.get("maze") != manifest.get("id"):
        issues.append(ValidationIssue(path, f"visual maze does not match package id {manifest.get('id')!r}"))
    if isinstance(logic_ref, dict) and isinstance(logic_ref.get("href"), str) and visual.get("logic") != logic_ref.get("href"):
        issues.append(ValidationIssue(path, f"visual logic reference must be {logic_ref.get('href')!r}"))

    asset_ids: set[str] = set()
    asset_media_types: dict[str, str] = {}
    svg_element_ids_by_asset: dict[str, set[str]] = {}
    for index, asset in enumerate(_list_value(visual, "assets"), start=1):
        asset_path = f"{path}:assets[{index}]"
        if not isinstance(asset, dict):
            issues.append(ValidationIssue(asset_path, "asset must be a mapping"))
            continue
        asset_id = asset.get("id")
        if isinstance(asset_id, str):
            if asset_id in asset_ids:
                issues.append(ValidationIssue(asset_path, f"duplicate asset id {asset_id!r}"))
            asset_ids.add(asset_id)
            if isinstance(asset.get("media_type"), str):
                asset_media_types[asset_id] = asset["media_type"]
        href = asset.get("href")
        if isinstance(asset_id, str) and isinstance(href, str):
            resolved = package_root / href
            if not resolved.exists():
                issues.append(ValidationIssue(asset_path, f"asset href does not exist: {href}"))
            elif asset.get("media_type") == "image/svg+xml":
                svg_element_ids_by_asset[asset_id] = _load_svg_element_ids(resolved, asset_path, issues)

    view_ids: set[str] = set()
    view_asset: dict[str, str] = {}
    default_marked_views: list[str] = []
    for index, view in enumerate(_list_value(visual, "views"), start=1):
        view_path = f"{path}:views[{index}]"
        if not isinstance(view, dict):
            issues.append(ValidationIssue(view_path, "view must be a mapping"))
            continue
        view_id = view.get("id")
        if isinstance(view_id, str):
            if view_id in view_ids:
                issues.append(ValidationIssue(view_path, f"duplicate view id {view_id!r}"))
            view_ids.add(view_id)
            if view.get("default") is True:
                default_marked_views.append(view_id)
        asset_id = view.get("asset")
        if isinstance(view_id, str) and isinstance(asset_id, str):
            view_asset[view_id] = asset_id
            if asset_id not in asset_ids:
                issues.append(ValidationIssue(view_path, f"view references unknown asset {asset_id!r}"))
            else:
                _validate_view_asset_compatibility(view, asset_media_types.get(asset_id), view_path, issues)
    default_view = visual.get("default_view")
    if isinstance(default_view, str) and default_view not in view_ids:
        issues.append(ValidationIssue(path, f"default_view references unknown view {default_view!r}"))
    if len(default_marked_views) > 1:
        issues.append(ValidationIssue(path, f"multiple views marked default: {', '.join(default_marked_views)}"))
    if isinstance(default_view, str) and default_marked_views and default_view not in default_marked_views:
        issues.append(ValidationIssue(path, f"default_view {default_view!r} does not match view marked default"))

    logic_object_ids = _collect_visual_logic_object_ids(logic, transition_ids, proof_edge_ids)
    port_ids = _collect_port_ids(logic)
    transition_from_ports = _collect_transition_from_ports(logic)
    transition_group_ids = _collect_transition_group_ids(logic)

    for index, anchor in enumerate(_list_value(visual, "anchors"), start=1):
        anchor_path = f"{path}:anchors[{index}]"
        if not isinstance(anchor, dict):
            issues.append(ValidationIssue(anchor_path, "anchor must be a mapping"))
            continue
        _validate_view_reference(anchor, "view", view_ids, anchor_path, issues)
        logical_object = anchor.get("logical_object")
        if isinstance(logical_object, str) and logical_object not in logic_object_ids:
            issues.append(ValidationIssue(anchor_path, f"anchor references unknown logical object {logical_object!r}"))
        _validate_visual_element_reference(anchor, view_asset, svg_element_ids_by_asset, anchor_path, issues)

    activation_ids: set[str] = set()
    for index, activation in enumerate(_list_value(visual, "activation_points"), start=1):
        activation_path = f"{path}:activation_points[{index}]"
        if not isinstance(activation, dict):
            issues.append(ValidationIssue(activation_path, "activation point must be a mapping"))
            continue
        _collect_visual_id(activation, activation_ids, "activation point", activation_path, issues)
        _validate_view_reference(activation, "view", view_ids, activation_path, issues)
        _validate_transition_reference(activation, "transition_id", transition_ids, activation_path, issues)
        _validate_reference_set(activation, "port_id", port_ids, "port", activation_path, issues)
        transition_id = activation.get("transition_id")
        port_id = activation.get("port_id")
        if isinstance(transition_id, str) and isinstance(port_id, str):
            expected_port = transition_from_ports.get(transition_id)
            if expected_port is not None and expected_port != port_id:
                issues.append(
                    ValidationIssue(
                        activation_path,
                        f"activation point port {port_id!r} does not match transition {transition_id!r} from_port {expected_port!r}",
                    )
                )
        _validate_visual_element_reference(activation, view_asset, svg_element_ids_by_asset, activation_path, issues)

    route_segment_ids: set[str] = set()
    for index, segment in enumerate(_list_value(visual, "route_segments"), start=1):
        segment_path = f"{path}:route_segments[{index}]"
        if not isinstance(segment, dict):
            issues.append(ValidationIssue(segment_path, "route segment must be a mapping"))
            continue
        _collect_visual_id(segment, route_segment_ids, "route segment", segment_path, issues)
        _validate_view_reference(segment, "view", view_ids, segment_path, issues)
        _validate_visual_element_reference(segment, view_asset, svg_element_ids_by_asset, segment_path, issues)

    route_ids: set[str] = set()
    for index, route in enumerate(_list_value(visual, "routes"), start=1):
        route_path = f"{path}:routes[{index}]"
        if not isinstance(route, dict):
            issues.append(ValidationIssue(route_path, "route must be a mapping"))
            continue
        _collect_visual_id(route, route_ids, "route", route_path, issues)
        _validate_transition_reference(route, "transition_id", transition_ids, route_path, issues)
        _validate_reference_set(route, "transition_group_id", transition_group_ids, "transition group", route_path, issues)
        for segment_id in _list_value(route, "segments"):
            if isinstance(segment_id, str) and segment_id not in route_segment_ids:
                issues.append(ValidationIssue(route_path, f"route references unknown route segment {segment_id!r}"))

    for index, action in enumerate(_list_value(visual, "action_presentations"), start=1):
        action_path = f"{path}:action_presentations[{index}]"
        if not isinstance(action, dict):
            issues.append(ValidationIssue(action_path, "action presentation must be a mapping"))
            continue
        _validate_transition_reference(action, "transition_id", transition_ids, action_path, issues)
        _validate_reference_set(action, "activation_point", activation_ids, "activation point", action_path, issues)
        _validate_reference_set(action, "route", route_ids, "route", action_path, issues)


def _load_svg_element_ids(path: Path, display_path: str, issues: list[ValidationIssue]) -> set[str]:
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        issues.append(ValidationIssue(display_path, f"invalid SVG XML: {exc}"))
        return set()
    return {value for element in root.iter() if (value := element.get("id"))}


def _collect_visual_logic_object_ids(
    logic: dict[str, Any] | None,
    transition_ids: set[str],
    proof_edge_ids: set[str],
) -> set[str]:
    ids = set(transition_ids) | set(proof_edge_ids)
    if logic is None:
        return ids
    for section in ("points", "ports", "submazes"):
        ids.update(
            item["id"]
            for item in _list_value(logic, section)
            if isinstance(item, dict) and isinstance(item.get("id"), str)
        )
    ids.update(_collect_transition_group_ids(logic))
    return ids


def _collect_port_ids(logic: dict[str, Any] | None) -> set[str]:
    if logic is None:
        return set()
    return {
        port["id"]
        for port in _list_value(logic, "ports")
        if isinstance(port, dict) and isinstance(port.get("id"), str)
    }


def _collect_transition_from_ports(logic: dict[str, Any] | None) -> dict[str, str]:
    if logic is None:
        return {}
    return {
        transition["id"]: transition["from_port"]
        for transition in _iter_transition_data(logic)
        if (
            isinstance(transition, dict)
            and isinstance(transition.get("id"), str)
            and isinstance(transition.get("from_port"), str)
        )
    }


def _collect_transition_group_ids(logic: dict[str, Any] | None) -> set[str]:
    if logic is None:
        return set()
    return {
        group["id"]
        for group in _list_value(logic, "transition_groups")
        if isinstance(group, dict) and isinstance(group.get("id"), str)
    }


def _collect_visual_id(
    item: dict[str, Any],
    seen: set[str],
    item_name: str,
    path: str,
    issues: list[ValidationIssue],
) -> None:
    item_id = item.get("id")
    if not isinstance(item_id, str):
        return
    if item_id in seen:
        issues.append(ValidationIssue(path, f"duplicate {item_name} id {item_id!r}"))
    seen.add(item_id)


def _validate_view_reference(
    item: dict[str, Any],
    field: str,
    view_ids: set[str],
    path: str,
    issues: list[ValidationIssue],
) -> None:
    view_id = item.get(field)
    if isinstance(view_id, str) and view_id not in view_ids:
        issues.append(ValidationIssue(path, f"references unknown view {view_id!r}"))


def _validate_transition_reference(
    item: dict[str, Any],
    field: str,
    transition_ids: set[str],
    path: str,
    issues: list[ValidationIssue],
) -> None:
    transition_id = item.get(field)
    if isinstance(transition_id, str) and transition_id not in transition_ids:
        issues.append(ValidationIssue(path, f"references unknown transition {transition_id!r}"))


def _validate_reference_set(
    item: dict[str, Any],
    field: str,
    known_ids: set[str],
    name: str,
    path: str,
    issues: list[ValidationIssue],
) -> None:
    item_id = item.get(field)
    if isinstance(item_id, str) and item_id not in known_ids:
        issues.append(ValidationIssue(path, f"references unknown {name} {item_id!r}"))


def _validate_visual_element_reference(
    item: dict[str, Any],
    view_asset: dict[str, str],
    svg_element_ids_by_asset: dict[str, set[str]],
    path: str,
    issues: list[ValidationIssue],
) -> None:
    element = item.get("element")
    view_id = item.get("view")
    if not isinstance(element, str) or not isinstance(view_id, str):
        return
    if not element.startswith("#"):
        issues.append(ValidationIssue(path, f"element selector must start with '#': {element!r}"))
        return
    asset_id = view_asset.get(view_id)
    if asset_id is None:
        return
    svg_element_ids = svg_element_ids_by_asset.get(asset_id)
    if svg_element_ids is None:
        issues.append(ValidationIssue(path, f"element selector {element!r} requires an SVG-backed view"))
        return
    element_id = element[1:]
    if element_id not in svg_element_ids:
        issues.append(ValidationIssue(path, f"references missing SVG element {element!r}"))


def _validate_view_asset_compatibility(
    view: dict[str, Any],
    media_type: str | None,
    path: str,
    issues: list[ValidationIssue],
) -> None:
    kind = view.get("kind")
    if media_type is None:
        return
    if kind == "authored_vector" and media_type != "image/svg+xml":
        issues.append(ValidationIssue(path, f"authored_vector view requires image/svg+xml asset, got {media_type!r}"))
    if kind == "image_overlay" and media_type == "image/svg+xml":
        issues.append(ValidationIssue(path, "image_overlay view should not use an SVG asset"))
    if kind == "generated" and media_type not in {"image/svg+xml", "image/png", "image/webp"}:
        issues.append(ValidationIssue(path, f"generated view has unsupported asset media type {media_type!r}"))


def _validate_proof_edges(
    proof_edges: list[Any],
    path: str,
    transition_ids: set[str],
    issues: list[ValidationIssue],
) -> None:
    seen: set[str] = set()
    for index, edge in enumerate(proof_edges, start=1):
        edge_path = f"{path}:proof_edges[{index}]"
        if not isinstance(edge, dict):
            issues.append(ValidationIssue(edge_path, "proof edge must be a mapping"))
            continue
        for field in ("id", "proof_type", "status", "source", "target", "input", "explanation"):
            _require_field(edge, field, edge_path, issues)
        edge_id = edge.get("id")
        if isinstance(edge_id, str):
            if edge_id in seen or edge_id in transition_ids:
                issues.append(ValidationIssue(edge_path, f"duplicate proof edge id {edge_id!r}"))
            seen.add(edge_id)
        if edge.get("status") not in {"proved", "assumed", "disproved", "unknown"}:
            issues.append(ValidationIssue(edge_path, f"unsupported proof edge status {edge.get('status')!r}"))
        proof = edge.get("proof")
        if edge.get("status") == "proved" and not isinstance(proof, dict):
            issues.append(ValidationIssue(edge_path, "proved proof edge must include proof"))
            continue
        if proof is not None:
            _validate_proof_block(proof, edge, edge_path, issues)


def _iter_transition_data(logic: dict[str, Any]) -> list[Any]:
    transitions = list(_list_value(logic, "transitions"))
    for group in _list_value(logic, "transition_groups"):
        if not isinstance(group, dict):
            continue
        for key in ("forward", "reverse"):
            transition = group.get(key)
            if transition is not None:
                transitions.append(transition)
    return transitions


def _validate_proof_block(
    proof: Any,
    edge: dict[str, Any],
    edge_path: str,
    issues: list[ValidationIssue],
) -> None:
    if not isinstance(proof, dict):
        issues.append(ValidationIssue(edge_path, "proof must be a mapping"))
        return
    if "method" not in proof:
        issues.append(ValidationIssue(f"{edge_path}:proof", "missing required field 'method'"))
    method = proof.get("method")
    if method not in {"infinite_hop", "simplified_infinite_hop", "cantor_hop", "simplified_cantor_hop", "cantor_bridge"}:
        issues.append(ValidationIssue(f"{edge_path}:proof", f"unsupported proof method {method!r}"))
    if method in {"infinite_hop", "simplified_infinite_hop"}:
        _require_field(proof, "variables", f"{edge_path}:proof", issues)
        _require_field(proof, "obligations", f"{edge_path}:proof", issues)
    if method in {"cantor_hop", "simplified_cantor_hop"}:
        _require_field(proof, "presuppositions", f"{edge_path}:proof", issues)
    steps = proof.get("steps")
    if not isinstance(steps, list) or not steps:
        issues.append(ValidationIssue(f"{edge_path}:proof", "proof steps must be a non-empty list"))
        return
    if method in {"infinite_hop", "simplified_infinite_hop"}:
        for index, step in enumerate(steps, start=1):
            step_path = f"{edge_path}:proof.steps[{index}]"
            if not isinstance(step, dict):
                issues.append(ValidationIssue(step_path, "proof step must be a mapping"))
                continue
            for field in ("kind", "source", "target"):
                _require_field(step, field, step_path, issues)
            if step.get("kind") != "physical":
                issues.append(ValidationIssue(step_path, "infinite hop proof step must be physical"))
        return
    previous_target: str | None = None
    for index, step in enumerate(steps, start=1):
        step_path = f"{edge_path}:proof.steps[{index}]"
        if not isinstance(step, dict):
            issues.append(ValidationIssue(step_path, "proof step must be a mapping"))
            continue
        for field in ("kind", "source", "target"):
            _require_field(step, field, step_path, issues)
        if step.get("kind") not in {"physical", "assumption"}:
            issues.append(ValidationIssue(step_path, f"unsupported proof step kind {step.get('kind')!r}"))
        if index == 1 and step.get("source") != edge.get("source"):
            issues.append(ValidationIssue(step_path, f"proof must start at {edge.get('source')}"))
        if previous_target is not None and step.get("source") != previous_target:
            issues.append(ValidationIssue(step_path, f"proof gap after {previous_target}"))
        previous_target = step.get("target") if isinstance(step.get("target"), str) else None
    if previous_target != edge.get("target"):
        issues.append(ValidationIssue(f"{edge_path}:proof", f"proof must end at {edge.get('target')}"))


def _validate_unique_ids(items: list[Any], item_name: str, path: str, issues: list[ValidationIssue]) -> None:
    seen: set[str] = set()
    for index, item in enumerate(items, start=1):
        item_path = f"{path}:{item_name}s[{index}]"
        if not isinstance(item, dict):
            issues.append(ValidationIssue(item_path, f"{item_name} must be a mapping"))
            continue
        item_id = item.get("id")
        if not isinstance(item_id, str):
            issues.append(ValidationIssue(item_path, "missing required field 'id'"))
            continue
        if item_id in seen:
            issues.append(ValidationIssue(item_path, f"duplicate {item_name} id {item_id!r}"))
        seen.add(item_id)


def _load_yaml_mapping(path: Path, display_path: str, issues: list[ValidationIssue]) -> dict[str, Any] | None:
    if not path.exists():
        issues.append(ValidationIssue(display_path, "file does not exist"))
        return None
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = yaml.safe_load(handle)
    except yaml.YAMLError as exc:
        issues.append(ValidationIssue(display_path, f"invalid YAML: {exc}"))
        return None
    if not isinstance(data, dict):
        issues.append(ValidationIssue(display_path, "must contain a YAML mapping"))
        return None
    return data


def _validate_schema(data: dict[str, Any], schema_name: str, path: str, issues: list[ValidationIssue]) -> None:
    schema_path = Path(__file__).resolve().parents[2] / "schemas" / schema_name
    try:
        with schema_path.open("r", encoding="utf-8") as handle:
            schema = json.load(handle)
    except OSError as exc:
        issues.append(ValidationIssue(path, f"schema {schema_name} could not be loaded: {exc}"))
        return

    validator = Draft202012Validator(schema)
    for error in sorted(validator.iter_errors(data), key=lambda item: list(item.path)):
        location = path
        for segment in error.path:
            if isinstance(segment, int):
                location += f"[{segment}]"
            else:
                location += f":{segment}"
        issues.append(ValidationIssue(location, f"schema: {error.message}"))


def _require_field(mapping: dict[str, Any], field: str, path: str, issues: list[ValidationIssue]) -> None:
    if field not in mapping:
        issues.append(ValidationIssue(path, f"missing required field {field!r}"))


def _list_value(mapping: dict[str, Any], field: str) -> list[Any]:
    value = mapping.get(field, [])
    return value if isinstance(value, list) else []


def _display_path(path: Path) -> str:
    return str(path)
