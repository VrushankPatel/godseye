import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 12000;
const MAX_ALERTS = 1500;

const SEVERITY_STYLE = {
    extreme: { color: '#ef4444', short: 'EX' },
    severe: { color: '#f97316', short: 'SV' },
    moderate: { color: '#f59e0b', short: 'MD' },
    minor: { color: '#eab308', short: 'MN' },
    unknown: { color: '#9ca3af', short: 'UN' },
};

function normalizeSeverity(value) {
    const key = String(value || 'unknown').trim().toLowerCase();
    return SEVERITY_STYLE[key] || SEVERITY_STYLE.unknown;
}

function toIsoOrNA(value) {
    if (!value) return 'N/A';
    const ts = Date.parse(String(value));
    if (!Number.isFinite(ts)) return 'N/A';
    return new Date(ts).toISOString();
}

function sanitizeAlertId(id) {
    return String(id || '')
        .replace(/^urn:oid:/i, '')
        .replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function getRingCentroid(ring) {
    if (!Array.isArray(ring) || ring.length < 3) return null;
    const points = ring.filter(
        (point) =>
            Array.isArray(point) &&
            point.length >= 2 &&
            Number.isFinite(point[0]) &&
            Number.isFinite(point[1])
    );
    if (points.length < 3) return null;

    // Planar centroid approximation is sufficient at alert polygon scales.
    let areaAcc = 0;
    let cxAcc = 0;
    let cyAcc = 0;

    for (let i = 0; i < points.length - 1; i += 1) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[i + 1];
        const cross = x0 * y1 - x1 * y0;
        areaAcc += cross;
        cxAcc += (x0 + x1) * cross;
        cyAcc += (y0 + y1) * cross;
    }

    const area = areaAcc / 2;
    if (Math.abs(area) < 1e-7) {
        const avg = points.reduce(
            (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
            { lng: 0, lat: 0 }
        );
        return {
            lng: avg.lng / points.length,
            lat: avg.lat / points.length,
        };
    }

    return {
        lng: cxAcc / (6 * area),
        lat: cyAcc / (6 * area),
    };
}

function computeGeometryCenter(geometry) {
    if (!geometry || !geometry.type) return null;
    const { type, coordinates } = geometry;

    if (type === 'Point' && Array.isArray(coordinates) && coordinates.length >= 2) {
        const [lng, lat] = coordinates;
        if (Number.isFinite(lng) && Number.isFinite(lat)) return { lng, lat };
        return null;
    }

    if (type === 'Polygon' && Array.isArray(coordinates)) {
        for (const ring of coordinates) {
            const centroid = getRingCentroid(ring);
            if (centroid) return centroid;
        }
        return null;
    }

    if (type === 'MultiPolygon' && Array.isArray(coordinates)) {
        for (const polygon of coordinates) {
            if (!Array.isArray(polygon)) continue;
            for (const ring of polygon) {
                const centroid = getRingCentroid(ring);
                if (centroid) return centroid;
            }
        }
    }

    return null;
}

function createWeatherAlertIcon(style) {
    const canvas = document.createElement('canvas');
    canvas.width = 34;
    canvas.height = 34;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 34, 34);
    ctx.beginPath();
    ctx.arc(17, 17, 11.2, 0, Math.PI * 2);
    ctx.fillStyle = `${style.color}33`;
    ctx.fill();
    ctx.lineWidth = 2.1;
    ctx.strokeStyle = style.color;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style.short, 17, 17);

    return canvas.toDataURL('image/png');
}

