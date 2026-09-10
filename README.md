# PathViz — Multi-Algorithm Pathfinding Visualizer

An interactive, browser-based pathfinding visualizer backed by a **Python FastAPI** engine.

## Algorithms Implemented

| Algorithm | Optimal? | Complexity | Notes |
|---|---|---|---|
| **A\*** | ✓ | O((V+E) log V) | Pluggable heuristics (Manhattan, Euclidean, Diagonal) |
| **Dijkstra** | ✓ | O((V+E) log V) | Custom hand-rolled MinHeap |
| **BFS** | ✓ (unweighted) | O(V+E) | Deque-based, shortest hop-count |
| **Bellman-Ford** | ✓ | O(V·E) | Handles negative weights, detects negative cycles |
| **DFS** | ✗ | O(V+E) | Iterative (stack-based), exploratory |
| **Greedy Best-First** | ✗ | O((V+E) log V) | Heuristic-only, fast but suboptimal |

## Data Structures

- **Custom MinHeap** — Binary heap with lazy-deletion decrease-key; used by Dijkstra & A\*
- **Adjacency List Graph** — Sparse-friendly, default for grid pathfinding
- **Adjacency Matrix Graph** — Dense-graph support, switchable in UI
- **Union-Find (DSU)** — Path compression + union-by-rank; used for pre-run connectivity checks

## Features

- 🎨 **Dark glassmorphism UI** — Deep navy with violet/cyan/pink accent palette
- 🖱️ **Interactive grid** — Click/drag to paint walls, move source/target
- 🌀 **Maze generators** — Recursive Backtracking (perfect maze) and Random Walls
- ⚡ **Compare mode** — All 6 algorithms run simultaneously on the same grid
- 📊 **Benchmark mode** — Runtime & nodes-visited charts across grid sizes (10×10 → 50×50)
- 🎚️ **Variable speed** — 1× to 10× animation speed slider
- ⌨️ **Keyboard shortcuts** — `R` to run, `Esc` to stop, `C` to clear path
- 📐 **Grid sizes** — 15×15 to 65×65

## Quick Start

```bash
# Clone / open the project directory, then:
./run.sh
```

The script installs Python dependencies and starts the server. Open **http://localhost:8000** in your browser.

**Manual start:**

```bash
pip3 install -r backend/requirements.txt
cd backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Project Structure

```
├── backend/
│   ├── main.py               # FastAPI app + endpoints
│   ├── benchmark.py          # Cross-algorithm performance suite
│   ├── requirements.txt
│   └── algorithms/
│       ├── min_heap.py       # Custom binary MinHeap
│       ├── graph.py          # AdjacencyList, AdjacencyMatrix, UnionFind
│       ├── dijkstra.py
│       ├── astar.py
│       ├── bellman_ford.py
│       ├── bfs.py
│       ├── dfs.py
│       └── greedy.py
└── frontend/
    ├── index.html
    ├── css/style.css         # Full design system
    └── js/
        ├── app.js            # Main controller
        ├── grid.js           # DOM grid + mouse/touch events
        ├── animator.js       # RAF-based step animator
        ├── api.js            # HTTP client
        ├── benchmark.js      # Canvas chart renderer
        └── controls.js       # UI event wiring
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/run` | Run a single algorithm on a grid |
| POST | `/api/compare` | Run all 6 algorithms on the same grid |
| POST | `/api/benchmark` | Benchmark across grid sizes |
| POST | `/api/maze` | Generate a maze grid |
| GET | `/` | Serve the frontend |
