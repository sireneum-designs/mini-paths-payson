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
