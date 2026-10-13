from __future__ import annotations

from dataclasses import dataclass

from .logic_core import Address, AddressGraph, Connection


@dataclass(frozen=True)
class ExampleMaze:
    id: str
    graph: AddressGraph
    solution: str
    expected_accepts: bool = True


def create_jam_path(n: int) -> str:
    if n == 2:
        return "(1"
    num = [{"solve": ""}, {"solve": "(2", "resolve": ""}]
    for index in range(2, n):
        num.append(
            {
                "solve": f'{num[index - 1]["solve"]}(1{num[index - 2]["solve"]}){num[index - 1]["resolve"]}{index + 1}',
                "resolve": f'1{num[index - 2]["solve"]}){num[index - 1]["resolve"]}',
            }
        )
    return num[n - 1]["solve"]


def graph_from_legacy_pda(
    id: str,
    transition_specs: list[tuple[str, str]],
    start: str,
    goals: set[str],
) -> AddressGraph:
    connections: list[Connection] = []
    for index, (path_pair, maze_change) in enumerate(transition_specs, start=1):
        left, right = path_pair.split("-")
        symbol = maze_change.strip("/")
        if left == right:
            connections.append(Connection.parse(f"{id}_c{index}_enter", left, f"{symbol}.{right}", "(", maze_change))
            connections.append(Connection.parse(f"{id}_c{index}_exit", f"{symbol}.{right}", left, ")", maze_change))
        elif maze_change.startswith("/"):
            connections.append(Connection.parse(f"{id}_c{index}_push", left, f"{symbol}.{right}", right, maze_change))
            connections.append(Connection.parse(f"{id}_c{index}_pop", f"{symbol}.{right}", left, left, maze_change))
        else:
            connections.append(Connection.parse(f"{id}_c{index}_pop", f"{symbol}.{left}", right, right, maze_change))
            connections.append(Connection.parse(f"{id}_c{index}_push", right, f"{symbol}.{left}", left, maze_change))
    return AddressGraph(
        id=id,
        start=Address.parse(start),
        goals={Address.parse(goal) for goal in goals},
        connections=connections,
    )


def skeptic_play_1() -> ExampleMaze:
    return ExampleMaze(
        id="skeptic_play_1",
        graph=graph_from_legacy_pda(
            "skeptic_play_1",
            [
                ("1-2", "/A"),
                ("1-3", "/B"),
                ("1-4", "A/"),
                ("1-5", "B/"),
                ("2-4", "B/"),
                ("2-5", "/A"),
                ("2-6", "A/"),
                ("3-4", "/B"),
                ("6-6", "/B"),
            ],
            "1",
            {"2"},
        ),
        solution="34126(21524126(21524126(2152",
    )


def wolfram_2() -> ExampleMaze:
    """Current transition set with the longer solution string.

    The legacy script defines this as `path1` but does not run it by default.
    """

    return ExampleMaze(
        id="wolfram_2_current_long_solution",
        graph=graph_from_legacy_pda("wolfram_2_current_long_solution", _wolfram_2_specs(), "B", {"A"}),
        solution="3768:(8;1)4=:@139<8A",
    )


def wolfram_2_short_candidate() -> ExampleMaze:
    """The shorter legacy `path` with the current transition set.

    This documents the current failure rather than treating it as a core
    execution bug.
    """

    return ExampleMaze(
        id="wolfram_2_short_candidate_unresolved",
        graph=graph_from_legacy_pda("wolfram_2_short_candidate_unresolved", _wolfram_2_specs(), "B", {"A"}),
        solution="3768:(8;1)?8:)8A",
        expected_accepts=False,
    )


def wolfram_2_short_repaired() -> ExampleMaze:
    """Short Wolfram #2 solution with `3-7` modeled as `A/` instead of `/B`."""

    specs = [spec for spec in _wolfram_2_specs() if spec != ("3-7", "/B")]
    specs.append(("3-7", "A/"))
    return ExampleMaze(
        id="wolfram_2_short_repaired",
        graph=graph_from_legacy_pda("wolfram_2_short_repaired", specs, "B", {"A"}),
        solution="3768:(8;1)?8:)8A",
    )


