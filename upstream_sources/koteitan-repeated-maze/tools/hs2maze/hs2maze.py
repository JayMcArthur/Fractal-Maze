#!/usr/bin/env python3
"""hs2maze.py -- Haskell -> repeated-maze via atomic-port (*1) decomposition.

Pipeline:
  1. Parse Haskell rules into atomic ports `Ca -> Cb (dx, dy)`.
  2. Decompose each atomic port via the (*1) mapping into a source-side
     port (in the source block) plus a destination-side port (in the
     destination block).  The dest's incoming edge is the direction
     opposite to the displacement, since the shared edge between blocks
     (X, Y) and (X-1, Y) is the source's W and the destination's E.

         Ca-Cb( 0,  0) -> Ca-Cb              (intra-block, no split)
         Ca-Cb(-1,  0) -> Ca-Wb  +  Eb-Cb
         Ca-Cb( 1,  0) -> Ca-Eb  +  Wb-Cb
         Ca-Cb( 0, -1) -> Ca-Sb  +  Nb-Cb
         Ca-Cb( 0,  1) -> Ca-Nb  +  Sb-Cb

  3. Default (non-directional): apply the daisy-chain pass per block-
     type port set.  For each connected component of the port graph,
     gather the W/E/N/S edge terminals, sort them counter-clockwise as
         S0..Sn, En..E0, Nn..N0, W0..Wn
     and emit ports between consecutive entries.  C terminals are
     dropped from the output.  Equivalent to the spec's per-Ca BFS
     because every Ca in one component yields the same Ra.

  4. With --directional: skip the daisy-chain.  Emit `->` arrows that
     keep C terminals (suitable for visualizers that draw Ck on a
     circle inside each block).

Block-type assignment:
  catch-all rule (no zero-branch): src + dst ports go to normal, nx, ny.
  zb='x' rule  (literal 0 in x slot): ports go to nx only.
  zb='y' rule  (literal 0 in y slot): ports go to ny only.
The (0, 0) corner is treated as ny (per the atomic convention) so a
ny drain HALT at (1, 1, *) lands inside ny's port set after the +1
register-to-block shift.

Maze coordinates: Haskell (x_reg, y_reg) -> block (x_reg + 1, y_reg + 1).
Start: Haskell (0, 1, 0)        -> block (1, 2, W0)   -- by convention
Goal:  Haskell (?, ?, 1) HALT   -> block (?, ?, W1).

Usage:
    python3 hs2maze.py FILE.hs                  (default: non-directional)
    python3 hs2maze.py FILE.hs --directional    (keep C terminals + arrows)
    python3 hs2maze.py FILE.hs -v               (also pretty-print to stderr)
"""

import re
import sys


VERSION = "2.4"

