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

    it('accurately excludes neighboring countries outside India', () => {
      expect(detectCountry(31.5497, 74.3436)).toBe('GLOBAL'); // Lahore, Pakistan
      expect(detectCountry(24.8607, 67.0011)).toBe('GLOBAL'); // Karachi, Pakistan
      expect(detectCountry(27.7172, 85.3240)).toBe('GLOBAL'); // Kathmandu, Nepal
      expect(detectCountry(23.8103, 90.4125)).toBe('GLOBAL'); // Dhaka, Bangladesh
      expect(detectCountry(6.9271, 79.8612)).toBe('GLOBAL');  // Colombo, Sri Lanka
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

    it('accurately identifies other major countries', () => {
      expect(detectCountry(51.5074, -0.1278)).toBe('GB');    // London, UK
      expect(detectCountry(55.9533, -3.1883)).toBe('GB');    // Edinburgh, UK
      expect(detectCountry(52.5200, 13.4050)).toBe('DE');    // Berlin, Germany
      expect(detectCountry(48.1351, 11.5820)).toBe('DE');    // Munich, Germany
      expect(detectCountry(35.6762, 139.6503)).toBe('JP');   // Tokyo, Japan
      expect(detectCountry(34.6937, 135.5023)).toBe('JP');   // Osaka, Japan
      expect(detectCountry(-33.8688, 151.2093)).toBe('AU');  // Sydney, Australia
      expect(detectCountry(-37.8136, 144.9631)).toBe('AU');  // Melbourne, Australia
      expect(detectCountry(25.2048, 55.2708)).toBe('AE');    // Dubai, UAE
      expect(detectCountry(24.4539, 54.3773)).toBe('AE');    // Abu Dhabi, UAE
    });
  });

  describe('COUNTRY_FLEETS structure', () => {
    const supportedCountries = ['IN', 'US', 'GB', 'DE', 'JP', 'AU', 'AE', 'GLOBAL'];

    supportedCountries.forEach((country) => {
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
  });

  describe('getCountryFleet and getCountryName', () => {
    it('verifies COUNTRY_NAMES dictionary values', () => {
      expect(COUNTRY_NAMES.IN).toBe('India');
      expect(COUNTRY_NAMES.US).toBe('United States');
      expect(COUNTRY_NAMES.GLOBAL).toBe('International');
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
      expect(getCountryName('UNKNOWN')).toBe('International');
    });
  });
});
