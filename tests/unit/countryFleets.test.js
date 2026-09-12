import { describe, it, expect } from 'vitest';
import {
  COUNTRY_FLEETS,
  COUNTRY_NAMES,
  detectCountry,
  getCountryFleet,
  generateRegionalPlate,
  getCountryName,
} from '../../src/utils/countryFleets.js';

describe('countryFleets', () => {
  describe('detectCountry', () => {
    it('accurately identifies Indian cities as IN', () => {
      expect(detectCountry(19.0760, 72.8777)).toBe('IN'); // Mumbai
      expect(detectCountry(28.6139, 77.2090)).toBe('IN'); // Delhi
      expect(detectCountry(12.9716, 77.5946)).toBe('IN'); // Bengaluru
      expect(detectCountry(23.0225, 72.5714)).toBe('IN'); // Ahmedabad
      expect(detectCountry(22.5726, 88.3639)).toBe('IN'); // Kolkata
      expect(detectCountry(13.0827, 80.2707)).toBe('IN'); // Chennai
      expect(detectCountry(17.3850, 78.4867)).toBe('IN'); // Hyderabad
      expect(detectCountry(18.5204, 73.8567)).toBe('IN'); // Pune
      expect(detectCountry(26.7606, 83.3732)).toBe('IN'); // Gorakhpur
      expect(detectCountry(31.6340, 74.8723)).toBe('IN'); // Amritsar
      expect(detectCountry(9.9312, 76.2673)).toBe('IN');  // Kochi
    });

    it('accurately excludes neighboring countries outside India and identifies PK', () => {
      expect(detectCountry(31.5497, 74.3436)).toBe('PK'); // Lahore, Pakistan
      expect(detectCountry(24.8607, 67.0011)).toBe('PK'); // Karachi, Pakistan
      expect(detectCountry(33.6844, 73.0479)).toBe('PK'); // Islamabad, Pakistan
      expect(detectCountry(27.7172, 85.3240)).not.toBe('IN'); // Kathmandu, Nepal
      expect(detectCountry(23.8103, 90.4125)).not.toBe('IN'); // Dhaka, Bangladesh
      expect(detectCountry(6.9271, 79.8612)).not.toBe('IN');  // Colombo, Sri Lanka
    });

    it('accurately identifies US cities as US', () => {
      expect(detectCountry(40.7128, -74.0060)).toBe('US');   // New York
      expect(detectCountry(34.0522, -118.2437)).toBe('US');  // Los Angeles
      expect(detectCountry(41.8781, -87.6298)).toBe('US');   // Chicago
      expect(detectCountry(25.7617, -80.1918)).toBe('US');   // Miami
      expect(detectCountry(47.6062, -122.3321)).toBe('US');  // Seattle
      expect(detectCountry(21.3069, -157.8583)).toBe('US');  // Honolulu, Hawaii
      expect(detectCountry(61.2181, -149.9003)).toBe('US');  // Anchorage, Alaska
    });

    it('accurately identifies other major countries across continents', () => {
      // Europe
      expect(detectCountry(51.5074, -0.1278)).toBe('GB');    // London, UK
      expect(detectCountry(55.9533, -3.1883)).toBe('GB');    // Edinburgh, UK
      expect(detectCountry(52.5200, 13.4050)).toBe('DE');    // Berlin, Germany
      expect(detectCountry(48.1351, 11.5820)).toBe('DE');    // Munich, Germany
      expect(detectCountry(48.8566, 2.3522)).toBe('FR');     // Paris, France
      expect(detectCountry(41.9028, 12.4964)).toBe('IT');    // Rome, Italy
      expect(detectCountry(40.4168, -3.7038)).toBe('ES');    // Madrid, Spain
      expect(detectCountry(52.3676, 4.9041)).toBe('NL');     // Amsterdam, Netherlands
      expect(detectCountry(59.3293, 18.0686)).toBe('SE');    // Stockholm, Sweden
      expect(detectCountry(59.9139, 10.7522)).toBe('NO');    // Oslo, Norway
      expect(detectCountry(52.2297, 21.0122)).toBe('PL');    // Warsaw, Poland
      expect(detectCountry(41.0082, 28.9784)).toBe('TR');    // Istanbul, Turkey
      expect(detectCountry(55.7558, 37.6173)).toBe('RU');    // Moscow, Russia
      expect(detectCountry(47.3769, 8.5417)).toBe('CH');     // Zurich, Switzerland

      // Asia
      expect(detectCountry(39.9042, 116.4074)).toBe('CN');   // Beijing, China
      expect(detectCountry(31.2304, 121.4737)).toBe('CN');   // Shanghai, China
      expect(detectCountry(35.6762, 139.6503)).toBe('JP');   // Tokyo, Japan
      expect(detectCountry(34.6937, 135.5023)).toBe('JP');   // Osaka, Japan
      expect(detectCountry(37.5665, 126.9780)).toBe('KR');   // Seoul, South Korea
      expect(detectCountry(-6.2088, 106.8456)).toBe('ID');   // Jakarta, Indonesia
      expect(detectCountry(13.7563, 100.5018)).toBe('TH');   // Bangkok, Thailand
      expect(detectCountry(21.0285, 105.8542)).toBe('VN');   // Hanoi, Vietnam
      expect(detectCountry(3.1390, 101.6869)).toBe('MY');    // Kuala Lumpur, Malaysia
      expect(detectCountry(14.5995, 120.9842)).toBe('PH');   // Manila, Philippines

      // Americas
      expect(detectCountry(43.6532, -79.3832)).toBe('CA');   // Toronto, Canada
      expect(detectCountry(45.5017, -73.5673)).toBe('CA');   // Montreal, Canada
      expect(detectCountry(19.4326, -99.1332)).toBe('MX');   // Mexico City, Mexico
      expect(detectCountry(-23.5505, -46.6333)).toBe('BR');  // Sao Paulo, Brazil
      expect(detectCountry(-34.6037, -58.3816)).toBe('AR');  // Buenos Aires, Argentina
      expect(detectCountry(-33.4489, -70.6693)).toBe('CL');  // Santiago, Chile
      expect(detectCountry(4.7110, -74.0721)).toBe('CO');    // Bogota, Colombia

      // Middle East & Africa
      expect(detectCountry(25.2048, 55.2708)).toBe('AE');    // Dubai, UAE
      expect(detectCountry(24.7136, 46.6753)).toBe('SA');    // Riyadh, Saudi Arabia
      expect(detectCountry(30.0444, 31.2357)).toBe('EG');    // Cairo, Egypt
      expect(detectCountry(-26.2041, 28.0473)).toBe('ZA');   // Johannesburg, South Africa
      expect(detectCountry(6.5244, 3.3792)).toBe('NG');      // Lagos, Nigeria
      expect(detectCountry(-1.2921, 36.8219)).toBe('KE');    // Nairobi, Kenya

      // Oceania
      expect(detectCountry(-33.8688, 151.2093)).toBe('AU');  // Sydney, Australia
      expect(detectCountry(-37.8136, 144.9631)).toBe('AU');  // Melbourne, Australia
      expect(detectCountry(-36.8485, 174.7633)).toBe('NZ');  // Auckland, New Zealand
    });

    it('falls back gracefully to continental regions for coordinates without specific country', () => {
      // Vienna, Austria -> EU_REGIONAL
      expect(detectCountry(48.2082, 16.3738)).toBe('EU_REGIONAL');
      // Kuwait City -> ME_REGIONAL
      expect(detectCountry(29.3759, 47.9774)).toBe('ME_REGIONAL');
      // Accra, Ghana -> AFRICA_REGIONAL
      expect(detectCountry(5.6037, -0.1870)).toBe('AFRICA_REGIONAL');
      // Lima, Peru -> LATAM_REGIONAL
      expect(detectCountry(-12.0464, -77.0428)).toBe('LATAM_REGIONAL');
    });
  });

  describe('COUNTRY_FLEETS structure', () => {
    const allExpectedFleets = [
      // Asia
      'IN', 'CN', 'JP', 'KR', 'ID', 'TH', 'VN', 'PK', 'MY', 'PH',
      // Europe
      'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'PL', 'TR', 'RU', 'CH',
      // Americas
      'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO',
      // Middle East & Africa
      'AE', 'SA', 'EG', 'ZA', 'NG', 'KE',
      // Oceania
      'AU', 'NZ',
      // Regional Fallbacks
      'GLOBAL', 'EU_REGIONAL', 'AS_REGIONAL', 'LATAM_REGIONAL', 'AFRICA_REGIONAL', 'ME_REGIONAL',
    ];

    allExpectedFleets.forEach((country) => {
      it(`fleet for ${country} contains exactly 20 vehicles with complete metadata`, () => {
        const fleet = COUNTRY_FLEETS[country];
        expect(fleet).toBeDefined();
        expect(fleet.length).toBe(20);

        fleet.forEach((car) => {
          expect(car.brand).toBeTruthy();
          expect(car.model).toBeTruthy();
          expect(car.shortModel).toBeTruthy();
          expect(car.shortLabel).toBeTruthy();
          expect(car.category).toBeTruthy();
          expect(car.powertrain).toBeTruthy();
          expect(car.paintColor).toMatch(/^#[0-9a-fA-F]{6}$/);
          expect(Array.isArray(car.destinationList)).toBe(true);
          expect(car.destinationList.length).toBeGreaterThanOrEqual(3);
        });
      });
    });

    it('Indian fleet specifically contains iconic Indian brands and no American pickups', () => {
      const inFleet = COUNTRY_FLEETS.IN;
      const brands = inFleet.map((c) => c.brand);

      expect(brands).toContain('Maruti Suzuki');
      expect(brands).toContain('Tata Motors');
      expect(brands).toContain('Mahindra');
      expect(brands).toContain('Hyundai');
      expect(brands).toContain('Toyota');
      expect(brands).toContain('Bajaj Auto');

      // Iconic Indian models must exist
      const models = inFleet.map((c) => c.shortModel);
      expect(models).toContain('Maruti Swift');
      expect(models).toContain('Tata Nexon');
      expect(models).toContain('Scorpio-N');
      expect(models).toContain('Innova Crysta');
      expect(models).toContain('Bajaj Auto');
      expect(models).toContain('Mahindra Thar');

      // Foreign trucks not sold in India must NEVER appear
      expect(inFleet.some((c) => c.model.includes('F-150'))).toBe(false);
      expect(inFleet.some((c) => c.model.includes('Silverado'))).toBe(false);
      expect(inFleet.some((c) => c.model.includes('Cybertruck'))).toBe(false);
    });

    it('French fleet contains authentic French vehicles and no full-size American pickups', () => {
      const frFleet = COUNTRY_FLEETS.FR;
      const brands = frFleet.map((c) => c.brand);

      expect(brands).toContain('Renault');
      expect(brands).toContain('Peugeot');
      expect(brands).toContain('Citroën');
      expect(brands).toContain('Dacia');
      expect(brands).toContain('Alpine');

      expect(frFleet.some((c) => c.model.includes('F-150'))).toBe(false);
      expect(frFleet.some((c) => c.model.includes('Silverado'))).toBe(false);
      expect(frFleet.some((c) => c.model.includes('Cybertruck'))).toBe(false);
    });

    it('Japanese fleet contains authentic Japanese Kei cars and no full-size American pickups', () => {
      const jpFleet = COUNTRY_FLEETS.JP;
      const brands = jpFleet.map((c) => c.brand);

      expect(brands).toContain('Toyota');
      expect(brands).toContain('Honda');
      expect(brands).toContain('Nissan');

      expect(jpFleet.some((c) => c.model.includes('F-150'))).toBe(false);
      expect(jpFleet.some((c) => c.model.includes('Silverado'))).toBe(false);
      expect(jpFleet.some((c) => c.model.includes('Cybertruck'))).toBe(false);
    });

    it('US fleet contains iconic American trucks and EVs', () => {
      const usFleet = COUNTRY_FLEETS.US;
      const models = usFleet.map((c) => c.shortModel);

      expect(models).toContain('Ford F-150');
      expect(models).toContain('Chevy Silverado');
      expect(models).toContain('RAM 1500');
      expect(models).toContain('Tesla Model Y');
      expect(models).toContain('Cybertruck');
    });
  });

  describe('generateRegionalPlate', () => {
    it('generates authentic Indian license plates', () => {
      for (let s = 1; s <= 20; s++) {
        const plate = generateRegionalPlate('IN', s);
        expect(plate).toMatch(/^[A-Z]{2} \d{2} [A-Z]{2} \d{4}$/);
      }
    });

    it('generates authentic US license plates', () => {
      for (let s = 1; s <= 20; s++) {
        const plate = generateRegionalPlate('US', s);
        expect(plate).toMatch(/^[A-Z]{2} · \d{4}$/);
      }
    });

    it('generates authentic UK license plates', () => {
      for (let s = 1; s <= 20; s++) {
        const plate = generateRegionalPlate('GB', s);
        expect(plate).toMatch(/^[A-Z]{2}\d{2} [A-Z]{3}$/);
      }
    });

    it('generates authentic German license plates', () => {
      for (let s = 1; s <= 20; s++) {
        const plate = generateRegionalPlate('DE', s);
        expect(plate).toMatch(/^[A-Z]{1,2}-[A-Z]{2} \d{3}$/);
      }
    });

    it('generates authentic French license plates', () => {
      for (let s = 1; s <= 20; s++) {
        const plate = generateRegionalPlate('FR', s);
        expect(plate).toMatch(/^[A-Z]{2}-\d{3}-[A-Z]{2}$/);
      }
    });

    it('generates authentic Brazilian Mercosul plates', () => {
      for (let s = 1; s <= 20; s++) {
        const plate = generateRegionalPlate('BR', s);
        expect(plate).toMatch(/^[A-Z]{3}\d[A-Z]\d{2}$/);
      }
    });
  });

  describe('getCountryFleet and getCountryName', () => {
    it('verifies COUNTRY_NAMES dictionary values', () => {
      expect(COUNTRY_NAMES.IN).toBe('India');
      expect(COUNTRY_NAMES.US).toBe('United States');
      expect(COUNTRY_NAMES.GLOBAL).toBe('International');
      expect(COUNTRY_NAMES.FR).toBe('France');
      expect(COUNTRY_NAMES.BR).toBe('Brazil');
      expect(COUNTRY_NAMES.CN).toBe('China');
      expect(COUNTRY_NAMES.ZA).toBe('South Africa');
    });

    it('returns the correct fleet and fallback to global', () => {
      expect(getCountryFleet('IN')).toBe(COUNTRY_FLEETS.IN);
      expect(getCountryFleet('US')).toBe(COUNTRY_FLEETS.US);
      expect(getCountryFleet('NON_EXISTENT')).toBe(COUNTRY_FLEETS.GLOBAL);
    });

    it('returns the correct country display names', () => {
      expect(getCountryName('IN')).toBe('India');
      expect(getCountryName('US')).toBe('United States');
      expect(getCountryName('GB')).toBe('United Kingdom');
      expect(getCountryName('DE')).toBe('Germany');
      expect(getCountryName('JP')).toBe('Japan');
      expect(getCountryName('AU')).toBe('Australia');
      expect(getCountryName('AE')).toBe('United Arab Emirates');
      expect(getCountryName('FR')).toBe('France');
      expect(getCountryName('BR')).toBe('Brazil');
      expect(getCountryName('UNKNOWN')).toBe('International');
    });
  });
});