HELP_TEXT = """hs2maze v{version} -- Haskell state machine -> repeated-maze.

Usage:
  python3 hs2maze.py [FILE]                  default: undirected `-`, simplify
                                             + daisy-chain (drops C terminals)
  python3 hs2maze.py [FILE] --daisy          alias for the default
  python3 hs2maze.py [FILE] --no-simplify    undirected `-`, raw (*1) decomp:
                                             skip simplify and daisy chain
                                             (keeps every C terminal)
  python3 hs2maze.py [FILE] --directed       directed `->` raw (*1) decomp;
                                             implies --no-simplify (no
                                             simplifier, no daisy chain)
  python3 hs2maze.py [FILE] -v               pretty-print rules to stderr
  python3 hs2maze.py --help | -h             show this help
  python3 hs2maze.py --version | -V          show version and exit

Output (stdout): a single maze line `normal: <ports>; nx: <ports>; ny: <ports>; zero: <ports>`.

Default mode applies the daisy-chain pass after (*1) decomposition:
drops C terminals (idx >= 2 — bridge endpoints C0 / C1 still appear
through the W0-C0 / C1-W1 entries), chains W/E/N/S terms in CCW order,
and emits undirected `-` ports.  BFS path length flattens to O(k)
since direction is dropped, but the maze becomes parsable by tools
that cannot handle C subterminals.

--no-simplify keeps every C terminal in undirected form (no daisy
chain, no low-degree simplifier).  Useful for visual debugging of the
raw (*1) decomposition.

--directed emits the raw directed `->` decomposition.  --no-simplify
is forced on (the simplifier and daisy chain would lose the directional
information).  Path length matches the Haskell step count up to a
constant factor (O(k^2) for cp2-k, O(2^k) for md-k).  The two bridges
`W0->C0` (entry) and `C1->W1` (exit) anchor the maze start (0,0,W0) /
goal (0,0,W1) to the Haskell-level (0,0,C0) / (0,0,C1).

In default and --daisy modes, redundant C terminals (idx >= 2; C0 /
C1 are protected as bridge endpoints) are reduced per block-type
independently before the daisy chain:
  in=1, out=1  bridge X->C->Y into X->Y
  in=1, out=0  drop the lone in port
  in=0, out=1  drop the lone out port
  in=2, out=0  drop both in ports
  in=0, out=2  drop both out ports
Iterated to fixed point, then surviving C indices >= 2 are renumbered
contiguously.  After that, single-port wall subterminals that point
outside the maze are dropped (one pass):
  ny / zero block: drop S subterminals seen in only one port
  nx / zero block: drop W subterminals seen in only one port
                   (W0 / W1 are preserved as start / goal endpoints)
""".format(version=VERSION)


def parse_expr(s):
    """Parse 'x+3', 'y-1', 'x', '_', '0' etc. -> (var_or_None, offset)."""
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
    """Parse Haskell rules into list of (pc_src, dx, dy, pc_dst, zb).
    zb is None / 'x' / 'y'."""
    rules = []
    for line_no, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.split('--')[0].strip()
        if not line or '::' in line or '=' not in line:
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
        # Reject `r := k` (literal RHS that captures any value).
        for slot, lp, rp in (("x", lx, rx), ("y", ly, ry)):
            rhs_is_lit = rp[0] is None
            zero_passthrough = (
                rhs_is_lit and lp[0] is None and lp[1] == 0 and rp[1] == 0
            )
            if rhs_is_lit and not zero_passthrough:
                raise ValueError(
                    f"line {line_no}: immediate assignment "
                    f"{slot}:={rp[1]} is not supported by hs2maze "
                    f"(rewrite via INC/DEC chains, or compile through "
                    f"nd-to-2d.py first)"
                )
        pc_src = lpc[1]
        pc_dst = rpc[1]
        zb = None
        if lx[0] is None and lx[1] == 0:
            zb = 'x'
        elif ly[0] is None and ly[1] == 0:
            zb = 'y'
        dx = rx[1] if rx[0] in ('x', '_') else 0
        dy = ry[1] if ry[0] in ('y', '_') else 0
        rules.append((pc_src, dx, dy, pc_dst, zb))
    return rules


def decompose_atomic(pc_src, dx, dy, pc_dst):
    """Return (src_port, dst_port_or_None) per the (*1) mapping.
    Each port is a tuple (s_dir, s_idx, d_dir, d_idx).
    For (0, 0) the single intra-block port `Ca-Cb` is returned with
    dst_port = None."""
    if dx == 0 and dy == 0:
        return (('C', pc_src, 'C', pc_dst), None)
    if (dx, dy) == (-1, 0):
        return (('C', pc_src, 'W', pc_dst), ('E', pc_dst, 'C', pc_dst))
    if (dx, dy) == (1, 0):
        return (('C', pc_src, 'E', pc_dst), ('W', pc_dst, 'C', pc_dst))
    if (dx, dy) == (0, -1):
        return (('C', pc_src, 'S', pc_dst), ('N', pc_dst, 'C', pc_dst))
    if (dx, dy) == (0, 1):
        return (('C', pc_src, 'N', pc_dst), ('S', pc_dst, 'C', pc_dst))
    raise ValueError(
        f"unsupported displacement (dx={dx}, dy={dy}); "
        "only single-axis unit steps are supported"
    )


