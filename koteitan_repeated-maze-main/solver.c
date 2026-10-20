/*
 * solver.c -- IDDFS solver implementation.
 *
 * Uses iterative deepening depth-first search on the infinite grid of
 * repeated blocks. A transposition table tracks the minimum depth at which
 * each state has been visited, enabling effective pruning across iterations.
 *
 * The transition function enumerates neighbors of a canonical state by:
 *   1. Finding up to 2 blocks that share the state's physical point.
 *   2. For each block, enumerating all ports from the relevant terminal.
 *   3. Converting each destination terminal to its canonical state.
 */
#include "solver.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

/* Maximum IDDFS depth limit. */
#define MAX_DEPTH 1000

/* --- State helpers --- */

/* state_eq -- return 1 if two states are identical, 0 otherwise. */
static int state_eq(State a, State b) {
    return a.x == b.x && a.y == b.y && a.dir == b.dir && a.idx == b.idx;
}

/*
 * state_hash -- FNV-1a hash of a state.
 * Used for the open-addressing transposition table.
 */
static uint64_t state_hash(State s) {
    uint64_t h = 14695981039346656037ULL;
    h ^= (uint64_t)(uint32_t)s.x;  h *= 1099511628211ULL;
    h ^= (uint64_t)(uint32_t)s.y;  h *= 1099511628211ULL;
    h ^= (uint64_t)(uint32_t)s.dir; h *= 1099511628211ULL;
    h ^= (uint64_t)(uint32_t)s.idx; h *= 1099511628211ULL;
    return h;
}

/* --- Transposition Table --- */

/*
 * TTEntry -- an entry in the transposition table.
 * Stores a state and the minimum depth at which it was visited.
 * occupied == 0 means the slot is empty.
 */
typedef struct {
    State state;
    int min_depth;
    int occupied;
} TTEntry;

/*
 * TT -- open-addressing hash table for transposition.
 * size is always a power of 2 for fast modulo.
 */
typedef struct {
    TTEntry *entries;
    int size;
    int count;
} TT;

/* tt_init -- allocate an empty transposition table. */
static void tt_init(TT *tt) {
    tt->size = 8192;
    tt->count = 0;
    tt->entries = calloc(tt->size, sizeof(TTEntry));
}

/* tt_free -- release all TT memory. */
static void tt_free(TT *tt) {
    free(tt->entries);
}

/* tt_clear -- reset the table to empty without reallocating. */
static void tt_clear(TT *tt) {
    memset(tt->entries, 0, tt->size * sizeof(TTEntry));
    tt->count = 0;
}

/*
 * tt_rebuild -- double the table size and re-insert all entries.
 * Called when load factor exceeds 50%.
 */
static void tt_rebuild(TT *tt) {
    int new_size = tt->size * 2;
    TTEntry *new_entries = calloc(new_size, sizeof(TTEntry));
    for (int i = 0; i < tt->size; i++) {
        if (!tt->entries[i].occupied) continue;
        uint64_t h = state_hash(tt->entries[i].state) & (uint64_t)(new_size - 1);
        while (new_entries[h].occupied)
            h = (h + 1) & (uint64_t)(new_size - 1);
        new_entries[h] = tt->entries[i];
    }
    free(tt->entries);
    tt->entries = new_entries;
    tt->size = new_size;
}

/*
 * tt_update -- update the transposition table for a state at given depth.
 *
 * Returns 1 if the state should be explored (new entry or shallower depth),
 * 0 if the state should be pruned (already visited at equal or shallower depth).
 */
static int tt_update(TT *tt, State s, int depth) {
    if (tt->count * 2 >= tt->size)
        tt_rebuild(tt);

    uint64_t h = state_hash(s) & (uint64_t)(tt->size - 1);
    while (tt->entries[h].occupied) {
        if (state_eq(tt->entries[h].state, s)) {
            if (depth < tt->entries[h].min_depth) {
                tt->entries[h].min_depth = depth;
                return 1;  /* shallower: re-explore */
            }
            return 0;  /* already visited at this depth or shallower */
        }
        h = (h + 1) & (uint64_t)(tt->size - 1);
    }
    /* New entry */
    tt->entries[h].state = s;
    tt->entries[h].min_depth = depth;
    tt->entries[h].occupied = 1;
    tt->count++;
    return 1;
}

