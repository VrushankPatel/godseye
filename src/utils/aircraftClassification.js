/**
 * Aircraft flight classification utilities
 */

export const MILITARY_CALLSIGN_PREFIXES = [
    'RCH', 'CMB', 'KING', 'DUKE', 'NAVY', 'SPAR', 'NATO', 'QID', 'MMF', 'BAF', 'CNV',
];

export const CARGO_CALLSIGN_PREFIXES = [
    'FDX', 'UPS', 'DHL', 'CKS', 'GTI', 'ABX', 'CLX', 'BOX', 'NCR', 'BCS', 'FX',
];

export const MILITARY_TYPE_PREFIXES = [
    'C17', 'C130', 'KC', 'E3', 'P8', 'A400', 'C5', 'F15', 'F16', 'F18', 'B52', 'B1',
];

export const CARGO_TYPE_HINTS = ['744F', '748F', '77F', '76F', '73F', 'A332F', 'A30F'];

export function normalizeCallsign(raw) {
    return String(raw || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');
}

export function classifyFlight({ callsign, operator, aircraftType, categoryCode }) {
    const normalizedCallsign = normalizeCallsign(callsign);
    const operatorText = String(operator || '').toUpperCase();
    const typeText = String(aircraftType || '').toUpperCase();

    const isMilitary =
        MILITARY_CALLSIGN_PREFIXES.some((prefix) => normalizedCallsign.startsWith(prefix)) ||
        MILITARY_TYPE_PREFIXES.some((prefix) => typeText.startsWith(prefix)) ||
        /(AIR FORCE|AIRFORCE|MILITARY|NAVY|ARMY|MARINES|DEFENCE|DEFENSE|USAF|RAF)/.test(operatorText);

    if (isMilitary) return 'military';

    const isCargo =
        CARGO_CALLSIGN_PREFIXES.some((prefix) => normalizedCallsign.startsWith(prefix)) ||
        CARGO_TYPE_HINTS.some((hint) => typeText.includes(hint)) ||
        /(CARGO|FREIGHT|EXPRESS|LOGISTICS|PARCEL)/.test(operatorText);

    if (isCargo) return 'cargo';

    const looksPassenger = /^[A-Z]{2,3}\d/.test(normalizedCallsign) ||
        /(AIRLINES|AIRWAYS|JET|AIR\s)/.test(operatorText);

    if (looksPassenger) return 'passenger';

    if (categoryCode === 'A1' || categoryCode === 'A2') return 'private';

    if (!normalizedCallsign && !operatorText) return 'unknown';

    return 'private';
}

export function isMilitaryFlight(flight) {
    return classifyFlight(flight) === 'military';
}

export function isCargoFlight(flight) {
    return classifyFlight(flight) === 'cargo';
}

export function isPassengerFlight(flight) {
    return classifyFlight(flight) === 'passenger';
}

export function isPrivateFlight(flight) {
    return classifyFlight(flight) === 'private';
}