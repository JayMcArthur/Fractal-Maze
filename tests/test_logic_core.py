import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fractal_maze_lab.logic_core import (  # noqa: E402
    Address,
    AddressGraph,
    BlockAddress,
    BlockMoveGenerator,
    CantorHopRule,
    Connection,
    ExecutionError,
    ProofRule,
    ProofPathStep,
    RuntimeState,
)
from fractal_maze_lab.port_graph import Port, PortGraph, PortTransition, PortTransitionGroup  # noqa: E402
from fractal_maze_lab.solver import (  # noqa: E402
    SolveStatus,
    default_strategy_registry,
    solve_address_graph_bfs,
    solve_fractal_block_bounded,
    solve_with_proof_rule,
)
from fractal_maze_lab.tiled_port_graph import (  # noqa: E402
    Terminal,
    TiledPortGraph,
    TiledState,
)
from fractal_maze_lab.pda_examples import (  # noqa: E402
    all_examples,
    skeptic_play_1,
    wolfram_2,
    wolfram_2_short_candidate,
    wolfram_2_short_repaired,
)
from fractal_maze_lab.package_loader import (  # noqa: E402
    load_package,
    load_port_graph_logic,
    load_referenced_solution,
    replay_solution,
)
from fractal_maze_lab.package_validation import validate_package_file  # noqa: E402
from fractal_maze_lab.cli import main as cli_main  # noqa: E402
from fractal_maze_lab.fractal_block import (  # noqa: E402
    KOTEITAN_DEFAULT_PATTERN,
    FractalBlockMaze,
    FractalBlockPattern,
)


class AddressGraphTests(unittest.TestCase):
    def test_push_and_pop_connections_update_symbolic_address(self):
        graph = AddressGraph(
            id="simple",
            start=Address.parse("1"),
            goals={Address.parse("4")},
            connections=[
                Connection.parse("enter_a", "1", "A.2", "enter"),
                Connection.parse("exit_a", "A.2", "4", "exit"),
            ],
        )

        state = graph.initial_state()
        state, enter = graph.apply(state, "enter")
        self.assertEqual(str(state.address), "A.2")
        self.assertEqual(enter.stack_before, ("ROOT",))
        self.assertEqual(enter.stack_after, ("ROOT", "A"))

        state, exit_record = graph.apply(state, "exit")
        self.assertEqual(str(state.address), "4")
        self.assertEqual(exit_record.stack_before, ("ROOT", "A"))
        self.assertEqual(exit_record.stack_after, ("ROOT",))
        self.assertTrue(graph.is_goal(state))

    def test_connection_patterns_apply_at_deeper_prefixes(self):
        graph = skeptic_play_1().graph
        state = RuntimeState(Address.parse("B.B.6"))

        state, record = graph.apply(state, "(")

        self.assertEqual(str(state.address), "B.B.B.6")
        self.assertEqual(record.stack_before, ("ROOT", "B", "B"))
        self.assertEqual(record.stack_after, ("ROOT", "B", "B", "B"))

    def test_unknown_input_raises_execution_error(self):
        graph = skeptic_play_1().graph

        with self.assertRaises(ExecutionError):
            graph.apply(graph.initial_state(), "not-a-move")

    def test_ports_disambiguate_same_label_and_stack_context(self):
        graph = AddressGraph(
            id="wolfram_2_port_spike",
            start=Address.parse("A.3"),
            goals={Address.parse("7"), Address.parse("A.B.7")},
            connections=[
                Connection.parse("enter_b_from_3_to_7", "3", "B.7", "7").with_port("3.to_B"),
                Connection.parse("exit_a_from_3_to_7", "A.3", "7", "7").with_port("A.3.exit"),
            ],
        )
        state = RuntimeState.start("A.3")

        with self.assertRaises(ExecutionError):
            graph.apply(state, "7")

        entered, enter_record = graph.apply(graph.with_port(state, "3.to_B"), "7")
        exited, exit_record = graph.apply(graph.with_port(state, "A.3.exit"), "7")

        self.assertEqual(str(entered.address), "A.B.7")
        self.assertEqual(str(exited.address), "7")
        self.assertEqual(enter_record.stack_after, ("ROOT", "A", "B"))
        self.assertEqual(exit_record.stack_after, ("ROOT",))


