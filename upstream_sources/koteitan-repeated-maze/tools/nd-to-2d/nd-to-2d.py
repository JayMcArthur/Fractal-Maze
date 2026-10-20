#!/usr/bin/env python3
"""nd-to-2d.py — Compile an n-register Minsky-style Haskell state machine into a
2-register Gödel-encoded one suitable for hs2maze.py.

Gödel numbering: x = product_{i=0..n-1} p_i^{r_i}, where p_i is the i-th prime
(p_0 = 2, p_1 = 3, p_2 = 5, ...). The output uses 2 registers (x, y) + pc.

This file currently implements **Part 1: the parser** only.
It reads an n-register Haskell state machine and prints the parsed AST
(rules) in a human-readable form for inspection.

Input format (one function definition, multiple equations):

    FN :: (Int, Int, ..., Int) -> (Int, Int, ..., Int)
    FN (pat_0, pat_1, ..., pat_{n-1}, pat_pc) = FN (rhs_0, ..., rhs_{n-1}, rhs_pc)
    FN (...)                                  = (...)    -- HALT (no FN prefix)

LHS slot patterns:
    `var` (identifier)  - capture variable (any value)
    `_`                 - wildcard (any value)
    `0`                 - zero test (register must be 0)
    `k` (positive int)  - strict literal test (rare)
    PC slot must be an integer literal.

RHS slot expressions:
    `var`               - same as LHS variable: unchanged
    `var + k`           - r_i := r_i + k
    `var - k`           - r_i := r_i - k
    `k` (literal)       - absolute assignment r_i := k
    `_`                 - (LHS-only; unsupported in RHS; error)
    PC slot must be an integer literal. `-1` indicates HALT as well.

Usage:
    python3 nd-to-2d.py input.hs           # compile to 2-register Haskell
    python3 nd-to-2d.py input.hs --parse   # dump parsed rules instead
    python3 nd-to-2d.py input.hs --ast     # same as --parse, more verbose
    python3 nd-to-2d.py                    # read source from stdin
    python3 nd-to-2d.py -                  # same as above (explicit dash)
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from typing import List, Optional, Union


VERSION = "0.2"

HELP_TEXT = """\
Usage: nd-to-2d.py [FILE] [--parse | --ast]
       nd-to-2d.py --help | -h
       nd-to-2d.py --version | -V

Compile an n-register Minsky-style Haskell state machine into a
2-register Gödel-encoded one suitable for hs2maze.py.  Reads the input
from FILE, or from stdin if FILE is omitted or set to `-`.  Writes the
compiled 2-register Haskell to stdout; a one-line summary of the
generated equation counts is printed to stderr.

Modes:
  (default)     compile and emit 2-register Haskell on stdout.
  --parse       skip compilation; pretty-print each parsed rule as a
                single line per rule.
  --ast         like --parse, but also dumps the AST node type and
                value of every LHS pattern and RHS expression slot
                (debug aid for the parser).

Other options:
  -h, --help    show this message and exit.
  -V, --version show the script version (currently v{version}) and exit.