def build_block_sets(rules):
    """Distribute (*1)-decomposed ports across four block-type sets:
        normal -- (X >= 1, Y >= 1)
        nx     -- (X = 0,  Y >= 1)
        ny     -- (X >= 1, Y = 0)
        zero   -- (X = 0,  Y = 0)
    Catch-all rules (zb=None) fire regardless of X / Y, so they go
    to all four sets.  zb='x' (X=0 literal) fires at X=0 -> nx + zero.
    zb='y' (Y=0 literal) fires at Y=0 -> ny + zero."""
    sets = {'normal': [], 'nx': [], 'ny': [], 'zero': []}
    for pc_src, dx, dy, pc_dst, zb in rules:
        src_port, dst_port = decompose_atomic(pc_src, dx, dy, pc_dst)
        if zb is None:
            targets = ('normal', 'nx', 'ny', 'zero')
        elif zb == 'x':
            targets = ('nx', 'zero')
        else:
            targets = ('ny', 'zero')
        for bt in targets:
            sets[bt].append(src_port)
            if dst_port is not None:
                sets[bt].append(dst_port)
    return sets


_CCW_GROUP = {'S': 0, 'E': 1, 'N': 2, 'W': 3}


def ccw_key(term):
    """Sort key implementing the spec's CCW order
    S0..Sn, En..E0, Nn..N0, W0..Wn."""
    d, idx = term
    g = _CCW_GROUP[d]
    if g in (0, 3):
        return (g, idx)
    return (g, -idx)


def daisy_chain(ports):
    """Apply the daisy-chain pass to one block-type's port set.
    Returns a new port list with C terminals eliminated.  The start
    anchor `W0-C0` and goal anchor `W1-C1` are added to the normal set
    by the caller before this runs, so W0 and W1 land in C0's / C1's
    components and the daisy chain connects them to the rest."""
    adj = {}
    nodes = set()
    for sd, si, dd, di in ports:
        u = (sd, si)
        v = (dd, di)
        if u == v:
            continue
        nodes.add(u)
        nodes.add(v)
        adj.setdefault(u, set()).add(v)
        adj.setdefault(v, set()).add(u)

    visited = set()
    new_ports = []
    seen_chain = set()
    for start in nodes:
        if start in visited:
            continue
        comp = []
        stack = [start]
        while stack:
            u = stack.pop()
            if u in visited:
                continue
            visited.add(u)
            comp.append(u)
            for v in adj.get(u, ()):
                if v not in visited:
                    stack.append(v)
        edge_terms = sorted(
            (t for t in comp if t[0] != 'C'),
            key=ccw_key,
        )
        for i in range(len(edge_terms) - 1):
            u = edge_terms[i]
            v = edge_terms[i + 1]
            key = (u, v) if u < v else (v, u)
            if key in seen_chain:
                continue
            seen_chain.add(key)
            new_ports.append((u[0], u[1], v[0], v[1]))
    return new_ports


