/**
 * @file Country-specific vehicle fleets, geographic region detection, and regional plate generators.
 * Provides authentic top 20 real-world vehicles for each country.
 */

export const COUNTRY_NAMES = {
  IN: 'India',
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  JP: 'Japan',
  AU: 'Australia',
  AE: 'United Arab Emirates',
  GLOBAL: 'International',
};

export const COUNTRY_FLEETS = {
  // ==========================================
  // INDIA (Top 20 Everyday Vehicles & Autos)
  // ==========================================
  IN: [
    {
      brand: 'Maruti Suzuki',
      category: 'Compact Hatchback',
      name: 'Maruti Swift',
      icon: '🚗',
      model: 'Maruti Suzuki Swift ZXi+',
      shortModel: 'Maruti Swift',
      shortLabel: '🚗 Maruti Swift',
      powertrain: '1.2L Z-Series DualJet (82 hp)',
      paintColor: '#dc2626', // Sizzling Red
      batteryFuel: (s) => `${Math.floor(45 + (s % 50))}% Fuel Tank (24.8 km/l)`,
      driverMode: 'Eco Mode · City Traffic Assist',
      destinationList: ['Connaught Place', 'Bandra Kurla Complex (BKC)', 'Cyber City Gurugram', 'Electronic City Bengaluru'],
    },
    {
      brand: 'Tata Motors',
      category: 'Sub-Compact SUV',
      name: 'Tata Nexon',
      icon: '🚙',
      model: 'Tata Nexon Fearless+ 1.2L Turbo',
      shortModel: 'Tata Nexon',
      shortLabel: '🚙 Tata Nexon',
      powertrain: '1.2L Revotron Turbocharged (120 hp)',
      paintColor: '#475569', // Daytona Grey
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Fuel / 5-Star BNCAP`,
      driverMode: 'Drive Modes (City / Eco / Sport)',
      destinationList: ['Aerocity Terminal 3', 'Hitech City Mindspace', 'Salt Lake Sector V', 'Marine Drive Promenade'],
    },
    {
      brand: 'Hyundai',
      category: 'Mid-Size SUV',
      name: 'Hyundai Creta',
      icon: '🚙',
      model: 'Hyundai Creta SX(O) Turbo',
      shortModel: 'Hyundai Creta',
      shortLabel: '🚙 Hyundai Creta',
      powertrain: '1.5L Turbo GDi Petrol (160 hp)',
      paintColor: '#0f172a', // Abyss Black Pearl
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'SmartSense ADAS Level 2 Active',
      destinationList: ['SG Highway Corporate Hub', 'Koregaon Park Pune', 'Indiranagar 100ft Road', 'Anna Nagar West'],
    },
    {
      brand: 'Mahindra',
      category: 'Rugged D-SUV',
      name: 'Mahindra Scorpio-N',
      icon: '🚙',
      model: 'Mahindra Scorpio-N Z8L 4x4',
      shortModel: 'Scorpio-N',
      shortLabel: '🚙 Scorpio-N',
      powertrain: '2.2L mHawk Diesel (175 hp / 400 Nm)',
      paintColor: '#14532d', // Deep Forest Green
      batteryFuel: (s) => `${Math.floor(52 + (s % 42))}% Diesel Tank`,
      driverMode: '4XPLOR Intelligent Terrain Mode',
      destinationList: ['Yamuna Expressway Toll', 'Outer Ring Road Express', 'Western Express Highway', 'Delhi Airport VIP Cargo'],
    },
    {
      brand: 'Toyota',
      category: 'Executive MPV',
      name: 'Toyota Innova Crysta',
      icon: '🚐',
      model: 'Toyota Innova Crysta 2.4L ZX',
      shortModel: 'Innova Crysta',
      shortLabel: '🚐 Innova Crysta',
      powertrain: '2.4L GD Turbo Diesel (150 hp / 343 Nm)',
      paintColor: '#f8fafc', // Super White
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Diesel Tank`,
      driverMode: 'Highway Long-Haul VIP Transit',
      destinationList: ['Rajiv Gandhi Int. Airport', 'Kempegowda Airport Expressway', 'Mumbai-Pune Expressway', 'Noida Sector 62'],
    },
    {
      brand: 'Maruti Suzuki',
      category: 'Urban Compact SUV',
      name: 'Maruti Brezza',
      icon: '🚙',
      model: 'Maruti Suzuki Brezza ZXi+',
      shortModel: 'Maruti Brezza',
      shortLabel: '🚙 Maruti Brezza',
      powertrain: '1.5L K-Series Smart Hybrid (103 hp)',
      paintColor: '#b45309', // Brave Khaki
      batteryFuel: (s) => `${Math.floor(45 + (s % 50))}% Fuel (Dual Battery Hybrid)`,
      driverMode: 'Smart Hybrid Idle Start-Stop',
      destinationList: ['Whitefield Tech Corridor', 'Dwarka Expressway', 'Gachibowli Financial Hub', 'Juhu Tara Road'],
    },
    {
      brand: 'Mahindra',
      category: 'Lifestyle 4x4',
      name: 'Mahindra Thar',
      icon: '🛻',
      model: 'Mahindra Thar LX Hard Top 4WD',
      shortModel: 'Mahindra Thar',
      shortLabel: '🛻 Mahindra Thar',
      powertrain: '2.0L mStallion Turbo Petrol (150 hp)',
      paintColor: '#020617', // Napoli Black
      batteryFuel: (s) => `${Math.floor(40 + (s % 55))}% Fuel Tank`,
      driverMode: 'Mechanical Locking Differential 4WD',
      destinationList: ['Aravalli Ridge Trail', 'Lonavala Ghat Pass', 'East Coast Road Promenade', 'Rishikesh Bypass'],
    },
    {
      brand: 'Tata Motors',
      category: 'Micro-SUV',
      name: 'Tata Punch',
      icon: '🚙',
      model: 'Tata Punch Creative Flagship',
      shortModel: 'Tata Punch',
      shortLabel: '🚙 Tata Punch',
      powertrain: '1.2L Revotron Dynapro (88 hp)',
      paintColor: '#ef4444', // Calypso Red
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'Traction Pro Urban Assist',
      destinationList: ['Saket District Centre', 'Powai Hiranandani', 'Kalyan Nagar Ring', 'Alipore Main Road'],
    },
    {
      brand: 'Maruti Suzuki',
      category: 'Premium Hatchback',
      name: 'Maruti Baleno',
      icon: '🚗',
      model: 'Maruti Suzuki Baleno Alpha DualJet',
      shortModel: 'Maruti Baleno',
      shortLabel: '🚗 Maruti Baleno',
      powertrain: '1.2L DualJet Dual VVT (90 hp)',
      paintColor: '#1d4ed8', // Celestial Blue
      batteryFuel: (s) => `${Math.floor(52 + (s % 45))}% Fuel Tank`,
      driverMode: 'Head-Up Display & SmartPlay Active',
      destinationList: ['Churchgate Station', 'DLF Phase 5 Gurugram', 'Marathahalli Bridge', 'Prahlad Nagar SG Road'],
    },
    {
      brand: 'Toyota',
      category: 'Full-Size Luxury SUV',
      name: 'Toyota Fortuner',
      icon: '🚙',
      model: 'Toyota Fortuner 2.8L 4x4 Legender',
      shortModel: 'Toyota Fortuner',
      shortLabel: '🚙 Toyota Fortuner',
      powertrain: '2.8L Turbo Diesel (204 hp / 500 Nm)',
      paintColor: '#09090b', // Attitude Black Dual-Tone
      batteryFuel: (s) => `${Math.floor(58 + (s % 38))}% Diesel Tank`,
      driverMode: 'High/Low Range 4WD Auto LSD',
      destinationList: ['Vasant Vihar Enclave', 'Almatti Highway Run', 'Nariman Point Business', 'Banjara Hills Road No. 1'],
    },
    {
      brand: 'Mahindra',
      category: 'Tech Flagship SUV',
      name: 'Mahindra XUV700',
      icon: '🚙',
      model: 'Mahindra XUV700 AX7 Luxury AWD',
      shortModel: 'Mahindra XUV700',
      shortLabel: '🚙 Mahindra XUV700',
      powertrain: '2.0L mStallion Turbo (200 hp / 380 Nm)',
      paintColor: '#1e1b4b', // Midnight Black Pearl
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Fuel Tank`,
      driverMode: 'Adrenox ADAS Adaptive Cruise',
      destinationList: ['Golf Course Extension Road', 'E-City Elevated Tollway', 'Bandra-Worli Sea Link', 'New Town Kolkata'],
    },
    {
      brand: 'Maruti Suzuki',
      category: 'Compact Sedan',
      name: 'Maruti Dzire',
      icon: '🚗',
      model: 'Maruti Suzuki Dzire ZXi CNG',
      shortModel: 'Maruti Dzire',
      shortLabel: '🚗 Maruti Dzire',
      powertrain: '1.2L DualJet Factory S-CNG (77 hp)',
      paintColor: '#f1f5f9', // Arctic White
      batteryFuel: (s) => `${Math.floor(60 + (s % 38))}% CNG / 31.1 km/kg`,
      driverMode: 'Dual-Fuel CNG Urban Efficiency',
      destinationList: ['New Delhi Railway Terminal', 'Chhatrapati Shivaji Terminal', 'Howrah Bridge Approach', 'Chennai Central'],
    },
    {
      brand: 'Hyundai',
      category: 'Compact Tech SUV',
      name: 'Hyundai Venue',
      icon: '🚙',
      model: 'Hyundai Venue SX(O) Turbo DCT',
      shortModel: 'Hyundai Venue',
      shortLabel: '🚙 Hyundai Venue',
      powertrain: '1.0L Kappa Turbo GDi (120 hp)',
      paintColor: '#e11d48', // Fiery Red
      batteryFuel: (s) => `${Math.floor(45 + (s % 50))}% Fuel Tank`,
      driverMode: 'BlueLink Telematics Active',
      destinationList: ['Lajpat Nagar Ring Road', 'Koramangala 80ft Road', 'Hadapsar Magarpatta', 'Salt Lake Karunamoyee'],
    },
    {
      brand: 'Kia',
      category: 'Urban Crossover SUV',
      name: 'Kia Seltos',
      icon: '🚙',
      model: 'Kia Seltos GTX+ 1.5L Turbo',
      shortModel: 'Kia Seltos',
      shortLabel: '🚙 Kia Seltos',
      powertrain: '1.5L Smartstream T-GDi (160 hp)',
      paintColor: '#2563eb', // Imperial Blue
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'Kia Connect Level 2 Autonomous',
      destinationList: ['Noida Greater Noida Express', 'Sarjapur Road Junction', 'Aundh Commercial Hub', 'Velachery Main Road'],
    },
    {
      brand: 'Toyota',
      category: 'Strong Hybrid SUV',
      name: 'Toyota Hyryder',
      icon: '🚙',
      model: 'Toyota Urban Cruiser Hyryder V Hybrid',
      shortModel: 'Toyota Hyryder',
      shortLabel: '🚙 Toyota Hyryder',
      powertrain: '1.5L TNGA Strong Hybrid (27.97 km/l)',
      paintColor: '#64748b', // Gaming Grey Dual Tone
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Battery / EV Mode Active`,
      driverMode: 'e-CVT Pure EV / Hybrid Auto',
      destinationList: ['Cyber City Building 10', 'MG Road Metro Hub', 'Navi Mumbai Vashi Toll', 'Hebbal Flyover Junction'],
    },
    {
      brand: 'Honda',
      category: 'Executive Sedan',
      name: 'Honda City',
      icon: '🚗',
      model: 'Honda City e:HEV Strong Hybrid ZX',
      shortModel: 'Honda City',
      shortLabel: '🚗 Honda City',
      powertrain: '1.5L Atkinson-Cycle e:HEV Dual Motor',
      paintColor: '#ffffff', // Platinum White Pearl
      batteryFuel: (s) => `${Math.floor(52 + (s % 45))}% Hybrid Storage (27.1 km/l)`,
      driverMode: 'Honda Sensing Collision Mitigation',
      destinationList: ['Barakhamba Road CP', 'Pedder Road South Mumbai', 'Cunningham Road Bangalore', 'Law Garden Ahmedabad'],
    },
    {
      brand: 'Maruti Suzuki',
      category: 'Multi-Utility Vehicle',
      name: 'Maruti Ertiga',
      icon: '🚐',
      model: 'Maruti Suzuki Ertiga ZXi+ Smart Hybrid',
      shortModel: 'Maruti Ertiga',
      shortLabel: '🚐 Maruti Ertiga',
      powertrain: '1.5L K15C DualJet Dual VVT (102 hp)',
      paintColor: '#4b5563', // Magma Grey
      batteryFuel: (s) => `${Math.floor(50 + (s % 48))}% Fuel Tank`,
      driverMode: '7-Seater Family Highway Cruise',
      destinationList: ['Samruddhi Mahamarg Highway', 'Delhi-Meerut Expressway', 'Bangalore-Mysore Highway', 'Durgapur Expressway'],
    },
    {
      brand: 'Maruti Suzuki',
      category: 'Urban Tall-Boy',
      name: 'Maruti WagonR',
      icon: '🚗',
      model: 'Maruti Suzuki WagonR VXi S-CNG',
      shortModel: 'Maruti WagonR',
      shortLabel: '🚗 Maruti WagonR',
      powertrain: '1.0L / 1.2L K-Series DualJet CNG',
      paintColor: '#94a3b8', // Silky Silver
      batteryFuel: (s) => `${Math.floor(65 + (s % 33))}% CNG (34 km/kg)`,
      driverMode: 'High-Efficiency Metro Commute',
      destinationList: ['Chandni Chowk Old Delhi', 'Dadar Flower Market', 'Chickpet Market Bengaluru', 'Kalupur Station Ahmedabad'],
    },
    {
      brand: 'Mahindra',
      category: 'Heavy-Duty Utility',
      name: 'Mahindra Bolero',
      icon: '🚙',
      model: 'Mahindra Bolero Neo N10 Opt',
      shortModel: 'Mahindra Bolero',
      shortLabel: '🚙 Mahindra Bolero',
      powertrain: '1.5L mHawk75 Rugged Diesel (75 hp)',
      paintColor: '#cbd5e1', // Diamond White
      batteryFuel: (s) => `${Math.floor(45 + (s % 50))}% Diesel Tank`,
      driverMode: 'Multi-Terrain Tough Suspension Active',
      destinationList: ['State Highway 4 Junction', 'Rural Mandi Terminal', 'Bhiwandi Logistics Hub', 'Peenya Industrial Area'],
    },
    {
      brand: 'Bajaj Auto',
      category: 'Urban 3-Wheeler Auto',
      name: 'Bajaj RE Auto',
      icon: '🛺',
      model: 'Bajaj RE Compact 236cc CNG Auto',
      shortModel: 'Bajaj Auto',
      shortLabel: '🛺 Bajaj Auto',
      powertrain: '236cc DTS-i Bi-Fuel CNG (10 hp)',
      paintColor: '#16a34a', // Classic Green & Yellow
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% CNG Cylinder`,
      driverMode: 'City Street Auto Meter Transit',
      destinationList: ['Metro Station Auto Stand', 'City General Hospital', 'Central Bus Terminus', 'Railway Junction Gate 1'],
    },
  ],

  // ==========================================
  // UNITED STATES (Top 20 American Vehicles)
  // ==========================================
  US: [
    {
      brand: 'Ford',
      category: 'Full-Size Pickup',
      name: 'Ford F-150',
      icon: '🛻',
      model: 'Ford F-150 SuperCrew PowerBoost Hybrid',
      shortModel: 'Ford F-150',
      shortLabel: '🛻 Ford F-150',
      powertrain: '3.5L PowerBoost Full Hybrid V6 (430 hp)',
      paintColor: '#1e3a8a', // Antimatter Blue
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Fuel Tank`,
      driverMode: 'Ford Co-Pilot360 2.0 Assist',
      destinationList: ['Interstate 80 Commercial Park', 'Suburban Home Depot', 'Downtown Logistics Center', 'Harbor Freight Gate'],
    },
    {
      brand: 'Chevrolet',
      category: 'Full-Size Pickup',
      name: 'Chevy Silverado',
      icon: '🛻',
      model: 'Chevrolet Silverado 1500 LTZ Crew Cab',
      shortModel: 'Chevy Silverado',
      shortLabel: '🛻 Chevy Silverado',
      powertrain: '5.3L EcoTec3 V8 (355 hp / 383 lb-ft)',
      paintColor: '#334155', // Dark Ash Metallic
      batteryFuel: (s) => `${Math.floor(45 + (s % 50))}% Fuel Tank`,
      driverMode: 'Super Cruise Hands-Free Active',
      destinationList: ['Regional Distribution Center', 'Airport Freight Terminal', 'Metro Construction Zone', 'Highland Business Quad'],
    },
    {
      brand: 'RAM',
      category: 'Full-Size Pickup',
      name: 'RAM 1500',
      icon: '🛻',
      model: 'RAM 1500 Laramie Crew Cab 4x4',
      shortModel: 'RAM 1500',
      shortLabel: '🛻 RAM 1500',
      powertrain: '3.0L Hurricane Twin-Turbo Inline-6 (420 hp)',
      paintColor: '#b91c1c', // Delmonico Red
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'Active Driving Assist Highway Cruise',
      destinationList: ['Interstate Interchange 10', 'Industrial Warehouse District', 'County Fairgrounds', 'Suburban Center'],
    },
    {
      brand: 'Tesla',
      category: 'Electric Compact SUV',
      name: 'Tesla Model Y',
      icon: '⚡',
      model: 'Tesla Model Y Long Range Dual Motor AWD',
      shortModel: 'Tesla Model Y',
      shortLabel: '⚡ Tesla Model Y',
      powertrain: 'Dual Motor AWD Electric (384 hp)',
      paintColor: '#00f0ff', // Quicksilver
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Battery (4680 Structural)`,
      driverMode: 'Full Self-Driving (FSD Supervised v12.5)',
      destinationList: ['Silicon Valley Campus', 'Tesla Supercharger V4', 'Suburban Galleria Mall', 'Executive Airport Way'],
    },
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
      batteryFuel: (s) => `${Math.floor(58 + (s % 38))}% Battery Pack`,
      driverMode: 'Autopilot Navigation on City Streets',
      destinationList: ['Financial District Plaza', 'Tech Innovation Park', 'University Medical Quad', 'Skyline Towers'],
    },
    {
      brand: 'Toyota',
      category: 'Compact Hybrid SUV',
      name: 'Toyota RAV4',
      icon: '🚙',
      model: 'Toyota RAV4 Hybrid XSE AWD',
      shortModel: 'Toyota RAV4',
      shortLabel: '🚙 Toyota RAV4',
      powertrain: '2.5L Dynamic Force Hybrid AWD (219 hp)',
      paintColor: '#2563eb', // Blueprint Blue
      batteryFuel: (s) => `${Math.floor(52 + (s % 45))}% Fuel / Self-Charging`,
      driverMode: 'Toyota Safety Sense 2.5+ Active',
      destinationList: ['Oakridge Shopping Center', 'Valley Medical Plaza', 'Riverside Parkway', 'City Hall Square'],
    },
    {
      brand: 'Toyota',
      category: 'Mid-Size Sedan',
      name: 'Toyota Camry',
      icon: '🚗',
      model: 'Toyota Camry Hybrid XSE AWD',
      shortModel: 'Toyota Camry',
      shortLabel: '🚗 Toyota Camry',
      powertrain: '2.5L 4-Cyl Dynamic Force Hybrid (232 hp)',
      paintColor: '#dc2626', // Supersonic Red
      batteryFuel: (s) => `${Math.floor(50 + (s % 48))}% Fuel Tank`,
      driverMode: 'Dynamic Radar Cruise & Lane Tracing',
      destinationList: ['Civic Center Promenade', 'Metro Transfer Station', 'Northside Business Park', 'Suburban Commons'],
    },
    {
      brand: 'Toyota',
      category: 'Mid-Size Pickup',
      name: 'Toyota Tacoma',
      icon: '🛻',
      model: 'Toyota Tacoma TRD Pro i-FORCE MAX',
      shortModel: 'Toyota Tacoma',
      shortLabel: '🛻 Toyota Tacoma',
      powertrain: '2.4L Turbo Hybrid (326 hp / 465 lb-ft)',
      paintColor: '#f59e0b', // Terra Orange
      batteryFuel: (s) => `${Math.floor(45 + (s % 50))}% Fuel Tank`,
      driverMode: 'Multi-Terrain Select 4WD',
      destinationList: ['Mountain Pass Highway', 'Construction Site Gate 4', 'Regional State Park', 'Recreational Marina'],
    },
    {
      brand: 'Honda',
      category: 'Compact SUV',
      name: 'Honda CR-V',
      icon: '🚙',
      model: 'Honda CR-V Sport Touring Hybrid',
      shortModel: 'Honda CR-V',
      shortLabel: '🚙 Honda CR-V',
      powertrain: '2.0L Two-Motor Hybrid System (204 hp)',
      paintColor: '#0284c7', // Canyon River Blue
      batteryFuel: (s) => `${Math.floor(54 + (s % 42))}% Fuel Tank`,
      driverMode: 'Honda Sensing Suite Active',
      destinationList: ['Westside Galleria', 'Community College Campus', 'Memorial Hospital', 'Suburban Loop North'],
    },
    {
      brand: 'Honda',
      category: 'Compact Sedan',
      name: 'Honda Civic',
      icon: '🚗',
      model: 'Honda Civic Sport Touring Hybrid',
      shortModel: 'Honda Civic',
      shortLabel: '🚗 Honda Civic',
      powertrain: '2.0L Two-Motor Hybrid (200 hp)',
      paintColor: '#f43f5e', // Rallye Red
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Fuel Tank`,
      driverMode: 'Traffic Jam Assist & Lane Keeping',
      destinationList: ['Downtown Arts District', 'Main Street Station', 'Tech Incubator Hub', 'University Ave West'],
    },
    {
      brand: 'GMC',
      category: 'Heavy Duty Pickup',
      name: 'GMC Sierra',
      icon: '🛻',
      model: 'GMC Sierra 1500 Denali Ultimate',
      shortModel: 'GMC Sierra',
      shortLabel: '🛻 GMC Sierra',
      powertrain: '6.2L EcoTec3 V8 (420 hp / 460 lb-ft)',
      paintColor: '#172554', // Titanium Rush
      batteryFuel: (s) => `${Math.floor(40 + (s % 55))}% Fuel Tank`,
      driverMode: 'Super Cruise Hands-Free Trailering',
      destinationList: ['Interstate Truck Plaza', 'Corporate HQ Executive Gate', 'Harbor Container Terminal', 'Airport Logistics'],
    },
    {
      brand: 'Toyota',
      category: 'Compact Sedan',
      name: 'Toyota Corolla',
      icon: '🚗',
      model: 'Toyota Corolla Hybrid XLE AWD',
      shortModel: 'Toyota Corolla',
      shortLabel: '🚗 Toyota Corolla',
      powertrain: '1.8L Hybrid 4-Cylinder (138 hp)',
      paintColor: '#94a3b8', // Celestite Metallic
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Fuel Tank`,
      driverMode: 'Toyota Safety Sense 3.0',
      destinationList: ['Civic Plaza', 'Metro Bus Transfer', 'Midtown Commercial', 'Suburban Square'],
    },
    {
      brand: 'Ford',
      category: 'Full-Size SUV',
      name: 'Ford Explorer',
      icon: '🚙',
      model: 'Ford Explorer ST 3.0L EcoBoost',
      shortModel: 'Ford Explorer',
      shortLabel: '🚙 Ford Explorer',
      powertrain: '3.0L Twin-Turbo EcoBoost V6 (400 hp)',
      paintColor: '#1e293b', // Agate Black
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'Ford Co-Pilot360 Assist+',
      destinationList: ['Highway Patrol Station', 'Metropolitan Airport', 'Convention Center West', 'City Hall'],
    },
    {
      brand: 'Jeep',
      category: 'Mid-Size 4x4 SUV',
      name: 'Grand Cherokee',
      icon: '🚙',
      model: 'Jeep Grand Cherokee 4xe Overland',
      shortModel: 'Grand Cherokee',
      shortLabel: '🚙 Grand Cherokee',
      powertrain: '2.0L Turbo PHEV Dual E-Motor (375 hp)',
      paintColor: '#065f46', // Rocky Mountain Green
      batteryFuel: (s) => `${Math.floor(45 + (s % 50))}% Fuel / PHEV Battery`,
      driverMode: 'Selec-Terrain 4WD System',
      destinationList: ['Highland Ridge Overlook', 'Suburban Country Club', 'Mountain Freeway', 'Executive Center'],
    },
    {
      brand: 'Jeep',
      category: 'Off-Road Convertible',
      name: 'Jeep Wrangler',
      icon: '🚙',
      model: 'Jeep Wrangler Rubicon 392 V8',
      shortModel: 'Jeep Wrangler',
      shortLabel: '🚙 Jeep Wrangler',
      powertrain: '6.4L HEMI V8 (470 hp / 470 lb-ft)',
      paintColor: '#ca8a04', // High Velocity Yellow
      batteryFuel: (s) => `${Math.floor(40 + (s % 55))}% Fuel Tank`,
      driverMode: 'Rock-Trac 4:1 Heavy-Duty 4WD',
      destinationList: ['Coastal Highway Trailhead', 'Desert Canyon Pass', 'Recreational Lake Gate', 'Off-Road Park'],
    },
    {
      brand: 'Subaru',
      category: 'All-Wheel Drive Wagon',
      name: 'Subaru Outback',
      icon: '🚙',
      model: 'Subaru Outback Wilderness Turbo',
      shortModel: 'Subaru Outback',
      shortLabel: '🚙 Subaru Outback',
      powertrain: '2.4L Turbocharged BOXER (260 hp)',
      paintColor: '#1e3a8a', // Geyser Blue
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Fuel Tank`,
      driverMode: 'EyeSight Driver Assist with Dual X-MODE',
      destinationList: ['Pine Ridge Mountain Route', 'State Forest Campground', 'Suburban Crossing', 'Medical Center'],
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
      batteryFuel: (s) => `${Math.floor(60 + (s % 38))}% Battery (123 kWh)`,
      driverMode: 'Steer-by-Wire Adaptive Vectoring',
      destinationList: ['Executive Helipad', 'Harbor Container Yard', 'Financial Center Garage', 'Uptown High-Rise'],
    },
    {
      brand: 'Hyundai',
      category: 'Compact Crossover',
      name: 'Hyundai Tucson',
      icon: '🚙',
      model: 'Hyundai Tucson Limited Hybrid AWD',
      shortModel: 'Hyundai Tucson',
      shortLabel: '🚙 Hyundai Tucson',
      powertrain: '1.6L Turbo Hybrid AWD (231 hp)',
      paintColor: '#475569', // Amazon Gray
      batteryFuel: (s) => `${Math.floor(52 + (s % 42))}% Fuel Tank`,
      driverMode: 'Highway Driving Assist Active',
      destinationList: ['Retail Plaza West', 'University Campus Gate', 'Transit Terminal', 'Suburban Neighborhood'],
    },
    {
      brand: 'Chevrolet',
      category: 'Full-Size SUV',
      name: 'Chevy Tahoe',
      icon: '🚙',
      model: 'Chevrolet Tahoe High Country 4WD',
      shortModel: 'Chevy Tahoe',
      shortLabel: '🚙 Chevy Tahoe',
      powertrain: '6.2L EcoTec3 V8 (420 hp)',
      paintColor: '#020617', // Black Metallic
      batteryFuel: (s) => `${Math.floor(42 + (s % 52))}% Fuel Tank`,
      driverMode: 'Magnetic Ride Control Active',
      destinationList: ['Executive Aviation Ramp', 'Convention Hall East', 'State Capitol Building', 'Interstate Route 95'],
    },
    {
      brand: 'Tesla',
      category: 'Heavy Freight Semi',
      name: 'Tesla Semi',
      icon: '🚛',
      model: 'Tesla Semi 500-Mile Range Class 8',
      shortModel: 'Tesla Semi',
      shortLabel: '🚛 Tesla Semi',
      powertrain: 'Tri-Motor Axle Drive (900 kWh)',
      paintColor: '#38bdf8', // Commercial Cyan
      batteryFuel: (s) => `${Math.floor(45 + (s % 50))}% Battery (Megawatt Charging)`,
      driverMode: 'Highway Platooning Autonomous Assist',
      destinationList: ['Interstate Logistics Hub', 'Port of Long Beach Gate', 'Cross-Country Corridor', 'Regional Distribution Hub'],
    },
  ],

  // ==========================================
  // UNITED KINGDOM (Top 20 British Fleet)
  // ==========================================
  GB: [
    {
      brand: 'Ford',
      category: 'Compact Crossover',
      name: 'Ford Puma',
      icon: '🚙',
      model: 'Ford Puma ST-Line 1.0L EcoBoost mHEV',
      shortModel: 'Ford Puma',
      shortLabel: '🚙 Ford Puma',
      powertrain: '1.0L EcoBoost Hybrid mHEV (155 hp)',
      paintColor: '#2563eb', // Desert Island Blue
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Fuel / 48V Hybrid`,
      driverMode: 'Selectable Drive Modes (Sport/Eco)',
      destinationList: ['Piccadilly Circus', 'Heathrow Airport T5', 'Canary Wharf Financial', 'Birmingham New Street'],
    },
    {
      brand: 'Nissan',
      category: 'Family Crossover',
      name: 'Nissan Qashqai',
      icon: '🚙',
      model: 'Nissan Qashqai Tekna+ e-POWER',
      shortModel: 'Nissan Qashqai',
      shortLabel: '🚙 Nissan Qashqai',
      powertrain: '1.5L e-POWER 100% Electric Motor Drive (190 hp)',
      paintColor: '#dc2626', // Magnetic Red
      batteryFuel: (s) => `${Math.floor(52 + (s % 42))}% e-POWER Fuel Tank`,
      driverMode: 'ProPILOT Assist with Navi-link',
      destinationList: ['King’s Cross Station', 'Westfield Stratford City', 'Manchester Piccadilly', 'Leeds City Centre'],
    },
    {
      brand: 'Vauxhall',
      category: 'British Supermini',
      name: 'Vauxhall Corsa',
      icon: '🚗',
      model: 'Vauxhall Corsa Ultimate Turbo',
      shortModel: 'Vauxhall Corsa',
      shortLabel: '🚗 Vauxhall Corsa',
      powertrain: '1.2L Turbo Petrol / Corsa Electric (136 hp)',
      paintColor: '#ea580c', // Voltaic Blue / Orange
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'City Steering Assist Active',
      destinationList: ['Oxford Street', 'Bristol Temple Meads', 'Edinburgh Royal Mile', 'Cardiff Bay Promenade'],
    },
    {
      brand: 'Kia',
      category: 'Family SUV',
      name: 'Kia Sportage',
      icon: '🚙',
      model: 'Kia Sportage GT-Line S PHEV AWD',
      shortModel: 'Kia Sportage',
      shortLabel: '🚙 Kia Sportage',
      powertrain: '1.6L T-GDi Plug-in Hybrid (261 hp)',
      paintColor: '#0284c7', // Infra Red / Blue
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Fuel / 43mi EV`,
      driverMode: 'Highway Driving Assist Active',
      destinationList: ['Gatwick Airport Terminal', 'Sheffield City Square', 'Newcastle Quayside', 'Glasgow Central'],
    },
    {
      brand: 'Tesla',
      category: 'Electric Crossover',
      name: 'Tesla Model Y',
      icon: '⚡',
      model: 'Tesla Model Y Dual Motor AWD',
      shortModel: 'Tesla Model Y',
      shortLabel: '⚡ Tesla Model Y',
      powertrain: 'Dual Motor AWD Electric (384 hp)',
      paintColor: '#00f0ff', // Midnight Silver
      batteryFuel: (s) => `${Math.floor(58 + (s % 38))}% Battery`,
      driverMode: 'Autopilot Supervised Navigation',
      destinationList: ['The City of London Bank', 'Cambridge Science Park', 'Oxford University Quad', 'Southampton Port'],
    },
    {
      brand: 'MINI',
      category: 'British Compact',
      name: 'MINI Cooper',
      icon: '🚗',
      model: 'MINI Cooper S John Cooper Works',
      shortModel: 'MINI Cooper',
      shortLabel: '🚗 MINI Cooper',
      powertrain: '2.0L TwinPower Turbo 4-Cyl (204 hp)',
      paintColor: '#15803d', // British Racing Green
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Premium Fuel`,
      driverMode: 'Go-Kart Driving Dynamics Active',
      destinationList: ['Carnaby Street', 'Mayfair Square', 'Covent Garden Market', 'Chelsea Embankment'],
    },
    {
      brand: 'Volkswagen',
      category: 'Hatchback Benchmark',
      name: 'VW Golf',
      icon: '🚗',
      model: 'Volkswagen Golf R-Line 1.5 eTSI',
      shortModel: 'VW Golf',
      shortLabel: '🚗 VW Golf',
      powertrain: '1.5L eTSI Mild Hybrid DSG (150 hp)',
      paintColor: '#2563eb', // Lapiz Blue
      batteryFuel: (s) => `${Math.floor(52 + (s % 42))}% Fuel Tank`,
      driverMode: 'Travel Assist Adaptive Cruise',
      destinationList: ['M25 Orbital Junction', 'Liverpool ONE', 'Nottingham Market Square', 'Belfast City Hall'],
    },
    {
      brand: 'LEVC',
      category: 'Iconic London Taxi',
      name: 'London Black Cab',
      icon: '🚕',
      model: 'LEVC TX Vista Electric Taxi',
      shortModel: 'London Taxi',
      shortLabel: '🚕 London Cab',
      powertrain: 'eCity Range-Extended Electric (333 mi)',
      paintColor: '#09090b', // Classic London Black
      batteryFuel: (s) => `${Math.floor(60 + (s % 35))}% Battery / eCity Generator`,
      driverMode: 'London Knowledge City Transit',
      destinationList: ['Trafalgar Square', 'Charing Cross', 'Paddington Station', 'Victoria Coach Station'],
    },
    {
      brand: 'Land Rover',
      category: 'British Luxury 4x4',
      name: 'Land Rover Defender',
      icon: '🚙',
      model: 'Land Rover Defender 110 D300 AWD',
      shortModel: 'Defender 110',
      shortLabel: '🚙 Defender 110',
      powertrain: '3.0L i6 Turbocharged Diesel (300 hp)',
      paintColor: '#334155', // Carpathian Grey
      batteryFuel: (s) => `${Math.floor(45 + (s % 50))}% Diesel Tank`,
      driverMode: 'Terrain Response 2 Auto 4WD',
      destinationList: ['Kensington High Street', 'Cotswolds Highway Link', 'Surrey Hills Estate', 'Westminster Bridge'],
    },
    {
      brand: 'Ford',
      category: 'Commercial Van',
      name: 'Ford Transit',
      icon: '📦',
      model: 'Ford Transit Custom Trend 2.0 EcoBlue',
      shortModel: 'Ford Transit',
      shortLabel: '📦 Ford Transit',
      powertrain: '2.0L EcoBlue Diesel (136 hp)',
      paintColor: '#f8fafc', // Frozen White
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Diesel Tank`,
      driverMode: 'Commercial Fleet Route Telematics',
      destinationList: ['Royal Mail Sorting Depot', 'Dover Freight Port', 'Park Royal Industrial Hub', 'M1 Distribution Gateway'],
    },
    {
      brand: 'Hyundai',
      category: 'Compact Crossover',
      name: 'Hyundai Tucson',
      icon: '🚙',
      model: 'Hyundai Tucson N Line 1.6 T-GDi Hybrid',
      shortModel: 'Hyundai Tucson',
      shortLabel: '🚙 Hyundai Tucson',
      powertrain: '1.6L Smartstream Turbo Hybrid (230 hp)',
      paintColor: '#475569', // Shadow Grey
      batteryFuel: (s) => `${Math.floor(52 + (s % 45))}% Fuel Tank`,
      driverMode: 'Smart Cruise Control with Stop & Go',
      destinationList: ['Edinburgh Waverley', 'Bath City Centre', 'Bristol Harbourside', 'Cardiff Central'],
    },
    {
      brand: 'Audi',
      category: 'Executive Sportback',
      name: 'Audi A3',
      icon: '🚗',
      model: 'Audi A3 Sportback 35 TFSI S line S tronic',
      shortModel: 'Audi A3',
      shortLabel: '🚗 Audi A3',
      powertrain: '1.5L TFSI Mild Hybrid (150 hp)',
      paintColor: '#1e293b', // Mythos Black
      batteryFuel: (s) => `${Math.floor(50 + (s % 48))}% Fuel Tank`,
      driverMode: 'Audi Pre Sense Front Assist',
      destinationList: ['London City Airport', 'Solihull Tech Park', 'Windsor Castle Walk', 'Oxford Cornmarket'],
    },
    {
      brand: 'BMW',
      category: 'Premium Compact',
      name: 'BMW 1 Series',
      icon: '🚗',
      model: 'BMW 120 M Sport 1.5L TwinPower Turbo',
      shortModel: 'BMW 1 Series',
      shortLabel: '🚗 BMW 1 Series',
      powertrain: '1.5L TwinPower Turbo 3-Cylinder (170 hp)',
      paintColor: '#00a2ff', // Misano Blue
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'Driving Assistant Professional',
      destinationList: ['Coventry Motor City', 'Reading Station Link', 'York Minster Quarter', 'Exeter High Street'],
    },
    {
      brand: 'Toyota',
      category: 'Urban Hybrid Crossover',
      name: 'Yaris Cross',
      icon: '🚙',
      model: 'Toyota Yaris Cross Excel 1.5 Hybrid AWD-i',
      shortModel: 'Yaris Cross',
      shortLabel: '🚙 Yaris Cross',
      powertrain: '1.5L Hybrid System (116 hp / 60+ mpg)',
      paintColor: '#ca8a04', // Brass Gold Bi-Tone
      batteryFuel: (s) => `${Math.floor(58 + (s % 38))}% Hybrid Battery`,
      driverMode: 'Toyota Safety Sense Adaptive',
      destinationList: ['Greenwich Observatory', 'Kew Gardens Approach', 'Brighton Pier Promenade', 'Bournemouth Square'],
    },
    {
      brand: 'Peugeot',
      category: 'French Hatchback in UK',
      name: 'Peugeot 208',
      icon: '🚗',
      model: 'Peugeot 208 GT 1.2 PureTech / e-208',
      shortModel: 'Peugeot 208',
      shortLabel: '🚗 Peugeot 208',
      powertrain: '1.2L PureTech Turbo (130 hp) / 156 hp EV',
      paintColor: '#eab308', // Faro Yellow
      batteryFuel: (s) => `${Math.floor(50 + (s % 46))}% Fuel Tank`,
      driverMode: 'Peugeot i-Cockpit Lane Positioning',
      destinationList: ['Norwich Market', 'Canterbury High Street', 'Aberdeen Union Street', 'Swansea Waterfront'],
    },
    {
      brand: 'MG',
      category: 'Electric Hatchback',
      name: 'MG 4 EV',
      icon: '⚡',
      model: 'MG 4 EV Trophy Long Range (64 kWh)',
      shortModel: 'MG 4 EV',
      shortLabel: '⚡ MG 4 EV',
      powertrain: 'Rear-Motor Electric RWD (201 hp / 281 mi)',
      paintColor: '#ea580c', // Volcano Orange
      batteryFuel: (s) => `${Math.floor(55 + (s % 42))}% Battery (EV)`,
      driverMode: 'MG Pilot Autonomous Suite',
      destinationList: ['Milton Keynes Centre', 'Derby Railway Gate', 'Swindon Tech Hub', 'Hull King George Dock'],
    },
    {
      brand: 'Mercedes-Benz',
      category: 'Compact Luxury',
      name: 'Mercedes A-Class',
      icon: '🚗',
      model: 'Mercedes-Benz A 200 AMG Line Executive',
      shortModel: 'Mercedes A-Class',
      shortLabel: '🚗 Mercedes A-Class',
      powertrain: '1.3L Turbo 4-Cylinder (163 hp)',
      paintColor: '#94a3b8', // Mountain Grey
      batteryFuel: (s) => `${Math.floor(52 + (s % 44))}% Fuel Tank`,
      driverMode: 'MBUX Augmented Reality Navigation',
      destinationList: ['Mayfair Dorchester Gate', 'Knightsbridge Harrods', 'Regent Street Curve', 'St James Square'],
    },
    {
      brand: 'Volvo',
      category: 'Nordic Compact SUV',
      name: 'Volvo XC40',
      icon: '🚙',
      model: 'Volvo XC40 Ultimate B4 Mild Hybrid AWD',
      shortModel: 'Volvo XC40',
      shortLabel: '🚙 Volvo XC40',
      powertrain: '2.0L Turbo Mild Hybrid (197 hp)',
      paintColor: '#38bdf8', // Fjord Blue
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Fuel Tank`,
      driverMode: 'Pilot Assist Semi-Autonomous',
      destinationList: ['Canary Wharf Jubilee', 'Richmond Park Gate', 'Hampstead Heath Loop', 'Stratford Olympic Park'],
    },
    {
      brand: 'Nissan',
      category: 'Compact Urban Crossover',
      name: 'Nissan Juke',
      icon: '🚙',
      model: 'Nissan Juke N-Connecta 1.6 Hybrid',
      shortModel: 'Nissan Juke',
      shortLabel: '🚙 Nissan Juke',
      powertrain: '1.6L Smart Hybrid Dual E-Motor (141 hp)',
      paintColor: '#b91c1c', // Fuji Sunset Red
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'ProPILOT Highway Follow',
      destinationList: ['Sunderland Plant Corridor', 'Chester City Walls', 'Plymouth Hoe Pier', 'Ipswich Waterfront'],
    },
    {
      brand: 'Land Rover',
      category: 'Luxury Performance SUV',
      name: 'Range Rover Sport',
      icon: '🚙',
      model: 'Range Rover Sport Dynamic SE D300 AWD',
      shortModel: 'Range Rover Sport',
      shortLabel: '🚙 Range Rover Sport',
      powertrain: '3.0L i6 Twin-Turbo Diesel (300 hp / 650 Nm)',
      paintColor: '#0f172a', // Santorini Black
      batteryFuel: (s) => `${Math.floor(46 + (s % 50))}% Diesel Tank`,
      driverMode: 'Dynamic Air Suspension & All-Wheel Steer',
      destinationList: ['Belgravia Square', 'Wentworth Golf Club', 'Silverstone Circuit Gate', 'Ascot Racecourse'],
    },
  ],

  // ==========================================
  // GERMANY (Autobahn, Precision Engineering)
  // ==========================================
  DE: [
    {
      brand: 'Volkswagen',
      category: 'Autobahn Benchmark',
      name: 'VW Golf',
      icon: '🚗',
      model: 'Volkswagen Golf 8.5 2.0 TDI Style DSG',
      shortModel: 'VW Golf',
      shortLabel: '🚗 VW Golf',
      powertrain: '2.0L TDI Clean Diesel (150 hp / 360 Nm)',
      paintColor: '#1d4ed8', // Anemone Blue
      batteryFuel: (s) => `${Math.floor(52 + (s % 45))}% Diesel (4.5 L/100km)`,
      driverMode: 'Travel Assist Autobahn Pilot (210 km/h)',
      destinationList: ['Potsdamer Platz', 'Alexanderplatz', 'Autobahn A9 Junction', 'Flughafen Frankfurt'],
    },
    {
      brand: 'BMW',
      category: 'Bavarian Sports Touring',
      name: 'BMW 3 Series',
      icon: '🚗',
      model: 'BMW 320d Touring M Sport xDrive',
      shortModel: 'BMW 3 Series',
      shortLabel: '🚗 BMW 3 Series',
      powertrain: '2.0L TwinPower Turbo Diesel (190 hp)',
      paintColor: '#00a2ff', // Portimao Blue
      batteryFuel: (s) => `${Math.floor(50 + (s % 48))}% Diesel Tank`,
      driverMode: 'Driving Assistant Professional Active',
      destinationList: ['München Schwabing', 'BMW Welt Olympiapark', 'Stuttgart Schlossplatz', 'Hamburg HafenCity'],
    },
    {
      brand: 'Audi',
      category: 'Executive Long-Haul Estate',
      name: 'Audi A6 Avant',
      icon: '🚗',
      model: 'Audi A6 Avant 50 TDI quattro S line',
      shortModel: 'Audi A6',
      shortLabel: '🚗 Audi A6',
      powertrain: '3.0L V6 TDI Mild-Hybrid (286 hp / 620 Nm)',
      paintColor: '#334155', // Daytona Grey Pearl
      batteryFuel: (s) => `${Math.floor(58 + (s % 38))}% Diesel Tank`,
      driverMode: 'Adaptive Cruise Assist quattro Pilot',
      destinationList: ['Köln Domplatte', 'Düsseldorf Königsallee', 'Hannover Messe', 'Nürnberg Hauptbahnhof'],
    },
    {
      brand: 'Mercedes-Benz',
      category: 'Stuttgart Executive Saloon',
      name: 'Mercedes E-Class',
      icon: '🚗',
      model: 'Mercedes-Benz E 300 de 4MATIC AMG Line',
      shortModel: 'Mercedes E-Class',
      shortLabel: '🚗 Mercedes E-Class',
      powertrain: '2.0L Diesel Plug-in Hybrid (313 hp system)',
      paintColor: '#020617', // Obsidian Black
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Fuel / 100km EV`,
      driverMode: 'Drive Pilot Level 3 Autonomous Active',
      destinationList: ['Frankfurt Bankenviertel', 'Berlin Brandenburger Tor', 'Stuttgart Untertürkheim', 'Dresden Frauenkirche'],
    },
    {
      brand: 'Porsche',
      category: 'Sports Car Icon',
      name: 'Porsche 911',
      icon: '🏎️',
      model: 'Porsche 911 Carrera GTS T-Hybrid',
      shortModel: 'Porsche 911',
      shortLabel: '🏎️ Porsche 911',
      powertrain: '3.6L Boxer T-Hybrid Turbo (541 hp)',
      paintColor: '#dc2626', // Guards Red
      batteryFuel: (s) => `${Math.floor(45 + (s % 50))}% Super Plus 98`,
      driverMode: 'Sport Chrono Track Telemetry Active',
      destinationList: ['Nürburgring Nordschleife', 'Autobahn A8 Unlimited Zone', 'Baden-Baden Kurhaus', 'Leipzig Werk'],
    },
    {
      brand: 'Volkswagen',
      category: 'Family SUV Leader',
      name: 'VW Tiguan',
      icon: '🚙',
      model: 'Volkswagen Tiguan 2.0 TDI 4MOTION R-Line',
      shortModel: 'VW Tiguan',
      shortLabel: '🚙 VW Tiguan',
      powertrain: '2.0L TDI Turbo Diesel 4MOTION (193 hp)',
      paintColor: '#0284c7', // Cipressino Grün / Blue
      batteryFuel: (s) => `${Math.floor(50 + (s % 46))}% Diesel Tank`,
      driverMode: 'IQ.DRIVE Travel Assist Autobahn',
      destinationList: ['Wolfsburg Autostadt Gate', 'Hamburg Speicherstadt', 'Bremen Marktplatz', 'Hannover Airport'],
    },
    {
      brand: 'Volkswagen',
      category: 'Compact Crossover',
      name: 'VW T-Roc',
      icon: '🚙',
      model: 'Volkswagen T-Roc 1.5 TSI Style DSG',
      shortModel: 'VW T-Roc',
      shortLabel: '🚙 VW T-Roc',
      powertrain: '1.5L TSI evo2 Active Cylinder (150 hp)',
      paintColor: '#d97706', // Curcuma Gelb
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'Front Assist & Lane Assist Active',
      destinationList: ['Berlin Kurfürstendamm', 'Dortmund Signal Iduna Park', 'Essen Zollverein', 'Kiel Fährhafen'],
    },
    {
      brand: 'Volkswagen',
      category: 'Autobahn Fleet Cruiser',
      name: 'VW Passat',
      icon: '🚗',
      model: 'Volkswagen Passat Variant 2.0 TDI Elegance',
      shortModel: 'Passat Variant',
      shortLabel: '🚗 Passat Variant',
      powertrain: '2.0L TDI Clean Diesel DSG (150 hp)',
      paintColor: '#334155', // Maranoblau Metallic
      batteryFuel: (s) => `${Math.floor(62 + (s % 35))}% Diesel (1,100 km Range)`,
      driverMode: 'Autobahn Long-Range Travel Assist',
      destinationList: ['Frankfurt Westhafen', 'Stuttgart Bad Cannstatt', 'München Marienplatz', 'Ingolstadt Audi Forum'],
    },
    {
      brand: 'BMW',
      category: 'Executive Autobahn Saloon',
      name: 'BMW 5 Series',
      icon: '🚗',
      model: 'BMW 520d Sedan M Sport Mild-Hybrid',
      shortModel: 'BMW 5 Series',
      shortLabel: '🚗 BMW 5 Series',
      powertrain: '2.0L TwinPower Turbo Diesel 48V (197 hp)',
      paintColor: '#1e293b', // Carbonschwarz Metallic
      batteryFuel: (s) => `${Math.floor(54 + (s % 42))}% Diesel Tank`,
      driverMode: 'Highway Assistant Hands-Free (130 km/h)',
      destinationList: ['München Brienner Straße', 'Nürnberg Messe', 'Mannheim Wasserturm', 'Karlsruhe Schloss'],
    },
    {
      brand: 'Audi',
      category: 'Mid-Size Estate quattro',
      name: 'Audi A4 Avant',
      icon: '🚗',
      model: 'Audi A4 Avant 40 TDI S line quattro',
      shortModel: 'Audi A4 Avant',
      shortLabel: '🚗 Audi A4 Avant',
      powertrain: '2.0L TDI quattro S tronic (204 hp / 400 Nm)',
      paintColor: '#475569', // Chronosgrau Metallic
      batteryFuel: (s) => `${Math.floor(52 + (s % 45))}% Diesel Tank`,
      driverMode: 'quattro Ultra All-Wheel Drive Assist',
      destinationList: ['Ingolstadt Werk Gate 3', 'Regensburg Altstadt', 'Augsburg Rathausplatz', 'Ulm Münsterplatz'],
    },
    {
      brand: 'Mercedes-Benz',
      category: 'Executive Compact Saloon',
      name: 'Mercedes C-Class',
      icon: '🚗',
      model: 'Mercedes-Benz C 220 d AMG Line',
      shortModel: 'Mercedes C-Class',
      shortLabel: '🚗 Mercedes C-Class',
      powertrain: '2.0L OM 654 M Mild-Hybrid Diesel (200 hp)',
      paintColor: '#0f172a', // Selenitgrau Metallic
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Diesel Tank`,
      driverMode: 'Active Distance Assist DISTRONIC',
      destinationList: ['Sindelfingen Mercedes Werk', 'Freiburg Münster', 'Heidelberg Schlossberg', 'Mainz Rheinufer'],
    },
    {
      brand: 'Mercedes-Benz',
      category: 'Luxury Compact SUV',
      name: 'Mercedes GLC',
      icon: '🚙',
      model: 'Mercedes-Benz GLC 300 de 4MATIC AMG Line',
      shortModel: 'Mercedes GLC',
      shortLabel: '🚙 Mercedes GLC',
      powertrain: '2.0L Diesel PHEV AWD (335 hp / 130 km EV)',
      paintColor: '#64748b', // High-Tech Silber
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Fuel / 31.2 kWh Pack`,
      driverMode: 'Off-Road Mode & Transparent Bonnet',
      destinationList: ['Stuttgart Fernsehturm', 'Konstanz Bodensee Promenade', 'Tübingen Stift', 'Würzburg Residenz'],
    },
    {
      brand: 'Porsche',
      category: 'Electric Super Saloon',
      name: 'Porsche Taycan',
      icon: '🏎️',
      model: 'Porsche Taycan 4S Dual Motor AWD',
      shortModel: 'Porsche Taycan',
      shortLabel: '🏎️ Porsche Taycan',
      powertrain: '800V Dual PMSM Electric (544 hp Overboost)',
      paintColor: '#00f0ff', // Frozen Blue Metallic
      batteryFuel: (s) => `${Math.floor(58 + (s % 38))}% Battery (105 kWh)`,
      driverMode: 'Porsche Active Ride Suspension Active',
      destinationList: ['Zuffenhausen Porscheplatz', 'Hockenheimring Grand Prix', 'Garmisch Zugspitzbahn', 'Sylt Westerland'],
    },
    {
      brand: 'Opel',
      category: 'Everyday City Hatchback',
      name: 'Opel Corsa',
      icon: '🚗',
      model: 'Opel Corsa GS 1.2 Turbo / Electric',
      shortModel: 'Opel Corsa',
      shortLabel: '🚗 Opel Corsa',
      powertrain: '1.2L Turbo PureTech 48V Hybrid (136 hp)',
      paintColor: '#ea580c', // Grafik Grau / Orange
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'Intelli-Drive City Traffic Follow',
      destinationList: ['Rüsselsheim Opel Altwerk', 'Bonn Münsterplatz', 'Aachen Domhof', 'Wiesbaden Kurhaus'],
    },
    {
      brand: 'Skoda',
      category: 'Popular German Fleet Estate',
      name: 'Skoda Octavia',
      icon: '🚗',
      model: 'Skoda Octavia Combi 2.0 TDI Style DSG',
      shortModel: 'Skoda Octavia',
      shortLabel: '🚗 Skoda Octavia',
      powertrain: '2.0L TDI Clean Diesel (150 hp / 360 Nm)',
      paintColor: '#2563eb', // Race Blau Metallic
      batteryFuel: (s) => `${Math.floor(58 + (s % 40))}% Diesel Tank`,
      driverMode: 'Travel Assist & Predictive Cruise',
      destinationList: ['Dresden Elbufer', 'Leipzig Augustusplatz', 'Erfurt Krämerbrücke', 'Chemnitz Karl-Marx-Monument'],
    },
    {
      brand: 'Ford',
      category: 'Compact Sports Hatch',
      name: 'Ford Focus',
      icon: '🚗',
      model: 'Ford Focus ST-Line EcoBoost mHEV',
      shortModel: 'Ford Focus',
      shortLabel: '🚗 Ford Focus',
      powertrain: '1.0L EcoBoost Mild Hybrid 7-Speed (155 hp)',
      paintColor: '#dc2626', // Fantastic Red
      batteryFuel: (s) => `${Math.floor(50 + (s % 46))}% Fuel Tank`,
      driverMode: 'Selectable Drive Modes (Sport / Track)',
      destinationList: ['Köln Ford-Werke Niehl', 'Saarlouis Werk Gate', 'Mönchengladbach Rheydt', 'Krefeld Uerdingen'],
    },
    {
      brand: 'BMW',
      category: 'Bavarian Compact Hatch',
      name: 'BMW 1 Series',
      icon: '🚗',
      model: 'BMW 120 M Sport Steptronic Mild-Hybrid',
      shortModel: 'BMW 1 Series',
      shortLabel: '🚗 BMW 1 Series',
      powertrain: '1.5L TwinPower 3-Cyl 48V (170 hp)',
      paintColor: '#00a2ff', // Skyscraper Grau
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'BMW Operating System 9 Driving Assist',
      destinationList: ['Regensburg BMW Werk', 'Landshut Altstadt', 'Rosenheim Max-Josefs-Platz', 'Passau Dreiflüsseeck'],
    },
    {
      brand: 'Audi',
      category: 'Premium Mid-Size SUV',
      name: 'Audi Q5',
      icon: '🚙',
      model: 'Audi Q5 40 TDI quattro S line S tronic',
      shortModel: 'Audi Q5',
      shortLabel: '🚙 Audi Q5',
      powertrain: '2.0L TDI Mild Hybrid quattro (204 hp)',
      paintColor: '#1e3a8a', // Navarrablau Metallic
      batteryFuel: (s) => `${Math.floor(52 + (s % 44))}% Diesel Tank`,
      driverMode: 'Audi Drive Select Dynamic quattro',
      destinationList: ['Neckarsulm Audi Forum', 'Heilbronn Kiliansplatz', 'Ludwigsburg Residenz', 'Pforzheim Goldstadt'],
    },
    {
      brand: 'Tesla',
      category: 'Berlin Gigafactory EV',
      name: 'Tesla Model Y',
      icon: '⚡',
      model: 'Tesla Model Y Long Range Gigafactory Berlin',
      shortModel: 'Tesla Model Y',
      shortLabel: '⚡ Tesla Model Y',
      powertrain: 'Dual Motor AWD Electric (384 hp)',
      paintColor: '#cbd5e1', // Quicksilver Made in Grünheide
      batteryFuel: (s) => `${Math.floor(60 + (s % 38))}% Battery (EV)`,
      driverMode: 'Autopilot Supervised Autobahn Assist',
      destinationList: ['Grünheide Gigafactory Berlin', 'Berlin Hauptbahnhof', 'Potsdam Sanssouci', 'Schönefeld Airport BER'],
    },
    {
      brand: 'Volkswagen',
      category: 'Electric Family SUV',
      name: 'VW ID.4',
      icon: '⚡',
      model: 'Volkswagen ID.4 Pro Performance EV',
      shortModel: 'VW ID.4',
      shortLabel: '⚡ VW ID.4',
      powertrain: 'APP550 Rear Motor Electric (286 hp / 77 kWh)',
      paintColor: '#38bdf8', // Costa Azul Metallic
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Battery (550 km WLTP)`,
      driverMode: 'Travel Assist with Swarm Data Active',
      destinationList: ['Zwickau EV Production Center', 'Chemnitz Neumarkt', 'Gera Marktplatz', 'Plauen Vogtland'],
    },
  ],

  // ==========================================
  // JAPAN (Top 20 Kei Cars, Hybrids & Minivans)
  // ==========================================
  JP: [
    {
      brand: 'Toyota',
      category: 'Compact Hatchback',
      name: 'Toyota Yaris',
      icon: '🚗',
      model: 'Toyota Yaris Hybrid Z E-Four',
      shortModel: 'Toyota Yaris',
      shortLabel: '🚗 Toyota Yaris',
      powertrain: '1.5L Dynamic Force Hybrid (36.0 km/l)',
      paintColor: '#ffffff', // Super White
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Hybrid Storage`,
      driverMode: 'Toyota Safety Sense Autonomous City Assist',
      destinationList: ['Shibuya Crossing', 'Shinjuku South Gate', 'Ginza 4-Chome', 'Tokyo Big Sight'],
    },
    {
      brand: 'Honda',
      category: 'Kei Car Leader',
      name: 'Honda N-BOX',
      icon: '🚗',
      model: 'Honda N-BOX Custom Turbo',
      shortModel: 'Honda N-BOX',
      shortLabel: '🚗 Honda N-BOX',
      powertrain: '660cc DOHC Turbo VTEC (64 hp)',
      paintColor: '#1e293b', // Crystal Black Pearl
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Fuel (Kei Class)`,
      driverMode: 'Honda SENSING Dual Slide Assist',
      destinationList: ['Akihabara Electric Town', 'Roppongi Hills Quad', 'Ueno Station Plaza', 'Ikebukuro West Gate'],
    },
    {
      brand: 'Toyota',
      category: 'Compact Minivan',
      name: 'Toyota Sienta',
      icon: '🚐',
      model: 'Toyota Sienta Hybrid Z 7-Seater',
      shortModel: 'Toyota Sienta',
      shortLabel: '🚐 Toyota Sienta',
      powertrain: '1.5L Series-Parallel Hybrid (28.8 km/l)',
      paintColor: '#ca8a04', // Urban Khaki
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'Proactive Driving Assist PDA',
      destinationList: ['Yokohama Minato Mirai', 'Odaiba Seaside Promenade', 'Haneda Airport T3', 'Chiba Bay Loop'],
    },
    {
      brand: 'Toyota',
      category: 'Luxury VIP Minivan',
      name: 'Toyota Alphard',
      icon: '🚐',
      model: 'Toyota Alphard Executive Lounge E-Four',
      shortModel: 'Toyota Alphard',
      shortLabel: '🚐 Toyota Alphard',
      powertrain: '2.5L Series-Parallel Hybrid (250 hp)',
      paintColor: '#020617', // Black 202
      batteryFuel: (s) => `${Math.floor(58 + (s % 38))}% Hybrid Fuel`,
      driverMode: 'Toyota Teammate Advanced Drive',
      destinationList: ['Imperial Palace East', 'Tokyo Station Marunouchi', 'Omotesando Hills', 'Nagoya Station Central'],
    },
    {
      brand: 'Nissan',
      category: 'Kei Electric Car',
      name: 'Nissan Sakura',
      icon: '⚡',
      model: 'Nissan Sakura G All-Electric Kei',
      shortModel: 'Nissan Sakura',
      shortLabel: '⚡ Nissan Sakura',
      powertrain: '20 kWh Lithium-Ion EV (180 km range)',
      paintColor: '#f472b6', // Blossom Pink Two-Tone
      batteryFuel: (s) => `${Math.floor(62 + (s % 35))}% Battery (EV)`,
      driverMode: 'ProPILOT Park Autonomous Assist',
      destinationList: ['Kichijoji Sun Road', 'Shimokitazawa Station', 'Yokohama Landmark Tower', 'Kyoto Gion Promenade'],
    },
    {
      brand: 'Toyota',
      category: 'Aerodynamic Hybrid',
      name: 'Toyota Prius',
      icon: '🌱',
      model: 'Toyota Prius Z 2.0L Series Hybrid',
      shortModel: 'Toyota Prius',
      shortLabel: '🌱 Toyota Prius',
      powertrain: '2.0L Series-Parallel Hybrid (196 hp)',
      paintColor: '#eab308', // Mustard Yellow
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Hybrid Battery`,
      driverMode: 'Proactive Driving Assist PDA',
      destinationList: ['Shinjuku Skyscraper District', 'Ebisu Garden Place', 'Osaka Umeda Sky Building', 'Kobe Harborland'],
    },
    {
      brand: 'Nissan',
      category: 'e-POWER Hatchback',
      name: 'Nissan Note',
      icon: '🚗',
      model: 'Nissan Note AURA e-POWER 4WD',
      shortModel: 'Nissan Note',
      shortLabel: '🚗 Nissan Note',
      powertrain: '1.2L HR12DE e-POWER Series Hybrid',
      paintColor: '#b91c1c', // Garnet Red
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% e-POWER Storage`,
      driverMode: 'e-Pedal Step Regenerative Drive',
      destinationList: ['Shinbashi Station SL Plaza', 'Meguro River Crossing', 'Sapporo Odori Park', 'Fukuoka Tenjin Crossing'],
    },
    {
      brand: 'Suzuki',
      category: 'Kei Tall Wagon',
      name: 'Suzuki Spacia',
      icon: '🚗',
      model: 'Suzuki Spacia Custom Hybrid XS Turbo',
      shortModel: 'Suzuki Spacia',
      shortLabel: '🚗 Suzuki Spacia',
      powertrain: '660cc Mild Hybrid Turbo (64 hp)',
      paintColor: '#3b82f6', // Indigo Blue
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel (Kei)`,
      driverMode: 'Dual Sensor Brake Support II',
      destinationList: ['Omiya Railway Museum', 'Tachikawa Showa Park', 'Hiroshima Peace Blvd', 'Sendai Aoba-dori'],
    },
    {
      brand: 'Toyota',
      category: 'Touring Station Wagon',
      name: 'Toyota Corolla',
      icon: '🚗',
      model: 'Toyota Corolla Touring Hybrid W×B',
      shortModel: 'Toyota Corolla',
      shortLabel: '🚗 Toyota Corolla',
      powertrain: '1.8L Series-Parallel Hybrid (140 hp)',
      paintColor: '#334155', // Celestial Black Glass
      batteryFuel: (s) => `${Math.floor(52 + (s % 45))}% Fuel Tank`,
      driverMode: 'Toyota Safety Sense 3.0',
      destinationList: ['Toyota City HQ Gate', 'Nagoya Sakae Oasis 21', 'Shizuoka Station Plaza', 'Hamamatsu Act Tower'],
    },
    {
      brand: 'Toyota',
      category: 'Compact Tall Minivan',
      name: 'Toyota Roomy',
      icon: '🚐',
      model: 'Toyota Roomy Custom G-T Turbo Minivan',
      shortModel: 'Toyota Roomy',
      shortLabel: '🚐 Toyota Roomy',
      powertrain: '1.0L 1KR-VET Turbo (98 hp)',
      paintColor: '#b91c1c', // Fire Quartz Red
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'Smart Assist Dual Camera',
      destinationList: ['Kawasaki Station Plaza', 'Chiba Makuhari Messe', 'Saitama Super Arena', 'Machida Station Square'],
    },
    {
      brand: 'Toyota',
      category: 'Premium Urban SUV',
      name: 'Toyota Harrier',
      icon: '🚙',
      model: 'Toyota Harrier Z Leather Package Hybrid',
      shortModel: 'Toyota Harrier',
      shortLabel: '🚙 Toyota Harrier',
      powertrain: '2.5L Dynamic Force Hybrid E-Four (222 hp)',
      paintColor: '#09090b', // Precious Black Pearl
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Fuel Tank`,
      driverMode: 'Digital Inner Mirror & T-Connect ADAS',
      destinationList: ['Roppongi Midtown Tower', 'Aoyama Dori Avenue', 'Ginza Sony Park', 'Yokohama Motomachi'],
    },
    {
      brand: 'Toyota',
      category: 'High-Efficiency Compact',
      name: 'Toyota Aqua',
      icon: '🚗',
      model: 'Toyota Aqua Z Bipolar NiMH Hybrid',
      shortModel: 'Toyota Aqua',
      shortLabel: '🚗 Toyota Aqua',
      powertrain: '1.5L Hybrid (35.8 km/l Bipolar NiMH)',
      paintColor: '#0284c7', // Clear Emerald Pearl
      batteryFuel: (s) => `${Math.floor(54 + (s % 42))}% Hybrid Battery`,
      driverMode: 'Comfort Pedal Deceleration Assist',
      destinationList: ['Kyoto Shijo Karasuma', 'Nara Kintetsu Plaza', 'Kobe Sannomiya', 'Osaka Dotonbori Bridge'],
    },
    {
      brand: 'Honda',
      category: 'Compact Family Minivan',
      name: 'Honda Freed',
      icon: '🚐',
      model: 'Honda Freed e:HEV AIR EX 7-Seater',
      shortModel: 'Honda Freed',
      shortLabel: '🚐 Honda Freed',
      powertrain: '1.5L e:HEV Dual-Motor Hybrid (123 hp)',
      paintColor: '#f8fafc', // Platinum White Pearl
      batteryFuel: (s) => `${Math.floor(52 + (s % 44))}% Hybrid Tank`,
      driverMode: 'Honda SENSING Traffic Jam Assist',
      destinationList: ['Saitama Omiya Sonic City', 'Tsukuba Space Center Gate', 'Kashiwa Station Plaza', 'Funabashi Port Walk'],
    },
    {
      brand: 'Honda',
      category: 'Urban Hybrid SUV',
      name: 'Honda Vezel',
      icon: '🚙',
      model: 'Honda Vezel e:HEV Z Real-Time AWD',
      shortModel: 'Honda Vezel',
      shortLabel: '🚙 Honda Vezel',
      powertrain: '1.5L e:HEV 2-Motor Hybrid System',
      paintColor: '#dc2626', // Premium Crystal Red
      batteryFuel: (s) => `${Math.floor(50 + (s % 46))}% Fuel Tank`,
      driverMode: 'Honda CONNECT & Hands-Free Power Tailgate',
      destinationList: ['Shin-Yokohama Shinkansen Gate', 'Gotokuji Temple Way', 'Kamakura Enoshima Coastal', 'Hakone Yumoto'],
    },
    {
      brand: 'Nissan',
      category: 'Family e-POWER Minivan',
      name: 'Nissan Serena',
      icon: '🚐',
      model: 'Nissan Serena e-POWER Highway STAR V',
      shortModel: 'Nissan Serena',
      shortLabel: '🚐 Nissan Serena',
      powertrain: '1.4L e-POWER Dedicated Engine (163 hp Motor)',
      paintColor: '#2563eb', // Turquoise Blue Two-Tone
      batteryFuel: (s) => `${Math.floor(52 + (s % 44))}% e-POWER Storage`,
      driverMode: 'ProPILOT 2.0 Hands-Off Highway Drive',
      destinationList: ['Yokohama Bay Bridge Route', 'Atsugi Tech Campus', 'Odawara Castle Park', 'Fujisawa Seaside'],
    },
    {
      brand: 'Suzuki',
      category: 'Rugged Crossover Kei',
      name: 'Suzuki Hustler',
      icon: '🚙',
      model: 'Suzuki Hustler Hybrid X Turbo 4WD',
      shortModel: 'Suzuki Hustler',
      shortLabel: '🚙 Suzuki Hustler',
      powertrain: '660cc Turbo Mild Hybrid (64 hp / Grip Support)',
      paintColor: '#ea580c', // Passion Orange Two-Tone
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel (Kei 4WD)`,
      driverMode: 'Snow Mode & Grip Control Active',
      destinationList: ['Karuizawa Resort Loop', 'Nagano Zenkoji Gate', 'Hakuba Alpine Valley', 'Matsumoto Castle Square'],
    },
    {
      brand: 'Daihatsu',
      category: 'Miracle Sliding Door Kei',
      name: 'Daihatsu Tanto',
      icon: '🚗',
      model: 'Daihatsu Tanto Custom RS Turbo Kei',
      shortModel: 'Daihatsu Tanto',
      shortLabel: '🚗 Daihatsu Tanto',
      powertrain: '660cc KF-VET DOHC Turbo (64 hp)',
      paintColor: '#1e293b', // Shining White / Black
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Fuel Tank`,
      driverMode: 'Smart Assist Pillarless Entry Mode',
      destinationList: ['Osaka Namba Parks', 'Tennoji Abeno Harukas', 'Sakai Senboku Loop', 'Amagasaki Station Plaza'],
    },
    {
      brand: 'Mazda',
      category: 'Clean Diesel SUV',
      name: 'Mazda CX-5',
      icon: '🚙',
      model: 'Mazda CX-5 2.2 Skyactiv-D Exclusive Mode',
      shortModel: 'Mazda CX-5',
      shortLabel: '🚙 Mazda CX-5',
      powertrain: '2.2L Skyactiv-D Clean Diesel (200 hp / 450 Nm)',
      paintColor: '#991b1b', // Soul Red Crystal
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Diesel Tank`,
      driverMode: 'i-ACTIV AWD & G-Vectoring Control Plus',
      destinationList: ['Hiroshima Mazda HQ Gate', 'Miyajima Ferry Port', 'Okayama Korakuen', 'Kurashiki Bikan Quarter'],
    },
    {
      brand: 'Subaru',
      category: 'Boxer All-Wheel Drive SUV',
      name: 'Subaru Forester',
      icon: '🚙',
      model: 'Subaru Forester 2.0 e-BOXER Advance AWD',
      shortModel: 'Subaru Forester',
      shortLabel: '🚙 Subaru Forester',
      powertrain: '2.0L Horizontally-Opposed BOXER + e-BOXER',
      paintColor: '#15803d', // Cascade Green Silica
      batteryFuel: (s) => `${Math.floor(50 + (s % 46))}% Fuel Tank`,
      driverMode: 'EyeSight Touring Assist Dual X-MODE',
      destinationList: ['Gunma Ota Subaru Plant', 'Kusatsu Onsen Gate', 'Nikko Toshogu Route', 'Utsunomiya Station'],
    },
    {
      brand: 'Lexus',
      category: 'Luxury Performance Hybrid',
      name: 'Lexus RX',
      icon: '🚙',
      model: 'Lexus RX 500h F SPORT Performance Direct4',
      shortModel: 'Lexus RX',
      shortLabel: '🚙 Lexus RX',
      powertrain: '2.4L Turbo Hybrid Direct4 All-Wheel Drive (371 hp)',
      paintColor: '#475569', // Sonic Chrome
      batteryFuel: (s) => `${Math.floor(56 + (s % 40))}% Premium Fuel`,
      driverMode: 'Lexus Safety System+ 3.0 Direct4 Steer',
      destinationList: ['Tokyo Midtown Hibiya', 'Daikanyama T-Site', 'Ashiya High-Rise Quarter', 'Fukuoka Hakata Canal City'],
    },
  ],

  // ==========================================
  // AUSTRALIA (Top 20 Utes, 4x4s & Touring Cars)
  // ==========================================
  AU: [
    {
      brand: 'Toyota',
      category: 'Aussie Ute Champion',
      name: 'Toyota HiLux',
      icon: '🛻',
      model: 'Toyota HiLux SR5 4x4 Double Cab 2.8L',
      shortModel: 'Toyota HiLux',
      shortLabel: '🛻 Toyota HiLux',
      powertrain: '2.8L Turbo Diesel 48V V-Active (201 hp / 500 Nm)',
      paintColor: '#f8fafc', // Glacier White
      batteryFuel: (s) => `${Math.floor(52 + (s % 42))}% Diesel Tank`,
      driverMode: '4WD Dual Range Heavy Duty Towing',
      destinationList: ['Sydney Harbour Bridge Way', 'Melbourne Docklands', 'Brisbane Riverfront', 'Perth St Georges Terrace'],
    },
    {
      brand: 'Ford',
      category: 'High-Performance Dual-Cab Ute',
      name: 'Ford Ranger',
      icon: '🛻',
      model: 'Ford Ranger Wildtrak 3.0L V6 Turbo Diesel',
      shortModel: 'Ford Ranger',
      shortLabel: '🛻 Ford Ranger',
      powertrain: '3.0L V6 Turbo Diesel (247 hp / 600 Nm)',
      paintColor: '#ea580c', // Sedona Orange
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Diesel Tank`,
      driverMode: 'e-Shifter Full-Time 4WD Active',
      destinationList: ['Great Ocean Road Highway', 'Adelaide North Terrace', 'Gold Coast Highway', 'Canberra Civic Square'],
    },
    {
      brand: 'Toyota',
      category: 'Outback Workhorse',
      name: 'LandCruiser 300',
      icon: '🚙',
      model: 'Toyota LandCruiser 300 Sahara ZX 3.3L',
      shortModel: 'LandCruiser 300',
      shortLabel: '🚙 LandCruiser 300',
      powertrain: '3.3L Twin-Turbo V6 Diesel (304 hp / 700 Nm)',
      paintColor: '#334155', // Graphite Metallic
      batteryFuel: (s) => `${Math.floor(60 + (s % 35))}% Long Range Tank (110L)`,
      driverMode: 'Kinetic Dynamic Suspension (e-KDSS)',
      destinationList: ['Stuart Highway Outback Corridor', 'Blue Mountains Scenic Drive', 'Cairns Esplanade', 'Darwin Berrimah Link'],
    },
    {
      brand: 'Isuzu',
      category: 'Tough Dual-Cab Ute',
      name: 'Isuzu D-Max',
      icon: '🛻',
      model: 'Isuzu D-Max X-TERRAIN 4x4 Crew Cab 3.0L',
      shortModel: 'Isuzu D-Max',
      shortLabel: '🛻 Isuzu D-Max',
      powertrain: '3.0L 4JJ3-TCX Turbo Diesel (190 hp / 450 Nm)',
      paintColor: '#ea580c', // Volcanic Amber
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Diesel Tank`,
      driverMode: 'Rough Terrain Mode & Rear Diff Lock',
      destinationList: ['Parramatta Road West', 'Dandenong Logistics Hub', 'Townsville Port Link', 'Fremantle Fishing Harbour'],
    },
    {
      brand: 'Toyota',
      category: 'Hybrid Family SUV',
      name: 'Toyota RAV4',
      icon: '🚙',
      model: 'Toyota RAV4 Cruiser Hybrid AWD',
      shortModel: 'Toyota RAV4',
      shortLabel: '🚙 Toyota RAV4',
      powertrain: '2.5L Dynamic Force Hybrid AWD (219 hp)',
      paintColor: '#2563eb', // Atomic Rush Blue
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Hybrid Tank`,
      driverMode: 'Trail Mode & Dynamic Torque Vectoring',
      destinationList: ['Bondi Beach Marine Drive', 'St Kilda Esplanade', 'Brisbane South Bank', 'Cottesloe Marine Parade'],
    },
    {
      brand: 'Mitsubishi',
      category: 'PHEV All-Wheel Drive',
      name: 'Outlander PHEV',
      icon: '🚙',
      model: 'Mitsubishi Outlander Exceed Tourer PHEV AWD',
      shortModel: 'Outlander PHEV',
      shortLabel: '🚙 Outlander PHEV',
      powertrain: '2.4L Dual-Motor Super All-Wheel Control (S-AWC)',
      paintColor: '#0284c7', // Red Diamond Two-Tone
      batteryFuel: (s) => `${Math.floor(52 + (s % 44))}% Fuel / 84 km EV`,
      driverMode: 'Super All-Wheel Control (S-AWC)',
      destinationList: ['Chatswood Interchange', 'Box Hill Central', 'Fortitude Valley', 'Subiaco Centro'],
    },
    {
      brand: 'Hyundai',
      category: 'Mid-Size Family SUV',
      name: 'Hyundai Tucson',
      icon: '🚙',
      model: 'Hyundai Tucson Elite 2.0 CRDi Diesel AWD',
      shortModel: 'Hyundai Tucson',
      shortLabel: '🚙 Hyundai Tucson',
      powertrain: '2.0L CRDi Turbo Diesel (186 hp / 416 Nm)',
      paintColor: '#475569', // Amazon Grey
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Diesel Tank`,
      driverMode: 'HTRAC Electronic All-Wheel Drive',
      destinationList: ['Sydney Olympic Park', 'Chadstone Fashion Capital', 'Gold Coast Broadbeach', 'Mandurah Ocean Marina'],
    },
    {
      brand: 'Mazda',
      category: 'Touring SUV',
      name: 'Mazda CX-5',
      icon: '🚙',
      model: 'Mazda CX-5 Akera 2.5L Turbo AWD',
      shortModel: 'Mazda CX-5',
      shortLabel: '🚙 Mazda CX-5',
      powertrain: '2.5L Skyactiv-G 2.5T Petrol (228 hp / 420 Nm)',
      paintColor: '#991b1b', // Soul Red Crystal
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Fuel Tank`,
      driverMode: 'i-ACTIV All-Wheel Drive Off-Road Assist',
      destinationList: ['Barangaroo Reserve', 'South Yarra Chapel St', 'New Farm Riverwalk', 'Leederville Oxford St'],
    },
    {
      brand: 'Kia',
      category: 'Aussie Family Crossover',
      name: 'Kia Sportage',
      icon: '🚙',
      model: 'Kia Sportage GT-Line 2.0 CRDi Diesel AWD',
      shortModel: 'Kia Sportage',
      shortLabel: '🚙 Kia Sportage',
      powertrain: '2.0L CRDi Diesel 8-Speed (183 hp / 416 Nm)',
      paintColor: '#334155', // Vesta Blue
      batteryFuel: (s) => `${Math.floor(52 + (s % 44))}% Diesel Tank`,
      driverMode: 'Aussie Suspension Tuning & Terrain Mode',
      destinationList: ['Manly Corso Ferry Wharf', 'Brighton Bathing Boxes', 'Sunshine Coast Caloundra', 'Wollongong Foreshore'],
    },
    {
      brand: 'MG',
      category: 'Affordable Urban Crossover',
      name: 'MG ZS',
      icon: '🚙',
      model: 'MG ZS Essence 1.0L Turbo / EV Crossover',
      shortModel: 'MG ZS',
      shortLabel: '🚙 MG ZS',
      powertrain: '1.0L Turbo 6-Speed Auto (111 hp) / EV',
      paintColor: '#38bdf8', // Diamond Red / Blue
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'MG Pilot Driver Assistance System',
      destinationList: ['Blacktown Westpoint', 'Preston High Street', 'Logan Hyperdome', 'Joondalup Lakeside'],
    },
    {
      brand: 'Tesla',
      category: 'Electric Crossover Leader',
      name: 'Tesla Model Y',
      icon: '⚡',
      model: 'Tesla Model Y Rear-Wheel Drive EV (LFP Pack)',
      shortModel: 'Tesla Model Y',
      shortLabel: '⚡ Tesla Model Y',
      powertrain: 'Single Motor RWD (60 kWh LFP / 455 km)',
      paintColor: '#f8fafc', // Pearl White Multi-Coat
      batteryFuel: (s) => `${Math.floor(58 + (s % 38))}% Battery (EV)`,
      driverMode: 'Autopilot Highway Navigation',
      destinationList: ['Sydney Tech Central', 'Melbourne Carlton Gardens', 'Brisbane Queen St Mall', 'Perth Kings Park'],
    },
    {
      brand: 'Subaru',
      category: 'All-Wheel Drive Wagon',
      name: 'Subaru Forester',
      icon: '🚙',
      model: 'Subaru Forester 2.5i-S Symmetrical AWD',
      shortModel: 'Subaru Forester',
      shortLabel: '🚙 Subaru Forester',
      powertrain: '2.5L Direct Injection Boxer (182 hp)',
      paintColor: '#15803d', // Autumn Green Metallic
      batteryFuel: (s) => `${Math.floor(50 + (s % 46))}% Fuel Tank`,
      driverMode: 'Dual-Function X-MODE with Hill Descent',
      destinationList: ['Katoomba Three Sisters', 'Yarra Valley Wine Route', 'Glass House Mountains', 'Margaret River Winery'],
    },
    {
      brand: 'Ford',
      category: 'Heavy-Duty 7-Seat 4x4',
      name: 'Ford Everest',
      icon: '🚙',
      model: 'Ford Everest Platinum 3.0L V6 Turbo Diesel',
      shortModel: 'Ford Everest',
      shortLabel: '🚙 Ford Everest',
      powertrain: '3.0L V6 Turbo Diesel 10-Speed (247 hp / 600 Nm)',
      paintColor: '#1e293b', // Shadow Black
      batteryFuel: (s) => `${Math.floor(54 + (s % 42))}% Diesel (3.5T Towing)`,
      driverMode: 'Terrain Management System (Sand/Mud/Rock)',
      destinationList: ['Pacific Motorway M1', 'Hume Highway Route', 'Bruce Highway Link', 'Albany Highway Corridor'],
    },
    {
      brand: 'Toyota',
      category: 'Rugged Family 4WD',
      name: 'LandCruiser Prado',
      icon: '🚙',
      model: 'Toyota LandCruiser Prado Kakadu 2.8L',
      shortModel: 'Prado Kakadu',
      shortLabel: '🚙 Prado Kakadu',
      powertrain: '2.8L Turbo Diesel 48V V-Active (201 hp)',
      paintColor: '#f59e0b', // Sand Dune Bronze
      batteryFuel: (s) => `${Math.floor(62 + (s % 35))}% Dual Tank (150L Capacity)`,
      driverMode: 'Multi-Terrain Select & Kinetic Suspension',
      destinationList: ['Flinders Ranges Gateway', 'Grampians National Park', 'Fraser Island Ferry Ramp', 'Broome Cable Beach'],
    },
    {
      brand: 'Nissan',
      category: 'e-POWER All-Wheel Drive',
      name: 'Nissan X-Trail',
      icon: '🚙',
      model: 'Nissan X-Trail Ti-L e-POWER e-4ORCE',
      shortModel: 'Nissan X-Trail',
      shortLabel: '🚙 Nissan X-Trail',
      powertrain: '1.5L VC-Turbo e-POWER Dual Motor AWD (210 hp)',
      paintColor: '#b91c1c', // Caspian Blue / Red
      batteryFuel: (s) => `${Math.floor(52 + (s % 44))}% e-POWER Storage`,
      driverMode: 'e-4ORCE Electric Dual-Motor AWD',
      destinationList: ['North Sydney Pacific Highway', 'Williamstown Strand', 'Surfers Paradise Blvd', 'Scarborough Beach'],
    },
    {
      brand: 'GWM',
      category: 'Dual-Cab 4x4 Ute',
      name: 'GWM Cannon',
      icon: '🛻',
      model: 'GWM Ute Cannon-X 4x4 Dual Cab 2.0L Diesel',
      shortModel: 'GWM Cannon Ute',
      shortLabel: '🛻 GWM Cannon Ute',
      powertrain: '2.0L Turbo Diesel ZF 8-Speed (161 hp / 400 Nm)',
      paintColor: '#64748b', // Pittsburgh Silver
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Diesel Tank`,
      driverMode: 'BorgWarner Torque-on-Demand 4WD',
      destinationList: ['Liverpool Commercial Hub', 'Werribee Plaza Link', 'Ipswich Motorway Gate', 'Rockingham Foreshore'],
    },
    {
      brand: 'LDV',
      category: 'Heavy Bi-Turbo Ute',
      name: 'LDV T60',
      icon: '🛻',
      model: 'LDV T60 MAX LUXE 4x4 Bi-Turbo Diesel',
      shortModel: 'LDV T60 Ute',
      shortLabel: '🛻 LDV T60 Ute',
      powertrain: '2.0L Bi-Turbo Diesel (215 hp / 500 Nm)',
      paintColor: '#dc2626', // Lava Orange / Red
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Diesel Tank`,
      driverMode: 'BorgWarner 4WD High/Low Range',
      destinationList: ['Newcastle Industrial Port', 'Geelong Waterfront', 'Toowoomba Range Bypass', 'Bunbury Port Terminal'],
    },
    {
      brand: 'BYD',
      category: 'Electric Blade Battery SUV',
      name: 'BYD Atto 3',
      icon: '⚡',
      model: 'BYD Atto 3 Extended Range 60.48 kWh',
      shortModel: 'BYD Atto 3',
      shortLabel: '⚡ BYD Atto 3',
      powertrain: 'Blade Battery EV FWD (201 hp / 420 km)',
      paintColor: '#06b6d4', // Surf Blue
      batteryFuel: (s) => `${Math.floor(58 + (s % 38))}% Blade Battery`,
      driverMode: 'DiPilot Level 2 Autonomous Assist',
      destinationList: ['Macquarie Park Innovation', 'Southbank Arts Precinct', 'Milton Commercial Strip', 'East Perth Cove'],
    },
    {
      brand: 'Mazda',
      category: 'Aussie Dual-Cab Ute',
      name: 'Mazda BT-50',
      icon: '🛻',
      model: 'Mazda BT-50 SP Dual Cab 4x4 3.0L Turbo',
      shortModel: 'Mazda BT-50',
      shortLabel: '🛻 Mazda BT-50',
      powertrain: '3.0L Turbo Diesel 6-Speed (188 hp / 450 Nm)',
      paintColor: '#78716c', // Rock Grey Mica
      batteryFuel: (s) => `${Math.floor(52 + (s % 44))}% Diesel Tank`,
      driverMode: 'Terrain Control & Diff Lock Active',
      destinationList: ['Wollongong Steelworks Way', 'Ballarat Sturt Street', 'Mackay Harbour Road', 'Geraldton Marine Terrace'],
    },
    {
      brand: 'Holden',
      category: 'Aussie V8 Muscle Icon',
      name: 'Holden Commodore',
      icon: '🚗',
      model: 'Holden Commodore SS-V Redline 6.2L LS3 V8',
      shortModel: 'Holden Commodore',
      shortLabel: '🚗 Holden Commodore',
      powertrain: '6.2L Chevrolet LS3 V8 Naturally Aspirated (408 hp)',
      paintColor: '#b91c1c', // Spitfire Green / Redhot
      batteryFuel: (s) => `${Math.floor(42 + (s % 50))}% 98 Premium Fuel`,
      driverMode: 'Brembo Track Brakes & FE3 Ultra Sports',
      destinationList: ['Mount Panorama Bathurst', 'Calder Park Raceway', 'Lakeside Park Circuit', 'Barbagallo Wanneroo'],
    },
  ],

  // ==========================================
  // UAE / GCC (Desert Cruisers & Luxury Fleet)
  // ==========================================
  AE: [
    {
      brand: 'Toyota',
      category: 'Desert King SUV',
      name: 'Land Cruiser 300',
      icon: '🚙',
      model: 'Toyota Land Cruiser 3.5L Twin-Turbo GR Sport',
      shortModel: 'Land Cruiser 300',
      shortLabel: '🚙 Land Cruiser 300',
      powertrain: '3.5L V6 Twin-Turbo Petrol (409 hp / 650 Nm)',
      paintColor: '#f8fafc', // White Pearl Crystal
      batteryFuel: (s) => `${Math.floor(55 + (s % 42))}% Dual Fuel Tank (110L)`,
      driverMode: 'Multi-Terrain Select · Crawl Control',
      destinationList: ['Downtown Burj Khalifa', 'Sheikh Zayed Road', 'DIFC Gate District', 'Palm Jumeirah Boardwalk'],
    },
    {
      brand: 'Nissan',
      category: 'Gulf Icon V8 SUV',
      name: 'Nissan Patrol',
      icon: '🚙',
      model: 'Nissan Patrol Titanium 5.6L V8',
      shortModel: 'Nissan Patrol',
      shortLabel: '🚙 Nissan Patrol',
      powertrain: '5.6L Endurance V8 (400 hp / 560 Nm)',
      paintColor: '#ffffff', // Pearl White
      batteryFuel: (s) => `${Math.floor(50 + (s % 48))}% Fuel (140L Fuel Tank)`,
      driverMode: 'Hydraulic Body Motion Control Active',
      destinationList: ['Dubai Marina Promenade', 'Al Ain Desert Highway', 'Jumeirah Beach Road', 'Abu Dhabi Corniche'],
    },
    {
      brand: 'Lexus',
      category: 'Ultra-Luxury Flagship 4WD',
      name: 'Lexus LX 600',
      icon: '🚙',
      model: 'Lexus LX 600 VIP 4-Seat Executive',
      shortModel: 'Lexus LX 600',
      shortLabel: '🚙 Lexus LX 600',
      powertrain: '3.5L Twin-Turbo V6 (409 hp / 10-Speed)',
      paintColor: '#1e293b', // Sonic Titanium
      batteryFuel: (s) => `${Math.floor(60 + (s % 38))}% Fuel Tank`,
      driverMode: 'Active Height Control Suspension',
      destinationList: ['Emirates Palace Abu Dhabi', 'Burj Al Arab Helipad Way', 'Dubai International Airport VIP', 'Saadiyat Island'],
    },
    {
      brand: 'Mercedes-Benz',
      category: 'High-Output Luxury SUV',
      name: 'Mercedes G 63',
      icon: '🚙',
      model: 'Mercedes-AMG G 63 4.0L V8 Biturbo',
      shortModel: 'Mercedes G 63',
      shortLabel: '🚙 Mercedes G 63',
      powertrain: 'Handcrafted AMG 4.0L V8 Biturbo (577 hp)',
      paintColor: '#020617', // G Manufaktur Night Black
      batteryFuel: (s) => `${Math.floor(45 + (s % 50))}% Super Fuel`,
      driverMode: 'AMG Ride Control Triple Diff Locks',
      destinationList: ['City Walk Dubai', 'Meydan Racecourse', 'Yas Marina Circuit Abu Dhabi', 'JBR The Walk'],
    },
    {
      brand: 'Toyota',
      category: 'Dubai Taxi Fleet',
      name: 'Toyota Camry Taxi',
      icon: '🚗',
      model: 'Toyota Camry Hybrid Dubai Taxi Corp',
      shortModel: 'Toyota Camry',
      shortLabel: '🚕 Dubai Taxi',
      powertrain: '2.5L Dynamic Force Hybrid e-CVT',
      paintColor: '#eab308', // Dubai Taxi Cream & Red Roof
      batteryFuel: (s) => `${Math.floor(58 + (s % 38))}% Hybrid Fuel`,
      driverMode: 'RTA Automated Meter & Dispatch',
      destinationList: ['Dubai Mall Ground Transit', 'Deira Gold Souk', 'Sharjah Al Wahda St', 'Al Barsha Mall'],
    },
    {
      brand: 'Toyota',
      category: 'Rugged Desert Cruiser',
      name: 'Toyota Prado',
      icon: '🚙',
      model: 'Toyota Land Cruiser Prado 2.4L Turbo First Edition',
      shortModel: 'Toyota Prado',
      shortLabel: '🚙 Toyota Prado',
      powertrain: '2.4L T24A-FTS Turbo Petrol (281 hp / 430 Nm)',
      paintColor: '#d97706', // Trail Dust Sand
      batteryFuel: (s) => `${Math.floor(52 + (s % 44))}% Fuel Tank (110L)`,
      driverMode: 'Multi-Terrain Select Sand & Dune Mode',
      destinationList: ['Al Qudra Lakes Desert', 'Hatta Mountain Dam', 'Liwa Oasis Dunes', 'Fujairah Coastal Highway'],
    },
    {
      brand: 'Porsche',
      category: 'Performance Luxury SUV',
      name: 'Porsche Cayenne',
      icon: '🚙',
      model: 'Porsche Cayenne GTS 4.0L Twin-Turbo V8',
      shortModel: 'Porsche Cayenne',
      shortLabel: '🚙 Porsche Cayenne',
      powertrain: '4.0L Twin-Turbo V8 (500 hp / 660 Nm)',
      paintColor: '#dc2626', // Carmine Red
      batteryFuel: (s) => `${Math.floor(46 + (s % 50))}% Super 98 Fuel`,
      driverMode: 'Porsche Traction Management Active',
      destinationList: ['Dubai Opera Plaza', 'Bluewaters Island Ain Dubai', 'Al Maryah Island Abu Dhabi', 'Kite Beach Road'],
    },
    {
      brand: 'Land Rover',
      category: 'Royalty VIP Flagship',
      name: 'Range Rover',
      icon: '🚙',
      model: 'Range Rover Autobiography P530 V8 LWB',
      shortModel: 'Range Rover',
      shortLabel: '🚙 Range Rover',
      powertrain: '4.4L Twin-Turbo V8 (530 hp / All-Wheel Steer)',
      paintColor: '#1e293b', // Batumi Gold / Santorini Black
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Fuel Tank`,
      driverMode: 'Executive Class Comfort Air Suspension',
      destinationList: ['Emirates Towers Gate', 'Atlantis The Royal Palm', 'Louvre Abu Dhabi Way', 'Zabeel Palace Approach'],
    },
    {
      brand: 'Rolls-Royce',
      category: 'Pinnacle Ultra-Luxury',
      name: 'Rolls-Royce Cullinan',
      icon: '👑',
      model: 'Rolls-Royce Cullinan Black Badge 6.75L V12',
      shortModel: 'RR Cullinan',
      shortLabel: '👑 RR Cullinan',
      powertrain: '6.75L Twin-Turbo V12 (600 hp / 900 Nm)',
      paintColor: '#020617', // Diamond Black Magic
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Special High-Octane`,
      driverMode: 'Magic Carpet Ride Satellite-Aided Drive',
      destinationList: ['Burj Khalifa Armani Hotel', 'Bvlgari Resort Jumeirah Bay', 'Al Meydan Hotel Helipad', 'Qasr Al Watan Gate'],
    },
    {
      brand: 'Bentley',
      category: 'British Handcrafted SUV',
      name: 'Bentley Bentayga',
      icon: '🚙',
      model: 'Bentley Bentayga Azure 4.0L V8 Twin-Turbo',
      shortModel: 'Bentley Bentayga',
      shortLabel: '🚙 Bentley Bentayga',
      powertrain: '4.0L Twin-Turbo V8 (542 hp / 770 Nm)',
      paintColor: '#065f46', // British Racing Green Metallic
      batteryFuel: (s) => `${Math.floor(52 + (s % 42))}% Fuel Tank`,
      driverMode: 'Bentley Dynamic Ride 48V Anti-Roll',
      destinationList: ['Four Seasons Resort Jumeirah', 'One&Only The Palm', 'St. Regis Saadiyat Island', 'Dubai Hills Club'],
    },
    {
      brand: 'Tesla',
      category: 'Tri-Motor Falcon Wing EV',
      name: 'Tesla Model X',
      icon: '⚡',
      model: 'Tesla Model X Plaid Tri-Motor (1,020 hp)',
      shortModel: 'Tesla Model X',
      shortLabel: '⚡ Tesla Model X',
      powertrain: 'Tri-Motor AWD Electric (1,020 hp / 0-100 in 2.6s)',
      paintColor: '#38bdf8', // Deep Blue Metallic
      batteryFuel: (s) => `${Math.floor(62 + (s % 35))}% Battery (100 kWh)`,
      driverMode: 'Full Self-Driving Supervised',
      destinationList: ['Dubai Future Museum', 'Dubai Internet City Plaza', 'Sharjah Research Technology Park', 'Masdar City Eco-Hub'],
    },
    {
      brand: 'Mitsubishi',
      category: 'Desert Workhorse 4WD',
      name: 'Mitsubishi Pajero',
      icon: '🚙',
      model: 'Mitsubishi Pajero Signature Edition 3.8L V6 4WD',
      shortModel: 'Mitsubishi Pajero',
      shortLabel: '🚙 Mitsubishi Pajero',
      powertrain: '3.8L MIVEC V6 (250 hp / Super Select 4WD II)',
      paintColor: '#f8fafc', // Warm White Two-Tone
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel (88L Tank)`,
      driverMode: 'Super Select 4WD II Center Diff Lock',
      destinationList: ['Al Rigga Road Deira', 'Sharjah Corniche', 'Ajman Marina Walk', 'Ras Al Khaimah Corniche'],
    },
    {
      brand: 'Chevrolet',
      category: 'American Full-Size V8',
      name: 'Chevy Tahoe',
      icon: '🚙',
      model: 'Chevrolet Tahoe RST 6.2L EcoTec3 V8 4WD',
      shortModel: 'Chevy Tahoe',
      shortLabel: '🚙 Chevy Tahoe',
      powertrain: '6.2L EcoTec3 V8 (420 hp / 10-Speed)',
      paintColor: '#334155', // Shadow Gray Metallic
      batteryFuel: (s) => `${Math.floor(45 + (s % 50))}% Fuel Tank (98L)`,
      driverMode: 'Magnetic Ride Control High-Speed Assist',
      destinationList: ['Mirdif City Centre', 'Al Khawaneej Walk', 'Khalifa City Abu Dhabi', 'Muhaisnah Commercial'],
    },
    {
      brand: 'GMC',
      category: 'VIP Luxury American 4WD',
      name: 'GMC Yukon Denali',
      icon: '🚙',
      model: 'GMC Yukon Denali Ultimate 6.2L V8 4WD',
      shortModel: 'GMC Yukon Denali',
      shortLabel: '🚙 GMC Yukon Denali',
      powertrain: '6.2L V8 EcoTec3 (420 hp / 460 lb-ft)',
      paintColor: '#172554', // Hunter Metallic Dark Blue
      batteryFuel: (s) => `${Math.floor(46 + (s % 50))}% Fuel Tank (98L)`,
      driverMode: 'Air Ride Adaptive Suspension',
      destinationList: ['Jumeirah Golf Estates', 'Dubai Polo Club', 'Al Bateen Executive Airport', 'Yas Island Ferrari World'],
    },
    {
      brand: 'Ford',
      category: 'Full-Size Desert Cruiser',
      name: 'Ford Expedition',
      icon: '🚙',
      model: 'Ford Expedition Stealth Performance 3.5L V6',
      shortModel: 'Ford Expedition',
      shortLabel: '🚙 Ford Expedition',
      powertrain: '3.5L EcoBoost High-Output V6 (440 hp / 510 lb-ft)',
      paintColor: '#475569', // Dark Matter Metallic
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'Terrain Management System (Sand/Deep Snow)',
      destinationList: ['Sharjah University City', 'Al Zahia City Centre', 'Al Ain Zoo Approach', 'Al Ruwais Highway'],
    },
    {
      brand: 'BMW',
      category: 'Bavarian Flagship 7-Seater',
      name: 'BMW X7',
      icon: '🚙',
      model: 'BMW X7 M60i xDrive 4.4L TwinPower V8',
      shortModel: 'BMW X7',
      shortLabel: '🚙 BMW X7',
      powertrain: '4.4L TwinPower Turbo V8 48V Mild Hybrid (530 hp)',
      paintColor: '#00a2ff', // Marina Bay Blue
      batteryFuel: (s) => `${Math.floor(52 + (s % 44))}% Fuel Tank`,
      driverMode: 'Executive Drive Pro Active Roll Stabilisation',
      destinationList: ['DIFC Gate Village', 'Dubai Festival City', 'Al Reem Island Abu Dhabi', 'Yas Bay Waterfront'],
    },
    {
      brand: 'Audi',
      category: 'High-Performance Coupe SUV',
      name: 'Audi RS Q8',
      icon: '🚙',
      model: 'Audi RS Q8 4.0L TFSI Twin-Turbo quattro',
      shortModel: 'Audi RS Q8',
      shortLabel: '🚙 Audi RS Q8',
      powertrain: '4.0L V8 Twin-Turbo TFSI quattro (600 hp / 800 Nm)',
      paintColor: '#eab308', // Dragon Orange Metallic
      batteryFuel: (s) => `${Math.floor(44 + (s % 50))}% Super 98 Fuel`,
      driverMode: 'quattro Sport Differential & All-Wheel Steering',
      destinationList: ['Dubai Autodrome', 'Al Wasl Road Jumeirah', 'Palm Tower View', 'Al Raha Beach Abu Dhabi'],
    },
    {
      brand: 'Hyundai',
      category: 'Modern Family Crossover',
      name: 'Hyundai Santa Fe',
      icon: '🚙',
      model: 'Hyundai Santa Fe Calligraphy 2.5T AWD',
      shortModel: 'Hyundai Santa Fe',
      shortLabel: '🚙 Hyundai Santa Fe',
      powertrain: '2.5L Smartstream Turbo GDI (281 hp)',
      paintColor: '#64748b', // Terracotta Orange / Grey
      batteryFuel: (s) => `${Math.floor(50 + (s % 46))}% Fuel Tank`,
      driverMode: 'Highway Driving Assist II Active',
      destinationList: ['Dragon Mart International City', 'Al Nahda Sharjah Border', 'Silicon Oasis Tech Park', 'Oud Metha Plaza'],
    },
    {
      brand: 'Nissan',
      category: 'Everyday Fleet Sedan',
      name: 'Nissan Sunny',
      icon: '🚗',
      model: 'Nissan Sunny SV 1.6L Everyday Fleet Sedan',
      shortModel: 'Nissan Sunny',
      shortLabel: '🚗 Nissan Sunny',
      powertrain: '1.6L DOHC 4-Cylinder (118 hp / 19.3 km/l)',
      paintColor: '#94a3b8', // Brilliant Silver
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Fuel Tank`,
      driverMode: 'Nissan Intelligent Mobility City Cruise',
      destinationList: ['Al Karama Shopping Strip', 'Al Qusais Industrial', 'Bur Dubai Textile Souk', 'Sharjah Industrial 4'],
    },
    {
      brand: 'Lamborghini',
      category: 'Super Sport SUV',
      name: 'Lamborghini Urus',
      icon: '🏎️',
      model: 'Lamborghini Urus Performante 4.0L V8 (666 hp)',
      shortModel: 'Lamborghini Urus',
      shortLabel: '🏎️ Lamborghini Urus',
      powertrain: '4.0L Twin-Turbo V8 (666 hp / 0-100 in 3.3s)',
      paintColor: '#eab308', // Giallo Auge Yellow
      batteryFuel: (s) => `${Math.floor(40 + (s % 55))}% Super Plus 98`,
      driverMode: 'ANIMA Drive Selector (SABBIA / CORSA)',
      destinationList: ['Dubai Marina Yacht Club', 'Coya Four Seasons Jumeirah', 'Zuma DIFC Valet Gate', 'Yas Viceroy Marina Gate'],
    },
  ],

  // ==========================================
  // GLOBAL FALLBACK (Top 20 International Fleet)
  // ==========================================
  GLOBAL: [
    {
      brand: 'Toyota',
      category: 'Global Best-Selling Sedan',
      name: 'Toyota Corolla',
      icon: '🚗',
      model: 'Toyota Corolla 1.8L Hybrid Sedan',
      shortModel: 'Toyota Corolla',
      shortLabel: '🚗 Toyota Corolla',
      powertrain: '1.8L Hybrid Synergy Drive (138 hp)',
      paintColor: '#94a3b8', // Silver Metallic
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Fuel Tank`,
      driverMode: 'Standard Cruise Control Active',
      destinationList: ['Central Station Plaza', 'City Hall Square', 'Airport Terminal Link', 'Commercial Gateway'],
    },
    {
      brand: 'Toyota',
      category: 'Global Best-Selling SUV',
      name: 'Toyota RAV4',
      icon: '🚙',
      model: 'Toyota RAV4 2.5L Hybrid AWD',
      shortModel: 'Toyota RAV4',
      shortLabel: '🚙 Toyota RAV4',
      powertrain: '2.5L Dynamic Force Hybrid AWD (219 hp)',
      paintColor: '#2563eb', // Magnetic Blue
      batteryFuel: (s) => `${Math.floor(52 + (s % 44))}% Hybrid Fuel`,
      driverMode: 'Toyota Safety Sense Adaptive',
      destinationList: ['Metropolitan Ring Road', 'Suburban Galleria', 'Medical Center Gateway', 'University Quad'],
    },
    {
      brand: 'Honda',
      category: 'International Compact',
      name: 'Honda Civic',
      icon: '🚗',
      model: 'Honda Civic 2.0L e:HEV Sedan',
      shortModel: 'Honda Civic',
      shortLabel: '🚗 Honda Civic',
      powertrain: '2.0L Two-Motor e:HEV Hybrid (181 hp)',
      paintColor: '#dc2626', // Rallye Red
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'Honda Sensing Lane Tracing',
      destinationList: ['Financial District Loop', 'Harbor Boulevard', 'City General Hospital', 'Civic Arts Center'],
    },
    {
      brand: 'Honda',
      category: 'International Crossover',
      name: 'Honda CR-V',
      icon: '🚙',
      model: 'Honda CR-V 2.0L Hybrid AWD',
      shortModel: 'Honda CR-V',
      shortLabel: '🚙 Honda CR-V',
      powertrain: '2.0L e:HEV Dual-Motor (204 hp)',
      paintColor: '#0284c7', // Lunar Silver / Blue
      batteryFuel: (s) => `${Math.floor(54 + (s % 42))}% Fuel Tank`,
      driverMode: 'Traffic Jam Assist Active',
      destinationList: ['Northside Parkway', 'Convention Center Square', 'Expressway Interchange', 'Tech Corridor'],
    },
    {
      brand: 'Volkswagen',
      category: 'European Compact Standard',
      name: 'VW Golf',
      icon: '🚗',
      model: 'Volkswagen Golf 1.5 TSI Turbo Hatchback',
      shortModel: 'VW Golf',
      shortLabel: '🚗 VW Golf',
      powertrain: '1.5L TSI evo2 Petrol (130 hp)',
      paintColor: '#1e293b', // Deep Black Pearl
      batteryFuel: (s) => `${Math.floor(52 + (s % 42))}% Fuel Tank`,
      driverMode: 'Adaptive Cruise Control',
      destinationList: ['Grand Boulevard', 'Finance Center East', 'Railway Junction', 'City Perimeter Road'],
    },
    {
      brand: 'Hyundai',
      category: 'Global Crossover SUV',
      name: 'Hyundai Tucson',
      icon: '🚙',
      model: 'Hyundai Tucson 2.0L Smartstream SUV',
      shortModel: 'Hyundai Tucson',
      shortLabel: '🚙 Hyundai Tucson',
      powertrain: '2.0L MPI Petrol / Hybrid (156 hp)',
      paintColor: '#475569', // Titan Grey
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'Smart Drive Mode Adaptive',
      destinationList: ['Metro Medical Quad', 'Suburban Mall', 'University Campus Gate', 'Downtown Promenade'],
    },
    {
      brand: 'Kia',
      category: 'Global Family Crossover',
      name: 'Kia Sportage',
      icon: '🚙',
      model: 'Kia Sportage 1.6 T-GDi Crossover',
      shortModel: 'Kia Sportage',
      shortLabel: '🚙 Kia Sportage',
      powertrain: '1.6L Turbo Petrol Smartstream (150 hp)',
      paintColor: '#2563eb', // Splash Lemon / Blue
      batteryFuel: (s) => `${Math.floor(50 + (s % 45))}% Fuel Tank`,
      driverMode: 'Drive Mode Select Active',
      destinationList: ['Suburban Shopping District', 'South Coastal Highway', 'Airport Boulevard', 'Industrial Park'],
    },
    {
      brand: 'Toyota',
      category: 'Global Workhorse Pickup',
      name: 'Toyota Hilux',
      icon: '🛻',
      model: 'Toyota Hilux 2.4 D-4D 4x4 Pickup',
      shortModel: 'Toyota Hilux',
      shortLabel: '🛻 Toyota Hilux',
      powertrain: '2.4L D-4D Turbo Diesel (150 hp / 400 Nm)',
      paintColor: '#f8fafc', // Polar White
      batteryFuel: (s) => `${Math.floor(55 + (s % 40))}% Diesel Tank`,
      driverMode: 'Heavy Duty 4WD Active',
      destinationList: ['Regional Highway Interchange', 'Industrial Logistics Park', 'Harbor Dock Area', 'North Sector Crossing'],
    },
    {
      brand: 'Nissan',
      category: 'Global Fleet Sedan',
      name: 'Nissan Sentra',
      icon: '🚗',
      model: 'Nissan Sentra 2.0L DOHC Sedan',
      shortModel: 'Nissan Sentra',
      shortLabel: '🚗 Nissan Sentra',
      powertrain: '2.0L DOHC 16-Valve 4-Cyl (149 hp)',
      paintColor: '#64748b', // Gun Metallic
      batteryFuel: (s) => `${Math.floor(50 + (s % 46))}% Fuel Tank`,
      driverMode: 'Nissan Safety Shield 360',
      destinationList: ['Civic Center Transit', 'Commercial Wharf Area', 'Suburban Station', 'East Ring Expressway'],
    },
    {
      brand: 'Tesla',
      category: 'Global Electric Sedan',
      name: 'Tesla Model 3',
      icon: '⚡',
      model: 'Tesla Model 3 Long Range AWD',
      shortModel: 'Tesla Model 3',
      shortLabel: '⚡ Tesla Model 3',
      powertrain: 'Dual Motor AWD Electric (394 hp)',
      paintColor: '#e82127', // Red Multi-Coat
      batteryFuel: (s) => `${Math.floor(58 + (s % 38))}% Battery (EV)`,
      driverMode: 'Autopilot Supervised Navigation',
      destinationList: ['Innovation Park Gate', 'Supercharger Station Hub', 'Harbor Business Bay', 'Skyline Plaza'],
    },
    {
      brand: 'Tesla',
      category: 'Global Electric SUV',
      name: 'Tesla Model Y',
      icon: '⚡',
      model: 'Tesla Model Y Long Range AWD',
      shortModel: 'Tesla Model Y',
      shortLabel: '⚡ Tesla Model Y',
      powertrain: 'Dual Motor AWD Electric (384 hp)',
      paintColor: '#00f0ff', // Solid Black / Quicksilver
      batteryFuel: (s) => `${Math.floor(56 + (s % 40))}% Battery (EV)`,
      driverMode: 'Autopilot City Streets Navigation',
      destinationList: ['International Airport Terminal', 'Tech Center Entrance', 'Downtown Financial District', 'Executive Towers'],
    },
    {
      brand: 'Ford',
      category: 'Global Mid-Size Pickup',
      name: 'Ford Ranger',
      icon: '🛻',
      model: 'Ford Ranger 2.0 Bi-Turbo Double Cab',
      shortModel: 'Ford Ranger',
      shortLabel: '🛻 Ford Ranger',
      powertrain: '2.0L EcoBlue Bi-Turbo Diesel (207 hp / 500 Nm)',
      paintColor: '#ea580c', // Sedona Orange
      batteryFuel: (s) => `${Math.floor(52 + (s % 44))}% Diesel Tank`,
      driverMode: 'Selectable 4WD System',
      destinationList: ['Regional Highway North', 'Construction Site 9', 'State Park Gateway', 'Logistics Terminal'],
    },
    {
      brand: 'Suzuki',
      category: 'Global Compact Hatch',
      name: 'Suzuki Swift',
      icon: '🚗',
      model: 'Suzuki Swift 1.2 DualJet Compact',
      shortModel: 'Suzuki Swift',
      shortLabel: '🚗 Suzuki Swift',
      powertrain: '1.2L DualJet Mild Hybrid 12V (82 hp)',
      paintColor: '#dc2626', // Burning Red
      batteryFuel: (s) => `${Math.floor(52 + (s % 45))}% Fuel Tank (22+ km/l)`,
      driverMode: 'City Commuter Agility Assist',
      destinationList: ['Downtown Market Street', 'Metro Railway Square', 'Suburban High Street', 'Community College'],
    },
    {
      brand: 'Renault',
      category: 'European Compact Hatchback',
      name: 'Renault Clio',
      icon: '🚗',
      model: 'Renault Clio E-Tech Full Hybrid 145',
      shortModel: 'Renault Clio',
      shortLabel: '🚗 Renault Clio',
      powertrain: '1.6L E-Tech Full Hybrid (143 hp / Multi-Mode)',
      paintColor: '#f97316', // Valencia Orange
      batteryFuel: (s) => `${Math.floor(50 + (s % 46))}% Hybrid Fuel`,
      driverMode: 'Pure EV / Hybrid Auto Switching',
      destinationList: ['Central Avenue Loop', 'Old Town Boulevard', 'Riverfront Promenade', 'North Station'],
    },
    {
      brand: 'Peugeot',
      category: 'European Style Hatchback',
      name: 'Peugeot 208',
      icon: '🚗',
      model: 'Peugeot 208 1.2 PureTech 100',
      shortModel: 'Peugeot 208',
      shortLabel: '🚗 Peugeot 208',
      powertrain: '1.2L PureTech 3-Cylinder Turbo (100 hp)',
      paintColor: '#eab308', // Agueda Yellow
      batteryFuel: (s) => `${Math.floor(48 + (s % 48))}% Fuel Tank`,
      driverMode: 'i-Cockpit Compact Steering',
      destinationList: ['Art Gallery Boulevard', 'University South Gate', 'Shopping Mall Plaza', 'Harbour Vista'],
    },
    {
      brand: 'Mazda',
      category: 'Global Compact Sedan',
      name: 'Mazda 3',
      icon: '🚗',
      model: 'Mazda 3 2.0 e-Skyactiv G Sedan',
      shortModel: 'Mazda 3',
      shortLabel: '🚗 Mazda 3',
      powertrain: '2.0L e-Skyactiv G M Hybrid (122 hp)',
      paintColor: '#991b1b', // Soul Red Crystal
      batteryFuel: (s) => `${Math.floor(52 + (s % 44))}% Fuel Tank`,
      driverMode: 'i-ACTIVSENSE Safety Assist',
      destinationList: ['West Avenue Commercial', 'Seaside Highway Loop', 'Central Business Hub', 'Railway Terminal'],
    },
    {
      brand: 'BYD',
      category: 'Global Electric Sedan',
      name: 'BYD Seal',
      icon: '⚡',
      model: 'BYD Seal 82.5 kWh Electric Sedan',
      shortModel: 'BYD Seal',
      shortLabel: '⚡ BYD Seal',
      powertrain: 'Dual Motor AWD Blade EV (523 hp / 570 km)',
      paintColor: '#06b6d4', // Atlantis Grey
      batteryFuel: (s) => `${Math.floor(58 + (s % 38))}% Blade Battery (EV)`,
      driverMode: 'DiPilot Intelligent Driving Assist',
      destinationList: ['International Airport Express', 'Financial Square', 'Tech Quad Entrance', 'Skyline Boulevard'],
    },
    {
      brand: 'BMW',
      category: 'Global Sports Saloon',
      name: 'BMW 3 Series',
      icon: '🚗',
      model: 'BMW 320i Sedan M Sport',
      shortModel: 'BMW 3 Series',
      shortLabel: '🚗 BMW 3 Series',
      powertrain: '2.0L TwinPower Turbo Petrol (184 hp)',
      paintColor: '#00a2ff', // Portimao Blue
      batteryFuel: (s) => `${Math.floor(50 + (s % 46))}% Fuel Tank`,
      driverMode: 'Driving Assistant Professional',
      destinationList: ['Corporate HQ Plaza', 'Interstate Interchange', 'Grand Theatre Approach', 'Executive Ring'],
    },
    {
      brand: 'Mercedes-Benz',
      category: 'Global Executive Saloon',
      name: 'Mercedes C-Class',
      icon: '🚗',
      model: 'Mercedes-Benz C 200 Saloon AMG Line',
      shortModel: 'Mercedes C-Class',
      shortLabel: '🚗 Mercedes C-Class',
      powertrain: '1.5L Turbo Mild Hybrid EQ Boost (204 hp)',
      paintColor: '#0f172a', // Obsidian Black
      batteryFuel: (s) => `${Math.floor(52 + (s % 44))}% Fuel Tank`,
      driverMode: 'Active Distance Assist DISTRONIC',
      destinationList: ['Embassy Boulevard', 'Marina Bay Promenade', 'Central Banking District', 'Convention Hotel'],
    },
    {
      brand: 'Subaru',
      category: 'Global AWD Touring Wagon',
      name: 'Subaru Outback',
      icon: '🚙',
      model: 'Subaru Outback 2.5i AWD Touring',
      shortModel: 'Subaru Outback',
      shortLabel: '🚙 Subaru Outback',
      powertrain: '2.5L Horizontally-Opposed Boxer (182 hp)',
      paintColor: '#15803d', // Brilliant Bronze / Green
      batteryFuel: (s) => `${Math.floor(50 + (s % 46))}% Fuel Tank`,
      driverMode: 'Symmetrical All-Wheel Drive & EyeSight',
      destinationList: ['National Park Access Route', 'Highland Scenic Way', 'Lakeside Recreational Loop', 'Regional Depot'],
    },
  ],
};

