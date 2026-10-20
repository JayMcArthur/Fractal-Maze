[← Back](../README.md) | [English](README.md) | [Japanese](README-ja.md)

# solver — Python BFS solver for the atomic-port (*1) format

`solver.py` reads an atomic-port (*1) maze string emitted by
`hs2maze.py` and finds the shortest path with BFS. It handles the four
block types (`normal` / `nx` / `ny` / `zero`) and the five subterminal
kinds including `C` (centre).

The C `repeated-maze` binary only supports the legacy maze format and
cannot solve (*1) mazes. Use this Python solver for the new format.

## Usage

```bash
python3 solver.py [FILE]              # read maze string from FILE / stdin
python3 solver.py --max-states N      # BFS state cap (default 2_000_000)
python3 solver.py -V | --version      # version
python3 solver.py -h | --help         # help
```

## Maze convention

- Start: `(0, 0, W, 0)`
- Goal:  `(0, 0, W, 1)`
- Block `(0, 0)` is the corner — it consults the `zero` port set so
  `zb='x'` (x=0) and `zb='y'` (y=0) rules can both fire at that cell.
- Bridge ports `W0-C0` / `W1-C1` pull `W0` / `W1` into the connected
  component of `C0` / `C1`.

## Port-set lookup by block

| Block      | Port set |
|------------|----------|
| `(0, 0)`   | `zero`   |
| `(0, y>0)` | `nx`     |
| `(x>0, 0)` | `ny`     |
| `(x>0, y>0)` | `normal` |

Undirected (`-`) ports expand into both directions; directed (`->`)
ports stay one-way.

## Example

```bash
$ python3 tools/solver/solver.py maze/counter-pump/cp2-4.maze
HALT 48 (0, 0, W, 1)

$ python3 tools/hs2maze/hs2maze.py maze/counter-pump/cp2-4.hs --undirected | \
    python3 tools/solver/solver.py
```

## Limitations

Large mazes such as `cp3-4` (~80M reachable states) cannot complete
under the current Python BFS due to memory. Future work: pypy or C
reimplementation.
