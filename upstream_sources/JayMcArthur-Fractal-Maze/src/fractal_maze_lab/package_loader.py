from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from .fractal_block import FractalBlockMaze, FractalBlockPattern
from .logic_core import Address, ExecutionError, ProofEdge, ProofPathStep, RuntimeState, StepRecord
from .package_validation import validate_package_file
from .port_graph import Port, PortGraph, PortTransition, PortTransitionGroup
from .solver import SolveStatus, SolverResult, solve_fractal_block_bounded
from .tiled_port_graph import Terminal, TiledPortGraph, TiledState


@dataclass(frozen=True)
class LoadedPackage:
    root: Path
    manifest: dict[str, Any]
    logic: dict[str, Any]
    visual: dict[str, Any] | None = None
    port_graph: PortGraph | None = None
    fractal_block_maze: FractalBlockMaze | None = None
    tiled_port_graph: TiledPortGraph | None = None

    def compile_runtime(self, include_proof_edges: bool = False):
        if self.port_graph is None:
            raise ExecutionError(f"package strategy {self.logic.get('strategy')!r} does not compile to pda_stack")
        return self.port_graph.compile_pda_stack(include_proof_edges=include_proof_edges)

    def solve(
        self,
        depth_limit: int | None = None,
        state_limit: int | None = None,
        include_proof_edges: bool = False,
    ) -> SolverResult:
        if self.port_graph is not None:
            if state_limit is None:
                state_limit = int((self.logic.get("solver") or {}).get("default_state_limit", 1000))
            return _solve_port_graph_bounded(self.port_graph, state_limit, include_proof_edges=include_proof_edges)
        if self.fractal_block_maze is not None:
            if depth_limit is None:
                depth_limit = int((self.logic.get("solver") or {}).get("default_depth_limit", 5))
            return solve_fractal_block_bounded(self.fractal_block_maze, depth_limit)
        if self.tiled_port_graph is not None:
            if state_limit is None:
                state_limit = int((self.logic.get("solver") or {}).get("default_state_limit", 1000))
            result = self.tiled_port_graph.solve_bfs(max_states=state_limit)
            return SolverResult(
                status=result.status,
                path=result.path,
                explored=result.explored,
                bound=state_limit,
                explanation=result.explanation,
            )
        raise ExecutionError(f"package strategy {self.logic.get('strategy')!r} does not have a package solver")


@dataclass(frozen=True)
class SolutionReplay:
    final_state: RuntimeState
    history: tuple[StepRecord, ...]


def _solve_port_graph_bounded(
    port_graph: PortGraph,
    state_limit: int,
    include_proof_edges: bool = False,
) -> SolverResult[RuntimeState]:
    runtime = port_graph.compile_pda_stack(include_proof_edges=include_proof_edges)
    start = runtime.initial_state()
    parent: dict[RuntimeState, RuntimeState | None] = {start: None}
    queue: deque[RuntimeState] = deque([start])

    while queue:
        if len(parent) > state_limit:
            return SolverResult(
                status=SolveStatus.UNSOLVED_WITH_BOUND,
                explored=len(parent),
                bound=state_limit,
                explanation="state limit reached",
            )
        current = queue.popleft()
        if runtime.is_goal(current):
            return SolverResult(
                status=SolveStatus.SOLVED,
                path=_reconstruct_state_path(parent, current),
                explored=len(parent),
                bound=state_limit,
            )
        for transition in port_graph.transitions:
            state_with_port = runtime.with_port(current, transition.from_port)
            try:
                next_state, _ = runtime.apply(state_with_port, transition.input)
            except ExecutionError:
                continue
            if next_state not in parent:
                parent[next_state] = current
                queue.append(next_state)
        if include_proof_edges:
            for proof_edge_id in port_graph.proof_edges:
                try:
                    next_state, _ = runtime.apply_proof_edge(current, proof_edge_id)
                except ExecutionError:
                    continue
                if next_state not in parent:
                    parent[next_state] = current
                    queue.append(next_state)

    return SolverResult(
        status=SolveStatus.UNSOLVED_WITH_BOUND,
        explored=len(parent),
        bound=state_limit,
        explanation="finite search frontier exhausted",
    )


def _reconstruct_state_path(
    parent: dict[RuntimeState, RuntimeState | None],
    goal: RuntimeState,
) -> tuple[RuntimeState, ...]:
    path: list[RuntimeState] = []
    current: RuntimeState | None = goal
    while current is not None:
        path.append(current)
        current = parent[current]
    path.reverse()
    return tuple(path)