function normalizeAlerts(payload) {
    const features = Array.isArray(payload?.features) ? payload.features : [];
    const dedup = new Map();
    const nowMs = Date.now();

    for (const feature of features) {
        const properties = feature?.properties || {};
        const center = computeGeometryCenter(feature?.geometry);
        if (!center) continue;

        const rawId = feature?.id || properties.id || `${properties.event}-${properties.areaDesc}`;
        const id = sanitizeAlertId(rawId);
        if (!id) continue;

        const expiresTs = Date.parse(String(properties.expires || ''));
        if (Number.isFinite(expiresTs) && expiresTs < nowMs) continue;

        const style = normalizeSeverity(properties.severity);
        const severity = properties.severity || 'Unknown';
        const urgency = properties.urgency || 'Unknown';
        const certainty = properties.certainty || 'Unknown';
        const event = properties.event || 'Weather Alert';

        dedup.set(id, {
            id,
            name: event,
            lat: center.lat,
            lng: center.lng,
            event,
            severity,
            urgency,
            certainty,
            response: properties.response || 'N/A',
            areaDesc: properties.areaDesc || 'N/A',
            sender: properties.senderName || 'NWS',
            status: properties.status || 'actual',
            messageType: properties.messageType || 'N/A',
            category: properties.category || 'N/A',
            effective: toIsoOrNA(properties.effective),
            onset: toIsoOrNA(properties.onset),
            expires: toIsoOrNA(properties.expires),
            sent: toIsoOrNA(properties.sent),
            updated: toIsoOrNA(properties.updated || properties.sent),
            headline: properties.headline || 'N/A',
            description: properties.description || 'N/A',
            instruction: properties.instruction || 'N/A',
            source: 'NOAA / NWS Alerts',
            reference:
                properties['@id'] ||
                properties.web ||
                feature?.id ||
                API_URLS.NWS_ALERTS_ACTIVE,
            style,
        });
    }

    return Array.from(dedup.values()).slice(0, MAX_ALERTS);
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

export default function WeatherAlertsLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.weatherAlerts.enabled);
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

    const getIcon = useCallback((style) => {
        const key = `${style.short}|${style.color}`;
        if (iconCacheRef.current.has(key)) {
            return iconCacheRef.current.get(key);
        }
        const icon = createWeatherAlertIcon(style);
        iconCacheRef.current.set(key, icon);
        return icon;
    }, []);

    const upsertAlerts = useCallback(
        (alerts) => {
            const currentIds = new Set();

            alerts.forEach((alert) => {
                const entityId = `wx-alert-${alert.id}`;
                currentIds.add(entityId);
                const position = Cesium.Cartesian3.fromDegrees(alert.lng, alert.lat, 1200);
                const icon = getIcon(alert.style);

                if (entitiesRef.current.has(entityId)) {
                    const entity = entitiesRef.current.get(entityId);
                    entity.position = position;
                    entity.name = alert.name;
                    if (entity.billboard) {
                        entity.billboard.image = icon;
                    }
                    entity.properties.event = alert.event;
                    entity.properties.severity = alert.severity;
                    entity.properties.urgency = alert.urgency;
                    entity.properties.certainty = alert.certainty;
                    entity.properties.response = alert.response;
                    entity.properties.area = alert.areaDesc;
                    entity.properties.sender = alert.sender;
                    entity.properties.status = alert.status;
                    entity.properties.messageType = alert.messageType;
                    entity.properties.category = alert.category;
                    entity.properties.effective = alert.effective;
                    entity.properties.onset = alert.onset;
                    entity.properties.expires = alert.expires;
                    entity.properties.updated = alert.updated;
                    entity.properties.sent = alert.sent;
                    entity.properties.headline = alert.headline;
                    entity.properties.description = alert.description;
                    entity.properties.instruction = alert.instruction;
                    entity.properties.reference = alert.reference;
                    entity.properties.latitude = alert.lat.toFixed(4);
                    entity.properties.longitude = alert.lng.toFixed(4);
                    return;
                }

                const entity = viewer.entities.add({
                    id: entityId,
                    position,
                    name: alert.name,
                    billboard: {
                        image: icon,
                        scale: 0.64,
                        alignedAxis: Cesium.Cartesian3.UNIT_Z,
                        disableDepthTestDistance: 9000000,
                    },
                    properties: {
                        _layerType: 'weatherAlerts',
                        event: alert.event,
                        severity: alert.severity,
                        urgency: alert.urgency,
                        certainty: alert.certainty,
                        response: alert.response,
                        area: alert.areaDesc,
                        sender: alert.sender,
                        status: alert.status,
                        messageType: alert.messageType,
                        category: alert.category,
                        effective: alert.effective,
                        onset: alert.onset,
                        expires: alert.expires,
                        updated: alert.updated,
                        sent: alert.sent,
                        headline: alert.headline,
                        description: alert.description,
                        instruction: alert.instruction,
                        source: alert.source,
                        reference: alert.reference,
                        latitude: alert.lat.toFixed(4),
                        longitude: alert.lng.toFixed(4),
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
        },
        [getIcon, viewer]
    );

    const pollAlerts = useCallback(async () => {
        if (!isEnabled) return;
        try {
            if (!entitiesRef.current.size) {
                setStatus('weatherAlerts', 'loading');
            }

            const payload = await fetchJsonWithTimeout(API_URLS.NWS_ALERTS_ACTIVE);
            const alerts = normalizeAlerts(payload);
            if (!alerts.length) throw new Error('No weather alerts returned');

            upsertAlerts(alerts);
            updateData('weatherAlerts', alerts);
            setStatus('weatherAlerts', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('weatherAlerts', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('weatherAlerts', []);
            }
        }
    }, [isEnabled, setStatus, upsertAlerts, updateData, viewer]);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return undefined;

        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
            updateData('weatherAlerts', []);
            setStatus('weatherAlerts', 'idle');
            viewer.scene.requestRender();
            return undefined;
        }

        pollAlerts();
        pollTimerRef.current = setInterval(
            pollAlerts,
            POLL_INTERVALS.WEATHER_ALERTS || 60000
        );

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        };
    }, [clearEntities, isEnabled, pollAlerts, setStatus, updateData, viewer]);

    return null;
}
