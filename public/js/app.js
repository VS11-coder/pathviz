/**
 * app.js — Main application entrypoint
 * Initialises grid, animator, controls, compare, benchmark.
 */

// ── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast ${type} show`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.className = 'toast'; }, duration);
}

// ── Compare mini-grid ────────────────────────────────────────────────────────
const ALGO_META = {
  dijkstra:     { label: 'Dijkstra',     color: '#6C63FF', optimal: true  },
  astar:        { label: 'A*',           color: '#00D4FF', optimal: true  },
  bfs:          { label: 'BFS',          color: '#3DFFA0', optimal: true  },
  dfs:          { label: 'DFS',          color: '#FFB347', optimal: false },
  greedy:       { label: 'Greedy',       color: '#FF6B9D', optimal: false },
  bellman_ford: { label: 'Bellman-Ford', color: '#A78BFA', optimal: true  },
};

function buildMiniGrid(containerId, gridState, result, rows, cols) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const visited = new Set(result.visited_order || []);
  const pathSet = new Set(result.path || []);

  // Compute cell size
  const rect = container.getBoundingClientRect();
  const cellPx = Math.max(3, Math.floor(Math.min(rect.width / cols, rect.height / rows)) - 1);

  container.style.display = 'grid';
  container.style.gridTemplateColumns = `repeat(${cols}, ${cellPx}px)`;
  container.style.gap = '1px';

  const src = result._src;
  const tgt = result._tgt;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const el = document.createElement('div');
      el.className = 'mini-cell';
      el.style.width  = cellPx + 'px';
      el.style.height = cellPx + 'px';

      const idx = r * cols + c;
      if (src && r === src.r && c === src.c) {
        el.style.background = 'var(--cell-source)';
      } else if (tgt && r === tgt.r && c === tgt.c) {
        el.style.background = 'var(--cell-target)';
      } else if (gridState[r][c] === 1) {
        el.style.background = '#0f1a2e';
      } else if (pathSet.has(idx)) {
        el.style.background = 'var(--cell-path)';
      } else if (visited.has(idx)) {
        el.style.background = 'rgba(108,99,255,0.45)';
      } else {
        el.style.background = 'var(--cell-open)';
      }
      container.appendChild(el);
    }
  }
}

