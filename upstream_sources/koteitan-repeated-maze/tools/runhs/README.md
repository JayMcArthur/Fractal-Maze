[← Back](../README.md) | [English](README.md) | [Japanese](README-ja.md)

# runhs — Haskell state machine runner

`runhs.py` executes a Haskell source file written in the
`hs2maze` / `nd-to-2d` input format.  Those files define a single
tail-recursive step function (e.g. `cp3 (x, y, z, pc) = cp3 (...)`) and
do not include a `main :: IO ()`, so they cannot be handed to `runghc`
directly.  `runhs.py` rewrites each equation into a one-step form,
adds a pc=1 terminator, wraps it with a `main` driver, and invokes
`runghc` on the resulting temp file.

## Usage

```bash
python3 runhs.py FILE.hs             # print HALT step count and state
python3 runhs.py FILE.hs --trace     # also print every intermediate state
python3 runhs.py FILE.hs --limit N   # abort if the step count exceeds N
                                     # (default: 5_000_000)
python3 runhs.py FILE.hs --save      # keep the wrapped Haskell beside the
                                     # input as <stem>_runable.hs
python3 runhs.py FILE.hs --start "(a, b, ..., pc)"
                                     # explicit initial state (e.g. legacy (0,1,0))
python3 runhs.py -V | --version
```

## Supported input

The input file must contain equations of the form

```haskell
FN (pat_0, ..., pat_{n-1}, pat_pc) = FN (rhs_0, ..., rhs_{n-1}, rhs_pc)
```

and optionally a type signature like

```haskell
FN :: (Int, ..., Int) -> (Int, ..., Int)
```

The tuple arity (*n* + 1 slots, the last being the program counter) is
inferred from the signature or from the first equation.  Any arity
≥ 2 is accepted, so both the *n*-register source (fed to `nd-to-2d`)
and the 2-register Gödel output (fed to `hs2maze`) can be executed.

## Initial state and HALT

The default initial state is all-zero `(0, 0, ..., 0)`, matching the
new atomic-port `(0,0,W0)` maze start convention. Pass
`--start "(...)"` to override — e.g. legacy programs that expect
`(0, 1, 0)` can run unchanged.

The driver stops when the program counter (last slot) equals 1 and
prints `HALT <step> <state>`. If the driver exceeds `--limit` steps it
instead prints `TIMEOUT <step> <state>`.

## Example

```bash
$ python3 tools/runhs/runhs.py maze/counter-pump/cp2-4.hs
HALT 48 (0,0,1)

$ python3 tools/runhs/runhs.py maze/counter-pump/cp2-4.hs --trace | head -4
0 (0,0,0)
1 (0,0,2)
2 (1,0,3)
3 (2,0,4)

# Legacy program that still expects (0,1,0) as the initial state:
$ python3 tools/runhs/runhs.py legacy.hs --start "(0,1,0)"
```
