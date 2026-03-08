import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 15000;
const MAX_EVENTS = 650;
const RECENT_WINDOW_DAYS = 120;

const ALERT_COLORS = {
    red: '#ef4444',
    orange: '#f97316',
    green: '#22c55e',
    unknown: '#9ca3af',
};

const EVENT_TYPE_LABELS = {
    EQ: 'Earthquake',
    TC: 'Tropical Cyclone',
    FL: 'Flood',
    DR: 'Drought',
    WF: 'Wildfire',
    VO: 'Volcano',
    TS: 'Tsunami',
};

function toTimestamp(value) {
    if (!value) return null;
    const ts = Date.parse(String(value));
    return Number.isFinite(ts) ? ts : null;
}

function toIsoOrNA(value) {
    const ts = toTimestamp(value);
    if (!ts) return 'N/A';
    return new Date(ts).toISOString();
}

function getAlertColor(alertLevel) {
    const key = String(alertLevel || 'unknown').trim().toLowerCase();
    return ALERT_COLORS[key] || ALERT_COLORS.unknown;
}

function getEventTypeLabel(code) {
    const normalized = String(code || 'UN').trim().toUpperCase();
    return EVENT_TYPE_LABELS[normalized] || `Type ${normalized}`;
}

function createDisasterIconDataUri(eventType, alertLevel) {
    const color = getAlertColor(alertLevel);
    const code = String(eventType || 'UN').trim().toUpperCase().slice(0, 2) || 'UN';

    const canvas = document.createElement('canvas');
    canvas.width = 36;
    canvas.height = 36;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 36, 36);
    ctx.beginPath();
    ctx.arc(18, 18, 12, 0, Math.PI * 2);
    ctx.fillStyle = `${color}33`;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code, 18, 18);

    return canvas.toDataURL('image/png');
}