/* --- Canonical conversion --- */

/*
 * to_canonical -- convert a block-local terminal to its canonical state.
 *
 * Given a terminal at block (bx, by) with direction tdir and index tidx:
 *   E[n] @ (bx, by)  ->  canonical (bx,   by,   E, n)
 *   W[n] @ (bx, by)  ->  canonical (bx-1, by,   E, n)  [W = E of left neighbor]
 *   N[n] @ (bx, by)  ->  canonical (bx,   by,   N, n)
 *   S[n] @ (bx, by)  ->  canonical (bx,   by-1, N, n)  [S = N of lower neighbor]
 */
static State to_canonical(int bx, int by, int tdir, int tidx) {
    State s;
    switch (tdir) {
    case TDIR_E: s.x = bx;   s.y = by;   s.dir = CDIR_E; break;
    case TDIR_W: s.x = bx-1; s.y = by;   s.dir = CDIR_E; break;
    case TDIR_N: s.x = bx;   s.y = by;   s.dir = CDIR_N; break;
    case TDIR_S: s.x = bx;   s.y = by-1; s.dir = CDIR_N; break;
    default:     s.x = -1;   s.y = -1;   s.dir = 0;      break;
    }
    s.idx = tidx;
    return s;
}

/* --- Neighbor enumeration --- */

/*
 * get_neighbors -- enumerate all states reachable from state s via one port.
 *
 * For a canonical state (sx, sy, dir, si), up to 2 blocks share this point:
 *
 *   dir == E:
 *     Block (sx, sy)   has terminal E[si]  (if valid: nx or normal block)
 *     Block (sx+1, sy) has terminal W[si]  (if normal block)
 *
 *   dir == N:
 *     Block (sx, sy)   has terminal N[si]  (if valid: ny or normal block)
 *     Block (sx, sy+1) has terminal S[si]  (if normal block)
 *
 * For each block, we enumerate all ports from the relevant terminal and
 * convert each destination terminal to its canonical state.
 * Only states with x >= 0 and y >= 0 are included (IDDFS depth limit
 * naturally bounds the reachable coordinates).
 *
 * Parameters:
 *   m         -- maze configuration
 *   s         -- current state
 *   nbrs      -- output array (must hold at least 8*nterm entries)
 *
 * Returns the number of neighbors written to nbrs[].
 */
