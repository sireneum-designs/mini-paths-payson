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
