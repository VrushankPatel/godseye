/**
 * @file Pure tile math for TomTom traffic flow tiles.
 */

export const MIN_TILE_ZOOM = 8;
export const MAX_TILE_ZOOM = 16;
const MERCATOR_LAT_LIMIT = 85.05112878;

export function isValidTileCoord(z, x, y) {
  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (z < MIN_TILE_ZOOM || z > MAX_TILE_ZOOM) return false;
  const n = 2 ** z;
  return x >= 0 && x < n && y >= 0 && y < n;
}

export function lonLatToTile(lon, lat, z) {
  const n = 2 ** z;
  const clampedLat = Math.max(-MERCATOR_LAT_LIMIT, Math.min(MERCATOR_LAT_LIMIT, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
}

export function tileToBBox(z, x, y) {
  const n = 2 ** z;
  const lonAt = (col) => (col / n) * 360 - 180;
  const latAt = (row) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * row) / n))) * 180) / Math.PI;
  return {
    west: lonAt(x),
    east: lonAt(x + 1),
    north: latAt(y),
    south: latAt(y + 1),
  };
}

export function tilesForBounds(bounds, zoom = 12, { maxTiles = 64 } = {}) {
  if (!bounds) return [];
  const { south, west, north, east } = bounds;
  if (![south, west, north, east].every(Number.isFinite)) return [];
  const nw = lonLatToTile(Math.min(west, east), Math.max(south, north), zoom);
  const se = lonLatToTile(Math.max(west, east), Math.min(south, north), zoom);
  const tiles = [];
  for (let y = nw.y; y <= se.y; y++) {
    for (let x = nw.x; x <= se.x; x++) {
      if (tiles.length >= maxTiles) return tiles;
      tiles.push({ z: zoom, x, y });
    }
  }
  return tiles;
}