def simplify_c_terminals(ports):
    """Per-block-type simplification of C terminals (idx >= 2).
    Treats every (sd, si, dd, di) tuple as a directed edge.

    Rules (per C terminal, fixed-point iterated):
      in=1, out=1  -> replace [X->C, C->Y] with [X->Y]
      in=1, out=0  -> drop the lone incoming port
      in=0, out=1  -> drop the lone outgoing port
      in=2, out=0  -> drop both incoming ports
      in=0, out=2  -> drop both outgoing ports
    Other degree combinations leave the C terminal in place.

    C0 and C1 are bridge endpoints (W0->C0 entry, C1->W1 exit) and are
    never removed or renumbered.  After the rewrite, surviving C indices
    >= 2 are renumbered to be contiguous starting from 2.  Self-loops
    (X-X) carry no information and are dropped up front."""
    ports = [(sd, si, dd, di) for sd, si, dd, di in ports
             if not (sd == dd and si == di)]
    while True:
        c_in, c_out = {}, {}
        for i, (sd, si, dd, di) in enumerate(ports):
            if dd == 'C' and di >= 2:
                c_in.setdefault(di, []).append(i)
            if sd == 'C' and si >= 2:
                c_out.setdefault(si, []).append(i)
        target = None
        for c_idx in sorted(set(c_in) | set(c_out)):
            n_in = len(c_in.get(c_idx, ()))
            n_out = len(c_out.get(c_idx, ()))
            if (n_in, n_out) in {(1, 1), (1, 0), (0, 1), (2, 0), (0, 2)}:
                target = c_idx
                break
        if target is None:
            break
        ins = c_in.get(target, [])
        outs = c_out.get(target, [])
        to_remove = sorted(set(ins + outs), reverse=True)
        if len(ins) == 1 and len(outs) == 1:
            sd_in, si_in, _, _ = ports[ins[0]]
            _, _, dd_out, di_out = ports[outs[0]]
            new_port = (sd_in, si_in, dd_out, di_out)
            for j in to_remove:
                del ports[j]
            # Skip the merged port if it collapses into a self-loop.
            if not (new_port[0] == new_port[2] and new_port[1] == new_port[3]):
                ports.append(new_port)
        else:
            for j in to_remove:
                del ports[j]
    used = set()
    for sd, si, dd, di in ports:
        if sd == 'C':
            used.add(si)
        if dd == 'C':
            used.add(di)
    others = sorted(i for i in used if i >= 2)
    idx_map = {0: 0, 1: 1}
    next_new = 2
    for old in others:
        idx_map[old] = next_new
        next_new += 1
    if any(idx_map[k] != k for k in idx_map):
        ports = [
            (
                sd,
                idx_map[si] if sd == 'C' and si in idx_map else si,
                dd,
                idx_map[di] if dd == 'C' and di in idx_map else di,
            )
            for sd, si, dd, di in ports
        ]
    return ports


def simplify_wall_terminals(ports, block_type):
    """Drop wall subterminals whose direction points outside the maze
    when they appear in exactly one port.  Iterated to a fixed point so
    a chain whose every entry points outside (e.g. a daisy-chained
    W71-W118 stub in a `nx` block) is wholly removed.

    - In `ny` / `zero` blocks (y == 0 strip), an S subterminal would
      target the y == -1 row, which is outside the maze.
    - In `nx` / `zero` blocks (x == 0 strip), a W subterminal points
      outside (x == -1).  W0 and W1 are the maze start / goal endpoints
      and must be preserved; other one-port W terminals are dropped."""
    drop_dirs = set()
    if block_type in ('ny', 'zero'):
        drop_dirs.add('S')
    if block_type in ('nx', 'zero'):
        drop_dirs.add('W')
    if not drop_dirs:
        return ports
    while True:
        counts = {}
        for sd, si, dd, di in ports:
            counts[(sd, si)] = counts.get((sd, si), 0) + 1
            counts[(dd, di)] = counts.get((dd, di), 0) + 1
        drop = set()
        for (d, i), n in counts.items():
            if d not in drop_dirs or n != 1:
                continue
            if d == 'W' and i in (0, 1):
                continue
            drop.add((d, i))
        if not drop:
            return ports
        ports = [
            (sd, si, dd, di) for sd, si, dd, di in ports
            if (sd, si) not in drop and (dd, di) not in drop
        ]


def render_undirected(ports):
    seen = set()
    out = []
    for sd, si, dd, di in ports:
        a = (sd, si)
        b = (dd, di)
        key = frozenset({a, b})
        if key in seen:
            continue
        seen.add(key)
        out.append(f"{sd}{si}-{dd}{di}")
    return ', '.join(out) if out else '(none)'


