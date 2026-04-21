const { useState, useEffect, useMemo, useRef } = React;

// ===== src/map.jsx =====
// Real-tile map of Payson, AZ.
// Uses Leaflet with a subtle basemap tile layer, constrained to the exact
// community-map bbox from uploads/initial map extents.xml. Pins are overlaid
// as Leaflet markers rendered from real lat/lon coordinates.

// Map state is managed imperatively; React renders pins via updateMarkers.
function PathsMap({
  postcards,
  selectedLocationId,
  onSelectLocation,
  onOpenPostcard,
  activeTheme,
  tileStyle = 'warm',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const [ready, setReady] = useState(false);

  const counts = useMemo(() => {
    const c = {};
    for (const pc of postcards) {
      if (activeTheme && pc.category !== activeTheme) continue;
      c[pc.locationId] = (c[pc.locationId] || 0) + 1;
    }
    return c;
  }, [postcards, activeTheme]);

  // Init Leaflet once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!window.L) return;

    const L = window.L;
    const bbox = window.MAP_BBOX;
    const img = window.BASEMAP_IMAGE;
    const viewBounds = L.latLngBounds(
      [bbox.south, bbox.west],
      [bbox.north, bbox.east]
    );
    const imgBounds = L.latLngBounds(
      [img.south, img.west],
      [img.north, img.east]
    );

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      maxBounds: imgBounds, // can't pan outside the image
      maxBoundsViscosity: 0.9,
      minZoom: 12,
      maxZoom: 17,
      zoomSnap: 0.25,
      crs: L.CRS.EPSG3857,
    });
    map.fitBounds(viewBounds, { padding: [10, 10] });

    // Real community basemap (exported from QGIS, warm paper style)
    L.imageOverlay(img.src, imgBounds, {
      className: 'mp-basemap-img',
      opacity: 1,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: false })
      .addAttribution('basemap © OpenStreetMap contributors · rendered via QGIS')
      .addTo(map);

    mapRef.current = map;
    setReady(true);

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render / update pins whenever data changes
  useEffect(() => {
    if (!ready || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = mapRef.current;

    for (const id in markersRef.current) {
      map.removeLayer(markersRef.current[id]);
    }
    markersRef.current = {};

    for (const loc of window.LOCATIONS) {
      const count = counts[loc.id] || 0;
      const hasPostcards = count > 0;
      const selected = selectedLocationId === loc.id;
      const sizeBoost = hasPostcards ? Math.min(count * 3, 10) : 0;

      const icon = L.divIcon({
        className: 'mp-pin-icon-wrap',
        iconSize: [44 + sizeBoost, 44 + sizeBoost],
        iconAnchor: [(44 + sizeBoost) / 2, (44 + sizeBoost) / 2],
        html: `
          <div class="mp-pin-icon ${hasPostcards ? 'mp-pin-icon--has' : 'mp-pin-icon--empty'} ${selected ? 'mp-pin-icon--selected' : ''}">
            <div class="mp-pin-icon__halo"></div>
            <div class="mp-pin-icon__dot">
              <span class="mp-pin-icon__num">${loc.num}</span>
            </div>
            <div class="mp-pin-icon__label">${loc.name}${count > 0 ? ` <em>· ${count}</em>` : ''}</div>
          </div>
        `,
      });

      const marker = L.marker([loc.lat, loc.lon], {
        icon,
        riseOnHover: true,
        zIndexOffset: selected ? 1000 : (hasPostcards ? 500 : 0),
      }).addTo(map);

      marker.on('click', () => onSelectLocation(loc.id));
      markersRef.current[loc.id] = marker;
    }
  }, [ready, counts, selectedLocationId, onSelectLocation]);

  // Pan to selected location
  useEffect(() => {
    if (!ready || !mapRef.current || !selectedLocationId) return;
    const loc = window.LOCATIONS.find(l => l.id === selectedLocationId);
    if (loc) {
      mapRef.current.panTo([loc.lat, loc.lon], { animate: true, duration: 0.6 });
    }
  }, [selectedLocationId, ready]);

  return (
    <div className="mp-map-wrap" data-screen-label="map">
      <div ref={containerRef} className="mp-map-leaflet" />

      <div className="mp-map-compass" aria-hidden="true">
        <svg viewBox="-50 -50 100 100" width="64" height="64">
          <circle cx="0" cy="0" r="42" fill="var(--mp-paper)" stroke="var(--mp-ink-soft)" strokeWidth="1.5" opacity="0.9" />
          <path d="M 0 -34 L 7 0 L 0 34 L -7 0 Z" fill="var(--mp-ink)" opacity="0.75" />
          <text x="0" y="-38" fontSize="14" fontFamily="var(--mp-mono)" fill="var(--mp-ink-soft)" textAnchor="middle" letterSpacing="0.18em">N</text>
        </svg>
      </div>

      <div className="mp-map-titleblock">
        <div className="mp-map-titleblock__kicker">the mini paths of</div>
        <div className="mp-map-titleblock__title">Payson</div>
        <div className="mp-map-titleblock__sub">a community map · rim country, arizona</div>
      </div>
    </div>
  );
}

