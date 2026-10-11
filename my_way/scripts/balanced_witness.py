"""Find finite balanced PDA witnesses without enumerating every copy stack."""

def balanced_witness(paths, edges, start, goals):
    indices = {path: i for i, path in enumerate(paths)}
    size = len(paths)
    routes = [[None] * size for _ in paths]
    for i in range(size):
        routes[i][i] = []
    for edge in edges:
        if edge['operation'] == 'walk':
            routes[indices[edge['from']]][indices[edge['to']]] = [edge['id']]
    changed = True
    while changed:
        changed = False
        for enter in edges:
            if enter['operation'] != 'enter':
                continue
            for leave in edges:
                if leave['operation'] != 'exit' or leave['copy'] != enter['copy']:
                    continue
                child = routes[indices[enter['to']]][indices[leave['from']]]
                if child is None:
                    continue
                a, b = indices[enter['from']], indices[leave['to']]
                witness = [enter['id']] + child + [leave['id']]
                if routes[a][b] is None or len(witness) < len(routes[a][b]):
                    routes[a][b] = witness
                    changed = True
        for k in range(size):
            for i in range(size):
                if routes[i][k] is None:
                    continue
                for j in range(size):
                    if routes[k][j] is None:
                        continue
                    witness = routes[i][k] + routes[k][j]
                    if routes[i][j] is None or len(witness) < len(routes[i][j]):
                        routes[i][j] = witness
                        changed = True
    witnesses = [routes[indices[start]][indices[goal]] for goal in goals]
    return min((route for route in witnesses if route is not None), key=len, default=None)
