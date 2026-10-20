#!/usr/bin/env python3
"""
Minsky doubling machine analysis for undirected repeated-maze.

Computes exact path lengths for k-fold y ↦ 2y+1 doubling Minsky machines
and compares with counter pump O(n³) growth.

Machine structure per cycle (start at pc=S):
  S:   x+1       (inc x, 1 step)
  S+1: x+1       (inc x, 1 step)
  S+2: y-1 → S   (dec y, 2 steps; ny fires at y=0)
  S+3: x-1       (dec x, transfer, 1 step)
  S+4: y+1 → S+3 (inc y, transfer, 2 steps)

Drain: y-1 self-loop (2 steps per dec)

Path length per cycle: 10*y_i + 2
Drain: 2*y_final + 1
"""

import subprocess
import sys


def compute_path_length(k):
    """Exact path length for k-fold y ↦ 2y+1 doubling (undirected maze).

    y_0 = 1, y_{i+1} = 2*y_i + 1 = 2^{i+2} - 1

    Per cycle:  10*y_i + 2
      Phase 1 (doubling): 4*y_i - 1
      ny + bridge: 2
      Phase 2 (transfer): 6*y_i + 1
    Drain: 2*y_k + 1
    """
    y = [0] * (k + 1)
    y[0] = 1
    for i in range(1, k + 1):
        y[i] = 1 + 2 * y[i - 1]

    total = 0
    for i in range(k):
        total += 10 * y[i] + 2

    total += 2 * y[k] + 1
    return total, y[k]


def nterm_for_k(k):
    """nterm = 5k + 2."""
    return 5 * k + 2


def counter_pump_length(n):
    """Counter pump path length with w=n-1.

    T = (n-1)(2n²-3n-2) - 3
    """
    return (n - 1) * (2 * n * n - 3 * n - 2) - 3


def generate_maze_string(k):
    """Generate undirected maze string for k-fold y ↦ 2y+1 doubling.

    Returns maze_string.
    """
    normal_ports = []
    nx_ports = []
    ny_ports = []

    # N/S index allocator
    ns_idx = 0

    def alloc_ns():
        nonlocal ns_idx
        t = ns_idx
        ns_idx += 1
        return t

    cycle_starts = []
    ns_for_y_minus = []  # N/S index for each cycle's y-1
    ns_for_y_plus = []   # N/S index for each cycle's y+1

    for ci in range(k):
        if ci == 0:
            S = 0
        else:
            S = 5 * ci + 1
        cycle_starts.append(S)

        # Phase 1: doubling loop
        normal_ports.append(f"W{S}-E{S+2 if ci == 0 else S+1}")
        if ci == 0:
            # Cycle 0: pcs 0, 2, 3, 4, 5 (skip 1 = goal)
            normal_ports.append(f"W{S+2}-E{S+3}")
            t_ym = alloc_ns()
            ns_for_y_minus.append(t_ym)
            normal_ports.append(f"W{S+3}-S{t_ym}")
            normal_ports.append(f"N{t_ym}-W{S}")
            # Phase 2: transfer
            t_yp = alloc_ns()
            ns_for_y_plus.append(t_yp)
            normal_ports.append(f"E{S+4}-W{S+5}")
            normal_ports.append(f"W{S+5}-N{t_yp}")
            normal_ports.append(f"S{t_yp}-W{S+4}")
        else:
            normal_ports.append(f"W{S+1}-E{S+2}")
            t_ym = alloc_ns()
            ns_for_y_minus.append(t_ym)
            normal_ports.append(f"W{S+2}-S{t_ym}")
            normal_ports.append(f"N{t_ym}-W{S}")
            # Phase 2: transfer
            t_yp = alloc_ns()
            ns_for_y_plus.append(t_yp)
            normal_ports.append(f"E{S+3}-W{S+4}")
            normal_ports.append(f"W{S+4}-N{t_yp}")
            normal_ports.append(f"S{t_yp}-W{S+3}")

    # Drain
    D = 5 * k + 1
    t_drain = alloc_ns()
    normal_ports.append(f"W{D}-S{t_drain}")
    normal_ports.append(f"N{t_drain}-W{D}")

    # Bridge exits (ny → bridge → next phase)
    for ci in range(k):
        t_exit = alloc_ns()
        if ci == 0:
            transfer_pc = 4
        else:
            transfer_pc = 5 * ci + 1 + 3
        ny_ports.append(f"N{ns_for_y_minus[ci]}-N{t_exit}")
        normal_ports.append(f"S{t_exit}-W{transfer_pc}")

    # Drain bridge
    t_drain_exit = alloc_ns()
    ny_ports.append(f"N{t_drain}-N{t_drain_exit}")
    normal_ports.append(f"S{t_drain_exit}-W1")

    # nx ports (transfer x=0 → next cycle)
    for ci in range(k):
        if ci == 0:
            xfer_pc = 4
        else:
            xfer_pc = 5 * ci + 1 + 3
        if ci < k - 1:
            next_start = 5 * (ci + 1) + 1
        else:
            next_start = D  # drain
        nx_ports.append(f"E{xfer_pc}-E{next_start}")

    normal_str = ', '.join(normal_ports) if normal_ports else '(none)'
    nx_str = ', '.join(nx_ports) if nx_ports else '(none)'
    ny_str = ', '.join(ny_ports) if ny_ports else '(none)'
    return f"normal: {normal_str}; nx: {nx_str}; ny: {ny_str}"


def main():
    print("=== Minsky ×2 Doubling Machine: Path Length Analysis (Undirected) ===")
    print()
    print("Recurrence: y_0 = 1, y_{k+1} = 1 + 2*y_k => y_k = 2^{k+1} - 1")
    print("Per cycle:  10*y_i + 2 steps")
    print("Drain:      2*y_k + 1 steps")
    print()
    print(f"{'k':>3} {'nterm':>6} {'path_len':>12} {'y_final':>10} {'counter_pump':>15} {'ratio':>10}")
    print("-" * 62)

    crossover_k = None
    for k in range(1, 30):
        T, yf = compute_path_length(k)
        nterm = nterm_for_k(k)
        T_cp = counter_pump_length(nterm)
        ratio = T / T_cp if T_cp > 0 else float('inf')
        print(f"{k:3d} {nterm:6d} {T:12d} {yf:10d} {T_cp:15d} {ratio:10.4f}")
        if crossover_k is None and T > T_cp:
            crossover_k = k

    print()
    if crossover_k:
        T, yf = compute_path_length(crossover_k)
        nterm = nterm_for_k(crossover_k)
        T_cp = counter_pump_length(nterm)
        print(f"Crossover at k={crossover_k}, nterm={nterm}")
        print(f"  Minsky:       {T:>15d}")
        print(f"  Counter pump: {T_cp:>15d}")
    else:
        print("No crossover found in range.")

    print()
    print("=== Growth Orders ===")
    print(f"Minsky ×2:     T ~ 10 * 2^k  [exponential, nterm = 5k+2]")
    print(f"Counter pump:  T = O(n³)      [polynomial in nterm]")
    print()

    print("=== Maze Strings ===")
    for k in range(1, 6):
        maze_str = generate_maze_string(k)
        T, yf = compute_path_length(k)
        nterm = nterm_for_k(k)
        print(f"\nk={k} (nterm={nterm}, path_len={T}, y_final={yf}):")
        print(f"  {maze_str}")


if __name__ == "__main__":
    main()
