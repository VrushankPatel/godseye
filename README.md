# Godseye 1.0

<p align="center">
  <a href="https://godseye-x.web.app/"><strong>Launch Godseye</strong></a>
</p>

<p align="center">
  <a href="https://godseye-x.web.app/">
    <img src="./imgs/Godseye.png" alt="Godseye 1.0 interface preview" width="100%" />
  </a>
</p>

<p align="center">
  Frontend-only geospatial intelligence dashboard inspired by WorldView-style OSINT interfaces.
  <br />
  Live 3D globe, tactical HUD, surveillance overlays, CCTV feeds, satellites, seismic activity, airspace, and more.
</p>

## Vibe Coding Alert

I architected the project myself.
I used **Codex** as a programming assistant for selected implementation tasks such as UI scaffolding, layout generation, iterative refactoring, and development acceleration.

## Highlights

- Fullscreen interactive 3D globe (CesiumJS)
- Tactical HUD UI with real-time feed counters and UTC recording clock
- Dynamic visual modes: Default, NVG, FLIR, CRT, Anime, God Mode
- Live layers (toggleable):
  - Aircraft (OpenSky, continuously updated)
  - Satellites (CelesTrak + browser propagation)
  - CCTV (municipal + curated global feeds)
  - Global airport infrastructure layer (OurAirports large/medium/scheduled-service airports)
  - Seismic activity (USGS)
  - Global seismic-station network layer (IRIS FDSN station metadata, active network coverage)
  - Natural hazards (NASA EONET live events: storms, wildfires, volcanoes, floods)
  - Global disaster alerts (GDACS: earthquakes, cyclones, floods, droughts, volcanoes, wildfires)
  - Global conflict/war layer (Wikidata SPARQL, geocoded recent ongoing armed conflicts)
  - Maritime layer (WFP global ports + AISstream realtime vessels when API key is configured)
  - Power grid layer (US DOE ODIN outage intelligence + WRI global power-plant infrastructure)
  - Weather layer now includes severe alert overlays (NOAA/NWS watches, warnings, advisories)
  - Live ocean buoy telemetry (NOAA NDBC: wind, wave, pressure, air/water temp)
  - Global volcanic activity alerts (Smithsonian/USGS geotagged weekly activity feed)
  - Space-weather aurora intensity map (NOAA SWPC global Ovation probability grid)
  - METAR station intelligence (airport observations with IFR/MVFR/VFR category)
  - Global active-fire detections (NASA FIRMS MODIS thermal hotspots, last 24h)
  - Aviation hazard polygons (AIRMET/SIGMET convective, turbulence, icing, IFR zones)
  - Solar flare activity layer (NOAA SWPC GOES X-ray flare events)
  - Global weather conditions (Open-Meteo dense world grid + India refinement cells)
  - Global air quality intelligence (Open-Meteo AQI + PM2.5/PM10/NO2/O3 at major world nodes)
  - Traffic flow animation + traffic camera points
  - Military activity (live military-class ADS-B tracks)
  - Military bases (NTAD + OSM global military-site feed)
  - No-go / forbidden zones with restriction metadata
  - Airspace / restricted zones
- Object inspector panel with metadata and media preview
- Flight filtering controls (carrier / cargo / passenger patterns)
- Optimized responsive glass-panel HUD (prevents data-feed overlap on crowded screens)

## Tech Stack

- React + Vite
- CesiumJS
- Tailwind CSS
- Zustand (state)
- Browser `fetch` + timer/WebSocket-style polling patterns

## Access Model

Godseye uses a BYOK model: Bring Your Own Key.

