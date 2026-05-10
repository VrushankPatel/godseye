/**
 * Geographic utility functions
 */

const EARTH_RADIUS_M = 6371000;

export function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

export function toDegrees(radians) {
    return radians * 180 / Math.PI;
}

export function normalizeLongitude(lon) {
    let value = lon;
    while (value > 180) value -= 360;
    while (value < -180) value += 360;
    return value;
}

export function projectPosition(longitude, latitude, headingDeg, speedMps, dtSeconds) {
    if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(headingDeg) ||
        !Number.isFinite(speedMps) ||
        speedMps <= 0
    ) {
        return { longitude, latitude };
    }

    const angularDistance = (speedMps * dtSeconds) / EARTH_RADIUS_M;
    const heading = toRadians(headingDeg);
    const lat1 = toRadians(latitude);
    const lon1 = toRadians(longitude);

    const sinLat1 = Math.sin(lat1);
    const cosLat1 = Math.cos(lat1);
    const sinAngular = Math.sin(angularDistance);
    const cosAngular = Math.cos(angularDistance);

    const lat2 = Math.asin(
        sinLat1 * cosAngular + cosLat1 * sinAngular * Math.cos(heading)
    );

    const lon2 = lon1 + Math.atan2(
        Math.sin(heading) * sinAngular * cosLat1,
        cosAngular - sinLat1 * Math.sin(lat2)
    );

    return {
        longitude: normalizeLongitude(toDegrees(lon2)),
        latitude: Math.max(-89.9, Math.min(89.9, toDegrees(lat2))),
    };
}

export function calculateDistanceM(lat1, lon1, lat2, lon2) {
    const R = EARTH_RADIUS_M;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function formatCoordinate(value, isLatitude) {
    const direction = isLatitude
        ? value >= 0 ? 'N' : 'S'
        : value >= 0 ? 'E' : 'W';
    return `${Math.abs(value).toFixed(4)}° ${direction}`;
}