// Real-tile map of Payson, AZ.
// Uses Leaflet with a subtle basemap tile layer, constrained to the exact
// community-map bbox from uploads/initial map extents.xml. Pins are overlaid
// as Leaflet markers rendered from real lat/lon coordinates.

const { useEffect, useRef, useState, useMemo } = React;

// Map state is managed imperatively; React renders the pins via updateMarkers.
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

  // Postcard counts per location (respecting theme filter)
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
    if (!window.L) return; // Leaflet not loaded yet

    const L = window.L;
    const bbox = window.MAP_BBOX;
    const bounds = L.latLngBounds(
      [bbox.south, bbox.west],
      [bbox.north, bbox.east]
    );

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      maxBounds: bounds.pad(0.15),
      maxBoundsViscosity: 0.9,
      minZoom: 12,
      maxZoom: 16,
      zoomSnap: 0.25,
    });
    map.fitBounds(bounds, { padding: [10, 10] });

    // Tile layer — CARTO Voyager (no key, clean warm-ish base we then CSS-filter)
    const tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    L.tileLayer(tileUrl, {
      subdomains: 'abcd',
      maxZoom: 19,
      className: 'mp-tiles',
    }).addTo(map);

    // Add zoom control in bottom-right (custom placement)
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add attribution (small, required by CARTO/OSM)
    L.control.attribution({ position: 'bottomleft', prefix: false })
      .addAttribution('© OpenStreetMap · © CARTO')
      .addTo(map);

    mapRef.current = map;
    setReady(true);

    // Handle resize
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

    // Remove stale markers
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

  // Update body class for filter style
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.dataset.tileStyle = tileStyle;
  }, [tileStyle]);

  return (
    <div className="mp-map-wrap" data-screen-label="map">
      <div
        ref={containerRef}
        className="mp-map-leaflet"
        data-tile-style={tileStyle}
      />

      {/* Decorative compass overlay */}
      <div className="mp-map-compass" aria-hidden="true">
        <svg viewBox="-50 -50 100 100" width="64" height="64">
          <circle cx="0" cy="0" r="42" fill="var(--mp-paper)" stroke="var(--mp-ink-soft)" strokeWidth="1.5" opacity="0.9" />
          <path d="M 0 -34 L 7 0 L 0 34 L -7 0 Z" fill="var(--mp-ink)" opacity="0.75" />
          <text x="0" y="-38" fontSize="14" fontFamily="var(--mp-mono)" fill="var(--mp-ink-soft)" textAnchor="middle" letterSpacing="0.18em">N</text>
        </svg>
      </div>

      {/* Title block overlay */}
      <div className="mp-map-titleblock">
        <div className="mp-map-titleblock__kicker">the mini paths of</div>
        <div className="mp-map-titleblock__title">Payson</div>
        <div className="mp-map-titleblock__sub">a community map · rim country, arizona</div>
      </div>
    </div>
  );
}

window.MapView = PathsMap;
