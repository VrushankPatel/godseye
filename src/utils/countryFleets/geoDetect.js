// High-precision geodetic country detection with regional fallbacks

/**
 * Detect country code from coordinates.
 * Covers 37+ specific countries with fine boundary boxes and exclusions,
 * plus intermediate continental fallback fleets (EU, AS, LATAM, AFRICA, ME).
 */
export function detectCountry(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return 'GLOBAL';

  // ----------------------------------------------------
  // 1. ASIA (Specific Countries)
  // ----------------------------------------------------
  // India (Lat: 6.5 to 37.5, Lon: 68.0 to 97.5)
  if (lat >= 6.5 && lat <= 37.5 && lon >= 68.0 && lon <= 97.5) {
    // Exclude Sri Lanka
    if (lat < 10.0 && lon >= 79.6 && lon <= 82.2) return 'AS_REGIONAL';

    // Exclude Bangladesh
    const inBangladesh = (
      lat >= 20.5 && lat <= 26.65 && (
        (lat < 24.5 && lon >= 88.85 && lon <= 92.6) ||
        (lat >= 24.5 && lon >= 88.10 && lon <= 92.6)
      )
    );
    if (inBangladesh) return 'AS_REGIONAL';

    // Exclude Nepal
    const inNepal = (
      lat >= 26.5 && lat <= 30.5 && lon >= 80.0 && lon <= 88.2 && (
        (lon < 85.0 && lat >= 27.4) ||
        (lon >= 85.0 && lat >= 26.65)
      )
    );
    if (inNepal) return 'AS_REGIONAL';

    // Exclude Pakistan West
    if (lat >= 24.0 && lon < 68.1) return 'PK';
    if (lat >= 27.5 && lon < 70.2) return 'PK';
    if (lat >= 30.0 && lon < 73.8) return 'PK';
    // Wagah / Attari border: Amritsar is 74.87, Lahore is 74.34. Wagah border is 74.57.
    if (lat >= 31.2 && lon < 74.52) return 'PK';
    if (lat >= 32.5 && lon < 74.5) return 'PK';

    return 'IN';
  }

  // Pakistan (outside India bounding box)
  if (lat >= 23.5 && lat <= 37.0 && lon >= 60.5 && lon <= 77.0) {
    return 'PK';
  }

  // South Korea (checked before Japan to avoid longitude overlap)
  if (lat >= 33.0 && lat <= 38.8 && lon >= 124.5 && lon <= 130.0) {
    return 'KR';
  }
  // Japan
  if (lat >= 24.0 && lat <= 45.8 && lon >= 122.5 && lon <= 153.5) {
    return 'JP';
  }
  // Vietnam
  if (lat >= 8.5 && lat <= 23.4 && lon >= 102.1 && lon <= 109.5) {
    return 'VN';
  }
  // Thailand
  if (lat >= 5.6 && lat <= 20.5 && lon >= 97.3 && lon <= 105.7) {
    return 'TH';
  }
  // Malaysia
  if ((lat >= 1.0 && lat <= 7.5 && lon >= 99.5 && lon <= 104.5) ||
      (lat >= 0.8 && lat <= 7.5 && lon >= 109.5 && lon <= 119.5)) {
    return 'MY';
  }
  // Indonesia
  if (lat >= -11.0 && lat <= 6.0 && lon >= 95.0 && lon <= 141.0) {
    return 'ID';
  }
  // Philippines
  if (lat >= 4.5 && lat <= 21.5 && lon >= 116.5 && lon <= 127.0) {
    return 'PH';
  }
  // China
  if (lat >= 18.0 && lat <= 53.5 && lon >= 73.5 && lon <= 135.0) {
    return 'CN';
  }

  // ----------------------------------------------------
  // 2. EUROPE (Specific Countries)
  // ----------------------------------------------------
  // United Kingdom
  if (lat >= 49.8 && lat <= 60.9 && lon >= -8.5 && lon <= 1.8) {
    return 'GB';
  }
  // Netherlands
  if (lat >= 50.7 && lat <= 53.6 && lon >= 3.3 && lon <= 7.3) {
    return 'NL';
  }
  // Switzerland
  if (lat >= 45.8 && lat <= 47.8 && lon >= 5.9 && lon <= 10.5) {
    return 'CH';
  }
  // Germany
  if (lat >= 47.2 && lat <= 55.1 && lon >= 5.8 && lon <= 15.1) {
    return 'DE';
  }
  // France
  if (lat >= 41.3 && lat <= 51.1 && lon >= -5.2 && lon <= 9.6) {
    return 'FR';
  }
  // Italy
  if (lat >= 36.5 && lat <= 47.1 && lon >= 6.6 && lon <= 18.6) {
    return 'IT';
  }
  // Spain
  if (lat >= 35.9 && lat <= 43.8 && lon >= -9.3 && lon <= 3.4) {
    return 'ES';
  }
  // Sweden (Stockholm, Gothenburg, Malmö, Uppsala)
  if (lat >= 55.3 && lat <= 69.1 && lon >= 11.0 && lon <= 24.2 && (lat >= 64.0 || lon > 12.8)) {
    return 'SE';
  }
  // Norway (Oslo, Bergen, Trondheim, Tromsø)
  if (lat >= 57.9 && lat <= 71.2 && lon >= 4.5 && lon <= 31.1 && (lat >= 64.0 || lon <= 12.8)) {
    return 'NO';
  }
  // Poland
  if (lat >= 49.0 && lat <= 54.9 && lon >= 14.1 && lon <= 24.2) {
    return 'PL';
  }
  // Turkey
  if (lat >= 35.8 && lat <= 42.1 && lon >= 25.6 && lon <= 44.8) {
    return 'TR';
  }
  // Russia (European and Siberian main highway corridors)
  if (lat >= 41.2 && lat <= 75.0 && lon >= 27.0 && lon <= 180.0) {
    return 'RU';
  }

  // ----------------------------------------------------
  // 3. MIDDLE EAST & AFRICA (Specific Countries)
  // ----------------------------------------------------
  // UAE
  if (lat >= 22.5 && lat <= 26.5 && lon >= 51.0 && lon <= 56.5) {
    return 'AE';
  }
  // Saudi Arabia (excluding Kuwait, Qatar, Bahrain)
  if (lat >= 16.0 && lat <= 32.2 && lon >= 34.5 && lon <= 55.7) {
    // Kuwait
    if (lat >= 28.5 && lat <= 30.1 && lon >= 46.5 && lon <= 48.5) return 'ME_REGIONAL';
    // Qatar
    if (lat >= 24.5 && lat <= 26.2 && lon >= 50.7 && lon <= 51.7) return 'ME_REGIONAL';
    // Bahrain
    if (lat >= 25.8 && lat <= 26.4 && lon >= 50.4 && lon <= 50.7) return 'ME_REGIONAL';
    return 'SA';
  }
  // Egypt
  if (lat >= 21.9 && lat <= 31.7 && lon >= 24.7 && lon <= 36.9) {
    return 'EG';
  }
  // South Africa
  if (lat >= -34.9 && lat <= -22.1 && lon >= 16.4 && lon <= 32.9) {
    return 'ZA';
  }
  // Nigeria
  if (lat >= 4.2 && lat <= 13.9 && lon >= 2.6 && lon <= 14.7) {
    return 'NG';
  }
  // Kenya
  if (lat >= -4.7 && lat <= 5.1 && lon >= 33.9 && lon <= 41.9) {
    return 'KE';
  }

  // ----------------------------------------------------
  // 4. AMERICAS (Specific Countries)
  // ----------------------------------------------------
  // Mexico
  if (lat >= 14.5 && lat <= 32.7 && lon >= -118.4 && lon <= -86.7) {
    return 'MX';
  }
  // Colombia
  if (lat >= -4.3 && lat <= 12.5 && lon >= -79.0 && lon <= -66.8) {
    return 'CO';
  }
  // Chile
  if (lat >= -56.0 && lat <= -17.5 && lon >= -75.7 && lon <= -66.9) {
    return 'CL';
  }
  // Argentina
  if (lat >= -55.1 && lat <= -21.8 && lon >= -73.6 && lon <= -53.6) {
    return 'AR';
  }
  // Brazil
  if (lat >= -33.8 && lat <= 5.3 && lon >= -73.9 && lon <= -34.8) {
    return 'BR';
  }

  // Canada (North of 49°N, plus Southern Ontario & Quebec down to 41.7°N)
  const inCanada = (
    (lat >= 49.0 && lat <= 83.0 && lon >= -141.0 && lon <= -52.6) ||
    // Southern Ontario / Quebec corridor
    (lat >= 41.8 && lat < 49.0 && lon >= -83.5 && lon <= -70.0 && (
      (lon <= -79.0 && lat >= 42.2) || // SW Ontario / Toronto (lon -79.38, lat 43.65)
      (lat >= 45.0 && lon >= -76.0 && lon <= -70.0) // Ottawa / Montreal corridor (lon -73.57, lat 45.50)
    ))
  );
  if (inCanada) {
    return 'CA';
  }

  // United States (Contiguous US, Alaska, Hawaii)
  if ((lat >= 24.5 && lat <= 49.5 && lon >= -125.0 && lon <= -66.9) ||
      (lat >= 51.0 && lat <= 72.0 && lon >= -170.0 && lon <= -130.0) ||
      (lat >= 18.0 && lat <= 23.0 && lon >= -161.0 && lon <= -154.0)) {
    return 'US';
  }

  // ----------------------------------------------------
  // 5. OCEANIA (Specific Countries)
  // ----------------------------------------------------
  // New Zealand
  if (lat >= -47.3 && lat <= -34.4 && lon >= 166.4 && lon <= 178.6) {
    return 'NZ';
  }
  // Australia
  if (lat >= -44.0 && lat <= -10.0 && lon >= 113.0 && lon <= 154.0) {
    return 'AU';
  }

  // ----------------------------------------------------
  // 6. CONTINENTAL REGIONAL FALLBACKS
  // (Prevents improper foreign cars anywhere on Earth)
  // ----------------------------------------------------
  // Broader Europe
  if (lat >= 35.0 && lat <= 72.0 && lon >= -25.0 && lon <= 45.0) {
    return 'EU_REGIONAL';
  }
  // Broader Middle East
  if (lat >= 12.0 && lat <= 42.0 && lon >= 34.0 && lon <= 63.0) {
    return 'ME_REGIONAL';
  }
  // Broader Africa
  if (lat >= -36.0 && lat <= 38.0 && lon >= -18.0 && lon <= 52.0) {
    return 'AFRICA_REGIONAL';
  }
  // Broader East / South / Southeast Asia
  if (lat >= -12.0 && lat <= 55.0 && lon >= 60.0 && lon <= 150.0) {
    return 'AS_REGIONAL';
  }
  // Broader Latin America & Caribbean
  if (lat >= -56.0 && lat <= 33.0 && lon >= -118.0 && lon <= -34.0) {
    return 'LATAM_REGIONAL';
  }

  return 'GLOBAL';
}
