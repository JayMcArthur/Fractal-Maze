-- cp_n3.hs: 3-register n^3 counter pump (Minsky form).
--
-- Registers: x (outer), y (middle), z (inner).  PC is the 4th slot.
-- Starts at (0, 1, 0, 0), ends at (0, 1, 0, 1).
--
-- Structure:
--   Phase 0: y := 0  (undo hs2maze's initial y=1)
--   Phase 1: x := n  (here n=3, via n INC x)
--   Outer loop (pc=10): if x=0 goto halt_prep; else y := n, goto middle.
--   Middle loop (pc=20): if y=0 goto outer after DEC x; else z := n, goto inner.
--   Inner loop (pc=30): DEC z until 0, then DEC y and goto middle.
--   halt_prep (pc=99): y := 1, goto pc=1 (HALT).
--
-- Total DEC z operations: n^3.  For n=3 that's 27 inner hits, plus
-- O(n^2) middle setups and O(n) outer setups.

cp3 :: (Int, Int, Int, Int) -> (Int, Int, Int, Int)

-- Phase 0: y := 0
cp3 (x, y, z,   0) = cp3 (x, y-1, z,    2)

-- Phase 1: x := 3
cp3 (x, y, z,   2) = cp3 (x+1, y, z,    3)
cp3 (x, y, z,   3) = cp3 (x+1, y, z,    4)
cp3 (x, y, z,   4) = cp3 (x+1, y, z,   10)

-- Outer loop entry (pc=10)
cp3 (0, y, z,  10) = cp3 (0, y, z,     99)
cp3 (x, y, z,  10) = cp3 (x, y+1, z,   11)
cp3 (x, y, z,  11) = cp3 (x, y+1, z,   12)
cp3 (x, y, z,  12) = cp3 (x, y+1, z,   20)

-- Middle loop entry (pc=20)
cp3 (x, 0, z,  20) = cp3 (x-1, 0, z,   10)
cp3 (x, y, z,  20) = cp3 (x, y, z+1,   21)
cp3 (x, y, z,  21) = cp3 (x, y, z+1,   22)
cp3 (x, y, z,  22) = cp3 (x, y, z+1,   30)

-- Inner loop (pc=30)
cp3 (x, y, 0,  30) = cp3 (x, y-1, 0,   20)
cp3 (x, y, z,  30) = cp3 (x, y, z-1,   30)

-- HALT prep (pc=99): y := 1, goto pc=1 (HALT)
cp3 (x, y, z,  99) = cp3 (x, y+1, z,    1)