class PortGraphTests(unittest.TestCase):
    def test_port_graph_normalization_promotes_ambiguous_path_label_to_ports(self):
        connections = [
            Connection.parse("enter_b_from_3_to_7", "3", "B.7", "7"),
            Connection.parse("exit_a_from_3_to_7", "A.3", "7", "7"),
        ]

        port_graph = PortGraph.normalize_connections(
            "wolfram_2_port_normalized",
            start=Address.parse("A.3"),
            goals={Address.parse("7"), Address.parse("A.B.7")},
            connections=connections,
        )
        compiled = port_graph.compile_address_graph()
        state = RuntimeState.start("A.3")

        self.assertEqual(port_graph.ambiguous_inputs(), [("3", "7")])
        with self.assertRaises(ExecutionError):
            compiled.apply(state, "7")

        enter_port = "3@7:enter_b_from_3_to_7"
        exit_port = "A.3@7:exit_a_from_3_to_7"
        entered, _ = compiled.apply(compiled.with_port(state, enter_port), "7")
        exited, _ = compiled.apply(compiled.with_port(state, exit_port), "7")

        self.assertEqual(str(entered.address), "A.B.7")
        self.assertEqual(str(exited.address), "7")

    def test_port_graph_validation_rejects_dangling_transition_port(self):
        port_graph = PortGraph(
            id="broken",
            start=Address.parse("1"),
            goals={Address.parse("2")},
            ports={},
            transitions=[
                PortTransition(
                    id="missing_port",
                    source=Address.parse("1"),
                    target=Address.parse("2"),
                    input="go",
                    from_port="1.go",
                )
            ],
        )

        self.assertEqual(
            port_graph.validation_errors(),
            ["transition 'missing_port' references missing port '1.go'"],
        )

    def test_port_graph_validation_rejects_port_source_mismatch(self):
        port_graph = PortGraph(
            id="broken",
            start=Address.parse("1"),
            goals={Address.parse("2")},
            ports={"1.go": Port(id="1.go", address=Address.parse("1"))},
            transitions=[
                PortTransition(
                    id="wrong_source",
                    source=Address.parse("A.1"),
                    target=Address.parse("2"),
                    input="go",
                    from_port="1.go",
                )
            ],
        )

        self.assertEqual(
            port_graph.validation_errors(),
            ["transition 'wrong_source' source A.1 does not match port '1.go' address 1"],
        )

    def test_port_graph_validation_rejects_malformed_transition_group(self):
        port_graph = PortGraph(
            id="broken_group",
            start=Address.parse("1"),
            goals={Address.parse("2")},
            ports={"1.go": Port(id="1.go", address=Address.parse("1"))},
            transitions=[
                PortTransition(
                    id="one_to_two",
                    source=Address.parse("1"),
                    target=Address.parse("2"),
                    input="go",
                    from_port="1.go",
                )
            ],
            transition_groups=[
                PortTransitionGroup(
                    id="bad_two_way",
                    direction="two_way",
                    transition_ids=("one_to_two",),
                )
            ],
        )

        self.assertEqual(
            port_graph.validation_errors(),
            ["two-way transition group 'bad_two_way' must reference exactly two transitions"],
        )

    def test_port_graph_compile_pda_stack_names_the_strategy_boundary(self):
        port_graph = PortGraph.normalize_connections(
            "simple",
            start=Address.parse("1"),
            goals={Address.parse("2")},
            connections=[Connection.parse("one_to_two", "1", "2", "go")],
        )

        compiled = port_graph.compile_pda_stack()
        state = compiled.with_port(compiled.initial_state(), "1@go:one_to_two")
        state, _ = compiled.apply(state, "go")

        self.assertTrue(compiled.is_goal(state))


class PdaExampleTests(unittest.TestCase):
    def test_known_examples_accept_expected_solution_strings(self):
        failures = []
        for example in all_examples():
            accepted = example.graph.accepts(example.solution)
            if example.expected_accepts and not accepted:
                failures.append(example.id)
            if not example.expected_accepts and accepted:
                failures.append(f"{example.id} unexpectedly accepted")
        self.assertEqual(failures, [])

    def test_wolfram_2_current_transition_set_accepts_long_solution(self):
        example = wolfram_2()
        state, history = example.graph.run(example.solution)

        self.assertEqual(str(state.address), "A")
        self.assertTrue(example.graph.is_goal(state))
        self.assertEqual(len(history), len(example.solution))

    def test_wolfram_2_short_candidate_documents_current_failure(self):
        example = wolfram_2_short_candidate()
        state, history = example.graph.run(example.solution)

        self.assertEqual(str(state.address), "A.B.A")
        self.assertFalse(example.graph.is_goal(state))
        self.assertEqual(len(history), len(example.solution))

    def test_wolfram_2_short_solution_accepts_with_3_7_repair(self):
        example = wolfram_2_short_repaired()
        state, history = example.graph.run(example.solution)

        self.assertEqual(str(state.address), "A")
        self.assertTrue(example.graph.is_goal(state))
        self.assertEqual(len(history), len(example.solution))


