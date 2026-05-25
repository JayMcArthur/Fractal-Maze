from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Any

from .port_graph import PortGraph


LAYOUT_ALGORITHM = "level-bfs-v1"
DEFAULT_SPACING_X = 120.0
DEFAULT_SPACING_Y = 100.0
PORT_OFFSET_RADIUS = 28.0


@dataclass(frozen=True)
class LaidPoint:
    x: float
    y: float
    level: int
    column: int

    def to_dict(self) -> dict[str, Any]:
        return {"x": self.x, "y": self.y, "level": self.level, "column": self.column}


@dataclass(frozen=True)
class AutoGraphLayout:
    algorithm: str
    spacing_x: float
    spacing_y: float
    points: dict[str, LaidPoint]
    ports: dict[str, LaidPoint]

    def bounds(self) -> tuple[float, float]:
        if not self.points and not self.ports:
            return (0.0, 0.0)
        xs = [laid.x for laid in self.points.values()] + [laid.x for laid in self.ports.values()]
        ys = [laid.y for laid in self.points.values()] + [laid.y for laid in self.ports.values()]
        return (max(xs) - min(xs), max(ys) - min(ys))

    def to_dict(self) -> dict[str, Any]:
        width, height = self.bounds()
        return {
            "algorithm": self.algorithm,
            "spacing": {"x": self.spacing_x, "y": self.spacing_y},
            "bounds": {"width": width, "height": height},
            "points": {point_id: laid.to_dict() for point_id, laid in sorted(self.points.items())},
            "ports": {port_id: laid.to_dict() for port_id, laid in sorted(self.ports.items())},
        }


def layout_port_graph(
    graph: PortGraph,
    spacing_x: float = DEFAULT_SPACING_X,
    spacing_y: float = DEFAULT_SPACING_Y,
) -> AutoGraphLayout:
    """Deterministic level-based layout for a Port Graph.

    Points are placed on rows by BFS distance from the start point, ignoring
    submaze prefixes (transitions are treated as point-to-point at the source
    level). Within a level, points are sorted by id for stable column order.
    Ports inherit their owning point's position with a deterministic small
    radial offset so a viewer can distinguish multiple ports at the same point.
    """

    adjacency = _build_point_adjacency(graph)
    point_ids = _collect_point_ids(graph)
    levels = _bfs_levels(graph.start.point, adjacency, point_ids)
    point_positions = _assign_point_positions(levels, spacing_x, spacing_y)
    port_positions = _assign_port_positions(graph, point_positions)
    return AutoGraphLayout(
        algorithm=LAYOUT_ALGORITHM,
        spacing_x=spacing_x,
        spacing_y=spacing_y,
        points=point_positions,
        ports=port_positions,
    )


def _build_point_adjacency(graph: PortGraph) -> dict[str, set[str]]:
    adjacency: dict[str, set[str]] = defaultdict(set)
    for transition in graph.transitions:
        source = transition.source.point
        target = transition.target.point
        if source == target:
            continue
        adjacency[source].add(target)
        adjacency[target].add(source)
    for edge in graph.proof_edges.values():
        source = edge.source.point
        target = edge.target.point
        if source == target:
            continue
        adjacency[source].add(target)
        adjacency[target].add(source)
    return adjacency


def _collect_point_ids(graph: PortGraph) -> set[str]:
    point_ids: set[str] = {graph.start.point}
    for goal in graph.goals:
        point_ids.add(goal.point)
    for port in graph.ports.values():
        point_ids.add(port.address.point)
    for transition in graph.transitions:
        point_ids.add(transition.source.point)
        point_ids.add(transition.target.point)
    for edge in graph.proof_edges.values():
        point_ids.add(edge.source.point)
        point_ids.add(edge.target.point)
    return point_ids


def _bfs_levels(
    start: str,
    adjacency: dict[str, set[str]],
    all_points: set[str],
) -> dict[int, list[str]]:
    distance: dict[str, int] = {start: 0}
    queue: deque[str] = deque([start])
    while queue:
        current = queue.popleft()
        for neighbor in sorted(adjacency.get(current, set())):
            if neighbor in distance:
                continue
            distance[neighbor] = distance[current] + 1
            queue.append(neighbor)

    unreached = sorted(all_points - distance.keys())
    if unreached:
        fallback_level = (max(distance.values()) + 1) if distance else 0
        for point_id in unreached:
            distance[point_id] = fallback_level

    levels: dict[int, list[str]] = defaultdict(list)
    for point_id, level in distance.items():
        levels[level].append(point_id)
    for level in levels:
        levels[level].sort()
    return dict(levels)


def _assign_point_positions(
    levels: dict[int, list[str]],
    spacing_x: float,
    spacing_y: float,
) -> dict[str, LaidPoint]:
    positions: dict[str, LaidPoint] = {}
    for level in sorted(levels.keys()):
        row = levels[level]
        offset = -((len(row) - 1) * spacing_x) / 2.0
        for column, point_id in enumerate(row):
            positions[point_id] = LaidPoint(
                x=offset + column * spacing_x,
                y=level * spacing_y,
                level=level,
                column=column,
            )
    return positions


def _assign_port_positions(
    graph: PortGraph,
    point_positions: dict[str, LaidPoint],
) -> dict[str, LaidPoint]:
    ports_by_point: dict[str, list[str]] = defaultdict(list)
    for port_id, port in graph.ports.items():
        ports_by_point[port.address.point].append(port_id)
    for port_ids in ports_by_point.values():
        port_ids.sort()

    positions: dict[str, LaidPoint] = {}
    for point_id, port_ids in ports_by_point.items():
        center = point_positions.get(point_id)
        if center is None:
            continue
        count = len(port_ids)
        for index, port_id in enumerate(port_ids):
            angle = _port_angle(index, count)
            positions[port_id] = LaidPoint(
                x=center.x + PORT_OFFSET_RADIUS * _cos(angle),
                y=center.y + PORT_OFFSET_RADIUS * _sin(angle),
                level=center.level,
                column=center.column,
            )
    return positions


def _port_angle(index: int, count: int) -> float:
    from math import tau

    if count <= 0:
        return 0.0
    return (tau * index) / count


def _cos(angle: float) -> float:
    from math import cos

    return round(cos(angle), 6)


def _sin(angle: float) -> float:
    from math import sin

    return round(sin(angle), 6)
