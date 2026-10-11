#!/usr/bin/env python3
"""hs2maze.py -- Convert Haskell-style state machine to repeated-maze string.

Input format (stdin or file):
    myfunc :: (Int, Int, Int) -> (Int, Int, Int)
    myfunc (x, y, 0) = myfunc (x+1, y,   1)
    myfunc (x, y, 1) = myfunc (x, y+3,   2)
    myfunc (x, y, 2) = myfunc (x-1,  y,   0)

Each line: (x_expr, y_expr, pc_literal) = func (x_expr, y_expr, pc_literal)
  - x_expr: x, x+k, x-k, or _ (unchanged)
  - y_expr: y, y+k, y-k, or _ (unchanged)
  - pc_literal: integer
  - Only ONE of dx, dy may be nonzero per line.

Mapping to maze:
  All user pc values map to E/W terminal indices.
  Canonical state: (x, y, E, pc) -- always E-type.

  Movement costs in maze steps:
    x+k:  k   steps  (chain of W->E ports)
    x-k:  k   steps  (chain of E->W ports)
    y+k:  k+1 steps  (W->N, (k-1) S->N, S->W)
    y-k:  k+1 steps  (E->S, (k-1) N->S, N->E)
    noop: 2   steps  (W->E, E->W)

  Start: W0@(1,1) = E0@(0,1) -> user pc=0
  Goal:  W1@(1,1) = E1@(0,1) -> user pc=1

Usage: python3 hs2maze.py [input.hs]
  Reads from stdin if no file given.
  Outputs maze string to stdout, diagnostics to stderr.
"""

import re
import sys


def parse_expr(s):
    """Parse 'x+3', 'y-1', 'x', '_', '0' etc."""
    s = s.strip()
    if s == '_':
        return ('_', 0)
    m = re.match(r'^([xy])([+-]\d+)?$', s)
    if m:
        var = m.group(1)
        off = int(m.group(2)) if m.group(2) else 0
        return (var, off)
    return (None, int(s))


def parse_file(text):
    """Parse Haskell-style function definitions.
    Returns list of (pc_src, dx, dy, pc_dst).
    """
    transitions = []
    for line in text.splitlines():
        line = line.split('--')[0].strip()
        if not line or '::' in line:
            continue
        if '=' not in line:
            continue
        lhs, rhs = line.split('=', 1)
        lhs_m = re.search(r'\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)', lhs)
        rhs_m = re.search(r'\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)', rhs)
        if not lhs_m or not rhs_m:
            continue
        lx = parse_expr(lhs_m.group(1))
        ly = parse_expr(lhs_m.group(2))
        lpc = parse_expr(lhs_m.group(3))
        rx = parse_expr(rhs_m.group(1))
        ry = parse_expr(rhs_m.group(2))
        rpc = parse_expr(rhs_m.group(3))
        pc_src = lpc[1]
        pc_dst = rpc[1]
        dx = rx[1] if rx[0] in ('x', '_') else 0
        dy = ry[1] if ry[0] in ('y', '_') else 0
        transitions.append((pc_src, dx, dy, pc_dst))
    return transitions


class PortGenerator:
    """Generate maze ports from state machine transitions."""

    def __init__(self, transitions):
        self.transitions = transitions
        max_pc = max(max(t[0], t[3]) for t in transitions)
        self.next_ew = max_pc + 1   # E/W terminal allocator
        self.next_ns = 0            # N/S terminal allocator
        self.ports = []

    def alloc_ew(self):
        idx = self.next_ew
        self.next_ew += 1
        return idx

    def alloc_ns(self):
        idx = self.next_ns
        self.next_ns += 1
        return idx

    def add(self, sd, si, dd, di):
        self.ports.append((sd, si, dd, di))

    def generate(self):
        for pc_src, dx, dy, pc_dst in self.transitions:
            if dx != 0 and dy != 0:
                raise ValueError(
                    f"pc={pc_src}: both dx={dx} and dy={dy} nonzero. "
                    "Split into separate x and y steps.")
            if dx > 0:
                self._x_plus(pc_src, dx, pc_dst)
            elif dx < 0:
                self._x_minus(pc_src, -dx, pc_dst)
            elif dy > 0:
                self._y_plus(pc_src, dy, pc_dst)
            elif dy < 0:
                self._y_minus(pc_src, -dy, pc_dst)
            else:
                self._noop(pc_src, pc_dst)
        return self.ports

    def _x_plus(self, src, k, dst):
        """x+k: k ports W->E chain."""
        cur = src
        for i in range(k):
            nxt = dst if i == k - 1 else self.alloc_ew()
            self.add('W', cur, 'E', nxt)
            cur = nxt

    def _x_minus(self, src, k, dst):
        """x-k: k ports E->W chain."""
        cur = src
        for i in range(k):
            nxt = dst if i == k - 1 else self.alloc_ew()
            self.add('E', cur, 'W', nxt)
            cur = nxt

    def _y_plus(self, src, k, dst):
        """y+k: k+1 ports. W->N, (k-1) S->N, S->W."""
        t = self.alloc_ns()
        self.add('W', src, 'N', t)
        for _ in range(k - 1):
            t_new = self.alloc_ns()
            self.add('S', t, 'N', t_new)
            t = t_new
        self.add('S', t, 'W', dst)

    def _y_minus(self, src, k, dst):
        """y-k: k+1 ports. W->S, (k-1) N->S, N->W."""
        t = self.alloc_ns()
        self.add('W', src, 'S', t)
        for _ in range(k - 1):
            t_new = self.alloc_ns()
            self.add('N', t, 'S', t_new)
            t = t_new
        self.add('N', t, 'W', dst)

    def _noop(self, src, dst):
        """dx=0,dy=0: 2 ports. W->E, E->W."""
        tmp = self.alloc_ew()
        self.add('W', src, 'E', tmp)
        self.add('E', tmp, 'W', dst)


def ports_to_maze_string(ports, nterm):
    """Convert port list to maze string format."""
    normal = []
    nx_list = []
    ny_list = []
    seen = set()
    for sd, si, dd, di in ports:
        key = (sd, si, dd, di)
        if key in seen:
            continue
        seen.add(key)
        normal.append(f"{sd}{si}->{dd}{di}")
    normal_str = ', '.join(normal) if normal else '(none)'
    nx_str = ', '.join(nx_list) if nx_list else '(none)'
    ny_str = ', '.join(ny_list) if ny_list else '(none)'
    return f"normal: {normal_str}; nx: {nx_str}; ny: {ny_str}"


def main():
    if len(sys.argv) > 1:
        with open(sys.argv[1]) as f:
            text = f.read()
    else:
        text = sys.stdin.read()

    transitions = parse_file(text)
    if not transitions:
        print("Error: no transitions found", file=sys.stderr)
        sys.exit(1)

    print(f"Parsed {len(transitions)} transitions:", file=sys.stderr)
    for pc_src, dx, dy, pc_dst in transitions:
        s = f"  pc={pc_src} -> pc={pc_dst}"
        if dx: s += f"  dx={dx:+d}"
        if dy: s += f"  dy={dy:+d}"
        if not dx and not dy: s += "  (noop)"
        print(s, file=sys.stderr)

    gen = PortGenerator(transitions)
    ports = gen.generate()
    nterm = max(gen.next_ew, gen.next_ns)

    print(f"Generated {len(ports)} ports, nterm={nterm}", file=sys.stderr)
    for sd, si, dd, di in ports:
        print(f"  {sd}{si}->{dd}{di}", file=sys.stderr)

    maze_str = ports_to_maze_string(ports, nterm)
    print(maze_str)


if __name__ == '__main__':
    main()
