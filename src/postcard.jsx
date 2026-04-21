// Postcard component — renders a single postcard with hand-drawn front
// (a stylized "sketch" that stands in for the scanned community drawing)
// and a back with the handwritten prompt response.
//
// The postcard flips on click (or hover on desktop) and can be opened
// in a large modal via the parent app.

const { useState } = React;

// ── Palettes ────────────────────────────────────────────────────────────────
// Each postcard picks one; keeps the collection visually varied but coherent.
const PC_PALETTES = {
  forest: { bg: 'oklch(93% 0.03 140)', ink: 'oklch(32% 0.04 140)', accent: 'oklch(55% 0.09 150)' },
  sky:    { bg: 'oklch(93% 0.03 230)', ink: 'oklch(30% 0.04 250)', accent: 'oklch(58% 0.08 230)' },
  ochre:  { bg: 'oklch(94% 0.04 80)',  ink: 'oklch(32% 0.04 70)',  accent: 'oklch(62% 0.10 70)'  },
  dusk:   { bg: 'oklch(91% 0.02 300)', ink: 'oklch(30% 0.04 290)', accent: 'oklch(55% 0.07 300)' },
};

// ── Sketches ────────────────────────────────────────────────────────────────
// Hand-drawn scenes — one per postcard id/location. Kept extremely simple
// (hills, a few trees, a horizon line) to feel like a visitor's pencil sketch.
// We pass palette so the sketch shares ink color with the rest of the card.

function sketchWobble(seed) {
  const s = Math.sin(seed * 91.53 + 13.7) * 14371.31;
  return (s - Math.floor(s)) - 0.5;
}

