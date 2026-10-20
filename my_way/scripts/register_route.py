"""Stream a source witness into translated repeats, keeping only a bounded detour window.

The production importer independently rejects any remaining repeated-state detour;
this window is a memory bound, not an assertion that distant detours are impossible.
"""


class DeltaRuns:
    def __init__(self):
        self.buffer = []
        self.runs = []
        self.active = None

    def push(self, delta):
        self.buffer.append(delta)
        self.drain(False)

    def literal(self):
        if self.runs and self.runs[-1]['count'] == 1:
            self.runs[-1]['steps'].append(self.buffer.pop(0))
        else:
            self.runs.append(dict(count=1, steps=[self.buffer.pop(0)]))

    def drain(self, final):
        while self.buffer:
            if self.active:
                length = len(self.active['steps'])
                if len(self.buffer) < length and not final:
                    return
                if self.buffer[:length] == self.active['steps']:
                    self.active['count'] += 1
                    del self.buffer[:length]
                    continue
                self.runs.append(self.active)
                self.active = None
            if len(self.buffer) < 256 and not final:
                return
            for length in range(1, min(128, len(self.buffer) // 2) + 1):
                if self.buffer[:length] == self.buffer[length:2 * length]:
                    self.active = dict(count=2, steps=self.buffer[:length])
                    del self.buffer[:2 * length]
                    break
            else:
                self.literal()

    def finish(self):
        self.drain(True)
        if self.active:
            self.runs.append(self.active)
            self.active = None
        return self.runs


class RegisterRoute:
    def __init__(self):
        self.start = None
        self.pending = []
        self.indices = {}
        self.deltas = DeltaRuns()
        self.raw_moves = -1
        self.trimmed_moves = 0

    def push(self, state):
        self.raw_moves += 1
        if self.start is None:
            self.start = state
        previous = self.indices.get(state)
        if previous is not None:
            for old in self.pending[previous + 1:]:
                del self.indices[old]
            del self.pending[previous + 1:]
        else:
            self.indices[state] = len(self.pending)
            self.pending.append(state)
        if len(self.pending) >= 4096:
            self.flush(2048)

    def flush(self, count):
        for before, after in zip(self.pending[:count], self.pending[1:count + 1]):
            self.deltas.push((after[0] - before[0], after[1] - before[1], after[2] + str(after[3])))
        self.trimmed_moves += count
        del self.pending[:count]
        self.indices = {state: index for index, state in enumerate(self.pending)}

    def finish(self):
        self.flush(len(self.pending) - 1)
        return dict(type='repeatedDirected',
                    start=dict(x=self.start[0], y=self.start[1], terminal=self.start[2] + str(self.start[3])),
                    runs=self.deltas.finish())
