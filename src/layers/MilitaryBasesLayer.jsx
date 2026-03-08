import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS } from '../constants/dataSources';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const MAX_BASES = 8000;
const MAX_OSM_BASES = 6200;

const REGION_LABELS = {
    africa_east: 'AFRICA (EAST)',
    africa_north: 'AFRICA (NORTH)',
    africa_south: 'AFRICA (SOUTH)',
    africa_west: 'AFRICA (WEST)',
    east_asia: 'ASIA (EAST)',
    middle_east: 'MIDDLE EAST',
    north_america: 'NORTH AMERICA',
    oceania: 'OCEANIA',
    south_america: 'SOUTH AMERICA',
    south_asia: 'ASIA (SOUTH)',
};

let osmSnapshotCache = null;
let osmSnapshotRequest = null;

function createMilitaryBaseIconDataUri() {
    const canvas = document.createElement('canvas');
    canvas.width = 26;
    canvas.height = 26;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.translate(13, 13);
    ctx.fillStyle = '#f7c15a';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.1;

    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(7.4, -4.2);
    ctx.lineTo(6.2, 5.8);
    ctx.lineTo(0, 9.5);
    ctx.lineTo(-6.2, 5.8);
    ctx.lineTo(-7.4, -4.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(-1.2, -4.5, 2.4, 8.8);
    ctx.fillRect(-4.2, -1.2, 8.4, 2.4);

    return canvas.toDataURL('image/png');
}

function extractPointFromGeometry(geometry) {
    if (!geometry) return null;

    if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
        const [lng, lat] = geometry.coordinates;
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
            return { lng, lat };
        }
    }

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    const visitCoordinates = (coords) => {
        if (!Array.isArray(coords)) return;
        if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            const lng = coords[0];
            const lat = coords[1];
            if (Number.isFinite(lng) && Number.isFinite(lat)) {
                if (lng < minLng) minLng = lng;
                if (lng > maxLng) maxLng = lng;
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
            }
            return;
        }
        coords.forEach(visitCoordinates);
    };

    visitCoordinates(geometry.coordinates);

    if (
        Number.isFinite(minLng) &&
        Number.isFinite(maxLng) &&
        Number.isFinite(minLat) &&
        Number.isFinite(maxLat)
    ) {
        return {
            lng: (minLng + maxLng) / 2,
            lat: (minLat + maxLat) / 2,
        };
    }

    return null;
}

function normalizeNtdBase(feature) {
    const props = feature?.properties || {};
    const point = extractPointFromGeometry(feature?.geometry);
    if (!point) return null;

    const objectId = props.OBJECTID || `${point.lat}:${point.lng}`;
    const featureName = props.featureName || props.siteName || `Military Base ${objectId}`;
    const status = String(props.siteOperationalStatus || 'unknown').toUpperCase();
    const component = String(props.siteReportingComponent || 'unknown').toUpperCase();

    return {
        id: `ntad-${objectId}`,
        name: featureName,
        country: props.countryName ? String(props.countryName).toUpperCase() : 'UNKNOWN',
        state: props.stateNameCode ? String(props.stateNameCode).toUpperCase() : 'N/A',
        status,
        component,
        lat: point.lat,
        lng: point.lng,
        source: 'NTAD Military Bases',
        sourceRef: API_URLS.MILITARY_BASES_NTAD,
    };
}

function normalizeOsmBase(site) {
    if (!site || !Number.isFinite(site.lat) || !Number.isFinite(site.lng)) return null;
    const regionLabel = REGION_LABELS[site.region] || 'GLOBAL';
    const country = site.country
        ? String(site.country).toUpperCase()
        : regionLabel;
    const status = site.status ? String(site.status).toUpperCase() : 'ACTIVE';
    const component = site.militaryType ? String(site.militaryType).toUpperCase() : 'MILITARY';

    return {
        id: site.id || `osm-${site.lat}:${site.lng}`,
        name: site.name || 'OSM Military Site',
        country,
        region: regionLabel,
        state: 'N/A',
        status,
        component,
        operator: site.operator || 'N/A',
        lat: site.lat,
        lng: site.lng,
        source: site.source || 'OpenStreetMap Overpass',
        sourceRef: site.osmUrl || 'https://www.openstreetmap.org',
    };
}

