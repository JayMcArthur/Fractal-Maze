from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Generic, Hashable, Iterable, Protocol, TypeVar

from .logic_core import AddressGraph, ExecutionError, RuntimeState


StateT = TypeVar("StateT", bound=Hashable)


class SolveStatus(str, Enum):
    SOLVED = "solved"
    UNSOLVED_WITH_BOUND = "unsolved_with_bound"
    UNKNOWN_UNBOUNDED = "unknown_unbounded"
    PROVED = "proved"


@dataclass(frozen=True)
class SolverResult(Generic[StateT]):
    status: SolveStatus
    path: tuple[StateT, ...] = ()
    explored: int = 0
    bound: int | None = None
    explanation: str | None = None

    @property
    def solved(self) -> bool:
        return self.status in {SolveStatus.SOLVED, SolveStatus.PROVED}


class NeighborProvider(Protocol[StateT]):
    def neighbors(self, state: StateT) -> Iterable[StateT]:
        ...


@dataclass
class BreadthFirstSolver(Generic[StateT]):
    max_states: int | None = None

    def solve(self, graph: NeighborProvider[StateT], start: StateT, goals: set[StateT]) -> SolverResult[StateT]:
        parent: dict[StateT, StateT | None] = {start: None}
        queue: deque[StateT] = deque([start])

        while queue:
            if self.max_states is not None and len(parent) > self.max_states:
                return SolverResult(
                    status=SolveStatus.UNSOLVED_WITH_BOUND,
                    explored=len(parent),
                    bound=self.max_states,
                    explanation="state limit reached",
                )
            current = queue.popleft()
            if current in goals:
                return SolverResult(
                    status=SolveStatus.SOLVED,
                    path=self._reconstruct(parent, current),
                    explored=len(parent),
                )
            for neighbor in graph.neighbors(current):
                if neighbor in parent:
                    continue
                parent[neighbor] = current
                queue.append(neighbor)

        return SolverResult(
            status=SolveStatus.UNSOLVED_WITH_BOUND,
            explored=len(parent),
            explanation="finite search frontier exhausted",
        )

    @staticmethod
    def _reconstruct(parent: dict[StateT, StateT | None], goal: StateT) -> tuple[StateT, ...]:
        path: list[StateT] = []
        current: StateT | None = goal
        while current is not None:
            path.append(current)
            current = parent[current]
        path.reverse()
        return tuple(path)


@dataclass
class ExecutionStrategyRegistry:
    strategies: set[str] = field(default_factory=set)

    def register(self, strategy: str) -> None:
        self.strategies.add(strategy)

    def supports(self, strategy: str) -> bool:
        return strategy in self.strategies


def default_strategy_registry() -> ExecutionStrategyRegistry:
    registry = ExecutionStrategyRegistry()
    for strategy in ("pda_stack", "coordinate_path", "tiled_port_graph", "proof_rule"):
        registry.register(strategy)
    return registry


class AddressGraphNeighborProvider:
    def __init__(self, graph: AddressGraph):
        self.graph = graph

    def neighbors(self, state: RuntimeState) -> Iterable[RuntimeState]:
        for connection in self.graph.legal_connections(state):
            yield RuntimeState(connection.apply(state.address))


def solve_address_graph_bfs(graph: AddressGraph, max_states: int | None = None) -> SolverResult[RuntimeState]:
    return BreadthFirstSolver[RuntimeState](max_states=max_states).solve(
        AddressGraphNeighborProvider(graph),
        graph.initial_state(),
        {RuntimeState(goal) for goal in graph.goals},
    )


def solve_with_proof_rule(graph: AddressGraph, proof_rule_id: str) -> SolverResult[RuntimeState]:
    try:
        state, _ = graph.apply_proof(graph.initial_state(), proof_rule_id)
    except ExecutionError as exc:
        return SolverResult(status=SolveStatus.UNKNOWN_UNBOUNDED, explanation=str(exc))
    if graph.is_goal(state):
        return SolverResult(
            status=SolveStatus.PROVED,
            path=(graph.initial_state(), state),
            explored=1,
            explanation=proof_rule_id,
        )
    return SolverResult(
        status=SolveStatus.UNKNOWN_UNBOUNDED,
        path=(graph.initial_state(), state),
        explored=1,
        explanation=f"proof rule {proof_rule_id!r} did not reach a goal",
    )


def solve_fractal_block_bounded(maze, depth_limit: int) -> SolverResult:
    result = maze.solve(depth_limit)
    if result.solved:
        return SolverResult(
            status=SolveStatus.SOLVED,
            path=result.path,
            explored=result.explored,
            bound=depth_limit,
        )
    return SolverResult(
        status=SolveStatus.UNSOLVED_WITH_BOUND,
        explored=result.explored,
        bound=depth_limit,
        explanation="depth limit exhausted",
    )
