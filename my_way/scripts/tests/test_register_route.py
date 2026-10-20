"""Check stream chunk boundaries, translated repeats and physical detour removal."""
import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from register_route import DeltaRuns, RegisterRoute


def expanded(runs):
    return [step for run in runs for _ in range(run['count']) for step in run['steps']]


class StreamRoutes(unittest.TestCase):
    def test_periods_across_buffer_boundaries_and_partial_tail(self):
        for period in [1, 3, 127, 128]:
            pattern = [(index % 3 - 1, 0, 'W' + str(index)) for index in range(period)]
            deltas = [(0, 1, 'S9')] * 11 + pattern * 1003 + pattern[:period // 2]
            stream = DeltaRuns()
            for delta in deltas:
                stream.push(delta)
                self.assertLessEqual(len(stream.buffer), 255)
            self.assertEqual(expanded(stream.finish()), deltas)
            self.assertLess(sum(len(run['steps']) for run in stream.runs), 3 * period + 12)

    def test_random_nonrepeating_deltas_preserve_order(self):
        rng = random.Random(981)
        deltas = [(rng.randrange(-1, 2), rng.randrange(-1, 2), 'W' + str(rng.randrange(100)))
                  for _ in range(12000)]
        stream = DeltaRuns()
        for delta in deltas:
            stream.push(delta)
        self.assertEqual(expanded(stream.finish()), deltas)

    def test_window_removes_full_state_detours_but_keeps_other_terminals(self):
        stream = RegisterRoute()
        states = [(0, 0, 'W', 0), (1, 0, 'E', 0), (0, 0, 'W', 0), (0, 0, 'W', 1)]
        for state in states:
            stream.push(state)
        route = stream.finish()
        self.assertEqual(route['start'], dict(x=0, y=0, terminal='W0'))
        self.assertEqual(expanded(route['runs']), [(0, 0, 'W1')])
        self.assertEqual(stream.raw_moves, 3)
        self.assertEqual(stream.trimmed_moves, 1)

    def test_large_translated_route_keeps_only_bounded_pending_states(self):
        stream = RegisterRoute()
        for x in range(30000):
            stream.push((x, 0, 'W', 0))
            self.assertLess(len(stream.pending), 4096)
        route = stream.finish()
        self.assertEqual(stream.trimmed_moves, 29999)
        self.assertEqual(route['runs'], [dict(count=29999, steps=[(1, 0, 'W0')])])


if __name__ == '__main__':
    unittest.main()
