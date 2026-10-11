-- cp6.hs: Counter Pump maze simulator (nterm=6, w=5)
-- BFS solver finds the shortest path through the repeated maze.
-- Expected path length: 257
--
-- Maze string:
--   normal: W0->N0, N0->N4, N0->S0, S4->N3, S3->N2, S2->N1, S1->E5,
--           E5->W4, W4->E0, N1->W0, E0->W5, E4->W3, E3->W2, E2->S1,
--           W2->W1
--   nx: (none); ny: (none)
--
-- Usage: runghc cp6.hs

module Main where

import qualified Data.Map.Strict as Map
import qualified Data.Set as Set

-- Canonical state: (x, y, dir, idx)
-- dir: 0=E, 1=W, 2=N, 3=S (canonical states only use E=0 or N=2)
type State = (Int, Int, Int, Int)

-- Normal block ports: (src_dir, src_idx, dst_dir, dst_idx)
normalPorts :: [(Int, Int, Int, Int)]
normalPorts =
  [ (1,0, 2,0)   -- W0->N0
  , (2,0, 2,4)   -- N0->N4
  , (2,0, 3,0)   -- N0->S0
  , (3,4, 2,3)   -- S4->N3
  , (3,3, 2,2)   -- S3->N2
  , (3,2, 2,1)   -- S2->N1
  , (3,1, 0,5)   -- S1->E5
  , (0,5, 1,4)   -- E5->W4
  , (1,4, 0,0)   -- W4->E0
  , (2,1, 1,0)   -- N1->W0
  , (0,0, 1,5)   -- E0->W5
  , (0,4, 1,3)   -- E4->W3
  , (0,3, 1,2)   -- E3->W2
  , (0,2, 3,1)   -- E2->S1
  , (1,2, 1,1)   -- W2->W1
  ]

-- Port lookup: (dir, idx) -> [(dir, idx)]
portMap :: Map.Map (Int,Int) [(Int,Int)]
portMap = foldl (\m (sd,si,dd,di) ->
  Map.insertWith (++) (sd,si) [(dd,di)] m) Map.empty normalPorts

lkp :: Int -> Int -> [(Int,Int)]
lkp d i = Map.findWithDefault [] (d,i) portMap

-- Canonicalize a raw state (bx, by, dir, idx)
-- W[i]@(bx,by) = E[i]@(bx-1,by), S[i]@(bx,by) = N[i]@(bx,by-1)
canon :: Int -> Int -> Int -> Int -> State
canon bx by 1 i = (bx-1, by, 0, i)
canon bx by 3 i = (bx, by-1, 2, i)
canon bx by d i = (bx, by, d, i)

-- Neighbors of a canonical state
-- No nx/ny ports, so boundary blocks are dead ends
neighbors :: State -> [State]
neighbors (x, y, 0, i) = asE ++ asW where
  -- E[i] in block (x,y): normal if x>0, y>0
  asE = [canon x y d j | x > 0, y > 0, (d,j) <- lkp 0 i]
  -- W[i] in block (x+1,y): normal if y>0 (x+1 always > 0)
  asW = [canon (x+1) y d j | y > 0, (d,j) <- lkp 1 i]
neighbors (x, y, 2, i) = asN ++ asS where
  -- N[i] in block (x,y): normal if x>0, y>0
  asN = [canon x y d j | x > 0, y > 0, (d,j) <- lkp 2 i]
  -- S[i] in block (x,y+1): normal if x>0 (y+1 always > 0)
  asS = [canon x (y+1) d j | x > 0, (d,j) <- lkp 3 i]
neighbors _ = []

-- BFS: find shortest path from start to goal
bfs :: State -> State -> [State]
bfs start goal
  | start == goal = [start]
  | otherwise = case search (Set.singleton start) [start] Map.empty of
      Just parents -> reverse (trace goal parents)
      Nothing      -> error "No path found"
  where
    search _ [] _ = Nothing
    search vis frontier par =
      let pairs = [(next, s) | s <- frontier, next <- neighbors s,
                                Set.notMember next vis]
          par'  = foldl (\m (c,p) -> Map.insertWith (\_ o -> o) c p m) par pairs
          new   = map fst pairs
          vis'  = foldl (flip Set.insert) vis new
      in if Map.member goal par' then Just par'
         else search vis' (Set.toList (Set.difference (Set.fromList new) vis)) par'
    trace s parents
      | s == start = [s]
      | otherwise  = s : trace (parents Map.! s) parents

-- Format state as "(x,y,D0)"
showDir :: Int -> String
showDir 0 = "E"; showDir 2 = "N"; showDir _ = "?"

showState :: State -> String
showState (x, y, d, i) =
  "(" ++ show x ++ "," ++ show y ++ "," ++ showDir d ++ show i ++ ")"

main :: IO ()
main = do
  let start = (0, 1, 0, 0)  -- W0@(1,1) = E0@(0,1)
      goal  = (0, 1, 0, 1)  -- W1@(1,1) = E1@(0,1)
      path  = bfs start goal
  putStrLn $ "Path length: " ++ show (length path - 1)
  putStrLn $ "Path:"
  putStrLn $ concatMap (\(i,s) ->
    (if i > 0 then " -> " else "") ++ showState s) (zip [0::Int ..] path)
