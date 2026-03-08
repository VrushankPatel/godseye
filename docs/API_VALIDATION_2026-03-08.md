# API Validation Snapshot (March 8, 2026)

This snapshot records live `curl` checks used to decide which feeds can be integrated keyless in the browser and which need optional auth.

## Working Keyless Endpoints

- OpenSky global states: `https://opensky-network.org/api/states/all` (200)
- OpenSky India bbox: `https://opensky-network.org/api/states/all?lamin=8.4&lomin=68.7&lamax=37.6&lomax=97.25` (200)
- USGS realtime feeds (`all_hour`, `2.5_day`, `significant_week`) (200)
- CelesTrak GP JSON/TLE feeds (`active`, `stations`, `starlink`) (200)
- CelesTrak debris groups (working corrected groups):
  - `cosmos-2251-debris`
  - `iridium-33-debris`
  - `fengyun-1c-debris`
- Open-Meteo weather and AQ endpoints (200)
- NOAA weather alerts: `https://api.weather.gov/alerts/active` (200)
- NOAA SWPC feeds (`planetary_k_index_1m`, `rtsw_wind_1m`, `alerts`) (200)
- NASA DONKI WS feeds (`FLR`, `CME`, `GST`) (200)
- WFP Global Ports ArcGIS service (200)
- ODIN county outage dataset (200)
- WRI global power plant CSV (200)

## Endpoints That Failed or Require Auth / Agreement

- OpenSky departure endpoint example can return `403` for historical route calls without authenticated usage context.
- NASA API gateway DONKI with `DEMO_KEY` was unreliable (`503`) during validation; WS DONKI endpoints were stable.
- ElectricityMaps endpoint returns `401` without auth token.
- AISstream realtime vessel data requires API key over WebSocket.
- Legacy/third-party CCTV list endpoints in some examples were unavailable or restricted from this environment.

## Corrected Notes Applied in Code

1. CelesTrak debris endpoint from generic `GROUP=debris` was replaced with concrete, working groups:
- `cosmos-2251-debris`
- `iridium-33-debris`
- `fengyun-1c-debris`

2. NASA DONKI integration guidance prefers WS endpoints as primary when DEMO key route is unstable.

3. Maritime realtime vessel ingest is implemented as **key-optional** (`VITE_AISSTREAM_API_KEY`), with keyless global port coverage still active.

