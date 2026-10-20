[Japanese](README-ja.md) | **English**

# Minsky Doubling Machine

Encodes a 2-counter Minsky register machine on the repeated maze. Each doubling cycle computes `y ↦ 2y + 1` using the x-register as temporary storage. After k cycles the path length grows as O(2^k), which is exponential in nterm since nterm = 12k + 3.

The maze uses x-motion (W→E / E→W ports) for register x, y-motion (S→N / N→S ports) for register y, and boundary blocks (nx at x=0, ny at y=0) for zero-testing branches.

## Examples

- [k=5](5.md) — 5 doubling cycles, nterm=61, path length 662
- [md5.hs](md5.hs) — Haskell BFS maze solver for the k=5 doubling machine
- [md3.txt](md3.txt), [md4.txt](md4.txt), [md5.txt](md5.txt) — Maze strings and paths for k=3,4,5