static int get_neighbors(const Maze *m, State s, State *nbrs) {
    int n = m->nterm;
    int n4 = 4 * n;
    int cnt = 0;

    if (s.dir == CDIR_E) {
        /* Block (sx, sy) — terminal E[si] */
        {
            int bx = s.x, by = s.y;
            if (by > 0) {
                if (bx > 0) {
                    /* normal block */
                    int src = TDIR_E * n + s.idx;
                    for (int dst = 0; dst < n4; dst++) {
                        if (!m->normal_ports[src * n4 + dst]) continue;
                        State ns = to_canonical(bx, by, dst / n, dst % n);
                        if (ns.x >= 0 && ns.y >= 0)
                            nbrs[cnt++] = ns;
                    }
                } else {
                    /* nx block (bx==0) */
                    for (int dj = 0; dj < n; dj++) {
                        if (dj == s.idx) continue;
                        int adj = dj < s.idx ? dj : dj - 1;
                        if (m->nx_ports[s.idx * (n - 1) + adj])
                            nbrs[cnt++] = (State){0, by, CDIR_E, dj};
                    }
                }
            }
        }

        /* Block (sx+1, sy) — terminal W[si] */
        {
            int bx = s.x + 1, by = s.y;
            if (bx > 0 && by > 0) {
                int src = TDIR_W * n + s.idx;
                for (int dst = 0; dst < n4; dst++) {
                    if (!m->normal_ports[src * n4 + dst]) continue;
                    State ns = to_canonical(bx, by, dst / n, dst % n);
                    if (ns.x >= 0 && ns.y >= 0)
                        nbrs[cnt++] = ns;
                }
            }
        }

    } else {
        /* Block (sx, sy) — terminal N[si] */
        {
            int bx = s.x, by = s.y;
            if (bx > 0) {
                if (by > 0) {
                    /* normal block */
                    int src = TDIR_N * n + s.idx;
                    for (int dst = 0; dst < n4; dst++) {
                        if (!m->normal_ports[src * n4 + dst]) continue;
                        State ns = to_canonical(bx, by, dst / n, dst % n);
                        if (ns.x >= 0 && ns.y >= 0)
                            nbrs[cnt++] = ns;
                    }
                } else {
                    /* ny block (by==0) */
                    for (int dj = 0; dj < n; dj++) {
                        if (dj == s.idx) continue;
                        int adj = dj < s.idx ? dj : dj - 1;
                        if (m->ny_ports[s.idx * (n - 1) + adj])
                            nbrs[cnt++] = (State){bx, 0, CDIR_N, dj};
                    }
                }
            }
        }

        /* Block (sx, sy+1) — terminal S[si] */
        {
            int bx = s.x, by = s.y + 1;
            if (bx > 0 && by > 0) {
                int src = TDIR_S * n + s.idx;
                for (int dst = 0; dst < n4; dst++) {
                    if (!m->normal_ports[src * n4 + dst]) continue;
                    State ns = to_canonical(bx, by, dst / n, dst % n);
                    if (ns.x >= 0 && ns.y >= 0)
                        nbrs[cnt++] = ns;
                }
            }
        }
    }

    return cnt;
}

/* --- IDDFS --- */

/*
 * DFS context passed through recursive calls.
 */
typedef struct {
    const Maze *m;
    State goal;
    TT *tt;
    State *path_stack;    /* path_stack[depth] = state at that depth */
    State *nbrs_buf;      /* pre-allocated neighbor buffer, indexed by depth */
    int max_nbrs;
    int found;            /* 1 if goal was found */
} DFSCtx;

/*
 * dfs -- depth-limited DFS with transposition table pruning.
 *
 * Returns 1 if goal was found at or below this depth, 0 otherwise.
 */
static int dfs(DFSCtx *ctx, State cur, int depth, int depth_limit) {
    if (state_eq(cur, ctx->goal)) {
        ctx->path_stack[depth] = cur;
        ctx->found = 1;
        return 1;
    }
    if (depth >= depth_limit)
        return 0;

    ctx->path_stack[depth] = cur;

    State *nbrs = ctx->nbrs_buf + depth * ctx->max_nbrs;
    int nn = get_neighbors(ctx->m, cur, nbrs);

    for (int i = 0; i < nn; i++) {
        if (!tt_update(ctx->tt, nbrs[i], depth + 1)) continue;
        if (dfs(ctx, nbrs[i], depth + 1, depth_limit))
            return 1;
    }
    return 0;
}

/* --- Public API --- */

/*
 * solve -- IDDFS from start (0,1,E,0) to goal (0,1,E,1).
 *
 * Algorithm:
 *   1. Initialize transposition table (cleared each iteration).
 *   2. For depth_limit = 0, 1, 2, ..., MAX_DEPTH:
 *      a. Clear TT and run DFS with TT pruning (within-iteration).
 *      b. If goal found: extract path from DFS stack, return.
 *      c. If TT count equals previous iteration's count: search space
 *         exhausted, no path exists. Break early.
 *   3. Return -1 if no path found.
 *
 * Returns path length (edges) or -1 if no path found.
 */
