import { describe, it, expect } from 'vitest';
import * as Cesium from 'cesium';
import {
  computeTurnAngleDeg,
  computeLaneOffset,
  assignLaneOffset,
  buildRoadNetwork,
  selectNextRoad,
  selectIntersectionTurn,
  transferVehicleToRoad,
  respawnVehicle,
} from '../../src/utils/roadNetwork.js';

describe('roadNetwork utility', () => {
  it('computes turn angles accurately', () => {
    // 0 deg straight
    expect(computeTurnAngleDeg(90, 90)).toBe(0);
    // 90 deg right turn (North to East)
    expect(computeTurnAngleDeg(0, 90)).toBe(90);
    // 90 deg left turn (East to North)
    expect(computeTurnAngleDeg(90, 0)).toBe(-90);
    // 180 deg U-turn
    expect(Math.abs(computeTurnAngleDeg(0, 180))).toBe(180);
  });

  it('computes 3D geodetic lateral lane offset perpendicular to segment', () => {
    // Points along equator: lat = 0, lon 0 -> lon 0.001 (Eastward)
    const pA = Cesium.Cartesian3.fromDegrees(0, 0, 0);
    const pB = Cesium.Cartesian3.fromDegrees(0.001, 0, 0);
    const offset = new Cesium.Cartesian3();

    computeLaneOffset(pA, pB, 3.5, offset);
    const mag = Cesium.Cartesian3.magnitude(offset);
    expect(mag).toBeCloseTo(3.5, 1);

    // Lateral displacement must be non-zero and roughly perpendicular
    const forward = Cesium.Cartesian3.subtract(pB, pA, new Cesium.Cartesian3());
    const dotProduct = Cesium.Cartesian3.dot(forward, offset);
    expect(Math.abs(dotProduct)).toBeLessThan(1.0); // essentially zero (perpendicular)
  });

  it('assigns realistic lane offsets for right-hand and left-hand driving countries', () => {
    // Right-hand country (US)
    const usFwd = assignLaneOffset('primary', 1, 0, 'US');
    const usBwd = assignLaneOffset('primary', -1, 0, 'US');
    expect(usFwd).toBeGreaterThan(0);
    expect(usBwd).toBeLessThan(0);

    // Left-hand country (IN)
    const inFwd = assignLaneOffset('primary', 1, 0, 'IN');
    const inBwd = assignLaneOffset('primary', -1, 0, 'IN');
    expect(inFwd).toBeLessThan(0);
    expect(inBwd).toBeGreaterThan(0);

    // Motorway multi-lanes provide multiple lane spacings
    const lane0 = assignLaneOffset('motorway', 1, 0, 'US');
    const lane1 = assignLaneOffset('motorway', 1, 1, 'US');
    const lane2 = assignLaneOffset('motorway', 1, 2, 'US');
    expect(lane1).toBeGreaterThan(lane0);
    expect(lane2).toBeGreaterThan(lane1);
  });

  it('builds road network graph connecting meeting roads', () => {
    // Road 1: West to East ending at (0.01, 0.01)
    const road1 = {
      type: 'primary',
      oneway: 0,
      coords: [
        [0.00, 0.01],
        [0.01, 0.01],
      ],
      waypoints: [
        Cesium.Cartesian3.fromDegrees(0.00, 0.01, 0),
        Cesium.Cartesian3.fromDegrees(0.01, 0.01, 0),
      ],
      segmentDist: [1113],
    };

    // Road 2: Continuing East from (0.01, 0.01) to (0.02, 0.01)
    const road2 = {
      type: 'primary',
      oneway: 0,
      coords: [
        [0.01, 0.01],
        [0.02, 0.01],
      ],
      waypoints: [
        Cesium.Cartesian3.fromDegrees(0.01, 0.01, 0),
        Cesium.Cartesian3.fromDegrees(0.02, 0.01, 0),
      ],
      segmentDist: [1113],
    };

    // Road 3: Turning North from (0.01, 0.01) to (0.01, 0.02)
    const road3 = {
      type: 'secondary',
      oneway: 0,
      coords: [
        [0.01, 0.01],
        [0.01, 0.02],
      ],
      waypoints: [
        Cesium.Cartesian3.fromDegrees(0.01, 0.01, 0),
        Cesium.Cartesian3.fromDegrees(0.01, 0.02, 0),
      ],
      segmentDist: [1113],
    };

    const roads = [road1, road2, road3];
    buildRoadNetwork(roads);

    // Road 1 ends at (0.01, 0.01) -> should have connections to Road 2 and Road 3
    expect(road1.connectionsEnd.length).toBeGreaterThanOrEqual(2);
    const connectedTo = road1.connectionsEnd.map((c) => c.nextRoadIdx);
    expect(connectedTo).toContain(1);
    expect(connectedTo).toContain(2);

    // Straight continuation (Road 2) should have a turn angle near 0
    const connRoad2 = road1.connectionsEnd.find((c) => c.nextRoadIdx === 1);
    expect(Math.abs(connRoad2.angleDeg)).toBeLessThan(10);

    // Left turn (Road 3, heading North) should have turn angle near -90
    const connRoad3 = road1.connectionsEnd.find((c) => c.nextRoadIdx === 2);
    expect(connRoad3.angleDeg).toBeCloseTo(-90, -1);
  });

  it('selects valid next road avoiding immediate backtrack', () => {
    const road1 = {
      connectionsEnd: [
        { nextRoadIdx: 0, angleDeg: 180, isBacktrack: true },
        { nextRoadIdx: 1, angleDeg: 0, isBacktrack: false },
        { nextRoadIdx: 2, angleDeg: 90, isBacktrack: false },
      ],
      connectionsStart: [],
    };

    const chosen = selectNextRoad(road1, 1, { visited: [] });
    expect(chosen).toBeDefined();
    expect(chosen.nextRoadIdx).not.toBe(0); // must not choose backtrack
  });

  it('transfers vehicle to connecting road seamlessly', () => {
    const road1 = {
      type: 'residential',
      name: 'Oak Street',
      coords: [[0, 0], [0.01, 0]],
      waypoints: [Cesium.Cartesian3.fromDegrees(0, 0, 0), Cesium.Cartesian3.fromDegrees(0.01, 0, 0)],
      segmentDist: [1113],
    };
    const road2 = {
      type: 'primary',
      name: 'Main Avenue',
      coords: [[0.01, 0], [0.02, 0]],
      waypoints: [Cesium.Cartesian3.fromDegrees(0.01, 0, 0), Cesium.Cartesian3.fromDegrees(0.02, 0, 0)],
      segmentDist: [1113],
    };
    const roads = [road1, road2];

    const dot = {
      road: road1,
      roadIdx: 0,
      waypoints: road1.waypoints,
      coords: road1.coords,
      segmentDist: road1.segmentDist,
      numSegments: 1,
      segIdx: 0,
      t: 1.0,
      direction: 1,
      cruiseMps: 5,
      driverVariance: 0,
      spawnSeed: 1,
      vehicleData: {
        roadName: 'Oak Street',
        roadType: 'residential',
      },
    };

    const nextConn = {
      nextRoadIdx: 1,
      entrySegIdx: 0,
      entryT: 0.0,
      entryDirection: 1,
    };

    const success = transferVehicleToRoad(dot, nextConn, roads);
    expect(success).toBe(true);
    expect(dot.roadIdx).toBe(1);
    expect(dot.vehicleData.roadName).toBe('Main Avenue');
    expect(dot.vehicleData.roadType).toBe('primary');
    expect(dot.tripLegs).toBe(1);
    expect(dot.t).toBe(0.0);
    expect(dot.segIdx).toBe(0);
  });

  it('selects intermediate intersection turns when available', () => {
    const road = {
      connectionsInter: new Map([
        [2, [{ nextRoadIdx: 5, entrySegIdx: 0, entryT: 0, entryDirection: 1 }]],
      ]),
    };

    // 100% probability roll
    const turn = selectIntersectionTurn(road, 2, 1.0);
    expect(turn).toBeDefined();
    expect(turn.nextRoadIdx).toBe(5);

    // 0% probability roll
    const noTurn = selectIntersectionTurn(road, 2, 0.0);
    expect(noTurn).toBeNull();
  });

  it('respawns completed vehicle onto active road network', () => {
    const road = {
      type: 'primary',
      name: 'Highway 101',
      coords: [[-122.4, 37.7], [-122.39, 37.71]],
      waypoints: [
        Cesium.Cartesian3.fromDegrees(-122.4, 37.7, 0),
        Cesium.Cartesian3.fromDegrees(-122.39, 37.71, 0),
      ],
      segmentDist: [1200],
    };
    const roads = [road];

    const dot = {
      road: null,
      point: { id: null },
      label: { text: '' },
    };

    respawnVehicle(dot, roads, 99);
    expect(dot.road).toBe(road);
    expect(dot.tripLegs).toBe(0);
    expect(dot.vehicleData).toBeDefined();
    expect(dot.vehicleData.callsign).toBeDefined();
    expect(dot.label.text).toBe(dot.vehicleData.shortLabel);
  });
});
