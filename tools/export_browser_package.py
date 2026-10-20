#!/usr/bin/env python3
"""Export Fractal Maze Lab Source Packages to Browser Package JSON."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fractal_maze_lab.browser_export import (  # noqa: E402
    ExportError,
    discover_packages,
    write_browser_package,
    write_catalogue_index,
)


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = REPO_ROOT / "packages" / "browser"
DEFAULT_PACKAGES_ROOT = REPO_ROOT / "packages" / "source"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Export validated Source Packages to packages/browser/<id>.json."
    )
    parser.add_argument(
        "package",
        nargs="*",
        help="One or more package.yml paths. Ignored when --all is set.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Export every package under packages/source/.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory to write Browser Package JSON into.",
    )
    parser.add_argument(
        "--packages-root",
        type=Path,
        default=DEFAULT_PACKAGES_ROOT,
        help="Root directory for --all discovery.",
    )
    args = parser.parse_args(argv)

    targets: list[Path]
    if args.all:
        targets = discover_packages(args.packages_root)
        if args.package:
            print("EXPORT warning: ignoring positional packages because --all is set", file=sys.stderr)
    else:
        if not args.package:
            parser.error("provide at least one package.yml or pass --all")
        targets = [Path(raw) for raw in args.package]

    exit_code = 0
    for manifest_path in targets:
        try:
            output_path = write_browser_package(
                manifest_path,
                output_dir=args.output_dir,
                repo_root=REPO_ROOT,
            )
        except ExportError as exc:
            exit_code = 1
            print(f"FAIL {manifest_path}", file=sys.stderr)
            for line in str(exc).splitlines():
                print(f"  {line}", file=sys.stderr)
            continue
        print(f"EXPORT {manifest_path} -> {output_path.relative_to(REPO_ROOT)}")

    if args.all and exit_code == 0:
        index_path = write_catalogue_index(args.packages_root, args.output_dir, REPO_ROOT)
        print(f"INDEX {index_path.relative_to(REPO_ROOT)}")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
