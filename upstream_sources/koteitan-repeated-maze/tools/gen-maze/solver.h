/*
 * solver.h -- IDDFS solver for finding the shortest path in a repeated maze.
 *
 * The solver uses a canonical state representation where each state is
 * a 4-tuple (x, y, dir, idx):
 *   - (x, y) is a grid position (x >= 0, y >= 0)
 *   - dir is the canonical direction: E (=0) or N (=1)
 *   - idx is the terminal index (0..nterm-1)
 *
 * Canonicalization collapses W/S terminals into E/N using the identity:
 *   W[n] @ (bx, by) = E[n] @ (bx-1, by) -> canonical (bx-1, by, E, n)
 *   S[n] @ (bx, by) = N[n] @ (bx, by-1) -> canonical (bx, by-1, N, n)
 *
 * This halves the state space and simplifies the transition function.
 *
 * Initial state: W[0] @ (1,1) = canonical (0, 1, E, 0)
 * Goal state:    W[1] @ (1,1) = canonical (0, 1, E, 1)
 */
#ifndef SOLVER_H
#define SOLVER_H

#include "maze.h"

/* Canonical direction constants (only E and N survive canonicalization). */
#define CDIR_E 0
#define CDIR_N 1

/*
 * State -- a canonical state in the infinite grid.
 *
 * Fields:
 *   x, y -- grid coordinates (>= 0). The state represents a physical point
 *           at the boundary between adjacent blocks.
 *   dir  -- canonical direction: CDIR_E (east boundary) or CDIR_N (north boundary)
 *   idx  -- terminal index (0..nterm-1)
 *
 * A state (x, y, E, i) is the physical point shared by:
 *   - E[i] terminal of block (x, y) [if valid block]
 *   - W[i] terminal of block (x+1, y) [if valid block]
 *
 * A state (x, y, N, i) is the physical point shared by:
 *   - N[i] terminal of block (x, y) [if valid block]
 *   - S[i] terminal of block (x, y+1) [if valid block]
 */
typedef struct {
    int x, y;
    int dir;
    int idx;
} State;

/*
 * solve -- find the shortest path from start to goal using IDDFS.
 *
 * Parameters:
 *   m           -- the maze to solve
 *   path_out    -- if non-NULL, receives a malloc'd array of states along the path
 *   path_len_out-- if non-NULL, receives the number of states in the path
 *
 * Returns:
 *   The path length (number of port traversals = number of edges),
 *   or -1 if no path exists.
 *   If a path is found, path_len_out = return_value + 1.
 *   Caller must free *path_out.
 */
int solve(const Maze *m, State **path_out, int *path_len_out);

/*
 * solve_from -- find the shortest path, starting IDDFS from a given minimum depth.
 *
 * Same as solve(), but skips IDDFS iterations for depth_limit < min_depth.
 * Use this when a lower bound on the shortest path length is known
 * (e.g., in top-down search where removing a port can only increase path length).
 *
 * Parameters:
 *   m            -- the maze to solve
 *   min_depth    -- minimum depth_limit for IDDFS (skips depths 0..min_depth-1)
 *   path_out     -- if non-NULL, receives a malloc'd array of states along the path
 *   path_len_out -- if non-NULL, receives the number of states in the path
 *
 * Returns:
 *   The path length (>= min_depth) or -1 if no path exists.
 */
int solve_from(const Maze *m, int min_depth, State **path_out, int *path_len_out);

/*
 * solve_bfs -- find the shortest path using BFS.
 *
 * Each state is visited at most once. More efficient than IDDFS for longer
 * paths since it avoids re-exploring shallower depths.
 */
int solve_bfs(const Maze *m, State **path_out, int *path_len_out);

/*
 * solve_bfs_len -- lightweight BFS returning only the path length.
 *
 * Skips parent tracking and path reconstruction. Use when only the
 * shortest path length is needed, not the actual path.
 */
int solve_bfs_len(const Maze *m);

/* state_print -- print a single state as "(x,y,E0)" or "(x,y,N1)" to stdout. */
void state_print(State s);

/* path_print -- print a path as "(x,y,E0) -> (x,y,N1) -> ..." to stdout. */
void path_print(const State *path, int path_len);

/* path_fprint -- print a path to the given FILE stream. */
void path_fprint(FILE *fp, const State *path, int path_len);

/*
 * path_print_grid -- print a 2D grid showing which (x,y) positions
 * the path visits and at which step numbers.
 * Rows are printed from high y to low y (top to bottom).
 */
void path_print_grid(const State *path, int path_len);

/*
 * path_print_verbose -- print each path transition with annotations showing
 * the block position, block type, and port used for each step.
 * Format: "#0 (0,1,E0) --[W0->N0 @ normal(1,1)]--> (1,1,N0)"
 */
void path_print_verbose(const Maze *m, const State *path, int path_len);

#endif