class PackageFixtureTests(unittest.TestCase):
    def test_skeptic_play_1_package_loads_port_graph_logic(self):
        package = load_package(Path("packages/source/skeptic_play_1/package.yml"))

        self.assertEqual(package.manifest["id"], "skeptic_play_1")
        self.assertEqual(package.manifest["primary_authoring"], "port_graph")
        self.assertEqual(package.logic["strategy"], "pda_stack")
        self.assertEqual(package.logic["source_model"], "port_graph")
        self.assertEqual(package.port_graph.validation_errors(), [])
        self.assertEqual(package.visual["format"], "fmaze-visual-v0")
        self.assertEqual(package.visual["default_view"], "clean_vector")

    def test_skeptic_play_1_visual_mapping_uses_svg_element_hooks(self):
        result = validate_package_file(Path("packages/source/skeptic_play_1/package.yml"))

        self.assertTrue(result.valid, [issue.format() for issue in result.issues])

        package = load_package(Path("packages/source/skeptic_play_1/package.yml"))
        route_segments = {segment["id"]: segment for segment in package.visual["route_segments"]}

        self.assertEqual(route_segments["seg_p1_to_A_p2_main"]["element"], "#path10741-7")
        self.assertEqual(package.visual["activation_points"][0]["transition_id"], "t_p1_to_A_p2")

    def test_skeptic_play_1_visual_mapping_covers_every_transition_and_port(self):
        package = load_package(Path("packages/source/skeptic_play_1/package.yml"))

        logic_transition_ids = {transition.id for transition in package.port_graph.transitions}
        visual_route_transition_ids = {
            route["transition_id"]
            for route in package.visual["routes"]
            if "transition_id" in route
        }
        action_transition_ids = {
            action["transition_id"]
            for action in package.visual["action_presentations"]
        }
        activation_transition_ids = {
            activation["transition_id"]
            for activation in package.visual["activation_points"]
            if "transition_id" in activation
        }
        activation_port_ids = {
            activation["port_id"]
            for activation in package.visual["activation_points"]
            if "port_id" in activation
        }

        self.assertEqual(visual_route_transition_ids, logic_transition_ids)
        self.assertEqual(action_transition_ids, logic_transition_ids)
        self.assertEqual(activation_transition_ids, logic_transition_ids)
        self.assertEqual(activation_port_ids, set(package.port_graph.ports))

    def test_skeptic_play_1_visual_mapping_anchors_every_point(self):
        package = load_package(Path("packages/source/skeptic_play_1/package.yml"))

        logic_point_ids = {
            point["id"]
            for point in package.logic["points"]
        }
        anchor_targets = {
            anchor["logical_object"]
            for anchor in package.visual["anchors"]
        }

        self.assertEqual(anchor_targets, logic_point_ids)

    def test_skeptic_play_1_known_solution_replays_to_goal(self):
        package = load_package(Path("packages/source/skeptic_play_1/package.yml"))
        solution = load_referenced_solution(package, "known")

        replay = replay_solution(package, solution)

        self.assertEqual(str(replay.final_state.address), "p2")
        self.assertTrue(package.compile_runtime().is_goal(replay.final_state))
        self.assertEqual(len(replay.history), len(solution["steps"]))

    def test_port_graph_package_solve_uses_explicit_transition_selection(self):
        package = load_package(Path("packages/source/wolfram_0/package.yml"))

        result = package.solve(state_limit=1000)

        self.assertTrue(result.solved)
        self.assertEqual(str(result.path[-1].address), "p1")

    def test_wolfram_2_package_replays_both_port_selected_solutions(self):
        package = load_package(Path("packages/source/wolfram_2/package.yml"))

        current_long = replay_solution(package, load_referenced_solution(package, "current_long"))
        short_repaired = replay_solution(package, load_referenced_solution(package, "short_repaired"))

        group_ids = [group.id for group in package.port_graph.transition_groups]
        self.assertEqual({group.direction for group in package.port_graph.transition_groups}, {"two_way"})
        self.assertLess(group_ids.index("g_p3_to_mB_p7"), group_ids.index("g_mB_p4_to_p5"))
        self.assertEqual(str(current_long.final_state.address), "pA")
        self.assertEqual(str(short_repaired.final_state.address), "pA")
        self.assertTrue(package.compile_runtime().is_goal(current_long.final_state))
        self.assertTrue(package.compile_runtime().is_goal(short_repaired.final_state))

    def test_wolfram_2_package_keeps_3_to_7_ambiguous_until_port_selected(self):
        package = load_package(Path("packages/source/wolfram_2/package.yml"))
        runtime = package.compile_runtime()
        state = RuntimeState.start("mA.p3")

        self.assertIn(("p3", "7"), package.port_graph.ambiguous_inputs())
        with self.assertRaises(ExecutionError):
            runtime.apply(state, "7")

        entered, enter_record = runtime.apply(runtime.with_port(state, "p3_to_mB_p7"), "7")
        exited, exit_record = runtime.apply(runtime.with_port(state, "mA_p3_to_p7"), "7")

        self.assertEqual(str(entered.address), "mA.mB.p7")
        self.assertEqual(str(exited.address), "p7")
        self.assertEqual(enter_record.transition_id, "t_p3_to_mB_p7")
        self.assertEqual(exit_record.transition_id, "t_mA_p3_to_p7")

    def test_package_loader_supports_one_way_transition_group(self):
        graph = load_port_graph_logic(
            {
                "format": "fmaze-logic-v0",
                "id": "one_way_fixture",
                "strategy": "pda_stack",
                "source_model": "port_graph",
                "start": "p1",
                "goals": ["p2"],
                "ports": [
                    {"id": "p1_to_p2", "point": "p1", "label": "2"},
                ],
                "transition_groups": [
                    {
                        "id": "g_p1_to_p2",
                        "direction": "one_way",
                        "forward": {
                            "id": "t_p1_to_p2",
                            "from_port": "p1_to_p2",
                            "source": "p1",
                            "target": "p2",
                            "input": "2",
                        },
                    }
                ],
            }
        )

        self.assertEqual(graph.transition_groups[0].direction, "one_way")
        self.assertEqual(graph.transition_groups[0].transition_ids, ("t_p1_to_p2",))
        runtime = graph.compile_pda_stack()
        state, _ = runtime.apply(runtime.with_port(runtime.initial_state(), "p1_to_p2"), "2")

        self.assertEqual(str(state.address), "p2")
        with self.assertRaises(ExecutionError):
            runtime.apply(state, "1")

    def test_package_validator_accepts_committed_source_packages(self):
        package_paths = sorted(Path("packages/source").glob("*/package.yml"))
        failures = {
            str(path): [issue.format() for issue in validate_package_file(path).issues]
            for path in package_paths
            if not validate_package_file(path).valid
        }

        self.assertEqual(failures, {})

    def test_cantor_package_uses_optional_proof_edge_for_replay(self):
        package = load_package(Path("packages/source/cantor_proof_1/package.yml"))
        solution = load_referenced_solution(package, "proof_assisted")

        with self.assertRaises(ExecutionError):
            replay_solution(package, solution)

        replay = replay_solution(package, solution, include_proof_edges=True)

        self.assertEqual(str(replay.final_state.address), "p4")
        self.assertTrue(package.compile_runtime(include_proof_edges=True).is_goal(replay.final_state))
        self.assertEqual([record.step_type for record in replay.history], ["physical", "proof", "physical"])
        self.assertEqual(replay.history[1].transition_id, "pe_cantor_p2_to_p3")

    def test_infinite_hop_package_uses_rule_shaped_proof_edge(self):
        package = load_package(Path("packages/source/infinite_hop_1/package.yml"))
        solution = load_referenced_solution(package, "proof_assisted")

        replay = replay_solution(package, solution, include_proof_edges=True)

        self.assertEqual(str(replay.final_state.address), "p2")
        self.assertEqual([record.step_type for record in replay.history], ["proof"])
        edge = package.port_graph.proof_edges["pe_infinite_p1_to_p2"]
        self.assertEqual(edge.proof_method, "simplified_infinite_hop")
        self.assertEqual(edge.proof_validation_errors(package.compile_runtime(include_proof_edges=True)), [])

    def test_cantor_hop_package_uses_rule_shaped_proof_edge(self):
        package = load_package(Path("packages/source/cantor_proof_1/package.yml"))

        edge = package.port_graph.proof_edges["pe_cantor_p2_to_p3"]

        self.assertEqual(edge.proof_method, "simplified_cantor_hop")
        self.assertEqual(edge.proof_validation_errors(package.compile_runtime(include_proof_edges=True)), [])

    def test_cantor_solution_must_submit_proof_before_using_edge(self):
        package = load_package(Path("packages/source/cantor_proof_1/package.yml"))
        solution = {
            "format": "fmaze-solution-v0",
            "id": "missing_proof_submission",
            "maze": "cantor_proof_1",
            "logic": "../logic.yml",
            "steps": [
                {"transition_id": "t_p1_to_p2"},
                {"proof_edge_id": "pe_cantor_p2_to_p3"},
            ],
        }

        with self.assertRaisesRegex(ExecutionError, "before proving it"):
            replay_solution(package, solution, include_proof_edges=True)

    def test_package_validator_reports_broken_references_and_solution_steps(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "package.yml").write_text(
                "\n".join(
                    [
                        "format: fmaze-package-v0",
                        "id: broken",
                        "title: Broken",
                        "primary_authoring: port_graph",
                        "logic:",
                        "  href: logic.yml",
                        "  format: fmaze-logic-v0",
                        "solutions:",
                        "  - id: bad",
                        "    href: solutions/bad.yml",
                        "    format: fmaze-solution-v0",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "logic.yml").write_text(
                "\n".join(
                    [
                        "format: fmaze-logic-v0",
                        "id: broken",
                        "strategy: pda_stack",
                        "source_model: port_graph",
                        "start: p1",
                        "goals: [p2]",
                        "ports:",
                        "  - id: p1_to_p2",
                        "    point: p1",
                        "transition_groups:",
                        "  - id: g_bad",
                        "    direction: two_way",
                        "    forward:",
                        "      id: t_p1_to_p2",
                        "      from_port: missing_port",
                        "      source: p1",
                        "      target: p2",
                        "      input: '2'",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "solutions").mkdir()
            (root / "solutions" / "bad.yml").write_text(
                "\n".join(
                    [
                        "format: fmaze-solution-v0",
                        "id: bad",
                        "maze: broken",
                        "logic: ../logic.yml",
                        "steps:",
                        "  - transition_id: t_missing",
                    ]
                ),
                encoding="utf-8",
            )

            result = validate_package_file(root / "package.yml")

        messages = [issue.message for issue in result.issues]
        self.assertIn("two_way group must contain forward and reverse", messages)
        self.assertIn("transition references missing port 'missing_port'", messages)
        self.assertIn("unknown transition 't_missing'", messages)

    def test_package_validator_replays_known_good_solution_to_goal(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "package.yml").write_text(
                "\n".join(
                    [
                        "format: fmaze-package-v0",
                        "id: broken_goal",
                        "title: Broken Goal",
                        "primary_authoring: port_graph",
                        "logic:",
                        "  href: logic.yml",
                        "  format: fmaze-logic-v0",
                        "solutions:",
                        "  - id: bad_goal",
                        "    href: solutions/bad_goal.yml",
                        "    format: fmaze-solution-v0",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "logic.yml").write_text(
                "\n".join(
                    [
                        "format: fmaze-logic-v0",
                        "id: broken_goal",
                        "strategy: pda_stack",
                        "source_model: port_graph",
                        "start: p1",
                        "goals: [p3]",
                        "ports:",
                        "  - id: p1_to_p2",
                        "    point: p1",
                        "transitions:",
                        "  - id: t_p1_to_p2",
                        "    from_port: p1_to_p2",
                        "    source: p1",
                        "    target: p2",
                        "    input: '2'",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "solutions").mkdir()
            (root / "solutions" / "bad_goal.yml").write_text(
                "\n".join(
                    [
                        "format: fmaze-solution-v0",
                        "id: bad_goal",
                        "maze: broken_goal",
                        "logic: ../logic.yml",
                        "expects_goal: true",
                        "steps:",
                        "  - transition_id: t_p1_to_p2",
                    ]
                ),
                encoding="utf-8",
            )

            result = validate_package_file(root / "package.yml")

        self.assertIn("expected goal but replay ended at p2", [issue.message for issue in result.issues])

    def test_package_validator_reports_missing_svg_element_reference(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "package.yml").write_text(
                "\n".join(
                    [
                        "format: fmaze-package-v0",
                        "id: broken_visual",
                        "title: Broken Visual",
                        "primary_authoring: port_graph",
                        "logic:",
                        "  href: logic.yml",
                        "  format: fmaze-logic-v0",
                        "visual:",
                        "  href: visual.yml",
                        "  format: fmaze-visual-v0",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "logic.yml").write_text(
                "\n".join(
                    [
                        "format: fmaze-logic-v0",
                        "id: broken_visual",
                        "strategy: pda_stack",
                        "source_model: port_graph",
                        "start: p1",
                        "goals: [p2]",
                        "points:",
                        "  - id: p1",
                        "ports:",
                        "  - id: p1_to_p2",
                        "    point: p1",
                        "transitions:",
                        "  - id: t_p1_to_p2",
                        "    from_port: p1_to_p2",
                        "    source: p1",
                        "    target: p2",
                        "    input: '2'",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "maze.svg").write_text(
                "<svg xmlns='http://www.w3.org/2000/svg'><path id='real-path' /></svg>",
                encoding="utf-8",
            )
            (root / "visual.yml").write_text(
                "\n".join(
                    [
                        "format: fmaze-visual-v0",
                        "maze: broken_visual",
                        "logic: logic.yml",
                        "default_view: clean_vector",
                        "assets:",
                        "  - id: clean_svg",
                        "    href: maze.svg",
                        "    media_type: image/svg+xml",
                        "views:",
                        "  - id: clean_vector",
                        "    kind: authored_vector",
                        "    asset: clean_svg",
                        "route_segments:",
                        "  - id: bad_segment",
                        "    view: clean_vector",
                        "    element: '#missing-path'",
                        "routes:",
                        "  - id: bad_route",
                        "    transition_id: t_p1_to_p2",
                        "    segments: [bad_segment]",
                    ]
                ),
                encoding="utf-8",
            )

            result = validate_package_file(root / "package.yml")

        self.assertIn("references missing SVG element '#missing-path'", [issue.message for issue in result.issues])

    def test_package_validator_reports_visual_transition_port_mismatch(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "package.yml").write_text(
                "\n".join(
                    [
                        "format: fmaze-package-v0",
                        "id: broken_visual",
                        "title: Broken Visual",
                        "primary_authoring: port_graph",
                        "logic:",
                        "  href: logic.yml",
                        "  format: fmaze-logic-v0",
                        "visual:",
                        "  href: visual.yml",
                        "  format: fmaze-visual-v0",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "logic.yml").write_text(
                "\n".join(
                    [
                        "format: fmaze-logic-v0",
                        "id: broken_visual",
                        "strategy: pda_stack",
                        "source_model: port_graph",
                        "start: p1",
                        "goals: [p2]",
                        "points:",
                        "  - id: p1",
                        "ports:",
                        "  - id: p1_to_p2",
                        "    point: p1",
                        "  - id: p1_wrong",
                        "    point: p1",
                        "transitions:",
                        "  - id: t_p1_to_p2",
                        "    from_port: p1_to_p2",
                        "    source: p1",
                        "    target: p2",
                        "    input: '2'",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "maze.svg").write_text(
                "<svg xmlns='http://www.w3.org/2000/svg'><circle id='endpoint' /></svg>",
                encoding="utf-8",
            )
            (root / "visual.yml").write_text(
                "\n".join(
                    [
                        "format: fmaze-visual-v0",
                        "maze: broken_visual",
                        "logic: logic.yml",
                        "default_view: clean_vector",
                        "assets:",
                        "  - id: clean_svg",
                        "    href: maze.svg",
                        "    media_type: image/svg+xml",
                        "views:",
                        "  - id: clean_vector",
                        "    kind: authored_vector",
                        "    asset: clean_svg",
                        "activation_points:",
                        "  - id: bad_endpoint",
                        "    transition_id: t_p1_to_p2",
                        "    port_id: p1_wrong",
                        "    view: clean_vector",
                        "    element: '#endpoint'",
                    ]
                ),
                encoding="utf-8",
            )

            result = validate_package_file(root / "package.yml")

        self.assertIn(
            "activation point port 'p1_wrong' does not match transition 't_p1_to_p2' from_port 'p1_to_p2'",
            [issue.message for issue in result.issues],
        )

    def test_package_validator_reports_visual_manifest_and_view_mismatch(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "package.yml").write_text(
                "\n".join(
                    [
                        "format: fmaze-package-v0",
                        "id: broken_visual",
                        "title: Broken Visual",
                        "primary_authoring: port_graph",
                        "logic:",
                        "  href: logic.yml",
                        "  format: fmaze-logic-v0",
                        "visual:",
                        "  href: visual.yml",
                        "  format: fmaze-visual-v0",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "logic.yml").write_text(
                "\n".join(
                    [
                        "format: fmaze-logic-v0",
                        "id: broken_visual",
                        "strategy: pda_stack",
                        "source_model: port_graph",
                        "start: p1",
                        "goals: [p2]",
                        "ports:",
                        "  - id: p1_to_p2",
                        "    point: p1",
                        "transitions:",
                        "  - id: t_p1_to_p2",
                        "    from_port: p1_to_p2",
                        "    source: p1",
                        "    target: p2",
                        "    input: '2'",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "scan.jpg").write_text("not really a jpg", encoding="utf-8")
            (root / "visual.yml").write_text(
                "\n".join(
                    [
                        "format: fmaze-visual-v0",
                        "maze: other_maze",
                        "logic: other_logic.yml",
                        "default_view: clean_vector",
                        "assets:",
                        "  - id: scan",
                        "    href: scan.jpg",
                        "    media_type: image/jpeg",
                        "views:",
                        "  - id: clean_vector",
                        "    kind: authored_vector",
                        "    asset: scan",
                        "    default: true",
                    ]
                ),
                encoding="utf-8",
            )

            result = validate_package_file(root / "package.yml")

        messages = [issue.message for issue in result.issues]
        self.assertIn("visual maze does not match package id 'broken_visual'", messages)
        self.assertIn("visual logic reference must be 'logic.yml'", messages)
        self.assertIn("authored_vector view requires image/svg+xml asset, got 'image/jpeg'", messages)


class CliTests(unittest.TestCase):
    def run_cli(self, *args: str) -> tuple[int, str, str]:
        stdout = StringIO()
        stderr = StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            code = cli_main(args)
        return code, stdout.getvalue(), stderr.getvalue()

    def test_cli_validate_reports_committed_package_pass(self):
        code, stdout, stderr = self.run_cli("validate", "packages/source/skeptic_play_1/package.yml")

        self.assertEqual(code, 0)
        self.assertIn("PASS packages/source/skeptic_play_1/package.yml", stdout)
        self.assertEqual(stderr, "")

    def test_cli_solve_reports_solver_status(self):
        code, stdout, stderr = self.run_cli("solve", "packages/source/wolfram_0/package.yml")

        self.assertEqual(code, 0)
        self.assertIn("SOLVE wolfram_0 status=solved", stdout)
        self.assertIn("final=p1", stdout)
        self.assertEqual(stderr, "")

    def test_cli_replay_reports_solution_goal(self):
        code, stdout, stderr = self.run_cli("replay", "packages/source/wolfram_2/package.yml", "short_repaired")

        self.assertEqual(code, 0)
        self.assertIn("REPLAY wolfram_2 solution=short_repaired goal=True final=pA", stdout)
        self.assertEqual(stderr, "")

    def test_cli_explain_reports_port_ambiguity(self):
        code, stdout, stderr = self.run_cli("explain", "packages/source/wolfram_2/package.yml")

        self.assertEqual(code, 0)
        self.assertIn("strategy=pda_stack source_model=port_graph", stdout)
        self.assertIn("ambiguous_inputs=p3:7", stdout)
        self.assertEqual(stderr, "")

    def test_cli_explain_reports_visual_mapping_summary(self):
        code, stdout, stderr = self.run_cli("explain", "packages/source/skeptic_play_1/package.yml")

        self.assertEqual(code, 0)
        self.assertIn("visual=fmaze-visual-v0 default_view=clean_vector", stdout)
        self.assertIn("visual_views=clean_vector:authored_vector, source_scan:image_overlay", stdout)
        self.assertEqual(stderr, "")

    def test_cli_replay_visual_trace_derives_routes_from_solution_steps(self):
        code, stdout, stderr = self.run_cli(
            "replay",
            "packages/source/skeptic_play_1/package.yml",
            "known",
            "--visual-trace",
        )

        self.assertEqual(code, 0)
        self.assertIn("VISUAL default_view=clean_vector", stdout)
        self.assertIn("001: t_p1_to_B_p3 route=route_p1_to_B_p3", stdout)
        self.assertIn("028: t_A_p5_to_p2 route=route_A_p5_to_p2", stdout)
        self.assertEqual(stderr, "")

    def test_cli_visualize_writes_replay_and_player_html(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "skeptic-player.html"

            code, stdout, stderr = self.run_cli(
                "visualize",
                "packages/source/skeptic_play_1/package.yml",
                "known",
                "--output",
                str(output),
            )

            html = output.read_text(encoding="utf-8")

        self.assertEqual(code, 0)
        self.assertIn(str(output), stdout)
        self.assertEqual(stderr, "")
        self.assertIn("<div class=\"panel-title\">Player</div>", html)
        self.assertIn("const player = ", html)
        self.assertIn("context-badge", html)
        self.assertIn("renderReplay", html)
        self.assertIn("updateCameraForState", html)
        self.assertIn("moveCamera", html)
        self.assertIn("requestAnimationFrame", html)
        self.assertIn("fmaze-overlay", html)
        self.assertIn("cloneRoute", html)
        self.assertIn("drawMarker", html)
        self.assertIn("list.scrollTop", html)
        self.assertNotIn("scrollIntoView", html)
        self.assertIn("fmaze-available", html)
        self.assertIn("fmaze-focus", html)
        self.assertIn("t_p1_to_B_p3", html)

    def test_cli_explain_reports_reference_record_status(self):
        code, stdout, stderr = self.run_cli("explain", "packages/source/berkly/package.yml")

        self.assertEqual(code, 0)
        self.assertIn("strategy=reference_record source_model=reference_record", stdout)
        self.assertIn("modeling_status=reference_only", stdout)
        self.assertEqual(stderr, "")


class ProofRuleTests(unittest.TestCase):
    def test_cantor_hop_records_proof_transition_without_physical_path(self):
        graph = AddressGraph(
            id="toy_cantor",
            start=Address.parse("1"),
            goals={Address.parse("3")},
            proof_rules={
                "cantor_hop_1_to_3": ProofRule(
                    id="cantor_hop_1_to_3",
                    proof_type="cantor_hop",
                    from_point="1",
                    to_point="3",
                    explanation="Toy Cantor hop: assume all non-empty nested strings connect 1 to 3.",
                )
            },
        )

        state, record = graph.apply_proof(graph.initial_state(), "cantor_hop_1_to_3")

        self.assertEqual(record.step_type, "proof")
        self.assertEqual(str(record.source), "1")
        self.assertEqual(str(record.target), "3")
        self.assertTrue(graph.is_goal(state))

    def test_simple_cantor_hop_validates_proof_path(self):
        graph = AddressGraph(
            id="simple_cantor",
            start=Address.parse("1"),
            goals={Address.parse("3")},
            connections=[
                Connection.parse("one_to_A1", "1", "A.1", "to_A1"),
                Connection.parse("A3_to_2", "A.3", "2", "A3_to_2"),
                Connection.parse("two_to_B1", "2", "B.1", "to_B1"),
                Connection.parse("B3_to_3", "B.3", "3", "B3_to_3"),
            ],
            cantor_rules={
                "cantor_hop_1_to_3": CantorHopRule(
                    id="cantor_hop_1_to_3",
                    from_point="1",
                    to_point="3",
                    proof_path=(
                        ProofPathStep.parse("physical", "1", "A.1"),
                        ProofPathStep.parse("assumption", "A.1", "A.3"),
                        ProofPathStep.parse("physical", "A.3", "2"),
                        ProofPathStep.parse("physical", "2", "B.1"),
                        ProofPathStep.parse("assumption", "B.1", "B.3"),
                        ProofPathStep.parse("physical", "B.3", "3"),
                    ),
                    explanation="Simple Cantor hop: assume T.1 connects to T.3 for every non-empty T, then prove 1 connects to 3.",
                )
            },
        )

        self.assertEqual(graph.validate_cantor_rule(graph.cantor_rules["cantor_hop_1_to_3"]), [])
        state, record = graph.apply_cantor(graph.initial_state(), "cantor_hop_1_to_3")

        self.assertEqual(record.step_type, "proof")
        self.assertEqual(str(record.source), "1")
        self.assertEqual(str(record.target), "3")
        self.assertTrue(graph.is_goal(state))

    def test_cantor_hop_rejects_missing_physical_step(self):
        graph = AddressGraph(
            id="broken_cantor",
            start=Address.parse("1"),
            goals={Address.parse("3")},
            cantor_rules={
                "cantor_hop_1_to_3": CantorHopRule(
                    id="cantor_hop_1_to_3",
                    from_point="1",
                    to_point="3",
                    proof_path=(
                        ProofPathStep.parse("physical", "1", "A.1"),
                        ProofPathStep.parse("assumption", "A.1", "A.3"),
                        ProofPathStep.parse("physical", "A.3", "3"),
                    ),
                    explanation="Broken Cantor hop.",
                )
            },
        )

        errors = graph.validate_cantor_rule(graph.cantor_rules["cantor_hop_1_to_3"])

        self.assertIn("missing physical proof step 1 -> A.1", errors)


class FractalBlockAddressTests(unittest.TestCase):
    def test_block_move_generator_tracks_coordinate_and_depth(self):
        generator = BlockMoveGenerator()
        address = BlockAddress(x=0, y=0, depth=0)

        address = generator.move(address, "east")
        address = generator.move(address, "descend")
        address = generator.move(address, "north")

        self.assertEqual(address, BlockAddress(x=1, y=-1, depth=1))

    def test_block_move_generator_rejects_ascending_above_root_depth(self):
        generator = BlockMoveGenerator()

        with self.assertRaises(ExecutionError):
            generator.move(BlockAddress(x=0, y=0, depth=0), "ascend")

    def test_koteitan_default_pattern_start_positions_match_bottom_entry(self):
        maze = FractalBlockMaze(FractalBlockPattern.from_rows(KOTEITAN_DEFAULT_PATTERN))

        starts = maze.start_positions(depth_limit=1)

        self.assertEqual(starts, (((2, 3),), ((3, 3),)))

    def test_koteitan_default_pattern_solves_by_depth_five(self):
        maze = FractalBlockMaze(FractalBlockPattern.from_rows(KOTEITAN_DEFAULT_PATTERN))

        result = maze.solve(depth_limit=5)

        self.assertTrue(result.solved)
        self.assertLessEqual(max(len(position) for position in result.path), 5)
        self.assertGreater(result.explored, 0)

    def test_fractal_block_solver_adapter_returns_shared_result(self):
        maze = FractalBlockMaze(FractalBlockPattern.from_rows(KOTEITAN_DEFAULT_PATTERN))

        result = solve_fractal_block_bounded(maze, depth_limit=5)

        self.assertEqual(result.status, SolveStatus.SOLVED)
        self.assertTrue(result.solved)
        self.assertEqual(result.bound, 5)

    def test_koteitan_fractal_block_package_loads_and_solves(self):
        package = load_package(Path("packages/source/koteitan_fractal_block_default/package.yml"))

        self.assertEqual(package.manifest["primary_authoring"], "fractal_block_pattern")
        self.assertEqual(package.logic["strategy"], "coordinate_path")
        self.assertEqual(package.logic["source_model"], "fractal_block_pattern")

        result = package.solve()

        self.assertEqual(result.status, SolveStatus.SOLVED)
        self.assertEqual(result.bound, 5)
        self.assertGreater(result.explored, 0)

    def test_tiny_repeated_tiled_package_loads_and_solves(self):
        package = load_package(Path("packages/source/tiny_repeated_tiled/package.yml"))

        self.assertEqual(package.manifest["primary_authoring"], "repeated_tile_ports")
        self.assertEqual(package.logic["strategy"], "tiled_port_graph")
        self.assertEqual(package.logic["source_model"], "repeated_tile_ports")

        result = package.solve()

        self.assertEqual(result.status, SolveStatus.SOLVED)
        self.assertEqual(result.bound, 20)
        self.assertEqual(
            result.path,
            (
                TiledState(0, 0, Terminal.parse("W0")),
                TiledState(0, 0, Terminal.parse("E0")),
                TiledState(1, 0, Terminal.parse("W0")),
                TiledState(1, 0, Terminal.parse("W1")),
            ),
        )


class TiledPortGraphTests(unittest.TestCase):
    def test_tiled_port_graph_solves_with_block_class_port_sets(self):
        graph = TiledPortGraph.from_sections(
            "tiny_repeated",
            {
                "zero": ["W0-E0"],
                "normal": [],
                "nx": [],
                "ny": ["W0-W1"],
            },
            start=TiledState(0, 0, Terminal.parse("W0")),
            goals={TiledState(1, 0, Terminal.parse("W1"))},
        )

        result = graph.solve_bfs(max_states=20)

        self.assertEqual(result.status, SolveStatus.SOLVED)
        self.assertEqual(
            result.path,
            (
                TiledState(0, 0, Terminal.parse("W0")),
                TiledState(0, 0, Terminal.parse("E0")),
                TiledState(1, 0, Terminal.parse("W0")),
                TiledState(1, 0, Terminal.parse("W1")),
            ),
        )

    def test_tiled_port_graph_reports_bounded_unknown_separately_from_solution(self):
        graph = TiledPortGraph.from_sections(
            "unbounded_line",
            {
                "zero": ["W0-E0"],
                "normal": ["W0-E0"],
                "nx": ["W0-E0"],
                "ny": ["W0-E0"],
            },
            start=TiledState(0, 0, Terminal.parse("W0")),
            goals={TiledState(10, 0, Terminal.parse("W1"))},
        )

        result = graph.solve_bfs(max_states=2)

        self.assertEqual(result.status, SolveStatus.UNSOLVED_WITH_BOUND)
        self.assertFalse(result.solved)
        self.assertEqual(result.bound, 2)

    def test_tiled_port_graph_parses_repeated_maze_section_string(self):
        graph = TiledPortGraph.parse(
            "parsed",
            "normal: W0-N2; nx: E0-E1; ny: (none); zero: W0->E0",
        )

        self.assertEqual(graph.validation_errors(), [])
        self.assertEqual(
            graph.to_sections_text(),
            "normal: W0-N2; nx: E0-E1; ny: (none); zero: W0->E0",
        )

    def test_tiled_port_graph_directed_edges_do_not_reverse(self):
        graph = TiledPortGraph.parse(
            "directed",
            "normal: (none); nx: (none); ny: (none); zero: W0->E0",
            start=TiledState(0, 0, Terminal.parse("E0")),
            goals={TiledState(0, 0, Terminal.parse("W0"))},
        )

        result = graph.solve_bfs(max_states=5)

        self.assertEqual(result.status, SolveStatus.UNSOLVED_WITH_BOUND)
        self.assertFalse(result.solved)

    def test_tiled_port_graph_c_terminals_connect_inside_block(self):
        graph = TiledPortGraph.parse(
            "center",
            "normal: (none); nx: (none); ny: (none); zero: W0-C0, C0-W1",
            start=TiledState(0, 0, Terminal.parse("W0")),
            goals={TiledState(0, 0, Terminal.parse("W1"))},
        )

        result = graph.solve_bfs(max_states=10)

        self.assertEqual(result.status, SolveStatus.SOLVED)
        self.assertEqual(result.path[-1], TiledState(0, 0, Terminal.parse("W1")))


class SolverStrategyTests(unittest.TestCase):
    def test_default_strategy_registry_contains_builtin_logic_strategies(self):
        registry = default_strategy_registry()

        for strategy in ("pda_stack", "coordinate_path", "tiled_port_graph", "proof_rule"):
            self.assertTrue(registry.supports(strategy))
        self.assertFalse(registry.supports("unknown"))

    def test_address_graph_bfs_solver_returns_shared_result(self):
        graph = AddressGraph(
            id="simple",
            start=Address.parse("1"),
            goals={Address.parse("3")},
            connections=[
                Connection.parse("one_to_two", "1", "2", "a"),
                Connection.parse("two_to_three", "2", "3", "b"),
            ],
        )

        result = solve_address_graph_bfs(graph)

        self.assertEqual(result.status, SolveStatus.SOLVED)
        self.assertEqual([str(state.address) for state in result.path], ["1", "2", "3"])

    def test_proof_solver_adapter_returns_proved_status(self):
        graph = AddressGraph(
            id="toy_cantor",
            start=Address.parse("1"),
            goals={Address.parse("3")},
            proof_rules={
                "cantor_hop_1_to_3": ProofRule(
                    id="cantor_hop_1_to_3",
                    proof_type="cantor_hop",
                    from_point="1",
                    to_point="3",
                    explanation="Toy proof.",
                )
            },
        )

        result = solve_with_proof_rule(graph, "cantor_hop_1_to_3")

        self.assertEqual(result.status, SolveStatus.PROVED)
        self.assertTrue(result.solved)


if __name__ == "__main__":
    unittest.main()