/**
 * Fast, offline geographic country classifier from [lat, lon] geodetic coordinates.
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @returns {string} Country code ('IN' | 'US' | 'GB' | 'DE' | 'JP' | 'AU' | 'AE' | 'GLOBAL')
 */
export function detectCountry(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return 'GLOBAL';

  // 1. INDIA (Lat: 6.5 to 37.5, Lon: 68.0 to 97.5)
  if (lat >= 6.5 && lat <= 37.5 && lon >= 68.0 && lon <= 97.5) {
    // Exclude Sri Lanka (Lat < 10.0, Lon 79.6 to 82.2)
    if (lat < 10.0 && lon >= 79.6 && lon <= 82.2) return 'GLOBAL';

    // Exclude Bangladesh:
    // South of 24.5°N (near Kolkata/Sundarbans), Bangladesh border is east of 88.85°E.
    // North of 24.5°N (near Dinajpur/Rangpur), Bangladesh border is east of 88.10°E.
    // Northernmost tip of Bangladesh is 26.65°N.
    const inBangladesh = (
      lat >= 20.5 && lat <= 26.65 && (
        (lat < 24.5 && lon >= 88.85 && lon <= 92.6) ||
        (lat >= 24.5 && lon >= 88.10 && lon <= 92.6)
      )
    );
    if (inBangladesh) return 'GLOBAL';

    // Exclude Nepal:
    // West of 85.0°E (Gorakhpur, Ayodhya, Bareilly), southern Nepal border is north of 27.4°N.
    // East of 85.0°E, southern Nepal border is north of 26.65°N.
    const inNepal = (
      lat >= 26.5 && lat <= 30.5 && lon >= 80.0 && lon <= 88.2 && (
        (lon < 85.0 && lat >= 27.4) ||
        (lon >= 85.0 && lat >= 26.65)
      )
    );
    if (inNepal) return 'GLOBAL';

    // Exclude Pakistan West
    if (lat >= 24.0 && lon < 68.1) return 'GLOBAL';
    if (lat >= 27.5 && lon < 70.2) return 'GLOBAL';
    if (lat >= 30.0 && lon < 73.8) return 'GLOBAL';
    // Wagah / Attari border: Amritsar is 74.87, Lahore is 74.34. Wagah border is 74.57.
    if (lat >= 31.2 && lon < 74.52) return 'GLOBAL';
    if (lat >= 32.5 && lon < 74.5) return 'GLOBAL';

    return 'IN';
  }

  // 2. UNITED STATES (Contiguous US, Alaska, Hawaii) & CANADA
  if (
    (lat >= 24.5 && lat <= 49.5 && lon >= -125.0 && lon <= -66.9) ||
    (lat >= 51.0 && lat <= 71.5 && lon >= -170.0 && lon <= -130.0) ||
    (lat >= 18.5 && lat <= 22.5 && lon >= -161.0 && lon <= -154.0) ||
    (lat >= 49.0 && lat <= 70.0 && lon >= -141.0 && lon <= -52.0) // Canada shares NA fleet
  ) {
    return 'US';
  }

  // 3. UNITED KINGDOM (Great Britain & Northern Ireland)
  if (lat >= 49.8 && lat <= 60.9 && lon >= -8.6 && lon <= 1.8) {
    return 'GB';
  }

  // 4. GERMANY
  if (lat >= 47.2 && lat <= 55.1 && lon >= 5.8 && lon <= 15.1) {
    return 'DE';
  }

  // 5. JAPAN
  if (lat >= 24.0 && lat <= 45.6 && lon >= 122.9 && lon <= 153.0) {
    return 'JP';
  }

  // 6. AUSTRALIA
  if (lat >= -44.0 && lat <= -10.0 && lon >= 112.0 && lon <= 154.0) {
    return 'AU';
  }

  // 7. UAE / MIDDLE EAST (Dubai, Abu Dhabi, Sharjah)
  if (lat >= 22.5 && lat <= 26.5 && lon >= 51.0 && lon <= 56.5) {
    return 'AE';
  }

  return 'GLOBAL';
}

