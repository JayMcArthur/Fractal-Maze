#!/usr/bin/env python3
"""make_penta.py — Generate penta.hs for hs2maze (current convention).

Implements penta.md's 2-register Gödel-encoded pentation Minsky machine:
  x = 2^a * 3^b * 5^c * 7^d * 11^e * f  (f in {1, 13, 17, 19})

14 rules (Fractran-style) applied in first-match order. Each rule:
  - Tests non-divisibility conditions for listed primes (non-destructive)
  - Divides by denominator, multiplies by numerator
  - Loops back to main dispatcher

Maze convention (matches current hs2maze.py / solver.py):
  - start  = (0, 0, W, 0)  bridge W0 -> C0 (Haskell pc = 0)
  - goal   = (0, 0, W, 1)  bridge C1 -> W1 (Haskell pc = 1, HALT)
  - registers start at (x = 0, y = 0)
  - block (0, 0) is the `zero` block

Zero-branch handling is emitted as zb='x' and zb='y' Haskell rules
(`penta (0, y, pc) = ...` / `penta (x, 0, pc) = ...`).  hs2maze.py
auto-distributes them: zb='x' -> nx + zero, zb='y' -> ny + zero,
catch-all -> all four sets.  No manual port editing required.

Usage: python3 make_penta.py [initial_a] > penta.hs
  initial_a: exponent of 2 in input Gödel number.
             penta(2^initial_a) = 3^(2↑↑↑initial_a).
             Default 1.  For 0, result = 1 (immediate HALT).
             For 2, result = 3^(2^16) (huge).
"""

import sys

# ---------------------------------------------------------------------------
# Rule table (penta.md, Fractran form)
# Each rule: (non-divisibility-test-primes, action-ops, is_halt_rule)
# Actions decomposed: (a/b) * x  =  div_b then mul_(prime factors of a)
# ---------------------------------------------------------------------------

RULES = [
    (['2', '5'],        [],                                          True),   # Rule 1: HALT
    (['3', '5', '13'],  [('div', 2), ('mul', 3), ('mul', 3)],        False),  # 9/2
    (['5', '7', '13'],  [('div', 3), ('mul', 5), ('mul', 5)],        False),  # 25/3
    (['3', '13'],       [('div', 2), ('mul', 13)],                   False),  # 13/2
    (['7', '11', '13'], [('div', 5), ('mul', 7), ('mul', 7)],        False),  # 49/5
    (['5', '13'],       [('div', 3), ('mul', 17)],                   False),  # 17/3
    (['7', '13'],       [('div', 5), ('mul', 19)],                   False),  # 19/5
    (['13'],            [('div', 7), ('mul', 11), ('mul', 11)],      False),  # 121/7
    (['5', '17'],       [('div', 13)],                               False),  # 1/13
    (['17'],            [('div', 5), ('mul', 3)],                    False),  # 3/5
    (['7', '19'],       [('div', 17)],                               False),  # 1/17
    (['19'],            [('div', 7), ('mul', 5)],                    False),  # 5/7
    (['11'],            [('div', 19)],                               False),  # 1/19
    ([],                [('div', 11), ('mul', 7)],                   False),  # 7/11 (default)
]


# ---------------------------------------------------------------------------
# Code generator
# ---------------------------------------------------------------------------

