/*
 * quizmaster.c -- Exhaustive search for the maze with the longest
 *                 minimal path (a "busy beaver" search over maze space).
 *
 * Enumerates all mazes with at most max_aport active ports by generating
 * all C(ncand, k) combinations for k = 0, 1, ..., max_aport, where ncand
 * is the number of candidate ports (excluding useless self-loop ports).
 *
 * Pruning:
 *   1. Self-loop elimination: ports Ti->Ti (same terminal) are excluded
 *      from the candidate set since they map a state to itself.
 *   2. Abstract terminal reachability: a tiny directed graph (2*nterm nodes)
 *      checks whether the goal is reachable from the start at the terminal
 *      type level. This subsumes start-exit and goal-entry checks.
 *
 * Progress and new-best discoveries are logged to stderr so that stdout
 * remains clean for the final result output.
 */
#include "quizmaster.h"
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <signal.h>

/* SIGINT handling for graceful Ctrl+C exit in random search */
static volatile sig_atomic_t interrupted = 0;
static void sigint_handler(int sig) { (void)sig; interrupted = 1; }

/*
 * qmresult_free -- release all heap memory stored in a QMResult.
 */
void qmresult_free(QMResult *r) {
    if (!r) return;
    maze_destroy(r->best_maze);
    r->best_maze = NULL;
    free(r->best_path);
    r->best_path = NULL;
}

/*
 * binomial -- compute C(n, k) as uint64_t.
 * Returns 0 if k > n. Uses the multiplicative formula to avoid overflow
 * as much as possible.
 */
static uint64_t binomial(int n, int k) {
    if (k < 0 || k > n) return 0;
    if (k == 0 || k == n) return 1;
    if (k > n - k) k = n - k;
    uint64_t result = 1;
    for (int i = 0; i < k; i++) {
        result = result * (uint64_t)(n - i) / (uint64_t)(i + 1);
    }
    return result;
}

/*
 * is_self_loop_port -- check if a flat port index is a terminal self-loop.
 *
 * A normal-block port at flat index idx has:
 *   src_terminal = idx / (4*nterm)
 *   dst_terminal = idx % (4*nterm)
 * It is a self-loop when src_terminal == dst_terminal (Ti->Ti),
 * which maps a state to itself and can never contribute to a path.
 *
 * nx/ny ports exclude self-loops by construction (si != di), so they
 * are never self-loops.
 */
static int is_self_loop_port(const Maze *m, int idx) {
    if (idx >= m->normal_nports) return 0;
    int n4 = 4 * m->nterm;
    return (idx / n4) == (idx % n4);
}

/*
 * has_abstract_path -- check reachability in the abstract terminal graph.
 *
 * The abstract graph has 2*nterm nodes representing canonical state types:
 *   (E, i) for i=0..nterm-1: indices 0..nterm-1
 *   (N, i) for i=0..nterm-1: indices nterm..2*nterm-1
 *
 * Being at canonical (x,y,E,i) means we can use ports from both E[i]
 * and W[i] terminals (they share the same canonical state type).
 * Similarly (x,y,N,i) can use ports from N[i] and S[i].
 *
 * For each active port src->dst:
 *   abstract_src: E/W terminal with index j -> node j; N/S -> node nterm+j
 *   abstract_dst: same mapping
 *   Add directed edge abstract_src -> abstract_dst
 *
 * Start: node 0 = (E, 0).  Goal: node 1 = (E, 1).
 *
 * BFS from start node using uint64_t bitmasks (no heap allocation).
 * Returns 1 if goal is reachable, 0 otherwise.
 */
