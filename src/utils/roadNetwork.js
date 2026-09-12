/**
 * @file Road network graph builder and dynamic vehicle navigation engine.
 * Connects disjoint road segments into an interconnected street network,
 * allowing vehicles to navigate through intersections, turn onto connecting roads,
 * maintain realistic lane discipline, and avoid repetitive single-line looping.
 */

import * as Cesium from 'cesium';
import { computeBearingDeg } from './trafficSignals.js';
import { generateVehicleData } from './vehicleGenerator.js';

// Preallocated scratch vectors for 60fps preRender loop without GC allocations
const scratchV = new Cesium.Cartesian3();
const scratchU = new Cesium.Cartesian3();
const scratchR = new Cesium.Cartesian3();

// Countries with Left-Hand Traffic (drive on the left side of the road)
const LEFT_HAND_TRAFFIC_COUNTRIES = new Set([
  'IN', 'UK', 'GB', 'JP', 'AU', 'NZ', 'ZA', 'SG', 'TH', 'MY', 'ID',
  'IE', 'CY', 'MT', 'KE', 'TZ', 'UG', 'PK', 'BD', 'LK', 'NP', 'JM',
]);

const SPEED_MPS = {
  motorway: 25,
  trunk: 20,
  primary: 14,
  secondary: 11,
  tertiary: 8,
  residential: 5,
  unclassified: 5,
};

/**
 * Compute forward turn angle (-180 to +180) from incoming bearing to outgoing bearing.
 * - ~0 deg: Straight
 * - +90 deg: Right turn
 * - -90 deg: Left turn
 * - +-180 deg: U-turn / Backtrack
 */
export function computeTurnAngleDeg(incomingBearing, outgoingBearing) {
  const diff = (outgoingBearing - incomingBearing + 540) % 360 - 180;
  return Math.round(diff);
}

/**
 * Compute lateral lane offset vector perpendicular to segment direction in local horizon plane.
 *
 * @param {Cesium.Cartesian3} pA - Segment start point (ECEF)
 * @param {Cesium.Cartesian3} pB - Segment end point (ECEF)
 * @param {number} offsetMeters - Lateral offset (+ for right, - for left)
 * @param {Cesium.Cartesian3} result - Preallocated Cartesian3 to receive result
 * @returns {Cesium.Cartesian3}
 */
export function computeLaneOffset(pA, pB, offsetMeters, result) {
  if (!pA || !pB || offsetMeters === 0) {
    return Cesium.Cartesian3.clone(Cesium.Cartesian3.ZERO, result);
  }

  // Segment forward vector
  Cesium.Cartesian3.subtract(pB, pA, scratchV);
  const segLenSq = Cesium.Cartesian3.magnitudeSquared(scratchV);
  if (segLenSq < 0.0001) {
    return Cesium.Cartesian3.clone(Cesium.Cartesian3.ZERO, result);
  }

  // Local zenith/up vector at segment start (Earth-Centered normal)
  Cesium.Cartesian3.normalize(pA, scratchU);

  // Right-hand horizontal perpendicular vector: V x U
  Cesium.Cartesian3.cross(scratchV, scratchU, scratchR);
  const rLenSq = Cesium.Cartesian3.magnitudeSquared(scratchR);
  if (rLenSq < 0.0001) {
    return Cesium.Cartesian3.clone(Cesium.Cartesian3.ZERO, result);
  }

  Cesium.Cartesian3.normalize(scratchR, scratchR);
  Cesium.Cartesian3.multiplyByScalar(scratchR, offsetMeters, result);
  return result;
}

/**
 * Assign realistic lateral lane offset (in meters) based on road hierarchy, driving side, and direction.
 *
 * @param {string} roadType
 * @param {number} direction - +1 for forward, -1 for backward
 * @param {number} vehicleIndex
 * @param {string} [country='US']
 * @returns {number} Lateral offset in meters
 */
