#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fractal_maze_lab.fractal_block import (  # noqa: E402
    KOTEITAN_DEFAULT_PATTERN,
    FractalBlockMaze,
    FractalBlockPattern,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the Koteitan fractal block maze example.")
    parser.add_argument("--depth", type=int, default=5, help="Maximum nested search depth.")
    parser.add_argument("--trace", action="store_true", help="Print the found path.")
    args = parser.parse_args()

    maze = FractalBlockMaze(FractalBlockPattern.from_rows(KOTEITAN_DEFAULT_PATTERN))
    result = maze.solve(args.depth)
    max_depth = max((len(position) for position in result.path), default=0)
    print(
        f"solved={result.solved} depth_limit={result.depth_limit} "
        f"explored={result.explored} path_length={len(result.path)} max_depth={max_depth}"
    )
    if args.trace:
        for index, position in enumerate(result.path, start=1):
            print(f"{index:03d}: {position}")
    return 0 if result.solved else 1


if __name__ == "__main__":
    raise SystemExit(main())