window.MapView = PathsMap;


// ===== src/postcard.jsx =====
// Postcard component — renders a single postcard with hand-drawn front
// (a stylized "sketch" that stands in for the scanned community drawing)
// and a back with the handwritten prompt response.
//
// The postcard flips on click (or hover on desktop) and can be opened
// in a large modal via the parent app.


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


// ===== src/intro.jsx =====
// Intro / framing section — the warm entry point.
// Appears as an overlay the first time someone arrives, with a gentle
// way to continue into the map. Can be re-opened from the top bar.


function Intro({ onEnter, onClose, isOverlay=true }) {
  return (
    <div className={`intro ${isOverlay ? 'intro--overlay' : 'intro--inline'}`} data-screen-label="intro">
      {isOverlay && (
        <button className="intro__close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      )}
      <div className="intro__scroll">
        <div className="intro__inner">
          <div className="intro__eyebrow">rim country learning landscape · payson, arizona</div>
          <h1 className="intro__title">
            The Mini Paths<br/>
            <em>of Payson.</em>
          </h1>
          <p className="intro__tag">start anywhere. go everywhere.</p>

          <div className="intro__lede">
            <p>
              This is a living map of the small, meaningful paths people in
              Payson walk every day — to school, to the garden, to the rock
              at the top of the trail where nobody says anything for a while.
            </p>
            <p>
              Each pin is a place. Each postcard is one person's <em>path through it</em>:
              a drawing, a few words, a feeling. Together they're a portrait of
              Rim Country drawn by the people who already love it.
            </p>
          </div>

          <div className="intro__how">
            <div className="intro__how-item">
              <div className="intro__how-num">01</div>
              <div>
                <div className="intro__how-title">made by hand</div>
                <div className="intro__how-body">
                  At a community event, folks drew postcards of places that matter to them
                  and pinned them to a big shared map.
                </div>
              </div>
            </div>
            <div className="intro__how-item">
              <div className="intro__how-num">02</div>
              <div>
                <div className="intro__how-title">scanned & pinned here</div>
                <div className="intro__how-body">
                  Those postcards get scanned and attached to the place they're about, so you can
                  click a spot on the map and read what someone loves about it.
                </div>
              </div>
            </div>
            <div className="intro__how-item">
              <div className="intro__how-num">03</div>
              <div>
                <div className="intro__how-title">still open</div>
                <div className="intro__how-body">
                  Didn't make it to the event? You can still add your own path anytime.
                  No account. No polish required.
                </div>
              </div>
            </div>
          </div>

          <div className="intro__cta">
            <button className="intro__enter" onClick={onEnter}>
              <span>open the map</span>
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M3 9 L15 9 M11 5 L15 9 L11 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div className="intro__cta-sub">or press <kbd>M</kbd> any time to get back here.</div>
          </div>

          <div className="intro__foot">
            <div>a project of the rcll integrated vision group</div>
            <div>·</div>
            <div>slight imperfection is a feature, not a bug.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Intro = Intro;


// ===== src/gallery.jsx =====
// Gallery, filters, featured paths, and surprise-me controls.
// These are the non-map ways into the content.


function Filters({ activeTheme, onChangeTheme }) {
  return (
    <div className="filters" data-screen-label="filters">
      <div className="filters__label">follow a feeling:</div>
      <div className="filters__chips">
        <button
          className={`chip ${activeTheme === null ? 'chip--on' : ''}`}
          onClick={() => onChangeTheme(null)}
        >
          all
        </button>
        {THEMES.map(t => (
          <button
            key={t.id}
            className={`chip ${activeTheme === t.id ? 'chip--on' : ''}`}
            onClick={() => onChangeTheme(activeTheme === t.id ? null : t.id)}
            style={{ '--chip-color': t.color }}
          >
            <span className="chip__dot" />{t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LocationPanel({ locationId, postcards, onOpen, onClose, onSurprise }) {
  const loc = LOCATIONS.find(l => l.id === locationId);
  if (!loc) return null;
  const related = postcards.filter(p => p.locationId === locationId);
  return (
    <div className="locpanel" data-screen-label={`location-${loc.id}`}>
      <div className="locpanel__head">
        <div className="locpanel__eyebrow">a place</div>
        <div className="locpanel__name">{loc.name.toLowerCase()}</div>
        <button className="locpanel__close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </button>
      </div>
      {related.length > 0 ? (
        <>
          <div className="locpanel__count">
            {related.length} postcard{related.length === 1 ? '' : 's'} from here
          </div>
          <div className="locpanel__grid">
            {related.map(pc => (
              <PostcardThumb key={pc.id} postcard={pc} onClick={() => onOpen(pc.id)} compact />
            ))}
          </div>
        </>
      ) : (
        <div className="locpanel__empty">
          <div>nobody's posted a path from here yet.</div>
          <button className="locpanel__add" onClick={onSurprise}>
            wander somewhere else →
          </button>
        </div>
      )}
    </div>
  );
}

function Gallery({ postcards, onOpen, activeTheme, onChangeTheme }) {
  const sorted = useMemo(() => [...postcards], [postcards]);
  return (
    <div className="gallery" data-screen-label="gallery">
      <div className="gallery__head">
        <div>
          <div className="gallery__eyebrow">the whole wall</div>
          <div className="gallery__title">every postcard, so far</div>
        </div>
        <Filters activeTheme={activeTheme} onChangeTheme={onChangeTheme} />
      </div>
      {sorted.length === 0 ? (
        <div className="gallery__empty">no postcards match that filter yet. try another feeling?</div>
      ) : (
        <div className="gallery__grid">
          {sorted.map(pc => (
            <PostcardThumb key={pc.id} postcard={pc} onClick={() => onOpen(pc.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturedPaths({ onOpen }) {
  return (
    <div className="featured" data-screen-label="featured">
      <div className="featured__head">
        <div className="featured__eyebrow">curated</div>
        <div className="featured__title">featured paths</div>
        <div className="featured__sub">little grouped walks through the map.</div>
      </div>
      <div className="featured__list">
        {FEATURED_PATHS.map(fp => {
          const pcs = fp.postcardIds.map(id => POSTCARDS.find(p => p.id === id)).filter(Boolean);
          return (
            <div key={fp.id} className="fpath">
              <div className="fpath__meta">
                <div className="fpath__title">{fp.title.toLowerCase()}</div>
                <div className="fpath__sub">{fp.subtitle}</div>
                <div className="fpath__count">{pcs.length} postcards</div>
              </div>
              <div className="fpath__cards">
                {pcs.map((pc, i) => (
                  <button
                    key={pc.id}
                    className="fpath__card"
                    style={{ '--i': i }}
                    onClick={() => onOpen(pc.id)}
                  >
                    <PostcardThumb postcard={pc} onClick={() => onOpen(pc.id)} compact />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { Filters, LocationPanel, Gallery, FeaturedPaths });


// ===== src/submit.jsx =====
// "Add Your Path" — a stubbed submission flow.
// No backend; on submit, adds the postcard to in-memory state
// and shows a warm confirmation.


function Submit({ open, onClose, onSubmit }) {
  const [step, setStep] = useState(0);
  const [image, setImage] = useState(null);
  const [locationId, setLocationId] = useState('');
  const [category, setCategory] = useState('memory');
  const [pathLabel, setPathLabel] = useState('');
  const [caption, setCaption] = useState('');
  const [body, setBody] = useState('');
  const [signature, setSignature] = useState('');

  if (!open) return null;

  function reset() {
    setStep(0); setImage(null); setLocationId(''); setCategory('memory');
    setPathLabel(''); setCaption(''); setBody(''); setSignature('');
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    onSubmit({
      id: `pc-user-${Date.now()}`,
      locationId: locationId || 'green-valley',
      category,
      caption: caption || 'when i take this path i feel…',
      body: body || '',
      signature: signature || '— a neighbor',
      pathLabel: pathLabel || 'an untitled path',
      sketch: 'gulch',
      palette: 'ochre',
      userImage: image,
    });
    setStep(3);
  }

  return (
    <div className="submit" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="submit__sheet" onClick={e => e.stopPropagation()}>
        <button className="submit__close" onClick={() => { onClose(); setTimeout(reset, 400); }} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>

        {step === 0 && (
          <div className="submit__step">
            <div className="submit__eyebrow">add your path · step 1 of 3</div>
            <h2 className="submit__h">got a place you walk?</h2>
            <p className="submit__p">
              We'd love to add it to the map. No account, no moderation queue,
              no rules about what counts as a "path." A backyard loop is a path.
              The way to school is a path.
            </p>
            <div className="submit__upload">
              {image ? (
                <div className="submit__preview">
                  <img src={image} alt="" />
                  <button className="submit__link" onClick={() => setImage(null)}>replace drawing</button>
                </div>
              ) : (
                <label className="submit__drop">
                  <input type="file" accept="image/*" onChange={handleFile} hidden />
                  <div className="submit__drop-icon">
                    <svg width="28" height="28" viewBox="0 0 28 28"><path d="M14 4 v 16 M7 11 L 14 4 L 21 11 M5 22 L 23 22" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>drop a photo or scan of your postcard here</div>
                  <div className="submit__drop-sub">or click to choose a file — .jpg, .png, whatever</div>
                </label>
              )}
              <div className="submit__skip">no drawing? that's okay. <button className="submit__link" onClick={() => setStep(1)}>skip for now →</button></div>
            </div>
            <div className="submit__actions">
              <button className="btn btn--ghost" onClick={onClose}>never mind</button>
              <button className="btn btn--primary" onClick={() => setStep(1)} disabled={false}>next →</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="submit__step">
            <div className="submit__eyebrow">add your path · step 2 of 3</div>
            <h2 className="submit__h">where is it?</h2>
            <p className="submit__p">Pick the closest place. It's okay if it's approximate.</p>
            <div className="submit__locations">
              {LOCATIONS.map(loc => (
                <button
                  key={loc.id}
                  className={`submit__loc ${locationId === loc.id ? 'is-on' : ''}`}
                  onClick={() => setLocationId(loc.id)}
                >{loc.name.toLowerCase()}</button>
              ))}
            </div>
            <div className="submit__row">
              <label className="submit__field">
                <div className="submit__label">feeling / category</div>
                <div className="submit__themes">
                  {THEMES.map(t => (
                    <button key={t.id}
                      className={`chip ${category === t.id ? 'chip--on' : ''}`}
                      style={{ '--chip-color': t.color }}
                      onClick={() => setCategory(t.id)}
                    ><span className="chip__dot" />{t.label}</button>
                  ))}
                </div>
              </label>
            </div>
            <div className="submit__actions">
              <button className="btn btn--ghost" onClick={() => setStep(0)}>← back</button>
              <button className="btn btn--primary" onClick={() => setStep(2)} disabled={!locationId}>next →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="submit__step">
            <div className="submit__eyebrow">add your path · step 3 of 3</div>
            <h2 className="submit__h">tell us why.</h2>
            <p className="submit__p">Short is good. One sentence is enough.</p>
            <label className="submit__field">
              <div className="submit__label">a name for this path</div>
              <input className="submit__input" value={pathLabel} onChange={e => setPathLabel(e.target.value)} placeholder="e.g. after-dinner loop" />
            </label>
            <label className="submit__field">
              <div className="submit__label">when i take this path i feel…</div>
              <input className="submit__input" value={caption} onChange={e => setCaption(e.target.value)} placeholder="when i take this path i feel quiet." />
            </label>
            <label className="submit__field">
              <div className="submit__label">a little more (optional)</div>
              <textarea className="submit__textarea" rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="a memory, a detail, anything" />
            </label>
            <label className="submit__field">
              <div className="submit__label">sign it (optional)</div>
              <input className="submit__input" value={signature} onChange={e => setSignature(e.target.value)} placeholder="— first name or just a letter" />
            </label>
            <div className="submit__actions">
              <button className="btn btn--ghost" onClick={() => setStep(1)}>← back</button>
              <button className="btn btn--primary" onClick={handleSubmit}>pin it to the map →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="submit__step submit__done">
            <div className="submit__eyebrow">thank you.</div>
            <h2 className="submit__h">your path is on the map.</h2>
            <p className="submit__p">
              It's pinned to {LOCATIONS.find(l => l.id === locationId)?.name.toLowerCase()}.
              Go find it — it'll have a soft glow for a minute.
            </p>
            <div className="submit__actions">
              <button className="btn btn--primary" onClick={() => { onClose(); setTimeout(reset, 400); }}>back to the map</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.Submit = Submit;


// ===== src/tweaks.jsx =====
// Tweaks panel — toolbar toggle lets the user reshape the design.
// Controls: palette, map style, postcard reveal, density, intro copy preset.


const TWEAK_PRESETS = {
  palettes: {
    'field-journal': { // default warm paper
      paper:     'oklch(95% 0.015 85)',
      paperDeep: 'oklch(90% 0.02 85)',
      ink:       'oklch(26% 0.025 60)',
      inkSoft:   'oklch(46% 0.02 60)',
      contour:   'oklch(60% 0.03 80)',
      rim:       'oklch(40% 0.05 40)',
      road:      'oklch(55% 0.04 50)',
      trail:     'oklch(50% 0.05 130)',
      forest:    'oklch(55% 0.07 150)',
      water:     'oklch(58% 0.07 230)',
      accent:    'oklch(52% 0.11 40)',  // terracotta
      accentInk: 'oklch(30% 0.08 40)',
      surface:   'oklch(97% 0.01 85)',
      surfaceEdge:'oklch(85% 0.015 80)',
    },
    'forest-edge': {
      paper:     'oklch(94% 0.018 140)',
      paperDeep: 'oklch(88% 0.025 140)',
      ink:       'oklch(25% 0.03 150)',
      inkSoft:   'oklch(46% 0.03 150)',
      contour:   'oklch(58% 0.04 150)',
      rim:       'oklch(38% 0.06 150)',
      road:      'oklch(50% 0.03 140)',
      trail:     'oklch(48% 0.05 130)',
      forest:    'oklch(50% 0.08 155)',
      water:     'oklch(56% 0.08 220)',
      accent:    'oklch(55% 0.11 145)',
      accentInk: 'oklch(28% 0.07 145)',
      surface:   'oklch(96% 0.012 140)',
      surfaceEdge:'oklch(83% 0.02 140)',
    },
    'dusk': {
      paper:     'oklch(90% 0.018 280)',
      paperDeep: 'oklch(84% 0.025 280)',
      ink:       'oklch(22% 0.03 280)',
      inkSoft:   'oklch(42% 0.03 280)',
      contour:   'oklch(55% 0.04 280)',
      rim:       'oklch(36% 0.07 300)',
      road:      'oklch(48% 0.04 280)',
      trail:     'oklch(50% 0.05 300)',
      forest:    'oklch(48% 0.06 200)',
      water:     'oklch(54% 0.08 230)',
      accent:    'oklch(62% 0.12 320)',
      accentInk: 'oklch(30% 0.09 320)',
      surface:   'oklch(93% 0.015 280)',
      surfaceEdge:'oklch(80% 0.02 280)',
    },
    'high-desert': {
      paper:     'oklch(93% 0.02 65)',
      paperDeep: 'oklch(87% 0.03 65)',
      ink:       'oklch(24% 0.03 40)',
      inkSoft:   'oklch(44% 0.03 40)',
      contour:   'oklch(58% 0.04 50)',
      rim:       'oklch(38% 0.07 30)',
      road:      'oklch(50% 0.05 40)',
      trail:     'oklch(48% 0.06 40)',
      forest:    'oklch(52% 0.07 130)',
      water:     'oklch(56% 0.07 220)',
      accent:    'oklch(54% 0.13 30)',
      accentInk: 'oklch(30% 0.09 30)',
      surface:   'oklch(96% 0.015 65)',
      surfaceEdge:'oklch(83% 0.025 60)',
    },
  },
};

function applyPalette(key) {
  const p = TWEAK_PRESETS.palettes[key] || TWEAK_PRESETS.palettes['field-journal'];
  const r = document.documentElement;
  r.style.setProperty('--mp-paper', p.paper);
  r.style.setProperty('--mp-paper-deep', p.paperDeep);
  r.style.setProperty('--mp-ink', p.ink);
  r.style.setProperty('--mp-ink-soft', p.inkSoft);
  r.style.setProperty('--mp-contour', p.contour);
  r.style.setProperty('--mp-rim', p.rim);
  r.style.setProperty('--mp-road', p.road);
  r.style.setProperty('--mp-trail', p.trail);
  r.style.setProperty('--mp-forest', p.forest);
  r.style.setProperty('--mp-water', p.water);
  r.style.setProperty('--mp-accent', p.accent);
  r.style.setProperty('--mp-accent-ink', p.accentInk);
  r.style.setProperty('--mp-surface', p.surface);
  r.style.setProperty('--mp-surface-edge', p.surfaceEdge);
}

function applyDensity(key) {
  const r = document.documentElement;
  if (key === 'cozy') {
    r.style.setProperty('--mp-gap', '14px');
    r.style.setProperty('--mp-pad', '18px');
  } else {
    r.style.setProperty('--mp-gap', '22px');
    r.style.setProperty('--mp-pad', '28px');
  }
}

function Tweaks({ tweaks, setTweaks }) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === '__activate_edit_mode') { setEnabled(true); setOpen(true); }
      if (d.type === '__deactivate_edit_mode') { setEnabled(false); setOpen(false); }
    };
    window.addEventListener('message', handler);
    try { window.parent.postMessage({type: '__edit_mode_available'}, '*'); } catch {}
    return () => window.removeEventListener('message', handler);
  }, []);

  function update(patch) {
    const next = { ...tweaks, ...patch };
    setTweaks(next);
    try {
      window.parent.postMessage({type: '__edit_mode_set_keys', edits: patch}, '*');
    } catch {}
    if (patch.palette) applyPalette(patch.palette);
    if (patch.density) applyDensity(patch.density);
  }

  if (!enabled) return null;

  return (
    <div className={`tweaks ${open ? 'is-open' : ''}`}>
      <button className="tweaks__toggle" onClick={() => setOpen(o => !o)}>
        {open ? 'hide' : 'tweaks'}
      </button>
      {open && (
        <div className="tweaks__panel">
          <div className="tweaks__title">Tweaks</div>

          <div className="tweaks__group">
            <div className="tweaks__label">palette</div>
            <div className="tweaks__row">
              {Object.keys(TWEAK_PRESETS.palettes).map(k => (
                <button key={k}
                  className={`tweaks__opt ${tweaks.palette === k ? 'is-on' : ''}`}
                  onClick={() => update({palette: k})}
                >
                  <span className="tweaks__swatch" style={{background: TWEAK_PRESETS.palettes[k].accent}} />
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div className="tweaks__group">
            <div className="tweaks__label">postcard reveal</div>
            <div className="tweaks__row">
              {['modal', 'side-panel', 'fullscreen'].map(k => (
                <button key={k}
                  className={`tweaks__opt ${tweaks.reveal === k ? 'is-on' : ''}`}
                  onClick={() => update({reveal: k})}
                >{k}</button>
              ))}
            </div>
          </div>

          <div className="tweaks__group">
            <div className="tweaks__label">density</div>
            <div className="tweaks__row">
              {['cozy', 'spacious'].map(k => (
                <button key={k}
                  className={`tweaks__opt ${tweaks.density === k ? 'is-on' : ''}`}
                  onClick={() => update({density: k})}
                >{k}</button>
              ))}
            </div>
          </div>

          <div className="tweaks__group">
            <div className="tweaks__label">intro headline</div>
            <div className="tweaks__row tweaks__row--col">
              {[
                'The Mini Paths of Payson.',
                'Where we walk, and why.',
                'A map drawn by the people who live on it.',
              ].map(k => (
                <button key={k}
                  className={`tweaks__opt ${tweaks.heading === k ? 'is-on' : ''}`}
                  onClick={() => update({heading: k})}
                >{k}</button>
              ))}
            </div>
          </div>

          <div className="tweaks__group">
            <div className="tweaks__label">show tutorial postcard</div>
            <div className="tweaks__row">
              <button
                className={`tweaks__opt ${tweaks.showTutorial ? 'is-on' : ''}`}
                onClick={() => update({showTutorial: true})}
              >on</button>
              <button
                className={`tweaks__opt ${!tweaks.showTutorial ? 'is-on' : ''}`}
                onClick={() => update({showTutorial: false})}
              >off</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Tweaks, applyPalette, applyDensity, TWEAK_PRESETS });


// ===== src/app.jsx =====
// Main app — wires map, postcards, intro, gallery, filters, submit, tweaks.


const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "field-journal",
  "reveal": "modal",
  "density": "spacious",
  "heading": "The Mini Paths of Payson.",
  "showTutorial": true
}/*EDITMODE-END*/;

function App() {
  // Content state
  const [postcards, setPostcards] = useState(POSTCARDS);

  // Tweaks
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  useEffect(() => {
    applyPalette(tweaks.palette);
    applyDensity(tweaks.density);
  }, []);

  // View state
  const [introOpen, setIntroOpen] = useState(() => {
    try { return !localStorage.getItem('mpp:seen-intro'); } catch { return true; }
  });
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [openedPostcard, setOpenedPostcard] = useState(null);
  const [activeTheme, setActiveTheme] = useState(null);
  const [view, setView] = useState('map'); // 'map' | 'gallery' | 'featured'
  const [toast, setToast] = useState(null);

  // Close intro handler
  function closeIntro() {
    setIntroOpen(false);
    try { localStorage.setItem('mpp:seen-intro', '1'); } catch {}
  }

  // Keyboard: M = map intro, Esc = close things
  useEffect(() => {
    const h = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') {
        if (openedPostcard) setOpenedPostcard(null);
        else if (submitOpen) setSubmitOpen(false);
        else if (introOpen) closeIntro();
        else if (selectedLoc) setSelectedLoc(null);
      }
      if (e.key === 'm' || e.key === 'M') setIntroOpen(true);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [openedPostcard, submitOpen, introOpen, selectedLoc]);

  // Filtered postcards
  const visiblePostcards = useMemo(
    () => activeTheme ? postcards.filter(p => p.category === activeTheme) : postcards,
    [postcards, activeTheme]
  );

  // Handlers
  function openPostcard(id) { setOpenedPostcard(id); }
  function surprise() {
    const pool = visiblePostcards.length ? visiblePostcards : postcards;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) {
      setSelectedLoc(pick.locationId);
      setOpenedPostcard(pick.id);
    }
  }
  function handleSubmit(newPc) {
    setPostcards(prev => [...prev, newPc]);
    setSelectedLoc(newPc.locationId);
    setToast(`pinned to ${LOCATIONS.find(l => l.id === newPc.locationId)?.name.toLowerCase()}`);
    setTimeout(() => setToast(null), 3600);
  }

  // Open postcard modal - find prev/next in current visible set
  const openedIdx = openedPostcard ? visiblePostcards.findIndex(p => p.id === openedPostcard) : -1;
  const openedObj = openedIdx >= 0 ? visiblePostcards[openedIdx] : null;
  const prevPc = openedIdx > 0 ? () => setOpenedPostcard(visiblePostcards[openedIdx-1].id) : null;
  const nextPc = openedIdx >= 0 && openedIdx < visiblePostcards.length-1
    ? () => setOpenedPostcard(visiblePostcards[openedIdx+1].id) : null;

  return (
    <div className="app" data-screen-label="app">
      <TopBar
        count={postcards.length}
        view={view}
        onView={setView}
        onIntro={() => setIntroOpen(true)}
        onSubmit={() => setSubmitOpen(true)}
        onSurprise={surprise}
      />

      <main className="main">
        {view === 'map' && (
          <div className="mapview">
            <div className="mapview__map">
              <MapView
                postcards={postcards}
                activeTheme={activeTheme}
                selectedLocationId={selectedLoc}
                onSelectLocation={setSelectedLoc}
                onOpenPostcard={openPostcard}
              />
            </div>
            <aside className="mapview__side">
              <Filters activeTheme={activeTheme} onChangeTheme={setActiveTheme} />
              {selectedLoc ? (
                <LocationPanel
                  locationId={selectedLoc}
                  postcards={visiblePostcards}
                  onOpen={openPostcard}
                  onClose={() => setSelectedLoc(null)}
                  onSurprise={surprise}
                />
              ) : (
                <MapHint
                  onSurprise={surprise}
                  onGallery={() => setView('gallery')}
                  showTutorial={tweaks.showTutorial}
                  onOpenTutorial={() => openPostcard('pc-01')}
                />
              )}
            </aside>
          </div>
        )}

        {view === 'gallery' && (
          <Gallery
            postcards={visiblePostcards}
            onOpen={openPostcard}
            activeTheme={activeTheme}
            onChangeTheme={setActiveTheme}
          />
        )}

        {view === 'featured' && <FeaturedPaths onOpen={openPostcard} />}
      </main>

      <BottomStrip
        onSurprise={surprise}
        onSubmit={() => setSubmitOpen(true)}
        postcardCount={postcards.length}
      />

      {introOpen && <Intro onEnter={closeIntro} onClose={closeIntro} heading={tweaks.heading} />}
      {openedObj && (
        <PostcardLarge
          postcard={openedObj}
          onClose={() => setOpenedPostcard(null)}
          onPrev={prevPc}
          onNext={nextPc}
        />
      )}
      <Submit open={submitOpen} onClose={() => setSubmitOpen(false)} onSubmit={handleSubmit} />

      {toast && <div className="toast">{toast}</div>}

      <Tweaks tweaks={tweaks} setTweaks={setTweaks} />
    </div>
  );
}

function TopBar({ count, view, onView, onIntro, onSubmit, onSurprise }) {
  return (
    <header className="topbar">
      <button className="topbar__brand" onClick={onIntro} title="about this project">
        <span className="topbar__mark">✦</span>
        <span className="topbar__name">mini paths of payson</span>
      </button>
      <nav className="topbar__nav">
        <button className={`topbar__tab ${view === 'map' ? 'is-on' : ''}`} onClick={() => onView('map')}>the map</button>
        <button className={`topbar__tab ${view === 'gallery' ? 'is-on' : ''}`} onClick={() => onView('gallery')}>all postcards</button>
        <button className={`topbar__tab ${view === 'featured' ? 'is-on' : ''}`} onClick={() => onView('featured')}>featured paths</button>
      </nav>
      <div className="topbar__right">
        <div className="topbar__count">{count} postcards</div>
        <button className="topbar__add" onClick={onSubmit}>
          <span>+</span> add your path
        </button>
      </div>
    </header>
  );
}

function MapHint({ onSurprise, onGallery, showTutorial, onOpenTutorial }) {
  return (
    <div className="maphint">
      <div className="maphint__eyebrow">how to wander</div>
      <div className="maphint__title">start anywhere.</div>
      <div className="maphint__p">
        Every glowing dot on the map is a place with postcards attached.
        Click one to read what people love about it.
      </div>
      <div className="maphint__keys">
        <div className="maphint__key">
          <span className="maphint__dot maphint__dot--has" />
          <span>has postcards — click to open</span>
        </div>
        <div className="maphint__key">
          <span className="maphint__dot maphint__dot--empty" />
          <span>no postcards yet — could be yours</span>
        </div>
      </div>
      {showTutorial && (
        <div className="maphint__tut">
          <div className="maphint__tut-label">new here?</div>
          <button className="maphint__tut-btn" onClick={onOpenTutorial}>
            see an example postcard →
          </button>
        </div>
      )}
      <div className="maphint__row">
        <button className="maphint__btn" onClick={onSurprise}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 3 L 11 11 M11 3 L 3 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
          surprise me
        </button>
        <button className="maphint__btn" onClick={onGallery}>
          see them all →
        </button>
      </div>
    </div>
  );
}

function BottomStrip({ onSurprise, onSubmit, postcardCount }) {
  return (
    <footer className="bottom">
      <div className="bottom__left">
        <span className="bottom__tag">start anywhere · go everywhere</span>
      </div>
      <div className="bottom__center">
        <button className="bottom__pill" onClick={onSurprise}>surprise me</button>
        <span className="bottom__sep">·</span>
        <button className="bottom__pill" onClick={onSubmit}>+ add your path</button>
      </div>
      <div className="bottom__right">
        {postcardCount} postcards on the map
      </div>
    </footer>
  );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