export function assignLaneOffset(roadType, direction, vehicleIndex, country = 'US') {
  const isLeftHand = LEFT_HAND_TRAFFIC_COUNTRIES.has(country);

  // Base lateral displacement from centerline for two-way streets
  // Right-hand traffic: Forward traffic moves right (+), Backward traffic moves left (-)
  // Left-hand traffic: Forward traffic moves left (-), Backward traffic moves right (+)
  const sideSign = isLeftHand
    ? (direction > 0 ? -1 : 1)
    : (direction > 0 ? 1 : -1);

  if (roadType === 'motorway' || roadType === 'trunk') {
    // Multi-lane freeway: 2 to 3 lanes in each direction
    const laneNum = Math.abs(vehicleIndex % 3); // Lane 0 (inside), Lane 1 (middle), Lane 2 (outside)
    const laneDistance = 2.0 + laneNum * 3.4; // 2.0m, 5.4m, 8.8m
    return sideSign * laneDistance;
  }

  if (roadType === 'primary') {
    const laneNum = Math.abs(vehicleIndex % 2); // 2 lanes
    const laneDistance = 1.8 + laneNum * 3.0; // 1.8m, 4.8m
    return sideSign * laneDistance;
  }

  if (roadType === 'secondary' || roadType === 'tertiary') {
    // Single lane each direction with slight natural driver variation
    const variation = ((Math.abs(vehicleIndex) % 5) - 2) * 0.25; // -0.5m to +0.5m
    return sideSign * (1.75 + variation);
  }

  // Residential / unclassified
  const variation = ((Math.abs(vehicleIndex) % 3) - 1) * 0.2;
  return sideSign * (1.4 + variation);
}

/**
 * Build an interconnected road graph from parsed road polylines.
 * Connects road segment endpoints and interior crossroads so vehicles can turn naturally.
 *
 * @param {Array} roads - List of road objects
 * @returns {Array} roads with connection graph properties attached
 */