function mergeAndDedupeBases(baseGroups) {
    const merged = [];
    const seen = new Set();

    for (const group of baseGroups) {
        for (const base of group) {
            if (!base || !Number.isFinite(base.lat) || !Number.isFinite(base.lng)) continue;
            const key = `${(base.name || 'site').toLowerCase()}:${base.lat.toFixed(4)}:${base.lng.toFixed(4)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(base);

            if (merged.length >= MAX_BASES) {
                return merged;
            }
        }
    }

    return merged;
}

async function loadOsmSnapshot() {
    if (Array.isArray(osmSnapshotCache) && osmSnapshotCache.length) {
        return osmSnapshotCache;
    }

    if (!osmSnapshotRequest) {
        osmSnapshotRequest = fetch(API_URLS.MILITARY_BASES_OSM_SNAPSHOT, {
            cache: 'force-cache',
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`OSM military snapshot HTTP ${response.status}`);
                }
                return response.json();
            })
            .then((payload) => (Array.isArray(payload) ? payload : []))
            .catch((err) => {
                osmSnapshotRequest = null;
                console.warn('Military bases OSM snapshot unavailable', err);
                return [];
            });
    }

    const snapshot = await osmSnapshotRequest;
    if (Array.isArray(snapshot) && snapshot.length) {
        osmSnapshotCache = snapshot;
    }
    return Array.isArray(snapshot) ? snapshot : [];
}

async function buildOsmBaseList() {
    const snapshot = await loadOsmSnapshot();
    return snapshot
        .slice(0, Math.min(MAX_OSM_BASES, snapshot.length))
        .map(normalizeOsmBase)
        .filter(Boolean);
}

export default function MilitaryBasesLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.militaryBases.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);

    const entitiesRef = useRef(new Map());
    const abortRef = useRef(null);
    const refreshTimerRef = useRef(null);
    const iconRef = useRef(null);

    const clearLayer = useCallback(() => {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;

        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }

        entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
        entitiesRef.current.clear();
    }, [viewer]);

    const upsertEntities = useCallback((bases) => {
        const currentIds = new Set();

        bases.forEach((base) => {
            const entityId = `mil-base-${base.id}`;
            currentIds.add(entityId);

            const position = Cesium.Cartesian3.fromDegrees(base.lng, base.lat, 120);

            if (entitiesRef.current.has(entityId)) {
                const entity = entitiesRef.current.get(entityId);
                entity.position = position;
                entity.name = base.name;
                entity.properties.country = base.country;
                entity.properties.state = base.state;
                entity.properties.component = base.component;
                entity.properties.category = base.component;
                entity.properties.status = base.status;
                entity.properties.region = base.region || 'N/A';
                entity.properties.operator = base.operator || 'N/A';
                entity.properties.latitude = base.lat.toFixed(4);
                entity.properties.longitude = base.lng.toFixed(4);
                entity.properties.source = base.source;
                entity.properties.reference = base.sourceRef || 'N/A';
                return;
            }

            const entity = viewer.entities.add({
                id: entityId,
                position,
                name: base.name,
                billboard: {
                    image: iconRef.current,
                    scale: 0.58,
                    alignedAxis: Cesium.Cartesian3.UNIT_Z,
                    disableDepthTestDistance: 9000000,
                },
                properties: {
                    _layerType: 'militaryBases',
                    id: base.id,
                    country: base.country,
                    state: base.state,
                    component: base.component,
                    category: base.component,
                    status: base.status,
                    region: base.region || 'N/A',
                    operator: base.operator || 'N/A',
                    latitude: base.lat.toFixed(4),
                    longitude: base.lng.toFixed(4),
                    source: base.source,
                    reference: base.sourceRef || 'N/A',
                },
            });

            entitiesRef.current.set(entityId, entity);
        });

        for (const [entityId, entity] of entitiesRef.current.entries()) {
            if (!currentIds.has(entityId)) {
                viewer.entities.remove(entity);
                entitiesRef.current.delete(entityId);
            }
        }
    }, [viewer]);

    const fetchBases = useCallback(async () => {
        if (!isEnabled) return;

        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            if (!entitiesRef.current.size) {
                setStatus('militaryBases', 'loading');
            }

            const response = await fetch(API_URLS.MILITARY_BASES_NTAD, {
                signal: controller.signal,
                cache: 'no-store',
            });

            const ntadBases = [];
            if (response.ok) {
                const payload = await response.json();
                const features = Array.isArray(payload?.features) ? payload.features : [];
                ntadBases.push(...features.map(normalizeNtdBase).filter(Boolean));
            }

            // Keep OSM-first merge order so global Asia/Africa coverage remains visible
            // even when rendering caps are reached on lower-end devices.
            const osmBases = await buildOsmBaseList();
            const bases = mergeAndDedupeBases([osmBases, ntadBases]);

            if (controller.signal.aborted || !isEnabled) return;

            upsertEntities(bases);
            updateData('militaryBases', bases);
            setStatus('militaryBases', bases.length ? 'active' : 'error');
            viewer.scene.requestRender();
        } catch (err) {
            if (controller.signal.aborted) return;

            const fallbackBases = mergeAndDedupeBases([await buildOsmBaseList()]);
            upsertEntities(fallbackBases);
            updateData('militaryBases', fallbackBases);
            setStatus('militaryBases', fallbackBases.length ? 'active' : 'error');
        }
    }, [isEnabled, setStatus, updateData, upsertEntities, viewer]);

    useEffect(() => {
        if (!iconRef.current) {
            iconRef.current = createMilitaryBaseIconDataUri();
        }
    }, []);

    useEffect(() => {
        if (!isEnabled) {
            clearLayer();
            setStatus('militaryBases', 'idle');
            updateData('militaryBases', []);
            return;
        }

        fetchBases();
        refreshTimerRef.current = setInterval(fetchBases, REFRESH_INTERVAL_MS);

        return () => {
            clearLayer();
        };
    }, [isEnabled, clearLayer, fetchBases, setStatus, updateData]);

    return null;
}
