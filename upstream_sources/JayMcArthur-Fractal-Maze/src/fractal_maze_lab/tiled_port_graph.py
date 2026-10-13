from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Literal

from .solver import BreadthFirstSolver, SolverResult


Side = Literal["W", "E", "N", "S", "C"]
BlockClass = Literal["normal", "nx", "ny", "zero"]


@dataclass(frozen=True, order=True)
class Terminal:
    side: Side
    index: int

    @classmethod
    def parse(cls, raw: str) -> "Terminal":
        match = re.match(r"^([WENSC])(\d+)$", raw.strip())
        if not match:
            raise ValueError(f"invalid terminal {raw!r}")
        return cls(match.group(1), int(match.group(2)))  # type: ignore[arg-type]

    def __str__(self) -> str:
        return f"{self.side}{self.index}"


@dataclass(frozen=True, order=True)
class TiledState:
    x: int
    y: int
    terminal: Terminal


@dataclass(frozen=True)
class TiledPortEdge:
    source: Terminal
    target: Terminal
    directed: bool = False

    @classmethod
    def parse(cls, raw: str) -> "TiledPortEdge":
        sep = "->" if "->" in raw else "-"
        left, right = raw.split(sep, 1)
        return cls(Terminal.parse(left), Terminal.parse(right), directed=sep == "->")

    def expanded(self) -> tuple["TiledPortEdge", ...]:
        if self.directed:
            return (self,)
        return (
            TiledPortEdge(self.source, self.target, directed=True),
            TiledPortEdge(self.target, self.source, directed=True),
        )

    def compact(self) -> str:
        sep = "->" if self.directed else "-"
        return f"{self.source}{sep}{self.target}"


@dataclass
class TiledPortGraph:
    id: str
    start: TiledState
    goals: set[TiledState]
    port_sets: dict[BlockClass, list[TiledPortEdge]] = field(default_factory=dict)

    @classmethod
    def from_sections(
        cls,
        id: str,
        sections: dict[BlockClass, list[str]],
        start: TiledState | None = None,
        goals: set[TiledState] | None = None,
    ) -> "TiledPortGraph":
        port_sets: dict[BlockClass, list[TiledPortEdge]] = {}
        for block_class, raw_edges in sections.items():
            edges: list[TiledPortEdge] = []
            for raw_edge in raw_edges:
                for edge in TiledPortEdge.parse(raw_edge).expanded():
                    edges.append(edge)
            port_sets[block_class] = edges
        return cls(
            id=id,
            start=start or TiledState(0, 0, Terminal.parse("W0")),
            goals=goals or {TiledState(0, 0, Terminal.parse("W1"))},
            port_sets=port_sets,
        )

    @classmethod
    def parse(
        cls,
        id: str,
        text: str,
        start: TiledState | None = None,
        goals: set[TiledState] | None = None,
    ) -> "TiledPortGraph":
        sections: dict[BlockClass, list[str]] = {"normal": [], "nx": [], "ny": [], "zero": []}
        raw_text = re.sub(r"^\s*maze:\s*", "", text.strip(), flags=re.I)
        for section in raw_text.split(";"):
            section = section.strip()
            if not section:
                continue
            name, sep, body = section.partition(":")
            if not sep:
                raise ValueError(f"missing ':' in section {section!r}")
            block_class = name.strip().lower()
            if block_class not in sections:
                raise ValueError(f"unknown block class {block_class!r}")
            body = body.strip()
            if not body or body == "(none)":
                sections[block_class] = []
            else:
                sections[block_class] = [part.strip() for part in body.split(",") if part.strip()]
        return cls.from_sections(id, sections, start=start, goals=goals)

    def to_sections_text(self) -> str:
        sections: list[str] = []
        for block_class in ("normal", "nx", "ny", "zero"):
            raw_edges: list[str] = []
            seen: set[tuple[Terminal, Terminal]] = set()
            for edge in self.port_sets.get(block_class, []):
                reverse = (edge.target, edge.source)
                if reverse in seen:
                    continue
                seen.add((edge.source, edge.target))
                if any(
                    other.source == edge.target and other.target == edge.source
                    for other in self.port_sets.get(block_class, [])
                ):
                    raw_edges.append(TiledPortEdge(edge.source, edge.target, directed=False).compact())
                else:
                    raw_edges.append(edge.compact())
            body = ", ".join(raw_edges) if raw_edges else "(none)"
            sections.append(f"{block_class}: {body}")
        return "; ".join(sections)

    def validation_errors(self) -> list[str]:
        errors: list[str] = []
        for block_class in self.port_sets:
            if block_class not in {"normal", "nx", "ny", "zero"}:
                errors.append(f"unknown block class {block_class!r}")
        for state in (self.start, *self.goals):
            if state.x < 0 or state.y < 0:
                errors.append(f"negative tiled coordinate {state}")
        return errors

    def block_class_at(self, x: int, y: int) -> BlockClass:
        if x == 0 and y == 0:
            return "zero"
        if x == 0:
            return "nx"
        if y == 0:
            return "ny"
        return "normal"

    def neighbors(self, state: TiledState) -> list[TiledState]:
        neighbors: list[TiledState] = []
        block_class = self.block_class_at(state.x, state.y)
        for edge in self.port_sets.get(block_class, []):
            if edge.source == state.terminal:
                neighbors.append(TiledState(state.x, state.y, edge.target))

        crossed = self._cross_boundary(state)
        if crossed is not None:
            neighbors.append(crossed)
        return neighbors

    def solve_bfs(self, max_states: int | None = None) -> SolverResult[TiledState]:
        return BreadthFirstSolver[TiledState](max_states=max_states).solve(self, self.start, self.goals)

    @staticmethod
    def _cross_boundary(state: TiledState) -> TiledState | None:
        terminal = state.terminal
        if terminal.side == "W" and state.x > 0:
            return TiledState(state.x - 1, state.y, Terminal("E", terminal.index))
        if terminal.side == "E":
            return TiledState(state.x + 1, state.y, Terminal("W", terminal.index))
        if terminal.side == "S" and state.y > 0:
            return TiledState(state.x, state.y - 1, Terminal("N", terminal.index))
        if terminal.side == "N":
            return TiledState(state.x, state.y + 1, Terminal("S", terminal.index))
        return None