static int has_abstract_path(const Maze *m) {
    int n = m->nterm;
    int n4 = 4 * n;
    uint64_t adj[64];
    memset(adj, 0, sizeof(adj));

    /* Normal block ports */
    for (int st = 0; st < n4; st++) {
        int asrc = (st / n < 2) ? (st % n) : n + (st % n);
        for (int dt = 0; dt < n4; dt++) {
            if (st == dt) continue;
            if (!m->normal_ports[st * n4 + dt]) continue;
            int adst = (dt / n < 2) ? (dt % n) : n + (dt % n);
            adj[asrc] |= 1ULL << adst;
        }
    }

    /* nx ports: E[si] -> E[di], abstract node si -> di */
    for (int si = 0; si < n; si++)
        for (int di = 0; di < n; di++)
            if (si != di && maze_nx_port(m, si, di))
                adj[si] |= 1ULL << di;

    /* ny ports: N[si] -> N[di], abstract node (n+si) -> (n+di) */
    for (int si = 0; si < n; si++)
        for (int di = 0; di < n; di++)
            if (si != di && maze_ny_port(m, si, di))
                adj[n + si] |= 1ULL << (n + di);

    /* BFS from node 0 (E, 0) */
    uint64_t reachable = 1ULL << 0;
    uint64_t frontier = reachable;
    while (frontier) {
        uint64_t next = 0;
        uint64_t f = frontier;
        while (f) {
            int bit = __builtin_ctzll(f);
            f &= f - 1;
            next |= adj[bit] & ~reachable;
        }
        reachable |= next;
        frontier = next;
    }

    /* Check if node 1 (E, 1) is reachable */
    return (reachable >> 1) & 1;
}

/*
 * quizmaster_search -- exhaustive combination enumeration with pruning.
 *
 * 1. Build candidate port list (excluding self-loop ports).
 * 2. For each k from 0 to max_aport, enumerate all C(ncand, k)
 *    combinations of candidate port indices.
 * 3. For each combination, set ports, check abstract reachability,
 *    solve if reachable, and track the global best.
 * 4. Stop early if max_len > 0 and best_len >= max_len.
 */
QMResult quizmaster_search(int nterm, int min_aport, int max_aport,
                           int max_len, int use_bfs) {
    QMResult result = {NULL, 0, NULL, 0};
    if (nterm < 2) return result;

    Maze *m = maze_create(nterm);
    int total = m->total_nports;

    /* Build candidate list (exclude self-loop ports) */
    int *candidates = malloc(total * sizeof(int));
    int ncand = 0;
    for (int i = 0; i < total; i++) {
        if (!is_self_loop_port(m, i))
            candidates[ncand++] = i;
    }

    fprintf(stderr, "Ports: %d total, %d candidates (excluding %d self-loops)\n",
            total, ncand, total - ncand);

    /* Clamp range to candidate count */
    if (min_aport < 0) min_aport = 0;
    if (max_aport > ncand) max_aport = ncand;

    Maze *best = NULL;
    int best_len = 0;
    State *best_path = NULL;
    int best_path_len = 0;
    uint64_t total_evaluated = 0;
    uint64_t total_solved = 0;
    uint64_t total_pruned = 0;
    uint64_t total_norm_pruned = 0;

    int *combo = malloc(ncand * sizeof(int));

    for (int k = min_aport; k <= max_aport; k++) {
        uint64_t ncombs = binomial(ncand, k);
        fprintf(stderr, "k=%d: C(%d,%d) = %llu mazes\n",
                k, ncand, k, (unsigned long long)ncombs);

        /* Initialize combo to {0, 1, ..., k-1} */
        for (int i = 0; i < k; i++)
            combo[i] = i;

        uint64_t combo_count = 0;
        for (;;) {
            /* Set up the maze for this combination */
            maze_clear(m);
            for (int i = 0; i < k; i++)
                maze_set_port(m, candidates[combo[i]], 1);

            /* Pruning 1: normalization -- skip non-canonical forms */
            if (!maze_is_normalized(m)) {
                total_norm_pruned++;
                goto next_combo;
            }

            /* Pruning 2: abstract terminal reachability */
            if (has_abstract_path(m)) {
                int len;
                State *tmp_path = NULL;
                int tmp_path_len = 0;
                if (use_bfs) {
                    len = solve_bfs_len(m);
                } else {
                    len = solve(m, &tmp_path, &tmp_path_len);
                }
                if (len < 0) len = 0;
                total_solved++;

                if (len > best_len) {
                    if (use_bfs)
                        solve_bfs(m, &tmp_path, &tmp_path_len);
                    best_len = len;
                    if (best) maze_destroy(best);
                    best = maze_clone(m);
                    free(best_path);
                    best_path = tmp_path;
                    best_path_len = tmp_path_len;
                    tmp_path = NULL;
                    fprintf(stderr, "[k=%d, combo %llu] new best: length %d\n",
                            k, (unsigned long long)combo_count, best_len);
                    fprintf(stderr, "  ");
                    maze_fprint(stderr, best);
                    fprintf(stderr, "  ");
                    path_fprint(stderr, best_path, best_path_len);
                    if (max_len > 0 && best_len >= max_len) {
                        total_evaluated++;
                        combo_count++;
                        goto search_done;
                    }
                } else {
                    free(tmp_path);
                }
            } else {
                total_pruned++;
            }

        next_combo:
            total_evaluated++;
            combo_count++;

            /* Progress reporting every 10000 mazes */
            if (combo_count % 10000 == 0) {
                fprintf(stderr, "[k=%d] progress: %llu/%llu (%.1f%%) best=%d solved=%llu pruned=%llu norm_pruned=%llu\n",
                        k,
                        (unsigned long long)combo_count,
                        (unsigned long long)ncombs,
                        (double)combo_count / (double)ncombs * 100.0,
                        best_len,
                        (unsigned long long)total_solved,
                        (unsigned long long)total_pruned,
                        (unsigned long long)total_norm_pruned);
            }

            /* Generate next combination in lexicographic order */
            int i = k - 1;
            while (i >= 0 && combo[i] == ncand - k + i)
                i--;
            if (i < 0) break;
            combo[i]++;
            for (int j = i + 1; j < k; j++)
                combo[j] = combo[j - 1] + 1;
        }
    }

search_done:
    free(combo);
    free(candidates);

    fprintf(stderr, "Search complete: %llu evaluated, %llu solved, %llu pruned, %llu norm_pruned, best length = %d\n",
            (unsigned long long)total_evaluated,
            (unsigned long long)total_solved,
            (unsigned long long)total_pruned,
            (unsigned long long)total_norm_pruned,
            best_len);

    if (best) {
        result.best_maze     = best;
        result.best_length   = best_len;
        result.best_path     = best_path;
        result.best_path_len = best_path_len;
    }

    maze_destroy(m);
    return result;
}

