# Full-Fledged Surveillance Platform Research (Frontend-First)

## 1) What a full surveillance platform should look like

A production-grade surveillance platform is usually built around a **Common Operating Picture (COP)** and **multi-agency information sharing** workflow, not just map markers.

Key capability pillars:

1. **Persistent COP**
- Always-on geospatial scene with live tracks, incidents, and alerts.
- Prioritized by operational relevance and confidence score.

2. **Multi-source data fusion**
- Correlate camera, ADS-B, satellite, seismic, and incident streams into one timeline.
- Entity resolution (same object seen by multiple feeds).

3. **Track lifecycle + response workflow**
- Detect -> classify -> investigate -> escalate -> close.
- Audit log and replay timeline for after-action review.

4. **Interoperability standards**
- Camera and VMS interoperability via ONVIF profiles.
- Sensor interoperability via OGC SensorThings.
- Alert interoperability via CAP.

5. **Resilience and trust**
- Fail-safe ingestion, source health scoring, stale-data banners, fallback feeds.
- Privacy/legal controls and role-based data visibility.

## 2) Sources informing this model

- DHS Fusion Centers (threat info sharing model): https://www.dhs.gov/fusion-centers
- DHS COP concept summary: https://www.dhs.gov/publication/common-operating-picture-emergency-responders
- ONVIF Profile S (and deprecation context): https://www.onvif.org/profiles/profile-s/
- ONVIF Profile S deprecation Q&A: https://www.onvif.org/profiles-2/profile-s/profile-s-deprecation-qna/
- OGC SensorThings API standard: https://www.ogc.org/publications/standard/sensorthings/
- OASIS CAP v1.2: https://www.oasis-open.org/standard/cap/
- OpenSky API docs: https://openskynetwork.github.io/opensky-api/
- CelesTrak GP data formats: https://www.celestrak.org/NORAD/documentation/gp-data-formats.php
- USGS Earthquake GeoJSON feed docs: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
- NASA EONET API docs: https://eonet.gsfc.nasa.gov/docs/v3
- UCDP conflict data program: https://www.uu.se/en/department/peace-and-conflict-research/research/ucdp/

## 3) Layer relevance for Godseye UI

### Operational Core (always visible in main list)
- Aircraft
- Satellites
- Seismic
- Airports
- Seis Stations
- CCTV
- Traffic
- Conflicts
- Military Activity
- Military Bases
- No-Go Zones
- Airspace

### Contextual / Auxiliary (moved under OTHERS)
- Weather
- Air Quality
- Hazards
- Disasters
- Ocean Buoys
- Volcanoes
- Space Weather
- METAR WX
- Fire Hotspots
- Air Hazards
- Solar Flares

## 4) Next high-value surveillance layers to add

1. **Maritime vessel layer (AIS)**
- Why: closes sea-domain blind spot.
- Candidate feeds: Global Fishing Watch APIs (token-based), other AIS providers.

2. **Critical infrastructure status**
- Power outages, telecom disruptions, major port/rail disruptions.
- Helps explain secondary effects on traffic and emergency patterns.

3. **Border and maritime exclusion zones**
- Adds legal/geofence context to moving tracks.

4. **Incident workflow layer**
- Analyst annotations, watchlists, and per-target confidence state.

5. **Source quality scoring layer**
- Data freshness, source latency, source uptime, and confidence-by-layer.

