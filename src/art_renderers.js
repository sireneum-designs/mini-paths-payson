// ──────────────────────────────────────────────────────────────────────────
// art_renderers.js — one function per art style.
//
// Each renderer signature:
//   render(ctx, paths, opts)
//      ctx     — 2d canvas context, already cleared & sized.
//      paths   — output of ArtEngine.analyzePaths()
//      opts    — { width, height, t /* 0..1 art-stage progress */, isExporting }
//
// Renderers should be deterministic for the same inputs (use the seeded RNG
// from ArtEngine.mulberry32 keyed by ArtEngine.seedFor(path)).
// ──────────────────────────────────────────────────────────────────────────

(function (root) {
  'use strict';
  const AE = root.ArtEngine;
  if (!AE) { console.error('art_renderers.js needs art_engine.js loaded first'); return; }

  // Paint white-paper background. `t` controls how fully the white shows
  // (so paths can fade in onto white as the slider moves to art-stage).
  function paintBackground(ctx, w, h, t) {
    // White canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    // Subtle paper texture as the art stage progresses
    if (t > 0.05) {
      const pattern = AE.makePaper(ctx);
      ctx.save();
      ctx.globalAlpha = Math.min(0.65, t * 0.85);
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  // ── helper: stroke a polyline with optional jitter & wobble ────────────
  function jitteredPath(ctx, pts, jitter, rng) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const dx = jitter ? (rng() - 0.5) * jitter : 0;
      const dy = jitter ? (rng() - 0.5) * jitter : 0;
      if (i === 0) ctx.moveTo(pts[i][0] + dx, pts[i][1] + dy);
      else         ctx.lineTo(pts[i][0] + dx, pts[i][1] + dy);
    }
  }
  // Subdivide a polyline so jitter has more sample points
  function densify(pts, maxSeg) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i+1];
      out.push(a);
      const dx = b[0]-a[0], dy = b[1]-a[1];
      const d = Math.hypot(dx, dy);
      const n = Math.max(1, Math.floor(d / maxSeg));
      for (let k = 1; k < n; k++) {
        out.push([a[0] + dx*(k/n), a[1] + dy*(k/n)]);
      }
    }
    out.push(pts[pts.length-1]);
    return out;
  }

  // ─────────────────────────────────────────────────────────────────────
  // 1. WATERCOLOR
  //   Per path:
  //   • 6–10 large blobby "wash" passes, each with a different jitter seed,
  //     low alpha, multiplicative blend → builds up rich pigment on overlap
  //   • 3–4 medium wet edges (slightly darker on the rim)
  //   • 1 wet "pigment line" (thinner, more saturated, follows the path)
  //   • Speckle: a few darker pigment dots near the line
  // Done on regular canvas — no SVG filters, no clipping.
  // ─────────────────────────────────────────────────────────────────────
  function watercolor(ctx, paths, opts) {
    const { width: w, height: h, t } = opts;
    paintBackground(ctx, w, h, t);
    if (t < 0.02) return;

    ctx.save();
    for (const p of paths) {
      if (p.pts.length < 2) continue;
      const rng = AE.mulberry32(AE.seedFor(p));
      const [r, g, b] = AE.hexToRgb(p.color);
      const baseW = (p.weight || 4);

      // Densify so jitter has resolution
      const dense = densify(p.pts, 6);

      // Outer wash — 8 passes, big & soft
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'multiply';
      const passes = 7;
      for (let i = 0; i < passes; i++) {
        const grow = baseW * (4 + i * 1.6);                 // each pass thicker
        const jit = 1.2 + i * 0.6;                          // & wobblier
        const alpha = 0.045 + (1 - i / passes) * 0.06;      // & fainter
        ctx.strokeStyle = AE.rgba([r, g, b], alpha * t);
        ctx.lineWidth = grow;
        jitteredPath(ctx, dense, jit, rng);
        ctx.stroke();
      }

      // Crisper pigment line down the middle
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = AE.rgba([
        Math.max(0, r - 30), Math.max(0, g - 30), Math.max(0, b - 30)
      ], 0.55 * t);
      ctx.lineWidth = baseW * 1.6;
      jitteredPath(ctx, dense, 0.6, rng);
      ctx.stroke();

      // Pigment speckle — small dark dots scattered along the path
      ctx.globalCompositeOperation = 'multiply';
      const speckles = Math.floor(8 + p.len / 80);
      for (let i = 0; i < speckles; i++) {
        const k = Math.floor(rng() * dense.length);
        const px = dense[k][0] + (rng() - 0.5) * baseW * 4;
        const py = dense[k][1] + (rng() - 0.5) * baseW * 4;
        const dotR = (0.6 + rng() * 1.8) * (baseW / 4);
        ctx.fillStyle = AE.rgba([
          Math.max(0, r - 60), Math.max(0, g - 60), Math.max(0, b - 60)
        ], (0.18 + rng() * 0.25) * t);
        ctx.beginPath();
        ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Wet edge — a thin DARKER outline rim (one side only-ish)
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = AE.rgba([
        Math.max(0, r - 70), Math.max(0, g - 60), Math.max(0, b - 50)
      ], 0.18 * t);
      ctx.lineWidth = baseW * 0.8;
      jitteredPath(ctx, dense, 2.0, rng);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }

  // ─────────────────────────────────────────────────────────────────────
  // 2. BAUHAUS / DE STIJL
  //   Each path → one large rectangle filling its bbox (with margin).
  //   Color is picked from BAUHAUS palette stably by id.
  //   Bold black gridlines around each rect. Layered z-order by path length.
  // ─────────────────────────────────────────────────────────────────────
  function bauhaus(ctx, paths, opts) {
    const { width: w, height: h, t } = opts;
    paintBackground(ctx, w, h, t);
    if (t < 0.02) return;

    // Sort longest → shortest so smaller rects stack on top of larger ones
    const sorted = [...paths].sort((a, b) => b.len - a.len);

    ctx.save();
    ctx.globalAlpha = t;
    for (const p of sorted) {
      const rng = AE.mulberry32(AE.seedFor(p));
      const bb = p.bbox;
      const pad = 6;
      const x = bb.xMin - pad, y = bb.yMin - pad;
      const ww = Math.max(20, bb.w + pad * 2), hh = Math.max(20, bb.h + pad * 2);
      const fill = AE.stableColor(AE.BAUHAUS, p.id || p.label);

      // Slight (deterministic) randomization: occasionally split into two rects
      const split = rng() < 0.18 && Math.min(ww, hh) > 60;
      if (split) {
        const horiz = ww > hh;
        const cut = 0.35 + rng() * 0.3;
        if (horiz) {
          const split1 = ww * cut;
          ctx.fillStyle = fill;
          ctx.fillRect(x, y, split1, hh);
          ctx.fillStyle = AE.stableColor(AE.BAUHAUS, (p.id || p.label) + ':2');
          ctx.fillRect(x + split1, y, ww - split1, hh);
        } else {
          const split1 = hh * cut;
          ctx.fillStyle = fill;
          ctx.fillRect(x, y, ww, split1);
          ctx.fillStyle = AE.stableColor(AE.BAUHAUS, (p.id || p.label) + ':2');
          ctx.fillRect(x, y + split1, ww, hh - split1);
        }
      } else {
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, ww, hh);
      }

      // Heavy black border
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, ww, hh);
    }
    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────────────
  // 3. MID-CENTURY GEOMETRIC
  //   Path character → shape. Long+straight = elongated rect/oval.
  //   Loopy = circle. Curvy but not loopy = arc/triangle.
  //   Soft palette, layered with overlap, slight rotation jitter.
  // ─────────────────────────────────────────────────────────────────────
  function geometric(ctx, paths, opts) {
    const { width: w, height: h, t } = opts;
    paintBackground(ctx, w, h, t);
    if (t < 0.02) return;

    // Sort largest → smallest (by bbox area) so smaller shapes sit on top.
    const sorted = [...paths].sort((a, b) => (b.bbox.w * b.bbox.h) - (a.bbox.w * a.bbox.h));

    ctx.save();
    ctx.globalAlpha = t * 0.92;
    for (const p of sorted) {
      const rng = AE.mulberry32(AE.seedFor(p));
      const bb = p.bbox;
      const cx = (bb.xMin + bb.xMax) / 2;
      const cy = (bb.yMin + bb.yMax) / 2;
      const w0 = Math.max(28, bb.w + 16);
      const h0 = Math.max(28, bb.h + 16);
      const r0 = Math.max(w0, h0) / 2;
      const fill = AE.stableColor(AE.MIDCEN, p.id || p.label);
      const rot = (rng() - 0.5) * 0.3; // small rotation

      ctx.fillStyle = fill;
      ctx.strokeStyle = '#2a2118';
      ctx.lineWidth = 1.5;

      // Decide shape
      let shape;
      if (p.loopiness > 0.55)            shape = 'circle';
      else if (p.elongation > 3.5)       shape = 'pill';
      else if (p.curvature > 6)          shape = 'arc';
      else if (p.elongation > 2)         shape = 'rect';
      else                               shape = rng() < 0.5 ? 'triangle' : 'circle';

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      switch (shape) {
        case 'circle': {
          ctx.beginPath();
          ctx.arc(0, 0, r0 * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'pill': {
          // Rounded long rectangle aligned to bbox aspect
          const hor = w0 >= h0;
          const ww = hor ? w0 : h0, hh = hor ? h0 : w0;
          const rad = Math.min(ww, hh) / 2;
          if (!hor) ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(-ww/2 + rad, -hh/2);
          ctx.lineTo(ww/2 - rad, -hh/2);
          ctx.arc(ww/2 - rad, 0, rad, -Math.PI/2, Math.PI/2);
          ctx.lineTo(-ww/2 + rad, hh/2);
          ctx.arc(-ww/2 + rad, 0, rad, Math.PI/2, -Math.PI/2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'rect': {
          ctx.fillRect(-w0/2, -h0/2, w0, h0);
          ctx.strokeRect(-w0/2, -h0/2, w0, h0);
          break;
        }
        case 'arc': {
          // Half-disc / fan
          const start = rng() * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, r0 * 0.85, start, start + Math.PI);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'triangle': {
          ctx.beginPath();
          ctx.moveTo(0, -r0 * 0.85);
          ctx.lineTo(r0 * 0.85, r0 * 0.55);
          ctx.lineTo(-r0 * 0.85, r0 * 0.55);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────────────
  // 4. PEN & INK LINE DRAWING
  //   Just clean black contours, lots of overlap. No fill. The path itself,
  //   drawn with a calligraphic jitter & varied weight.
  //   Some paths get a hatch fill of their bbox (low density).
  // ─────────────────────────────────────────────────────────────────────
  function inkline(ctx, paths, opts) {
    const { width: w, height: h, t } = opts;
    paintBackground(ctx, w, h, t);
    if (t < 0.02) return;

    ctx.save();
    ctx.globalAlpha = t;
    ctx.strokeStyle = 'rgba(20,20,20,0.92)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const p of paths) {
      if (p.pts.length < 2) continue;
      const rng = AE.mulberry32(AE.seedFor(p));
      const dense = densify(p.pts, 4);

      // Two slightly offset passes for a "hand-drawn" hesitation
      const baseW = Math.max(1.0, (p.weight || 3) * 0.45);
      ctx.lineWidth = baseW;
      jitteredPath(ctx, dense, 0.7, rng);
      ctx.stroke();

      ctx.lineWidth = baseW * 0.85;
      ctx.globalAlpha = t * 0.55;
      jitteredPath(ctx, dense, 1.2, rng);
      ctx.stroke();
      ctx.globalAlpha = t;

      // Hatching inside the bbox for ~40% of paths, oriented to elongation
      if (rng() < 0.42 && p.bbox.w > 24 && p.bbox.h > 24) {
        ctx.save();
        ctx.beginPath();
        // Clip to a slightly inflated bbox
        const pad = 4;
        ctx.rect(p.bbox.xMin - pad, p.bbox.yMin - pad, p.bbox.w + pad*2, p.bbox.h + pad*2);
        ctx.clip();
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = 'rgba(20,20,20,0.35)';
        const angle = rng() < 0.5 ? Math.PI / 4 : -Math.PI / 4;
        const cx = (p.bbox.xMin + p.bbox.xMax) / 2;
        const cy = (p.bbox.yMin + p.bbox.yMax) / 2;
        const span = Math.max(p.bbox.w, p.bbox.h) * 1.5;
        const step = 4.5;
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        for (let y = -span; y < span; y += step) {
          ctx.beginPath();
          ctx.moveTo(-span, y);
          ctx.lineTo(span, y);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────────────
  // 5. STAINED GLASS
  //   Each path's bbox becomes a luminous panel with gradient fill.
  //   Heavy black "leading" strokes between panels.
  //   Imagine looking at the map through a stained-glass window.
  // ─────────────────────────────────────────────────────────────────────
  function stained(ctx, paths, opts) {
    const { width: w, height: h, t } = opts;
    // Stained glass uses a darker background
    ctx.fillStyle = '#fafaf6';
    ctx.fillRect(0, 0, w, h);
    if (t < 0.02) return;

    // Sort largest → smallest
    const sorted = [...paths].sort((a, b) => (b.bbox.w * b.bbox.h) - (a.bbox.w * a.bbox.h));

    ctx.save();
    ctx.globalAlpha = t;

    // Pass 1: glowing panels (radial gradient inside each bbox)
    for (const p of sorted) {
      const bb = p.bbox;
      const cx = (bb.xMin + bb.xMax) / 2, cy = (bb.yMin + bb.yMax) / 2;
      const r = Math.max(bb.w, bb.h) * 0.85 + 20;
      const [rr, gg, bb2] = AE.hexToRgb(p.color);
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
      grad.addColorStop(0, AE.rgba([Math.min(255, rr+60), Math.min(255, gg+60), Math.min(255, bb2+60)], 0.95));
      grad.addColorStop(0.5, AE.rgba([rr, gg, bb2], 0.80));
      grad.addColorStop(1, AE.rgba([Math.max(0, rr-20), Math.max(0, gg-20), Math.max(0, bb2-20)], 0.55));
      ctx.fillStyle = grad;
      ctx.fillRect(bb.xMin - 8, bb.yMin - 8, bb.w + 16, bb.h + 16);
    }

    // Pass 2: heavy black leading around each panel
    ctx.strokeStyle = '#0d0d0d';
    ctx.lineWidth = 5;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    for (const p of sorted) {
      const bb = p.bbox;
      ctx.strokeRect(bb.xMin - 8, bb.yMin - 8, bb.w + 16, bb.h + 16);
    }

    // Pass 3: trace the actual path on top in dark gold (the figurative element)
    for (const p of paths) {
      if (p.pts.length < 2) continue;
      ctx.strokeStyle = 'rgba(20,15,5,0.7)';
      ctx.lineWidth = Math.max(2, (p.weight || 3) * 0.7);
      ctx.beginPath();
      for (let i = 0; i < p.pts.length; i++) {
        const [x, y] = p.pts[i];
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────────────
  // 6. TOPOGRAPHIC
  //   Each path = the centerline of a "mountain". Concentric contour rings
  //   around it, fading outward.
  // ─────────────────────────────────────────────────────────────────────
  function topo(ctx, paths, opts) {
    const { width: w, height: h, t } = opts;
    paintBackground(ctx, w, h, t);
    if (t < 0.02) return;

    ctx.save();
    ctx.globalAlpha = t;
    ctx.strokeStyle = 'rgba(60,50,30,0.35)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Each path: draw 6 progressively expanded "buffer" contours.
    // (Approximated by stroking the path with increasing line widths in a
    //  buffer canvas, then thresholding — cheap visual contour effect.)
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const oc = off.getContext('2d');

    const RINGS = 7;
    for (let ring = RINGS; ring >= 1; ring--) {
      // Clear buffer
      oc.clearRect(0, 0, w, h);
      const expand = ring * 9; // px outward
      oc.lineCap = 'round';
      oc.lineJoin = 'round';
      oc.strokeStyle = '#000';
      oc.lineWidth = expand;
      for (const p of paths) {
        if (p.pts.length < 2) continue;
        oc.beginPath();
        for (let i = 0; i < p.pts.length; i++) {
          const [x, y] = p.pts[i];
          if (i === 0) oc.moveTo(x, y); else oc.lineTo(x, y);
        }
        oc.stroke();
      }
      // Edge-only by drawing the buffer outline (we want just the ring)
      ctx.save();
      ctx.globalAlpha = t * (0.18 + (RINGS - ring) * 0.07);
      // Use the buffer as a clipping mask for a stroke
      ctx.drawImage(off, 0, 0);
      ctx.restore();
      // Now overdraw with white slightly smaller so we leave just the ring.
      oc.globalCompositeOperation = 'destination-out';
      oc.lineWidth = Math.max(1, expand - 2.5);
      for (const p of paths) {
        if (p.pts.length < 2) continue;
        oc.beginPath();
        for (let i = 0; i < p.pts.length; i++) {
          const [x, y] = p.pts[i];
          if (i === 0) oc.moveTo(x, y); else oc.lineTo(x, y);
        }
        oc.stroke();
      }
      oc.globalCompositeOperation = 'source-over';
    }

    // Topographic over-layer: draw contour lines (the buffer outlines) in dark
    for (let ring = 1; ring <= RINGS; ring++) {
      oc.clearRect(0, 0, w, h);
      const expand = ring * 9;
      oc.lineCap = 'round';
      oc.lineJoin = 'round';
      oc.strokeStyle = '#3a2e18';
      oc.lineWidth = expand;
      for (const p of paths) {
        if (p.pts.length < 2) continue;
        oc.beginPath();
        for (let i = 0; i < p.pts.length; i++) {
          const [x, y] = p.pts[i];
          if (i === 0) oc.moveTo(x, y); else oc.lineTo(x, y);
        }
        oc.stroke();
      }
      // Erase inside, leaving just a 1.2px line
      oc.globalCompositeOperation = 'destination-out';
      oc.lineWidth = Math.max(0.5, expand - 1.4);
      for (const p of paths) {
        oc.beginPath();
        for (let i = 0; i < p.pts.length; i++) {
          const [x, y] = p.pts[i];
          if (i === 0) oc.moveTo(x, y); else oc.lineTo(x, y);
        }
        oc.stroke();
      }
      oc.globalCompositeOperation = 'source-over';
      // Composite onto main canvas
      ctx.save();
      ctx.globalAlpha = t * (0.55 - ring * 0.05);
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────────────
  // 7. RISOGRAPH
  //   Two-color flat shapes with registration offsets and halftone dots.
  //   Looks like a small-press print.
  // ─────────────────────────────────────────────────────────────────────
  function riso(ctx, paths, opts) {
    const { width: w, height: h, t } = opts;
    // Slightly cream paper
    ctx.fillStyle = '#faf6ec';
    ctx.fillRect(0, 0, w, h);
    if (t < 0.02) return;

    // Two color "plates": offset slightly
    function drawPlate(color, dx, dy, dotPattern) {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = t * 0.85;
      ctx.fillStyle = color;
      // Each path → fat stroke
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const p of paths) {
        if (p.pts.length < 2) continue;
        ctx.lineWidth = (p.weight || 4) * 4;
        ctx.beginPath();
        for (let i = 0; i < p.pts.length; i++) {
          const [x, y] = p.pts[i];
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // Plate 1: red-ish, offset right
    drawPlate(AE.RISO[0], 3, 2);
    // Plate 2: blue, offset left/down
    drawPlate(AE.RISO[1], -3, 4);

    // Halftone dot overlay: scatter small dark dots concentrated near paths
    ctx.save();
    ctx.globalAlpha = t * 0.55;
    ctx.fillStyle = 'rgba(20,20,20,0.55)';
    for (const p of paths) {
      const rng = AE.mulberry32(AE.seedFor(p) ^ 0x9e3779b9);
      const n = Math.floor(p.len / 4);
      for (let i = 0; i < n; i++) {
        const k = Math.floor(rng() * p.pts.length);
        const px = p.pts[k][0] + (rng() - 0.5) * (p.weight || 4) * 6;
        const py = p.pts[k][1] + (rng() - 0.5) * (p.weight || 4) * 6;
        const r = 0.5 + rng() * 1.0;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ── expose ────────────────────────────────────────────────────────────
  AE.renderers = { watercolor, bauhaus, geometric, inkline, stained, topo, riso };
})(window);