def _wolfram_2_specs() -> list[tuple[str, str]]:
    return [
        ("1-1", "/A"),
        ("1-3", "C/"),
        ("1-4", "B/"),
        ("1-;", "A/"),
        ("1-?", "B/"),
        ("1-@", "C/"),
        ("2-4", "/A"),
        ("3-5", "/A"),
        ("3-7", "/B"),
        ("3-9", "B/"),
        ("3-B", "A/"),
        ("4-5", "B/"),
        ("4-=", "C/"),
        ("6-7", "C/"),
        ("6-8", "/B"),
        ("7->", "C/"),
        ("8-:", "/A"),
        ("8-;", "A/"),
        ("8-<", "C/"),
        ("8->", "C/"),
        ("8-?", "A/"),
        ("8-A", "C/"),
        ("9-<", "A/"),
        (":-:", "/A"),
        (":-=", "B/"),
        (":-@", "B/"),
        ("3-C", "A/"),
        ("7-C", "A/"),
    ]


def jay_mcarthur_1() -> ExampleMaze:
    return ExampleMaze(
        id="jay_mcarthur_1",
        graph=graph_from_legacy_pda(
            "jay_mcarthur_1",
            [
                ("1-1", "A/"),
                ("1-2", "A/"),
                ("1-3", "B/"),
                ("1-4", "C/"),
                ("1-5", "D/"),
                ("1-6", "E/"),
                ("1-7", "F/"),
                ("2-2", "B/"),
                ("3-3", "C/"),
                ("4-4", "D/"),
                ("5-5", "E/"),
                ("6-6", "F/"),
                ("1-8", "G/"),
                ("1-9", "H/"),
                ("7-7", "G/"),
                ("8-8", "H/"),
            ],
            "1",
            {"9"},
        ),
        solution=create_jam_path(9),
    )


def inner_frame() -> ExampleMaze:
    return ExampleMaze(
        id="inner_frame",
        graph=graph_from_legacy_pda(
            "inner_frame",
            [
                ("1-2", "A/"),
                ("1-3", "/A"),
                ("1-4", "/A"),
                ("1-5", "A/"),
                ("2-3", "A/"),
                ("2-4", "A/"),
                ("4-5", "A/"),
                ("5-5", "A/"),
            ],
            "1",
            {"2"},
        ),
        solution="4215)412",
    )


def skeptic_play_3() -> ExampleMaze:
    return ExampleMaze(
        id="skeptic_play_3",
        graph=graph_from_legacy_pda(
            "skeptic_play_3",
            [
                ("1-4", "C/"),
                ("1-9", "D/"),
                ("1-;", "/A"),
                ("2-8", "/A"),
                ("2-:", "/A"),
                ("3-5", "/A"),
                ("3-6", "/A"),
                ("3-7", "D/"),
                ("3-=", "B/"),
                ("4-7", "D/"),
                ("4-8", "D/"),
                ("4-<", "B/"),
                ("4-=", "B/"),
                ("5-7", "/C"),
                ("5-:", "/C"),
                ("5-<", "B/"),
                ("6-7", "B/"),
                ("6-;", "/C"),
                ("7-7", "/C"),
                ("7-9", "D/"),
                ("7-=", "/C"),
                ("8-;", "B/"),
                (":-=", "/D"),
            ],
            "8",
            {":"},
        ),
        solution="4736;847(5<4=76;847(5<4=748;1976;847(5<4=7(5<4=:",
    )


def all_examples() -> list[ExampleMaze]:
    return [
        skeptic_play_1(),
        wolfram_2(),
        wolfram_2_short_candidate(),
        wolfram_2_short_repaired(),
        jay_mcarthur_1(),
        inner_frame(),
        skeptic_play_3(),
    ]
