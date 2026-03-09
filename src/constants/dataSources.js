// ── API Endpoints ────────────────────────────────────
export const API_URLS = {
    // OpenSky Network - anonymous access, no API key needed
    // CORS: Browser requests are blocked; this stays as a last-resort source.
    OPENSKY: 'https://opensky-network.org/api/states/all',
    OPENSKY_PROXY: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://opensky-network.org/api/states/all'),
    // India region bounding-box feed (lamin=6, lomin=68, lamax=36, lomax=98).
    OPENSKY_INDIA: 'https://opensky-network.org/api/states/all?lamin=6&lomin=68&lamax=36&lomax=98',
    OPENSKY_INDIA_PROXY:
        'https://api.allorigins.win/raw?url=' +
        encodeURIComponent('https://opensky-network.org/api/states/all?lamin=6&lomin=68&lamax=36&lomax=98'),
    // ADS-B public mirrors with CORS enabled and no auth requirement.
    // Radius 10000 (NM) gives near-global coverage in one request.
    AIRPLANES_GLOBAL: 'https://api.airplanes.live/v2/point/0/0/10000',
    ADSB_ONE_GLOBAL: 'https://api.adsb.one/v2/point/0/0/10000',
    ADSB_LOL_GLOBAL: 'https://api.adsb.lol/v2/point/0/0/10000',
    AISSTREAM_WS: 'wss://stream.aisstream.io/v0/stream',

    // CelesTrak - TLE data for satellites
    // We proxy this as well to prevent "Feed Offline" errors from strict browser CORS
    CELESTRAK_ACTIVE: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle'),
    CELESTRAK_STATIONS: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle'),
    CELESTRAK_STARLINK: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle'),
    CELESTRAK_WEATHER: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle'),
    CELESTRAK_GEO: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://celestrak.org/NORAD/elements/gp.php?GROUP=geo&FORMAT=tle'),
    CELESTRAK_GPS_OPS: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle'),
    CELESTRAK_SCIENCE: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=tle'),
    CELESTRAK_COSMOS_DEBRIS: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-2251-debris&FORMAT=tle'),
    CELESTRAK_IRIDIUM_DEBRIS: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-33-debris&FORMAT=tle'),
    CELESTRAK_FENGYUN_DEBRIS: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://celestrak.org/NORAD/elements/gp.php?GROUP=fengyun-1c-debris&FORMAT=tle'),

    // USGS Earthquake feed - excellent CORS support
    USGS_EARTHQUAKES_DAY: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
    USGS_EARTHQUAKES_HOUR: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
    IRIS_EARTHQUAKES_TEXT: 'https://service.iris.edu/fdsnws/event/1/query?format=text',
    IRIS_STATIONS_TEXT:
        'https://service.iris.edu/fdsnws/station/1/query?format=text&level=station&nodata=404',
    // OurAirports global airport registry (open data)
    OURAIRPORTS_AIRPORTS_CSV:
        'https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv',
    OURAIRPORTS_AIRPORTS_CSV_PROXY:
        'https://api.allorigins.win/raw?url=' +
        encodeURIComponent(
            'https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv'
        ),
    EONET_OPEN_EVENTS: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=1200',
    OPEN_METEO_CURRENT:
        'https://api.open-meteo.com/v1/forecast?current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&timezone=GMT',
    OPEN_METEO_AIR_QUALITY:
        'https://air-quality-api.open-meteo.com/v1/air-quality?current=pm2_5,pm10,nitrogen_dioxide,ozone,us_aqi&timezone=GMT',
    // WFP Global ports (ArcGIS FeatureServer, public)
    GLOBAL_PORTS_ARCGIS_QUERY:
        'https://gis.wfp.org/arcgis/rest/services/GLOBAL/GlobalPorts/FeatureServer/0/query?where=1%3D1&outFields=objectid,portname,prttype,prtsize,status,latitude,longitude,iso3,country,updatedate&returnGeometry=false&f=pjson',
    GLOBAL_PORTS_ARCGIS_QUERY_PROXY:
        'https://api.allorigins.win/raw?url=',
    // NOAA NDBC latest buoy observations (text table)
    NDBC_LATEST_OBS: 'https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt',
    NDBC_LATEST_OBS_PROXY:
        'https://api.allorigins.win/raw?url=' +
        encodeURIComponent('https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt'),
    NDBC_LATEST_OBS_PROXY_ALT:
        'https://r.jina.ai/http://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt',
    // Smithsonian / USGS weekly volcanic activity feed
    VOLCANO_WEEKLY_RSS: 'https://volcano.si.edu/news/WeeklyVolcanoRSS.xml',
    VOLCANO_WEEKLY_RSS_PROXY:
        'https://api.allorigins.win/raw?url=' +
        encodeURIComponent('https://volcano.si.edu/news/WeeklyVolcanoRSS.xml'),
    // NOAA SWPC aurora probability grid (global)
    SWPC_AURORA_LATEST: 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',
    SWPC_XRAY_FLARES_7D:
        'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json',
    // Aviation weather METAR observations (official NOAA/NWS aviation weather API)
    METAR_GLOBAL:
        'https://aviationweather.gov/api/data/metar?bbox=-180,-90,180,90&hours=2&format=json',
    METAR_PROXY_BASE: 'https://api.allorigins.win/raw?url=',
    METAR_PROXY_ALT_BASE: 'https://r.jina.ai/http://aviationweather.gov/api/data/metar?bbox=',
    // NASA FIRMS global active fire detections (MODIS, last 24h)
    FIRE_HOTSPOTS_CSV:
        'https://firms.modaps.eosdis.nasa.gov/data/active_fire/c6.1/csv/MODIS_C6_1_Global_24h.csv',
    FIRE_HOTSPOTS_PROXY:
        'https://api.allorigins.win/raw?url=' +
        encodeURIComponent(
            'https://firms.modaps.eosdis.nasa.gov/data/active_fire/c6.1/csv/MODIS_C6_1_Global_24h.csv'
        ),
    FIRE_HOTSPOTS_PROXY_ALT:
        'https://r.jina.ai/http://firms.modaps.eosdis.nasa.gov/data/active_fire/c6.1/csv/MODIS_C6_1_Global_24h.csv',
    // Global AIRMET/SIGMET polygons and metadata (aviation hazards)
    AIRSIGMET: 'https://aviationweather.gov/api/data/airsigmet?format=json',
    SIGMET: 'https://aviationweather.gov/api/data/sigmet?format=json',
    AIRSIGMET_PROXY:
        'https://api.allorigins.win/raw?url=' +
        encodeURIComponent('https://aviationweather.gov/api/data/airsigmet?format=json'),
    SIGMET_PROXY:
        'https://api.allorigins.win/raw?url=' +
        encodeURIComponent('https://aviationweather.gov/api/data/sigmet?format=json'),
    AIRSIGMET_PROXY_ALT:
        'https://r.jina.ai/http://aviationweather.gov/api/data/airsigmet?format=json',
    SIGMET_PROXY_ALT:
        'https://r.jina.ai/http://aviationweather.gov/api/data/sigmet?format=json',
    // NOAA / NWS CAP alerts (official active watches/warnings/advisories)
    NWS_ALERTS_ACTIVE: 'https://api.weather.gov/alerts/active?status=actual',
    // Power-grid/infrastructure feeds
    ODIN_OUTAGES:
        'https://ornl.opendatasoft.com/api/explore/v2.1/catalog/datasets/odin-real-time-outages-county/records',
    ODIN_OUTAGES_PROXY: 'https://api.allorigins.win/raw?url=',
    WRI_GLOBAL_POWER_PLANTS_CSV:
        'https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv',
    WRI_GLOBAL_POWER_PLANTS_PROXY: 'https://api.allorigins.win/raw?url=',
    // GDACS - global disaster alert feed (earthquakes, cyclones, floods, wildfires, drought, volcanoes)
    GDACS_EVENTS: 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH',
    WIKIDATA_SPARQL: 'https://query.wikidata.org/sparql',

    // NTAD / ArcGIS military installations dataset (public, no key required)
    MILITARY_BASES_NTAD:
        'https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_Military_Bases/FeatureServer/0/query?where=1%3D1&outFields=OBJECTID,countryName,featureName,siteName,siteOperationalStatus,siteReportingComponent,stateNameCode&f=geojson&resultRecordCount=2000&outSR=4326&maxAllowableOffset=0.01',
    // Global supplemental military site snapshot generated from OpenStreetMap Overpass.
    // Served locally to keep CORS and Overpass rate limits out of the runtime path.
    MILITARY_BASES_OSM_SNAPSHOT: '/data/osmMilitarySites.json',
    OSM_OVERPASS: 'https://overpass-api.de/api/interpreter',

    // GPSJam - GPS interference data
    GPSJAM: 'https://gpsjam.org',
};

