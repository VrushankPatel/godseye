import { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { WORLDCAMS_FEEDS } from '../constants/worldcamsFeeds';
import { isContinuousLiveCameraFeed } from '../services/cctvFeeds';
import { deriveFetchCenter, clampBoundsAroundCenter, greatCircleKm } from '../utils/trafficBounds';
import { matchFlowToRoads } from '../utils/flowMatch';
import { fetchFlowForBounds } from '../utils/flowTiles';
import { generateVehicleData } from '../utils/vehicleGenerator';
import {
  computeBearingDeg,
  getSignalColor,
  buildCrossroads,
  SIGNAL_COLORS,
} from '../utils/trafficSignals';
import {
  buildRoadNetwork,
  selectNextRoad,
  selectIntersectionTurn,
  transferVehicleToRoad,
  respawnVehicle,
  assignLaneOffset,
  computeLaneOffset,
} from '../utils/roadNetwork';

const ACTIVATION_ALTITUDE_METERS = 8000;
const FETCH_DEBOUNCE_MS = 320;
const MAX_DOTS_BUDGET = 5000;
const MAX_WAYPOINTS_PER_ROAD = 75;
const MIN_VIEW_SHIFT_KM = 0.35;
const DOT_HEIGHT_OFFSET = 3.0;

const SPEED_MPS = {
  motorway: 25,
  trunk: 20,
  primary: 14,
  secondary: 11,
  tertiary: 8,
  residential: 5,
  unclassified: 5,
};

const DENSITY_MULT = {
  motorway: 3.0,
  trunk: 2.5,
  primary: 2.0,
  secondary: 1.5,
  tertiary: 1.0,
  residential: 0.5,
  unclassified: 0.4,
};

const FLOW_COLORS = {
  free: Cesium.Color.fromCssColorString('#2ecc71').withAlpha(0.92),
  slow: Cesium.Color.fromCssColorString('#f0b23e').withAlpha(0.92),
  jam: Cesium.Color.fromCssColorString('#e05252').withAlpha(0.95),
};

const TRAFFIC_KEYWORDS = [
  'traffic', 'road', 'highway', 'street', 'bridge', 'airport', 'train', 'station', 'port',
];

function looksTrafficRelated(feed) {
  const haystack = `${feed.name || ''} ${feed.detailsUrl || ''}`.toLowerCase();
  return TRAFFIC_KEYWORDS.some((k) => haystack.includes(k));
}

function estimateRoadLengthDeg(coords) {
  let len = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const dx = coords[i + 1][0] - coords[i][0];
    const dy = coords[i + 1][1] - coords[i][1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len * 111000;
}

function parseOverpassRoads(overpassData) {
  if (!overpassData || !Array.isArray(overpassData.elements)) return [];
  const roads = [];

  for (const el of overpassData.elements) {
    if (el.type !== 'way' || !Array.isArray(el.geometry) || el.geometry.length < 2) continue;

    const rawCoords = el.geometry.map((g) => [g.lon, g.lat]);
    const simplifyStep = rawCoords.length > MAX_WAYPOINTS_PER_ROAD
      ? Math.ceil(rawCoords.length / MAX_WAYPOINTS_PER_ROAD)
      : 1;

    const coords = [];
    for (let i = 0; i < rawCoords.length; i += simplifyStep) {
      coords.push(rawCoords[i]);
    }
    const last = rawCoords[rawCoords.length - 1];
    const tail = coords[coords.length - 1];
    if (!tail || tail[0] !== last[0] || tail[1] !== last[1]) {
      coords.push(last);
    }
    if (coords.length < 2) continue;

    const type = el.tags?.highway || 'unclassified';
    const onewayTag = el.tags?.oneway;
    const oneway = (onewayTag === 'yes' || onewayTag === '1' || onewayTag === 'true' || el.tags?.junction === 'roundabout')
      ? 1
      : (onewayTag === '-1' ? -1 : 0);

    const waypoints = coords.map(([lng, lat]) =>
      Cesium.Cartesian3.fromDegrees(lng, lat, DOT_HEIGHT_OFFSET)
    );

    const segmentDist = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      segmentDist.push(Cesium.Cartesian3.distance(waypoints[i], waypoints[i + 1]));
    }

    roads.push({ coords, type, oneway, waypoints, segmentDist });
  }

  return roads;
}

function buildSyntheticRoadsAround(lat, lon) {
  const roads = [];
  const span = 0.02;
  const steps = 6;
  const types = ['motorway', 'primary', 'secondary', 'residential'];

  for (let i = -steps; i <= steps; i++) {
    const rLat = lat + (i * span) / steps;
    const type = types[Math.abs(i) % types.length];
    const coords = [
      [lon - span, rLat],
      [lon - span * 0.3, rLat + (Math.sin(i) * 0.002)],
      [lon + span * 0.3, rLat - (Math.cos(i) * 0.002)],
      [lon + span, rLat],
    ];
    const waypoints = coords.map(([cLon, cLat]) => Cesium.Cartesian3.fromDegrees(cLon, cLat, DOT_HEIGHT_OFFSET));
    const segmentDist = [];
    for (let j = 0; j < waypoints.length - 1; j++) {
      segmentDist.push(Cesium.Cartesian3.distance(waypoints[j], waypoints[j + 1]));
    }
    roads.push({ coords, type, oneway: i % 2 === 0 ? 1 : 0, waypoints, segmentDist });
  }

  for (let i = -steps; i <= steps; i++) {
    const rLon = lon + (i * span) / steps;
    const type = types[(Math.abs(i) + 1) % types.length];
    const coords = [
      [rLon, lat - span],
      [rLon + (Math.cos(i) * 0.002), lat - span * 0.3],
      [rLon - (Math.sin(i) * 0.002), lat + span * 0.3],
      [rLon, lat + span],
    ];
    const waypoints = coords.map(([cLon, cLat]) => Cesium.Cartesian3.fromDegrees(cLon, cLat, DOT_HEIGHT_OFFSET));
    const segmentDist = [];
    for (let j = 0; j < waypoints.length - 1; j++) {
      segmentDist.push(Cesium.Cartesian3.distance(waypoints[j], waypoints[j + 1]));
    }
    roads.push({ coords, type, oneway: i % 2 === 0 ? 1 : 0, waypoints, segmentDist });
  }

  return roads;
}

function simulateRoadFlow(roads) {
  return roads.map((road, idx) => {
    if (road.flow) return road;
    const first = road.coords[0] || [0, 0];
    const seed = Math.abs(Math.sin(first[0] * 12.9898 + first[1] * 78.233 + (idx + 1) * 43.12)) % 1;

    let simulatedLevel = 0.88; // Free flow by default
    if (road.type === 'motorway' || road.type === 'trunk') {
      simulatedLevel = seed > 0.85 ? 0.45 : (seed > 0.70 ? 0.65 : 0.95);
    } else if (road.type === 'primary' || road.type === 'secondary') {
      simulatedLevel = seed > 0.82 ? 0.22 : (seed > 0.50 ? 0.52 : 0.88);
    } else {
      simulatedLevel = seed > 0.88 ? 0.24 : (seed > 0.55 ? 0.55 : 0.85);
    }

    return {
      ...road,
      flow: {
        level: simulatedLevel,
        simulated: true,
        closure: false,
      },
    };
  });
}

export default function TrafficLayer({ viewer }) {
  const isEnabled = useStore((s) => s.layers.traffic.enabled);
  const activeShader = useStore((s) => s.activeShader);
  const updateData = useStore((s) => s.updateLayerData);
  const setStatus = useStore((s) => s.setLayerStatus);
  const markLayerFetchStart = useStore((s) => s.markLayerFetchStart);
  const trackedTarget = useStore((s) => s.trackedTarget);

  const pointCollectionRef = useRef(null);
  const signalsCollectionRef = useRef(null);
  const labelCollectionRef = useRef(null);
  const crossroadsRef = useRef([]);
  const roadsRef = useRef([]);
  const dotsRef = useRef([]);
  const corridorsRef = useRef([]);
  const feedEntitiesRef = useRef([]);
  const vehicleEntitiesRef = useRef(new Set());
  const scratchLerpRef = useRef(new Cesium.Cartesian3());
  const scratchOffsetRef = useRef(new Cesium.Cartesian3());
  const spawnCounterRef = useRef(10000);

  const lastAnimTimeRef = useRef(0);
  const debounceTimerRef = useRef(null);
  const lastFetchCenterRef = useRef(null);
  const isFetchingRef = useRef(false);
  const preRenderDisposerRef = useRef(null);
  const cameraDisposerRef = useRef(null);
  const liveModeRef = useRef(false);
  const lastTelemetryDispatchRef = useRef(0);
  const lastSignalUpdateRef = useRef(0);
  const trackedTargetRef = useRef(trackedTarget);

  useEffect(() => {
    trackedTargetRef.current = trackedTarget;
  }, [trackedTarget]);

  // Clear all rendered visual artifacts
  const clearVisuals = useCallback(() => {
    if (pointCollectionRef.current && viewer && !viewer.isDestroyed()) {
      viewer.scene.primitives.remove(pointCollectionRef.current);
      pointCollectionRef.current = null;
    }
    if (signalsCollectionRef.current && viewer && !viewer.isDestroyed()) {
      viewer.scene.primitives.remove(signalsCollectionRef.current);
      signalsCollectionRef.current = null;
    }
    if (labelCollectionRef.current && viewer && !viewer.isDestroyed()) {
      viewer.scene.primitives.remove(labelCollectionRef.current);
      labelCollectionRef.current = null;
    }
    corridorsRef.current.forEach((entity) => {
      if (viewer && !viewer.isDestroyed()) viewer.entities.remove(entity);
    });
    corridorsRef.current = [];
    feedEntitiesRef.current.forEach((entity) => {
      if (viewer && !viewer.isDestroyed()) viewer.entities.remove(entity);
    });
    feedEntitiesRef.current = [];
    vehicleEntitiesRef.current.forEach((entityId) => {
      if (viewer && !viewer.isDestroyed()) {
        const ent = viewer.entities.getById(entityId);
        if (ent) viewer.entities.remove(ent);
      }
    });
    vehicleEntitiesRef.current.clear();
    dotsRef.current = [];
    crossroadsRef.current = [];
    roadsRef.current = [];
  }, [viewer]);

  // Advance vehicles on each Cesium preRender tick with crossroad signal stopping
  const advanceVehicles = useCallback(() => {
    if (!viewer || viewer.isDestroyed() || !dotsRef.current.length) return;

    const now = Date.now();
    const nowSec = now / 1000;
    const prev = lastAnimTimeRef.current || now;
    const dt = Math.min((now - prev) / 1000, 0.1);
    lastAnimTimeRef.current = now;

    const scratch = scratchLerpRef.current;
    const dots = dotsRef.current;
    const trackedId = trackedTargetRef.current?.entityId;

    let trackedDot = null;

    // 1. Update visual traffic signal points every ~150ms
    if (now - lastSignalUpdateRef.current > 150) {
      lastSignalUpdateRef.current = now;
      const crossroads = crossroadsRef.current;
      for (let c = 0; c < crossroads.length; c++) {
        const cr = crossroads[c];
        if (cr.point) {
          const ewColor = getSignalColor(cr, 'EW', nowSec);
          const colorHex = SIGNAL_COLORS[ewColor] || '#00ff88';
          cr.point.color = Cesium.Color.fromCssColorString(colorHex);
        }
      }
    }

    // 2. Index dots by segment for anti-collision queue following (O(N) performance)
    const segMap = new Map();
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const key = `${d.roadIdx}:${d.segIdx}`;
      let list = segMap.get(key);
      if (!list) {
        list = [];
        segMap.set(key, list);
      }
      list.push(d);
    }

    // 3. Evaluate each vehicle's target velocity, signal stopping, and movement
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const segLen = dot.segmentDist[dot.segIdx] || 1;

      let targetMps = dot.cruiseMps;
      let sigStatus = 'ACTIVE TRANSIT';
      let sigColor = null;

      // Check upcoming crossroad signal
      const nextWp = dot.direction > 0 ? dot.segIdx + 1 : dot.segIdx;
      const signalInfo = dot.road?.signals?.get(nextWp);

      if (signalInfo) {
        const light = getSignalColor(signalInfo.crossroad, signalInfo.axis, nowSec);
        sigColor = light;

        const distToWp = dot.direction > 0 ? (1.0 - dot.t) * segLen : dot.t * segLen;

        if (light === 'red') {
          // Stop line buffer: ~3.5 meters before the crossroad intersection
          const stopBufferFrac = Math.min(0.12, 3.5 / segLen);
          const stopT = dot.direction > 0 ? (1.0 - stopBufferFrac) : stopBufferFrac;
          const isAtOrPastStop = dot.direction > 0 ? (dot.t >= stopT) : (dot.t <= stopT);

          if (isAtOrPastStop) {
            targetMps = 0;
            dot.t = stopT; // Hold precisely at the stop line
            sigStatus = 'SIGNAL STOP · RED LIGHT';
          } else if (distToWp < 32) {
            // Decelerate smoothly towards crossroad red light
            targetMps = 0;
            sigStatus = 'DECELERATING · RED LIGHT';
          }
        } else if (light === 'amber') {
          if (distToWp < 9) {
            // Too close to stop smoothly, proceed through intersection
            targetMps = dot.cruiseMps;
            sigStatus = 'CLEARING INTERSECTION';
          } else if (distToWp < 28) {
            targetMps = 0;
            sigStatus = 'DECELERATING · AMBER LIGHT';
          }
        } else if (light === 'green') {
          targetMps = dot.cruiseMps;
          sigStatus = 'SIGNAL GREEN · PROCEEDING';
        }
      }

      // Anti-collision car-following queue check (safe following headway behind stopped cars)
      const sameSegDots = segMap.get(`${dot.roadIdx}:${dot.segIdx}`);
      if (sameSegDots && sameSegDots.length > 1) {
        for (let j = 0; j < sameSegDots.length; j++) {
          const other = sameSegDots[j];
          if (other === dot || other.direction !== dot.direction) continue;

          if (dot.direction > 0 && other.t > dot.t) {
            const distAhead = (other.t - dot.t) * segLen;
            if (distAhead < 14) {
              targetMps = Math.min(targetMps, other.currentMps);
              if (distAhead < 7) {
                dot.t = Math.max(0, other.t - (7 / segLen));
                if (other.currentMps < 0.2) {
                  targetMps = 0;
                  sigStatus = 'QUEUED AT SIGNAL';
                  sigColor = 'red';
                }
              }
            }
          } else if (dot.direction < 0 && other.t < dot.t) {
            const distAhead = (dot.t - other.t) * segLen;
            if (distAhead < 14) {
              targetMps = Math.min(targetMps, other.currentMps);
              if (distAhead < 7) {
                dot.t = Math.min(1, other.t + (7 / segLen));
                if (other.currentMps < 0.2) {
                  targetMps = 0;
                  sigStatus = 'QUEUED AT SIGNAL';
                  sigColor = 'red';
                }
              }
            }
          }
        }
      }

      // Smooth realistic acceleration and braking
      const maxAccel = 3.5; // m/s²
      const maxDecel = 6.5; // m/s²
      if (targetMps < dot.currentMps) {
        dot.currentMps = Math.max(targetMps, dot.currentMps - maxDecel * dt);
      } else if (targetMps > dot.currentMps) {
        dot.currentMps = Math.min(targetMps, dot.currentMps + maxAccel * dt);
      }
      if (dot.currentMps < 0.05 && targetMps === 0) {
        dot.currentMps = 0;
      }

      // Advance position along segment if velocity is positive
      if (dot.currentMps > 0) {
        const tDelta = (dot.currentMps * dt) / segLen;
        dot.t += tDelta * dot.direction;

        if (dot.direction > 0) {
          if (dot.t >= 1.0) {
            dot.t -= 1.0;

            // Optional turn at intermediate crossroad along the road
            const intermediateTurn = dot.segIdx < dot.numSegments - 1
              ? selectIntersectionTurn(dot.road, dot.segIdx + 1, 0.22)
              : null;

            if (intermediateTurn && dot.vehicleData?.id !== trackedId) {
              transferVehicleToRoad(dot, intermediateTurn, roadsRef.current);
            } else {
              dot.segIdx++;
              if (dot.segIdx >= dot.numSegments) {
                // Reached end of current road segment
                const isTrackedTarget = dot.vehicleData && dot.vehicleData.id === trackedId;
                const reachedMaxTrip = (dot.tripLegs || 0) >= (dot.maxTripLegs || 10);

                if (reachedMaxTrip && !isTrackedTarget) {
                  respawnVehicle(dot, roadsRef.current, spawnCounterRef.current++);
                } else {
                  const nextConn = selectNextRoad(dot.road, dot.direction, {
                    visited: dot.visitedRoads,
                  });

                  if (nextConn) {
                    transferVehicleToRoad(dot, nextConn, roadsRef.current);
                  } else {
                    // Dead end cul-de-sac
                    if (isTrackedTarget) {
                      dot.direction = -1;
                      dot.segIdx = dot.numSegments - 1;
                      dot.t = 1.0;
                    } else {
                      respawnVehicle(dot, roadsRef.current, spawnCounterRef.current++);
                    }
                  }
                }
              }
            }
          }
        } else {
          // dot.direction < 0 (moving backward)
          if (dot.t <= 0.0) {
            dot.t += 1.0;

            const intermediateTurn = dot.segIdx > 0
              ? selectIntersectionTurn(dot.road, dot.segIdx, 0.22)
              : null;

            if (intermediateTurn && dot.vehicleData?.id !== trackedId) {
              transferVehicleToRoad(dot, intermediateTurn, roadsRef.current);
            } else {
              dot.segIdx--;
              if (dot.segIdx < 0) {
                // Reached start of current road segment
                const isTrackedTarget = dot.vehicleData && dot.vehicleData.id === trackedId;
                const reachedMaxTrip = (dot.tripLegs || 0) >= (dot.maxTripLegs || 10);

                if (reachedMaxTrip && !isTrackedTarget) {
                  respawnVehicle(dot, roadsRef.current, spawnCounterRef.current++);
                } else {
                  const nextConn = selectNextRoad(dot.road, dot.direction, {
                    visited: dot.visitedRoads,
                  });

                  if (nextConn) {
                    transferVehicleToRoad(dot, nextConn, roadsRef.current);
                  } else {
                    if (isTrackedTarget) {
                      dot.direction = 1;
                      dot.segIdx = 0;
                      dot.t = 0.0;
                    } else {
                      respawnVehicle(dot, roadsRef.current, spawnCounterRef.current++);
                    }
                  }
                }
              }
            }
          }
        }
      }

      dot.signalStatus = sigStatus;
      dot.signalColor = sigColor;

      const safeSegIdx = Math.max(0, Math.min(dot.numSegments - 1, dot.segIdx));
      const safeT = Math.max(0, Math.min(1, dot.t));

      Cesium.Cartesian3.lerp(
        dot.waypoints[safeSegIdx],
        dot.waypoints[safeSegIdx + 1],
        safeT,
        scratch
      );

      // Apply 3D geodetic lateral lane offset
      if (dot.laneOffsetMeters) {
        computeLaneOffset(
          dot.waypoints[safeSegIdx],
          dot.waypoints[safeSegIdx + 1],
          dot.laneOffsetMeters,
          scratchOffsetRef.current
        );
        Cesium.Cartesian3.add(scratch, scratchOffsetRef.current, scratch);
      }

      dot.point.position = scratch;

      if (dot.label) {
        dot.label.position = scratch;

        if (dot.currentMps === 0 && (dot.signalColor === 'red' || dot.signalStatus?.includes('STOP') || dot.signalStatus?.includes('QUEUED'))) {
          if (!dot.wasStopped) {
            dot.wasStopped = true;
            dot.label.text = `${dot.vehicleData.shortLabel} 🛑`;
            dot.label.outlineColor = Cesium.Color.fromCssColorString('#ff3344');
          }
        } else if (dot.wasStopped && dot.currentMps > 0.4) {
          dot.wasStopped = false;
          dot.label.text = dot.vehicleData.shortLabel;
          dot.label.outlineColor = Cesium.Color.BLACK;
        }
      }

      if (trackedId && dot.vehicleData && dot.vehicleData.id === trackedId) {
        trackedDot = dot;
      }
    }

    // Synchronize tracked vehicle entity position and camera along street
    if (trackedDot) {
      const targetEntity = viewer.entities.getById(trackedId);
      if (targetEntity) {
        targetEntity.position = Cesium.Cartesian3.clone(trackedDot.point.position);
      }

      // Compute heading/bearing along current road segment
      const coords = trackedDot.coords;
      const segIdx = Math.max(0, Math.min(trackedDot.numSegments - 1, trackedDot.segIdx));
      let headingDeg = 0;
      if (coords && coords[segIdx] && coords[segIdx + 1]) {
        const from = trackedDot.direction > 0 ? coords[segIdx] : coords[segIdx + 1];
        const to = trackedDot.direction > 0 ? coords[segIdx + 1] : coords[segIdx];
        headingDeg = computeBearingDeg(from[0], from[1], to[0], to[1]);
      }

      if (targetEntity?.properties) {
        targetEntity.properties._headingDeg = headingDeg;
      }

      // Broadcast live telemetry updates for VehicleDashboard
      if (now - lastTelemetryDispatchRef.current > 75) {
        lastTelemetryDispatchRef.current = now;
        const speedKmh = Math.round(trackedDot.currentMps * 3.6);
        const isStoppedAtSignal = trackedDot.currentMps === 0 && (trackedDot.signalColor === 'red' || trackedDot.signalStatus.includes('SIGNAL') || trackedDot.signalStatus.includes('QUEUED'));

        window.dispatchEvent(
          new CustomEvent('godseye:vehicle-telemetry', {
            detail: {
              id: trackedId,
              speedKmh,
              headingDeg,
              signalStatus: trackedDot.signalStatus || 'ACTIVE TRANSIT',
              signalColor: trackedDot.signalColor || null,
              isStopped: isStoppedAtSignal,
              roadName: trackedDot.vehicleData?.roadName || 'CORRIDOR ARTERIAL',
              roadType: trackedDot.vehicleData?.roadType || 'primary',
              destination: trackedDot.vehicleData?.destination || 'Downtown',
            },
          })
        );
      }
    }

    viewer.scene.requestRender();
  }, [viewer]);

  // Ensure tracked vehicle exists in viewer.entities when tracking is activated
  useEffect(() => {
    if (!trackedTarget?.entityId || trackedTarget.type !== 'traffic' || !viewer || viewer.isDestroyed()) {
      return;
    }

    const targetId = trackedTarget.entityId;
    let targetEntity = viewer.entities.getById(targetId);
    if (!targetEntity) {
      const dot = dotsRef.current.find((d) => d.vehicleData?.id === targetId);
      if (dot) {
        const initialPos = dot.point.position;
        targetEntity = viewer.entities.add({
          id: targetId,
          name: dot.vehicleData.name,
          position: Cesium.Cartesian3.clone(initialPos),
          point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString('#00ff95'),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            disableDepthTestDistance: 50000,
          },
          label: {
            text: dot.vehicleData.callsign || dot.vehicleData.name,
            font: 'bold 11px monospace',
            fillColor: Cesium.Color.fromCssColorString('#00ffc8'),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -16),
            disableDepthTestDistance: 50000,
          },
          properties: {
            ...dot.vehicleData,
            _layerType: 'traffic',
            _headingDeg: 0,
          },
        });
        vehicleEntitiesRef.current.add(targetId);
      }
    }
  }, [trackedTarget, viewer]);

  // Check TomTom status once
  useEffect(() => {
    fetch('/api/traffic/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.hasKey && data?.mode === 'live') {
          liveModeRef.current = true;
        }
      })
      .catch(() => {
        liveModeRef.current = false;
      });
  }, []);

  // Re-color or spawn dots on parsed roads
  const spawnDots = useCallback((roads, _altitude) => {
    if (!viewer || viewer.isDestroyed()) return;

    if (!pointCollectionRef.current) {
      pointCollectionRef.current = new Cesium.PointPrimitiveCollection();
      viewer.scene.primitives.add(pointCollectionRef.current);
    }
    pointCollectionRef.current.removeAll();

    if (!labelCollectionRef.current) {
      labelCollectionRef.current = new Cesium.LabelCollection();
      viewer.scene.primitives.add(labelCollectionRef.current);
    }
    labelCollectionRef.current.removeAll();
    dotsRef.current = [];

    const shaderMode = activeShader;
    let defaultColor = Cesium.Color.fromCssColorString('#00ffc8').withAlpha(0.92);
    if (shaderMode === 'GOD') {
      defaultColor = Cesium.Color.fromCssColorString('#ffd700').withAlpha(0.95);
    } else if (shaderMode === 'SURVEILLANCE') {
      defaultColor = Cesium.Color.fromCssColorString('#ff9900').withAlpha(0.95);
    }

    const dotCap = MAX_DOTS_BUDGET;
    let spawned = 0;

    for (let rIdx = 0; rIdx < roads.length; rIdx++) {
      const road = roads[rIdx];
      if (spawned >= dotCap) break;
      const numSegments = road.waypoints.length - 1;
      if (numSegments < 1) continue;

      const lenM = estimateRoadLengthDeg(road.coords);
      const mult = (DENSITY_MULT[road.type] || 1);
      const count = Math.max(1, Math.min(25, Math.floor((lenM / 100) * mult)));
      const baseMps = SPEED_MPS[road.type] || 6;

      let dotColor = defaultColor;
      if (road.flow) {
        if (road.flow.level >= 0.7) dotColor = FLOW_COLORS.free;
        else if (road.flow.level >= 0.3) dotColor = FLOW_COLORS.slow;
        else dotColor = FLOW_COLORS.jam;
      }

      for (let i = 0; i < count && spawned < dotCap; i++) {
        const segIdx = Math.floor(Math.random() * numSegments);
        const t = Math.random();
        const flowScale = road.flow ? Math.max(0.2, road.flow.level) : 1.0;
        const driverVariance = (Math.random() - 0.5) * 0.3; // -0.15 to +0.15
        const speed = baseMps * flowScale * (0.85 + driverVariance);
        const direction = road.oneway ? road.oneway : (i % 2 === 0 ? 1 : -1);

        const vehicleData = generateVehicleData(road, spawned);
        const coord = road.coords[segIdx] || [0, 0];
        vehicleData.longitude = Number(coord[0]).toFixed(4);
        vehicleData.latitude = Number(coord[1]).toFixed(4);
        vehicleData.speedKmh = Math.round(speed * 3.6);
        vehicleData.speedMph = Math.round(speed * 2.23694);

        const country = vehicleData.country || 'US';
        const laneOffsetMeters = assignLaneOffset(road.type, direction, spawned, country);

        // Vehicle paint styling
        const carPaint = vehicleData.paintColor || '#00ffc8';
        const carPointColor = shaderMode === 'DEFAULT'
          ? Cesium.Color.fromCssColorString(carPaint).withAlpha(0.95)
          : dotColor;

        const point = pointCollectionRef.current.add({
          position: Cesium.Cartesian3.clone(road.waypoints[segIdx]),
          pixelSize: road.type === 'motorway' ? 6.0 : 5.0,
          color: carPointColor,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.85),
          outlineWidth: 1.5,
          disableDepthTestDistance: 50000,
          id: vehicleData,
        });

        // Floating car brand/model label above moving vehicle
        const label = labelCollectionRef.current.add({
          position: Cesium.Cartesian3.clone(road.waypoints[segIdx]),
          text: vehicleData.shortLabel,
          font: 'bold 10px "JetBrains Mono", monospace, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -9),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 3200.0),
          disableDepthTestDistance: 50000,
        });

        dotsRef.current.push({
          point,
          label,
          vehicleData,
          waypoints: road.waypoints,
          coords: road.coords,
          segmentDist: road.segmentDist,
          numSegments,
          segIdx,
          t,
          mps: speed,
          cruiseMps: speed,
          currentMps: speed,
          driverVariance,
          laneOffsetMeters,
          direction,
          road,
          roadIdx: rIdx,
          spawnSeed: spawned,
          tripLegs: 0,
          maxTripLegs: 7 + Math.floor(Math.random() * 10),
          visitedRoads: [rIdx],
          wasStopped: false,
        });

        spawned++;
      }
    }

    viewer.scene.requestRender();
  }, [viewer, activeShader]);

  // Fetch real roads for the given bounds
  const fetchRoadsForBounds = useCallback(async (center, bounds) => {
    if (!viewer || viewer.isDestroyed() || isFetchingRef.current) return;
    isFetchingRef.current = true;
    markLayerFetchStart('traffic', { sourceName: 'OpenStreetMap Overpass + TomTom Flow' });
    setStatus('traffic', 'loading');

    const query = `[out:json][timeout:25];(way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified)"](${bounds.south},${bounds.west},${bounds.north},${bounds.east}););out geom qt;`;

    let overpassData = null;
    try {
      // 1. Fetch from local backend proxy
      const res = await fetch('/api/overpass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (res.ok) {
        overpassData = await res.json();
      }
    } catch {
      // Fallback
    }

    // 2. If proxy failed, try direct mirror (CORS-friendly public mirror)
    if (!overpassData || !Array.isArray(overpassData.elements)) {
      try {
        const directRes = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        if (directRes.ok) {
          overpassData = await directRes.json();
        }
      } catch {
        // Fall back to synthetic city grid
      }
    }

    let parsedRoads = parseOverpassRoads(overpassData);
    if (!parsedRoads.length) {
      // Synthesize realistic local grid around camera center if Overpass was offline
      parsedRoads = buildSyntheticRoadsAround(center.lat, center.lon);
    }

    // Match TomTom flow if live mode active
    if (liveModeRef.current) {
      try {
        const flowSegments = await fetchFlowForBounds(bounds);
        if (flowSegments && flowSegments.length) {
          const matchResult = matchFlowToRoads(parsedRoads, flowSegments);
          matchResult.matches.forEach((m, idx) => {
            if (m && parsedRoads[idx]) {
              parsedRoads[idx].flow = m;
            }
          });
        }
      } catch {
        // Fall back to simulation
      }
    }

    // Apply simulated congestion dynamics to any roads without live flow
    parsedRoads = simulateRoadFlow(parsedRoads);
    roadsRef.current = parsedRoads;

    // Build connected road graph topology
    buildRoadNetwork(parsedRoads);

    // Build crossroads and initialize traffic signal points
    const crossroads = buildCrossroads(parsedRoads);
    crossroadsRef.current = crossroads;

    if (!signalsCollectionRef.current) {
      signalsCollectionRef.current = new Cesium.PointPrimitiveCollection();
      viewer.scene.primitives.add(signalsCollectionRef.current);
    }
    signalsCollectionRef.current.removeAll();

    for (let c = 0; c < crossroads.length; c++) {
      const cr = crossroads[c];
      const pos = Cesium.Cartesian3.fromDegrees(cr.coord[0], cr.coord[1], DOT_HEIGHT_OFFSET + 0.8);
      const pt = signalsCollectionRef.current.add({
        position: pos,
        pixelSize: 8,
        color: Cesium.Color.fromCssColorString(SIGNAL_COLORS.green),
        outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
        outlineWidth: 1.5,
        disableDepthTestDistance: 50000,
        id: {
          id: cr.id,
          name: `TRAFFIC SIGNAL: ${cr.id.toUpperCase()}`,
          type: 'traffic',
          _layerType: 'traffic',
          isSignal: true,
          latitude: Number(cr.coord[1]).toFixed(4),
          longitude: Number(cr.coord[0]).toFixed(4),
          cycleDuration: `${cr.cycleDuration}s`,
          greenDuration: `${cr.greenDuration}s`,
          amberDuration: `${cr.amberDuration}s`,
          status: 'DUAL-PHASE SIGNAL CONTROLLER',
        },
      });
      cr.point = pt;
    }

    // Render polyline skeletons for major corridors
    corridorsRef.current.forEach((c) => viewer.entities.remove(c));
    corridorsRef.current = [];

    const majorRoads = parsedRoads.filter((r) => r.type === 'motorway' || r.type === 'trunk' || r.type === 'primary').slice(0, 120);
    majorRoads.forEach((r, idx) => {
      let corridorColor = Cesium.Color.fromCssColorString('#00ff95').withAlpha(0.55);
      if (r.flow) {
        if (r.flow.level < 0.3) corridorColor = Cesium.Color.fromCssColorString('#e05252').withAlpha(0.65);
        else if (r.flow.level < 0.7) corridorColor = Cesium.Color.fromCssColorString('#f0b23e').withAlpha(0.55);
      }
      const entity = viewer.entities.add({
        id: `traffic-corridor-${idx}`,
        polyline: {
          positions: r.waypoints,
          width: 3,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.45,
            taperPower: 0.4,
            color: corridorColor,
          }),
        },
      });
      corridorsRef.current.push(entity);
    });

    const alt = viewer.camera.positionCartographic.height;
    if (signalsCollectionRef.current) {
      signalsCollectionRef.current.show = alt <= ACTIVATION_ALTITUDE_METERS;
    }
    if (labelCollectionRef.current) {
      labelCollectionRef.current.show = alt <= ACTIVATION_ALTITUDE_METERS;
    }
    spawnDots(parsedRoads, alt);

    // Update store data
    const trafficPayload = parsedRoads.slice(0, 150).map((r, i) => ({
      id: `road-${i}`,
      type: r.type,
      lengthMeters: Math.round(estimateRoadLengthDeg(r.coords)),
      flowStatus: r.flow ? (r.flow.level >= 0.7 ? 'FREE FLOW' : (r.flow.level >= 0.3 ? 'SLOW' : 'JAMMED')) : 'FLOWING',
    }));

    updateData('traffic', trafficPayload, {
      sourceName: liveModeRef.current ? 'OSM Roads + TomTom Live Flow' : 'OSM Roads + Simulated Congestion Flow',
      isCached: false,
      health: 'live',
    });
    setStatus('traffic', 'active');
    isFetchingRef.current = false;
  }, [viewer, markLayerFetchStart, setStatus, spawnDots, updateData]);

  // Main camera listener and debounced viewport evaluation
  const evaluateViewport = useCallback(() => {
    if (!viewer || viewer.isDestroyed() || !isEnabled) return;

    const alt = viewer.camera.positionCartographic.height;
    if (alt > ACTIVATION_ALTITUDE_METERS) {
      if (pointCollectionRef.current) {
        pointCollectionRef.current.show = false;
      }
      if (signalsCollectionRef.current) {
        signalsCollectionRef.current.show = false;
      }
      if (labelCollectionRef.current) {
        labelCollectionRef.current.show = false;
      }
      corridorsRef.current.forEach((c) => { c.show = false; });
      setStatus('traffic', 'idle', { sourceName: 'Zoom in (<8km) to activate street traffic' });
      return;
    }

    if (pointCollectionRef.current) {
      pointCollectionRef.current.show = true;
    }
    if (signalsCollectionRef.current) {
      signalsCollectionRef.current.show = true;
    }
    if (labelCollectionRef.current) {
      labelCollectionRef.current.show = true;
    }
    corridorsRef.current.forEach((c) => { c.show = true; });

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const canvas = viewer.scene.canvas;
      const canvasCenter = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
      const hit = viewer.camera.pickEllipsoid(canvasCenter, viewer.scene.globe.ellipsoid);
      let hitLat, hitLon;
      if (hit) {
        const carto = Cesium.Cartographic.fromCartesian(hit);
        hitLat = Cesium.Math.toDegrees(carto.latitude);
        hitLon = Cesium.Math.toDegrees(carto.longitude);
      }

      const nadir = viewer.camera.positionCartographic;
      const nadirLat = Cesium.Math.toDegrees(nadir.latitude);
      const nadirLon = Cesium.Math.toDegrees(nadir.longitude);

      const center = deriveFetchCenter({ nadirLat, nadirLon, hitLat, hitLon, maxPullKm: 12 });

      if (lastFetchCenterRef.current) {
        const distKm = greatCircleKm(
          lastFetchCenterRef.current.lat,
          lastFetchCenterRef.current.lon,
          center.lat,
          center.lon
        );
        if (distKm < MIN_VIEW_SHIFT_KM && roadsRef.current.length > 0) {
          return; // Still in same area
        }
      }

      lastFetchCenterRef.current = center;
      const bounds = clampBoundsAroundCenter(
        { south: center.lat - 0.02, north: center.lat + 0.02, west: center.lon - 0.02, east: center.lon + 0.02 },
        center,
        0.045
      );

      fetchRoadsForBounds(center, bounds);
    }, FETCH_DEBOUNCE_MS);
  }, [viewer, isEnabled, setStatus, fetchRoadsForBounds]);

  // Mount CCTV traffic feeds
  useEffect(() => {
    if (!isEnabled || !viewer || viewer.isDestroyed()) return;

    // Add traffic-related CCTV feeds as interactive map entities
    const trafficFeeds = WORLDCAMS_FEEDS
      .filter((feed) => looksTrafficRelated(feed) && (feed.videoUrl || feed.url))
      .slice(0, 400);

    const entities = [];
    trafficFeeds.forEach((feed) => {
      const continuousLive = isContinuousLiveCameraFeed(feed);
      const entity = viewer.entities.add({
        id: `traffic-cctv-${feed.id}`,
        position: Cesium.Cartesian3.fromDegrees(feed.lng, feed.lat, 60),
        name: feed.name,
        point: {
          pixelSize: 5,
          color: Cesium.Color.fromCssColorString('#00ff95').withAlpha(0.9),
          outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
          outlineWidth: 1,
          disableDepthTestDistance: 9000000,
        },
        properties: {
          _layerType: 'traffic',
          id: feed.id,
          provider: feed.provider,
          city: feed.city || 'Unknown',
          latitude: feed.lat.toFixed(4),
          longitude: feed.lng.toFixed(4),
          url: feed.url || null,
          videoUrl: feed.videoUrl || null,
          fallbackUrl: feed.fallbackUrl || feed.url || null,
          continuousLive,
          status: continuousLive ? 'LIVE STREAM' : 'REFRESH FEED',
        },
      });
      entities.push(entity);
    });

    feedEntitiesRef.current = entities;
    return () => {
      entities.forEach((ent) => {
        if (viewer && !viewer.isDestroyed()) viewer.entities.remove(ent);
      });
      feedEntitiesRef.current = [];
    };
  }, [isEnabled, viewer]);

  // Main lifecycle
  useEffect(() => {
    if (!isEnabled || !viewer || viewer.isDestroyed()) {
      clearVisuals();
      setStatus('traffic', 'idle');
      return;
    }

    // Register preRender animation
    preRenderDisposerRef.current = viewer.scene.preRender.addEventListener(advanceVehicles);

    // Register camera changed listener
    cameraDisposerRef.current = viewer.camera.changed.addEventListener(evaluateViewport);

    // Initial evaluation
    evaluateViewport();

    return () => {
      if (preRenderDisposerRef.current) {
        preRenderDisposerRef.current();
        preRenderDisposerRef.current = null;
      }
      if (cameraDisposerRef.current) {
        cameraDisposerRef.current();
        cameraDisposerRef.current = null;
      }
      clearTimeout(debounceTimerRef.current);
      clearVisuals();
    };
  }, [isEnabled, viewer, advanceVehicles, evaluateViewport, clearVisuals, setStatus]);

  return null;
}