/*
 * quizmaster_random_search -- random sampling search with SIGINT handling.
 *
 * Each iteration randomly picks k in [min_aport, max_aport] and selects
 * k random ports from the candidate set. Runs until SIGINT or max_len
 * is reached.
 */
QMResult quizmaster_random_search(int nterm, int min_aport, int max_aport,
                                  int max_len, unsigned int seed, int use_bfs) {
    QMResult result = {NULL, 0, NULL, 0};
    if (nterm < 2) return result;

    srand(seed);
    interrupted = 0;

    /* Install SIGINT handler */
    struct sigaction sa, old_sa;
    sa.sa_handler = sigint_handler;
    sa.sa_flags = 0;
    sigemptyset(&sa.sa_mask);
    sigaction(SIGINT, &sa, &old_sa);

    Maze *m = maze_create(nterm);
    int total = m->total_nports;

    /* Build candidate list (exclude self-loop ports) */
    int *candidates = malloc(total * sizeof(int));
    int ncand = 0;
    for (int i = 0; i < total; i++) {
        if (!is_self_loop_port(m, i))
            candidates[ncand++] = i;
    }

    fprintf(stderr, "Random search (seed=%u): %d candidates (excluding %d self-loops)\n",
            seed, ncand, total - ncand);

    /* Clamp range to candidate count */
    if (min_aport < 0) min_aport = 0;
    if (max_aport > ncand) max_aport = ncand;

    int k_range = max_aport - min_aport + 1;

    Maze *best = NULL;
    int best_len = 0;
    State *best_path = NULL;
    int best_path_len = 0;
    uint64_t total_evaluated = 0;
    uint64_t total_solved = 0;
    uint64_t total_pruned = 0;

    /* Index array for Fisher-Yates shuffle */
    int *indices = malloc(ncand * sizeof(int));

    while (!interrupted) {
        /* Pick random k */
        int k = min_aport + rand() % k_range;

        /* Select k random candidates via partial Fisher-Yates */
        for (int i = 0; i < ncand; i++)
            indices[i] = i;
        for (int i = 0; i < k; i++) {
            int j = i + rand() % (ncand - i);
            int tmp = indices[i];
            indices[i] = indices[j];
            indices[j] = tmp;
        }

        /* Set up the maze */
        maze_clear(m);
        for (int i = 0; i < k; i++)
            maze_set_port(m, candidates[indices[i]], 1);

        /* Pruning: abstract terminal reachability */
        if (has_abstract_path(m)) {
            int len;
            State *tmp_path = NULL;
            int tmp_path_len = 0;
            if (use_bfs) {
                len = solve_bfs_len(m);
            } else {
                len = solve(m, &tmp_path, &tmp_path_len);
            }
            if (len < 0) len = 0;
            total_solved++;

            if (len > best_len) {
                if (use_bfs)
                    solve_bfs(m, &tmp_path, &tmp_path_len);
                best_len = len;
                if (best) maze_destroy(best);
                best = maze_clone(m);
                free(best_path);
                best_path = tmp_path;
                best_path_len = tmp_path_len;
                tmp_path = NULL;
                fprintf(stderr, "[iter %llu, k=%d] new best: length %d\n",
                        (unsigned long long)total_evaluated, k, best_len);
                fprintf(stderr, "  ");
                maze_fprint(stderr, best);
                fprintf(stderr, "  ");
                path_fprint(stderr, best_path, best_path_len);
                if (max_len > 0 && best_len >= max_len)
                    break;
            } else {
                free(tmp_path);
            }
        } else {
            total_pruned++;
        }

        total_evaluated++;

        /* Progress reporting every 10000 iterations */
        if (total_evaluated % 10000 == 0) {
            fprintf(stderr, "[random] iter=%llu best=%d solved=%llu pruned=%llu\n",
                    (unsigned long long)total_evaluated,
                    best_len,
                    (unsigned long long)total_solved,
                    (unsigned long long)total_pruned);
        }
    }

    free(indices);
    free(candidates);

    if (interrupted)
        fprintf(stderr, "\nInterrupted by SIGINT.\n");

    fprintf(stderr, "Random search complete: %llu evaluated, %llu solved, %llu pruned, best length = %d\n",
            (unsigned long long)total_evaluated,
            (unsigned long long)total_solved,
            (unsigned long long)total_pruned,
            best_len);

    if (best) {
        result.best_maze     = best;
        result.best_length   = best_len;
        result.best_path     = best_path;
        result.best_path_len = best_path_len;
    }

    maze_destroy(m);

    /* Restore previous SIGINT handler */
    sigaction(SIGINT, &old_sa, NULL);

    return result;
}