// ── Polling Intervals (ms) ────────────────────────────
export const POLL_INTERVALS = {
    AIRCRAFT: 15000,    // 15 seconds
    SATELLITES: 5000,   // 5 seconds (computed, not fetched)
    SEISMIC: 60000,     // 1 minute
    AIRPORTS: 86400000, // 24 hours
    HAZARDS: 120000,    // 2 minutes
    DISASTERS: 180000,  // 3 minutes
    CONFLICTS: 900000, // 15 minutes
    WEATHER_ALERTS: 60000, // 1 minute
    OCEAN_BUOYS: 300000, // 5 minutes
    VOLCANOES: 3600000, // 1 hour
    SPACE_WEATHER: 300000, // 5 minutes
    METAR: 180000, // 3 minutes
    FIRE_HOTSPOTS: 600000, // 10 minutes
    AIR_HAZARDS: 300000, // 5 minutes
    SOLAR_FLARES: 300000, // 5 minutes
    SEISMIC_STATIONS: 43200000, // 12 hours
    AIR_QUALITY: 600000, // 10 minutes
    WEATHER: 600000,    // 10 minutes
    CCTV: 5000,         // 5 seconds for still images
    MARITIME_PORTS: 43200000, // 12 hours
    POWER_GRID: 300000, // 5 minutes
};

