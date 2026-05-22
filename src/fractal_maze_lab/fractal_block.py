from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Iterable, Literal


Cell = tuple[int, int]
BlockPosition = tuple[Cell, ...]
Direction = Literal["west", "east", "north", "south"]


KOTEITAN_DEFAULT_PATTERN: tuple[tuple[int, ...], ...] = (
    (1, 0, 1, 1),
    (0, 1, 0, 1),
    (1, 0, 1, 1),
    (1, 1, 0, 0),
)


@dataclass(frozen=True)
class FractalBlockPattern:
    """Generating pattern from Koteitan's fractal block maze solver.

    Cells use Koteitan's convention:
    - 1: black cell, recursively contains another generated maze
    - 0: white cell, open space at this depth
    """

    cells: tuple[tuple[int, ...], ...]

    @classmethod
    def from_rows(cls, rows: Iterable[Iterable[int]]) -> "FractalBlockPattern":
        cells = tuple(tuple(int(value) for value in row) for row in rows)
        if not cells:
            raise ValueError("pattern must have at least one row")
        unit = len(cells)
        if any(len(row) != unit for row in cells):
            raise ValueError("fractal block pattern must be square")
        if any(value not in (0, 1) for row in cells for value in row):
            raise ValueError("fractal block pattern cells must be 0 or 1")
        return cls(cells)

    @property
    def unit(self) -> int:
        return len(self.cells)

    def is_black(self, cell: Cell) -> bool:
        x, y = cell
        return self.cells[y][x] == 1

    def is_white(self, cell: Cell) -> bool:
        return not self.is_black(cell)

    def boundary_entries(self, direction: Direction) -> list[Cell]:
        if direction == "west":
            return [(self.unit - 1, y) for y in range(self.unit)]
        if direction == "east":
            return [(0, y) for y in range(self.unit)]
        if direction == "north":
            return [(x, self.unit - 1) for x in range(self.unit)]
        if direction == "south":
            return [(x, 0) for x in range(self.unit)]
        raise ValueError(f"unknown direction {direction!r}")


@dataclass(frozen=True)
class FractalBlockSearchResult:
    solved: bool
    depth_limit: int
    explored: int
    path: tuple[BlockPosition, ...]


class FractalBlockMaze:
    """Bounded solver for Koteitan-style fractal block maze examples."""

    def __init__(
        self,
        pattern: FractalBlockPattern,
        entry_direction: Direction = "north",
        goal_direction: Direction = "north",
    ):
        self.pattern = pattern
        self.entry_direction = entry_direction
        self.goal_direction = goal_direction

    def start_positions(self, depth_limit: int) -> tuple[BlockPosition, ...]:
        return tuple(self._enter((), self.entry_direction, depth_limit))

    def neighbors(self, position: BlockPosition, depth_limit: int) -> tuple[BlockPosition, ...]:
        results: list[BlockPosition] = []
        for direction in ("west", "east", "north", "south"):
            moved, over = self._move_with_carry(position, direction)
            if over:
                continue
            normalized = self._normalize_or_enter(moved, direction, depth_limit)
            results.extend(normalized)
        return tuple(results)

    def exits_goal(self, position: BlockPosition, direction: Direction | None = None) -> bool:
        if direction is None:
            direction = self.goal_direction
        if not position:
            return False
        return self._move_with_carry(position, direction)[1]

    def solve(self, depth_limit: int) -> FractalBlockSearchResult:
        starts = self.start_positions(depth_limit)
        queue: deque[BlockPosition] = deque(starts)
        parent: dict[BlockPosition, BlockPosition | None] = {position: None for position in starts}
        explored = 0

        while queue:
            position = queue.popleft()
            explored += 1
            if self.exits_goal(position, "north"):
                return FractalBlockSearchResult(True, depth_limit, explored, self._reconstruct(parent, position))
            for neighbor in self.neighbors(position, depth_limit):
                if neighbor not in parent:
                    parent[neighbor] = position
                    queue.append(neighbor)

        return FractalBlockSearchResult(False, depth_limit, explored, ())

    def _normalize_or_enter(
        self,
        position: BlockPosition,
        direction: Direction,
        depth_limit: int,
    ) -> tuple[BlockPosition, ...]:
        for index, cell in enumerate(position):
            if self.pattern.is_white(cell):
                return (position[: index + 1],)
        return tuple(self._enter(position, direction, depth_limit))

    def _enter(
        self,
        prefix: BlockPosition,
        direction: Direction,
        depth_limit: int,
    ) -> tuple[BlockPosition, ...]:
        if len(prefix) >= depth_limit:
            return ()

        results: list[BlockPosition] = []
        for cell in self.pattern.boundary_entries(direction):
            candidate = (*prefix, cell)
            if self.pattern.is_white(cell):
                results.append(candidate)
            else:
                results.extend(self._enter(candidate, direction, depth_limit))
        return tuple(results)

    def _move_with_carry(self, position: BlockPosition, direction: Direction) -> tuple[BlockPosition, bool]:
        if not position:
            return position, True

        cells = [list(cell) for cell in position]
        dim, amount = {
            "west": (0, -1),
            "east": (0, 1),
            "north": (1, -1),
            "south": (1, 1),
        }[direction]

        over = True
        unit = self.pattern.unit
        for depth in range(len(cells) - 1, -1, -1):
            cells[depth][dim] += amount
            if cells[depth][dim] < 0 or cells[depth][dim] >= unit:
                cells[depth][dim] = (cells[depth][dim] + unit) % unit
            else:
                over = False
                break

        return tuple((x, y) for x, y in cells), over

    @staticmethod
    def _reconstruct(
        parent: dict[BlockPosition, BlockPosition | None],
        end: BlockPosition,
    ) -> tuple[BlockPosition, ...]:
        path: list[BlockPosition] = []
        current: BlockPosition | None = end
        while current is not None:
            path.append(current)
            current = parent[current]
        return tuple(reversed(path))