class Gen:
    """Emit Haskell rules.  `emitted` is a list of (pc, kind, line) tuples
    where kind is 'a' (catch-all), 'x' (zb='x'), or 'y' (zb='y').
    Multiple rules per pc are allowed (catch-all + zb='x' or zb='y')."""

    def __init__(self):
        self.pc_next = 2  # pc 0 = start, pc 1 = HALT (hs2maze convention)
        self.emitted = []

    def new_pc(self):
        p = self.pc_next
        self.pc_next += 1
        return p

    def emit(self, pc, dx, dy, dst):
        """Catch-all: penta (x, y, pc) = penta (x±dx, y±dy, dst)."""
        def fmt(v, var):
            if v > 0:
                return f"{var}+{v}"
            if v < 0:
                return f"{var}{v}"
            return var
        line = (f"penta (x, y, {pc:5d}) = penta "
                f"({fmt(dx, 'x'):>4s}, {fmt(dy, 'y'):>4s}, {dst:5d})")
        self.emitted.append((pc, 'a', line))

    def emit_noop(self, pc, dst):
        self.emit(pc, 0, 0, dst)

    def emit_zb_x(self, pc, dst):
        """zb='x': penta (0, y, pc) = penta (0, y, dst)."""
        line = (f"penta (0, y, {pc:5d}) = penta "
                f"(   0,    y, {dst:5d})")
        self.emitted.append((pc, 'x', line))

    def emit_zb_y(self, pc, dst):
        """zb='y': penta (x, 0, pc) = penta (x, 0, dst)."""
        line = (f"penta (x, 0, {pc:5d}) = penta "
                f"(   x,    0, {dst:5d})")
        self.emitted.append((pc, 'y', line))

    # ------------------------------------------------------------------
    # mul_p: x := p * x using y as temp.  Assumes y = 0.  Exits to exit_pc.
    # PCs used: entry + p (incy chain) + 2 (stage 2) = p + 3
    # ------------------------------------------------------------------
    def mul_p(self, p, exit_pc):
        entry = self.new_pc()
        incy = [self.new_pc() for _ in range(p)]
        s2_decy = self.new_pc()
        s2_incx = self.new_pc()

        # Stage 1: DEC x; if x=0 go to stage 2; else INC y p times and loop.
        self.emit(entry, -1, 0, incy[0])
        self.emit_zb_x(entry, s2_decy)
        for i in range(p):
            nxt = incy[i + 1] if i + 1 < p else entry
            self.emit(incy[i], 0, 1, nxt)

        # Stage 2: DEC y, INC x, loop; exit via zb='y'.
        self.emit(s2_decy, 0, -1, s2_incx)
        self.emit_zb_y(s2_decy, exit_pc)
        self.emit(s2_incx, 1, 0, s2_decy)
        return entry

    # ------------------------------------------------------------------
    # div_p: x := x / p (assumes p | x).  Assumes y = 0.  Exits to exit_pc.
    # On unexpected (p ∤ x) it traps to trap_pc (which self-loops).
    # PCs used: p (dec chain) + 1 (incy) + 2 (stage 2) = p + 3
    # ------------------------------------------------------------------
    def div_p(self, p, exit_pc, trap_pc):
        entry = self.new_pc()
        decs = [entry] + [self.new_pc() for _ in range(p - 1)]
        incy = self.new_pc()
        s2_decy = self.new_pc()
        s2_incx = self.new_pc()

        for i in range(p):
            nxt = decs[i + 1] if i + 1 < p else incy
            self.emit(decs[i], -1, 0, nxt)
            # x=0 at first DEC means done; mid-chain means unexpected.
            self.emit_zb_x(decs[i], s2_decy if i == 0 else trap_pc)

        self.emit(incy, 0, 1, decs[0])
        self.emit(s2_decy, 0, -1, s2_incx)
        self.emit_zb_y(s2_decy, exit_pc)
        self.emit(s2_incx, 1, 0, s2_decy)
        return entry

    # ------------------------------------------------------------------
    # test_ndiv(p, pass_pc, fail_pc): NON-DESTRUCTIVE test of p ∤ x.
    # If p ∤ x: restore x and goto pass_pc.
    # If p | x: restore x and goto fail_pc.
    # PCs used: O(p^2) due to restore subroutines per k ∈ [0, p-1].
    # ------------------------------------------------------------------
    def test_ndiv(self, p, pass_pc, fail_pc):
        entry = self.new_pc()
        decs = [entry] + [self.new_pc() for _ in range(p - 1)]
        incy = self.new_pc()

        # Generate p restore subroutines.  Each reconstructs x = y*p + k.
        restores = []
        for k in range(p):
            exit_tgt = fail_pc if k == 0 else pass_pc
            decy = self.new_pc()
            incxs = [self.new_pc() for _ in range(p)]
            extras = [self.new_pc() for _ in range(k)]

            self.emit(decy, 0, -1, incxs[0])
            ny_dst = exit_tgt if k == 0 else extras[0]
            self.emit_zb_y(decy, ny_dst)

            for i in range(p):
                nxt = incxs[i + 1] if i + 1 < p else decy
                self.emit(incxs[i], 1, 0, nxt)

            for i in range(k):
                nxt = extras[i + 1] if i + 1 < k else exit_tgt
                self.emit(extras[i], 1, 0, nxt)

            restores.append(decy)

        # Main DEC chain.
        for i in range(p):
            nxt = decs[i + 1] if i + 1 < p else incy
            self.emit(decs[i], -1, 0, nxt)
            self.emit_zb_x(decs[i], restores[i])

        self.emit(incy, 0, 1, decs[0])
        return entry

    # ------------------------------------------------------------------
    # drain_x(exit_pc): DEC x until x=0, then goto exit_pc.
    # ------------------------------------------------------------------
    def drain_x(self, exit_pc):
        entry = self.new_pc()
        self.emit(entry, -1, 0, entry)
        self.emit_zb_x(entry, exit_pc)
        return entry

    # ------------------------------------------------------------------
    # gen_action(ops, main_pc, trap_pc): emit a sequential chain of
    # mul/div subroutines.  Last op exits to main_pc.
    # Returns entry pc of the first op (or main_pc if ops is empty).
    # ------------------------------------------------------------------
    def gen_action(self, ops, main_pc, trap_pc):
        if not ops:
            return main_pc
        exits = [self.new_pc() for _ in ops]
        op_entries = []
        for i, (op, p) in enumerate(ops):
            exit_pc = exits[i]
            if op == 'mul':
                entry = self.mul_p(p, exit_pc)
            else:  # div
                entry = self.div_p(p, exit_pc, trap_pc)
            op_entries.append(entry)
        # Each exit pc forwards to the next op's entry (or main_pc).
        for i in range(len(ops)):
            target = op_entries[i + 1] if i + 1 < len(ops) else main_pc
            self.emit_noop(exits[i], target)
        return op_entries[0]


