// Unified world country vehicle fleets & regional helpers

import { ASIA_FLEETS } from './asia.js';
import { EUROPE_FLEETS } from './europe.js';
import { AMERICAS_FLEETS } from './americas.js';
import { MEA_FLEETS } from './middleEastAfrica.js';
import { OCEANIA_FLEETS } from './oceania.js';
import { REGIONAL_FLEETS } from './regional.js';
import { detectCountry } from './geoDetect.js';
import { generateRegionalPlate, INDIAN_RTO_REGISTRY } from './plates.js';

export { detectCountry, generateRegionalPlate, INDIAN_RTO_REGISTRY };

/**
 * Combined country fleets dictionary.
 * Maps country code to 20 researched real-world authentic vehicles.
 */
export const COUNTRY_FLEETS = {
  ...ASIA_FLEETS,
  ...EUROPE_FLEETS,
  ...AMERICAS_FLEETS,
  ...MEA_FLEETS,
  ...OCEANIA_FLEETS,
  ...REGIONAL_FLEETS,
};

/**
 * Human-readable country and regional names.
 */
export const COUNTRY_NAMES = {
  // Asia
  IN: 'India',
  CN: 'China',
  JP: 'Japan',
  KR: 'South Korea',
  ID: 'Indonesia',
  TH: 'Thailand',
  VN: 'Vietnam',
  PK: 'Pakistan',
  MY: 'Malaysia',
  PH: 'Philippines',

  // Europe
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  SE: 'Sweden',
  NO: 'Norway',
  PL: 'Poland',
  TR: 'Turkey',
  RU: 'Russia',
  CH: 'Switzerland',

  // Americas
  US: 'United States',
  CA: 'Canada',
  MX: 'Mexico',
  BR: 'Brazil',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',

  // Middle East & Africa
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  EG: 'Egypt',
  ZA: 'South Africa',
  NG: 'Nigeria',
  KE: 'Kenya',

  // Oceania
  AU: 'Australia',
  NZ: 'New Zealand',

  // Regional Fallbacks
  GLOBAL: 'International',
  EU_REGIONAL: 'Europe (Regional)',
  AS_REGIONAL: 'Asia (Regional)',
  LATAM_REGIONAL: 'Latin America (Regional)',
  AFRICA_REGIONAL: 'Africa (Regional)',
  ME_REGIONAL: 'Middle East (Regional)',
};

/**
 * Get the fleet template list for a country code.
 */
export function getCountryFleet(countryCode) {
  return COUNTRY_FLEETS[countryCode] || COUNTRY_FLEETS.GLOBAL;
}

/**
 * Get country display name.
 */
export function getCountryName(countryCode) {
  return COUNTRY_NAMES[countryCode] || 'International';
}
