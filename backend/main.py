"""
FastAPI backend — Multi-Algorithm Pathfinding Visualizer
Endpoints:
  POST /api/run        — run a single algorithm on a grid
  POST /api/compare    — run all algorithms on the same grid
  POST /api/benchmark  — benchmark across grid sizes
  POST /api/maze       — generate a maze grid
  GET  /               — serve frontend
"""
from __future__ import annotations
import random
import math
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional
import os

from algorithms.graph import AdjacencyListGraph, AdjacencyMatrixGraph, UnionFind, grid_to_graph
from algorithms.dijkstra import dijkstra
from algorithms.astar import astar
from algorithms.bellman_ford import bellman_ford
from algorithms.bfs import bfs
from algorithms.dfs import dfs
from algorithms.greedy import greedy
from benchmark import run_benchmark

app = FastAPI(title="PathViz API", version="1.0.0")

# ── Schema ───────────────────────────────────────────────────────────────────

class GridRequest(BaseModel):
    grid: list[list[int]]           # 0=open, 1=wall
    source_row: int
    source_col: int
    target_row: int
    target_col: int
    algorithm: str = "astar"        # dijkstra|astar|bellman_ford|bfs|dfs|greedy
    heuristic: str = "manhattan"    # for astar / greedy
    graph_type: str = "list"        # list | matrix
    allow_diagonal: bool = False


class BenchmarkRequest(BaseModel):
    sizes: Optional[list[int]] = None


class MazeRequest(BaseModel):
    rows: int = Field(default=25, ge=5, le=80)
    cols: int = Field(default=25, ge=5, le=80)
    algorithm: str = "recursive_backtracking"   # recursive_backtracking | random_walls


# ── Helpers ──────────────────────────────────────────────────────────────────

def _build_graph(req: GridRequest):
    grid = req.grid
    rows, cols = len(grid), len(grid[0])
    return (
        grid_to_graph(grid, req.allow_diagonal, req.graph_type),
        rows, cols,
        req.source_row * cols + req.source_col,
        req.target_row * cols + req.target_col,
    )


def _run_algo(algo: str, graph, src, tgt, rows, cols, heuristic: str):
    if algo == "dijkstra":
        return dijkstra(graph, src, tgt, rows, cols)
    elif algo == "astar":
        return astar(graph, src, tgt, rows, cols, heuristic)
    elif algo == "bellman_ford":
        return bellman_ford(graph, src, tgt, rows, cols)
    elif algo == "bfs":
        return bfs(graph, src, tgt, rows, cols)
    elif algo == "dfs":
        return dfs(graph, src, tgt, rows, cols)
    elif algo == "greedy":
        return greedy(graph, src, tgt, rows, cols, heuristic)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown algorithm: {algo}")


# ── Maze Generators ──────────────────────────────────────────────────────────

def _maze_recursive_backtracking(rows: int, cols: int) -> list[list[int]]:
    """Recursive backtracking maze (all walls initially, carve passages)."""
    # Work on a cell grid half the size, then expand
    cr, cc = (rows - 1) // 2, (cols - 1) // 2
    grid = [[1] * cols for _ in range(rows)]

    def idx(r, c):
        return (r * 2 + 1, c * 2 + 1)

    visited = [[False] * cc for _ in range(cr)]
    stack = [(0, 0)]
    visited[0][0] = True
    grid[1][1] = 0

    directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]

    while stack:
        r, c = stack[-1]
        gr, gc = idx(r, c)
        random.shuffle(directions)
        moved = False
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < cr and 0 <= nc < cc and not visited[nr][nc]:
                visited[nr][nc] = True
                # Carve wall between cells
                grid[gr + dr][gc + dc] = 0
                # Carve destination cell
                ngr, ngc = idx(nr, nc)
                grid[ngr][ngc] = 0
                stack.append((nr, nc))
                moved = True
                break
        if not moved:
            stack.pop()

    # Ensure the actual source/target positions connect to the maze
    # The first cell (1,1) is the entry point; (rows-2, cols-2) is the exit
    grid[1][1] = 0
    grid[rows - 2][cols - 2] = 0
    return grid


def _maze_src_tgt(grid: list[list[int]], rows: int, cols: int) -> tuple:
    """Find the first open cell near top-left and bottom-right for source/target."""
    src_r, src_c = 1, 1
    tgt_r, tgt_c = rows - 2, cols - 2
    # Ensure they're open
    grid[src_r][src_c] = 0
    grid[tgt_r][tgt_c] = 0
    return {"row": src_r, "col": src_c}, {"row": tgt_r, "col": tgt_c}


def _maze_random_walls(rows: int, cols: int, density: float = 0.3) -> list[list[int]]:
    grid = [[1 if random.random() < density else 0 for _ in range(cols)] for _ in range(rows)]
    grid[0][0] = 0
    grid[rows - 1][cols - 1] = 0
    return grid


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/api/run")
async def run_algorithm(req: GridRequest):
    graph, rows, cols, src, tgt = _build_graph(req)

    # Connectivity check with Union-Find
    uf = UnionFind(rows * cols)
    grid = req.grid
    for r in range(rows):
        for c in range(cols):
            if grid[r][c]:
                continue
            u = r * cols + c
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                    uf.union(u, nr * cols + nc)

    if not uf.connected(src, tgt):
        return {
            "found": False,
            "visited_order": [],
            "path": [],
            "cost": -1,
            "nodes_visited": 0,
            "path_length": 0,
            "time_ms": 0,
            "algorithm": req.algorithm,
            "error": "Source and target are not connected.",
        }

    result = _run_algo(req.algorithm, graph, src, tgt, rows, cols, req.heuristic)
    result["rows"] = rows
    result["cols"] = cols
    return result


@app.post("/api/compare")
async def compare_algorithms(req: GridRequest):
    graph, rows, cols, src, tgt = _build_graph(req)
    algos = ["dijkstra", "astar", "bfs", "dfs", "greedy", "bellman_ford"]
    results = {}
    for algo in algos:
        try:
            results[algo] = _run_algo(algo, graph, src, tgt, rows, cols, req.heuristic)
        except Exception as e:
            results[algo] = {"error": str(e), "found": False}
    return {"results": results, "rows": rows, "cols": cols}


@app.post("/api/benchmark")
async def benchmark(req: BenchmarkRequest):
    return run_benchmark(req.sizes)


@app.post("/api/maze")
async def generate_maze(req: MazeRequest):
    if req.algorithm == "recursive_backtracking":
        rows = req.rows if req.rows % 2 == 1 else req.rows - 1
        cols = req.cols if req.cols % 2 == 1 else req.cols - 1
        grid = _maze_recursive_backtracking(rows, cols)
        source, target = _maze_src_tgt(grid, rows, cols)
    else:
        rows, cols = req.rows, req.cols
        grid = _maze_random_walls(rows, cols)
        source = {"row": 0, "col": 0}
        target = {"row": rows - 1, "col": cols - 1}

    return {
        "grid": grid,
        "rows": rows,
        "cols": cols,
        "source": source,
        "target": target,
    }


# ── Static files ──────────────────────────────────────────────────────────────

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

@app.get("/{full_path:path}")
async def serve_static(full_path: str):
    file_path = os.path.join(FRONTEND_DIR, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

