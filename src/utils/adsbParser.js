/**
 * ADS-B payload parsing utilities
 */

const FEET_TO_METERS = 0.3048;
const KNOTS_TO_MPS = 0.514444;

export function parseAdsbPayload(payload, provider) {
    if (!payload || !Array.isArray(payload.ac)) return [];

    return payload.ac
        .map((ac) => parseAircraftRecord(ac, provider))
        .filter(Boolean);
}

export function parseAircraftRecord(ac, provider) {
    const longitude = typeof ac.lon === 'number' ? ac.lon : Number(ac.lon);
    const latitude = typeof ac.lat === 'number' ? ac.lat : Number(ac.lat);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

    const baroFeet = typeof ac.alt_baro === 'number' ? ac.alt_baro : null;
    const geomFeet = typeof ac.alt_geom === 'number' ? ac.alt_geom : null;
    const altitudeM = Number.isFinite(baroFeet)
        ? baroFeet * FEET_TO_METERS
        : Number.isFinite(geomFeet)
            ? geomFeet * FEET_TO_METERS
            : 10000;

    const onGround = ac.alt_baro === 'ground' || (Number.isFinite(geomFeet) && geomFeet < 120);
    if (onGround) return null;

    const speedKnots = typeof ac.gs === 'number' ? ac.gs : Number(ac.gs);
    const headingDeg = typeof ac.track === 'number' ? ac.track : Number(ac.track);
    const callsign = String(ac.flight || ac.hex || 'UNKNOWN').trim();
    const operator = ac.ownOp || ac.desc || 'Unknown';

    return {
        id: String(ac.hex || `${longitude}:${latitude}`).toLowerCase(),
        callsign,
        operator,
        origin: operator,
        registration: ac.r || 'N/A',
        aircraftType: ac.t || ac.desc || 'N/A',
        categoryCode: ac.category || 'N/A',
        provider,
        longitude,
        latitude,
        baroAltitude: Number.isFinite(baroFeet) ? baroFeet : null,
        geomAltitude: Number.isFinite(geomFeet) ? geomFeet : null,
        altitudeM,
        speedKnots: Number.isFinite(speedKnots) ? speedKnots : null,
        speedMps: Number.isFinite(speedKnots) ? speedKnots * KNOTS_TO_MPS : null,
        headingDeg: Number.isFinite(headingDeg) ? headingDeg : null,
        verticalSpeedFpm: Number.isFinite(ac.vs) ? ac.vs : null,
        onGround,
        lastSeen: Number.isFinite(ac.ts) ? ac.ts * 1000 : Date.now(),
    };
}

export function convertAltitude(feet) {
    if (!Number.isFinite(feet)) return null;
    return feet * FEET_TO_METERS;
}

export function convertSpeed(knots) {
    if (!Number.isFinite(knots)) return null;
    return knots * KNOTS_TO_MPS;
}