// ── Main App ─────────────────────────────────────────────────────────────────
const App = {
  grid: null,
  animator: null,
  benchChart: null,
  _lastGridState: null,
  _lastSrc: null,
  _lastTgt: null,

  init() {
    // Grid
    this.grid     = new Grid('grid-container');
    this.animator = new Animator(this.grid);
    this.grid.build(25, 25);

    // Controls
    Controls.init(this);

    // Tab navigation
    document.getElementById('tab-nav').addEventListener('click', e => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('panel-' + btn.dataset.tab);
      if (panel) panel.classList.add('active');
    });

    // Compare tab controls
    document.getElementById('btn-compare-maze').addEventListener('click', () => this.generateMazeForCompare());
    document.getElementById('btn-run-compare').addEventListener('click', () => this.runCompare());

    // Benchmark
    this.benchChart = new BenchmarkChart('chart-time', 'chart-nodes');
    document.getElementById('btn-run-benchmark').addEventListener('click', () => this.runBenchmark());

    // Build initial compare mini-grid cards
    this._buildComparePanelCards();
  },

  // ── Single run ───────────────────────────────────────────────
  async run() {
    if (this.animator.isRunning) {
      this.animator.stop();
      Controls.setRunning(false);
      return;
    }

    Controls.setRunning(true);
    this.grid.clearOverlays();

    const gridState = this.grid.getStateGrid();
    const algo      = Controls.selectedAlgo;
    const payload   = {
      grid: gridState,
      source_row: this.grid.source.r,
      source_col: this.grid.source.c,
      target_row: this.grid.target.r,
      target_col: this.grid.target.c,
      algorithm:  algo,
      heuristic:  Controls.selectedHeuristic,
      graph_type: Controls.graphType,
      allow_diagonal: Controls.allowDiagonal,
    };

    try {
      const result = await Api.run(payload);

      if (result.error) {
        showToast('⚠ ' + result.error, 'error');
        Controls.resetStats();
        Controls.setRunning(false);
        return;
      }

      Controls.updateStats(result);

      this.animator.animate(result, this.grid.cols, () => {
        Controls.setRunning(false);
        if (result.found) {
          showToast(`✓ Path found! ${result.path_length} steps · ${result.time_ms.toFixed(3)} ms`, 'success');
        } else {
          showToast('✗ No path exists between source and target.', 'error');
        }
      });
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to connect to backend. Is it running?', 'error', 5000);
      Controls.setRunning(false);
    }
  },

  // ── Maze generation ──────────────────────────────────────────
  async generateMaze(type = 'recursive_backtracking') {
    const sizeSelect = document.getElementById('grid-size-select');
    const s = +sizeSelect.value;

    const overlay = document.getElementById('loading-overlay');
    const loadText = document.getElementById('loading-text');
    loadText.textContent = 'Generating maze…';
    overlay.style.display = 'flex';

    try {
      const data = await Api.maze(s, s, type);
      this.grid.loadGrid(data.grid, data.source, data.target);
      showToast('🌀 Maze generated!', 'info');
    } catch (err) {
      showToast('❌ Maze generation failed', 'error');
    } finally {
      overlay.style.display = 'none';
    }
  },

  // ── Compare ──────────────────────────────────────────────────
  _buildComparePanelCards() {
    const container = document.getElementById('compare-grid-6');
    container.innerHTML = '';
    const algos = Object.keys(ALGO_META);
    algos.forEach(algo => {
      const meta = ALGO_META[algo];
      const card = document.createElement('div');
      card.className = 'mini-grid-card';
      card.id = `compare-card-${algo}`;
      card.innerHTML = `
        <div class="mini-grid-header">
          <span class="mini-algo-name">
            <span class="mini-algo-dot" style="background:${meta.color}"></span>
            ${meta.label}
          </span>
          <span class="mini-stats" id="mini-stats-${algo}">—</span>
        </div>
        <div class="mini-grid-wrap">
          <div class="mini-grid" id="mini-grid-${algo}"></div>
        </div>`;
      container.appendChild(card);
    });
  },

  async generateMazeForCompare() {
    const overlay  = document.getElementById('loading-overlay');
    const loadText = document.getElementById('loading-text');
    loadText.textContent = 'Generating maze…';
    overlay.style.display = 'flex';

    try {
      const data = await Api.maze(21, 21, 'recursive_backtracking');
      this._compareGrid  = data.grid;
      this._compareSrc   = data.source;
      this._compareTgt   = data.target;
      showToast('🌀 Maze ready — click Run All Algorithms', 'info');
    } catch (err) {
      showToast('❌ Maze generation failed', 'error');
    } finally {
      overlay.style.display = 'none';
    }
  },

  async runCompare() {
    const overlay  = document.getElementById('loading-overlay');
    const loadText = document.getElementById('loading-text');
    loadText.textContent = 'Running all algorithms…';
    overlay.style.display = 'flex';

    // Use either the compare-specific grid or the main grid
    const gridState = this._compareGrid || this.grid.getStateGrid();
    const src       = this._compareSrc  || { row: this.grid.source.r, col: this.grid.source.c };
    const tgt       = this._compareTgt  || { row: this.grid.target.r, col: this.grid.target.c };

    const payload = {
      grid: gridState,
      source_row: src.row ?? src.r,
      source_col: src.col ?? src.c,
      target_row: tgt.row ?? tgt.r,
      target_col: tgt.col ?? tgt.c,
      algorithm:  'astar',
      heuristic:  Controls.selectedHeuristic,
      graph_type: 'list',
    };

    try {
      const data = await Api.compare(payload);
      const rows = data.rows;
      const cols = data.cols;

      // Render mini-grids
      Object.entries(data.results).forEach(([algo, result]) => {
        result._src = { r: payload.source_row, c: payload.source_col };
        result._tgt = { r: payload.target_row, c: payload.target_col };
        buildMiniGrid(`mini-grid-${algo}`, gridState, result, rows, cols);

        // Update mini stats
        const statsEl = document.getElementById(`mini-stats-${algo}`);
        if (statsEl) {
          if (result.found) {
            statsEl.textContent = `${result.nodes_visited} visited · ${result.path_length} path · ${result.time_ms?.toFixed(2)}ms`;
            statsEl.style.color = 'var(--accent-green)';
          } else {
            statsEl.textContent = 'No path';
            statsEl.style.color = 'var(--accent-pink)';
          }
        }
      });

      // Update comparison table
      this._renderCompareTable(data.results);
      showToast('⚡ All algorithms complete!', 'success');
    } catch (err) {
      console.error(err);
      showToast('❌ Compare failed. Is the backend running?', 'error', 5000);
    } finally {
      overlay.style.display = 'none';
    }
  },

  _renderCompareTable(results) {
    const OPTIMAL = { dijkstra: true, astar: true, bfs: true, dfs: false, greedy: false, bellman_ford: true };
    const NAMES   = { dijkstra: 'Dijkstra', astar: 'A*', bfs: 'BFS', dfs: 'DFS', greedy: 'Greedy', bellman_ford: 'Bellman-Ford' };
    const COLORS  = { dijkstra: '#6C63FF', astar: '#00D4FF', bfs: '#3DFFA0', dfs: '#FFB347', greedy: '#FF6B9D', bellman_ford: '#A78BFA' };

    const tbody = document.getElementById('compare-table-body');
    let html = '';

    Object.entries(results).forEach(([algo, r]) => {
      const opt = OPTIMAL[algo];
      html += `<tr>
        <td style="display:flex;align-items:center;gap:8px;font-weight:600">
          <span style="width:10px;height:10px;border-radius:2px;background:${COLORS[algo]};display:inline-block;flex-shrink:0"></span>
          ${NAMES[algo] || algo}
        </td>
        <td>${r.nodes_visited ?? '—'}</td>
        <td>${r.path_length ?? '—'}</td>
        <td style="font-family:'JetBrains Mono',monospace">${r.cost >= 0 ? r.cost.toFixed(2) : '—'}</td>
        <td style="font-family:'JetBrains Mono',monospace">${r.time_ms != null ? r.time_ms.toFixed(4) + ' ms' : '—'}</td>
        <td class="${opt ? 'badge-optimal' : 'badge-suboptimal'}">${opt ? '✓ Yes' : '~ No'}</td>
        <td class="${r.found ? 'badge-found' : 'badge-notfound'}">${r.found ? '✓ Found' : '✗ None'}</td>
      </tr>`;
    });

    tbody.innerHTML = html || '<tr><td colspan="7" class="empty-state">No results</td></tr>';
  },

  // ── Benchmark ────────────────────────────────────────────────
  async runBenchmark() {
    const overlay  = document.getElementById('loading-overlay');
    const loadText = document.getElementById('loading-text');
    const btnText  = document.getElementById('bench-btn-text');

    loadText.textContent = 'Benchmarking… (may take a few seconds)';
    overlay.style.display = 'flex';
    btnText.textContent = '⏳ Running…';

    try {
      const data = await Api.benchmark([10, 20, 30, 40, 50]);
      this.benchChart.render(data);
      showToast('📊 Benchmark complete!', 'success');
    } catch (err) {
      console.error(err);
      showToast('❌ Benchmark failed. Is the backend running?', 'error', 5000);
    } finally {
      overlay.style.display = 'none';
      btnText.textContent = '▶ Run Benchmark';
    }
  },
};

// ── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
