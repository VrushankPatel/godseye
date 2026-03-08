import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 12000;
const MAX_EVENTS = 1800;

const CATEGORY_STYLES = {
    wildfires: { color: '#ff6b3d', icon: 'WF', label: 'Wildfire' },
    severeStorms: { color: '#ffb347', icon: 'ST', label: 'Storm' },
    volcanoes: { color: '#ff3333', icon: 'VO', label: 'Volcano' },
    floods: { color: '#3ea7ff', icon: 'FL', label: 'Flood' },
    landslides: { color: '#d38c5f', icon: 'LS', label: 'Landslide' },
    drought: { color: '#d3a55f', icon: 'DR', label: 'Drought' },
    snow: { color: '#bcd8ff', icon: 'SN', label: 'Snow' },
    seaLakeIce: { color: '#7bd5ff', icon: 'IC', label: 'Ice' },
    tempExtremes: { color: '#ff8855', icon: 'TX', label: 'Temp Extreme' },
    dustHaze: { color: '#cfa872', icon: 'DH', label: 'Dust/Haze' },
    waterColor: { color: '#4cb6ff', icon: 'WC', label: 'Water Color' },
};

function getCategoryInfo(categoryId) {
    return CATEGORY_STYLES[categoryId] || {
        color: '#ffaa00',
        icon: 'HZ',
        label: 'Hazard',
    };
}

function createHazardIconDataUri(categoryInfo) {
    const canvas = document.createElement('canvas');
    canvas.width = 36;
    canvas.height = 36;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const color = categoryInfo.color || '#ffaa00';
    const icon = categoryInfo.icon || 'HZ';

    ctx.clearRect(0, 0, 36, 36);
    ctx.beginPath();
    ctx.arc(18, 18, 11, 0, Math.PI * 2);
    ctx.fillStyle = `${color}33`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 18, 18);

    return canvas.toDataURL('image/png');
}

function extractGeometryPosition(geometry) {
    if (!geometry) return null;

    if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
        const [lng, lat] = geometry.coordinates;
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
            return { lng, lat };
        }
        return null;
    }

    const coords = geometry.coordinates;
    if (!Array.isArray(coords)) return null;

    let sample = coords;
    while (Array.isArray(sample) && Array.isArray(sample[0])) {
        sample = sample[sample.length - 1];
    }
    if (!Array.isArray(sample) || sample.length < 2) return null;

    const [lng, lat] = sample;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return { lng, lat };
}

function normalizeEonetEvents(payload) {
    const events = Array.isArray(payload?.events) ? payload.events : [];

    return events
        .map((event) => {
            const geometries = Array.isArray(event?.geometry) ? event.geometry : [];
            if (!geometries.length) return null;

            const latestGeometry = geometries.reduce((latest, item) => {
                const itemTime = Date.parse(item?.date || '');
                const latestTime = Date.parse(latest?.date || '');
                if (!latest || (Number.isFinite(itemTime) && itemTime > latestTime)) {
                    return item;
                }
                return latest;
            }, null);

            const point = extractGeometryPosition(latestGeometry);
            if (!point) return null;

            const primaryCategory = Array.isArray(event.categories) ? event.categories[0] : null;
            const categoryId = primaryCategory?.id || 'unknown';
            const categoryTitle = primaryCategory?.title || 'Unknown';
            const categoryInfo = getCategoryInfo(categoryId);

            const sources = Array.isArray(event.sources) ? event.sources : [];
            const sourceLabel = sources.length
                ? sources.map((src) => src?.id).filter(Boolean).join(', ')
                : 'EONET';
            const sourceRef = sources.find((src) => src?.url)?.url || event.link || API_URLS.EONET_OPEN_EVENTS;

            const magnitudeValue = latestGeometry?.magnitudeValue;
            const magnitudeUnit = latestGeometry?.magnitudeUnit;
            const magnitudeText =
                Number.isFinite(Number(magnitudeValue))
                    ? `${Number(magnitudeValue).toFixed(1)} ${magnitudeUnit || ''}`.trim()
                    : 'N/A';

            return {
                id: event.id || `${event.title}-${point.lat}-${point.lng}`,
                name: event.title || 'Natural Hazard',
                lat: point.lat,
                lng: point.lng,
                categoryId,
                category: categoryTitle,
                severity: magnitudeText,
                updatedAt: latestGeometry?.date || null,
                status: event.closed ? 'CLOSED' : 'ACTIVE',
                source: sourceLabel,
                reference: sourceRef,
                description: event.description || 'No additional details.',
                style: categoryInfo,
            };
        })
        .filter(Boolean)
        .slice(0, MAX_EVENTS);
}

