"""Check Omeometo's source pattern and produce a finite depth-five witness."""
import json
from array import array
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
pattern = np.array([[1, 0, 1, 1], [0, 1, 0, 1], [1, 0, 1, 1], [1, 1, 0, 0]], dtype=np.uint8)
grid = pattern
for _ in range(3): grid = np.kron(grid, pattern)
source = np.array(Image.open(ROOT / 'public/references/source-assets/omeometo-block.png').convert('L'))
assert np.array_equal(grid, source < 128), 'Source and pattern differ'
grid = np.kron(grid, pattern)
width = len(grid)
start, goal = 896 * width + 640, 128 * width + 384
parents = array('i', [-1]) * (width * width)
parents[start] = start
queue = deque([start])
while queue:
 cell = queue.popleft()
 if cell == goal: break
 row, col = divmod(cell, width)
 for next in [cell - width if row else -1, cell + 1 if col + 1 < width else -1,
              cell + width if row + 1 < width else -1, cell - 1 if col else -1]:
  if next >= 0 and parents[next] == -1 and not grid.flat[next]:
   parents[next] = cell; queue.append(next)
assert parents[goal] >= 0
path = [goal]
while path[-1] != start: path.append(parents[path[-1]])
path.reverse()
(ROOT / 'src/data/mazes/omeometo-route.json').write_text(json.dumps(dict(depth=5, states=path), separators=(',', ':')) + '\n')
print(f'Source: 65,536 identical pixels. Finite depth-five route: {len(path) - 1} moves.')
