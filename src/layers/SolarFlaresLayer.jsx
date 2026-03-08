import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 12000;
const MAX_EVENTS = 500;
const GEO_ALTITUDE_METERS = 35786000;

const SATELLITE_SUBPOINTS = {
    16: { lon: -75.2, lat: 0 },
    17: { lon: -137.2, lat: 0 },
    18: { lon: -137.2, lat: 0 },
    19: { lon: -75.2, lat: 0 },
};

const CLASS_STYLE = {
    X: { color: '#ef4444', code: 'X' },
    M: { color: '#f97316', code: 'M' },
    C: { color: '#f59e0b', code: 'C' },
    B: { color: '#84cc16', code: 'B' },
    A: { color: '#60a5fa', code: 'A' },
    U: { color: '#9ca3af', code: 'U' },
};

function parseFlareClass(value) {
    const raw = String(value || '').trim().toUpperCase();
    const letter = raw.charAt(0);
    if (!CLASS_STYLE[letter]) {
        return { letter: 'U', level: null, full: raw || 'UNKNOWN', style: CLASS_STYLE.U };
    }
    const level = Number.parseFloat(raw.slice(1));
    return {
        letter,
        level: Number.isFinite(level) ? level : null,
        full: raw,
        style: CLASS_STYLE[letter],
    };
}

function classScore(parsedClass) {
    const baseMap = { X: 500, M: 300, C: 150, B: 60, A: 20, U: 0 };
    const base = baseMap[parsedClass.letter] || 0;
    return base + (Number.isFinite(parsedClass.level) ? parsedClass.level : 0);
}

function createFlareIcon(style) {
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 30, 30);
    ctx.beginPath();
    ctx.arc(15, 15, 8.8, 0, Math.PI * 2);
    ctx.fillStyle = `${style.color}33`;
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = style.color;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style.code, 15, 15);

    return canvas.toDataURL('image/png');
}

function toIsoOrNA(value) {
    const ts = Date.parse(String(value || ''));
    if (!Number.isFinite(ts)) return 'N/A';
    return new Date(ts).toISOString();
}

function hashJitter(seed) {
    let hash = 0;
    const s = String(seed || '');
    for (let i = 0; i < s.length; i += 1) {
        hash = (hash * 31 + s.charCodeAt(i)) & 0xffffffff;
    }
    return ((hash % 1000) / 1000 - 0.5) * 12;
}

