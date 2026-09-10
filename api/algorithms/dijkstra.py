"""
Dijkstra's Algorithm
────────────────────
Optimal shortest-path on non-negative weighted graphs.
Time:  O((V + E) log V) with custom MinHeap
Space: O(V)

Returns visited order + reconstructed path + metrics.
"""
from __future__ import annotations
import time
from typing import Union
from .min_heap import MinHeap
from .graph import AdjacencyListGraph, AdjacencyMatrixGraph


def dijkstra(
    graph: Union[AdjacencyListGraph, AdjacencyMatrixGraph],
    source: int,
    target: int,
    rows: int,
    cols: int,
) -> dict:
    n = graph.n
    INF = float("inf")
    dist = [INF] * n
    prev = [-1] * n
    dist[source] = 0.0

    heap = MinHeap()
    heap.push(0.0, source)

    visited_order: list[int] = []
    visited_set: set[int] = set()

    t_start = time.perf_counter()

    while not heap.is_empty():
        d, u = heap.pop()

        if u in visited_set:
            continue
        visited_set.add(u)
        visited_order.append(u)

        if u == target:
            break

        for v, w in graph.neighbors(u):
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                prev[v] = u
                heap.push(nd, v)

    elapsed_ms = (time.perf_counter() - t_start) * 1000

    # Reconstruct path
    path = _reconstruct(prev, source, target)

    return {
        "algorithm": "dijkstra",
        "visited_order": visited_order,
        "path": path,
        "cost": dist[target] if dist[target] != INF else -1,
        "nodes_visited": len(visited_order),
        "path_length": len(path),
        "time_ms": round(elapsed_ms, 4),
        "found": dist[target] != INF,
    }


def _reconstruct(prev: list[int], source: int, target: int) -> list[int]:
    path = []
    cur = target
    while cur != -1:
        path.append(cur)
        if cur == source:
            break
        cur = prev[cur]
    if not path or path[-1] != source:
        return []
    path.reverse()
    return path
