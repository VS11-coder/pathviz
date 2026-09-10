/**
 * animator.js — Step-by-step animation engine
 *
 * Accepts visited_order + path arrays from the API and
 * animates them onto the grid with configurable speed.
 */

class Animator {
  constructor(grid) {
    this.grid = grid;
    this.speedMultiplier = 5;   // 1–10
    this.isRunning = false;
    this._raf = null;
    this._queue = [];
    this._queueIdx = 0;
    this._onDone = null;
  }

  // ── Speed ────────────────────────────────────────────────────
  // Base delay between frames in ms (inverse of speed)
  get _baseDelay() {
    // Speed 1 = 80ms/step, Speed 10 = 2ms/step
    return Math.max(2, Math.round(80 / this.speedMultiplier));
  }

  setSpeed(v) {
    this.speedMultiplier = Math.max(1, Math.min(10, v));
  }

  // ── Run animation ────────────────────────────────────────────
  animate(result, cols, onDone) {
    this.stop();
    this.grid.clearOverlays();
    this._onDone = onDone || (() => {});
    this.isRunning = true;

    const visited = result.visited_order || [];
    const path    = result.path || [];

    // Build a flat queue: visited steps then path steps
    this._queue = [
      ...visited.map(idx => ({ idx, type: 'visited' })),
      ...path.map(idx    => ({ idx, type: 'path' })),
    ];
    this._queueIdx = 0;
    this._cols = cols;
    this._lastTime = null;
    this._accumulated = 0;

    this._tick(performance.now());
  }

  _tick(now) {
    if (!this.isRunning) return;

    if (this._lastTime === null) this._lastTime = now;
    const dt = now - this._lastTime;
    this._lastTime = now;
    this._accumulated += dt;

    const delay = this._baseDelay;
    const steps = Math.floor(this._accumulated / delay);
    this._accumulated -= steps * delay;

    let advanced = 0;
    while (advanced < steps && this._queueIdx < this._queue.length) {
      const { idx, type } = this._queue[this._queueIdx++];
      this.grid.addOverlay(idx, type, null, this._cols);
      advanced++;
    }

    if (this._queueIdx >= this._queue.length) {
      this.isRunning = false;
      this._onDone();
      return;
    }

    this._raf = requestAnimationFrame(t => this._tick(t));
  }

  stop() {
    this.isRunning = false;
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  // ── Instant render (no animation) ───────────────────────────
  renderInstant(result, cols) {
    this.stop();
    this.grid.clearOverlays();
    const visited = result.visited_order || [];
    const path    = result.path || [];
    visited.forEach(idx => this.grid.addOverlay(idx, 'visited', null, cols));
    path.forEach(idx    => this.grid.addOverlay(idx, 'path',    null, cols));
  }
}
