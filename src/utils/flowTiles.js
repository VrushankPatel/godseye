import { PbfReader } from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';
import { tilesForBounds } from './tomtomTiles.js';

const FLOW_LAYER_NAME = 'Traffic flow';
const DECODE_CACHE_TTL_MS = 120_000;
const DECODE_CACHE_MAX_ENTRIES = 64;

const _decodeCache = new Map();
let _tilesFetched = 0;

export function decodeFlowTile(data, z, x, y) {
  let layer;
  try {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const tile = new VectorTile(new PbfReader(bytes));
    layer = tile.layers[FLOW_LAYER_NAME];
  } catch {
    return [];
  }
  if (!layer) return [];

  const segments = [];
  for (let i = 0; i < layer.length; i++) {
    let feature;
    let geometry;
    try {
      feature = layer.feature(i);
      geometry = feature.toGeoJSON(x, y, z).geometry;
    } catch {
      continue;
    }
    const props = feature.properties || {};
    const closure = props.road_closure === true || props.road_closure === 'true';
    const rawLevel = props.traffic_level;
    const hasLevel = typeof rawLevel === 'number' && Number.isFinite(rawLevel);

    if (!hasLevel && !closure) continue;
    const trafficLevel = hasLevel ? Math.min(1, Math.max(0, rawLevel)) : 0;
    const roadType = typeof props.road_type === 'string' ? props.road_type : '';

    const lines = geometry.type === 'LineString'
      ? [geometry.coordinates]
      : geometry.type === 'MultiLineString'
        ? geometry.coordinates
        : [];
    for (const coords of lines) {
      if (!Array.isArray(coords) || coords.length < 2) continue;
      segments.push({ coords, trafficLevel, roadType, closure });
    }
  }
  return segments;
}

function cacheSet(key, entry) {
  if (!_decodeCache.has(key) && _decodeCache.size >= DECODE_CACHE_MAX_ENTRIES) {
    const oldest = _decodeCache.keys().next().value;
    _decodeCache.delete(oldest);
  }
  _decodeCache.set(key, entry);
}

export async function fetchFlowForBounds(bounds, { signal, zoom = 12 } = {}) {
  const tiles = tilesForBounds(bounds, zoom);
  if (tiles.length === 0) return [];
  const now = Date.now();

  const results = await Promise.allSettled(tiles.map(async ({ z, x, y }) => {
    const key = `${z}/${x}/${y}`;
    const cached = _decodeCache.get(key);
    if (cached && now - cached.at < DECODE_CACHE_TTL_MS) return cached.segments;

    _tilesFetched += 1;
    const res = await fetch(`/api/traffic/flow/${z}/${x}/${y}.pbf`, { signal });
    if (!res.ok) throw new Error(`flow tile ${key}: HTTP ${res.status}`);
    const segments = decodeFlowTile(await res.arrayBuffer(), z, x, y);
    cacheSet(key, { at: Date.now(), segments });
    return segments;
  }));

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  if (fulfilled.length === 0) {
    return [];
  }
  return fulfilled.flatMap((r) => r.value);
}

export function resetFlowTileCache() {
  _decodeCache.clear();
}
