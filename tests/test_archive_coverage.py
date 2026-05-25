"""Confirm every maze listed in README.md has a hand-authored Source Package
that validates and exports to a Browser Package."""
import re
import sys
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "src"))

from fractal_maze_lab.browser_export import export_browser_package  # noqa: E402
from fractal_maze_lab.package_validation import validate_package_file  # noqa: E402


README = REPO_ROOT / "README.md"
PACKAGES_SOURCE = REPO_ROOT / "packages" / "source"
PACKAGE_LINK = re.compile(r"\[Package\]\(\./packages/source/([^/]+)/package\.yml\)")


def package_ids_in_readme() -> list[str]:
    text = README.read_text(encoding="utf-8")
    return sorted({match.group(1) for match in PACKAGE_LINK.finditer(text)})


class ArchiveCoverageTests(unittest.TestCase):
    def test_every_readme_package_link_exists_on_disk(self) -> None:
        ids = package_ids_in_readme()
        self.assertGreaterEqual(len(ids), 18, "README should reference at least 18 packages")
        missing = [pid for pid in ids if not (PACKAGES_SOURCE / pid / "package.yml").is_file()]
        self.assertEqual(missing, [], f"README links to packages that do not exist: {missing}")

    def test_every_readme_package_validates(self) -> None:
        failures: list[str] = []
        for pid in package_ids_in_readme():
            manifest = PACKAGES_SOURCE / pid / "package.yml"
            result = validate_package_file(manifest)
            if not result.valid:
                failures.append(f"{pid}: " + "; ".join(issue.format() for issue in result.issues))
        self.assertEqual(failures, [], "\n".join(failures))

    def test_every_readme_package_exports_to_browser(self) -> None:
        failures: list[str] = []
        for pid in package_ids_in_readme():
            manifest = PACKAGES_SOURCE / pid / "package.yml"
            try:
                export = export_browser_package(manifest, repo_root=REPO_ROOT)
            except Exception as exc:
                failures.append(f"{pid}: {exc}")
                continue
            if not export.ok:
                failures.append(f"{pid}: " + "; ".join(export.schema_errors))
        self.assertEqual(failures, [], "\n".join(failures))


if __name__ == "__main__":
    unittest.main()