/* ================================================================
 * Top-down search: start from fully-connected, remove ports one at a time.
 * ================================================================ */

/* --- Dynamic stack of flat port arrays --- */

typedef struct {
    uint8_t **items;
    int count;
    int cap;
} PortStack;

static void ps_init(PortStack *s) {
    s->cap = 64;
    s->count = 0;
    s->items = malloc(s->cap * sizeof(uint8_t *));
}

static void ps_push(PortStack *s, const uint8_t *data, int len) {
    if (s->count >= s->cap) {
        s->cap *= 2;
        s->items = realloc(s->items, s->cap * sizeof(uint8_t *));
    }
    uint8_t *copy = malloc(len);
    memcpy(copy, data, len);
    s->items[s->count++] = copy;
}

static uint8_t *ps_pop(PortStack *s) {
    if (s->count == 0) return NULL;
    return s->items[--s->count];
}

static void ps_free(PortStack *s) {
    for (int i = 0; i < s->count; i++)
        free(s->items[i]);
    free(s->items);
}

/* --- Seen set (open-addressing hash table of flat port arrays) --- */

typedef struct {
    uint8_t  **keys;
    uint64_t  *hashes;   /* precomputed hash per slot (0 = empty) */
    int size;
    int count;
    int key_len;
} SeenSet;

/*
 * seen_hash -- hash flat port data (8 bytes at a time for speed).
 * Uses a multiply-xorshift scheme with golden-ratio constant.
 */
static uint64_t seen_hash(const uint8_t *data, int len) {
    uint64_t h = 0x517cc1b727220a95ULL;
    int i = 0;
    for (; i + 7 < len; i += 8) {
        uint64_t chunk;
        memcpy(&chunk, data + i, 8);
        h ^= chunk;
        h *= 0x9e3779b97f4a7c15ULL;
        h ^= h >> 32;
    }
    for (; i < len; i++) {
        h ^= data[i];
        h *= 0x9e3779b97f4a7c15ULL;
    }
    /* Ensure hash is never 0 (0 = empty sentinel) */
    return h | 1;
}

static void seen_init(SeenSet *s, int key_len) {
    s->size = 65536;
    s->count = 0;
    s->key_len = key_len;
    s->keys = calloc(s->size, sizeof(uint8_t *));
    s->hashes = calloc(s->size, sizeof(uint64_t));
}