int solve(const Maze *m, State **path_out, int *path_len_out) {
    if (path_out)     *path_out = NULL;
    if (path_len_out) *path_len_out = 0;
    if (m->nterm < 2) return -1;

    State start = {0, 1, CDIR_E, 0};
    State goal  = {0, 1, CDIR_E, 1};

    TT tt;
    tt_init(&tt);

    int max_nbrs = 8 * m->nterm;
    State *path_stack = malloc((MAX_DEPTH + 1) * sizeof(State));
    State *nbrs_buf = malloc((MAX_DEPTH + 1) * max_nbrs * sizeof(State));

    DFSCtx ctx;
    ctx.m = m;
    ctx.goal = goal;
    ctx.tt = &tt;
    ctx.path_stack = path_stack;
    ctx.nbrs_buf = nbrs_buf;
    ctx.max_nbrs = max_nbrs;
    ctx.found = 0;

    int result = -1;
    int last_count = 0;

    for (int depth_limit = 0; depth_limit <= MAX_DEPTH; depth_limit++) {
        /* Clear TT for this iteration (fresh exploration at new depth limit) */
        tt_clear(&tt);
        tt_update(&tt, start, 0);

        if (dfs(&ctx, start, 0, depth_limit)) {
            /* Goal found: extract path from DFS stack */
            int path_len = depth_limit + 1;
            for (int d = 0; d <= depth_limit; d++) {
                if (state_eq(ctx.path_stack[d], goal)) {
                    path_len = d + 1;
                    break;
                }
            }

            if (path_out) {
                State *path = malloc(path_len * sizeof(State));
                memcpy(path, path_stack, path_len * sizeof(State));
                *path_out = path;
            }
            if (path_len_out) *path_len_out = path_len;
            result = path_len - 1;
            break;
        }

        /* Early termination: no new states discovered vs previous iteration */
        if (tt.count == last_count)
            break;
        last_count = tt.count;
    }

    free(path_stack);
    free(nbrs_buf);
    tt_free(&tt);
    return result;
}

/*
 * solve_from -- IDDFS starting from min_depth.
 *
 * Skips depth_limit = 0, 1, ..., min_depth-1, which is safe when a lower
 * bound on the shortest path length is known.
 */
int solve_from(const Maze *m, int min_depth, State **path_out, int *path_len_out) {
    if (path_out)     *path_out = NULL;
    if (path_len_out) *path_len_out = 0;
    if (m->nterm < 2) return -1;
    if (min_depth < 0) min_depth = 0;

    State start = {0, 1, CDIR_E, 0};
    State goal  = {0, 1, CDIR_E, 1};

    TT tt;
    tt_init(&tt);

    int max_nbrs = 8 * m->nterm;
    State *path_stack = malloc((MAX_DEPTH + 1) * sizeof(State));
    State *nbrs_buf = malloc((MAX_DEPTH + 1) * max_nbrs * sizeof(State));

    DFSCtx ctx;
    ctx.m = m;
    ctx.goal = goal;
    ctx.tt = &tt;
    ctx.path_stack = path_stack;
    ctx.nbrs_buf = nbrs_buf;
    ctx.max_nbrs = max_nbrs;
    ctx.found = 0;

    int result = -1;
    int last_count = 0;

    for (int depth_limit = min_depth; depth_limit <= MAX_DEPTH; depth_limit++) {
        tt_clear(&tt);
        tt_update(&tt, start, 0);

        if (dfs(&ctx, start, 0, depth_limit)) {
            int path_len = depth_limit + 1;
            for (int d = 0; d <= depth_limit; d++) {
                if (state_eq(ctx.path_stack[d], goal)) {
                    path_len = d + 1;
                    break;
                }
            }

            if (path_out) {
                State *path = malloc(path_len * sizeof(State));
                memcpy(path, path_stack, path_len * sizeof(State));
                *path_out = path;
            }
            if (path_len_out) *path_len_out = path_len;
            result = path_len - 1;
            break;
        }

        if (tt.count == last_count)
            break;
        last_count = tt.count;
    }

    free(path_stack);
    free(nbrs_buf);
    tt_free(&tt);
    return result;
}

