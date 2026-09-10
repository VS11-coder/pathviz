"""
Greedy Best-First Search
─────────────────────────
Pure heuristic search — always expands the node closest to the goal
by heuristic estimate, ignoring actual path cost.
Fast but NOT guaranteed to find the shortest path.
Time:  O((V + E) log V)
Space: O(V)
"""
from __future__ import annotations
import math
import time
from typing import Union
from .min_heap import MinHeap
from .graph import AdjacencyListGraph, AdjacencyMatrixGraph


def _manhattan(u: int, goal: int, cols: int) -> float:
    ur, uc = divmod(u, cols)
    gr, gc = divmod(goal, cols)
    return abs(ur - gr) + abs(uc - gc)


def _euclidean(u: int, goal: int, cols: int) -> float:
    ur, uc = divmod(u, cols)
    gr, gc = divmod(goal, cols)
    return math.sqrt((ur - gr) ** 2 + (uc - gc) ** 2)


def _diagonal(u: int, goal: int, cols: int) -> float:
    ur, uc = divmod(u, cols)
    gr, gc = divmod(goal, cols)
    dx, dy = abs(ur - gr), abs(uc - gc)
    return max(dx, dy) + (math.sqrt(2) - 1) * min(dx, dy)


HEURISTICS = {
    "manhattan": _manhattan,
    "euclidean": _euclidean,
    "diagonal": _diagonal,
}


def greedy(
    graph: Union[AdjacencyListGraph, AdjacencyMatrixGraph],
    source: int,
    target: int,
    rows: int,
    cols: int,
    heuristic: str = "manhattan",
) -> dict:
    h_fn = HEURISTICS.get(heuristic, _manhattan)
    prev = [-1] * graph.n
    visited = [False] * graph.n
    visited[source] = True

    heap = MinHeap()
    heap.push(h_fn(source, target, cols), source)

    visited_order: list[int] = []

    t_start = time.perf_counter()

    found = False
    while not heap.is_empty():
        _, u = heap.pop()

        if visited_order and visited_order[-1] == u:
            pass
        visited_order.append(u)

        if u == target:
            found = True
            break

        for v, _ in graph.neighbors(u):
            if not visited[v]:
                visited[v] = True
                prev[v] = u
                heap.push(h_fn(v, target, cols), v)

    elapsed_ms = (time.perf_counter() - t_start) * 1000
    path = _reconstruct(prev, source, target) if found else []

    return {
        "algorithm": "greedy",
        "heuristic": heuristic,
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