static void seen_rebuild(SeenSet *s) {
    int new_size = s->size * 2;
    uint8_t **new_keys = calloc(new_size, sizeof(uint8_t *));
    uint64_t *new_hashes = calloc(new_size, sizeof(uint64_t));
    uint64_t mask = (uint64_t)(new_size - 1);
    for (int i = 0; i < s->size; i++) {
        if (!s->hashes[i]) continue;
        uint64_t h = s->hashes[i] & mask;
        while (new_hashes[h])
            h = (h + 1) & mask;
        new_keys[h] = s->keys[i];
        new_hashes[h] = s->hashes[i];
    }
    free(s->keys);
    free(s->hashes);
    s->keys = new_keys;
    s->hashes = new_hashes;
    s->size = new_size;
}

static int seen_contains(const SeenSet *s, const uint8_t *data) {
    uint64_t hash = seen_hash(data, s->key_len);
    uint64_t mask = (uint64_t)(s->size - 1);
    uint64_t h = hash & mask;
    while (s->hashes[h]) {
        if (s->hashes[h] == hash &&
            memcmp(s->keys[h], data, s->key_len) == 0)
            return 1;
        h = (h + 1) & mask;
    }
    return 0;
}

static void seen_insert(SeenSet *s, const uint8_t *data) {
    if (s->count * 2 >= s->size) seen_rebuild(s);
    uint64_t hash = seen_hash(data, s->key_len);
    uint64_t mask = (uint64_t)(s->size - 1);
    uint8_t *copy = malloc(s->key_len);
    memcpy(copy, data, s->key_len);
    uint64_t h = hash & mask;
    while (s->hashes[h])
        h = (h + 1) & mask;
    s->keys[h] = copy;
    s->hashes[h] = hash;
    s->count++;
}

static void seen_free(SeenSet *s) {
    for (int i = 0; i < s->size; i++)
        free(s->keys[i]);
    free(s->keys);
    free(s->hashes);
}

/* --- Helper: extract flat port data from maze --- */

static void maze_to_flat(const Maze *m, uint8_t *data) {
    memcpy(data, m->normal_ports, m->normal_nports);
    memcpy(data + m->normal_nports, m->nx_ports, m->nx_nports);
    memcpy(data + m->normal_nports + m->nx_nports, m->ny_ports, m->ny_nports);
}

/* --- Top-down search --- */

#define TD_MAX_PRIORITY 1000