/* --- BFS Solver --- */

/* BFS node for path reconstruction. */
typedef struct {
    State state;
    int parent;  /* index in queue, -1 for start */
} BFSNode;

/*
 * solve_bfs -- find the shortest path using BFS.
 *
 * Each state is visited at most once via a TT used as a visited set
 * (tt_update with depth=0). Parent pointers enable path reconstruction.
 */
int solve_bfs(const Maze *m, State **path_out, int *path_len_out) {
    if (path_out)     *path_out = NULL;
    if (path_len_out) *path_len_out = 0;
    if (m->nterm < 2) return -1;

    State start = {0, 1, CDIR_E, 0};
    State goal  = {0, 1, CDIR_E, 1};

    TT visited;
    tt_init(&visited);
    tt_update(&visited, start, 0);

    int max_nbrs = 8 * m->nterm;
    State *nbrs = malloc(max_nbrs * sizeof(State));

    int cap = 4096;
    BFSNode *queue = malloc(cap * sizeof(BFSNode));
    int head = 0, tail = 0;
    queue[tail++] = (BFSNode){start, -1};

    int result = -1;
    int goal_idx = -1;

    while (head < tail) {
        State cur = queue[head].state;

        if (state_eq(cur, goal)) {
            goal_idx = head;
            break;
        }

        int nn = get_neighbors(m, cur, nbrs);
        for (int i = 0; i < nn; i++) {
            if (!tt_update(&visited, nbrs[i], 0)) continue;
            if (tail >= cap) {
                cap *= 2;
                queue = realloc(queue, cap * sizeof(BFSNode));
            }
            queue[tail++] = (BFSNode){nbrs[i], head};
        }

        head++;
    }

    if (goal_idx >= 0) {
        /* Count path length by tracing parent pointers */
        int depth = 0;
        int idx = goal_idx;
        while (idx >= 0) { depth++; idx = queue[idx].parent; }
        result = depth - 1;

        if (path_out) {
            State *path = malloc(depth * sizeof(State));
            idx = goal_idx;
            for (int i = depth - 1; i >= 0; i--) {
                path[i] = queue[idx].state;
                idx = queue[idx].parent;
            }
            *path_out = path;
        }
        if (path_len_out) *path_len_out = depth;
    }

    free(nbrs);
    free(queue);
    tt_free(&visited);
    return result;
}

/*
 * solve_bfs_len -- lightweight BFS returning only the path length.
 *
 * Uses a single State queue without parent tracking. Tracks BFS levels
 * via a level_end marker to count depth.
 */
int solve_bfs_len(const Maze *m) {
    if (m->nterm < 2) return -1;

    State start = {0, 1, CDIR_E, 0};
    State goal  = {0, 1, CDIR_E, 1};

    TT visited;
    tt_init(&visited);
    tt_update(&visited, start, 0);

    int max_nbrs = 8 * m->nterm;
    State *nbrs = malloc(max_nbrs * sizeof(State));

    int cap = 4096;
    State *queue = malloc(cap * sizeof(State));
    int head = 0, tail = 0;
    queue[tail++] = start;

    int level_end = tail;
    int depth = 0;
    int result = -1;

    while (head < tail) {
        if (head == level_end) {
            depth++;
            level_end = tail;
            if (depth > MAX_DEPTH) break;
        }

        State cur = queue[head++];

        if (state_eq(cur, goal)) {
            result = depth;
            goto bfs_len_done;
        }

        int nn = get_neighbors(m, cur, nbrs);
        for (int i = 0; i < nn; i++) {
            if (!tt_update(&visited, nbrs[i], 0)) continue;
            if (tail >= cap) {
                cap *= 2;
                queue = realloc(queue, cap * sizeof(State));
            }
            queue[tail++] = nbrs[i];
        }
    }

bfs_len_done:
    free(nbrs);
    free(queue);
    tt_free(&visited);
    return result;
}

