"""Round-trip test for the browser workbench's solution recording format.

The TS recorder in `web/src/runtime/solution.ts` emits `fmaze-solution-v0` YAML
that mirrors the existing hand-written Solution Records. This test simulates
that output and confirms a recorded solution validates and replays through the
Python foundation just like a hand-written one.
"""
import sys
import tempfile
import unittest
from pathlib import Path

import yaml


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "src"))

from fractal_maze_lab.package_loader import load_package, load_referenced_solution, replay_solution  # noqa: E402
from fractal_maze_lab.package_validation import validate_package_file  # noqa: E402


PACKAGES_ROOT = REPO_ROOT / "packages" / "source"


def synthesize_recording(maze_id: str, steps: list[dict], expects_goal: bool = True) -> dict:
    """Produce a dict the same shape the TS recorder emits."""
    return {
        "format": "fmaze-solution-v0",
        "id": f"recorded_{maze_id}",
        "maze": maze_id,
        "logic": "../logic.yml",
        "expects_goal": expects_goal,
        "steps": steps,
        "provenance": {
            "recorded_by": "fractal-maze-lab-workbench",
            "recorded_at": "2026-05-22T00:00:00Z",
        },
    }


class RecordedSolutionRoundTripTests(unittest.TestCase):
    def test_skeptic_play_1_recorded_replay_reaches_goal(self) -> None:
        manifest = PACKAGES_ROOT / "skeptic_play_1" / "package.yml"
        loaded = load_package(manifest)
        known = load_referenced_solution(loaded, "known")

        recording = synthesize_recording("skeptic_play_1", list(known["steps"]))

        replay = replay_solution(loaded, recording)
        self.assertEqual(str(replay.final_state.address), "p2")
        self.assertGreater(len(replay.history), 0)

    def test_recording_validates_as_package_solution(self) -> None:
        manifest = PACKAGES_ROOT / "skeptic_play_1" / "package.yml"
        loaded = load_package(manifest)
        known = load_referenced_solution(loaded, "known")

        recording = synthesize_recording("skeptic_play_1", list(known["steps"]))

        with tempfile.TemporaryDirectory() as raw_dir:
            tmp = Path(raw_dir)
            (tmp / "logic.yml").write_text((manifest.parent / "logic.yml").read_text(), encoding="utf-8")
            solutions = tmp / "solutions"
            solutions.mkdir()
            (solutions / "recorded.yml").write_text(yaml.safe_dump(recording, sort_keys=False), encoding="utf-8")
            manifest_doc = {
                "format": "fmaze-package-v0",
                "id": "skeptic_play_1",
                "title": "Skeptic Play #1",
                "primary_authoring": "port_graph",
                "logic": {"href": "logic.yml", "format": "fmaze-logic-v0"},
                "solutions": [
                    {"id": "recorded", "href": "solutions/recorded.yml", "format": "fmaze-solution-v0"},
                ],
            }
            (tmp / "package.yml").write_text(yaml.safe_dump(manifest_doc, sort_keys=False), encoding="utf-8")

            result = validate_package_file(tmp / "package.yml")
            self.assertTrue(result.valid, "\n".join(issue.format() for issue in result.issues))

    def test_proof_assisted_recording_round_trips(self) -> None:
        manifest = PACKAGES_ROOT / "infinite_hop_1" / "package.yml"
        loaded = load_package(manifest)
        proof_assisted = load_referenced_solution(loaded, "proof_assisted")

        recording = synthesize_recording("infinite_hop_1", list(proof_assisted["steps"]))

        replay = replay_solution(loaded, recording, include_proof_edges=True)
        self.assertEqual(str(replay.final_state.address), "p2")
        proof_steps = [step for step in replay.history if step.step_type == "proof"]
        self.assertGreater(len(proof_steps), 0)


if __name__ == "__main__":
    unittest.main()
