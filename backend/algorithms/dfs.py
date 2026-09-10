"""
Depth-First Search (DFS)
─────────────────────────
Explores as deep as possible before backtracking.
NOT guaranteed to find the shortest path.
Useful to visualise exploratory / backtracking behaviour.
Time:  O(V + E)
Space: O(V)  (iterative, stack-based to avoid Python recursion limit)
"""
from __future__ import annotations
import time
from typing import Union
from .graph import AdjacencyListGraph, AdjacencyMatrixGraph


def dfs(
    graph: Union[AdjacencyListGraph, AdjacencyMatrixGraph],
    source: int,
    target: int,
    rows: int,
    cols: int,
) -> dict:
    n = graph.n
    prev = [-1] * n
    visited = [False] * n

    stack: list[int] = [source]
    visited[source] = True

    visited_order: list[int] = []

    t_start = time.perf_counter()

    found = False
    while stack:
        u = stack.pop()
        visited_order.append(u)

        if u == target:
            found = True
            break

        # Push neighbors in reverse order so the first neighbor is explored first
        for v, _ in reversed(graph.neighbors(u)):
            if not visited[v]:
                visited[v] = True
                prev[v] = u
                stack.append(v)

    elapsed_ms = (time.perf_counter() - t_start) * 1000
    path = _reconstruct(prev, source, target) if found else []

    return {
        "algorithm": "dfs",
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
