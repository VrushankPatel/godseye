/**
 * @file Vehicle classification, callsign, and telemetry generator for street traffic simulation.
 * Utilizes geodetic country detection and authentic 20-car fleets per region.
 */

import {
  COUNTRY_FLEETS,
  detectCountry,
  getCountryFleet,
  generateRegionalPlate,
  getCountryName,
} from './countryFleets.js';

// Backwards compatibility export
export const VEHICLE_TEMPLATES = COUNTRY_FLEETS.US;

const CALLSIGN_PREFIXES = [
  'APEX', 'UNIT', 'ECHO', 'VECTOR', 'METRO', 'ORBIT', 'TITAN', 'CYBER', 'DELTA', 'SWIFT', 'NEXUS', 'SOLAR',
];

function pseudoRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate complete simulated telemetry for a vehicle along a road segment.
 * @param {object} road - Road data with waypoints, coords, type, name, etc.
 * @param {number} index - Spawn index of the vehicle
 * @param {object} [options] - Additional options (e.g. override country)
 * @returns {object} Full vehicle data
 */
export function generateVehicleData(road, index, options = {}) {
  const seed = index * 37 + (road.waypoints?.length || 1) * 13;
  const rand = pseudoRandom(seed);

  // Determine country from road coordinates or options
  let lat = 0;
  let lon = 0;
  if (options.lat !== undefined && options.lon !== undefined) {
    lat = Number(options.lat);
    lon = Number(options.lon);
  } else if (Array.isArray(road.coords) && road.coords.length > 0 && Array.isArray(road.coords[0])) {
    lon = Number(road.coords[0][0]);
    lat = Number(road.coords[0][1]);
  }

  const country = options.country || road.country || (lat && lon ? detectCountry(lat, lon) : 'GLOBAL');
  const countryName = getCountryName(country);
  const fleet = getCountryFleet(country);

  // Road-type weighting applied to the regional fleet
  let templateIndex = Math.floor(rand * fleet.length);
  if (road.type === 'motorway') {
    const motorwayCandidates = [];
    fleet.forEach((v, idx) => {
      const cat = (v.category || '').toLowerCase();
      if (
        cat.includes('suv') ||
        cat.includes('pickup') ||
        cat.includes('sedan') ||
        cat.includes('4x4') ||
        cat.includes('van') ||
        cat.includes('freight') ||
        cat.includes('ute') ||
        cat.includes('touring') ||
        cat.includes('mpv')
      ) {
        motorwayCandidates.push(idx);
      }
    });
    if (motorwayCandidates.length > 0) {
      templateIndex = motorwayCandidates[Math.floor(rand * motorwayCandidates.length)];
    }
  } else if (road.type === 'residential') {
    const resCandidates = [];
    fleet.forEach((v, idx) => {
      const cat = (v.category || '').toLowerCase();
      if (
        cat.includes('hatchback') ||
        cat.includes('compact') ||
        cat.includes('micro') ||
        cat.includes('kei') ||
        cat.includes('auto') ||
        cat.includes('crossover') ||
        cat.includes('supermini') ||
        cat.includes('tall-boy')
      ) {
        resCandidates.push(idx);
      }
    });
    if (resCandidates.length > 0) {
      templateIndex = resCandidates[Math.floor(rand * resCandidates.length)];
    }
  }

  const tmpl = fleet[templateIndex % fleet.length];

  const prefix = CALLSIGN_PREFIXES[Math.floor(pseudoRandom(seed + 1) * CALLSIGN_PREFIXES.length)];
  const number = String(Math.floor(10 + pseudoRandom(seed + 2) * 890)).padStart(3, '0');
  const callsign = `${prefix}-${number}`;

  // Authentic regional registration plate
  const plate = generateRegionalPlate(country, seed + 4);

  // Authentic regional destination
  const destination = (tmpl.destinationList && tmpl.destinationList.length > 0)
    ? tmpl.destinationList[Math.floor(pseudoRandom(seed + 5) * tmpl.destinationList.length)]
    : 'Downtown Corridor';

  const roadTitle = road.name || `${road.type.toUpperCase()} ARTERIAL`;

  const flowLevel = road.flow ? Math.round(road.flow.level * 100) : 88;
  const flowStatus = road.flow
    ? (road.flow.level >= 0.7 ? 'FREE FLOW' : (road.flow.level >= 0.3 ? 'MODERATE SLOW' : 'BOTTLENECK QUEUE'))
    : 'FLOWING NORMALLY';

  const batteryFuel = typeof tmpl.batteryFuel === 'function'
    ? tmpl.batteryFuel(seed)
    : (tmpl.batteryFuel || '80% Battery');

  const vehicleId = `vehicle-${road.type}-${index}`;

  return {
    id: vehicleId,
    _entityId: vehicleId,
    _layerType: 'traffic',
    type: 'traffic',
    subType: 'vehicle',
    isVehicle: true,
    country,
    countryName,
    brand: tmpl.brand,
    name: `${tmpl.shortLabel} · ${callsign}`,
    callsign,
    vehicleClass: tmpl.name,
    vehicleCategory: tmpl.category,
    model: tmpl.model,
    shortModel: tmpl.shortModel,
    shortLabel: tmpl.shortLabel,
    paintColor: tmpl.paintColor,
    icon: tmpl.icon,
    powertrain: tmpl.powertrain,
    batteryFuel,
    driverMode: tmpl.driverMode,
    plate,
    destination,
    roadType: road.type,
    roadName: roadTitle,
    flowStatus,
    flowLevel,
    speedKmh: 50, // Live telemetry
    speedMph: 31, // Live telemetry
    headingDeg: 0, // Live telemetry
    status: 'ACTIVE TRANSIT',
    odometerKm: Math.floor(1200 + pseudoRandom(seed + 6) * 45000),
  };
}
