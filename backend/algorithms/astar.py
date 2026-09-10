"""
A* (A-Star) Algorithm
──────────────────────
Optimal informed search combining actual cost g(n) + heuristic h(n).
Time:  O((V + E) log V) — same as Dijkstra but with far fewer expansions
Space: O(V)

Heuristics:
  - manhattan  : |dx| + |dy|           (4-directional grid)
  - euclidean  : sqrt(dx² + dy²)       (general / diagonal)
  - diagonal   : Chebyshev distance    (8-directional grid)
"""
from __future__ import annotations
import math
import time
from typing import Union
from .min_heap import MinHeap
from .graph import AdjacencyListGraph, AdjacencyMatrixGraph


# ── Heuristics ──────────────────────────────────────────────────────────────

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


# ── Algorithm ────────────────────────────────────────────────────────────────

def astar(
    graph: Union[AdjacencyListGraph, AdjacencyMatrixGraph],
    source: int,
    target: int,
    rows: int,
    cols: int,
    heuristic: str = "manhattan",
) -> dict:
    h_fn = HEURISTICS.get(heuristic, _manhattan)
    n = graph.n
    INF = float("inf")

    g_score = [INF] * n
    g_score[source] = 0.0
    prev = [-1] * n

    heap = MinHeap()
    heap.push(h_fn(source, target, cols), source)

    visited_order: list[int] = []
    closed: set[int] = set()

    t_start = time.perf_counter()

    while not heap.is_empty():
        _, u = heap.pop()

        if u in closed:
            continue
        closed.add(u)
        visited_order.append(u)

        if u == target:
            break

        for v, w in graph.neighbors(u):
            tentative_g = g_score[u] + w
            if tentative_g < g_score[v]:
                g_score[v] = tentative_g
                prev[v] = u
                f = tentative_g + h_fn(v, target, cols)
                heap.push(f, v)

    elapsed_ms = (time.perf_counter() - t_start) * 1000
    path = _reconstruct(prev, source, target)

    return {
        "algorithm": "astar",
        "heuristic": heuristic,
        "visited_order": visited_order,
        "path": path,
        "cost": g_score[target] if g_score[target] != INF else -1,
        "nodes_visited": len(visited_order),
        "path_length": len(path),
        "time_ms": round(elapsed_ms, 4),
        "found": g_score[target] != INF,
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