function normalizeDisasterEvents(payload) {
    const features = Array.isArray(payload?.features) ? payload.features : [];
    const nowMs = Date.now();
    const recentWindowMs = RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    return features
        .map((feature) => {
            const coords = feature?.geometry?.coordinates;
            if (!Array.isArray(coords) || coords.length < 2) return null;

            const [lng, lat] = coords;
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

            const props = feature?.properties || {};
            const eventId = props.eventid ?? 'unknown';
            const episodeId = props.episodeid ?? 'unknown';
            const entityId = `gdacs-${eventId}-${episodeId}`;

            const eventType = String(props.eventtype || 'UN').toUpperCase();
            const eventTypeLabel = getEventTypeLabel(eventType);
            const alertLevel = String(props.alertlevel || 'Unknown');
            const alertScore = Number(props.alertscore);
            const isCurrent = String(props.iscurrent || 'false').toLowerCase() === 'true';

            const fromTs = toTimestamp(props.fromdate);
            const toTs = toTimestamp(props.todate);
            const modifiedTs = toTimestamp(props.datemodified);
            const updatedTs = modifiedTs || toTs || fromTs;
            const isRecent = Boolean(updatedTs && nowMs - updatedTs <= recentWindowMs);

            if (!isCurrent && !isRecent && !(Number.isFinite(alertScore) && alertScore >= 2)) {
                return null;
            }

            const severityText =
                props?.severitydata?.severitytext ||
                props.htmldescription ||
                props.description ||
                'N/A';

            const reportUrl =
                props?.url?.report ||
                props?.url?.details ||
                props?.url?.geometry ||
                API_URLS.GDACS_EVENTS;

            const source = props.source || 'GDACS';
            const name = props.name || props.description || `${eventTypeLabel} Alert`;
            const country = props.country || 'Unknown';

            return {
                id: entityId,
                eventId: String(eventId),
                episodeId: String(episodeId),
                name,
                eventType,
                eventTypeLabel,
                alertLevel,
                alertScore: Number.isFinite(alertScore) ? alertScore : null,
                isCurrent,
                country,
                source,
                glide: props.glide || 'N/A',
                severity: severityText,
                description: props.description || 'No description available.',
                from: toIsoOrNA(props.fromdate),
                to: toIsoOrNA(props.todate),
                updated: toIsoOrNA(props.datemodified || props.todate || props.fromdate),
                reference: reportUrl,
                lat,
                lng,
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

export default function DisasterLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.disasters.enabled);
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

    const getIcon = useCallback((eventType, alertLevel) => {
        const key = `${eventType}|${String(alertLevel).toLowerCase()}`;
        if (iconCacheRef.current.has(key)) {
            return iconCacheRef.current.get(key);
        }
        const icon = createDisasterIconDataUri(eventType, alertLevel);
        iconCacheRef.current.set(key, icon);
        return icon;
    }, []);

    const upsertDisasters = useCallback((events) => {
        const currentIds = new Set();

        events.forEach((event) => {
            const entityId = event.id;
            currentIds.add(entityId);
            const position = Cesium.Cartesian3.fromDegrees(event.lng, event.lat, 1000);
            const icon = getIcon(event.eventType, event.alertLevel);

            if (entitiesRef.current.has(entityId)) {
                const entity = entitiesRef.current.get(entityId);
                entity.position = position;
                entity.name = event.name;
                if (entity.billboard) {
                    entity.billboard.image = icon;
                }
                entity.properties.eventType = event.eventTypeLabel;
                entity.properties.alertLevel = event.alertLevel;
                entity.properties.alertScore = event.alertScore !== null ? String(event.alertScore) : 'N/A';
                entity.properties.status = event.isCurrent ? 'CURRENT' : 'RECENT';
                entity.properties.country = event.country;
                entity.properties.source = event.source;
                entity.properties.severity = event.severity;
                entity.properties.from = event.from;
                entity.properties.to = event.to;
                entity.properties.updated = event.updated;
                entity.properties.reference = event.reference;
                entity.properties.description = event.description;
                entity.properties.latitude = event.lat.toFixed(4);
                entity.properties.longitude = event.lng.toFixed(4);
                return;
            }

            const entity = viewer.entities.add({
                id: entityId,
                position,
                name: event.name,
                billboard: {
                    image: icon,
                    scale: 0.68,
                    alignedAxis: Cesium.Cartesian3.UNIT_Z,
                    disableDepthTestDistance: 9000000,
                },
                properties: {
                    _layerType: 'disasters',
                    eventType: event.eventTypeLabel,
                    eventCode: event.eventType,
                    alertLevel: event.alertLevel,
                    alertScore: event.alertScore !== null ? String(event.alertScore) : 'N/A',
                    status: event.isCurrent ? 'CURRENT' : 'RECENT',
                    country: event.country,
                    source: event.source,
                    glide: event.glide,
                    eventId: event.eventId,
                    episodeId: event.episodeId,
                    severity: event.severity,
                    from: event.from,
                    to: event.to,
                    updated: event.updated,
                    reference: event.reference,
                    description: event.description,
                    latitude: event.lat.toFixed(4),
                    longitude: event.lng.toFixed(4),
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
    }, [getIcon, viewer]);

    const pollDisasters = useCallback(async () => {
        if (!isEnabled) return;
        try {
            if (!entitiesRef.current.size) {
                setStatus('disasters', 'loading');
            }

            const payload = await fetchJsonWithTimeout(API_URLS.GDACS_EVENTS);
            const events = normalizeDisasterEvents(payload);
            if (!events.length) throw new Error('No GDACS disaster events available');

            upsertDisasters(events);
            updateData('disasters', events);
            setStatus('disasters', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('disasters', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('disasters', []);
            }
        }
    }, [isEnabled, setStatus, upsertDisasters, updateData, viewer]);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return undefined;

        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
            updateData('disasters', []);
            setStatus('disasters', 'idle');
            viewer.scene.requestRender();
            return undefined;
        }

        pollDisasters();
        pollTimerRef.current = setInterval(
            pollDisasters,
            POLL_INTERVALS.DISASTERS || 180000
        );

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        };
    }, [clearEntities, isEnabled, pollDisasters, setStatus, updateData, viewer]);

    return null;
}
