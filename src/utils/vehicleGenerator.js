/**
 * @file Vehicle classification, callsign, and telemetry generator for street traffic simulation.
 */

export const VEHICLE_TEMPLATES = [
  // --- TESLA FLEET ---
  {
    brand: 'Tesla',
    category: 'Electric Sedan',
    name: 'Tesla Model 3',
    icon: '⚡',
    model: 'Tesla Model 3 Highland Long Range',
    shortModel: 'Tesla Model 3',
    shortLabel: '⚡ Tesla Model 3',
    powertrain: 'Dual Motor AWD Electric (394 hp)',
    paintColor: '#e82127', // Ultra Red
    batteryFuel: (seed) => `${Math.floor(55 + (seed % 42))}% Battery (Lithium-Ion)`,
    driverMode: 'Full Self-Driving (FSD Supervised v12.5)',
    destinationList: ['Financial District Plaza', 'Tesla Supercharger V4 Hub', 'Tech Innovation Campus', 'Skyline Lofts'],
  },
  {
    brand: 'Tesla',
    category: 'Electric Compact SUV',
    name: 'Tesla Model Y',
    icon: '⚡',
    model: 'Tesla Model Y Long Range AWD',
    shortModel: 'Tesla Model Y',
    shortLabel: '⚡ Tesla Model Y',
    powertrain: 'Dual Motor AWD Electric (384 hp)',
    paintColor: '#00f0ff', // Quicksilver
    batteryFuel: (seed) => `${Math.floor(48 + (seed % 48))}% Battery (4680 Structural)`,
    driverMode: 'Autopilot Navigation on City Streets',
    destinationList: ['Metro Medical Center', 'Westside Marina Bay', 'University Research Quad', 'Suburban Galleria'],
  },
  {
    brand: 'Tesla',
    category: 'Electric Cyber Truck',
    name: 'Tesla Cybertruck',
    icon: '📐',
    model: 'Tesla Cybertruck Cyberbeast Tri-Motor',
    shortModel: 'Cybertruck',
    shortLabel: '📐 Cybertruck',
    powertrain: 'Tri-Motor AWD Electric (845 hp)',
    paintColor: '#cbd5e1', // Stainless Steel
    batteryFuel: (seed) => `${Math.floor(60 + (seed % 38))}% Battery (123 kWh Pack)`,
    driverMode: 'Steer-by-Wire Adaptive Vectoring',
    destinationList: ['Harbor Logistics Terminal', 'Executive Helipad', 'Uptown Arts District', 'Summit Overlook'],
  },
  {
    brand: 'Tesla',
    category: 'Autonomous Robotaxi',
    name: 'Tesla Cybercab',
    icon: '🚕',
    model: 'Tesla Cybercab Bi-Seat Robotaxi',
    shortModel: 'Tesla Cybercab',
    shortLabel: '🚕 Tesla Cybercab',
    powertrain: 'Inductive Wireless Charging EV',
    paintColor: '#ffd700', // Cybercab Gold
    batteryFuel: (seed) => `${Math.floor(40 + (seed % 56))}% Battery (Wireless Pad)`,
    driverMode: 'Unsupervised Autonomous Fleet (Level 5)',
    destinationList: ['Grand Central Station', 'Airport Terminal Drop-off', 'Convention Center East', 'Broadway Promenade'],
  },
  {
    brand: 'Tesla',
    category: 'Performance Luxury EV',
    name: 'Tesla Model S Plaid',
    icon: '⚡',
    model: 'Tesla Model S Plaid Tri-Motor',
    shortModel: 'Tesla Model S',
    shortLabel: '⚡ Tesla Model S',
    powertrain: 'Tri-Motor Carbon-Sleeve (1,020 hp)',
    paintColor: '#334155', // Stealth Grey
    batteryFuel: (seed) => `${Math.floor(52 + (seed % 45))}% Battery (100 kWh)`,
    driverMode: 'Full Self-Driving (Track Mode Capable)',
    destinationList: ['Executive Financial Tower', 'Private Aviation Terminal', 'Waterfront Pier', 'Country Club Estates'],
  },
  {
    brand: 'Tesla',
    category: 'Commercial Heavy Freight',
    name: 'Tesla Semi',
    icon: '🚛',
    model: 'Tesla Semi 500-Mile Range Class 8',
    shortModel: 'Tesla Semi',
    shortLabel: '🚛 Tesla Semi',
    powertrain: 'Tri-Motor Axle Drive (900 kWh)',
    paintColor: '#38bdf8', // Commercial Cyan
    batteryFuel: (seed) => `${Math.floor(45 + (seed % 50))}% Battery (Megawatt Charging)`,
    driverMode: 'Highway Freight Autonomous Platooning',
    destinationList: ['Interstate Logistics Hub', 'Port Container Yard C', 'Railhead Cargo Terminal', 'Regional Depot'],
  },

  // --- TOYOTA FLEET ---
  {
    brand: 'Toyota',
    category: 'Civilian Sedan',
    name: 'Toyota Camry',
    icon: '🚗',
    model: 'Toyota Camry Hybrid XSE AWD',
    shortModel: 'Toyota Camry',
    shortLabel: '🚗 Toyota Camry',
    powertrain: '2.5L 4-Cyl Dynamic Force Hybrid (232 hp)',
    paintColor: '#e60012', // Supersonic Red
    batteryFuel: (seed) => `${Math.floor(45 + (seed % 50))}% Fuel / Self-Charging Hybrid`,
    driverMode: 'Toyota Safety Sense 3.0 (Dynamic Radar Cruise)',
    destinationList: ['Civic Center Boulevard', 'Metro Library Plaza', 'Northside Residential Park', 'Business Park Central'],
  },
  {
    brand: 'Toyota',
    category: 'Plug-In Hybrid SUV',
    name: 'Toyota RAV4 Prime',
    icon: '🚙',
    model: 'Toyota RAV4 Prime Hybrid AWD',
    shortModel: 'Toyota RAV4',
    shortLabel: '🚙 Toyota RAV4',
    powertrain: '2.5L Dynamic Force PHEV (302 hp)',
    paintColor: '#2563eb', // Blueprint Blue
    batteryFuel: (seed) => `${Math.floor(50 + (seed % 45))}% Fuel / 42mi EV Range`,
    driverMode: 'Lane Tracing Assist & Pre-Collision System',
    destinationList: ['Valley Vista Overlook', 'Oakridge Mall South', 'University Campus Gate', 'Riverside Expressway'],
  },
  {
    brand: 'Toyota',
    category: 'Aero Hybrid Sedan',
    name: 'Toyota Prius',
    icon: '🌱',
    model: 'Toyota Prius Prime Plug-In',
    shortModel: 'Toyota Prius',
    shortLabel: '🌱 Toyota Prius',
    powertrain: 'Fifth-Gen Toyota Hybrid System (220 hp)',
    paintColor: '#10b981', // Cutting Edge Silver
    batteryFuel: (seed) => `${Math.floor(58 + (seed % 40))}% Fuel / Solar Roof Active`,
    driverMode: 'Proactive Driving Assist (PDA) Active',
    destinationList: ['Eco-Innovation District', 'Solar Generation Plant', 'Botanical Gardens', 'Downtown Circulator'],
  },
  {
    brand: 'Toyota',
    category: 'Off-Road Hybrid Pickup',
    name: 'Toyota Tacoma',
    icon: '🛻',
    model: 'Toyota Tacoma TRD Pro i-FORCE MAX',
    shortModel: 'Toyota Tacoma',
    shortLabel: '🛻 Toyota Tacoma',
    powertrain: '2.4L Turbo Hybrid (326 hp / 465 lb-ft)',
    paintColor: '#f59e0b', // Terra Orange
    batteryFuel: (seed) => `${Math.floor(40 + (seed % 55))}% Fuel Tank`,
    driverMode: 'Multi-Terrain Select · 4W-Demand 4WD',
    destinationList: ['Mountain Pass Highway', 'Construction Logistics Site 7', 'County Fairgrounds', 'Forestry Station'],
  },
  {
    brand: 'Toyota',
    category: 'Performance Sports Coupe',
    name: 'Toyota GR Supra',
    icon: '🏎️',
    model: 'Toyota GR Supra 3.0 Premium',
    shortModel: 'Toyota Supra',
    shortLabel: '🏎️ Toyota Supra',
    powertrain: '3.0L Twin-Scroll Turbo Inline-6 (382 hp)',
    paintColor: '#dc2626', // Renaissance Red
    batteryFuel: (seed) => `${Math.floor(35 + (seed % 60))}% Premium 93 Fuel`,
    driverMode: 'Sport Mode · Adaptive Variable Suspension',
    destinationList: ['Coastal Highway Run', 'Grand Circuit Speedway', 'Marina Sunset Loop', 'Highland Vista'],
  },
  {
    brand: 'Toyota',
    category: 'Full-Size 4WD SUV',
    name: 'Toyota Land Cruiser',
    icon: '🚙',
    model: 'Toyota Land Cruiser First Edition i-FORCE',
    shortModel: 'Toyota Land Cruiser',
    shortLabel: '🚙 Land Cruiser',
    powertrain: 'i-FORCE MAX Hybrid Powertrain (326 hp)',
    paintColor: '#d97706', // Trail Dust / Grayscale
    batteryFuel: (seed) => `${Math.floor(42 + (seed % 52))}% Fuel Tank`,
    driverMode: 'Full-Time 4WD · Crawl Control Active',
    destinationList: ['Highland Trail Gateway', 'Suburban Country Club', 'Regional Airport Loop', 'North Valley Ridge'],
  },

  // --- AUTONOMOUS & MODERN CIVILIAN FLEET ---
  {
    brand: 'Waymo',
    category: 'Autonomous Robotaxi',
    name: 'Waymo Robotaxi',
    icon: '🚕',
    model: 'Waymo 6th-Gen Autonomous Fleet',
    shortModel: 'Waymo Robotaxi',
    shortLabel: '🚕 Waymo Robotaxi',
    powertrain: '800V Architecture Electric (Jaguar I-PACE)',
    paintColor: '#00e5a3', // Waymo Turquoise
    batteryFuel: (seed) => `${Math.floor(40 + (seed % 55))}% Battery`,
    driverMode: 'Driverless Commercial Service (Level 4)',
    destinationList: ['City Center Hall', 'Hotel District Drop-off', 'Grand Terminal Station', 'Broadway Avenue'],
  },
  {
    brand: 'Rivian',
    category: 'Commercial Logistics',
    name: 'Rivian Delivery Van',
    icon: '📦',
    model: 'Rivian EDV-700 Prime Commercial',
    shortModel: 'Rivian EDV',
    shortLabel: '📦 Rivian Delivery',
    powertrain: 'Rivian Dual-Motor Enduro AWD (135 kWh)',
    paintColor: '#38bdf8', // Prime Blue
    batteryFuel: (seed) => `${Math.floor(45 + (seed % 45))}% Battery`,
    driverMode: 'Fleet Route Optimization Active',
    destinationList: ['Regional Distribution Depot', 'Central Courier Hub', 'Harbor Logistics Gate 4', 'Retail Galleria'],
  },
  {
    brand: 'Ford',
    category: 'Electric Full-Size Pickup',
    name: 'Ford F-150 Lightning',
    icon: '🛻',
    model: 'Ford F-150 Lightning Extended Range EV',
    shortModel: 'Ford F-150 EV',
    shortLabel: '🛻 Ford F-150 EV',
    powertrain: 'Dual E-Motors AWD (580 hp)',
    paintColor: '#60a5fa', // Oxford Blue
    batteryFuel: (seed) => `${Math.floor(52 + (seed % 42))}% Battery`,
    driverMode: 'BlueCruise Hands-Free Highway Driving',
    destinationList: ['Civic Works Facility', 'North Industrial Zone', 'Highway Interchange West', 'Regional Logistics'],
  },
  {
    brand: 'Honda',
    category: 'Compact Sedan',
    name: 'Honda Civic',
    icon: '🚗',
    model: 'Honda Civic Touring Turbo',
    shortModel: 'Honda Civic',
    shortLabel: '🚗 Honda Civic',
    powertrain: '1.5L Turbo VTEC 4-Cylinder (180 hp)',
    paintColor: '#f43f5e', // Rallye Red
    batteryFuel: (seed) => `${Math.floor(48 + (seed % 48))}% Fuel Tank`,
    driverMode: 'Honda Sensing (Traffic Jam Assist)',
    destinationList: ['Metropolitan College', 'Eastside District Commons', 'Main Street Promenade', 'Suburban Crossing'],
  },
  {
    brand: 'Porsche',
    category: 'Performance Luxury EV',
    name: 'Porsche Taycan',
    icon: '🏎️',
    model: 'Porsche Taycan Turbo S AWD',
    shortModel: 'Porsche Taycan',
    shortLabel: '🏎️ Porsche Taycan',
    powertrain: 'Dual Permanent-Magnet Synchronous (938 hp)',
    paintColor: '#eab308', // Racing Yellow
    batteryFuel: (seed) => `${Math.floor(40 + (seed % 55))}% Battery (97 kWh)`,
    driverMode: 'Porsche InnoDrive & Active Suspension',
    destinationList: ['Highland Golf Club', 'Summit Ridge Overlook', 'Financial District Penthouse', 'Marina Yacht Basin'],
  },
  {
    brand: 'BMW',
    category: 'Executive Sport EV',
    name: 'BMW i4 M50',
    icon: '⚡',
    model: 'BMW i4 M50 Gran Coupe',
    shortModel: 'BMW i4',
    shortLabel: '⚡ BMW i4',
    powertrain: 'Dual Fifth-Gen BMW eDrive (536 hp)',
    paintColor: '#00a2ff', // Portimao Blue
    batteryFuel: (seed) => `${Math.floor(50 + (seed % 45))}% Battery (83.9 kWh)`,
    driverMode: 'Driving Assistant Professional',
    destinationList: ['Corporate Headquarters Plaza', 'Skyline Boulevard', 'Grand Opera House', 'Tech Corridor North'],
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

  // Pick template with realistic road-type weighting
  let templateIndex = Math.floor(rand * VEHICLE_TEMPLATES.length);
  if (road.type === 'motorway') {
    // Motorway bias: Tesla Semis, Cybertrucks, Model Y/3, Camry, RAV4, Ford F-150, Taycan
    const motorwayIndices = [0, 1, 2, 4, 5, 6, 7, 9, 14, 16];
    templateIndex = motorwayIndices[Math.floor(rand * motorwayIndices.length)];
  } else if (road.type === 'residential') {
    // Residential neighborhood bias: Camry, RAV4, Model 3, Model Y, Prius, Civic, Cybercab
    const resIndices = [0, 1, 3, 6, 7, 8, 12, 15];
    templateIndex = resIndices[Math.floor(rand * resIndices.length)];
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
