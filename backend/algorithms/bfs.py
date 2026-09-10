"""
Breadth-First Search (BFS)
───────────────────────────
Guarantees shortest path in unweighted / unit-weight graphs.
Time:  O(V + E)
Space: O(V)

Uses a deque for O(1) enqueue/dequeue.
"""
from __future__ import annotations
import time
from collections import deque
from typing import Union
from .graph import AdjacencyListGraph, AdjacencyMatrixGraph


def bfs(
    graph: Union[AdjacencyListGraph, AdjacencyMatrixGraph],
    source: int,
    target: int,
    rows: int,
    cols: int,
) -> dict:
    n = graph.n
    prev = [-1] * n
    visited = [False] * n
    visited[source] = True

    queue: deque[int] = deque()
    queue.append(source)

    visited_order: list[int] = []

    t_start = time.perf_counter()

    found = False
    while queue:
        u = queue.popleft()
        visited_order.append(u)

        if u == target:
            found = True
            break

        for v, _ in graph.neighbors(u):
            if not visited[v]:
                visited[v] = True
                prev[v] = u
                queue.append(v)

    elapsed_ms = (time.perf_counter() - t_start) * 1000
    path = _reconstruct(prev, source, target) if found else []

    return {
        "algorithm": "bfs",
        "visited_order": visited_order,
        "path": path,
        "cost": float(len(path) - 1) if path else -1,
        "nodes_visited": len(visited_order),
        "path_length": len(path),
        "time_ms": round(elapsed_ms, 4),
        "found": found,
    }


def _reconstruct(prev: list[int], source: int, target: int) -> list[int]:
    path, cur = [], target
    while cur != -1:
        path.append(cur)
        if cur == source:
            break
        cur = prev[cur]
    if not path or path[-1] != source:
        return []
    path.reverse()
    return path
