-- md5.hs: Minsky Doubling Machine maze simulator (k=5, nterm=61)
-- BFS solver finds the shortest path through the repeated maze.
-- Expected path length: 662
--
-- Encodes a 2-counter Minsky register machine computing 2^6 - 1 = 63
-- via 5 iterations of y ↦ 2y + 1, then drains y to 1.
--
-- Usage: runghc md5.hs

module Main where

import qualified Data.Map.Strict as Map
import qualified Data.Set as Set

-- Canonical state: (x, y, dir, idx)
-- dir: 0=E, 1=W, 2=N, 3=S (canonical: E=0, N=2 only)
type State = (Int, Int, Int, Int)

-- Normal block ports
normalPorts :: [(Int, Int, Int, Int)]
normalPorts =
  [ (1,0, 2,2)    -- W0->N2
  , (2,2, 0,3)    -- N2->E3
  , (1,3, 0,4)    -- W3->E4
  , (1,4, 2,5)    -- W4->N5
  , (2,5, 3,2)    -- N5->S2
  , (3,7, 0,8)    -- S7->E8
  , (0,8, 1,9)    -- E8->W9
  , (0,9, 2,10)   -- E9->N10
  , (3,10, 0,8)   -- S10->E8
  , (1,11, 2,15)  -- W11->N15
  , (2,15, 0,16)  -- N15->E16
  , (1,16, 0,17)  -- W16->E17
  , (1,17, 2,18)  -- W17->N18
  , (2,18, 3,15)  -- N18->S15
  , (3,20, 0,21)  -- S20->E21
  , (0,21, 1,22)  -- E21->W22
  , (0,22, 2,23)  -- E22->N23
  , (3,23, 0,21)  -- S23->E21
  , (1,24, 2,27)  -- W24->N27
  , (2,27, 0,28)  -- N27->E28
  , (1,28, 0,29)  -- W28->E29
  , (1,29, 2,30)  -- W29->N30
  , (2,30, 3,27)  -- N30->S27
  , (3,32, 0,33)  -- S32->E33
  , (0,33, 1,34)  -- E33->W34
  , (0,34, 2,35)  -- E34->N35
  , (3,35, 0,33)  -- S35->E33
  , (1,36, 2,39)  -- W36->N39
  , (2,39, 0,40)  -- N39->E40
  , (1,40, 0,41)  -- W40->E41
  , (1,41, 2,42)  -- W41->N42
  , (2,42, 3,39)  -- N42->S39
  , (3,44, 0,45)  -- S44->E45
  , (0,45, 1,46)  -- E45->W46
  , (0,46, 2,47)  -- E46->N47
  , (3,47, 0,45)  -- S47->E45
  , (1,48, 2,51)  -- W48->N51
  , (2,51, 0,52)  -- N51->E52
  , (1,52, 0,53)  -- W52->E53
  , (1,53, 2,54)  -- W53->N54
  , (2,54, 3,51)  -- N54->S51
  , (3,56, 0,57)  -- S56->E57
  , (0,57, 1,58)  -- E57->W58
  , (0,58, 2,59)  -- E58->N59
  , (3,59, 0,57)  -- S59->E57
  , (1,60, 2,12)  -- W60->N12
  , (2,12, 3,12)  -- N12->S12
  , (3,13, 0,14)  -- S13->E14
  , (0,14, 1,1)   -- E14->W1
  ]

-- nx block ports: E[i] -> E[j]
nxPorts :: [(Int, Int)]
nxPorts =
  [ (9, 11), (22, 24), (34, 36), (46, 48), (58, 60) ]

-- ny block ports: N[i] -> N[j]
nyPorts :: [(Int, Int)]
nyPorts =
  [ (2, 7), (15, 20), (27, 32), (39, 44), (51, 56), (12, 13) ]

-- Port lookup maps
portMap :: Map.Map (Int,Int) [(Int,Int)]
portMap = foldl (\m (sd,si,dd,di) ->
  Map.insertWith (++) (sd,si) [(dd,di)] m) Map.empty normalPorts

nxMap :: Map.Map Int [Int]
nxMap = foldl (\m (s,d) -> Map.insertWith (++) s [d] m) Map.empty nxPorts

nyMap :: Map.Map Int [Int]
nyMap = foldl (\m (s,d) -> Map.insertWith (++) s [d] m) Map.empty nyPorts

lkp :: Int -> Int -> [(Int,Int)]
lkp d i = Map.findWithDefault [] (d,i) portMap

-- Canonicalize: W[i]@(bx,by) -> E[i]@(bx-1,by), S[i]@(bx,by) -> N[i]@(bx,by-1)
canon :: Int -> Int -> Int -> Int -> State
canon bx by 1 i = (bx-1, by, 0, i)
canon bx by 3 i = (bx, by-1, 2, i)
canon bx by d i = (bx, by, d, i)

-- Neighbors of a canonical state
neighbors :: State -> [State]
neighbors (x, y, 0, i) = asE ++ asW where
  -- E[i] in block (x,y)
  asE | x > 0 && y > 0 = [canon x y d j | (d,j) <- lkp 0 i]          -- normal
      | x == 0 && y > 0 = [(0, y, 0, j) | j <- Map.findWithDefault [] i nxMap]  -- nx
      | otherwise = []
  -- W[i] in block (x+1,y)
  asW | y > 0 = [canon (x+1) y d j | (d,j) <- lkp 1 i]
      | otherwise = []
neighbors (x, y, 2, i) = asN ++ asS where
  -- N[i] in block (x,y)
  asN | x > 0 && y > 0 = [canon x y d j | (d,j) <- lkp 2 i]          -- normal
      | x > 0 && y == 0 = [(x, 0, 2, j) | j <- Map.findWithDefault [] i nyMap]  -- ny
      | otherwise = []
  -- S[i] in block (x,y+1)
  asS | x > 0 = [canon x (y+1) d j | (d,j) <- lkp 3 i]
      | otherwise = []
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
