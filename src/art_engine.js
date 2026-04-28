// ──────────────────────────────────────────────────────────────────────────
// art_engine.js — turns paths into art, on a 2d canvas.
//
// One pure rendering pipeline. Given a list of path objects + a Leaflet map
// (for projection) + a style id + a transition value t, draw to ctx.
//
// Path object shape:
//   { id, coords: [[lon,lat], ...], color, weight, kind, label, feeling }
//
// Style ids: 'watercolor' | 'bauhaus' | 'geometric' | 'inkline'
//          | 'stained' | 'topo' | 'riso'
//
// Each style gets the same input: a list of `analyzedPaths` (path + character
// metrics + projected pixel polyline) plus a render context. They draw onto
// the canvas in their own way.
// ──────────────────────────────────────────────────────────────────────────

(function (root) {
  'use strict';

  // ── geometry helpers ────────────────────────────────────────────────────
  function pixelLength(pts) {
    let s = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i-1][0], dy = pts[i][1] - pts[i-1][1];
      s += Math.sqrt(dx*dx + dy*dy);
    }
    return s;
  }
  function bbox(pts) {
    let xMin=Infinity,yMin=Infinity,xMax=-Infinity,yMax=-Infinity;
    for (const p of pts) {
      if (p[0] < xMin) xMin = p[0]; if (p[0] > xMax) xMax = p[0];
      if (p[1] < yMin) yMin = p[1]; if (p[1] > yMax) yMax = p[1];
    }
    return { xMin, yMin, xMax, yMax, w: xMax - xMin, h: yMax - yMin };
  }
  function centroid(pts) {
    let x = 0, y = 0;
    for (const p of pts) { x += p[0]; y += p[1]; }
    return [x / pts.length, y / pts.length];
  }
  // Angle change per segment, summed — high = squiggly, low = straight
  function curvature(pts) {
    if (pts.length < 3) return 0;
    let total = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const ax = pts[i][0] - pts[i-1][0], ay = pts[i][1] - pts[i-1][1];
      const bx = pts[i+1][0] - pts[i][0], by = pts[i+1][1] - pts[i][1];
      const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
      if (la < 0.0001 || lb < 0.0001) continue;
      const cos = (ax*bx + ay*by) / (la*lb);
      total += Math.acos(Math.max(-1, Math.min(1, cos)));
    }
    return total;
  }
  // Distance from start to end vs total length — low ratio = wandering / loopy
  function loopiness(pts) {
    if (pts.length < 2) return 0;
    const start = pts[0], end = pts[pts.length-1];
    const direct = Math.hypot(end[0]-start[0], end[1]-start[1]);
    const total = pixelLength(pts);
    if (total < 0.0001) return 0;
    return 1 - (direct / total); // 0 = straight, 1 = loops back to start
  }

  // ── analyze a list of paths against the current map projection ─────────
  function analyzePaths(rawPaths, leafletMap) {
    const out = [];
    for (const p of rawPaths) {
      if (!p.coords || p.coords.length < 2) continue;
      // Project lon/lat → container px relative to map's container
      const pts = [];
      for (const [lon, lat] of p.coords) {
        const pt = leafletMap.latLngToContainerPoint([lat, lon]);
        pts.push([pt.x, pt.y]);
      }
      if (pts.length < 2) continue;
      const bb = bbox(pts);
      const len = pixelLength(pts);
      const curv = curvature(pts);
      const loop = loopiness(pts);
      out.push({
        ...p,
        pts,
        bbox: bb,
        centroid: centroid(pts),
        len,
        curvature: curv,
        loopiness: loop,
        // characterShape: best-fit primitive for this path
        // long-and-straight ratio: high = elongated, low = compact
        elongation: bb.w === 0 || bb.h === 0 ? 1 : Math.max(bb.w, bb.h) / Math.min(bb.w, bb.h),
      });
    }
    return out;
  }

  // ── color helpers ──────────────────────────────────────────────────────
  function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return [42, 33, 24];
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba([r, g, b], a) { return `rgba(${r},${g},${b},${a})`; }

  // Bauhaus palette
  const BAUHAUS = ['#d23120', '#1656a8', '#f5c518', '#1a1a1a', '#ffffff', '#3c8c5b'];
  // Mid-century palette (softer)
  const MIDCEN = ['#d97757', '#e8b04a', '#6b8e6f', '#5a7a8e', '#c45a82', '#3a3a3a', '#f0e6d2'];
  // Riso palette
  const RISO = ['#e94e3a', '#1f6fb4', '#f5c518', '#2aa44a', '#1a1a1a'];

  // pick palette color from path id (stable but pseudo-random)
  function stableColor(palette, key) {
    let h = 0;
    const s = String(key || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }

  // ── paper texture (cached) ─────────────────────────────────────────────
  let _paperPattern = null;
  function makePaper(ctx) {
    if (_paperPattern) return _paperPattern;
    const c = document.createElement('canvas');
    c.width = 220; c.height = 220;
    const cx = c.getContext('2d');
    // Base off-white
    cx.fillStyle = '#fdfaf3';
    cx.fillRect(0, 0, 220, 220);
    // Tiny grain dots (paper fibers)
    for (let i = 0; i < 4200; i++) {
      const x = Math.random() * 220, y = Math.random() * 220;
      const v = Math.random();
      if (v < 0.5) cx.fillStyle = `rgba(180,165,135,${0.04 + Math.random() * 0.06})`;
      else if (v < 0.85) cx.fillStyle = `rgba(120,100,75,${0.03 + Math.random() * 0.04})`;
      else cx.fillStyle = `rgba(255,255,255,${0.20 + Math.random() * 0.20})`;
      cx.fillRect(x, y, 1, 1);
    }
    // A few faint long fibers
    for (let i = 0; i < 60; i++) {
      cx.strokeStyle = `rgba(140,120,90,${0.03 + Math.random() * 0.04})`;
      cx.lineWidth = 0.6;
      cx.beginPath();
      const x = Math.random() * 220, y = Math.random() * 220;
      const a = Math.random() * Math.PI * 2;
      const len = 8 + Math.random() * 22;
      cx.moveTo(x, y);
      cx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      cx.stroke();
    }
    _paperPattern = ctx.createPattern(c, 'repeat');
    return _paperPattern;
  }

  // ── seeded PRNG so each path's "random" wobble is stable across redraws
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      let r = t;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedFor(p) {
    let h = 0;
    const s = String(p.id || p.label || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h || 1;
  }

  // expose
  root.ArtEngine = {
    analyzePaths, pixelLength, bbox, centroid, curvature, loopiness,
    hexToRgb, rgba, stableColor,
    BAUHAUS, MIDCEN, RISO,
    makePaper, mulberry32, seedFor,
  };
})(window);
