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