QMResult quizmaster_topdown_search(int nterm, int max_len, int use_bfs) {
    QMResult result = {NULL, 0, NULL, 0};
    if (nterm < 2) return result;

    interrupted = 0;
    struct sigaction sa, old_sa;
    sa.sa_handler = sigint_handler;
    sa.sa_flags = 0;
    sigemptyset(&sa.sa_mask);
    sigaction(SIGINT, &sa, &old_sa);

    Maze *m = maze_create(nterm);
    int total = m->total_nports;

    /* Build candidate list (exclude self-loop ports) */
    int *candidates = malloc(total * sizeof(int));
    int ncand = 0;
    for (int i = 0; i < total; i++)
        if (!is_self_loop_port(m, i))
            candidates[ncand++] = i;

    fprintf(stderr, "Top-down search: %d candidates (excluding %d self-loops)\n",
            ncand, total - ncand);

    /* Start: fully-connected maze (all candidates active) */
    maze_clear(m);
    for (int i = 0; i < ncand; i++)
        maze_set_port(m, candidates[i], 1);

    free(candidates);

    /* Initialize priority stacks */
    PortStack *stacks = malloc(TD_MAX_PRIORITY * sizeof(PortStack));
    for (int i = 0; i < TD_MAX_PRIORITY; i++)
        ps_init(&stacks[i]);

    /* Seen set */
    SeenSet seen;
    seen_init(&seen, total);

    /* Push fully-connected maze into stack[1] */
    uint8_t *flat = malloc(total);
    maze_to_flat(m, flat);
    ps_push(&stacks[1], flat, total);
    seen_insert(&seen, flat);

    Maze *best = NULL;
    int best_len = 0;
    State *best_path = NULL;
    int best_path_len = 0;
    uint64_t total_popped = 0;
    uint64_t total_solved = 0;
    uint64_t total_pruned = 0;

    uint8_t *child_flat = malloc(total);

    while (!interrupted) {
        /* Find highest non-empty stack */
        int hi = -1;
        for (int i = TD_MAX_PRIORITY - 1; i >= 0; i--) {
            if (stacks[i].count > 0) { hi = i; break; }
        }
        if (hi < 0) break;

        /* Pop maze from highest stack */
        uint8_t *data = ps_pop(&stacks[hi]);
        total_popped++;

        /* Load into maze and solve */
        maze_set_from_array(m, data);

        int len;
        State *tmp_path = NULL;
        int tmp_path_len = 0;
        if (use_bfs) {
            len = solve_bfs_len(m);
        } else {
            /* Start IDDFS from depth hi: parent had path length hi,
             * removing a port can only increase it */
            len = solve_from(m, hi, &tmp_path, &tmp_path_len);
        }

        if (len < 0) {
            /* Unreachable: discard */
            free(data);
            free(tmp_path);
            total_pruned++;
            goto td_progress;
        }

        total_solved++;

        /* Update best */
        if (len > best_len) {
            if (use_bfs)
                solve_bfs(m, &tmp_path, &tmp_path_len);
            best_len = len;
            if (best) maze_destroy(best);
            best = maze_clone(m);
            free(best_path);
            best_path = tmp_path;
            best_path_len = tmp_path_len;
            tmp_path = NULL;
            fprintf(stderr, "[pop %llu, stack %d] new best: length %d\n",
                    (unsigned long long)total_popped, hi, best_len);
            fprintf(stderr, "  ");
            maze_fprint(stderr, best);
            fprintf(stderr, "  ");
            path_fprint(stderr, best_path, best_path_len);
            if (max_len > 0 && best_len >= max_len) {
                free(data);
                free(tmp_path);
                break;
            }
        }
        free(tmp_path);

        /* Generate children: remove one active port at a time */
        int stack_idx = len < TD_MAX_PRIORITY ? len : TD_MAX_PRIORITY - 1;
        for (int i = 0; i < total; i++) {
            if (!data[i]) continue;

            /* Create child: remove port i */
            memcpy(child_flat, data, total);
            child_flat[i] = 0;

            /* Normalize child */
            maze_set_from_array(m, child_flat);
            maze_normalize(m);
            maze_to_flat(m, child_flat);

            /* Dedup */
            if (seen_contains(&seen, child_flat)) continue;

            /* Abstract reachability pruning */
            if (!has_abstract_path(m)) {
                total_pruned++;
                continue;
            }

            seen_insert(&seen, child_flat);
            ps_push(&stacks[stack_idx], child_flat, total);
        }

        free(data);

    td_progress:
        if (total_popped % 10000 == 0) {
            /* Build stack size summary string */
            char stackinfo[1024];
            int pos = 0;
            int first = 1;
            for (int i = 0; i < TD_MAX_PRIORITY && pos < 900; i++) {
                if (stacks[i].count > 0) {
                    pos += snprintf(stackinfo + pos, sizeof(stackinfo) - pos,
                                    "%s%d:%d", first ? "" : ",", i, stacks[i].count);
                    first = 0;
                }
            }
            if (first) snprintf(stackinfo, sizeof(stackinfo), "(empty)");
            fprintf(stderr, "[topdown] popped=%llu solved=%llu pruned=%llu seen=%d best=%d stack={%s}\n",
                    (unsigned long long)total_popped,
                    (unsigned long long)total_solved,
                    (unsigned long long)total_pruned,
                    seen.count, best_len, stackinfo);
        }
    }

    free(flat);
    free(child_flat);
    for (int i = 0; i < TD_MAX_PRIORITY; i++)
        ps_free(&stacks[i]);
    free(stacks);
    seen_free(&seen);

    if (interrupted)
        fprintf(stderr, "\nInterrupted by SIGINT.\n");

    fprintf(stderr, "Top-down complete: %llu popped, %llu solved, %llu pruned, seen=%d, best=%d\n",
            (unsigned long long)total_popped,
            (unsigned long long)total_solved,
            (unsigned long long)total_pruned,
            seen.count, best_len);

    if (best) {
        result.best_maze     = best;
        result.best_length   = best_len;
        result.best_path     = best_path;
        result.best_path_len = best_path_len;
    }

    maze_destroy(m);
    sigaction(SIGINT, &old_sa, NULL);
    return result;
}
