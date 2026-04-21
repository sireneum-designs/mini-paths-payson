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