/**
 * Get the fleet template list for a country code.
 */
export function getCountryFleet(countryCode) {
  return COUNTRY_FLEETS[countryCode] || COUNTRY_FLEETS.GLOBAL;
}

/**
 * Generate authentic regional vehicle registration plates.
 */
export function generateRegionalPlate(countryCode, seed) {
  const pseudo = (Math.abs(Math.sin(seed * 12.9898 + 78.233)) % 1);

  if (countryCode === 'IN') {
    const states = ['MH', 'DL', 'KA', 'GJ', 'TN', 'HR', 'UP', 'KL', 'WB', 'TS', 'RJ', 'PB'];
    const state = states[Math.floor(pseudo * states.length)];
    const rto = String(Math.floor(1 + ((seed * 13) % 45))).padStart(2, '0');
    const letters = ['AB', 'CD', 'EF', 'GH', 'JK', 'MN', 'PQ', 'RS', 'EV', 'AX'][Math.floor(((seed * 7) % 10))];
    const num = Math.floor(1000 + ((seed * 37) % 8999));
    return `${state} ${rto} ${letters} ${num}`;
  }

  if (countryCode === 'US') {
    const states = ['CA', 'NY', 'TX', 'FL', 'WA', 'IL', 'CO', 'GA', 'MI', 'AZ'];
    const state = states[Math.floor(pseudo * states.length)];
    const num = Math.floor(1000 + ((seed * 41) % 8999));
    return `${state} · ${num}`;
  }

  if (countryCode === 'GB') {
    const prefixes = ['LG', 'BD', 'WN', 'KV', 'RE', 'SH', 'OV', 'EA'];
    const prefix = prefixes[Math.floor(pseudo * prefixes.length)];
    const year = ['21', '22', '23', '24', '73', '74'][Math.floor(((seed * 3) % 6))];
    const suffixes = ['XTR', 'KVM', 'PXL', 'WNZ', 'BTH', 'ZRA'];
    const suffix = suffixes[Math.floor(((seed * 5) % suffixes.length))];
    return `${prefix}${year} ${suffix}`;
  }

  if (countryCode === 'DE') {
    const cities = ['B', 'M', 'S', 'HH', 'F', 'K', 'N', 'D'];
    const city = cities[Math.floor(pseudo * cities.length)];
    const letters = ['DE', 'MW', 'GO', 'GT', 'TS', 'EV'][Math.floor(((seed * 5) % 6))];
    const num = Math.floor(100 + ((seed * 19) % 899));
    return `${city}-${letters} ${num}`;
  }

  if (countryCode === 'JP') {
    const prefectures = ['品川', '練馬', '横浜', 'なにわ', '名古屋', '福岡', '札幌'];
    const pref = prefectures[Math.floor(pseudo * prefectures.length)];
    const num = Math.floor(10 + ((seed * 17) % 89));
    const sub = Math.floor(10 + ((seed * 23) % 89));
    return `${pref} 300 ほ ${num}-${sub}`;
  }

  if (countryCode === 'AE') {
    const emirates = ['DXB', 'AUH', 'SHJ'];
    const em = emirates[Math.floor(pseudo * emirates.length)];
    const code = ['A', 'B', 'C', 'D', 'E', 'F'][Math.floor(((seed * 5) % 6))];
    const num = Math.floor(1000 + ((seed * 31) % 8999));
    return `${em} · ${code} ${num}`;
  }

  if (countryCode === 'AU') {
    const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA'];
    const state = states[Math.floor(pseudo * states.length)];
    const num = Math.floor(100 + ((seed * 17) % 899));
    return `${state} · ${num} AB`;
  }

  // Global default
  const num = Math.floor(1000 + ((seed * 29) % 8999));
  return `INT · ${num}`;
}

/**
 * Get country display name.
 */
export function getCountryName(countryCode) {
  return COUNTRY_NAMES[countryCode] || 'International';
}