- Use the hosted build directly at [https://godseye-x.web.app/](https://godseye-x.web.app/)
- If you want to run it locally or self-host it, bring your own API keys for the keyed integrations listed below

## BYOK Keys

If you want the full local/self-hosted experience, provide these keys in `scripts/local-secrets.sh`.

- `VITE_GOOGLE_MAPS_3D_KEY` or `VITE_GOOGLE_MAPS_API_KEY`
  Google Photorealistic 3D city tiles on zoom-in
- `VITE_YOUTUBE_API_KEY`
  YouTube live CCTV / webcam discovery
- `VITE_GUARDIAN_API_KEY`
  Guardian news enrichment for the intelligence wire
- `VITE_AISSTREAM_API_KEY`
  AISstream realtime vessel tracking for the Maritime layer
- `VITE_FIREBASE_RTDB_URL`
  Shared encrypted runtime cache endpoint for slow-changing Godseye data
- `VITE_GODSEYE_CACHE_SECRET`
  Client-side cache envelope secret used to encrypt/decrypt the shared RTDB cache payload

If a key is missing, Godseye does not crash.
It logs a browser console error stating that the key is missing and that the related data may or may not be available.

## Run Locally

### Requirements

- Node.js 18+
- npm 9+

### Install and start

```bash
cp scripts/local-secrets.example.sh scripts/local-secrets.sh
# fill in your keys
npm install
./scripts/with-local-secrets.sh npm run dev
```

Open `http://localhost:5173/`.

### Build

```bash
./scripts/with-local-secrets.sh npm run build
./scripts/with-local-secrets.sh npm run shared-cache:publish
./scripts/with-local-secrets.sh npm run preview
```

### Feed Audit (curl-based)

```bash
./scripts/feed_audit.sh
```

This runs direct API checks and prints live record counts by feed/region to help validate real-world coverage.

Detailed research notes are in [`docs/FEED_RESEARCH.md`](./docs/FEED_RESEARCH.md).

## Shared Runtime Cache

Godseye can optionally use a shared encrypted runtime cache backed by Firebase Realtime Database.

This cache is intended for slower-changing shared surfaces such as:

- Live Intel Wire / relay source payloads
- Verified CCTV manifest data
- Satellite catalog / TLE manifest payloads

It is not used for highly volatile live-position layers such as aircraft or live vessel movement, where direct source refresh still makes more sense.

When configured, the app:

- attempts to read the shared RTDB cache first
- verifies a custom integrity hash
- checks the cache timestamp against a 90 minute freshness window
- hydrates Godseye from that cache if it is still fresh
- rebuilds and republishes the cache when it is missing, stale, or invalid
- can prewarm the encrypted cache during CI or local ops with `npm run shared-cache:publish`

The payload stored in RTDB is encrypted on the client before upload and decrypted on the client at runtime.
For development/debugging, the browser console emits detailed shared-cache logs during the bootstrap flow.

## Project Structure

```text
src/
  components/
  constants/
  layers/
  shaders/
  store/
  workers/
```

## Data Sources (Public)

- OpenSky Network (`/api/states/all`)
- CelesTrak TLE sets
- ADSB.lol mirror (`/v2/point`, keyless ADS-B stream mirror)
- OurAirports global airports registry (`airports.csv`)
- USGS Earthquake GeoJSON feeds
- IRIS FDSN station feed (`fdsnws/station`) for global seismic network locations
- NASA EONET open events feed
- GDACS global disaster alert feed
- Wikidata SPARQL endpoint (recent ongoing armed conflicts with coordinates)
- NOAA/NWS active weather alerts feed (`api.weather.gov/alerts/active`)
- NOAA NDBC latest buoy observations (`latest_obs.txt`, proxied for browser CORS)
- Smithsonian GVP / USGS Weekly Volcanic Activity RSS (`WeeklyVolcanoRSS.xml`, georss points)
- NOAA SWPC aurora model grid (`ovation_aurora_latest.json`, global probability cells)
- NOAA AviationWeather METAR API (`/api/data/metar`, regional pulls + proxy fallback)
- NASA FIRMS MODIS global 24h active-fire CSV (direct + proxy failover ingest)
- NOAA AviationWeather AIRSIGMET API (`/api/data/airsigmet`, polygon hazard overlays)
- NOAA SWPC GOES X-ray flare feed (`xray-flares-7-day.json`, class-ranked events)
- Open-Meteo current weather API
- Open-Meteo air-quality API
- Open/public municipal and curated world camera feeds
- Open geospatial traffic/airspace datasets
- WFP Global Ports ArcGIS FeatureServer (public global maritime infrastructure points)
- AISstream WebSocket feed (optional key) for realtime ship positions
- US DOE ODIN real-time county outage feed
- WRI Global Power Plant Database (global infrastructure baseline)
- NTAD Military Bases (ArcGIS public layer)
- OpenStreetMap Overpass military/landuse feed (`military=*`, `landuse=military`) via bundled global snapshot (`/public/data/osmMilitarySites.json`)
- Curated global no-go/restricted location dataset (publicly documented exclusion/protection zones)
- IRIS FDSN event feed fallback (`service.iris.edu`)
- NASA TV / ISS live stream

## Military Activity Data Notes

- Live military activity in this app is sourced from open ADS-B tracks and filtered/classified client-side (military callsign/operator/type heuristics).
- Many conflict/event APIs require account authentication or keys (for example ACLED), so this build keeps the default experience keyless and frontend-only.
- Conflict layer uses public Wikidata entries and should be treated as OSINT context, not authoritative military-grade intelligence.

## Feed Resilience

- Multi-source fallback is enabled for satellites (multiple CelesTrak groups + paginated TLE fallback API).
- Seismic ingest uses USGS feeds first and falls back to IRIS text feed parsing if USGS is unavailable.
- CCTV ingest prioritizes live-capable streams/embeds; if a source only exposes still images, those are treated as fallback mode.
- Each layer fails independently and surfaces `FEED OFFLINE` state without crashing other layers.

## Notes

- This project is intentionally backend-free: no server, no database, no auth.
- Some feeds can intermittently fail due to CORS limits, region blocks, source downtime, or third-party rate limiting.
- The app degrades gracefully and keeps other layers active when one source is unavailable.
- Local secrets are loaded through `scripts/local-secrets.sh`, which is gitignored.
- GitHub Actions builds use repository secrets for the same keyed integrations.
- Without `VITE_GOOGLE_MAPS_3D_KEY` / `VITE_GOOGLE_MAPS_API_KEY`, the globe falls back to OSM 3D buildings where available.

## Credits

Built with ❤️ by - **Vrushank Patel**

## License

Licensed under Apache License 2.0. See [LICENSE](./LICENSE).
