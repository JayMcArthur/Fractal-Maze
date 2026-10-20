#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fractal_maze_lab.package_validation import validate_package_file  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Fractal Maze Lab source packages.")
    parser.add_argument("package", nargs="+", help="Path to package.yml")
    args = parser.parse_args()

    exit_code = 0
    for raw_path in args.package:
        result = validate_package_file(raw_path)
        if result.valid:
            print(f"PASS {raw_path}")
            continue
        exit_code = 1
        print(f"FAIL {raw_path}")
        for issue in result.issues:
            print(f"  {issue.format()}")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
