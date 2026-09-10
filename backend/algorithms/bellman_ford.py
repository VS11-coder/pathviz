"""
Bellman-Ford Algorithm
───────────────────────
Shortest paths on graphs with potentially negative weights.
Detects negative-weight cycles.
Time:  O(V · E)
Space: O(V)
"""
from __future__ import annotations
import time
from typing import Union
from .graph import AdjacencyListGraph, AdjacencyMatrixGraph


def bellman_ford(
    graph: Union[AdjacencyListGraph, AdjacencyMatrixGraph],
    source: int,
    target: int,
    rows: int,
    cols: int,
) -> dict:
    n = graph.n
    INF = float("inf")
    dist = [INF] * n
    dist[source] = 0.0
    prev = [-1] * n

    edges = list(graph.all_edges())

    visited_order: list[int] = []
    visited_set: set[int] = set()

    t_start = time.perf_counter()

    # V-1 relaxation passes
    for _ in range(n - 1):
        updated = False
        for u, v, w in edges:
            if dist[u] != INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                prev[v] = u
                updated = True
                if v not in visited_set:
                    visited_set.add(v)
                    visited_order.append(v)
        if not updated:
            break

    # Negative cycle detection
    negative_cycle = False
    for u, v, w in edges:
        if dist[u] != INF and dist[u] + w < dist[v]:
            negative_cycle = True
            break

    elapsed_ms = (time.perf_counter() - t_start) * 1000
    path = _reconstruct(prev, source, target) if not negative_cycle else []

    # Ensure source appears in visited
    if source not in visited_set:
        visited_order.insert(0, source)

    return {
        "algorithm": "bellman_ford",
        "visited_order": visited_order,
        "path": path,
        "cost": dist[target] if dist[target] != INF else -1,
        "nodes_visited": len(visited_order),
        "path_length": len(path),
        "time_ms": round(elapsed_ms, 4),
        "found": dist[target] != INF and not negative_cycle,
        "negative_cycle": negative_cycle,
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
