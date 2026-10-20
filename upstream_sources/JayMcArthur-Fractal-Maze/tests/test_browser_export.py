import json
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "src"))

from fractal_maze_lab.browser_export import (  # noqa: E402
    BROWSER_FORMAT,
    BrowserPackageExport,
    ExportError,
    discover_packages,
    export_browser_package,
    write_browser_package,
)
from fractal_maze_lab.graph_layout import LAYOUT_ALGORITHM  # noqa: E402
from fractal_maze_lab.package_loader import (  # noqa: E402
    load_package,
    load_referenced_solution,
)


PACKAGES_ROOT = REPO_ROOT / "packages" / "source"


def manifest_for(package_id: str) -> Path:
    return PACKAGES_ROOT / package_id / "package.yml"


class ExportSmokeTests(unittest.TestCase):
    def test_every_curated_package_exports_and_validates(self) -> None:
        manifests = discover_packages(PACKAGES_ROOT)
        self.assertGreater(len(manifests), 10, "expected many curated packages")

        failures: list[str] = []
        for manifest_path in manifests:
            try:
                export = export_browser_package(manifest_path, repo_root=REPO_ROOT)
            except ExportError as exc:
                failures.append(f"{manifest_path}: {exc}")
                continue
            if not export.ok:
                failures.append(f"{manifest_path}: " + "; ".join(export.schema_errors))
            self.assertEqual(export.document["format"], BROWSER_FORMAT, manifest_path)

        self.assertEqual(failures, [], "browser export failures:\n  " + "\n  ".join(failures))


class SkepticPlayExportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.export = export_browser_package(manifest_for("skeptic_play_1"), repo_root=REPO_ROOT)

    def test_envelope_fields(self) -> None:
        document = self.export.document
        manifest = load_package(manifest_for("skeptic_play_1")).manifest
        self.assertEqual(document["format"], BROWSER_FORMAT)
        self.assertEqual(document["id"], "skeptic_play_1")
        self.assertEqual(document["title"], manifest["title"])
        self.assertEqual(document["primary_authoring"], "port_graph")
        self.assertEqual(document["source_root"], "packages/source/skeptic_play_1")

    def test_logic_passed_through_verbatim(self) -> None:
        logic = self.export.document["logic"]
        self.assertEqual(logic["id"], "skeptic_play_1")
        self.assertEqual(logic["strategy"], "pda_stack")
        self.assertEqual(logic["source_model"], "port_graph")
        self.assertEqual(logic["start"], "p1")
        self.assertEqual(logic["goals"], ["p2"])
        point_ids = {entry["id"] for entry in logic["points"]}
        self.assertEqual(point_ids, {"p1", "p2", "p3", "p4", "p5", "p6"})

    def test_known_solution_inlined(self) -> None:
        solutions = self.export.document.get("solutions", [])
        self.assertEqual(len(solutions), 1)
        solution = solutions[0]
        self.assertEqual(solution["id"], "known")
        self.assertEqual(solution["format"], "fmaze-solution-v0")
        self.assertTrue(solution["expects_goal"])
        original = load_referenced_solution(load_package(manifest_for("skeptic_play_1")), "known")
        self.assertEqual(solution["steps"], original["steps"])

    def test_visual_inlined_with_repo_relative_assets(self) -> None:
        document = self.export.document
        self.assertIn("visual", document)
        self.assertEqual(document["visual"]["default_view"], "clean_vector")
        assets = document["visual_assets"]
        hrefs = {asset["href"] for asset in assets}
        self.assertIn("Maze_Images/Siggy/Skeptic_Play_1.svg", hrefs)
        self.assertIn("Maze_Images/Siggy/Skeptic_Play_1.jpg", hrefs)
        for asset in assets:
            self.assertFalse(asset["href"].startswith(".."), asset["href"])
            self.assertFalse(asset["href"].startswith("/"), asset["href"])

    def test_auto_graph_layout_covers_every_point_and_port(self) -> None:
        layout = self.export.document.get("auto_graph_layout")
        self.assertIsNotNone(layout)
        self.assertEqual(layout["algorithm"], LAYOUT_ALGORITHM)
        logic = self.export.document["logic"]
        point_ids = {entry["id"] for entry in logic["points"]}
        port_ids = {entry["id"] for entry in logic["ports"]}
        self.assertEqual(set(layout["points"].keys()), point_ids)
        self.assertEqual(set(layout["ports"].keys()), port_ids)
        for laid in layout["points"].values():
            self.assertIn("x", laid)
            self.assertIn("y", laid)
            self.assertIn("level", laid)
            self.assertIn("column", laid)
        self.assertEqual(layout["points"]["p1"]["level"], 0)

    def test_layout_is_deterministic(self) -> None:
        again = export_browser_package(manifest_for("skeptic_play_1"), repo_root=REPO_ROOT)
        self.assertEqual(self.export.document["auto_graph_layout"], again.document["auto_graph_layout"])


