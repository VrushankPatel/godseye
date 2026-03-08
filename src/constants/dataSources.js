// ── API Endpoints ────────────────────────────────────
export const API_URLS = {
    // OpenSky Network - anonymous access, no API key needed
    // CORS: Browser requests are blocked; this stays as a last-resort source.
    OPENSKY: 'https://opensky-network.org/api/states/all',
    OPENSKY_PROXY: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://opensky-network.org/api/states/all'),
    // ADS-B public mirrors with CORS enabled and no auth requirement.
    // Radius 10000 (NM) gives near-global coverage in one request.
    AIRPLANES_GLOBAL: 'https://api.airplanes.live/v2/point/0/0/10000',
    ADSB_ONE_GLOBAL: 'https://api.adsb.one/v2/point/0/0/10000',

    // CelesTrak - TLE data for satellites
    // We proxy this as well to prevent "Feed Offline" errors from strict browser CORS
    CELESTRAK_ACTIVE: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle'),
    CELESTRAK_STATIONS: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle'),
    CELESTRAK_STARLINK: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle'),

    // USGS Earthquake feed - excellent CORS support
    USGS_EARTHQUAKES_DAY: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
    USGS_EARTHQUAKES_HOUR: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',

    // GPSJam - GPS interference data
    GPSJAM: 'https://gpsjam.org',
};

// ── Polling Intervals (ms) ────────────────────────────
export const POLL_INTERVALS = {
    AIRCRAFT: 15000,    // 15 seconds
    SATELLITES: 5000,   // 5 seconds (computed, not fetched)
    SEISMIC: 60000,     // 1 minute
    CCTV: 5000,         // 5 seconds for still images
};

// ── Shader Modes ──────────────────────────────────────
export const SHADER_MODES = [
    { id: 'DEFAULT', label: 'Normal', key: '1', color: '#e0e0e0' },
    { id: 'NVG', label: 'NVG', key: '2', color: '#00ff41' },
    { id: 'FLIR', label: 'FLIR', key: '3', color: '#ff6600' },
    { id: 'CRT', label: 'CRT', key: '4', color: '#ffaa00' },
    { id: 'ANIME', label: 'Anime', key: '5', color: '#ff69b4' },
    { id: 'GOD', label: 'God', key: '6', color: '#00ffff' },
];

// ── Layer Definitions ─────────────────────────────────
export const LAYER_DEFS = {
    aircraft: { label: 'AIRCRAFT', color: '#00b4ff', icon: '✈' },
    satellites: { label: 'SATELLITES', color: '#ffaa00', icon: '🛰' },
    seismic: { label: 'SEISMIC', color: '#ff3333', icon: '◉' },
    cctv: { label: 'CCTV', color: '#00ff41', icon: '📹' },
    traffic: { label: 'TRAFFIC', color: '#ff69b4', icon: '🚗' },
    airspace: { label: 'AIRSPACE', color: '#00ffff', icon: '⬡' },
};

// ── Default Camera ────────────────────────────────────
export const DEFAULT_CAMERA = {
    longitude: -74.006,
    latitude: 40.7128,
    height: 2500000,
};
