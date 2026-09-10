/**
 * grid.js — DOM-based interactive grid
 *
 * Cell states: open | wall | source | target | visited | frontier | path
 * 
 * Mouse interactions:
 *   - Left-click + drag → paint (wall/source/target based on active mode)
 *   - Right-click → erase wall
 */

class Grid {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.rows = 25;
    this.cols = 25;
    this.cells = [];       // 2D array of DOM elements
    this.state = [];       // 2D array of cell state strings
    this.source = { r: 2, c: 2 };
    this.target = { r: 22, c: 22 };
    this.mode = 'wall';    // wall | source | target
    this.isPainting = false;
    this.paintValue = 1;   // 1=add wall, 0=remove wall

    this._bindEvents();
  }

  // ── Build ────────────────────────────────────────────────────
  build(rows, cols, stateGrid = null) {
    this.rows = rows;
    this.cols = cols;
    this.cells = [];
    this.state = [];
    this.container.innerHTML = '';

    // Clamp source/target
    this.source.r = Math.min(this.source.r, rows - 1);
    this.source.c = Math.min(this.source.c, cols - 1);
    this.target.r = Math.min(this.target.r, rows - 1);
    this.target.c = Math.min(this.target.c, cols - 1);

    // Compute cell size based on available area
    const wrapper = this.container.parentElement;
    const ww = wrapper.clientWidth  - 2;
    const wh = wrapper.clientHeight - 2;
    const cellPx = Math.max(4, Math.floor(Math.min(ww / cols, wh / rows)) - 1);

    this.container.style.gridTemplateColumns = `repeat(${cols}, ${cellPx}px)`;
    this.container.style.gridTemplateRows    = `repeat(${rows}, ${cellPx}px)`;

    const frag = document.createDocumentFragment();

    for (let r = 0; r < rows; r++) {
      this.cells.push([]);
      const rowState = stateGrid ? stateGrid[r] : new Array(cols).fill(0);
      this.state.push([...rowState]);

      for (let c = 0; c < cols; c++) {
        const el = document.createElement('div');
        el.className = 'cell';
        el.dataset.r = r;
        el.dataset.c = c;
        el.style.width  = cellPx + 'px';
        el.style.height = cellPx + 'px';

        this.cells[r].push(el);
        frag.appendChild(el);
      }
    }

    this.container.appendChild(frag);
    this._renderAll();
  }

  // ── Full render ──────────────────────────────────────────────
  _renderAll() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this._renderCell(r, c);
      }
    }
  }

  _renderCell(r, c) {
    const el = this.cells[r][c];
    if (!el) return;
    // Base class from state
    let cls = 'cell ';
    if (r === this.source.r && c === this.source.c) {
      cls += 'source';
    } else if (r === this.target.r && c === this.target.c) {
      cls += 'target';
    } else if (this.state[r][c] === 1) {
      cls += 'wall';
    } else {
      cls += 'open';
    }
    el.className = cls;
  }

  // ── Cell overlay (visited / frontier / path) ─────────────────
  addOverlay(index, type, rows, cols) {
    const r = Math.floor(index / cols);
    const c = index % cols;
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return;
    if (r === this.source.r && c === this.source.c) return;
    if (r === this.target.r && c === this.target.c) return;
    const el = this.cells[r][c];
    if (el) {
      // Remove previous overlay classes without removing wall/open
      el.classList.remove('visited', 'frontier', 'path');
      el.classList.add(type);
    }
  }

  clearOverlays() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const el = this.cells[r][c];
        if (el) {
          el.classList.remove('visited', 'frontier', 'path');
        }
      }
    }
  }

  clearAll() {
    this.state = Array.from({ length: this.rows }, () => new Array(this.cols).fill(0));
    this._renderAll();
  }

  // ── Grid state getter ────────────────────────────────────────
  getStateGrid() {
    return this.state.map(row => [...row]);
  }

  loadGrid(gridData, src, tgt) {
    // Normalize {row,col} (API) or {r,c} (internal) format
    this.source = { r: src.row ?? src.r ?? 0, c: src.col ?? src.c ?? 0 };
    this.target = { r: tgt.row ?? tgt.r ?? gridData.length - 1, c: tgt.col ?? tgt.c ?? gridData[0].length - 1 };
    this.build(gridData.length, gridData[0].length, gridData);
  }

  // ── Mouse events ─────────────────────────────────────────────
  _bindEvents() {
    this.container.addEventListener('mousedown',  e => this._onDown(e));
    this.container.addEventListener('mouseover',  e => this._onOver(e));
    document.addEventListener(      'mouseup',    () => { this.isPainting = false; });
    this.container.addEventListener('contextmenu',e => { e.preventDefault(); });
    this.container.addEventListener('touchstart', e => this._onTouchStart(e), { passive: false });
    this.container.addEventListener('touchmove',  e => this._onTouchMove(e),  { passive: false });
    this.container.addEventListener('touchend',   () => { this.isPainting = false; });
  }

  _cellAt(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || !el.dataset.r) return null;
    return { r: +el.dataset.r, c: +el.dataset.c, el };
  }

  _onDown(e) {
    e.preventDefault();
    const cell = this._cellAt(e);
    if (!cell) return;

    this.isPainting = true;

    if (this.mode === 'source') {
      this._movePoint('source', cell.r, cell.c);
      this.mode = 'wall'; // auto-revert to wall mode after placing
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('mode-wall').classList.add('active');
      return;
    }

    if (this.mode === 'target') {
      this._movePoint('target', cell.r, cell.c);
      this.mode = 'wall';
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('mode-wall').classList.add('active');
      return;
    }

    // Wall mode
    const isWall = this.state[cell.r][cell.c] === 1;
    this.paintValue = isWall ? 0 : 1; // toggle
    this._applyPaint(cell.r, cell.c);
  }

  _onOver(e) {
    if (!this.isPainting || this.mode !== 'wall') return;
    const cell = this._cellAt(e);
    if (!cell) return;
    this._applyPaint(cell.r, cell.c);
  }

  _onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.isPainting = true;
    this._onDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
  }

  _onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this._onOver({ clientX: touch.clientX, clientY: touch.clientY });
  }

  _applyPaint(r, c) {
    if (r === this.source.r && c === this.source.c) return;
    if (r === this.target.r && c === this.target.c) return;
    this.state[r][c] = this.paintValue;
    this._renderCell(r, c);
  }

  _movePoint(type, r, c) {
    if (r === this.source.r && c === this.source.c) return;
    if (r === this.target.r && c === this.target.c) return;
    const old = this[type];
    this._renderCell(old.r, old.c);
    this[type] = { r, c };
    this.state[r][c] = 0; // clear any wall
    this._renderAll();
  }

  setMode(mode) {
    this.mode = mode;
  }
}