function HillPath({ y, amp, seed, stroke, dash, width=2 }) {
  const pts = [];
  for (let x = 0; x <= 500; x += 20) {
    const w = sketchWobble(seed + x * 0.01) * amp * 0.4;
    const h = Math.sin(x * 0.012 + seed) * amp;
    pts.push([x, y + h + w]);
  }
  let d = `M -10 ${y + 40} L ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i+1][0]) / 2;
    const my = (pts[i][1] + pts[i+1][1]) / 2;
    d += ` Q ${pts[i][0]} ${pts[i][1]} ${mx} ${my}`;
  }
  d += ` L 510 ${y + 40}`;
  return <path d={d} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeDasharray={dash} vectorEffect="non-scaling-stroke" />;
}

function Pine({ x, y, h=40, stroke }) {
  const w = h * 0.45;
  return (
    <g>
      <path d={`M ${x} ${y+h} L ${x} ${y+h+6}`} stroke={stroke} strokeWidth={1.4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d={`M ${x-w} ${y+h} L ${x} ${y} L ${x+w} ${y+h} M ${x-w*0.7} ${y+h*0.6} L ${x} ${y+h*0.15} L ${x+w*0.7} ${y+h*0.6}`}
        fill="none" stroke={stroke} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

function Sun({ cx, cy, r=18, stroke }) {
  const rays = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r1 = r + 4, r2 = r + 12;
    rays.push(<line key={i} x1={cx + Math.cos(a)*r1} y1={cy + Math.sin(a)*r1} x2={cx + Math.cos(a)*r2} y2={cy + Math.sin(a)*r2} stroke={stroke} strokeWidth={1.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />);
  }
  return (
    <g>
      {rays}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={stroke} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
    </g>
  );
}

function Sketch({ kind, palette }) {
  const ink = palette.ink;
  const accent = palette.accent;

  const W = 500, H = 320;
  let scene;

  switch (kind) {
    case 'houston-loop':
      scene = (
        <>
          <Sun cx={110} cy={85} r={16} stroke={accent} />
          <HillPath y={200} amp={16} seed={1.2} stroke={ink} />
          <HillPath y={170} amp={22} seed={3.4} stroke={ink} dash="2 4" width={1.4} />
          <Pine x={80} y={215} h={42} stroke={ink} />
          <Pine x={120} y={225} h={34} stroke={ink} />
          <Pine x={380} y={220} h={46} stroke={ink} />
          <Pine x={410} y={230} h={32} stroke={ink} />
          {/* path */}
          <path d="M 50 300 Q 180 270 240 260 T 450 240" fill="none" stroke={accent} strokeWidth={2} strokeDasharray="1 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </>
      );
      break;
    case 'green-valley':
      scene = (
        <>
          {/* pond */}
          <ellipse cx={250} cy={230} rx={140} ry={34} fill="none" stroke={accent} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          <path d="M 130 235 q 20 -3 40 0 t 40 0 t 40 0 t 40 0 t 40 0" fill="none" stroke={accent} strokeWidth={1.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d="M 140 245 q 20 -2 40 0 t 40 0 t 40 0 t 40 0" fill="none" stroke={accent} strokeWidth={1} opacity={0.6} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {/* two little ducks */}
          <g stroke={ink} fill="none" strokeWidth={1.3} strokeLinecap="round">
            <path d="M 200 225 q 6 -5 12 0 q -4 3 -12 0 z M 212 223 q 4 -2 7 0" vectorEffect="non-scaling-stroke" />
            <path d="M 260 228 q 6 -5 12 0 q -4 3 -12 0 z M 272 226 q 4 -2 7 0" vectorEffect="non-scaling-stroke" />
          </g>
          {/* dock */}
          <path d="M 100 232 L 140 232 M 100 226 L 100 238 M 140 226 L 140 238 M 105 226 L 105 238 M 130 226 L 130 238" stroke={ink} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          <HillPath y={160} amp={18} seed={5.1} stroke={ink} dash="2 5" width={1.3} />
          <Pine x={60} y={205} h={38} stroke={ink} />
          <Pine x={430} y={210} h={40} stroke={ink} />
        </>
      );
      break;
    case 'community-garden':
      scene = (
        <>
          {/* rows */}
          {[0,1,2,3].map(i => (
            <g key={i}>
              <line x1={60} y1={190 + i*22} x2={440} y2={190 + i*22} stroke={ink} strokeWidth={1.1} strokeDasharray="2 3" opacity={0.7} vectorEffect="non-scaling-stroke" />
              {[0,1,2,3,4,5].map(j => {
                const x = 90 + j * 60;
                const h = 10 + (sketchWobble(i * 3.1 + j) + 0.5) * 10;
                return <path key={j} d={`M ${x} ${190 + i*22} L ${x} ${190 + i*22 - h}`} stroke={accent} strokeWidth={1.4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />;
              })}
            </g>
          ))}
          {/* sun */}
          <Sun cx={400} cy={90} r={14} stroke={accent} />
          {/* fence */}
          <path d="M 40 280 L 460 280" stroke={ink} strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
          {[60,100,140,180,220,260,300,340,380,420].map((x) => (
            <path key={x} d={`M ${x} 280 L ${x} 260`} stroke={ink} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
        </>
      );
      break;
    case 'monument-peak':
      scene = (
        <>
          <Sun cx={100} cy={80} r={14} stroke={accent} />
          {/* big peak */}
          <path d="M 50 270 L 200 110 L 300 170 L 380 90 L 460 270 Z" fill="none" stroke={ink} strokeWidth={1.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {/* inner ridges */}
          <path d="M 200 110 L 220 200 M 380 90 L 360 170" stroke={ink} strokeWidth={1.1} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
          {/* thinking rock */}
          <ellipse cx={380} cy={92} rx={10} ry={4} fill="none" stroke={accent} strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
          <text x={395} y={75} fontSize={10} fontFamily="var(--mp-hand)" fill={accent}>the thinking rock</text>
          {/* trail */}
          <path d="M 60 290 Q 200 270 280 220 T 390 100" fill="none" stroke={accent} strokeWidth={1.6} strokeDasharray="1 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </>
      );
      break;
    case 'rumsey':
      scene = (
        <>
          {/* cottonwoods */}
          {[{x:110,h:150},{x:200,h:170},{x:290,h:140},{x:380,h:160}].map((t, i) => (
            <g key={i}>
              <path d={`M ${t.x} 280 L ${t.x} ${280 - t.h}`} stroke={ink} strokeWidth={2} vectorEffect="non-scaling-stroke" />
              <circle cx={t.x} cy={280 - t.h - 14} r={28 + (i%2)*6} fill="none" stroke={ink} strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
              <circle cx={t.x - 10} cy={280 - t.h - 6} r={18} fill="none" stroke={ink} strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
              <circle cx={t.x + 12} cy={280 - t.h - 10} r={20} fill="none" stroke={ink} strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
            </g>
          ))}
          {/* path loop */}
          <ellipse cx={250} cy={295} rx={220} ry={10} fill="none" stroke={accent} strokeDasharray="1 5" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        </>
      );
      break;
    case 'gulch':
    default:
      scene = (
        <>
          {/* canyon walls */}
          <path d="M 0 200 Q 100 140 200 180 L 200 320 L 0 320 Z" fill="none" stroke={ink} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
          <path d="M 500 200 Q 400 140 300 180 L 300 320 L 500 320 Z" fill="none" stroke={ink} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
          {/* water */}
          <path d="M 210 260 q 10 -4 20 0 t 20 0 t 20 0 t 20 0" fill="none" stroke={accent} strokeWidth={1.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d="M 210 270 q 10 -4 20 0 t 20 0 t 20 0 t 20 0" fill="none" stroke={accent} strokeWidth={1.3} opacity={0.7} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d="M 215 282 q 10 -4 20 0 t 20 0 t 20 0" fill="none" stroke={accent} strokeWidth={1.1} opacity={0.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {/* a kid throwing a rock - very rough */}
          <g stroke={ink} strokeWidth={1.3} fill="none" strokeLinecap="round">
            <circle cx={150} cy={190} r={6} vectorEffect="non-scaling-stroke" />
            <path d="M 150 196 L 150 215 M 150 205 L 162 212 M 150 205 L 140 215 M 150 215 L 145 232 M 150 215 L 156 232" vectorEffect="non-scaling-stroke" />
          </g>
        </>
      );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pc-sketch" preserveAspectRatio="xMidYMid slice">
      <rect x="0" y="0" width={W} height={H} fill={palette.bg} />
      {/* faint paper grain */}
      <g opacity="0.25">
        {Array.from({length: 80}).map((_, i) => {
          const x = (sketchWobble(i*3) + 0.5) * W;
          const y = (sketchWobble(i*5+7) + 0.5) * H;
          return <circle key={i} cx={x} cy={y} r={0.5} fill={ink} />;
        })}
      </g>
      {scene}
      {/* horizon ground line */}
      <path d="M 0 305 L 500 305" stroke={ink} strokeWidth={1.1} opacity={0.35} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ── Postcard card ───────────────────────────────────────────────────────────
// Two variants:
//  - <PostcardThumb />   small clickable tile (used in gallery, panels, search)
//  - <PostcardLarge />   the "opened" view inside a modal, with front/back flip

function PostcardThumb({ postcard, onClick, compact=false }) {
  const palette = PC_PALETTES[postcard.palette] || PC_PALETTES.forest;
  const loc = LOCATIONS.find(l => l.id === postcard.locationId);
  const theme = THEMES.find(t => t.id === postcard.category);

  return (
    <button
      className={`pc-thumb ${compact ? 'pc-thumb--compact' : ''}`}
      onClick={onClick}
      style={{ '--pc-ink': palette.ink, '--pc-accent': palette.accent, '--pc-bg': palette.bg }}
    >
      <div className="pc-thumb__art">
        <Sketch kind={postcard.sketch} palette={palette} />
        <span className="pc-thumb__stamp" style={{ background: theme?.color }}>
          {theme?.label}
        </span>
      </div>
      <div className="pc-thumb__meta">
        <div className="pc-thumb__caption">{postcard.pathLabel}</div>
        <div className="pc-thumb__loc">{loc?.name.toLowerCase()}</div>
      </div>
    </button>
  );
}

function PostcardLarge({ postcard, onClose, onPrev, onNext }) {
  const [flipped, setFlipped] = useState(false);
  const palette = PC_PALETTES[postcard.palette] || PC_PALETTES.forest;
  const loc = LOCATIONS.find(l => l.id === postcard.locationId);
  const theme = THEMES.find(t => t.id === postcard.category);

  return (
    <div className="pc-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="pc-modal__frame" onClick={e => e.stopPropagation()}>
        <button className="pc-modal__close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>

        {onPrev && <button className="pc-modal__nav pc-modal__nav--prev" onClick={onPrev} aria-label="Previous">←</button>}
        {onNext && <button className="pc-modal__nav pc-modal__nav--next" onClick={onNext} aria-label="Next">→</button>}

        <div className="pc-large" style={{ '--pc-ink': palette.ink, '--pc-accent': palette.accent, '--pc-bg': palette.bg }}>
          <div className={`pc-large__card ${flipped ? 'is-flipped' : ''}`} onClick={() => setFlipped(f => !f)}>
            {/* FRONT */}
            <div className="pc-large__face pc-large__front">
              <div className="pc-large__art">
                <Sketch kind={postcard.sketch} palette={palette} />
              </div>
              <div className="pc-large__frontmeta">
                <div className="pc-large__pathlabel">{postcard.pathLabel}</div>
                <div className="pc-large__stamp" style={{ background: theme?.color }}>{theme?.label}</div>
              </div>
            </div>
            {/* BACK */}
            <div className="pc-large__face pc-large__back">
              <div className="pc-large__back-grid">
                <div className="pc-large__letter">
                  <div className="pc-large__prompt">when I take this path I feel…</div>
                  <div className="pc-large__caption">{postcard.caption}</div>
                  <div className="pc-large__body">{postcard.body}</div>
                  <div className="pc-large__sig">{postcard.signature}</div>
                </div>
                <div className="pc-large__addr">
                  <div className="pc-large__stamp-square" style={{ background: theme?.color }}>
                    <span>{theme?.label}</span>
                  </div>
                  <div className="pc-large__lines">
                    <div className="pc-large__addr-label">from a path near —</div>
                    <div className="pc-large__addr-line">{loc?.name.toLowerCase()}</div>
                    <div className="pc-large__addr-line">payson, az · rim country</div>
                    <div className="pc-large__addr-line">april 2026</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pc-large__controls">
            <button className="pc-flip-btn" onClick={() => setFlipped(f => !f)}>
              <span>{flipped ? 'see the drawing' : 'read what they wrote'}</span>
              <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7 Q 7 2 12 7 M12 7 L 9 4 M12 7 L 9 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div className="pc-large__hint">↑ click the postcard to flip</div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PostcardThumb, PostcardLarge, PC_PALETTES, Sketch });