/* state_print -- print a state in compact "(x,y,Dir Idx)" format. */
void state_print(State s) {
    printf("(%d,%d,%s%d)", s.x, s.y,
           s.dir == CDIR_E ? "E" : "N", s.idx);
}

/* path_fprint -- print the full path to a FILE stream. */
void path_fprint(FILE *fp, const State *path, int path_len) {
    for (int i = 0; i < path_len; i++) {
        if (i > 0) fprintf(fp, " -> ");
        fprintf(fp, "(%d,%d,%s%d)", path[i].x, path[i].y,
                path[i].dir == CDIR_E ? "E" : "N", path[i].idx);
    }
    fprintf(fp, "\n");
}

/* path_print -- print the full path as "state0 -> state1 -> ... -> stateN". */
void path_print(const State *path, int path_len) {
    path_fprint(stdout, path, path_len);
}

/*
 * path_print_grid -- display a 2D grid of (x,y) positions visited by the path.
 *
 * Each cell shows comma-separated step numbers for states at that position.
 * Cells not visited by the path show ".".
 * The grid is printed with y decreasing (top = high y).
 */
void path_print_grid(const State *path, int path_len) {
    if (path_len == 0) return;

    /* Find bounding box of all path positions */
    int min_x = path[0].x, max_x = path[0].x;
    int min_y = path[0].y, max_y = path[0].y;
    for (int i = 1; i < path_len; i++) {
        if (path[i].x < min_x) min_x = path[i].x;
        if (path[i].x > max_x) max_x = path[i].x;
        if (path[i].y < min_y) min_y = path[i].y;
        if (path[i].y > max_y) max_y = path[i].y;
    }

    int cols = max_x - min_x + 1;
    int rows = max_y - min_y + 1;

    /* Determine column widths based on content */
    int *col_w = calloc(cols, sizeof(int));
    for (int c = 0; c < cols; c++) col_w[c] = 4;

    /* Build cell content strings (step numbers at each position) */
    char **cells = calloc(rows * cols, sizeof(char *));
    for (int y = min_y; y <= max_y; y++) {
        for (int x = min_x; x <= max_x; x++) {
            char buf[128] = "";
            int pos = 0;
            for (int i = 0; i < path_len && pos < 100; i++) {
                if (path[i].x == x && path[i].y == y) {
                    if (pos > 0) pos += snprintf(buf + pos, sizeof(buf) - pos, ",");
                    pos += snprintf(buf + pos, sizeof(buf) - pos, "%d", i);
                }
            }
            if (pos == 0) { buf[0] = '.'; buf[1] = '\0'; }
            int r = y - min_y;
            int c = x - min_x;
            cells[r * cols + c] = strdup(buf);
            int len = (int)strlen(buf);
            if (len + 2 > col_w[c]) col_w[c] = len + 2;
        }
    }

    printf("Grid (step numbers at each position):\n");

    /* Column header: x coordinates */
    printf("y\\x  ");
    for (int x = min_x; x <= max_x; x++)
        printf("%-*d", col_w[x - min_x], x);
    printf("\n");

    /* Rows from high y to low y */
    for (int y = max_y; y >= min_y; y--) {
        printf("%-4d ", y);
        int r = y - min_y;
        for (int c = 0; c < cols; c++)
            printf("%-*s", col_w[c], cells[r * cols + c]);
        printf("\n");
    }

    for (int i = 0; i < rows * cols; i++) free(cells[i]);
    free(cells);
    free(col_w);
}

/* --- Verbose path with transition annotations --- */

/* Direction name strings indexed by TDIR_* constants. */
static const char *tdir_str[] = {"E", "W", "N", "S"};

/*
 * BlockTerm -- a (block position, terminal direction, terminal index) triple.
 * Used internally to find which block and port connect two consecutive path states.
 */
