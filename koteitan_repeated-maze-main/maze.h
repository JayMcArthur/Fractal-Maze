/*
 * maze.h -- Maze data structures and operations.
 *
 * A maze is an infinite grid of identical blocks. There are 3 block types:
 *   - normal block at (bx, by) where bx > 0 and by > 0:
 *       Has 4*nterm terminals: E[0..n-1], W[0..n-1], N[0..n-1], S[0..n-1].
 *       Ports connect any pair of terminals: (4*nterm)^2 possible ports.
 *   - nx block at (0, by) where by > 0:
 *       Has nterm E-terminals only: E[0..n-1].
 *       Ports connect distinct E-terminals: nterm*(nterm-1) possible ports.
 *   - ny block at (bx, 0) where bx > 0:
 *       Has nterm N-terminals only: N[0..n-1].
 *       Ports connect distinct N-terminals: nterm*(nterm-1) possible ports.
 *   - Origin (0, 0) does not exist.
 *
 * All normal blocks share the same port configuration, and similarly
 * all nx blocks share the same ports, and all ny blocks share the same ports.
 * Thus a maze is fully specified by 3 port arrays.
 *
 * Terminal identity across blocks:
 *   W[n] @ (bx, by) is identical to E[n] @ (bx-1, by)
 *   S[n] @ (bx, by) is identical to N[n] @ (bx, by-1)
 *
 * Port arrays use one byte per port (0 = absent, 1 = present).
 */
#ifndef MAZE_H
#define MAZE_H

#include <stdint.h>
#include <stdio.h>

/*
 * Terminal direction indices within a normal block.
 * Used to address the normal_ports array: terminal = dir * nterm + idx.
 */
#define TDIR_E 0  /* East  */
#define TDIR_W 1  /* West  */
#define TDIR_N 2  /* North */
#define TDIR_S 3  /* South */

/*
 * Maze -- represents the port configuration shared by all blocks.
 *
 * Fields:
 *   nterm          -- number of terminal indices per direction (e.g. 2)
 *   normal_nports  -- number of ports in a normal block: (4*nterm)^2
 *   nx_nports      -- number of ports in an nx block: nterm*(nterm-1)
 *   ny_nports      -- number of ports in a ny block: nterm*(nterm-1)
 *   total_nports   -- normal_nports + nx_nports + ny_nports
 *   normal_ports   -- port array for normal blocks, indexed as
 *                     [src_dir * nterm + src_idx] * (4*nterm) + [dst_dir * nterm + dst_idx]
 *   nx_ports       -- port array for nx blocks, indexed as
 *                     src_idx * (nterm-1) + adjusted_dst_idx  (excluding self-loops)
 *   ny_ports       -- port array for ny blocks (same indexing as nx_ports)
 */
typedef struct {
    int nterm;
    int normal_nports;
    int nx_nports;
    int ny_nports;
    int total_nports;
    uint8_t *normal_ports;
    uint8_t *nx_ports;
    uint8_t *ny_ports;
} Maze;

/*
 * rng_next -- xorshift64 pseudo-random number generator.
 * Advances *state and returns the new value.
 * State must be non-zero.
 */
static inline uint64_t rng_next(uint64_t *state) {
    uint64_t x = *state;
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    *state = x;
    return x;
}

/* Allocate a new maze with all ports cleared (no connections). */
Maze *maze_create(int nterm);

/* Clear all ports (set to 0) without freeing the maze. */
void maze_clear(Maze *m);

/* Free a maze and its port arrays. Safe to call with NULL. */
void  maze_destroy(Maze *m);

/* Deep-copy a maze including all port data. */
Maze *maze_clone(const Maze *m);

/*
 * Typed port accessors for normal blocks.
 *   sd, si -- source terminal direction (TDIR_*) and index
 *   dd, di -- destination terminal direction (TDIR_*) and index
 * Returns 1 if port exists, 0 otherwise. Set val=1 to enable, 0 to disable.
 */
int  maze_normal_port(const Maze *m, int sd, int si, int dd, int di);
void maze_set_normal_port(Maze *m, int sd, int si, int dd, int di, int val);

/*
 * Typed port accessors for nx blocks (E[si] -> E[di], si != di).
 */
int  maze_nx_port(const Maze *m, int si, int di);
void maze_set_nx_port(Maze *m, int si, int di, int val);

/*
 * Typed port accessors for ny blocks (N[si] -> N[di], si != di).
 */
int  maze_ny_port(const Maze *m, int si, int di);
void maze_set_ny_port(Maze *m, int si, int di, int val);

/*
 * Flat-index port accessors.
 * Ports are laid out contiguously: [normal_ports | nx_ports | ny_ports].
 * idx ranges from 0 to total_nports-1.
 * Useful for hill climbing (flip a random bit by flat index).
 */
int  maze_get_port(const Maze *m, int idx);
void maze_set_port(Maze *m, int idx, int val);
void maze_flip_port(Maze *m, int idx);

/*
 * maze_set_from_array -- bulk-set all ports from a flat byte array.
 * data must have at least total_nports bytes.
 */
void maze_set_from_array(Maze *m, const uint8_t *data);

/*
 * maze_randomize -- set each port independently to 0 or 1 with 50% probability.
 * Uses and advances the xorshift64 state pointed to by rng.
 */
void maze_randomize(Maze *m, uint64_t *rng);

/*
 * maze_fprint -- print maze string representation to the given stream.
 * Format: "normal: E0->N1, ...; nx: E0->E1, ...; ny: N0->N1, ..."
 * Sections with no ports print "(none)".
 */
void  maze_fprint(FILE *fp, const Maze *m);

/* maze_print -- shorthand for maze_fprint(stdout, m). */
void  maze_print(const Maze *m);

/*
 * maze_print_table -- print the normal block ports as a matrix table,
 * and list nx/ny block ports. Rows are source terminals, columns are
 * destination terminals. '*' = port present, '.' = absent.
 */
void  maze_print_table(const Maze *m);

/*
 * maze_detect_nterm -- scan a maze string and return the detected nterm.
 * Returns max terminal index + 1, minimum 2.
 */
int maze_detect_nterm(const char *str);

/*
 * maze_parse -- create a maze from its string representation.
 * Format: "normal: E0->N1, ...; nx: E0->E1; ny: (none)"
 * Returns a new Maze on success, NULL on parse failure.
 */
Maze *maze_parse(int nterm, const char *str);

/*
 * maze_normalize -- normalize terminal indices in-place.
 *
 * The maze has two independent index symmetries:
 *   - E/W indices: 0 and 1 are fixed (start/goal), indices 2+ can be permuted
 *   - N/S indices: all indices can be permuted freely
 *
 * Normalization assigns indices by first-appearance order when scanning
 * ports in flat index order (normal ports, then nx, then ny).
 */
void maze_normalize(Maze *m);

/*
 * maze_is_normalized -- return 1 if the maze is already in canonical form.
 *
 * Clones the maze, normalizes the clone, and compares port arrays.
 * Returns 1 if normalize(m) == m, 0 otherwise.
 */
int maze_is_normalized(const Maze *m);

#endif
