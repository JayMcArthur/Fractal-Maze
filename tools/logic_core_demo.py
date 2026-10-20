#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fractal_maze_lab.pda_examples import all_examples  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Fractal Maze Lab logic-core examples.")
    parser.add_argument("--example", help="Example id to run. Defaults to all examples.")
    parser.add_argument("--trace", action="store_true", help="Print every state transition.")
    args = parser.parse_args()

    examples = all_examples()
    if args.example:
        examples = [example for example in examples if example.id == args.example]
        if not examples:
            print(f"Unknown example: {args.example}", file=sys.stderr)
            return 2

    for example in examples:
        final_state, history = example.graph.run(example.solution)
        accepted = example.graph.is_goal(final_state)
        expected = example.expected_accepts
        status = "PASS" if accepted == expected else "FAIL"
        print(f"{status} {example.id}: accepted={accepted} expected={expected} final={final_state.address} steps={len(history)}")
        if args.trace:
            for index, step in enumerate(history, start=1):
                print(
                    f"  {index:03d} {step.input!r}: "
                    f"{step.source} {list(step.stack_before)} -> "
                    f"{step.target} {list(step.stack_after)}"
                )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