def render_directed(ports):
    seen = set()
    out = []
    for sd, si, dd, di in ports:
        key = (sd, si, dd, di)
        if key in seen:
            continue
        seen.add(key)
        out.append(f"{sd}{si}->{dd}{di}")
    return ', '.join(out) if out else '(none)'


def main():
    args = sys.argv[1:]
    # Default pipeline: simplify -> daisy chain -> undirected `-`.
    daisy = True
    directed = False
    no_simplify = False
    verbose = False
    file_arg = None
    for a in args:
        if a in ('--help', '-h'):
            print(HELP_TEXT)
            return
        if a in ('--version', '-V'):
            print(f"hs2maze {VERSION}")
            return
        if a == '--daisy':
            daisy = True
        elif a == '--directed':
            # --directed always emits the raw (*1) decomposition.
            # Simplifier and daisy chain would erase directional
            # information, so they are forced off.
            directed = True
            no_simplify = True
            daisy = False
        elif a == '--no-simplify':
            no_simplify = True
            daisy = False
        elif a in ('-v', '--verbose'):
            verbose = True
        elif a.startswith('-'):
            print(f"hs2maze: unknown option '{a}' (use --help)", file=sys.stderr)
            sys.exit(2)
        else:
            file_arg = a

    text = open(file_arg).read() if file_arg else sys.stdin.read()
    try:
        rules = parse_file(text)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(2)
    if not rules:
        print("Error: no rules found", file=sys.stderr)
        sys.exit(1)

    if verbose:
        print(f"Parsed {len(rules)} atomic rules:", file=sys.stderr)
        for pc_src, dx, dy, pc_dst, zb in rules:
            extra = f"  [zb={zb}]" if zb else ""
            print(
                f"  C{pc_src} -> C{pc_dst} ({dx:+d},{dy:+d}){extra}",
                file=sys.stderr,
            )

    sets = build_block_sets(rules)
    # Bridges anchoring maze start (0,0,W0) and goal (0,0,W1) to the
    # Haskell-level (0,0,C0) / (0,0,C1).  Entry uses W0->C0 and exit
    # uses C1->W1.  Block (0,0) is `zero`, so the bridges go there;
    # added to all four sets for symmetry / robustness.
    for bt in ('normal', 'nx', 'ny', 'zero'):
        sets[bt].append(('W', 0, 'C', 0))   # entry: W0 -> C0
        sets[bt].append(('C', 1, 'W', 1))   # exit:  C1 -> W1

    # Simplify low-degree C terminals (idx >= 2) per block type by
    # default.  C0 / C1 are protected (start/goal bridge endpoints).
    # --no-simplify keeps the raw (*1) decomposition.
    if not no_simplify:
        sets = {bt: simplify_c_terminals(ports) for bt, ports in sets.items()}

    if daisy:
        # Default: daisy-chain pass drops C terminals AND collapses
        # multi-rule chains into one short CCW chain, so path-length
        # growth flattens to O(k).
        sets = {bt: daisy_chain(ports) for bt, ports in sets.items()}

    if not no_simplify:
        # Drop one-port wall subterminals that point outside the maze
        # (S in y=0 strip, W in x=0 strip; W0/W1 protected).  Run after
        # the daisy chain so the dead stubs it can produce
        # (e.g. zero-block W71-W118 with both ends one-port) are pruned.
        sets = {bt: simplify_wall_terminals(ports, bt)
                for bt, ports in sets.items()}

    # Output is undirected unless --directed was passed (which forces
    # --no-simplify so the (*1) decomposition is the raw one-way graph).
    renderer = render_directed if directed else render_undirected

    if verbose:
        for bt in ('normal', 'nx', 'ny', 'zero'):
            print(
                f"{bt}: {len(sets[bt])} ports",
                file=sys.stderr,
            )

    parts = [
        f"normal: {renderer(sets['normal'])}",
        f"nx: {renderer(sets['nx'])}",
        f"ny: {renderer(sets['ny'])}",
        f"zero: {renderer(sets['zero'])}",
    ]
    print('; '.join(parts))


if __name__ == '__main__':
    main()