# ---------------------------------------------------------------------------
# Build the whole machine
# ---------------------------------------------------------------------------

def build(initial_a):
    g = Gen()

    # Reserve anchor pcs.  pc=0 (start) and pc=1 (HALT) are hardcoded.
    main_pc = g.new_pc()
    trap_pc = g.new_pc()
    g.emit_noop(trap_pc, trap_pc)  # infinite self-loop for unexpected cases

    rule_entries = [g.new_pc() for _ in RULES]

    # Seed input x = 2^initial_a via 2^initial_a INC x rules at pc=0..
    # (Initial registers are (0, 0) per current maze convention; no DEC y
    # needed.)  Pentation needs Gödel x = 2^initial_a where the 5D-Minsky
    # input register a has value initial_a; the bare INC chain is fine for
    # small initial_a and avoids extra control overhead in the maze.
    # n_inc >= 1 always (initial_a=0 -> 1 INC -> x=1 -> Rule 1 HALTs).
    n_inc = 1 << initial_a  # 2^initial_a
    cur = 0
    for i in range(n_inc):
        nxt = g.new_pc() if i + 1 < n_inc else main_pc
        g.emit(cur, 1, 0, nxt)
        cur = nxt

    # main_pc -> rule_entries[0]
    g.emit_noop(main_pc, rule_entries[0])

    # Process each rule.
    for idx, (ndiv_primes, action, is_halt) in enumerate(RULES):
        entry = rule_entries[idx]
        next_rule = rule_entries[idx + 1] if idx + 1 < len(RULES) else trap_pc

        if is_halt:
            # HALT: drain x to 0 (y is already 0), then goto pc=1.
            halt_drain_pc = g.new_pc()
            g.emit(halt_drain_pc, -1, 0, halt_drain_pc)
            g.emit_zb_x(halt_drain_pc, 1)  # x=0 -> HALT at pc=1

            # Indirection to break the "INC x → pc=halt_drain_pc + self-loop"
            # shortcut.  Without it, test_ndiv's terminal `extras` catch-all
            # `INC x to pass_pc` would emit the source port
            # C(extras)→E(halt_drain_pc) and the self-loop's dst port
            # E(halt_drain_pc)→C(halt_drain_pc) into the same block-type
            # set (catch-all goes to all 4), letting BFS skip the drain
            # loop entirely (C(extras) → E(halt_drain_pc) →
            # C(halt_drain_pc) → C1).  Routing through halt_drain_entry
            # (a noop, no edge port) keeps the entry edge-port-free so
            # E(halt_drain_pc) is only reachable via the legitimate
            # neighbour-block crossing.
            halt_drain_entry = g.new_pc()
            g.emit_noop(halt_drain_entry, halt_drain_pc)

            if not ndiv_primes:
                g.emit_noop(entry, halt_drain_entry)
            else:
                cur_entry = entry
                for j, pstr in enumerate(ndiv_primes):
                    p_int = int(pstr)
                    if j + 1 < len(ndiv_primes):
                        nxt_entry = g.new_pc()
                        test_entry = g.test_ndiv(
                            p_int, pass_pc=nxt_entry, fail_pc=next_rule
                        )
                        g.emit_noop(cur_entry, test_entry)
                        cur_entry = nxt_entry
                    else:
                        test_entry = g.test_ndiv(
                            p_int, pass_pc=halt_drain_entry, fail_pc=next_rule
                        )
                        g.emit_noop(cur_entry, test_entry)
        else:
            action_entry = g.gen_action(action, main_pc, trap_pc)

            if not ndiv_primes:
                g.emit_noop(entry, action_entry)
            else:
                cur_entry = entry
                for j, pstr in enumerate(ndiv_primes):
                    p_int = int(pstr)
                    if j + 1 < len(ndiv_primes):
                        nxt_entry = g.new_pc()
                        test_entry = g.test_ndiv(
                            p_int, pass_pc=nxt_entry, fail_pc=next_rule
                        )
                        g.emit_noop(cur_entry, test_entry)
                        cur_entry = nxt_entry
                    else:
                        test_entry = g.test_ndiv(
                            p_int, pass_pc=action_entry, fail_pc=next_rule
                        )
                        g.emit_noop(cur_entry, test_entry)

    return g


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------