def load_package(path: str | Path) -> LoadedPackage:
    manifest_path = Path(path)
    validation = validate_package_file(manifest_path)
    _require(validation.valid, "; ".join(issue.format() for issue in validation.issues))
    root = manifest_path.parent
    manifest = _load_yaml(manifest_path)
    _require(manifest.get("format") == "fmaze-package-v0", f"unsupported package format {manifest.get('format')!r}")

    logic_ref = manifest.get("logic") or {}
    _require(logic_ref.get("href"), "package is missing logic.href")
    logic_path = root / logic_ref["href"]
    logic = _load_yaml(logic_path)
    _require(logic.get("format") == logic_ref.get("format"), "logic format does not match package reference")
    visual = None
    visual_ref = manifest.get("visual") or {}
    if visual_ref.get("href"):
        visual = _load_yaml(root / visual_ref["href"])
        _require(visual.get("format") == visual_ref.get("format"), "visual format does not match package reference")

    if logic.get("strategy") == "pda_stack":
        port_graph = load_port_graph_logic(logic)
        errors = port_graph.validation_errors()
        _require(not errors, "; ".join(errors))
        return LoadedPackage(root=root, manifest=manifest, logic=logic, visual=visual, port_graph=port_graph)
    if logic.get("strategy") == "coordinate_path":
        return LoadedPackage(
            root=root,
            manifest=manifest,
            logic=logic,
            visual=visual,
            fractal_block_maze=load_fractal_block_logic(logic),
        )
    if logic.get("strategy") == "tiled_port_graph":
        return LoadedPackage(
            root=root,
            manifest=manifest,
            logic=logic,
            visual=visual,
            tiled_port_graph=load_tiled_port_graph_logic(logic),
        )
    if logic.get("strategy") == "reference_record":
        return LoadedPackage(root=root, manifest=manifest, logic=logic, visual=visual)
    raise ExecutionError(f"unsupported strategy {logic.get('strategy')!r}")


def load_port_graph_logic(logic: dict[str, Any]) -> PortGraph:
    _require(logic.get("format") == "fmaze-logic-v0", f"unsupported logic format {logic.get('format')!r}")
    _require(logic.get("strategy") == "pda_stack", f"unsupported strategy {logic.get('strategy')!r}")
    _require(logic.get("source_model") == "port_graph", f"unsupported source model {logic.get('source_model')!r}")

    graph = PortGraph(
        id=logic["id"],
        start=_parse_address(logic["start"]),
        goals={_parse_address(goal) for goal in logic.get("goals", [])},
    )
    for port_data in logic.get("ports", []):
        port_id = port_data["id"]
        address = _address_from_point_and_context(port_data["point"], port_data.get("context", []))
        graph.ports[port_id] = Port(
            id=port_id,
            address=address,
            label=port_data.get("label"),
            kind=port_data.get("kind"),
            provenance=port_data.get("provenance"),
        )
    for transition_data in logic.get("transitions", []):
        graph.transitions.append(_parse_transition(transition_data))
    for group_data in logic.get("transition_groups", []):
        direction = group_data.get("direction", "one_way")
        _require(direction in {"one_way", "two_way"}, f"unsupported transition group direction {direction!r}")
        transition_ids: list[str] = []
        for key in ("forward", "reverse"):
            transition_data = group_data.get(key)
            if transition_data is None:
                continue
            transition = _parse_transition(transition_data)
            graph.transitions.append(transition)
            transition_ids.append(transition.id)
        graph.transition_groups.append(
            PortTransitionGroup(
                id=group_data["id"],
                direction=direction,
                transition_ids=tuple(transition_ids),
            )
        )
    for edge_data in logic.get("proof_edges", []):
        edge = _parse_proof_edge(edge_data)
        graph.proof_edges[edge.id] = edge
    return graph


def load_fractal_block_logic(logic: dict[str, Any]) -> FractalBlockMaze:
    _require(logic.get("format") == "fmaze-logic-v0", f"unsupported logic format {logic.get('format')!r}")
    _require(logic.get("strategy") == "coordinate_path", f"unsupported strategy {logic.get('strategy')!r}")
    _require(
        logic.get("source_model") == "fractal_block_pattern",
        f"unsupported source model {logic.get('source_model')!r}",
    )
    pattern_data = logic.get("pattern")
    _require(isinstance(pattern_data, dict), "fractal block logic is missing pattern")
    rows = pattern_data.get("rows")
    _require(isinstance(rows, list), "fractal block pattern.rows must be a list")
    entry_direction = _parse_direction((logic.get("entry") or {}).get("direction", "north"))
    goal_direction = _parse_direction((logic.get("goal") or {}).get("direction", "north"))
    return FractalBlockMaze(
        FractalBlockPattern.from_rows(rows),
        entry_direction=entry_direction,
        goal_direction=goal_direction,
    )


def load_tiled_port_graph_logic(logic: dict[str, Any]) -> TiledPortGraph:
    _require(logic.get("format") == "fmaze-logic-v0", f"unsupported logic format {logic.get('format')!r}")
    _require(logic.get("strategy") == "tiled_port_graph", f"unsupported strategy {logic.get('strategy')!r}")
    _require(
        logic.get("source_model") == "repeated_tile_ports",
        f"unsupported source model {logic.get('source_model')!r}",
    )
    block_classes = logic.get("block_classes")
    _require(isinstance(block_classes, dict), "tiled port graph logic is missing block_classes")
    sections = {
        block_class: list((block_classes.get(block_class) or {}).get("edges", []))
        for block_class in ("normal", "nx", "ny", "zero")
    }
    return TiledPortGraph.from_sections(
        id=logic["id"],
        sections=sections,
        start=_parse_tiled_state(logic["start"]),
        goals={_parse_tiled_state(goal) for goal in logic.get("goals", [])},
    )


