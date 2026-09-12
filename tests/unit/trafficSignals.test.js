import { describe, it, expect } from 'vitest';
import {
  computeBearingDeg,
  getSignalColor,
  buildCrossroads,
} from '../../src/utils/trafficSignals';

describe('trafficSignals utility', () => {
  it('computes cardinal bearings accurately', () => {
    // North: lat increases, lon constant
    expect(computeBearingDeg(0, 0, 0, 1)).toBe(0);
    // East: lon increases, lat constant
    expect(computeBearingDeg(0, 0, 1, 0)).toBe(90);
    // South: lat decreases
    expect(computeBearingDeg(0, 0, 0, -1)).toBe(180);
    // West: lon decreases
    expect(computeBearingDeg(0, 0, -1, 0)).toBe(270);
  });

  it('guarantees dual-phase signals never show green simultaneously on conflicting axes', () => {
    const crossroad = {
      cycleDuration: 16,
      cycleOffset: 0,
      greenDuration: 6,
      amberDuration: 2,
    };

    // Test across entire 16-second cycle at 0.5s resolution
    for (let t = 0; t < 16; t += 0.5) {
      const ew = getSignalColor(crossroad, 'EW', t);
      const ns = getSignalColor(crossroad, 'NS', t);

      // EW and NS must never both be green
      const bothGreen = (ew === 'green' && ns === 'green');
      expect(bothGreen).toBe(false);

      // When EW is green or amber, NS must be red
      if (ew === 'green' || ew === 'amber') {
        expect(ns).toBe('red');
      }

      // When NS is green or amber, EW must be red
      if (ns === 'green' || ns === 'amber') {
        expect(ew).toBe('red');
      }
    }
  });

  it('detects crossroads between crossing roads', () => {
    // Road 1: East-West arterial through (0.01, 0.01)
    const road1 = {
      type: 'primary',
      coords: [
        [0.00, 0.01],
        [0.01, 0.01],
        [0.02, 0.01],
      ],
      waypoints: [],
    };

    // Road 2: North-South arterial through (0.01, 0.01)
    const road2 = {
      type: 'secondary',
      coords: [
        [0.01, 0.00],
        [0.01, 0.01],
        [0.01, 0.02],
      ],
      waypoints: [],
    };

    const crossroads = buildCrossroads([road1, road2]);
    expect(crossroads.length).toBeGreaterThanOrEqual(1);

    const cr = crossroads[0];
    expect(cr.coord[0]).toBeCloseTo(0.01, 3);
    expect(cr.coord[1]).toBeCloseTo(0.01, 3);

    // Verify back-mapped signals on road waypoints
    expect(road1.signals.has(1)).toBe(true);
    expect(road2.signals.has(1)).toBe(true);

    const sig1 = road1.signals.get(1);
    const sig2 = road2.signals.get(1);
    expect(sig1.axis).toBe('EW');
    expect(sig2.axis).toBe('NS');
  });

  it('ignores motorways for crossroad signals (freeways are grade-separated)', () => {
    const motorway = {
      type: 'motorway',
      coords: [[0, 0], [0.01, 0.01]],
      waypoints: [],
    };
    const crossroads = buildCrossroads([motorway]);
    expect(crossroads.length).toBe(0);
  });
});