class Wolfram2ExportTests(unittest.TestCase):
    def test_ambiguous_visible_labels_preserved_as_distinct_ports(self) -> None:
        export = export_browser_package(manifest_for("wolfram_2"), repo_root=REPO_ROOT)
        logic = export.document["logic"]
        by_visible: dict[tuple[str, str], list[dict]] = {}
        for port in logic.get("ports", []):
            label = port.get("label")
            if label is None:
                continue
            by_visible.setdefault((port["point"], label), []).append(port)
        ambiguous = {key: ports for key, ports in by_visible.items() if len(ports) > 1}
        self.assertGreaterEqual(
            len(ambiguous),
            1,
            "Wolfram #2 export should preserve at least one (point, label) "
            "with two distinct ports for the port-ambiguity story.",
        )
        # The canonical Wolfram #2 ambiguity is (p3, '7'): one port enters mB,
        # the other exits mA. Both must survive the export so the workbench can
        # render them as separate activation points.
        self.assertIn(("p3", "7"), ambiguous)
        ports = ambiguous[("p3", "7")]
        contexts = {tuple(port.get("context") or []) for port in ports}
        self.assertEqual(contexts, {(), ("mA",)})


class CoordinatePathExportTests(unittest.TestCase):
    def test_fractal_block_has_no_auto_graph_layout(self) -> None:
        export = export_browser_package(
            manifest_for("koteitan_fractal_block_default"), repo_root=REPO_ROOT
        )
        self.assertNotIn("auto_graph_layout", export.document)
        self.assertEqual(export.document["logic"]["strategy"], "coordinate_path")
        self.assertIn("pattern", export.document["logic"])


class TiledPortExportTests(unittest.TestCase):
    def test_tiled_repeated_has_no_auto_graph_layout(self) -> None:
        export = export_browser_package(manifest_for("tiny_repeated_tiled"), repo_root=REPO_ROOT)
        self.assertNotIn("auto_graph_layout", export.document)
        self.assertEqual(export.document["logic"]["strategy"], "tiled_port_graph")
        self.assertIn("block_classes", export.document["logic"])


class ReferenceRecordExportTests(unittest.TestCase):
    def test_reference_only_carries_modeling_status(self) -> None:
        export = export_browser_package(manifest_for("berkly"), repo_root=REPO_ROOT)
        document = export.document
        self.assertEqual(document["logic"]["strategy"], "reference_record")
        modeling_status = document.get("modeling_status")
        self.assertIsNotNone(modeling_status)
        self.assertEqual(modeling_status["status"], "reference_only")
        self.assertNotIn("auto_graph_layout", document)


class CliWriteTests(unittest.TestCase):
    def test_write_produces_named_json_file(self) -> None:
        with tempfile.TemporaryDirectory() as raw_dir:
            output_dir = Path(raw_dir)
            target = write_browser_package(
                manifest_for("skeptic_play_1"),
                output_dir=output_dir,
                repo_root=REPO_ROOT,
            )
            self.assertEqual(target.name, "skeptic_play_1.json")
            with target.open("r", encoding="utf-8") as handle:
                document = json.load(handle)
            self.assertEqual(document["format"], BROWSER_FORMAT)
            self.assertEqual(document["id"], "skeptic_play_1")


class RoundTripTests(unittest.TestCase):
    """Confirm Browser Package solutions still reach goal when replayed through Python."""

    def test_known_solution_steps_match_yaml_source(self) -> None:
        loaded = load_package(manifest_for("skeptic_play_1"))
        original = load_referenced_solution(loaded, "known")
        export = export_browser_package(manifest_for("skeptic_play_1"), repo_root=REPO_ROOT)
        inlined = next(item for item in export.document["solutions"] if item["id"] == "known")
        self.assertEqual(inlined["steps"], original["steps"])
        self.assertTrue(inlined.get("expects_goal"))

    def test_export_all_packages_with_solutions_inlines_them(self) -> None:
        manifests = discover_packages(PACKAGES_ROOT)
        for manifest_path in manifests:
            loaded = load_package(manifest_path)
            referenced = loaded.manifest.get("solutions") or []
            export = export_browser_package(manifest_path, repo_root=REPO_ROOT)
            inlined = export.document.get("solutions", [])
            self.assertEqual(
                len(inlined),
                len(referenced),
                f"{manifest_path}: expected {len(referenced)} inlined solutions, got {len(inlined)}",
            )
            for ref in referenced:
                self.assertTrue(
                    any(item["id"] == ref["id"] for item in inlined),
                    f"{manifest_path}: missing solution {ref.get('id')!r}",
                )


def _flatten_transitions(logic: dict) -> list[dict]:
    transitions = list(logic.get("transitions") or [])
    for group in logic.get("transition_groups") or []:
        for key in ("forward", "reverse"):
            transition = group.get(key)
            if transition is not None:
                transitions.append(transition)
    return transitions


if __name__ == "__main__":
    unittest.main()