def _parse_transition(transition_data: dict[str, Any]) -> PortTransition:
    return PortTransition(
        id=transition_data["id"],
        source=_parse_address(transition_data["source"]),
        target=_parse_address(transition_data["target"]),
        input=str(transition_data["input"]),
        from_port=transition_data["from_port"],
        label=transition_data.get("label"),
    )


def _parse_proof_edge(edge_data: dict[str, Any]) -> ProofEdge:
    proof = edge_data.get("proof", {}) if isinstance(edge_data.get("proof", {}), dict) else {}
    proof_steps = tuple(
        ProofPathStep.parse(step["kind"], step["source"], step["target"])
        for step in proof.get("steps", [])
    )
    return ProofEdge.parse(
        id=edge_data["id"],
        source=edge_data["source"],
        target=edge_data["target"],
        input=str(edge_data["input"]),
        proof_type=edge_data["proof_type"],
        status=edge_data["status"],
        explanation=edge_data.get("explanation", ""),
        enabled_by_default=bool(edge_data.get("enabled_by_default", False)),
        proof_steps=proof_steps,
        proof_method=proof.get("method"),
    )


def load_solution(path: str | Path) -> dict[str, Any]:
    solution = _load_yaml(Path(path))
    _require(solution.get("format") == "fmaze-solution-v0", f"unsupported solution format {solution.get('format')!r}")
    return solution


def replay_solution(package: LoadedPackage, solution: dict[str, Any], include_proof_edges: bool = False) -> SolutionReplay:
    runtime = package.compile_runtime(include_proof_edges=include_proof_edges)
    state = runtime.initial_state()
    transitions = {transition.id: transition for transition in package.port_graph.transitions}
    history: list[StepRecord] = []
    enabled_proof_edges: set[str] = {
        edge.id for edge in package.port_graph.proof_edges.values() if edge.enabled_by_default
    }

    for index, step in enumerate(solution.get("steps", []), start=1):
        if "prove_edge_id" in step:
            proof_edge_id = step["prove_edge_id"]
            if proof_edge_id not in package.port_graph.proof_edges:
                raise ExecutionError(f"solution step {index} references unknown proof edge {proof_edge_id!r}")
            edge = package.port_graph.proof_edges[proof_edge_id]
            errors = edge.proof_validation_errors(runtime)
            if errors:
                raise ExecutionError(f"solution step {index} submits invalid proof {proof_edge_id!r}: {'; '.join(errors)}")
            enabled_proof_edges.add(proof_edge_id)
            continue
        if "proof_edge_id" in step:
            proof_edge_id = step["proof_edge_id"]
            if proof_edge_id not in enabled_proof_edges:
                raise ExecutionError(f"solution step {index} uses proof edge {proof_edge_id!r} before proving it")
            state, record = runtime.apply_proof_edge(state, proof_edge_id)
            history.append(record)
            continue
        transition_id = step["transition_id"]
        try:
            transition = transitions[transition_id]
        except KeyError as exc:
            raise ExecutionError(f"solution step {index} references unknown transition {transition_id!r}") from exc
        state_with_port = runtime.with_port(state, transition.from_port)
        state, record = runtime.apply(state_with_port, transition.input)
        if record.transition_id != transition_id:
            raise ExecutionError(f"solution step {index} selected {transition_id!r} but applied {record.transition_id!r}")
        history.append(record)

    return SolutionReplay(final_state=state, history=tuple(history))


def load_referenced_solution(package: LoadedPackage, solution_id: str) -> dict[str, Any]:
    for solution_ref in package.manifest.get("solutions", []):
        if solution_ref.get("id") == solution_id:
            _require(solution_ref.get("format") == "fmaze-solution-v0", "unsupported referenced solution format")
            return load_solution(package.root / solution_ref["href"])
    raise ExecutionError(f"unknown solution {solution_id!r}")


def _parse_address(raw: str) -> Address:
    return Address.parse(raw)


def _parse_direction(raw: Any) -> str:
    direction = str(raw)
    _require(direction in {"west", "east", "north", "south"}, f"unsupported direction {direction!r}")
    return direction


def _parse_tiled_state(raw: Any) -> TiledState:
    _require(isinstance(raw, dict), "tiled state must be a mapping")
    return TiledState(
        x=int(raw["x"]),
        y=int(raw["y"]),
        terminal=Terminal.parse(str(raw["terminal"])),
    )


def _address_from_point_and_context(point: str, context: list[str]) -> Address:
    return Address(tuple(context), point)


def _load_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    _require(isinstance(data, dict), f"{path} must contain a YAML mapping")
    return data


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ExecutionError(message)
