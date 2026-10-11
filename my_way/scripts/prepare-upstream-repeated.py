"""Import upstream repeated mazes, including the complete compiler example and independently checked routes."""
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'upstream_sources/koteitan-repeated-maze'
spec = importlib.util.spec_from_file_location('upstream_solver', SOURCE / 'tools/solver/solver.py')
solver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(solver)
rows = []
for file in sorted((SOURCE / 'maze').rglob('*.maze')):
    text = file.read_text().strip()
    path, visited = solver.bfs(solver.parse_maze(text), (0, 0, 'W', 0), 1, 300000)
    rows.append(dict(
        id=file.stem, source=str(file.relative_to(ROOT)), raw=text,
        route=[dict(x=x, y=y, terminal=f'{side}{index}') for x, y, side, index in path] if path else [],
    ))
    print(file.stem, f'{len(path)-1} moves' if path else 'bounded search; no bundled solution', visited, flush=True)
# The committed 3dcp.maze contains only normal rules. Regenerate all four
# sections using the current tools rather than inventing missing boundaries.
source = SOURCE / 'tools/nd-to-2d/examples/cp_n3.hs'
compiled = subprocess.check_output([sys.executable, str(SOURCE / 'tools/nd-to-2d/nd-to-2d.py'), str(source)], text=True)
text = subprocess.check_output([sys.executable, str(SOURCE / 'tools/hs2maze/hs2maze.py')], input=compiled, text=True).strip()
assert all(f'{kind}:' in text for kind in ['normal', 'nx', 'ny', 'zero'])
path, visited = solver.bfs(solver.parse_maze(text), (0, 0, 'W', 0), 1, 300000)
# The current atomic converter binds W0/C0 and C1/W1 at the origin.
valid_path = path and path[-1] == (0, 0, 'W', 1)
rows.append(dict(id='cp-n3-godel', source=str(source.relative_to(ROOT)), raw=text,
                 route=[dict(x=x, y=y, terminal=f'{side}{index}') for x,y,side,index in path] if valid_path else []))
print('cp-n3-godel', f'{len(path)-1} moves' if valid_path else 'bounded search; no bundled solution', visited, flush=True)
(ROOT / 'my_way/src/data/mazes/upstream-repeated.json').write_text(json.dumps(rows, separators=(',', ':')) + '\n')
