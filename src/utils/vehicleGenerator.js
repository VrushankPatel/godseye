/**
 * @file Vehicle classification, callsign, and telemetry generator for street traffic simulation.
 */

const VEHICLE_TEMPLATES = [
  {
    category: 'Autonomous EV',
    name: 'Cyber EV Sedan',
    icon: '⚡',
    model: 'Tesla Model 3 Long Range',
    powertrain: 'Dual Motor AWD Electric',
    batteryFuel: (seed) => `${Math.floor(50 + (seed % 48))}% Battery`,
    driverMode: 'Full Self-Driving (FSD v12)',
    destinationList: ['Financial District Plaza', 'Tech Center Campus', 'Midtown Station', 'North Metro Commons'],
  },
  {
    category: 'Autonomous Taxi',
    name: 'Robotaxi Pod',
    icon: '🚕',
    model: 'Waymo 6th-Gen Autonomous Fleet',
    powertrain: '800V Architecture Electric',
    batteryFuel: (seed) => `${Math.floor(40 + (seed % 55))}% Battery`,
    driverMode: 'Driverless Commercial Service (L4)',
    destinationList: ['City Center Hall', 'Hotel District Drop-off', 'Grand Terminal Station', 'Broadway Avenue'],
  },
  {
    category: 'Civilian Passenger',
    name: 'Executive Hybrid SUV',
    icon: '🚙',
    model: 'Porsche Cayenne E-Hybrid',
    powertrain: 'Twin-Turbo V6 Hybrid',
    batteryFuel: (seed) => `${Math.floor(35 + (seed % 60))}% Fuel / Hybrid`,
    driverMode: 'Adaptive Cruise & Lane Centering',
    destinationList: ['Waterfront Boulevard', 'Suburban Parkway', 'University Medical Center', 'Skyline Tower'],
  },
  {
    category: 'Commercial Logistics',
    name: 'Electric Cargo Van',
    icon: '📦',
    model: 'Rivian EDV-700 Delivery',
    powertrain: 'Commercial Electric Drive',
    batteryFuel: (seed) => `${Math.floor(45 + (seed % 45))}% Battery`,
    driverMode: 'Fleet Route Optimization Active',
    destinationList: ['Regional Distribution Depot', 'Central Courier Hub', 'Harbor Logistics Gate 4', 'Retail Galleria'],
  },
  {
    category: 'Public Transit',
    name: 'Metro Transit Bus',
    icon: '🚌',
    model: 'New Flyer Xcelsior CHARGE',
    powertrain: 'Heavy-Duty Electric Traction',
    batteryFuel: (seed) => `${Math.floor(55 + (seed % 40))}% Battery`,
    driverMode: 'Scheduled Transit Service',
    destinationList: ['Metro Line 14 - Terminus', 'Central Transfer Station', 'Express Airport Loop', 'Suburban Transit Hub'],
  },
  {
    category: 'Emergency Services',
    name: 'Police Interceptor EV',
    icon: '🚓',
    model: 'Ford Mustang Mach-E Police',
    powertrain: 'Dual-Motor High Output AWD',
    batteryFuel: (seed) => `${Math.floor(65 + (seed % 33))}% Battery`,
    driverMode: 'Patrol Dispatch · Grid Monitor',
    destinationList: ['Sector 4 Perimeter Patrol', 'Highway Patrol Division', 'Metropolitan Precinct 1', 'Civic Center'],
  },
  {
    category: 'Heavy Freight',
    name: 'Freightliner Semi-Truck',
    icon: '🚛',
    model: 'Freightliner eCascadia Class 8',
    powertrain: 'Detroit ePowertrain 438 kWh',
    batteryFuel: (seed) => `${Math.floor(40 + (seed % 50))}% Fuel Cell`,
    driverMode: 'Highway Platooning Active',
    destinationList: ['Interstate Freight Depot', 'Port Container Yard B', 'Industrial Logistics Zone', 'Cross-Country Corridor'],
  },
];

const CALLSIGN_PREFIXES = [
  'APEX', 'UNIT', 'ECHO', 'VECTOR', 'METRO', 'ORBIT', 'TITAN', 'CYBER', 'DELTA', 'SWIFT', 'NEXUS', 'SOLAR',
];

const US_STATE_CODES = ['CA', 'NY', 'TX', 'IL', 'WA', 'FL', 'CO', 'GA', 'MA', 'ON', 'UK'];

function pseudoRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateVehicleData(road, index) {
  const seed = index * 37 + (road.waypoints?.length || 1) * 13;
  const rand = pseudoRandom(seed);
  
  // Pick template based on road type and seed
  let templateIndex = Math.floor(rand * VEHICLE_TEMPLATES.length);
  if (road.type === 'motorway' && rand > 0.6) {
    templateIndex = 6; // Heavy Freight Semi on motorways
  } else if (road.type === 'primary' && rand > 0.75) {
    templateIndex = 4; // Metro Bus on primary
  }
  const tmpl = VEHICLE_TEMPLATES[templateIndex % VEHICLE_TEMPLATES.length];

  const prefix = CALLSIGN_PREFIXES[Math.floor(pseudoRandom(seed + 1) * CALLSIGN_PREFIXES.length)];
  const number = String(Math.floor(10 + pseudoRandom(seed + 2) * 890)).padStart(3, '0');
  const callsign = `${prefix}-${number}`;

  const state = US_STATE_CODES[Math.floor(pseudoRandom(seed + 3) * US_STATE_CODES.length)];
  const plateNum = Math.floor(1000 + pseudoRandom(seed + 4) * 8999);
  const plate = `${state} · ${plateNum}`;

  const destination = tmpl.destinationList[Math.floor(pseudoRandom(seed + 5) * tmpl.destinationList.length)];
  const roadTitle = road.name || `${road.type.toUpperCase()} ARTERIAL`;

  const flowLevel = road.flow ? Math.round(road.flow.level * 100) : 88;
  const flowStatus = road.flow
    ? (road.flow.level >= 0.7 ? 'FREE FLOW' : (road.flow.level >= 0.3 ? 'MODERATE SLOW' : 'BOTTLENECK QUEUE'))
    : 'FLOWING NORMALLY';

  const vehicleId = `vehicle-${road.type}-${index}`;

  return {
    id: vehicleId,
    _entityId: vehicleId,
    _layerType: 'traffic',
    type: 'traffic',
    subType: 'vehicle',
    isVehicle: true,
    name: `${tmpl.icon} ${tmpl.name} · ${callsign}`,
    callsign,
    vehicleClass: tmpl.name,
    vehicleCategory: tmpl.category,
    model: tmpl.model,
    icon: tmpl.icon,
    powertrain: tmpl.powertrain,
    batteryFuel: tmpl.batteryFuel(seed),
    driverMode: tmpl.driverMode,
    plate,
    destination,
    roadType: road.type,
    roadName: roadTitle,
    flowStatus,
    flowLevel,
    speedKmh: 50, // Updated live
    speedMph: 31, // Updated live
    headingDeg: 0, // Updated live
    status: 'ACTIVE TRANSIT',
    odometerKm: Math.floor(1200 + pseudoRandom(seed + 6) * 45000),
  };
}
