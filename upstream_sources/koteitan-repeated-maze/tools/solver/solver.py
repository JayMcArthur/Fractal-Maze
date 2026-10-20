#!/usr/bin/env python3
"""solver.py -- Python BFS solver for the (*1) edge-terminal format.

The (*1) maze format (emitted by tools/hs2maze/hs2maze.py without
--directional) uses W / E / N / S terminals only — C terminals are
dropped by the daisy-chain pass.  Two bridge ports `W0-C0` and `W1-C1`
are added in normal/nx/ny so W0 / W1 land in C0 / C1's components.

Maze convention:
  start = (0, 0, W, 0)        goal = (0, 0, W, 1)
  block (0, 0) is the corner — walker may use both nx AND ny port sets
  there so a rule pair (zb='x' for x=0 + zb='y' for y=0) can fire even
  when both literal-0 patterns match at once.

Usage:
    python3 solver.py [FILE]              read maze string from FILE / stdin
    python3 solver.py --max-states N      cap BFS state count (default 2_000_000)
    python3 solver.py -h | --help         show this help
    python3 solver.py -V | --version
"""
import re
import sys
from collections import deque


VERSION = "0.2"


def parse_maze(text):
    """Parse the edge-terminal maze string.
    Returns dict {bt: list of (sd, si, dd, di, directed)}."""
    text = re.sub(r'^maze:\s*', '', text.strip(), flags=re.I)
    sets = {'normal': [], 'nx': [], 'ny': [], 'zero': []}
    for sec in text.split(';'):
        sec = sec.strip()
        if not sec:
            continue
        name, _, body = sec.partition(':')
        name = name.strip().lower()
        body = body.strip()
        if body == '(none)' or not body or name not in sets:
            continue
        for entry in body.split(','):
            entry = entry.strip()
            if not entry:
                continue
            directed = '->' in entry
            sep = '->' if directed else '-'
            a, _, b = entry.partition(sep)
            ma = re.match(r'^([CWESN])(\d+)$', a.strip())
            mb = re.match(r'^([CWESN])(\d+)$', b.strip())
            if ma and mb:
                sets[name].append(
                    (ma.group(1), int(ma.group(2)),
                     mb.group(1), int(mb.group(2)),
                     directed)
                )
    return sets


def block_types_at(x, y):
    """Return port-set names to consult at (x, y).  Catch-all rules
    are duplicated into every set, so we read only the set matching
    the block.  The corner (0, 0) is its own `zero` set (catch-all +
    both zb='x' and zb='y' rules)."""
    if x == 0 and y == 0:
        return ('zero',)
    if x == 0:
        return ('nx',)
    if y == 0:
        return ('ny',)
    return ('normal',)


# C terminals are intra-block (block centre), so they have no cross-block
# rule entry — only the four edge directions cross.
_CROSS = {'W': (-1, 0, 'E'), 'E': (1, 0, 'W'),
          'N': (0, 1, 'S'), 'S': (0, -1, 'N')}


def build_adj(maze):
    """Return adj[bt][(dir, idx)] = list of (dir, idx).
    Undirected ports add both directions."""
    adj = {bt: {} for bt in maze}
    for bt, ports in maze.items():
        for sd, si, dd, di, directed in ports:
            adj[bt].setdefault((sd, si), []).append((dd, di))
            if not directed:
                adj[bt].setdefault((dd, di), []).append((sd, si))
    return adj


def bfs(maze, start, goal_idx, max_states):
    """BFS from start to any (X, Y, W, goal_idx).
    Returns (path, n_states) or (None, n_states) on failure."""
    adj = build_adj(maze)
    parent = {start: None}
    q = deque([start])
    while q:
        if len(parent) > max_states:
            return None, len(parent)
        cur = q.popleft()
        x, y, d, i = cur
        if d == 'W' and i == goal_idx and x == 0 and y == 0:
            path = []
            s = cur
            while s is not None:
                path.append(s)
                s = parent[s]
            path.reverse()
            return path, len(parent)
        seen_local = set()
        for bt in block_types_at(x, y):
            for nd, ni in adj[bt].get((d, i), ()):
                if (nd, ni) in seen_local:
                    continue
                seen_local.add((nd, ni))
                ns = (x, y, nd, ni)
                if ns not in parent:
                    parent[ns] = cur
                    q.append(ns)
        if d in _CROSS:
            dx, dy, opp = _CROSS[d]
            nx, ny = x + dx, y + dy
            if nx >= 0 and ny >= 0:
                ns = (nx, ny, opp, i)
                if ns not in parent:
                    parent[ns] = cur
                    q.append(ns)
    return None, len(parent)


HELP = """solver.py v{v} -- BFS solver for the (*1) edge-terminal format.

Usage:
  python3 solver.py [FILE]              read maze from FILE (or stdin)
  python3 solver.py --max-states N      BFS state cap (default 2_000_000)
  python3 solver.py -h | --help         show this help
  python3 solver.py -V | --version

Start: (0, 0, W, 0).  Goal: (0, 0, W, 1).  Block (0, 0) is the corner
and consults both nx and ny port sets so paired zb='x' + zb='y' rules
can fire at the same cell.
""".format(v=VERSION)


def main():
    args = sys.argv[1:]
    file_arg = None
    max_states = 2_000_000
    while args:
        a = args.pop(0)
        if a in ('-h', '--help'):
            print(HELP)
            return
        if a in ('-V', '--version'):
            print(f"solver.py v{VERSION}")
            return
        if a == '--max-states':
            max_states = int(args.pop(0))
        else:
            file_arg = a

    text = open(file_arg).read() if file_arg else sys.stdin.read()
    maze = parse_maze(text)
    for bt in ('normal', 'nx', 'ny', 'zero'):
        print(f"{bt}: {len(maze[bt])} ports", file=sys.stderr)
    path, n = bfs(maze, (0, 0, 'W', 0), 1, max_states)
    if path is None:
        print(f"NO PATH (explored {n} states)")
        sys.exit(1)
    print(f"Path length: {len(path) - 1}  ({n} states explored)")
    print("Path:")
    print(" -> ".join(f"({s[0]},{s[1]},{s[2]}{s[3]})" for s in path))


if __name__ == '__main__':
    main()
