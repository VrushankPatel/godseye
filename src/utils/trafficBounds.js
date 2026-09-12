/**
 * @file Pure geometry helpers for the traffic layer's viewport fetch bounds.
 */

const EARTH_RADIUS_KM = 6371;

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

/**
 * Great-circle distance between two lat/lon points (haversine).
 */
export function greatCircleKm(lat1, lon1, lat2, lon2) {
  const p1 = toRad(lat1);
  const p2 = toRad(lat2);
  const dp = toRad(lat2 - lat1);
  const dl = toRad(lon2 - lon1);
  const a = Math.sin(dp / 2) ** 2
    + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Initial bearing (radians) from point 1 toward point 2 along the great circle.
 */
function initialBearingRad(lat1, lon1, lat2, lon2) {
  const p1 = toRad(lat1);
  const p2 = toRad(lat2);
  const dl = toRad(lon2 - lon1);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return Math.atan2(y, x);
}

/**
 * Destination point given a start, an initial bearing, and a distance.
 */
function destinationPoint(lat, lon, bearingRad, distKm) {
  const delta = distKm / EARTH_RADIUS_KM;
  const p1 = toRad(lat);
  const l1 = toRad(lon);
  const p2 = Math.asin(
    Math.sin(p1) * Math.cos(delta) + Math.cos(p1) * Math.sin(delta) * Math.cos(bearingRad)
  );
  const l2 = l1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(delta) * Math.cos(p1),
    Math.cos(delta) - Math.sin(p1) * Math.sin(p2)
  );
  const lonDeg = ((toDeg(l2) + 540) % 360) - 180;
  return { lat: toDeg(p2), lon: lonDeg };
}

/**
 * Derive the road-fetch center from the camera's look-at ground point.
 */
export function deriveFetchCenter({ nadirLat, nadirLon, hitLat, hitLon, maxPullKm = 12 }) {
  if (!Number.isFinite(hitLat) || !Number.isFinite(hitLon)) {
    return { lat: nadirLat, lon: nadirLon, source: 'nadir' };
  }
  const distKm = greatCircleKm(nadirLat, nadirLon, hitLat, hitLon);
  if (distKm <= maxPullKm) {
    return { lat: hitLat, lon: hitLon, source: 'hit' };
  }
  const bearing = initialBearingRad(nadirLat, nadirLon, hitLat, hitLon);
  const pulled = destinationPoint(nadirLat, nadirLon, bearing, maxPullKm);
  return { lat: pulled.lat, lon: pulled.lon, source: 'pulled' };
}

/**
 * Clamp a bounding box's spans to `maxSpanDeg` and recenter it on `center`.
 */
export function clampBoundsAroundCenter(bounds, center, maxSpanDeg = 0.05) {
  const latSpan = Math.min(bounds.north - bounds.south, maxSpanDeg);
  const lonSpan = Math.min(bounds.east - bounds.west, maxSpanDeg);
  return {
    south: center.lat - latSpan / 2,
    north: center.lat + latSpan / 2,
    west: center.lon - lonSpan / 2,
    east: center.lon + lonSpan / 2,
  };
}