async function fetchJsonWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            cache: 'no-store',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

export default function HazardsLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.hazards.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);

    const entitiesRef = useRef(new Map());
    const iconCacheRef = useRef(new Map());
    const pollTimerRef = useRef(null);

    const clearEntities = useCallback(() => {
        entitiesRef.current.forEach((entity) => {
            if (!viewer.isDestroyed()) viewer.entities.remove(entity);
        });
        entitiesRef.current.clear();
    }, [viewer]);

    const getCategoryIcon = useCallback((categoryId, style) => {
        if (iconCacheRef.current.has(categoryId)) {
            return iconCacheRef.current.get(categoryId);
        }
        const icon = createHazardIconDataUri(style);
        iconCacheRef.current.set(categoryId, icon);
        return icon;
    }, []);

    const upsertEvents = useCallback((events) => {
        const currentIds = new Set();

        events.forEach((hazard) => {
            const entityId = `hazard-${hazard.id}`;
            currentIds.add(entityId);
            const position = Cesium.Cartesian3.fromDegrees(hazard.lng, hazard.lat, 0);
            const icon = getCategoryIcon(hazard.categoryId, hazard.style);

            if (entitiesRef.current.has(entityId)) {
                const entity = entitiesRef.current.get(entityId);
                entity.position = position;
                entity.name = hazard.name;
                entity.properties.category = hazard.category;
                entity.properties.severity = hazard.severity;
                entity.properties.status = hazard.status;
                entity.properties.updated = hazard.updatedAt || 'N/A';
                entity.properties.source = hazard.source;
                entity.properties.reference = hazard.reference;
                entity.properties.description = hazard.description;
                entity.properties.latitude = hazard.lat.toFixed(4);
                entity.properties.longitude = hazard.lng.toFixed(4);
                return;
            }

            const entity = viewer.entities.add({
                id: entityId,
                position,
                name: hazard.name,
                billboard: {
                    image: icon,
                    scale: 0.64,
                    alignedAxis: Cesium.Cartesian3.UNIT_Z,
                    disableDepthTestDistance: 9000000,
                },
                properties: {
                    _layerType: 'hazards',
                    category: hazard.category,
                    severity: hazard.severity,
                    status: hazard.status,
                    updated: hazard.updatedAt || 'N/A',
                    source: hazard.source,
                    reference: hazard.reference,
                    description: hazard.description,
                    latitude: hazard.lat.toFixed(4),
                    longitude: hazard.lng.toFixed(4),
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
    }, [getCategoryIcon, viewer]);

    const pollHazards = useCallback(async () => {
        if (!isEnabled) return;
        try {
            if (!entitiesRef.current.size) {
                setStatus('hazards', 'loading');
            }
            const payload = await fetchJsonWithTimeout(API_URLS.EONET_OPEN_EVENTS);
            const events = normalizeEonetEvents(payload);
            if (!events.length) throw new Error('No hazard events available');

            upsertEvents(events);
            updateData('hazards', events);
            setStatus('hazards', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('hazards', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('hazards', []);
            }
        }
    }, [isEnabled, setStatus, upsertEvents, updateData, viewer]);

    useEffect(() => {
        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
            updateData('hazards', []);
            setStatus('hazards', 'idle');
            return;
        }

        pollHazards();
        pollTimerRef.current = setInterval(pollHazards, POLL_INTERVALS.HAZARDS);

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        };
    }, [isEnabled, pollHazards, clearEntities, updateData, setStatus]);

    return null;
}