typedef struct { int bx, by, td, ti; } BlockTerm;

/*
 * path_print_verbose -- print annotated path transitions.
 *
 * For each consecutive pair of states (s1, s2) in the path:
 *   1. Enumerate the 2 block-terminal pairs for s1 (the blocks sharing s1's point).
 *   2. Enumerate the 2 block-terminal pairs for s2.
 *   3. Find a common block where the port src_terminal -> dst_terminal exists.
 *   4. Print the transition with block type, position, and port name.
 *
 * Block types are determined by position:
 *   (bx>0, by>0) = "normal",  (0, by>0) = "nx",  (bx>0, 0) = "ny"
 */
void path_print_verbose(const Maze *m, const State *path, int path_len) {
    if (path_len == 0) return;

    printf("Path details (%d steps):\n", path_len - 1);

    for (int step = 0; step < path_len - 1; step++) {
        State s1 = path[step];
        State s2 = path[step + 1];

        BlockTerm p1[2], p2[2];
        int n1 = 0, n2 = 0;

        if (s1.dir == CDIR_E) {
            p1[n1++] = (BlockTerm){s1.x,   s1.y, TDIR_E, s1.idx};
            p1[n1++] = (BlockTerm){s1.x+1, s1.y, TDIR_W, s1.idx};
        } else {
            p1[n1++] = (BlockTerm){s1.x, s1.y,   TDIR_N, s1.idx};
            p1[n1++] = (BlockTerm){s1.x, s1.y+1, TDIR_S, s1.idx};
        }
        if (s2.dir == CDIR_E) {
            p2[n2++] = (BlockTerm){s2.x,   s2.y, TDIR_E, s2.idx};
            p2[n2++] = (BlockTerm){s2.x+1, s2.y, TDIR_W, s2.idx};
        } else {
            p2[n2++] = (BlockTerm){s2.x, s2.y,   TDIR_N, s2.idx};
            p2[n2++] = (BlockTerm){s2.x, s2.y+1, TDIR_S, s2.idx};
        }

        int found = 0;
        for (int i = 0; i < n1 && !found; i++) {
            for (int j = 0; j < n2 && !found; j++) {
                if (p1[i].bx != p2[j].bx || p1[i].by != p2[j].by)
                    continue;
                int bx = p1[i].bx, by = p1[i].by;
                int sd = p1[i].td, si = p1[i].ti;
                int dd = p2[j].td, di = p2[j].ti;
                const char *btype = NULL;
                int has_port = 0;

                if (bx > 0 && by > 0) {
                    btype = "normal";
                    has_port = maze_normal_port(m, sd, si, dd, di);
                } else if (bx == 0 && by > 0) {
                    btype = "nx";
                    if (sd == TDIR_E && dd == TDIR_E && si != di)
                        has_port = maze_nx_port(m, si, di);
                } else if (bx > 0 && by == 0) {
                    btype = "ny";
                    if (sd == TDIR_N && dd == TDIR_N && si != di)
                        has_port = maze_ny_port(m, si, di);
                }
                if (has_port && btype) {
                    printf("  #%-3d (%d,%d,%s%d) --[%s%d->%s%d @ %s(%d,%d)]--> (%d,%d,%s%d)\n",
                           step,
                           s1.x, s1.y, s1.dir == CDIR_E ? "E" : "N", s1.idx,
                           tdir_str[sd], si, tdir_str[dd], di, btype, bx, by,
                           s2.x, s2.y, s2.dir == CDIR_E ? "E" : "N", s2.idx);
                    found = 1;
                }
            }
        }
        if (!found) {
            printf("  #%-3d (%d,%d,%s%d) --> (%d,%d,%s%d)  [transition unknown]\n",
                   step,
                   s1.x, s1.y, s1.dir == CDIR_E ? "E" : "N", s1.idx,
                   s2.x, s2.y, s2.dir == CDIR_E ? "E" : "N", s2.idx);
        }
    }
}
