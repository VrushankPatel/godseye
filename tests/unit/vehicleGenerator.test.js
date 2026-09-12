import { describe, it, expect } from 'vitest';
import { generateVehicleData } from '../../src/utils/vehicleGenerator';

describe('vehicleGenerator', () => {
  const dummyMotorway = {
    type: 'motorway',
    name: 'Interstate 80 Express',
    coords: [[-122.4194, 37.7749], [-122.4180, 37.7755]],
    waypoints: [[0, 0], [1, 1]],
    flow: { level: 0.85 },
  };

  const dummyResidential = {
    type: 'residential',
    name: 'Elm Street',
    coords: [[-122.4194, 37.7749], [-122.4180, 37.7755]],
    waypoints: [[0, 0], [0.1, 0.1]],
    flow: { level: 0.45 },
  };

  const dummyIndiaRoad = {
    type: 'residential',
    name: 'MG Road Bengaluru',
    coords: [[77.5946, 12.9716], [77.5950, 12.9720]],
    waypoints: [[0, 0], [0.1, 0.1]],
    flow: { level: 0.6 },
  };

  it('generates rich vehicle metadata matching required schema', () => {
    const v = generateVehicleData(dummyMotorway, 1);

    expect(v.id).toBe('vehicle-motorway-1');
    expect(v._entityId).toBe('vehicle-motorway-1');
    expect(v._layerType).toBe('traffic');
    expect(v.type).toBe('traffic');
    expect(v.isVehicle).toBe(true);

    expect(typeof v.name).toBe('string');
    expect(typeof v.callsign).toBe('string');
    expect(v.callsign).toMatch(/^[A-Z]+-\d{3}$/);
    expect(v.plate).toMatch(/^[A-Z]{2} · \d{4}$/);

    expect(typeof v.vehicleClass).toBe('string');
    expect(typeof v.vehicleCategory).toBe('string');
    expect(typeof v.model).toBe('string');
    expect(typeof v.powertrain).toBe('string');
    expect(typeof v.batteryFuel).toBe('string');
    expect(typeof v.driverMode).toBe('string');
    expect(typeof v.destination).toBe('string');
    expect(v.roadType).toBe('motorway');
    expect(v.roadName).toBe('Interstate 80 Express');

    expect(v.flowLevel).toBe(85);
    expect(v.flowStatus).toBe('FREE FLOW');
    expect(v.status).toBe('ACTIVE TRANSIT');
  });

  it('generates deterministic data for consistent seeds', () => {
    const v1 = generateVehicleData(dummyResidential, 42);
    const v2 = generateVehicleData(dummyResidential, 42);

    expect(v1.id).toBe(v2.id);
    expect(v1.callsign).toBe(v2.callsign);
    expect(v1.plate).toBe(v2.plate);
    expect(v1.model).toBe(v2.model);
    expect(v1.destination).toBe(v2.destination);
  });

  it('produces distinct callsigns and models for different indices', () => {
    const vehicles = [0, 1, 2, 3, 4, 5].map((i) => generateVehicleData(dummyResidential, i));
    const callsigns = new Set(vehicles.map((v) => v.callsign));

    expect(callsigns.size).toBe(vehicles.length);
  });

  it('handles road with missing flow gracefully', () => {
    const noFlowRoad = {
      type: 'secondary',
      coords: [[-122.4194, 37.7749]],
      waypoints: [[0, 0]],
    };
    const v = generateVehicleData(noFlowRoad, 5);

    expect(v.flowLevel).toBe(88);
    expect(v.flowStatus).toBe('FLOWING NORMALLY');
    expect(v.roadName).toBe('SECONDARY ARTERIAL');
  });

  it('generates real-world Toyota and Tesla models with brand metadata and shortLabels in the US', () => {
    const samples = Array.from({ length: 40 }, (_, i) => generateVehicleData(dummyResidential, i));
    const brands = new Set(samples.map((s) => s.brand));

    expect(brands.has('Tesla') || brands.has('Toyota')).toBe(true);

    const teslaSample = samples.find((s) => s.brand === 'Tesla');
    if (teslaSample) {
      expect(teslaSample.shortLabel).toMatch(/Tesla|Cybertruck/);
      expect(typeof teslaSample.paintColor).toBe('string');
      expect(typeof teslaSample.shortModel).toBe('string');
    }

    const toyotaSample = samples.find((s) => s.brand === 'Toyota');
    if (toyotaSample) {
      expect(toyotaSample.shortLabel).toMatch(/Toyota|Land Cruiser/);
      expect(typeof toyotaSample.paintColor).toBe('string');
      expect(typeof toyotaSample.shortModel).toBe('string');
    }
  });

  it('generates authentic Indian vehicles in India and never Ford F-150', () => {
    const samples = Array.from({ length: 30 }, (_, i) => generateVehicleData(dummyIndiaRoad, i));
    const brands = new Set(samples.map((s) => s.brand));

    expect(brands.has('Maruti Suzuki') || brands.has('Tata Motors') || brands.has('Mahindra')).toBe(true);
    expect(samples.some((s) => s.model.includes('F-150'))).toBe(false);
    expect(samples.some((s) => s.model.includes('Cybertruck'))).toBe(false);

    samples.forEach((s) => {
      expect(s.country).toBe('IN');
      expect(s.countryName).toBe('India');
      expect(s.plate).toMatch(/^[A-Z]{2} \d{2} [A-Z]{2} \d{4}$/);
    });
  });
});