// ── Shader Modes ──────────────────────────────────────
export const SHADER_MODES = [
    { id: 'DEFAULT', label: 'Normal', key: '1', color: '#e0e0e0' },
    { id: 'NVG', label: 'NVG', key: '2', color: '#00ff41' },
    { id: 'FLIR', label: 'FLIR', key: '3', color: '#ff6600' },
    { id: 'CRT', label: 'CRT', key: '4', color: '#ffaa00' },
    { id: 'ANIME', label: 'Anime', key: '5', color: '#ff69b4' },
    { id: 'GOD', label: 'God', key: '6', color: '#00ffff' },
    { id: 'SURVEILLANCE', label: 'Surv', key: '7', color: '#7dd3fc' },
];

// ── Layer Definitions ─────────────────────────────────
export const LAYER_DEFS = {
    aircraft: { label: 'AIRCRAFT', color: '#00b4ff', icon: '✈', description: 'Live ADS-B/Mode-S aircraft tracks.' },
    satellites: { label: 'SATELLITES', color: '#ffaa00', icon: '🛰', description: 'Orbiting satellites propagated from TLE feeds.' },
    seismic: { label: 'SEISMIC', color: '#ff3333', icon: '◉', description: 'Recent earthquake events with magnitude/depth.' },
    airports: { label: 'AIRPORTS', color: '#93c5fd', icon: '🛬', description: 'Global airport infrastructure and metadata.' },
    hazards: { label: 'HAZARDS', color: '#ff8a3d', icon: '☣', description: 'General hazard overlays from open feeds.' },
    disasters: { label: 'DISASTERS', color: '#ff6f61', icon: '☄', description: 'Global disaster incidents and alerts.' },
    conflicts: { label: 'CONFLICTS', color: '#ff4d6d', icon: '⚔', description: 'Open-source conflict and unrest event signals.' },
    maritime: { label: 'MARITIME', color: '#00ffd5', icon: '⛴', description: 'Global port network + live AIS vessel tracking (AIS key optional).' },
    oceanBuoys: { label: 'OCEAN BUOYS', color: '#38bdf8', icon: '⚓', description: 'Buoy observations: waves, wind, pressure, sea temp.' },
    volcanoes: { label: 'VOLCANOES', color: '#ff4d4d', icon: '🌋', description: 'Volcanic activity and monitoring notices.' },
    spaceWeather: { label: 'SPACE WX', color: '#a3e635', icon: '☀', description: 'NOAA aurora probability model; strongest near poles.' },
    metar: { label: 'METAR WX', color: '#60a5fa', icon: '⛅', description: 'Airport weather observations (VFR/MVFR/IFR/LIFR).' },
    fireHotspots: { label: 'FIRE HOTSPOTS', color: '#ff5b24', icon: '🔥', description: 'Active thermal fire detections from satellites.' },
    aviationHazards: { label: 'AIR HAZARDS', color: '#ff8b3d', icon: '✹', description: 'AIRMET/SIGMET polygons and aviation weather hazards.' },
    solarFlares: { label: 'SOLAR FLARES', color: '#ffcc66', icon: '☀', description: 'Recent solar flare activity from SWPC feeds.' },
    seismicStations: { label: 'SEIS STATIONS', color: '#22d3ee', icon: '📡', description: 'Seismometer station network locations.' },
    weather: { label: 'WEATHER', color: '#7dd3fc', icon: '☁', description: 'Global sampled weather field with alert merge.' },
    airQuality: { label: 'AIR QUALITY', color: '#84cc16', icon: 'AQ', description: 'Air quality indicators (AQI, PM2.5, ozone).' },
    powerGrid: { label: 'POWER GRID', color: '#facc15', icon: '⚡', description: 'Real-time outage intelligence + global power infrastructure.' },
    cctv: { label: 'CCTV', color: '#00ff41', icon: '📹', description: 'Public live camera feeds and refresh streams.' },
    traffic: { label: 'TRAFFIC', color: '#ff69b4', icon: '🚗', description: 'Traffic flow animation and traffic-linked cams.' },
    militaryActivity: { label: 'MIL ACTIVITY', color: '#ff5b5b', icon: '⚠', description: 'Likely military flights inferred from air traffic feed.' },
    militaryBases: { label: 'MIL BASES', color: '#f7c15a', icon: '⌂', description: 'Public military installation locations.' },
    forbiddenZones: { label: 'NO-GO ZONES', color: '#ff4d4d', icon: '⛔', description: 'Restricted/forbidden areas and access-limited zones.' },
    airspace: { label: 'AIRSPACE', color: '#00ffff', icon: '⬡', description: 'No-fly/restricted airspace overlays.' },
};

// Keep these layers in the primary tactical list; everything else is grouped under "OTHERS".
export const SURVEILLANCE_PRIMARY_LAYERS = [
    'aircraft',
    'satellites',
    'seismic',
    'airports',
    'seismicStations',
    'maritime',
    'powerGrid',
    'cctv',
    'traffic',
    'conflicts',
    'militaryActivity',
    'militaryBases',
    'forbiddenZones',
    'airspace',
];

// ── Default Camera ────────────────────────────────────
export const DEFAULT_CAMERA = {
    longitude: 10,
    latitude: 20,
    height: 9000000,
};
