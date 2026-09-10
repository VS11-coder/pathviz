"""
Benchmark engine.
Runs all algorithms on graphs of increasing size/density and
returns timing + nodes-visited metrics for comparison charts.
"""
from __future__ import annotations
import time
import random
from algorithms.graph import AdjacencyListGraph, UnionFind
from algorithms.dijkstra import dijkstra
from algorithms.astar import astar
from algorithms.bellman_ford import bellman_ford
from algorithms.bfs import bfs
from algorithms.dfs import dfs
from algorithms.greedy import greedy


ALGORITHMS = ["dijkstra", "astar", "bellman_ford", "bfs", "dfs", "greedy"]


def _make_grid_graph(rows: int, cols: int, wall_prob: float = 0.25) -> tuple:
    """Generate a random walkable grid and return (graph, source, target)."""
    rng = random.Random(42)
    grid = [
        [1 if rng.random() < wall_prob else 0 for _ in range(cols)]
        for _ in range(rows)
    ]
    # Ensure corners are open
    grid[0][0] = 0
    grid[rows - 1][cols - 1] = 0

    g = AdjacencyListGraph(rows * cols)
    for r in range(rows):
        for c in range(cols):
            if grid[r][c]:
                continue
            u = r * cols + c
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                    g.add_edge(u, nr * cols + nc, 1.0)

    return g, 0, (rows - 1) * cols + (cols - 1), rows, cols


def run_benchmark(sizes: list[int] | None = None) -> dict:
    """
    For each grid size, run all algorithms and collect metrics.
    sizes: list of row/col sizes, e.g. [10, 20, 30, 40, 50]
    """
    if sizes is None:
        sizes = [10, 20, 30, 40, 50]

    results: dict[str, list] = {algo: [] for algo in ALGORITHMS}
    labels: list[str] = []

    for s in sizes:
        labels.append(f"{s}×{s}")
        g, src, tgt, rows, cols = _make_grid_graph(s, s)

        for algo in ALGORITHMS:
            try:
                if algo == "dijkstra":
                    res = dijkstra(g, src, tgt, rows, cols)
                elif algo == "astar":
                    res = astar(g, src, tgt, rows, cols)
                elif algo == "bellman_ford":
                    # BF is expensive on large grids; cap it
                    if s > 25:
                        results[algo].append({"time_ms": None, "nodes_visited": None})
                        continue
                    res = bellman_ford(g, src, tgt, rows, cols)
                elif algo == "bfs":
                    res = bfs(g, src, tgt, rows, cols)
                elif algo == "dfs":
                    res = dfs(g, src, tgt, rows, cols)
                elif algo == "greedy":
                    res = greedy(g, src, tgt, rows, cols)
                else:
                    continue
                results[algo].append({
                    "time_ms": res["time_ms"],
                    "nodes_visited": res["nodes_visited"],
                    "path_length": res["path_length"],
                    "found": res["found"],
                })
            except Exception as e:
                results[algo].append({"time_ms": None, "nodes_visited": None, "error": str(e)})

    return {"labels": labels, "results": results}
