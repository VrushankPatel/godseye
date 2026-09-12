/**
 * @file Crossroad detection and dual-phase traffic signal controller for street traffic.
 */

export const SIGNAL_COLORS = {
  red: '#ff3344',
  amber: '#ffbb00',
  green: '#00ff88',
};

/**
 * Compute forward geodetic azimuth bearing between two [lon, lat] points in degrees (0-360).
 */
export function computeBearingDeg(lon1, lat1, lon2, lat2) {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const dLon = (lon2 - lon1) * toRad;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * toDeg;
  return Math.round((brng + 360) % 360);
}

/**
 * Get the current traffic light color for a given crossroad and approach axis.
 * Dual-phase controller guarantees East-West and North-South never have green simultaneously.
 *
 * @param {Object} crossroad
 * @param {'EW'|'NS'} axis
 * @param {number} nowSec - Epoch time in seconds
 * @returns {'green'|'amber'|'red'}
 */
export function getSignalColor(crossroad, axis, nowSec) {
  const C = crossroad.cycleDuration || 16;
  const G = crossroad.greenDuration || 6.5;
  const H = C / 2; // Half cycle
  const t = (nowSec + (crossroad.cycleOffset || 0)) % C;

  if (axis === 'EW') {
    if (t < G) return 'green';
    if (t < H) return 'amber';
    return 'red';
  } else {
    // NS axis
    if (t < H) return 'red';
    if (t < H + G) return 'green';
    return 'amber';
  }
}

/**
 * Identify crossroads by spatially clustering waypoints across distinct non-motorway roads.
 * Marks road waypoints with traffic signal controllers.
 *
 * @param {Array} roads - Parsed roads from OSM or synthetic grid
 * @returns {Array} List of crossroad objects
 */
export function buildCrossroads(roads) {
  if (!Array.isArray(roads) || !roads.length) return [];

  const CELL_SIZE_DEG = 0.00035; // ~35-40 meters
  const grid = new Map();

  // 1. Index waypoints of non-motorway roads into spatial hash
  roads.forEach((road, roadIdx) => {
    // Motorways/freeways are grade-separated, no crossroad stop signals
    if (road.type === 'motorway') return;
    const coords = road.coords;
    if (!coords || coords.length < 2) return;

    for (let wpIdx = 0; wpIdx < coords.length; wpIdx++) {
      const [lon, lat] = coords[wpIdx];
      const gx = Math.floor(lon / CELL_SIZE_DEG);
      const gy = Math.floor(lat / CELL_SIZE_DEG);
      const key = `${gx},${gy}`;

      if (!grid.has(key)) grid.set(key, []);

      // Determine road axis (EW vs NS) from segment direction
      let heading = 0;
      if (wpIdx < coords.length - 1) {
        heading = computeBearingDeg(coords[wpIdx][0], coords[wpIdx][1], coords[wpIdx + 1][0], coords[wpIdx + 1][1]);
      } else if (wpIdx > 0) {
        heading = computeBearingDeg(coords[wpIdx - 1][0], coords[wpIdx - 1][1], coords[wpIdx][0], coords[wpIdx][1]);
      }
      const isEW = (heading >= 45 && heading <= 135) || (heading >= 225 && heading <= 315);
      const axis = isEW ? 'EW' : 'NS';

      grid.get(key).push({ roadIdx, wpIdx, coord: [lon, lat], axis });
    }
  });

  const crossroads = [];
  const visitedKeys = new Set();
  let intersectionCount = 0;

  // 2. Identify intersection clusters
  for (const [key, entries] of grid.entries()) {
    if (visitedKeys.has(key)) continue;

    const uniqueRoads = new Set(entries.map((e) => e.roadIdx));
    const uniqueAxes = new Set(entries.map((e) => e.axis));

    // A true crossroad connects multiple roads or intersecting axes
    if (uniqueRoads.size >= 2 || (uniqueAxes.size >= 2 && entries.length >= 2)) {
      visitedKeys.add(key);

      let sumLon = 0;
      let sumLat = 0;
      entries.forEach((e) => {
        sumLon += e.coord[0];
        sumLat += e.coord[1];
      });
      const avgLon = sumLon / entries.length;
      const avgLat = sumLat / entries.length;

      // Deterministic staggered cycle per crossroad
      const seed = Math.abs(Math.sin(avgLon * 123.45 + avgLat * 678.9 + intersectionCount * 13.7)) % 1;
      const cycleDuration = 14 + Math.floor(seed * 6); // 14-19 seconds
      const cycleOffset = seed * cycleDuration;
      const greenDuration = Math.round(cycleDuration * 0.40); // 40% green per axis
      const amberDuration = 1.5; // 1.5s amber

      const crossroad = {
        id: `crossroad-${intersectionCount++}`,
        coord: [avgLon, avgLat],
        cycleDuration,
        cycleOffset,
        greenDuration,
        amberDuration,
        roadConnections: new Map(),
      };

      entries.forEach((e) => {
        if (!crossroad.roadConnections.has(e.roadIdx)) {
          crossroad.roadConnections.set(e.roadIdx, { wpIdx: e.wpIdx, axis: e.axis });
        }
      });

      crossroads.push(crossroad);
    }
  }

  // 3. Map crossroad signals back onto road waypoints for O(1) vehicle lookup
  roads.forEach((r) => {
    r.signals = new Map();
  });

  crossroads.forEach((cr) => {
    for (const [rIdx, conn] of cr.roadConnections.entries()) {
      if (roads[rIdx]) {
        roads[rIdx].signals.set(conn.wpIdx, {
          crossroad: cr,
          axis: conn.axis,
        });
      }
    }
  });

  return crossroads;
}
