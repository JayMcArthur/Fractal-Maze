"""Round-trip test confirming the browser editor's YAML emit shape passes the
Python foundation's package validator.

The editor lives at web/src/editor/emit.ts. This test mirrors the shape of the
manifest + logic it produces using the same field ordering and contents, then
validates the result through validate_package_file.
"""
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "src"))

from fractal_maze_lab.package_loader import load_package, replay_solution  # noqa: E402
from fractal_maze_lab.package_validation import validate_package_file  # noqa: E402


PACKAGE_YML = '''format: fmaze-package-v0
id: editor_tiny_recursive
title: "Editor Tiny Recursive Draft"
primary_authoring: port_graph

logic:
  href: logic.yml
  format: fmaze-logic-v0

provenance:
  authored_by: fractal-maze-lab-workbench-editor
  authored_at: "2026-05-22T00:00:00Z"
'''


LOGIC_YML = '''format: fmaze-logic-v0
id: editor_tiny_recursive
strategy: pda_stack
source_model: port_graph
start: p1
goals:
  - p3

points:
  - id: p1
  - id: p2
  - id: p3

submazes:
  - id: A

ports:
  - id: p1_to_A_p1
    point: p1
    label: p1
  - id: A_p2_to_p3
    point: p2
    context:
      - A
    label: p3

transitions:
  - id: t_p1_to_A_p1
    from_port: p1_to_A_p1
    source: p1
    target: A.p1
    input: p1
  - id: t_A_p2_to_p3
    from_port: A_p2_to_p3
    source: A.p2
    target: p3
    input: p3
'''


class EditorEmittedPackageTests(unittest.TestCase):
    def _materialize(self) -> Path:
        tmp = Path(tempfile.mkdtemp(prefix="editor_emit_"))
        (tmp / "package.yml").write_text(PACKAGE_YML, encoding="utf-8")
        (tmp / "logic.yml").write_text(LOGIC_YML, encoding="utf-8")
        return tmp

    def test_editor_emitted_yaml_validates(self) -> None:
        package_dir = self._materialize()
        result = validate_package_file(package_dir / "package.yml")
        self.assertTrue(result.valid, "\n".join(issue.format() for issue in result.issues))

    def test_editor_emitted_package_loads_and_runs_one_transition(self) -> None:
        package_dir = self._materialize()
        loaded = load_package(package_dir / "package.yml")
        self.assertEqual(loaded.logic["strategy"], "pda_stack")
        # Replay just the enter-A transition; we should land at A.p1.
        synthetic_solution = {
            "format": "fmaze-solution-v0",
            "id": "synthetic",
            "maze": "editor_tiny_recursive",
            "logic": "../logic.yml",
            "expects_goal": False,
            "steps": [{"transition_id": "t_p1_to_A_p1"}],
        }
        replay = replay_solution(loaded, synthetic_solution)
        self.assertEqual(str(replay.final_state.address), "A.p1")


if __name__ == "__main__":
    unittest.main()
