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
