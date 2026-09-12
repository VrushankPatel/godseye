import { describe, it, expect } from 'vitest';
import {
  greatCircleKm,
  deriveFetchCenter,
  clampBoundsAroundCenter,
} from '../../src/utils/trafficBounds';
import {
  isValidTileCoord,
  lonLatToTile,
  tileToBBox,
  tilesForBounds,
} from '../../src/utils/tomtomTiles';
import { matchFlowToRoads, median } from '../../src/utils/flowMatch';

describe('trafficBounds geometry', () => {
  it('calculates greatCircleKm between known points correctly', () => {
    // London (51.5074, -0.1278) to Paris (48.8566, 2.3522) ~ 343 km
    const dist = greatCircleKm(51.5074, -0.1278, 48.8566, 2.3522);
    expect(dist).toBeGreaterThan(330);
    expect(dist).toBeLessThan(360);
  });

  it('falls back to nadir if ground hit is non-finite', () => {
    const center = deriveFetchCenter({
      nadirLat: 40.7128,
      nadirLon: -74.006,
      hitLat: NaN,
      hitLon: NaN,
    });
    expect(center.source).toBe('nadir');
    expect(center.lat).toBe(40.7128);
    expect(center.lon).toBe(-74.006);
  });

  it('uses ground hit when within maxPullKm', () => {
    const center = deriveFetchCenter({
      nadirLat: 40.7128,
      nadirLon: -74.006,
      hitLat: 40.72,
      hitLon: -74.01,
      maxPullKm: 12,
    });
    expect(center.source).toBe('hit');
    expect(center.lat).toBe(40.72);
    expect(center.lon).toBe(-74.01);
  });

  it('clamps bounds centered around target', () => {
    const clamped = clampBoundsAroundCenter(
      { south: 40.0, north: 41.0, west: -75.0, east: -73.0 },
      { lat: 40.7, lon: -74.0 },
      0.05
    );
    expect(clamped.north - clamped.south).toBeCloseTo(0.05, 5);
    expect(clamped.east - clamped.west).toBeCloseTo(0.05, 5);
    expect((clamped.north + clamped.south) / 2).toBeCloseTo(40.7, 5);
    expect((clamped.east + clamped.west) / 2).toBeCloseTo(-74.0, 5);
  });
});

describe('tomtomTiles slippy coordinates', () => {
  it('validates zoom and tile range', () => {
    expect(isValidTileCoord(12, 100, 200)).toBe(true);
    expect(isValidTileCoord(5, 10, 10)).toBe(false); // below MIN_TILE_ZOOM
    expect(isValidTileCoord(12, -1, 100)).toBe(false);
    expect(isValidTileCoord(12, 5000, 100)).toBe(false); // 2^12 = 4096 max
  });

  it('converts lon/lat to tile and back to bbox', () => {
    const tile = lonLatToTile(-74.006, 40.7128, 12);
    expect(tile.x).toBeGreaterThan(0);
    expect(tile.y).toBeGreaterThan(0);
    const bbox = tileToBBox(12, tile.x, tile.y);
    expect(bbox.west).toBeLessThanOrEqual(-74.006);
    expect(bbox.east).toBeGreaterThanOrEqual(-74.006);
    expect(bbox.south).toBeLessThanOrEqual(40.7128);
    expect(bbox.north).toBeGreaterThanOrEqual(40.7128);
  });

  it('generates tile coverage for bounds', () => {
    const bounds = { south: 40.7, north: 40.75, west: -74.05, east: -74.0 };
    const tiles = tilesForBounds(bounds, 12);
    expect(tiles.length).toBeGreaterThanOrEqual(1);
    expect(tiles.length).toBeLessThanOrEqual(4);
  });
});

describe('flowMatch algorithms', () => {
  it('computes median correctly', () => {
    expect(median([1, 5, 2, 8, 7])).toBe(5);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(null);
  });

  it('matches flow to parallel roads', () => {
    const roads = [
      {
        coords: [
          [-74.0, 40.7],
          [-74.0, 40.71],
          [-74.0, 40.72],
        ],
        type: 'primary',
      },
    ];
    const flowSegments = [
      {
        coords: [
          [-74.0, 40.7],
          [-74.0, 40.72],
        ],
        trafficLevel: 0.85,
        roadType: 'FRC1',
        closure: false,
      },
    ];
    const result = matchFlowToRoads(roads, flowSegments);
    expect(result.matchedCount).toBe(1);
    expect(result.matches[0].level).toBeCloseTo(0.85, 2);
    expect(result.matches[0].closure).toBe(false);
  });
});
