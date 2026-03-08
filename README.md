# Godseye 1.0

Godseye 1.0 is a frontend-only geospatial intelligence dashboard inspired by WorldView-style OSINT interfaces.
It renders a live 3D globe with real-time overlays for aircraft, satellites, seismic events, CCTV feeds, traffic simulation, and airspace zones.

## Vibe Coding Alert

This project is architected and directed by **Vrushank Patel**.
Implementation support was provided by **Codex** as a programming assistant for selected tasks such as UI scaffolding, layout generation, iterative refactoring, and technical acceleration during development.

## Highlights

- Fullscreen interactive 3D globe (CesiumJS)
- Tactical HUD UI with real-time feed counters and UTC recording clock
- Dynamic visual modes: Default, NVG, FLIR, CRT, Anime, God Mode
- Live layers (toggleable):
  - Aircraft (OpenSky, continuously updated)
  - Satellites (CelesTrak + browser propagation)
  - CCTV (municipal + curated global feeds)
  - Seismic activity (USGS)
  - Traffic flow animation + traffic camera points
  - Airspace / restricted zones
- Object inspector panel with metadata and media preview
- Flight filtering controls (carrier / cargo / passenger patterns)

## Tech Stack

- React + Vite
- CesiumJS
- Tailwind CSS
- Zustand (state)
- Browser `fetch` + timer/WebSocket-style polling patterns

## Run Locally

### Requirements

- Node.js 18+
- npm 9+

### Install and start

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

### Build

```bash
npm run build
npm run preview
```

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
- USGS Earthquake GeoJSON feeds
- Open/public municipal and curated world camera feeds
- Open geospatial traffic/airspace datasets

## Notes

- This project is intentionally backend-free: no server, no database, no auth.
- Some feeds can intermittently fail due to CORS limits, region blocks, source downtime, or third-party rate limiting.
- The app degrades gracefully and keeps other layers active when one source is unavailable.

## License

Licensed under Apache License 2.0. See [LICENSE](./LICENSE).
