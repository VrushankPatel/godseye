import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS } from '../constants/dataSources';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const MAX_BASES = 2000;

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

    // Shield-style icon so bases are visually distinct from aircraft/satellites.
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

function normalizeBaseFeature(feature) {
    const props = feature?.properties || {};
    const point = extractPointFromGeometry(feature?.geometry);
    if (!point) return null;

    const objectId = props.OBJECTID || `${point.lat}:${point.lng}`;
    const featureName = props.featureName || props.siteName || `Military Base ${objectId}`;
    const status = String(props.siteOperationalStatus || 'unknown').toUpperCase();
    const component = String(props.siteReportingComponent || 'unknown').toUpperCase();

    return {
        id: String(objectId),
        name: featureName,
        country: props.countryName ? String(props.countryName).toUpperCase() : 'UNKNOWN',
        state: props.stateNameCode ? String(props.stateNameCode).toUpperCase() : 'N/A',
        status,
        component,
        lat: point.lat,
        lng: point.lng,
    };
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
                entity.properties.status = base.status;
                entity.properties.latitude = base.lat.toFixed(4);
                entity.properties.longitude = base.lng.toFixed(4);
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
                    status: base.status,
                    latitude: base.lat.toFixed(4),
                    longitude: base.lng.toFixed(4),
                    source: 'NTAD Military Bases',
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
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const payload = await response.json();
            const features = Array.isArray(payload?.features) ? payload.features : [];
            const bases = features
                .map(normalizeBaseFeature)
                .filter(Boolean)
                .slice(0, MAX_BASES);

            if (controller.signal.aborted || !isEnabled) return;

            upsertEntities(bases);
            updateData('militaryBases', bases);
            setStatus('militaryBases', bases.length ? 'active' : 'error');
            viewer.scene.requestRender();
        } catch (err) {
            if (controller.signal.aborted) return;
            if (!entitiesRef.current.size) {
                setStatus('militaryBases', 'error');
                updateData('militaryBases', []);
            }
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
