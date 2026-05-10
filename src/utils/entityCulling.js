/**
 * Entity viewport culling utilities for performance optimization
 * Only renders entities visible in the current camera view
 */

export function isEntityInFrustum(entity, camera) {
    if (!camera || !entity) return true;

    try {
        const pos = entity.position;
        if (!pos) return false;

        const cartesian = pos.getValue(camera.clock.currentTime);
        if (!cartesian) return false;

        return camera.frustumContainsPoint(cartesian);
    } catch {
        return true;
    }
}

export function cullEntitiesByFrustum(entities, camera, maxRender = 12000) {
    if (!Array.isArray(entities)) return [];
    if (!camera) return entities.slice(0, maxRender);

    const visible = [];
    let _skipped = 0;

    for (const entity of entities) {
        if (visible.length >= maxRender) {
            _skipped += 1;
            continue;
        }

        if (isEntityInFrustum(entity, camera)) {
            visible.push(entity);
        } else {
            _skipped += 1;
        }
    }

    return visible;
}

export function paginateEntities(entities, pageSize = 1000, page = 0) {
    if (!Array.isArray(entities)) return { items: [], total: 0, page: 0, pageSize, totalPages: 0, hasNext: false, hasPrev: false };
    
    const start = page * pageSize;
    const end = start + pageSize;
    
    return {
        items: entities.slice(start, end),
        total: entities.length,
        page,
        pageSize,
        totalPages: Math.ceil(entities.length / pageSize),
        hasNext: end < entities.length,
        hasPrev: page > 0,
    };
}

export function filterEntitiesByBounds(entities, bounds) {
    if (!Array.isArray(entities)) return [];
    if (!bounds) return entities;

    const { minLat, maxLat, minLon, maxLon } = bounds;

    return entities.filter(entity => {
        const lat = entity.latitude;
        const lon = entity.longitude;
        
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
        
        return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
    });
}

export function sortEntitiesByDistance(entities, referencePoint) {
    if (!Array.isArray(entities) || !referencePoint) return entities;

    const { latitude: refLat, longitude: refLon } = referencePoint;

    return [...entities].sort((a, b) => {
        const distA = haversineDistance(refLat, refLon, a.latitude, a.longitude);
        const distB = haversineDistance(refLat, refLon, b.latitude, b.longitude);
        return distA - distB;
    });
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRadians(deg) {
    return deg * Math.PI / 180;
}