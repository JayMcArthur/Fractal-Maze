/*
 * quizmaster.h -- Search for the maze with the longest minimal path.
 *
 * The quizmaster performs an exhaustive search over all mazes with at most
 * max_aport active ports, enumerating all C(total_nports, k) combinations
 * for k = 0, 1, ..., max_aport.
 */
#ifndef QUIZMASTER_H
#define QUIZMASTER_H

#include "maze.h"
#include "solver.h"

/*
 * QMResult -- result of a quizmaster search.
 *
 * Fields:
 *   best_maze     -- the maze with the longest minimal path found (caller frees)
 *   best_length   -- the shortest path length in that maze
 *   best_path     -- the actual shortest path (caller frees)
 *   best_path_len -- number of states in best_path (= best_length + 1)
 */
typedef struct {
    Maze  *best_maze;
    int    best_length;
    State *best_path;
    int    best_path_len;
} QMResult;

/*
 * quizmaster_search -- exhaustive search for the maze with the longest
 * minimal path.
 *
 * Parameters:
 *   nterm      -- number of terminal indices per direction (must be >= 2)
 *   min_aport  -- minimum number of active ports per maze
 *   max_aport  -- maximum number of active ports per maze
 *   max_len    -- stop early when best path length >= max_len (0 = no limit)
 *
 * Returns a QMResult with the best maze found. Use qmresult_free() to release.
 */
QMResult quizmaster_search(int nterm, int min_aport, int max_aport,
                           int max_len, int use_bfs);

/*
 * quizmaster_random_search -- random sampling search for the maze with the
 * longest minimal path.
 *
 * Runs in an infinite loop until SIGINT (Ctrl+C) or max_len is reached.
 * Each iteration randomly picks k in [min_aport, max_aport] and randomly
 * selects k ports from the candidate set.
 *
 * Parameters:
 *   nterm      -- number of terminal indices per direction (must be >= 2)
 *   min_aport  -- minimum number of active ports per maze
 *   max_aport  -- maximum number of active ports per maze
 *   max_len    -- stop early when best path length >= max_len (0 = no limit)
 *   seed       -- random seed for srand()
 *   use_bfs    -- if nonzero, use BFS instead of IDDFS for solving
 *
 * Returns a QMResult with the best maze found. Use qmresult_free() to release.
 */
QMResult quizmaster_random_search(int nterm, int min_aport, int max_aport,
                                  int max_len, unsigned int seed, int use_bfs);

/*
 * quizmaster_topdown_search -- top-down search starting from fully-connected maze.
 *
 * Starts with all non-self-loop ports active and iteratively removes one port
 * at a time, prioritizing mazes with longer shortest paths. Since removing ports
 * can only increase or maintain the shortest path length, the search naturally
 * converges toward the optimal maze without passing through unreachable states.
 *
 * Uses priority stacks (indexed by path length) for best-first expansion,
 * normalization for deduplication, and abstract reachability for pruning.
 *
 * Parameters:
 *   nterm   -- number of terminal indices per direction (must be >= 2)
 *   max_len -- stop early when best path length >= max_len (0 = no limit)
 *   use_bfs -- if nonzero, use BFS instead of IDDFS for solving
 *
 * Returns a QMResult with the best maze found. Use qmresult_free() to release.
 */
QMResult quizmaster_topdown_search(int nterm, int max_len, int use_bfs);

/* qmresult_free -- free the maze and path stored in a QMResult. */
void qmresult_free(QMResult *r);

#endif