""".format(version=VERSION)


# ---------------------------------------------------------------------------
# AST types
# ---------------------------------------------------------------------------

@dataclass
class PatVar:
    name: str
    def __str__(self) -> str: return self.name

@dataclass
class PatWild:
    def __str__(self) -> str: return "_"

@dataclass
class PatLit:
    value: int
    def __str__(self) -> str: return str(self.value)

Pattern = Union[PatVar, PatWild, PatLit]


@dataclass
class ExprVar:
    name: str
    def __str__(self) -> str: return self.name

@dataclass
class ExprVarOp:
    name: str
    delta: int            # +k for INC, -k for DEC (non-zero)
    def __str__(self) -> str:
        return f"{self.name}{self.delta:+d}"

@dataclass
class ExprLit:
    value: int
    def __str__(self) -> str: return str(self.value)

Expr = Union[ExprVar, ExprVarOp, ExprLit]


@dataclass
class Rule:
    lhs_pats: List[Pattern]   # length n
    lhs_pc: int
    rhs_exprs: List[Expr]     # length n; ignored if halt=True and not provided
    rhs_pc: int               # -1 for HALT by convention
    halt: bool                # True if RHS has no FN prefix
    source_line: int          # 1-based line number for error messages


@dataclass
class Program:
    fn_name: str
    n_regs: int               # tuple_len - 1
    rules: List[Rule]


# ---------------------------------------------------------------------------
# Lexical helpers
# ---------------------------------------------------------------------------

def _strip_comment(line: str) -> str:
    """Remove line comment starting at `--` (outside strings)."""
    # Simple implementation: split at the first `--`.
    # (We don't support block comments {- -} or strings containing --.)
    idx = line.find("--")
    if idx >= 0:
        return line[:idx]
    return line


def _tokenize_tuple(inner: str) -> List[str]:
    """Given the content inside a tuple's outer parens, split on top-level commas.
    (Nested parens are not expected in our input grammar.)"""
    parts: List[str] = []
    depth = 0
    buf: List[str] = []
    for ch in inner:
        if ch == "(":
            depth += 1
            buf.append(ch)
        elif ch == ")":
            depth -= 1
            buf.append(ch)
        elif ch == "," and depth == 0:
            parts.append("".join(buf).strip())
            buf = []
        else:
            buf.append(ch)
    if buf:
        parts.append("".join(buf).strip())
    return parts


# ---------------------------------------------------------------------------
# Pattern / expression parsers
# ---------------------------------------------------------------------------

_IDENT_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_']*$")
_VAR_OP_RE = re.compile(r"^([a-zA-Z_][a-zA-Z0-9_']*)\s*([+-])\s*(\d+)$")
_INT_RE = re.compile(r"^-?\d+$")


def parse_pattern(s: str, line_no: int) -> Pattern:
    s = s.strip()
    if s == "_":
        return PatWild()
    if _INT_RE.match(s):
        return PatLit(int(s))
    if _IDENT_RE.match(s):
        return PatVar(s)
    raise SyntaxError(f"line {line_no}: cannot parse LHS pattern {s!r}")


def parse_expression(s: str, line_no: int) -> Expr:
    s = s.strip()
    if s == "_":
        raise SyntaxError(f"line {line_no}: wildcard `_` is not allowed in RHS")
    if _INT_RE.match(s):
        return ExprLit(int(s))
    m = _VAR_OP_RE.match(s)
    if m:
        name = m.group(1)
        sign = m.group(2)
        k = int(m.group(3))
        return ExprVarOp(name, k if sign == "+" else -k)
    if _IDENT_RE.match(s):
        return ExprVar(s)
    raise SyntaxError(f"line {line_no}: cannot parse RHS expression {s!r}")


# ---------------------------------------------------------------------------
# Top-level parser
# ---------------------------------------------------------------------------

# Type signature pattern, e.g.:
#   penta :: (Int, Int, Int, Int, Int, Int) -> (Int, Int, Int, Int, Int, Int)
_SIG_RE = re.compile(
    r"^(?P<name>[a-zA-Z_][a-zA-Z0-9_']*)\s*"
    r"::\s*"
    r"\((?P<ltup>[^)]*)\)\s*->\s*\((?P<rtup>[^)]*)\)\s*$"
)

# Equation pattern, e.g.:
#   foo (pat, pat, ..., pat) = foo (expr, expr, ..., expr)
#   foo (pat, pat, ..., pat) = (expr, expr, ..., expr)   -- HALT (no `foo`)
_EQ_RE = re.compile(
    r"^(?P<fname>[a-zA-Z_][a-zA-Z0-9_']*)\s*"
    r"\((?P<lhs>[^)]*)\)\s*=\s*"
    r"(?:(?P<rname>[a-zA-Z_][a-zA-Z0-9_']*)\s*)?"
    r"\((?P<rhs>[^)]*)\)\s*$"
)


def parse_program(text: str) -> Program:
    fn_name: Optional[str] = None
    n_regs: Optional[int] = None
    rules: List[Rule] = []

    for line_no, raw in enumerate(text.splitlines(), start=1):
        line = _strip_comment(raw).strip()
        if not line:
            continue

        # Type signature?
        m_sig = _SIG_RE.match(line)
        if m_sig:
            name = m_sig.group("name")
            ltup = _tokenize_tuple(m_sig.group("ltup"))
            rtup = _tokenize_tuple(m_sig.group("rtup"))
            if any(t.strip() != "Int" for t in ltup + rtup):
                raise SyntaxError(
                    f"line {line_no}: only Int-tuple signatures are supported"
                )
            if len(ltup) != len(rtup):
                raise SyntaxError(
                    f"line {line_no}: tuple length mismatch {len(ltup)} -> {len(rtup)}"
                )
            if len(ltup) < 2:
                raise SyntaxError(
                    f"line {line_no}: tuple must have at least 1 register + 1 PC"
                )
            if fn_name is None:
                fn_name = name
                n_regs = len(ltup) - 1
            elif fn_name != name:
                raise SyntaxError(
                    f"line {line_no}: multiple function names ({fn_name!r} vs {name!r})"
                )
            continue

        # Equation?
        m_eq = _EQ_RE.match(line)
        if m_eq:
            fname = m_eq.group("fname")
            if fn_name is None:
                fn_name = fname  # implicit (no sig line seen yet)
            if fname != fn_name:
                raise SyntaxError(
                    f"line {line_no}: expected function {fn_name!r}, got {fname!r}"
                )

            lhs_parts = _tokenize_tuple(m_eq.group("lhs"))
            rhs_parts = _tokenize_tuple(m_eq.group("rhs"))

            if n_regs is None:
                n_regs = len(lhs_parts) - 1
            if len(lhs_parts) != n_regs + 1:
                raise SyntaxError(
                    f"line {line_no}: LHS tuple length {len(lhs_parts)} "
                    f"!= expected {n_regs + 1}"
                )
            if len(rhs_parts) != n_regs + 1:
                raise SyntaxError(
                    f"line {line_no}: RHS tuple length {len(rhs_parts)} "
                    f"!= expected {n_regs + 1}"
                )

            lhs_pats: List[Pattern] = [
                parse_pattern(p, line_no) for p in lhs_parts[:-1]
            ]
            lhs_pc_pat = parse_pattern(lhs_parts[-1], line_no)
            if not isinstance(lhs_pc_pat, PatLit):
                raise SyntaxError(
                    f"line {line_no}: LHS pc slot must be an integer literal"
                )

            # RHS has name only if non-HALT
            rname = m_eq.group("rname")
            is_halt = rname is None
            if not is_halt and rname != fn_name:
                raise SyntaxError(
                    f"line {line_no}: RHS function name {rname!r} != {fn_name!r}"
                )

            rhs_exprs: List[Expr] = [
                parse_expression(e, line_no) for e in rhs_parts[:-1]
            ]
            rhs_pc_expr = parse_expression(rhs_parts[-1], line_no)
            if not isinstance(rhs_pc_expr, ExprLit):
                raise SyntaxError(
                    f"line {line_no}: RHS pc slot must be an integer literal"
                )

            rules.append(Rule(
                lhs_pats=lhs_pats,
                lhs_pc=lhs_pc_pat.value,
                rhs_exprs=rhs_exprs,
                rhs_pc=rhs_pc_expr.value,
                halt=is_halt,
                source_line=line_no,
            ))
            continue

        # Unrecognized non-empty line
        raise SyntaxError(f"line {line_no}: cannot parse: {line!r}")

    if fn_name is None or n_regs is None:
        raise SyntaxError("no function definition found")

    return Program(fn_name=fn_name, n_regs=n_regs, rules=rules)


# ---------------------------------------------------------------------------
# Pretty-print
# ---------------------------------------------------------------------------

def dump_program(prog: Program, verbose: bool = False) -> str:
    out: List[str] = []
    out.append(f"function: {prog.fn_name}")
    out.append(f"n_regs:   {prog.n_regs}")
    out.append(f"rules:    {len(prog.rules)}")
    out.append("")
    for idx, r in enumerate(prog.rules, start=1):
        lhs = ", ".join(str(p) for p in r.lhs_pats)
        rhs = ", ".join(str(e) for e in r.rhs_exprs)
        halt_str = "HALT" if r.halt else prog.fn_name
        arrow = "=>" if r.halt else "->"
        out.append(
            f"  rule {idx:2d} (line {r.source_line}): "
            f"({lhs}, pc={r.lhs_pc}) {arrow} ({rhs}, pc={r.rhs_pc}) [{halt_str}]"
        )
        if verbose:
            for i, p in enumerate(r.lhs_pats):
                out.append(f"    LHS r_{i}: {type(p).__name__}({p})")
            for i, e in enumerate(r.rhs_exprs):
                out.append(f"    RHS r_{i}: {type(e).__name__}({e})")
    return "\n".join(out)


# ---------------------------------------------------------------------------
# Part 2: Compiler
# ---------------------------------------------------------------------------

from collections import defaultdict
from typing import Dict, Tuple

PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]


class Compiler:
    """Compile n-register Program → 2-register Gödel-encoded Haskell."""

    def __init__(self, program: Program):
        self.program = program
        if program.n_regs > len(PRIMES):
            raise ValueError(
                f"too many registers ({program.n_regs} > {len(PRIMES)})"
            )
        self.primes = PRIMES[:program.n_regs]
        self.pc_next = 2        # pc=0 start, pc=1 HALT
        # equations per pc, indexed by "kind":
        #   'main': the non-zero-branch equation  godel (x, y, pc) = ...
        #   'nx':   the x-zero-branch equation    godel (0, y, pc) = godel (0, y, dst)
        #   'ny':   the y-zero-branch equation    godel (x, 0, pc) = godel (x, 0, dst)
        # Haskell first-match requires 'nx' / 'ny' to precede 'main' per pc.
        self.eqns: Dict[int, Dict[str, str]] = {}

    # -- pc allocation & emission ---------------------------------------------

    def new_pc(self) -> int:
        p = self.pc_next
        self.pc_next += 1
        return p

    def _store(self, pc: int, kind: str, line: str) -> None:
        self.eqns.setdefault(pc, {})[kind] = line

    def emit(self, pc: int, dx: int, dy: int, dst: int) -> None:
        """Emit the non-zero-branch equation for pc."""
        def fmt(v: int, var: str) -> str:
            if v > 0: return f"{var}+{v}"
            if v < 0: return f"{var}{v}"
            return var
        line = (
            f"godel (x, y, {pc:5d}) = godel "
            f"({fmt(dx, 'x'):>4s}, {fmt(dy, 'y'):>4s}, {dst:5d})"
        )
        self._store(pc, 'main', line)

    def emit_noop(self, pc: int, dst: int) -> None:
        self.emit(pc, 0, 0, dst)

    def emit_nx(self, pc: int, dst: int) -> None:
        """Emit x-zero-branch equation:  godel (0, y, pc) = godel (0, y, dst)."""
        line = f"godel (0, y, {pc:5d}) = godel (   0,    y, {dst:5d})"
        self._store(pc, 'nx', line)

    def emit_ny(self, pc: int, dst: int) -> None:
        """Emit y-zero-branch equation:  godel (x, 0, pc) = godel (x, 0, dst)."""
        line = f"godel (x, 0, {pc:5d}) = godel (   x,    0, {dst:5d})"
        self._store(pc, 'ny', line)

    # -- Subroutines ----------------------------------------------------------

    # NOTE on the "ny tail" idiom used below.
    # ----------------------------------------------------------------------
    # hs2maze's ny convention fires the bridge on the y=1 → 0 transition,
    # but Minsky semantics treat that transition as the LAST iteration of
    # the non-zero branch, where any "post-DEC y" actions of the iteration
    # body must still execute before exiting. Without compensation, those
    # actions are skipped and the subroutine produces an off-by-one (or
    # off-by-p) result.
    #
    # We compensate by giving each ny port a small "tail" pc-chain that
    # performs the post-DEC y actions of the final iteration and then
    # jumps to the real exit target. The ny destination is the head of
    # this tail, not the exit pc itself.

    def mul_p(self, p: int, exit_pc: int) -> int:
        # Phase B drain (decy → incx*p → decy loop) naturally completes
        # the final iteration's p INC x BEFORE the zb='y' check fires
        # (zb='y' is on decy, which is re-entered after the inner incx
        # loop closes).  No extra INC x is needed; ny port goes straight
        # to exit_pc.
        entry = self.new_pc()
        incy = [self.new_pc() for _ in range(p)]
        s2_decy = self.new_pc()
        s2_incx = self.new_pc()
        self.emit(entry, -1, 0, incy[0])
        self.emit_nx(entry, s2_decy)
        for i in range(p):
            nxt = incy[i + 1] if i + 1 < p else entry
            self.emit(incy[i], 0, 1, nxt)
        self.emit(s2_decy, 0, -1, s2_incx)
        self.emit_ny(s2_decy, exit_pc)
        self.emit(s2_incx, 1, 0, s2_decy)
        return entry

    def div_p(self, p: int, exit_pc: int, trap_pc: int) -> int:
        entry = self.new_pc()
        decs = [entry] + [self.new_pc() for _ in range(p - 1)]
        incy = self.new_pc()
        s2_decy = self.new_pc()
        s2_incx = self.new_pc()
        for i in range(p):
            nxt = decs[i + 1] if i + 1 < p else incy
            self.emit(decs[i], -1, 0, nxt)
            self.emit_nx(decs[i], s2_decy if i == 0 else trap_pc)
        self.emit(incy, 0, 1, decs[0])
        self.emit(s2_decy, 0, -1, s2_incx)
        self.emit_ny(s2_decy, exit_pc)
        self.emit(s2_incx, 1, 0, s2_decy)
        return entry

    def test_ndiv(self, p: int, pass_pc: int, fail_pc: int) -> int:
        # Phase B (decy → incxs*p → decy) restores x by p per DEC y.  The
        # natural loop completes its final iteration before zb='y' fires,
        # so no ny tail is needed.  When k > 0 the partial-round remainder
        # (k DECs that didn't reach a full round) is replayed by `extras`
        # (k INC x's chained to exit_tgt).
        entry = self.new_pc()
        decs = [entry] + [self.new_pc() for _ in range(p - 1)]
        incy = self.new_pc()
        restores: List[int] = []
        for k in range(p):
            exit_tgt = fail_pc if k == 0 else pass_pc
            decy = self.new_pc()
            incxs = [self.new_pc() for _ in range(p)]
            extras = [self.new_pc() for _ in range(k)]
            ny_dst = extras[0] if k > 0 else exit_tgt
            self.emit(decy, 0, -1, incxs[0])
            self.emit_ny(decy, ny_dst)
            for i in range(p):
                nxt = incxs[i + 1] if i + 1 < p else decy
                self.emit(incxs[i], 1, 0, nxt)
            for i in range(k):
                nxt = extras[i + 1] if i + 1 < k else exit_tgt
                self.emit(extras[i], 1, 0, nxt)
            restores.append(decy)
        for i in range(p):
            nxt = decs[i + 1] if i + 1 < p else incy
            self.emit(decs[i], -1, 0, nxt)
            self.emit_nx(decs[i], restores[i])
        self.emit(incy, 0, 1, decs[0])
        return entry

    def drain_p(self, p: int, exit_pc: int, trap_pc: int) -> int:
        """x := x stripped of all p-factors.  Loop: test_ndiv_p → div_p."""
        entry = self.new_pc()
        div_dst = self.new_pc()
        test_entry = self.test_ndiv(p, pass_pc=exit_pc, fail_pc=div_dst)
        self.emit_noop(entry, test_entry)
        div_entry = self.div_p(p, entry, trap_pc)
        self.emit_noop(div_dst, div_entry)
        return entry

    # -- Action compilation ---------------------------------------------------

    def _action_ops(self, rule: Rule) -> List[Tuple[str, int]]:
        """Turn a rule's RHS into a flat list of (op, p) primitives."""
        ops: List[Tuple[str, int]] = []
        for j, expr in enumerate(rule.rhs_exprs):
            p = self.primes[j]
            lhs = rule.lhs_pats[j]
            if isinstance(expr, ExprVar):
                continue
            if isinstance(expr, ExprVarOp):
                d = expr.delta
                if d > 0:
                    ops += [('mul', p)] * d
                elif d < 0:
                    ops += [('div', p)] * (-d)
            elif isinstance(expr, ExprLit):
                k = expr.value
                if isinstance(lhs, PatLit) and lhs.value == 0:
                    ops += [('mul', p)] * k
                else:
                    ops.append(('drain', p))
                    ops += [('mul', p)] * k
        return ops

    def compile_action(
        self, rule: Rule,
        dispatchers: Dict[int, int],
        halt_drain_pc: int,
        trap_pc: int,
    ) -> int:
        """Emit action primitives, then jump to the RHS pc target.
        Returns the entry pc of the action block."""
        ops = self._action_ops(rule)
        if rule.rhs_pc == 1 or rule.halt:
            final_dst = halt_drain_pc
        else:
            final_dst = dispatchers.get(rule.rhs_pc, trap_pc)

        if not ops:
            return final_dst

        # Allocate one exit-pc per op so we can thread control forward.
        exits = [self.new_pc() for _ in ops]
        op_entries: List[int] = []
        for i, (op, p) in enumerate(ops):
            exit_pc = exits[i]
            if op == 'mul':
                op_entries.append(self.mul_p(p, exit_pc))
            elif op == 'div':
                op_entries.append(self.div_p(p, exit_pc, trap_pc))
            elif op == 'drain':
                op_entries.append(self.drain_p(p, exit_pc, trap_pc))
            else:
                raise RuntimeError(f"unknown op {op}")
        for i in range(len(ops)):
            dst = op_entries[i + 1] if i + 1 < len(ops) else final_dst
            self.emit_noop(exits[i], dst)
        return op_entries[0]

    # -- Rule-group dispatcher ------------------------------------------------

    def compile_rule_group(
        self,
        rules_in_group: List[Rule],
        dispatchers: Dict[int, int],
        halt_drain_pc: int,
        trap_pc: int,
    ) -> int:
        entries = [self.new_pc() for _ in rules_in_group] + [trap_pc]
        for i, rule in enumerate(rules_in_group):
            entry = entries[i]
            fail_dst = entries[i + 1]
            tests = [
                (j, self.primes[j])
                for j, p in enumerate(rule.lhs_pats)
                if isinstance(p, PatLit) and p.value == 0
            ]
            action_entry = self.compile_action(
                rule, dispatchers, halt_drain_pc, trap_pc
            )
            if not tests:
                self.emit_noop(entry, action_entry)
                continue
            cur = entry
            for j, (_reg, p) in enumerate(tests):
                if j + 1 < len(tests):
                    next_pass = self.new_pc()
                    t = self.test_ndiv(p, pass_pc=next_pass, fail_pc=fail_dst)
                    self.emit_noop(cur, t)
                    cur = next_pass
                else:
                    t = self.test_ndiv(p, pass_pc=action_entry, fail_pc=fail_dst)
                    self.emit_noop(cur, t)
        return entries[0]

    # -- Top-level build ------------------------------------------------------

    def _initial_godel(self) -> int:
        """Gödel number of hs2maze's canonical initial Minsky state
        (r_0=0, r_1=1, r_i=0 for i≥2)."""
        if self.program.n_regs < 2:
            return 1  # no y register → only r_0=0 → Gödel = 1
        return self.primes[1]

    def build(self) -> None:
        # Reserve named pcs up front so we can cross-reference.
        main_trap = self.new_pc()
        self.emit_noop(main_trap, main_trap)

        # HALT teardown.  Under the ny convention the pc=0 "DEC y" cannot
        # physically lower block-y to 0; block-y stays at 1 throughout the
        # run.  The invariant is block-y = (Minsky y) + 1, so at a correct
        # HALT (Minsky y = 0) the walker is already at block-y = 1, which
        # is the hs2maze goal y.  We just need to drain x to 0 and jump
        # straight to pc=1; no INC y is needed (an INC would overshoot to
        # block-y = 2 and miss the goal).
        halt_drain_pc = self.new_pc()
        self.emit(halt_drain_pc, -1, 0, halt_drain_pc)
        self.emit_nx(halt_drain_pc, 1)

        # Dispatcher pc per input pc.
        input_pcs = sorted({r.lhs_pc for r in self.program.rules})
        dispatchers: Dict[int, int] = {k: self.new_pc() for k in input_pcs}

        # pc=0: DEC y (maze y=1 → 0), then setup chain → INC x to initial Gödel.
        # The y-1 chain unavoidably crosses the ny block; ny must redirect to
        # the same destination as the non-zero branch so the y=1→0 step lands
        # at setup_first instead of in a trap.
        setup_first = self.new_pc()
        self.emit(0, 0, -1, setup_first)
        self.emit_ny(0, setup_first)

        initial = self._initial_godel()
        target = dispatchers.get(0, main_trap)
        cur = setup_first
        for i in range(initial):
            nxt = self.new_pc() if i + 1 < initial else target
            self.emit(cur, 1, 0, nxt)
            cur = nxt
        if initial == 0:
            # never happens for n ≥ 2, but be safe.
            self.emit_noop(setup_first, target)

        # Build each dispatcher.
        rules_by_pc: Dict[int, List[Rule]] = defaultdict(list)
        for r in self.program.rules:
            rules_by_pc[r.lhs_pc].append(r)
        for k in input_pcs:
            group_entry = self.compile_rule_group(
                rules_by_pc[k], dispatchers, halt_drain_pc, main_trap,
            )
            self.emit_noop(dispatchers[k], group_entry)

    # -- Output formatting ----------------------------------------------------

    def _count_equations(self) -> Tuple[int, int, int]:
        n_main = n_nx = n_ny = 0
        for kinds in self.eqns.values():
            if 'main' in kinds: n_main += 1
            if 'nx'   in kinds: n_nx   += 1
            if 'ny'   in kinds: n_ny   += 1
        return n_main, n_nx, n_ny

    def format(self) -> str:
        n_main, n_nx, n_ny = self._count_equations()
        header = [
            f"-- Compiled from {self.program.fn_name} "
            f"(n_regs={self.program.n_regs}) by nd-to-2d.py",
            f"-- Gödel primes: {self.primes}",
            f"-- Initial Gödel number (r_0=0, r_1=1, rest=0): "
            f"{self._initial_godel()}",
            f"-- pc values used: 2..{self.pc_next - 1} "
            f"(pc 0 start, pc 1 HALT reserved)",
            f"-- Equations: main={n_main}, nx={n_nx}, ny={n_ny}",
            "",
            "godel :: (Int, Int, Int) -> (Int, Int, Int)",
            "",
        ]
        body: List[str] = []
        # Haskell first-match: emit zero-branch equations before main.
        for pc in sorted(self.eqns):
            kinds = self.eqns[pc]
            if 'nx' in kinds: body.append(kinds['nx'])
            if 'ny' in kinds: body.append(kinds['ny'])
            if 'main' in kinds: body.append(kinds['main'])
        return "\n".join(header + body) + "\n"


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    args = sys.argv[1:]
    if any(a in ("-h", "--help") for a in args):
        print(HELP_TEXT, end="")
        return
    if any(a in ("-V", "--version") for a in args):
        print(f"nd-to-2d.py v{VERSION}")
        return

    mode = "compile"
    if "--parse" in args or "--ast" in args:
        mode = "parse"
    verbose = "--ast" in args
    flag_set = {"--parse", "--ast"}
    positional = [a for a in args if a not in flag_set]

    if len(positional) > 1:
        print(HELP_TEXT, end="", file=sys.stderr)
        sys.exit(1)

    if not positional or positional[0] == "-":
        text = sys.stdin.read()
    else:
        with open(positional[0], "r") as f:
            text = f.read()

    try:
        prog = parse_program(text)
    except SyntaxError as e:
        print(f"parse error: {e}", file=sys.stderr)
        sys.exit(2)

    if mode == "parse":
        print(dump_program(prog, verbose=verbose))
        return

    c = Compiler(prog)
    c.build()
    print(c.format(), end="")
    n_main, n_nx, n_ny = c._count_equations()
    print(
        f"[nd-to-2d] pc used: {c.pc_next - 2}, "
        f"equations: main={n_main}, nx={n_nx}, ny={n_ny}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
