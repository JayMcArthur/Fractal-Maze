"""Check source-guided register execution against the actual atomic maze ports.

This is a bounded investigation, not a termination proof. It follows Haskell's
first-match rules and checks every requested boundary move in the published
maze. It never changes endpoints or substitutes a smaller source input.
"""
import importlib.util
import argparse
import hashlib
import json
import subprocess
import sys
from collections import defaultdict, deque
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'upstream_sources/koteitan-repeated-maze'
APP = ROOT / 'my_way'


def load_tool(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


converter = load_tool('hs_converter', SOURCE / 'tools/hs2maze/hs2maze.py')
solver = load_tool('atomic_solver', SOURCE / 'tools/solver/solver.py')


def local_route(adj, start, goal):
    parents = {start: None}
    queue = deque([start])
    while queue:
        current = queue.popleft()
        if current == goal:
            path = []
            while current is not None:
                path.append(current)
                current = parents[current]
            return path[::-1]
        for other in adj.get(current, ()):
            if other not in parents:
                parents[other] = current
                queue.append(other)
    return None


def review(row, source_text, source_name, limit, start, record=None, trace=None):
    rules = defaultdict(list)
    for rule in converter.parse_file(source_text):
        rules[rule[0]].append(rule)
    adj = solver.build_adj(solver.parse_maze(row['raw']))
    x, y = start
    pc = 0
    terminal = ('W', 0)
    anchor = (x, y, pc)
    cycle_length, cycle_power = 0, 1
    moves = 0
    route = [(x, y, 'W', 0)] if record else []
    route_indices = {route[0]: 0} if record else {}
    if trace:
        trace((x, y, 'W', 0))

    @lru_cache(maxsize=None)
    def passage(block, start, goal):
        return local_route(adj[block], start, goal)

    def append(state):
        if trace:
            trace(state)
        if not record:
            return
        if state in route_indices:
            index = route_indices[state]
            for old in route[index + 1:]:
                del route_indices[old]
            del route[index + 1:]
        else:
            route_indices[state] = len(route)
            route.append(state)
    result = {'id': row['id'], 'source': source_name,
              'sourceHash': hashlib.sha256(source_text.encode()).hexdigest(),
              'mazeHash': hashlib.sha256(row['raw'].encode()).hexdigest(),
              'sourceSteps': 0, 'legalMazeMoves': 0, 'maxCoordinate': 0,
              'start': [x, y, 'W0'], 'limit': limit}
    for step in range(limit):
        state = (x, y, pc)
        if step and state == anchor:
            result['result'] = 'source-cycle'
            break
        if cycle_length == cycle_power:
            anchor = state
            cycle_power *= 2
            cycle_length = 0
        block = 'normal' if x and y else 'nx' if y else 'ny' if x else 'zero'
        if pc == 1:
            path = passage(block, terminal, ('W', 1))
            result['result'] = 'halt' if path else 'halt-without-maze-exit'
            if path:
                moves += len(path) - 1
                if record or trace:
                    for side, index in path[1:]:
                        append((x, y, side, index))
                terminal = ('W', 1)
            break
        rule = next((rule for rule in rules[pc]
                     if rule[4] is None or rule[4] == 'x' and not x or rule[4] == 'y' and not y), None)
        if rule is None:
            result['result'] = 'no-source-rule'
            break
        _, dx, dy, target, _ = rule
        if min(x + dx, y + dy) < 0:
            result['result'] = 'negative-source-register'
            break
        if dx or dy:
            side, opposite = {(-1, 0): ('W', 'E'), (1, 0): ('E', 'W'),
                              (0, -1): ('S', 'N'), (0, 1): ('N', 'S')}[(dx, dy)]
            path = passage(block, terminal, (side, target))
            if path is None:
                result.update(result='disconnected-source-outlet', requested=[side, target])
                break
            moves += len(path)
            if record or trace:
                for direction, index in path[1:]:
                    append((x, y, direction, index))
                append((x + dx, y + dy, opposite, target))
            terminal = (opposite, target)
        x, y, pc = x + dx, y + dy, target
        cycle_length += 1
        result['sourceSteps'] = step + 1
        result['maxCoordinate'] = max(result['maxCoordinate'], x, y)
    else:
        result['result'] = 'source-step-limit'
    result.update(legalMazeMoves=moves, stoppedState=[x, y, pc],
                  terminal=f'{terminal[0]}{terminal[1]}')
    if record:
        result['trimmedMoves'] = len(route) - 1
        if result['result'] == 'halt':
            record.write_text(json.dumps(route, separators=(',', ':')) + '\n')
            result['candidate'] = str(record)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--maze')
    parser.add_argument('--max-steps', type=int, default=300000)
    parser.add_argument('--initial-y', type=int)
    parser.add_argument('--record', type=Path)
    args = parser.parse_args()
    if args.record and not args.maze:
        parser.error('--record needs --maze so separate candidates cannot overwrite each other')
    rows = json.loads((APP / 'src/data/mazes/upstream-repeated.json').read_text())
    checks = []
    for row in rows:
        if args.maze and row['id'] != args.maze:
            continue
        start = (0, 0)
        if row['id'] in ['cp3-2', 'cp3-3', 'cp3-4']:
            source = SOURCE / f'maze/counter-pump-3/{row["id"]}-2d.hs'
        elif row['id'] == 'penta':
            source = SOURCE / 'maze/penta/penta.hs'
        elif row['id'] == 'cp-n3-godel':
            source = SOURCE / 'tools/nd-to-2d/examples/cp_n3.hs'
            compiled = subprocess.check_output([sys.executable, str(SOURCE / 'tools/nd-to-2d/nd-to-2d.py'), str(source)], text=True)
        else:
            continue
        text = compiled if row['id'] == 'cp-n3-godel' else source.read_text()
        if args.initial_y is not None:
            start = (0, args.initial_y)
        result = review(row, text, str(source.relative_to(ROOT)), args.max_steps, start, args.record)
        if row['id'] == 'cp-n3-godel':
            result['configuredGoal'] = [0, 0, 'W1']
        checks.append(result)
        print(json.dumps(result), flush=True)
    destination = APP / 'docs/REGISTER_SOURCE_REVIEW.json'
    previous = json.loads(destination.read_text())['checks'] if destination.exists() else []
    checked_ids = {row['id'] for row in checks}
    report = {'scope': 'Bounded first-match Haskell trace checked against actual simplified atomic maze ports. Compiler boundary conventions and nondeterministic maze alternatives are not assumed equivalent.',
              'checks': [row for row in previous if row['id'] not in checked_ids] + checks}
    destination.write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