export function buildRoadNetwork(roads) {
  if (!Array.isArray(roads) || !roads.length) return roads;

  // Spatial hash cell: ~25-30 meters (0.00025 deg)
  const CELL_SIZE_DEG = 0.00025;
  const junctionMap = new Map();

  function addToSpatialIndex(lon, lat, entry) {
    const gx = Math.floor(lon / CELL_SIZE_DEG);
    const gy = Math.floor(lat / CELL_SIZE_DEG);

    // Index in 3x3 neighboring cells for robust boundary-crossing intersection detection
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gx + dx},${gy + dy}`;
        let list = junctionMap.get(key);
        if (!list) {
          list = [];
          junctionMap.set(key, list);
        }
        list.push(entry);
      }
    }
  }

  // 1. Initialize connection structures on all roads
  roads.forEach((road, roadIdx) => {
    road.connectionsStart = [];
    road.connectionsEnd = [];
    road.connectionsInter = new Map();
    road._networkId = roadIdx;

    const coords = road.coords;
    if (!coords || coords.length < 2) return;

    const N = coords.length - 1;

    // Start point (wp 0)
    addToSpatialIndex(coords[0][0], coords[0][1], {
      roadIdx,
      wpIdx: 0,
      isEndpoint: true,
      coord: coords[0],
    });

    // End point (wp N)
    addToSpatialIndex(coords[N][0], coords[N][1], {
      roadIdx,
      wpIdx: N,
      isEndpoint: true,
      coord: coords[N],
    });

    // Interior waypoints (for crossroad turns)
    for (let k = 1; k < N; k++) {
      addToSpatialIndex(coords[k][0], coords[k][1], {
        roadIdx,
        wpIdx: k,
        isEndpoint: false,
        coord: coords[k],
      });
    }
  });

  // Helper distance check in approximate meters
  function distanceMeters(lon1, lat1, lon2, lat2) {
    const dLon = (lon2 - lon1) * Math.cos(((lat1 + lat2) * Math.PI) / 360);
    const dLat = lat2 - lat1;
    return Math.sqrt(dLon * dLon + dLat * dLat) * 111320;
  }

  const CONNECTION_MAX_DIST_METERS = 35;

  // 2. Discover connecting road segments for each road
  roads.forEach((road, rIdx) => {
    const coords = road.coords;
    if (!coords || coords.length < 2) return;
    const N = coords.length - 1;

    // Compute incoming bearing arriving at end of road (moving forward: coords[N-1] -> coords[N])
    const bearingArrivingEnd = computeBearingDeg(
      coords[N - 1][0], coords[N - 1][1],
      coords[N][0], coords[N][1]
    );

    // Compute incoming bearing arriving at start of road (moving backward: coords[1] -> coords[0])
    const bearingArrivingStart = computeBearingDeg(
      coords[1][0], coords[1][1],
      coords[0][0], coords[0][1]
    );

    // Find outgoing connections from the end point of road (N)
    const endKey = `${Math.floor(coords[N][0] / CELL_SIZE_DEG)},${Math.floor(coords[N][1] / CELL_SIZE_DEG)}`;
    const endCandidates = junctionMap.get(endKey) || [];
    const seenEndConnections = new Set();

    endCandidates.forEach((cand) => {
      if (cand.roadIdx === rIdx && cand.wpIdx === N) return; // Self
      const otherRoad = roads[cand.roadIdx];
      if (!otherRoad || !otherRoad.coords || otherRoad.coords.length < 2) return;

      const otherCoords = otherRoad.coords;
      const otherN = otherCoords.length - 1;
      const dist = distanceMeters(coords[N][0], coords[N][1], cand.coord[0], cand.coord[1]);
      if (dist > CONNECTION_MAX_DIST_METERS) return;

      // Case 1: Connects at otherRoad's start (wp 0) -> proceed forward (direction +1)
      if (cand.wpIdx === 0 && otherRoad.oneway >= 0) {
        const connKey = `${cand.roadIdx}:0:1`;
        if (!seenEndConnections.has(connKey)) {
          seenEndConnections.add(connKey);
          const outBearing = computeBearingDeg(
            otherCoords[0][0], otherCoords[0][1],
            otherCoords[1][0], otherCoords[1][1]
          );
          const angleDeg = computeTurnAngleDeg(bearingArrivingEnd, outBearing);
          road.connectionsEnd.push({
            nextRoadIdx: cand.roadIdx,
            entrySegIdx: 0,
            entryT: 0.0,
            entryDirection: 1,
            angleDeg,
            isBacktrack: cand.roadIdx === rIdx,
          });
        }
      }

      // Case 2: Connects at otherRoad's end (wp otherN) -> proceed backward (direction -1)
      if (cand.wpIdx === otherN && otherRoad.oneway <= 0) {
        const connKey = `${cand.roadIdx}:${otherN - 1}:-1`;
        if (!seenEndConnections.has(connKey)) {
          seenEndConnections.add(connKey);
          const outBearing = computeBearingDeg(
            otherCoords[otherN][0], otherCoords[otherN][1],
            otherCoords[otherN - 1][0], otherCoords[otherN - 1][1]
          );
          const angleDeg = computeTurnAngleDeg(bearingArrivingEnd, outBearing);
          road.connectionsEnd.push({
            nextRoadIdx: cand.roadIdx,
            entrySegIdx: otherN - 1,
            entryT: 1.0,
            entryDirection: -1,
            angleDeg,
            isBacktrack: cand.roadIdx === rIdx,
          });
        }
      }

      // Case 3: Connects at an interior waypoint of otherRoad (T-junction)
      if (cand.wpIdx > 0 && cand.wpIdx < otherN) {
        if (otherRoad.oneway >= 0) {
          const connKey = `${cand.roadIdx}:${cand.wpIdx}:1`;
          if (!seenEndConnections.has(connKey)) {
            seenEndConnections.add(connKey);
            const outBearing = computeBearingDeg(
              otherCoords[cand.wpIdx][0], otherCoords[cand.wpIdx][1],
              otherCoords[cand.wpIdx + 1][0], otherCoords[cand.wpIdx + 1][1]
            );
            const angleDeg = computeTurnAngleDeg(bearingArrivingEnd, outBearing);
            road.connectionsEnd.push({
              nextRoadIdx: cand.roadIdx,
              entrySegIdx: cand.wpIdx,
              entryT: 0.0,
              entryDirection: 1,
              angleDeg,
              isBacktrack: cand.roadIdx === rIdx,
            });
          }
        }
        if (otherRoad.oneway <= 0) {
          const connKey = `${cand.roadIdx}:${cand.wpIdx - 1}:-1`;
          if (!seenEndConnections.has(connKey)) {
            seenEndConnections.add(connKey);
            const outBearing = computeBearingDeg(
              otherCoords[cand.wpIdx][0], otherCoords[cand.wpIdx][1],
              otherCoords[cand.wpIdx - 1][0], otherCoords[cand.wpIdx - 1][1]
            );
            const angleDeg = computeTurnAngleDeg(bearingArrivingEnd, outBearing);
            road.connectionsEnd.push({
              nextRoadIdx: cand.roadIdx,
              entrySegIdx: cand.wpIdx - 1,
              entryT: 1.0,
              entryDirection: -1,
              angleDeg,
              isBacktrack: cand.roadIdx === rIdx,
            });
          }
        }
      }
    });

    // Find outgoing connections from the start point of road (wp 0)
    const startKey = `${Math.floor(coords[0][0] / CELL_SIZE_DEG)},${Math.floor(coords[0][1] / CELL_SIZE_DEG)}`;
    const startCandidates = junctionMap.get(startKey) || [];
    const seenStartConnections = new Set();

    startCandidates.forEach((cand) => {
      if (cand.roadIdx === rIdx && cand.wpIdx === 0) return;
      const otherRoad = roads[cand.roadIdx];
      if (!otherRoad || !otherRoad.coords || otherRoad.coords.length < 2) return;

      const otherCoords = otherRoad.coords;
      const otherN = otherCoords.length - 1;
      const dist = distanceMeters(coords[0][0], coords[0][1], cand.coord[0], cand.coord[1]);
      if (dist > CONNECTION_MAX_DIST_METERS) return;

      // Case 1: Connects to otherRoad start (wp 0) -> proceed forward (+1)
      if (cand.wpIdx === 0 && otherRoad.oneway >= 0) {
        const connKey = `${cand.roadIdx}:0:1`;
        if (!seenStartConnections.has(connKey)) {
          seenStartConnections.add(connKey);
          const outBearing = computeBearingDeg(
            otherCoords[0][0], otherCoords[0][1],
            otherCoords[1][0], otherCoords[1][1]
          );
          const angleDeg = computeTurnAngleDeg(bearingArrivingStart, outBearing);
          road.connectionsStart.push({
            nextRoadIdx: cand.roadIdx,
            entrySegIdx: 0,
            entryT: 0.0,
            entryDirection: 1,
            angleDeg,
            isBacktrack: cand.roadIdx === rIdx,
          });
        }
      }

      // Case 2: Connects to otherRoad end (wp otherN) -> proceed backward (-1)
      if (cand.wpIdx === otherN && otherRoad.oneway <= 0) {
        const connKey = `${cand.roadIdx}:${otherN - 1}:-1`;
        if (!seenStartConnections.has(connKey)) {
          seenStartConnections.add(connKey);
          const outBearing = computeBearingDeg(
            otherCoords[otherN][0], otherCoords[otherN][1],
            otherCoords[otherN - 1][0], otherCoords[otherN - 1][1]
          );
          const angleDeg = computeTurnAngleDeg(bearingArrivingStart, outBearing);
          road.connectionsStart.push({
            nextRoadIdx: cand.roadIdx,
            entrySegIdx: otherN - 1,
            entryT: 1.0,
            entryDirection: -1,
            angleDeg,
            isBacktrack: cand.roadIdx === rIdx,
          });
        }
      }

      // Case 3: Connects to interior waypoint of otherRoad
      if (cand.wpIdx > 0 && cand.wpIdx < otherN) {
        if (otherRoad.oneway >= 0) {
          const connKey = `${cand.roadIdx}:${cand.wpIdx}:1`;
          if (!seenStartConnections.has(connKey)) {
            seenStartConnections.add(connKey);
            const outBearing = computeBearingDeg(
              otherCoords[cand.wpIdx][0], otherCoords[cand.wpIdx][1],
              otherCoords[cand.wpIdx + 1][0], otherCoords[cand.wpIdx + 1][1]
            );
            const angleDeg = computeTurnAngleDeg(bearingArrivingStart, outBearing);
            road.connectionsStart.push({
              nextRoadIdx: cand.roadIdx,
              entrySegIdx: cand.wpIdx,
              entryT: 0.0,
              entryDirection: 1,
              angleDeg,
              isBacktrack: cand.roadIdx === rIdx,
            });
          }
        }
        if (otherRoad.oneway <= 0) {
          const connKey = `${cand.roadIdx}:${cand.wpIdx - 1}:-1`;
          if (!seenStartConnections.has(connKey)) {
            seenStartConnections.add(connKey);
            const outBearing = computeBearingDeg(
              otherCoords[cand.wpIdx][0], otherCoords[cand.wpIdx][1],
              otherCoords[cand.wpIdx - 1][0], otherCoords[cand.wpIdx - 1][1]
            );
            const angleDeg = computeTurnAngleDeg(bearingArrivingStart, outBearing);
            road.connectionsStart.push({
              nextRoadIdx: cand.roadIdx,
              entrySegIdx: cand.wpIdx - 1,
              entryT: 1.0,
              entryDirection: -1,
              angleDeg,
              isBacktrack: cand.roadIdx === rIdx,
            });
          }
        }
      }
    });

    // 3. Connect intermediate crossroads for dynamic street turns
    for (let k = 1; k < N; k++) {
      const interKey = `${Math.floor(coords[k][0] / CELL_SIZE_DEG)},${Math.floor(coords[k][1] / CELL_SIZE_DEG)}`;
      const interCandidates = junctionMap.get(interKey) || [];
      const turnsAtK = [];

      interCandidates.forEach((cand) => {
        if (cand.roadIdx === rIdx) return;
        const otherRoad = roads[cand.roadIdx];
        if (!otherRoad || !otherRoad.coords || otherRoad.coords.length < 2) return;

        const otherCoords = otherRoad.coords;
        const otherN = otherCoords.length - 1;
        const dist = distanceMeters(coords[k][0], coords[k][1], cand.coord[0], cand.coord[1]);
        if (dist > CONNECTION_MAX_DIST_METERS) return;

        // Turn option onto otherRoad
        if (cand.wpIdx === 0 && otherRoad.oneway >= 0) {
          turnsAtK.push({
            nextRoadIdx: cand.roadIdx,
            entrySegIdx: 0,
            entryT: 0.0,
            entryDirection: 1,
          });
        } else if (cand.wpIdx === otherN && otherRoad.oneway <= 0) {
          turnsAtK.push({
            nextRoadIdx: cand.roadIdx,
            entrySegIdx: otherN - 1,
            entryT: 1.0,
            entryDirection: -1,
          });
        } else if (cand.wpIdx > 0 && cand.wpIdx < otherN) {
          if (otherRoad.oneway >= 0) {
            turnsAtK.push({
              nextRoadIdx: cand.roadIdx,
              entrySegIdx: cand.wpIdx,
              entryT: 0.0,
              entryDirection: 1,
            });
          }
          if (otherRoad.oneway <= 0) {
            turnsAtK.push({
              nextRoadIdx: cand.roadIdx,
              entrySegIdx: cand.wpIdx - 1,
              entryT: 1.0,
              entryDirection: -1,
            });
          }
        }
      });

      if (turnsAtK.length > 0) {
        road.connectionsInter.set(k, turnsAtK);
      }
    }
  });

  return roads;
}

/**
 * Select the next road connection at the end of a road, preferring forward/turns over U-turns,
 * and avoiding recently visited roads to ensure vehicles travel across the city.
 *
 * @param {object} currentRoad
 * @param {number} direction - Current direction (+1 or -1)
 * @param {object} [options]
 * @param {Array<number>} [options.visited] - Recently visited road indices
 * @returns {object|null} Selected connection or null if dead-end
 */
export function selectNextRoad(currentRoad, direction, options = {}) {
  if (!currentRoad) return null;
  const connections = direction > 0 ? currentRoad.connectionsEnd : currentRoad.connectionsStart;
  if (!connections || connections.length === 0) return null;

  const visitedSet = new Set(options.visited || []);

  let bestCandidate = null;
  let highestScore = -Infinity;

  const candidatesWithScores = connections.map((conn) => {
    let score = 100;
    const absAngle = Math.abs(conn.angleDeg || 0);

    if (absAngle < 45) {
      score += 40; // Straight ahead
    } else if (absAngle < 115) {
      score += 25; // 90 degree turn
    } else {
      score -= 50; // Sharp hair-pin / U-turn
    }

    if (conn.isBacktrack) {
      score -= 80;
    }

    if (visitedSet.has(conn.nextRoadIdx)) {
      score -= 60; // Encourage exploring new streets
    }

    // Add small random noise for organic variability
    score += Math.random() * 20;

    return { conn, score };
  });

  for (let i = 0; i < candidatesWithScores.length; i++) {
    const item = candidatesWithScores[i];
    if (item.score > highestScore) {
      highestScore = item.score;
      bestCandidate = item.conn;
    }
  }

  return bestCandidate || connections[0];
}

/**
 * Optionally pick a dynamic turn at an interior intersection along the road.
 *
 * @param {object} currentRoad
 * @param {number} wpIdx - Intermediate waypoint index
 * @param {number} [turnProbability=0.22]
 * @returns {object|null} Turn connection or null
 */
export function selectIntersectionTurn(currentRoad, wpIdx, turnProbability = 0.22) {
  if (!currentRoad || !currentRoad.connectionsInter) return null;
  const turns = currentRoad.connectionsInter.get(wpIdx);
  if (!turns || turns.length === 0) return null;

  if (Math.random() < turnProbability) {
    const pick = turns[Math.floor(Math.random() * turns.length)];
    return pick;
  }
  return null;
}

/**
 * Transfer an active vehicle onto a new connected road smoothly without popping.
 *
 * @param {object} dot - The moving vehicle dot object
 * @param {object} nextConn - The connection object selected
 * @param {Array} roads - The parsed roads array
 * @returns {boolean} Success
 */
export function transferVehicleToRoad(dot, nextConn, roads) {
  const nextRoad = roads[nextConn.nextRoadIdx];
  if (!nextRoad || !nextRoad.waypoints || nextRoad.waypoints.length < 2) return false;

  dot.road = nextRoad;
  dot.roadIdx = nextConn.nextRoadIdx;
  dot.waypoints = nextRoad.waypoints;
  dot.coords = nextRoad.coords;
  dot.segmentDist = nextRoad.segmentDist;
  dot.numSegments = nextRoad.waypoints.length - 1;

  dot.direction = nextConn.entryDirection;
  dot.segIdx = Math.max(0, Math.min(dot.numSegments - 1, nextConn.entrySegIdx));
  dot.t = nextConn.entryT !== undefined ? nextConn.entryT : (dot.direction > 0 ? 0.0 : 1.0);

  // Maintain road history to avoid looping back
  if (!dot.visitedRoads) dot.visitedRoads = [];
  dot.visitedRoads.push(dot.roadIdx);
  if (dot.visitedRoads.length > 6) {
    dot.visitedRoads.shift();
  }

  dot.tripLegs = (dot.tripLegs || 0) + 1;

  // Recalculate cruise speed and lane offset for the new road
  const baseMps = SPEED_MPS[nextRoad.type] || 6;
  const flowScale = nextRoad.flow ? Math.max(0.2, nextRoad.flow.level) : 1.0;
  dot.cruiseMps = baseMps * flowScale * (0.85 + (dot.driverVariance || 0.15));

  const country = dot.vehicleData?.country || 'US';
  dot.laneOffsetMeters = assignLaneOffset(nextRoad.type, dot.direction, dot.spawnSeed || 0, country);

  // Dynamically update vehicle metadata with current roadway
  if (dot.vehicleData) {
    dot.vehicleData.roadName = nextRoad.name || `${nextRoad.type.toUpperCase()} ARTERIAL`;
    dot.vehicleData.roadType = nextRoad.type;
    dot.vehicleData.flowStatus = nextRoad.flow
      ? (nextRoad.flow.level >= 0.7 ? 'FREE FLOW' : (nextRoad.flow.level >= 0.3 ? 'MODERATE SLOW' : 'BOTTLENECK QUEUE'))
      : 'FLOWING NORMALLY';
    dot.vehicleData.flowLevel = nextRoad.flow ? Math.round(nextRoad.flow.level * 100) : 88;
  }

  return true;
}

/**
 * Naturally complete a vehicle trip and respawn cleanly onto an active road elsewhere on the map,
 * refreshing destination and fleet details so traffic continuously circulates across the city.
 *
 * @param {object} dot - The vehicle dot object
 * @param {Array} roads - Road network
 * @param {number} spawnIndex - Fresh spawn counter
 * @param {object} [options]
 */
export function respawnVehicle(dot, roads, spawnIndex, options = {}) {
  if (!roads || roads.length === 0) return;

  // Pick a fresh active road with adequate length
  let newRoadIdx = Math.floor(Math.random() * roads.length);
  let newRoad = roads[newRoadIdx];
  for (let attempt = 0; attempt < 5; attempt++) {
    if (newRoad && newRoad.waypoints && newRoad.waypoints.length >= 2) break;
    newRoadIdx = Math.floor(Math.random() * roads.length);
    newRoad = roads[newRoadIdx];
  }

  if (!newRoad || !newRoad.waypoints || newRoad.waypoints.length < 2) return;

  const numSegments = newRoad.waypoints.length - 1;
  const segIdx = Math.floor(Math.random() * numSegments);
  const direction = newRoad.oneway ? newRoad.oneway : (Math.random() > 0.5 ? 1 : -1);
  const t = Math.random();

  const driverVariance = (Math.random() - 0.5) * 0.3; // -0.15 to +0.15
  const baseMps = SPEED_MPS[newRoad.type] || 6;
  const flowScale = newRoad.flow ? Math.max(0.2, newRoad.flow.level) : 1.0;
  const cruiseMps = baseMps * flowScale * (0.85 + driverVariance);

  // Generate fresh regional vehicle metadata
  const vehicleData = generateVehicleData(newRoad, spawnIndex, options);
  const country = vehicleData.country || 'US';
  const laneOffsetMeters = assignLaneOffset(newRoad.type, direction, spawnIndex, country);

  dot.road = newRoad;
  dot.roadIdx = newRoadIdx;
  dot.waypoints = newRoad.waypoints;
  dot.coords = newRoad.coords;
  dot.segmentDist = newRoad.segmentDist;
  dot.numSegments = numSegments;
  dot.segIdx = segIdx;
  dot.direction = direction;
  dot.t = t;
  dot.mps = cruiseMps;
  dot.cruiseMps = cruiseMps;
  dot.currentMps = cruiseMps;
  dot.driverVariance = driverVariance;
  dot.laneOffsetMeters = laneOffsetMeters;
  dot.vehicleData = vehicleData;
  dot.spawnSeed = spawnIndex;
  dot.tripLegs = 0;
  dot.maxTripLegs = 7 + Math.floor(Math.random() * 10);
  dot.visitedRoads = [newRoadIdx];
  dot.wasStopped = false;

  // Update visual point ID and label
  if (dot.point) {
    dot.point.id = vehicleData;
    if (dot.vehicleData?.paintColor) {
      dot.point.color = Cesium.Color.fromCssColorString(dot.vehicleData.paintColor || '#00ffc8').withAlpha(0.95);
    }
  }
  if (dot.label) {
    dot.label.text = vehicleData.shortLabel;
    dot.label.outlineColor = Cesium.Color.BLACK;
  }
}
