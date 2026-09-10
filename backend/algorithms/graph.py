"""
Graph representations:
  - AdjacencyListGraph   (efficient for sparse grids)
  - AdjacencyMatrixGraph (efficient for dense graphs)
  - UnionFind            (Disjoint Set Union with path compression + rank)
"""
from __future__ import annotations
from typing import Iterator, List, Tuple, Optional


# ─────────────────────────────────────────────────────────────────────────────
#  Adjacency List Graph
# ─────────────────────────────────────────────────────────────────────────────
class AdjacencyListGraph:
    """Directed weighted graph stored as adjacency list."""

    def __init__(self, num_nodes: int):
        self.n = num_nodes
        self._adj: list[list[tuple[int, float]]] = [[] for _ in range(num_nodes)]

    def add_edge(self, u: int, v: int, weight: float = 1.0) -> None:
        self._adj[u].append((v, weight))

    def add_undirected_edge(self, u: int, v: int, weight: float = 1.0) -> None:
        self._adj[u].append((v, weight))
        self._adj[v].append((u, weight))

    def neighbors(self, u: int) -> list[tuple[int, float]]:
        return self._adj[u]

    def num_edges(self) -> int:
        return sum(len(adj) for adj in self._adj)

    def all_edges(self) -> Iterator[Tuple[int, int, float]]:
        for u, neighbors in enumerate(self._adj):
            for v, w in neighbors:
                yield u, v, w


# ─────────────────────────────────────────────────────────────────────────────
#  Adjacency Matrix Graph
# ─────────────────────────────────────────────────────────────────────────────
class AdjacencyMatrixGraph:
    """Directed weighted graph stored as adjacency matrix (dense)."""

    INF = float("inf")

    def __init__(self, num_nodes: int):
        self.n = num_nodes
        self._mat: list[list[float]] = [
            [self.INF] * num_nodes for _ in range(num_nodes)
        ]
        for i in range(num_nodes):
            self._mat[i][i] = 0.0

    def add_edge(self, u: int, v: int, weight: float = 1.0) -> None:
        self._mat[u][v] = weight

    def add_undirected_edge(self, u: int, v: int, weight: float = 1.0) -> None:
        self._mat[u][v] = weight
        self._mat[v][u] = weight

    def neighbors(self, u: int) -> list[tuple[int, float]]:
        return [
            (v, w)
            for v, w in enumerate(self._mat[u])
            if w != self.INF and v != u
        ]

    def num_edges(self) -> int:
        return sum(
            1
            for i in range(self.n)
            for j in range(self.n)
            if i != j and self._mat[i][j] != self.INF
        )

    def all_edges(self) -> Iterator[Tuple[int, int, float]]:
        for u in range(self.n):
            for v in range(self.n):
                if u != v and self._mat[u][v] != self.INF:
                    yield u, v, self._mat[u][v]


# ─────────────────────────────────────────────────────────────────────────────
#  Union-Find (Disjoint Set Union)
# ─────────────────────────────────────────────────────────────────────────────
class UnionFind:
    """
    DSU with path compression and union by rank.
    O(α(n)) ≈ O(1) amortised per operation.
    Supports:
      - Connected-component queries
      - Cycle detection
    """

    def __init__(self, n: int):
        self._parent = list(range(n))
        self._rank = [0] * n
        self._components = n

    def find(self, x: int) -> int:
        """Find root with path compression (iterative)."""
        root = x
        while self._parent[root] != root:
            root = self._parent[root]
        # Path compression
        while self._parent[x] != root:
            self._parent[x], x = root, self._parent[x]
        return root

    def union(self, x: int, y: int) -> bool:
        """
        Unite components. Returns True if x and y were in different
        components (i.e. the edge did NOT form a cycle).
        """
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False  # cycle detected
        if self._rank[rx] < self._rank[ry]:
            rx, ry = ry, rx
        self._parent[ry] = rx
        if self._rank[rx] == self._rank[ry]:
            self._rank[rx] += 1
        self._components -= 1
        return True

    def connected(self, x: int, y: int) -> bool:
        return self.find(x) == self.find(y)

    @property
    def num_components(self) -> int:
        return self._components

    def has_cycle(self, edges: list[tuple[int, int]]) -> bool:
        """Returns True if the edge list contains a cycle (undirected)."""
        uf = UnionFind(len(self._parent))
        for u, v in edges:
            if not uf.union(u, v):
                return True
        return False


# ─────────────────────────────────────────────────────────────────────────────
#  Grid → Graph builder
# ─────────────────────────────────────────────────────────────────────────────
def grid_to_graph(
    grid: list[list[int]],
    allow_diagonal: bool = False,
    graph_type: str = "list",
) -> AdjacencyListGraph | AdjacencyMatrixGraph:
    """
    Convert a 2-D grid (0 = open, 1 = wall) to a weighted graph.
    Node index = row * cols + col.
    """
    rows, cols = len(grid), len(grid[0])
    n = rows * cols

    if graph_type == "matrix":
        g: AdjacencyListGraph | AdjacencyMatrixGraph = AdjacencyMatrixGraph(n)
    else:
        g = AdjacencyListGraph(n)

    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    if allow_diagonal:
        directions += [(-1, -1), (-1, 1), (1, -1), (1, 1)]

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1:
                continue
            u = r * cols + c
            for dr, dc in directions:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                    v = nr * cols + nc
                    w = 1.414 if abs(dr) + abs(dc) == 2 else 1.0
                    g.add_edge(u, v, w)

    return g
