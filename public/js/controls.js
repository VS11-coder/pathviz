/**
 * controls.js — UI event wiring for the Visualizer tab
 * Connects buttons, selects, sliders to app state.
 */

const Controls = {
  selectedAlgo: 'astar',
  selectedHeuristic: 'manhattan',
  graphType: 'list',
  allowDiagonal: false,

  init(app) {
    this.app = app;

    // Algorithm buttons
    document.querySelectorAll('.algo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedAlgo = btn.dataset.algo;
        this._toggleHeuristicSection();
      });
    });

    // Heuristic
    document.querySelectorAll('input[name="heuristic"]').forEach(radio => {
      radio.addEventListener('change', () => { this.selectedHeuristic = radio.value; });
    });

    // Grid size
    document.getElementById('grid-size-select').addEventListener('change', e => {
      const s = +e.target.value;
      app.grid.build(s, s);
      app.animator.stop();
    });

    // Graph type
    document.getElementById('graph-type-select').addEventListener('change', e => {
      this.graphType = e.target.value;
    });

    // Diagonal
    document.getElementById('diagonal-checkbox').addEventListener('change', e => {
      this.allowDiagonal = e.target.checked;
    });

    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        app.grid.setMode(btn.dataset.mode);
      });
    });

    // Maze
    document.getElementById('btn-maze-recursive').addEventListener('click', () =>
      app.generateMaze('recursive_backtracking'));
    document.getElementById('btn-maze-random').addEventListener('click', () =>
      app.generateMaze('random_walls'));

    // Speed
    const speedSlider = document.getElementById('speed-slider');
    const speedLabel  = document.getElementById('speed-label');
    speedSlider.addEventListener('input', () => {
      const v = +speedSlider.value;
      speedLabel.textContent = v + '×';
      app.animator.setSpeed(v);
    });

    // Run / Clear
    document.getElementById('btn-run').addEventListener('click', () => app.run());
    document.getElementById('btn-clear-path').addEventListener('click', () => {
      app.animator.stop();
      app.grid.clearOverlays();
      Controls.resetStats();
    });
    document.getElementById('btn-clear-all').addEventListener('click', () => {
      app.animator.stop();
      app.grid.clearAll();
      Controls.resetStats();
    });

    // Keyboard shortcut
    document.addEventListener('keydown', e => {
      if (e.key === 'r' || e.key === 'R') app.run();
      if (e.key === 'Escape') app.animator.stop();
      if (e.key === 'c') { app.grid.clearOverlays(); Controls.resetStats(); }
    });

    this._toggleHeuristicSection();
  },

  _toggleHeuristicSection() {
    const showHeuristic = ['astar', 'greedy'].includes(this.selectedAlgo);
    document.getElementById('heuristic-section').style.opacity = showHeuristic ? '1' : '0.35';
  },

  resetStats() {
    ['sv-algo', 'sv-visited', 'sv-path', 'sv-cost', 'sv-time', 'sv-status']
      .forEach(id => { document.getElementById(id).textContent = '—'; });
    document.getElementById('sv-status').style.color = '';
  },

  updateStats(result) {
    const algoNames = {
      dijkstra: 'Dijkstra', astar: 'A*', bfs: 'BFS',
      dfs: 'DFS', greedy: 'Greedy', bellman_ford: 'Bellman-Ford',
    };
    document.getElementById('sv-algo').textContent    = algoNames[result.algorithm] || result.algorithm;
    document.getElementById('sv-visited').textContent = result.nodes_visited ?? '—';
    document.getElementById('sv-path').textContent    = result.path_length    || (result.found ? result.path?.length : 0) || '—';
    document.getElementById('sv-cost').textContent    = result.cost >= 0 ? result.cost.toFixed(2) : '—';
    document.getElementById('sv-time').textContent    = result.time_ms != null ? result.time_ms.toFixed(3) + ' ms' : '—';

    const statusEl = document.getElementById('sv-status');
    if (result.found) {
      statusEl.textContent  = '✓ Found';
      statusEl.style.color  = 'var(--accent-green)';
    } else {
      statusEl.textContent  = '✗ No Path';
      statusEl.style.color  = 'var(--accent-pink)';
    }
  },

  setRunning(running) {
    const btn  = document.getElementById('btn-run');
    const icon = document.getElementById('run-btn-icon');
    const text = document.getElementById('run-btn-text');
    if (running) {
      icon.textContent = '■';
      text.textContent = 'Running…';
      btn.style.opacity = '0.75';
    } else {
      icon.textContent = '▶';
      text.textContent = 'Run';
      btn.style.opacity = '1';
    }
  },
};

// ── Theme Toggle ──────────────────────────────────────────────────────────────
const Theme = {
  _key: 'pathviz-theme',

  init() {
    // Apply saved theme (or system preference) on load
    const saved = localStorage.getItem(this._key);
    if (saved) {
      this._apply(saved);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      this._apply('light');
    }

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      this._apply(current === 'light' ? 'dark' : 'light');
    });
  },

  _apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this._key, theme);
  },
};

Theme.init();
