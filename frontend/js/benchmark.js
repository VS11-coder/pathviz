/**
 * benchmark.js — Canvas-based chart renderer (no external libs)
 * Renders time and nodes-visited line charts for the benchmark panel.
 */

const ALGO_COLORS = {
  dijkstra:     '#6C63FF',
  astar:        '#00D4FF',
  bfs:          '#3DFFA0',
  dfs:          '#FFB347',
  greedy:       '#FF6B9D',
  bellman_ford: '#A78BFA',
};

const ALGO_LABELS = {
  dijkstra:     'Dijkstra',
  astar:        'A*',
  bfs:          'BFS',
  dfs:          'DFS',
  greedy:       'Greedy',
  bellman_ford: 'Bellman-Ford',
};

class BenchmarkChart {
  constructor(timeCanvasId, nodesCanvasId) {
    this.timeCanvas  = document.getElementById(timeCanvasId);
    this.nodesCanvas = document.getElementById(nodesCanvasId);
    this._resizeCanvases();
  }

  _resizeCanvases() {
    [this.timeCanvas, this.nodesCanvas].forEach(c => {
      if (c) {
        const rect = c.parentElement.getBoundingClientRect();
        c.width  = rect.width  || 600;
        c.height = rect.height - 40 || 280;
      }
    });
  }

  render(data) {
    this._resizeCanvases();
    this._drawChart(this.timeCanvas,  data, 'time_ms',       '⏱ Runtime (ms)');
    this._drawChart(this.nodesCanvas, data, 'nodes_visited',  '🔍 Nodes Visited');
    this._renderTable(data);
  }

  _drawChart(canvas, data, metric, title) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const PAD = { top: 20, right: 20, bottom: 48, left: 60 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top  - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = 'rgba(13,21,38,0.6)';
    ctx.roundRect(0, 0, W, H, 10);
    ctx.fill();

    const labels = data.labels;
    const algos  = Object.keys(data.results);
    const n      = labels.length;

    // Gather all valid values
    const allVals = algos.flatMap(a =>
      (data.results[a] || []).map(d => d[metric]).filter(v => v != null)
    );
    if (allVals.length === 0) return;

    const maxVal = Math.max(...allVals) * 1.12;
    const minVal = 0;

    const xOf = i => PAD.left + (i / (n - 1)) * chartW;
    const yOf = v => PAD.top  + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

    // Grid lines
    const gridLines = 5;
    ctx.strokeStyle = 'rgba(100,140,220,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridLines; i++) {
      const y = PAD.top + (i / gridLines) * chartH;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y);
      ctx.stroke();

      // Y labels
      const val = maxVal - (i / gridLines) * maxVal;
      ctx.fillStyle = 'rgba(127,148,184,0.7)';
      ctx.font = '10px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(val >= 1000 ? (val/1000).toFixed(1)+'k' : val.toFixed(1), PAD.left - 6, y + 4);
    }

    // X labels
    ctx.fillStyle = 'rgba(127,148,184,0.7)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    labels.forEach((lbl, i) => {
      ctx.fillText(lbl, xOf(i), H - PAD.bottom + 16);
    });

    // Lines
    algos.forEach(algo => {
      const series = data.results[algo] || [];
      const color  = ALGO_COLORS[algo] || '#888';
      const pts    = series.map((d, i) => d[metric] != null ? { x: xOf(i), y: yOf(d[metric]) } : null).filter(Boolean);
      if (pts.length < 2) return;

      // Glow shadow
      ctx.shadowColor = color;
      ctx.shadowBlur  = 8;

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        // Smooth bezier
        const cpx = (pts[i-1].x + pts[i].x) / 2;
        ctx.bezierCurveTo(cpx, pts[i-1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.lineJoin    = 'round';
      ctx.stroke();

      // Fill under line
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, yOf(0));
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, yOf(0));
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
      grad.addColorStop(0, color + '30');
      grad.addColorStop(1, color + '00');
      ctx.fillStyle = grad;
      ctx.fill();

      // Dots
      pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur  = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    });

    // Legend
    const legendX = PAD.left;
    const legendY = H - 12;
    let lx = legendX;
    ctx.font = '10px Inter';
    ctx.textAlign = 'left';
    algos.forEach(algo => {
      const vals = (data.results[algo] || []).map(d => d[metric]).filter(v => v != null);
      if (!vals.length) return;
      const color = ALGO_COLORS[algo] || '#888';
      ctx.beginPath();
      ctx.roundRect(lx, legendY - 7, 12, 8, 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = 'rgba(234,240,255,0.7)';
      ctx.fillText(ALGO_LABELS[algo] || algo, lx + 15, legendY);
      lx += ctx.measureText(ALGO_LABELS[algo] || algo).width + 30;
    });
  }

  _renderTable(data) {
    const container = document.getElementById('benchmark-table-container');
    if (!container) return;

    const algos  = Object.keys(data.results);
    const labels = data.labels;

    let html = `<table class="compare-table" style="font-size:0.72rem">
      <thead><tr><th>Algorithm</th>${labels.map(l => `<th>${l}</th>`).join('')}</tr></thead>
      <tbody>`;

    algos.forEach(algo => {
      const series = data.results[algo] || [];
      html += `<tr>
        <td style="display:flex;align-items:center;gap:6px">
          <span style="width:10px;height:10px;border-radius:2px;background:${ALGO_COLORS[algo] || '#888'};display:inline-block;flex-shrink:0"></span>
          ${ALGO_LABELS[algo] || algo}
        </td>`;
      series.forEach(d => {
        if (d.time_ms == null) {
          html += `<td style="color:var(--text-muted)">—</td>`;
        } else {
          html += `<td><span style="font-family:'JetBrains Mono',monospace">${d.time_ms.toFixed(3)} ms</span><br>
            <span style="color:var(--text-muted);font-size:0.6rem">${d.nodes_visited} nodes</span></td>`;
        }
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  }
}