def format_output(g, initial_a):
    n_zb_x = sum(1 for _, k, _ in g.emitted if k == 'x')
    n_zb_y = sum(1 for _, k, _ in g.emitted if k == 'y')
    n_catch = sum(1 for _, k, _ in g.emitted if k == 'a')

    n_inc = 1 << initial_a
    header = [
        f"-- penta.hs: Gödel-encoded 2-register Minsky machine computing pentation.",
        f"-- Generated by make_penta.py (initial_a={initial_a}).",
        f"--",
        f"-- Maze convention (current hs2maze.py / solver.py):",
        f"--   start = (0, 0, W, 0)  via bridge W0 -> C0 (pc = 0)",
        f"--   goal  = (0, 0, W, 1)  via bridge C1 -> W1 (pc = 1)",
        f"--   initial registers (x = 0, y = 0); block (0, 0) is `zero`.",
        f"--",
        f"-- Input:  x = 2^{initial_a} = {n_inc} (set up by {n_inc} INC x rules at pc=0..).",
        f"-- Output: drains x to 0 then HALTs at pc=1 with registers (0, 0).",
        f"--",
        f"-- 14 Fractran-style rules from penta.md:",
    ]
    for idx, (nd, act, halt) in enumerate(RULES):
        if halt:
            desc = "HALT"
        else:
            parts = []
            for op, p in act:
                parts.append(f"/{p}" if op == 'div' else f"*{p}")
            desc = " then ".join(parts)
        cond = " ∧ ".join(f"{p}∤x" for p in nd) if nd else "(default)"
        header.append(f"--   Rule {idx + 1:2d}: {cond:30s} → {desc}")
    header.append(f"--")
    header.append(
        f"-- Total pc count: {g.pc_next - 2} "
        f"(pc 0, 1 reserved; allocated 2..{g.pc_next - 1})"
    )
    header.append(
        f"-- Rules: {n_catch} catch-all, "
        f"{n_zb_x} zb='x', {n_zb_y} zb='y'."
    )
    header.append(
        f"-- All zero-branch handling is encoded as zb='x' / zb='y' rules,"
    )
    header.append(
        f"-- so hs2maze.py auto-generates the maze with no manual editing."
    )
    header.append(f"--")
    header.append(
        f"-- Usage: python3 ../../tools/hs2maze/hs2maze.py penta.hs > penta.maze"
    )
    header.append("")
    header.append(f"penta :: (Int, Int, Int) -> (Int, Int, Int)")
    header.append("")

    # Sort: zb='x' first, then zb='y', then catch-all, per pc.  Matches
    # Haskell first-match semantics so the file is human-readable as a
    # runnable Haskell module (hs2maze itself ignores order).
    order = {'x': 0, 'y': 1, 'a': 2}
    body_lines = sorted(g.emitted, key=lambda t: (t[0], order[t[1]]))
    body = [line for _, _, line in body_lines]

    return "\n".join(header + body) + "\n"


def main():
    initial_a = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    if initial_a < 0:
        print("initial_a must be >= 0", file=sys.stderr)
        sys.exit(1)
    g = build(initial_a)
    print(format_output(g, initial_a), end='')
    n_zb_x = sum(1 for _, k, _ in g.emitted if k == 'x')
    n_zb_y = sum(1 for _, k, _ in g.emitted if k == 'y')
    n_catch = sum(1 for _, k, _ in g.emitted if k == 'a')
    print(
        f"[make_penta] Generated {g.pc_next - 2} pc values: "
        f"{n_catch} catch-all, {n_zb_x} zb='x', {n_zb_y} zb='y'.",
        file=sys.stderr,
    )


if __name__ == '__main__':
    main()