function normalizeSolarFlares(payload) {
    const rows = Array.isArray(payload) ? payload : [];
    const now = Date.now();
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;

    const normalized = rows
        .map((row, index) => {
            const beginRaw = row?.begin_time;
            const maxRaw = row?.max_time;
            const endRaw = row?.end_time;
            const flareClass = parseFlareClass(row?.max_class || row?.begin_class || row?.end_class);
            const satellite = Number.parseInt(String(row?.satellite || ''), 10);
            const subpoint = SATELLITE_SUBPOINTS[satellite] || { lon: -75.2, lat: 0 };

            const maxTs = Date.parse(String(maxRaw || beginRaw || ''));
            if (!Number.isFinite(maxTs)) return null;
            if (now - maxTs > maxAgeMs) return null;

            const jitter = hashJitter(`${satellite}-${maxRaw}-${index}`);
            const lat = subpoint.lat + jitter * 0.55;
            const lon = subpoint.lon + jitter * 0.35;

            const id = `flare-${satellite}-${String(maxRaw || beginRaw || index)}-${index}`.replace(
                /[^a-zA-Z0-9_.-]/g,
                '_'
            );

            return {
                id,
                name: `GOES-${Number.isFinite(satellite) ? satellite : 'UNK'} X-ray Flare`,
                satellite: Number.isFinite(satellite) ? String(satellite) : 'N/A',
                flareClass: flareClass.full,
                classLetter: flareClass.letter,
                beginTime: toIsoOrNA(beginRaw),
                maxTime: toIsoOrNA(maxRaw),
                endTime: toIsoOrNA(endRaw),
                maxXrayLong: Number.isFinite(Number(row?.max_xrlong))
                    ? String(Number(row.max_xrlong))
                    : 'N/A',
                maxRatio: Number.isFinite(Number(row?.max_ratio))
                    ? String(Number(row.max_ratio))
                    : 'N/A',
                currentXrayLong: Number.isFinite(Number(row?.current_int_xrlong))
                    ? String(Number(row.current_int_xrlong))
                    : 'N/A',
                lat,
                lon,
                style: flareClass.style,
                source: 'NOAA SWPC GOES X-ray Flares',
                reference: API_URLS.SWPC_XRAY_FLARES_7D,
                _score: classScore(flareClass),
                _maxTs: maxTs,
            };
        })
        .filter(Boolean)
        .sort((a, b) => b._score - a._score || b._maxTs - a._maxTs)
        .slice(0, MAX_EVENTS);

    return normalized;
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

export default function SolarFlaresLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.solarFlares.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);

    const entitiesRef = useRef(new Map());
    const pollTimerRef = useRef(null);
    const iconCacheRef = useRef(new Map());

    const clearEntities = useCallback(() => {
        entitiesRef.current.forEach((entity) => {
            if (!viewer.isDestroyed()) viewer.entities.remove(entity);
        });
        entitiesRef.current.clear();
    }, [viewer]);

    const getIcon = useCallback((style) => {
        const key = `${style.code}|${style.color}`;
        if (iconCacheRef.current.has(key)) {
            return iconCacheRef.current.get(key);
        }
        const icon = createFlareIcon(style);
        iconCacheRef.current.set(key, icon);
        return icon;
    }, []);

    const upsertFlares = useCallback(
        (flares) => {
            const currentIds = new Set();

            flares.forEach((flare) => {
                const entityId = `solar-flare-${flare.id}`;
                currentIds.add(entityId);
                const position = Cesium.Cartesian3.fromDegrees(
                    flare.lon,
                    flare.lat,
                    GEO_ALTITUDE_METERS
                );
                const icon = getIcon(flare.style);

                if (entitiesRef.current.has(entityId)) {
                    const entity = entitiesRef.current.get(entityId);
                    entity.position = position;
                    entity.name = flare.name;
                    if (entity.billboard) entity.billboard.image = icon;
                    entity.properties.satellite = flare.satellite;
                    entity.properties.flareClass = flare.flareClass;
                    entity.properties.beginTime = flare.beginTime;
                    entity.properties.maxTime = flare.maxTime;
                    entity.properties.endTime = flare.endTime;
                    entity.properties.maxXrayLong = flare.maxXrayLong;
                    entity.properties.maxRatio = flare.maxRatio;
                    entity.properties.currentXrayLong = flare.currentXrayLong;
                    entity.properties.latitude = flare.lat.toFixed(3);
                    entity.properties.longitude = flare.lon.toFixed(3);
                    return;
                }

                const entity = viewer.entities.add({
                    id: entityId,
                    name: flare.name,
                    position,
                    billboard: {
                        image: icon,
                        scale: 0.64,
                        alignedAxis: Cesium.Cartesian3.UNIT_Z,
                        disableDepthTestDistance: 9000000,
                    },
                    properties: {
                        _layerType: 'solarFlares',
                        satellite: flare.satellite,
                        flareClass: flare.flareClass,
                        beginTime: flare.beginTime,
                        maxTime: flare.maxTime,
                        endTime: flare.endTime,
                        maxXrayLong: flare.maxXrayLong,
                        maxRatio: flare.maxRatio,
                        currentXrayLong: flare.currentXrayLong,
                        source: flare.source,
                        reference: flare.reference,
                        latitude: flare.lat.toFixed(3),
                        longitude: flare.lon.toFixed(3),
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

    const pollSolarFlares = useCallback(async () => {
        if (!isEnabled) return;
        try {
            if (!entitiesRef.current.size) {
                setStatus('solarFlares', 'loading');
            }

            const payload = await fetchJsonWithTimeout(API_URLS.SWPC_XRAY_FLARES_7D);
            const flares = normalizeSolarFlares(payload);
            if (!flares.length) throw new Error('No recent solar flare events');

            upsertFlares(flares);
            updateData('solarFlares', flares);
            setStatus('solarFlares', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('solarFlares', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('solarFlares', []);
            }
        }
    }, [isEnabled, setStatus, upsertFlares, updateData, viewer]);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return undefined;

        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
            updateData('solarFlares', []);
            setStatus('solarFlares', 'idle');
            viewer.scene.requestRender();
            return undefined;
        }

        pollSolarFlares();
        pollTimerRef.current = setInterval(
            pollSolarFlares,
            POLL_INTERVALS.SOLAR_FLARES || 300000
        );

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        };
    }, [clearEntities, isEnabled, pollSolarFlares, setStatus, updateData, viewer]);

    return null;
}
