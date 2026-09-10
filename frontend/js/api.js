/**
 * api.js — Thin HTTP client for the PathViz backend
 */

const API_BASE = '';

const Api = {
  async run(payload) {
    const res = await fetch(`${API_BASE}/api/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },

  async compare(payload) {
    const res = await fetch(`${API_BASE}/api/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },

  async benchmark(sizes = null) {
    const res = await fetch(`${API_BASE}/api/benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sizes }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },

  async maze(rows = 25, cols = 25, algorithm = 'recursive_backtracking') {
    const res = await fetch(`${API_BASE}/api/maze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, cols, algorithm }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },
};
