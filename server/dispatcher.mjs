import { handleOverpassRequest } from './routes/overpass.mjs';
import { handleTrafficStatus, handleTrafficFlowTile } from './routes/traffic.mjs';
import { handleCctvFrame, handleCctvSources, handleCctvHealth } from './routes/cctv.mjs';
import { handleFlights } from './routes/flights.mjs';
import { handleHealth } from './routes/health.mjs';
import { handleRadioStations, handleRadioClick } from './routes/radio.mjs';

const FLOW_TILE_REGEX = /^\/api\/(?:traffic|tomtom)\/flow\/(\d+)\/(\d+)\/(\d+)\.pbf$/;

export async function dispatchApiRequest(req, res, next) {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // CORS preflight handling
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return true;
  }

  // Overpass OSM Proxy
  if (pathname === '/api/overpass') {
    await handleOverpassRequest(req, res);
    return true;
  }

  // Traffic / TomTom Status
  if (pathname === '/api/traffic/status' || pathname === '/api/tomtom/status') {
    handleTrafficStatus(req, res);
    return true;
  }

  // Traffic / TomTom Flow Tile
  const flowMatch = pathname.match(FLOW_TILE_REGEX);
  if (flowMatch) {
    const [, z, x, y] = flowMatch;
    await handleTrafficFlowTile(req, res, z, x, y);
    return true;
  }

  // CCTV Frame Proxy
  if (pathname === '/api/cctv/frame') {
    await handleCctvFrame(req, res, urlObj.searchParams);
    return true;
  }

  // CCTV Sources
  if (pathname === '/api/cctv/sources') {
    handleCctvSources(req, res);
    return true;
  }

  // CCTV Health
  if (pathname === '/api/cctv/health') {
    handleCctvHealth(req, res);
    return true;
  }

  // Flights ADS-B
  if (pathname === '/api/flights') {
    await handleFlights(req, res, urlObj.searchParams);
    return true;
  }

  // Health
  if (pathname === '/api/health') {
    handleHealth(req, res);
    return true;
  }

  // Radio Browser Stations
  if (pathname === '/api/radio/stations') {
    await handleRadioStations(req, res, urlObj.searchParams);
    return true;
  }

  // Radio Station Click
  if (pathname.startsWith('/api/radio/click/')) {
    const stationId = pathname.slice('/api/radio/click/'.length);
    await handleRadioClick(req, res, stationId);
    return true;
  }

  // Pass to next middleware if not handled
  if (typeof next === 'function') {
    next();
  }
  return false;
}
