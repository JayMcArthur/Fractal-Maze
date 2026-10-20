#!/usr/bin/env python3
"""
Minsky doubling machine analysis for repeated-maze.

Computes exact path lengths for k-fold ×2 doubling Minsky machines
and compares with counter pump O(n³) growth.
"""

def compute_path_length(k):
    """Exact path length for k-fold ×2 doubling.

    Each doubling cycle: y_new = 1 + 2*y_old
    y_k = 2^(k+1) - 1
    """
    y = [0] * (k + 1)
    y[0] = 1
    for i in range(1, k + 1):
        y[i] = 1 + 2 * y[i - 1]

    total = 0
    for i in range(k):
        yi = y[i]
        x_after = 1 + 2 * yi
        transition = 1           # W→N entry
        p1 = 4 * yi              # Phase 1 loop (INC_X×2 + dir_change + DEC_Y) × yi
        ny_catch = 1
        bridge = 1               # S→E (y: 0→1)
        p2 = 3 * (x_after - 1) + 1 + 1  # (DEC_X + dir + INC_Y)×(x-1) + last_DEC_X + nx_catch
        total += transition + p1 + ny_catch + bridge + p2

    # Phase 3: transition + DEC_Y×y_k + ny + bridge + goal
    total += 1 + y[k] + 1 + 1 + 1
    return total, y[k]


def nterm_for_k(k):
    """nterm required for k doubling cycles.

    Index allocation:
      D1: 0-5, 7-11  (gap at 6)
      P3: 12-14
      D2: 15-18, 20-24 (gap at 19)
      D3: 27-30, 32-36 (gap at 31)
      ...
    Pattern: k=1→15, k=2→25, k=3→37, k≥4→37+12*(k-3)
    """
    if k == 1:
        return 15
    elif k == 2:
        return 25
    elif k == 3:
        return 37
    else:
        return 37 + 12 * (k - 3)


def counter_pump_length(n):
    """Counter pump path length with w=n-1.

    T = (n-1)(2n²-3n-2) - 3
    """
    return (n - 1) * (2 * n * n - 3 * n - 2) - 3


def generate_maze_string(k):
    """Generate maze string for k-fold ×2 doubling Minsky machine.

    Returns (maze_string, nterm).
    """
    normal_ports = []
    nx_ports = []
    ny_ports = []

    # Index allocation per doubling cycle
    # D_i: Phase 1 head=a, dir=a+1, inc1=a+2, inc2+dec=a+3
    #       Phase 2 bridge=b, loop=b+1, decx_out=b+2, dir+incy=b+3
    #       nx_catch=c
    # D1: a=2, b=7, c=11
    # D2: a=15, b=20, c=24
    # D3: a=27, b=32, c=36
    # D_i (i>=2): a = 15 + 12*(i-2), b = a+5, c = a+9

    cycle_params = []
    if k >= 1:
        cycle_params.append((2, 7, 11))     # D1
    for i in range(2, k + 1):
        a = 15 + 12 * (i - 2)
        cycle_params.append((a, a + 5, a + 9))

    # Phase 3 indices: always 12, 13, 14
    p3_head = 12
    p3_ny_out = 13
    p3_bridge = 14

    # Start/Goal: idx 0 (E), idx 1 (E)

    for ci, (a, b, c) in enumerate(cycle_params):
        # Entry to Phase 1
        if ci == 0:
            normal_ports.append(f"W0->N{a}")          # Start → D1 Phase 1
        else:
            prev_c = cycle_params[ci - 1][2]
            normal_ports.append(f"W{prev_c}->N{a}")   # Transition from prev cycle

        # Phase 1: N_a→E_{a+1}, W_{a+1}→E_{a+2}, W_{a+2}→N_{a+3}, N_{a+3}→S_{a}
        normal_ports.append(f"N{a}->E{a+1}")
        normal_ports.append(f"W{a+1}->E{a+2}")
        normal_ports.append(f"W{a+2}->N{a+3}")
        normal_ports.append(f"N{a+3}->S{a}")

        # ny catch for Phase 1
        ny_ports.append(f"N{a}->N{b}")

        # Phase 2: S_b→E_{b+1}, E_{b+1}→W_{b+2}, E_{b+2}→N_{b+3}, S_{b+3}→E_{b+1}
        normal_ports.append(f"S{b}->E{b+1}")
        normal_ports.append(f"E{b+1}->W{b+2}")
        normal_ports.append(f"E{b+2}->N{b+3}")
        normal_ports.append(f"S{b+3}->E{b+1}")

        # nx catch for Phase 2
        nx_ports.append(f"E{b+2}->E{c}")

    # Transition from last cycle to Phase 3
    last_c = cycle_params[-1][2]
    normal_ports.append(f"W{last_c}->N{p3_head}")

    # Phase 3: N12→S12, ny: N12→N13, S13→E14, E14→W1
    normal_ports.append(f"N{p3_head}->S{p3_head}")
    ny_ports.append(f"N{p3_head}->N{p3_ny_out}")
    normal_ports.append(f"S{p3_ny_out}->E{p3_bridge}")
    normal_ports.append(f"E{p3_bridge}->W1")

    maze_str = (
        f"normal: {', '.join(normal_ports)}; "
        f"nx: {', '.join(nx_ports)}; "
        f"ny: {', '.join(ny_ports)}"
    )
    nterm = nterm_for_k(k)
    return maze_str, nterm


def main():
    print("=== Minsky ×2 Doubling Machine: Path Length Analysis ===")
    print()
    print("Recurrence: y_0 = 1, y_{k+1} = 1 + 2*y_k => y_k = 2^{k+1} - 1")
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
    print("Minsky ×2:     T = O(2^{n/12})  [exponential in nterm]")
    print("Counter pump:  T = O(n³)         [polynomial in nterm]")
    print()

    print("=== Maze Strings ===")
    for k in range(1, 6):
        maze_str, nterm = generate_maze_string(k)
        T, yf = compute_path_length(k)
        print(f"\nk={k} (nterm={nterm}, path_len={T}, y_final={yf}):")
        print(f"  {maze_str}")


if __name__ == "__main__":
    main()
