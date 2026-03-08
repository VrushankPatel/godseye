import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 12000;
const MAX_POINTS = 7000;
const MAX_EONET_POINTS = 1200;
const MIN_CONFIDENCE = 35;
const GRID_RESOLUTION = 20; // 0.05 degree cells

function parseNumber(value) {
    const parsed = Number.parseFloat(String(value ?? '').trim());
    return Number.isFinite(parsed) ? parsed : null;
}

function parseConfidence(value) {
    const raw = String(value ?? '').trim().toLowerCase();
    const numeric = Number.parseFloat(raw);
    if (Number.isFinite(numeric)) return numeric;
    if (raw === 'h') return 85;
    if (raw === 'n') return 55;
    if (raw === 'l') return 25;
    return null;
}

function formatAcqTimestamp(dateStr, timeStr) {
    const date = String(dateStr || '').trim();
    const time = String(timeStr || '').trim().padStart(4, '0');
    if (!date || time.length !== 4) return 'N/A';
    const hh = time.slice(0, 2);
    const mm = time.slice(2, 4);
    const iso = `${date}T${hh}:${mm}:00Z`;
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return 'N/A';
    return new Date(ts).toISOString();
}

function getStyle(confidence, frp) {
    const frpNum = Number.isFinite(frp) ? frp : 0;
    if (confidence >= 90 || frpNum >= 70) return { color: '#ef4444', code: 'HX' };
    if (confidence >= 75 || frpNum >= 35) return { color: '#f97316', code: 'HI' };
    if (confidence >= 60 || frpNum >= 15) return { color: '#f59e0b', code: 'MD' };
    return { color: '#facc15', code: 'LW' };
}

function createFireIcon(style) {
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
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style.code, 15, 15);

    return canvas.toDataURL('image/png');
}

function looksLikeCsv(text) {
    return String(text || '').includes('latitude,longitude,brightness');
}

function extractCsvFromWrappedText(text) {
    const raw = String(text || '');
    if (looksLikeCsv(raw)) return raw;

    const marker = 'Markdown Content:';
    const markerIndex = raw.indexOf(marker);
    if (markerIndex === -1) return '';

    const sliced = raw.slice(markerIndex + marker.length).trim();
    const headerIndex = sliced.indexOf('latitude,longitude,brightness');
    if (headerIndex === -1) return '';
    return sliced.slice(headerIndex).trim();
}

function normalizeHotspots(csvText) {
    const text = extractCsvFromWrappedText(csvText);
    if (!text) return [];

    const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length < 2) return [];

    const header = lines[0].split(',');
    const colIndex = Object.fromEntries(header.map((name, idx) => [name.trim(), idx]));

    const required = ['latitude', 'longitude', 'brightness', 'acq_date', 'acq_time', 'confidence', 'frp', 'daynight', 'satellite'];
    const hasRequired = required.every((key) => Number.isInteger(colIndex[key]));
    if (!hasRequired) return [];

    const byGrid = new Map();

    for (let i = 1; i < lines.length; i += 1) {
        const cols = lines[i].split(',');
        if (cols.length < header.length) continue;

        const lat = parseNumber(cols[colIndex.latitude]);
        const lon = parseNumber(cols[colIndex.longitude]);
        const brightness = parseNumber(cols[colIndex.brightness]);
        const frp = parseNumber(cols[colIndex.frp]);
        const confidence = parseConfidence(cols[colIndex.confidence]);
        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lon) ||
            !Number.isFinite(brightness) ||
            !Number.isFinite(confidence) ||
            confidence < MIN_CONFIDENCE
        ) {
            continue;
        }

        const style = getStyle(confidence, frp);
        const timestamp = formatAcqTimestamp(
            cols[colIndex.acq_date],
            cols[colIndex.acq_time]
        );

        const score = confidence * 2 + (Number.isFinite(frp) ? frp : 0) * 0.7 + brightness * 0.08;
        const gridLat = Math.round(lat * GRID_RESOLUTION);
        const gridLon = Math.round(lon * GRID_RESOLUTION);
        const gridKey = `${gridLat}:${gridLon}`;

        const hotspot = {
            id: `fire-${i}-${gridLat}-${gridLon}`,
            name: 'Active Fire Hotspot',
            lat,
            lon,
            confidence: `${Math.round(confidence)}%`,
            brightness: `${brightness.toFixed(2)} K`,
            frp: Number.isFinite(frp) ? `${frp.toFixed(2)} MW` : 'N/A',
            timestamp,
            dayNight: String(cols[colIndex.daynight] || '').trim() || 'N/A',
            satellite: String(cols[colIndex.satellite] || '').trim() || 'N/A',
            source: 'NASA FIRMS MODIS C6.1 (24h)',
            reference: API_URLS.FIRE_HOTSPOTS_CSV,
            style,
            _score: score,
        };

        const existing = byGrid.get(gridKey);
        if (!existing || hotspot._score > existing._score) {
            byGrid.set(gridKey, hotspot);
        }
    }

    return Array.from(byGrid.values())
        .sort((a, b) => b._score - a._score)
        .slice(0, MAX_POINTS);
}

function normalizeEonetWildfireEvents(payload) {
    const events = Array.isArray(payload?.events) ? payload.events : [];
    const mapped = [];

    events.forEach((event, index) => {
        const categories = Array.isArray(event?.categories) ? event.categories : [];
        const isWildfire = categories.some((cat) =>
            String(cat?.title || '')
                .toLowerCase()
                .includes('wildfire')
        );
        if (!isWildfire) return;

        const geometries = Array.isArray(event?.geometry) ? event.geometry : [];
        const latestPoint = [...geometries]
            .reverse()
            .find(
                (geo) =>
                    String(geo?.type || '').toLowerCase() === 'point' &&
                    Array.isArray(geo?.coordinates) &&
                    geo.coordinates.length >= 2 &&
                    Number.isFinite(Number(geo.coordinates[0])) &&
                    Number.isFinite(Number(geo.coordinates[1]))
            );
        if (!latestPoint) return;

        const lon = Number(latestPoint.coordinates[0]);
        const lat = Number(latestPoint.coordinates[1]);
        const dateIso = toIsoOrNA(latestPoint?.date);

        mapped.push({
            id: `eonet-fire-${event.id || index}`,
            name: event.title || 'Wildfire Event',
            lat,
            lon,
            confidence: 'N/A',
            brightness: 'N/A',
            frp: 'N/A',
            timestamp: dateIso,
            dayNight: 'N/A',
            satellite: 'N/A',
            source: 'NASA EONET Open Events (Wildfires)',
            reference: event?.link || API_URLS.EONET_OPEN_EVENTS,
            style: { color: '#ef4444', code: 'WF' },
            _score: dateIso !== 'N/A' ? Date.parse(dateIso) : 0,
        });
    });

    return mapped
        .sort((a, b) => b._score - a._score)
        .slice(0, MAX_EONET_POINTS);
}

function toIsoOrNA(value) {
    const ts = Date.parse(String(value || ''));
    return Number.isFinite(ts) ? new Date(ts).toISOString() : 'N/A';
}

async function fetchTextWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            cache: 'no-store',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } finally {
        clearTimeout(timeoutId);
    }
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

async function fetchFireCsv() {
    const candidates = [
        API_URLS.FIRE_HOTSPOTS_CSV,
        API_URLS.FIRE_HOTSPOTS_PROXY,
        API_URLS.FIRE_HOTSPOTS_PROXY_ALT,
    ];

    let lastErr = null;
    for (const url of candidates) {
        try {
            const text = await fetchTextWithTimeout(url);
            if (extractCsvFromWrappedText(text)) {
                return text;
            }
            throw new Error('Unexpected feed format');
        } catch (err) {
            lastErr = err;
        }
    }
    throw lastErr || new Error('Unable to fetch fire hotspot feed');
}

export default function FireHotspotsLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.fireHotspots.enabled);
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
        const icon = createFireIcon(style);
        iconCacheRef.current.set(key, icon);
        return icon;
    }, []);

    const upsertHotspots = useCallback(
        (hotspots) => {
            const currentIds = new Set();

            hotspots.forEach((hotspot) => {
                const entityId = hotspot.id;
                currentIds.add(entityId);
                const position = Cesium.Cartesian3.fromDegrees(hotspot.lon, hotspot.lat, 850);
                const icon = getIcon(hotspot.style);

                if (entitiesRef.current.has(entityId)) {
                    const entity = entitiesRef.current.get(entityId);
                    entity.position = position;
                    entity.name = hotspot.name;
                    if (entity.billboard) entity.billboard.image = icon;
                    entity.properties.confidence = hotspot.confidence;
                    entity.properties.brightness = hotspot.brightness;
                    entity.properties.frp = hotspot.frp;
                    entity.properties.timestamp = hotspot.timestamp;
                    entity.properties.dayNight = hotspot.dayNight;
                    entity.properties.satellite = hotspot.satellite;
                    entity.properties.latitude = hotspot.lat.toFixed(4);
                    entity.properties.longitude = hotspot.lon.toFixed(4);
                    return;
                }

                const entity = viewer.entities.add({
                    id: entityId,
                    position,
                    name: hotspot.name,
                    billboard: {
                        image: icon,
                        scale: 0.58,
                        alignedAxis: Cesium.Cartesian3.UNIT_Z,
                        disableDepthTestDistance: 9000000,
                    },
                    properties: {
                        _layerType: 'fireHotspots',
                        confidence: hotspot.confidence,
                        brightness: hotspot.brightness,
                        frp: hotspot.frp,
                        timestamp: hotspot.timestamp,
                        dayNight: hotspot.dayNight,
                        satellite: hotspot.satellite,
                        source: hotspot.source,
                        reference: hotspot.reference,
                        latitude: hotspot.lat.toFixed(4),
                        longitude: hotspot.lon.toFixed(4),
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

    const pollHotspots = useCallback(async () => {
        if (!isEnabled) return;
        try {
            if (!entitiesRef.current.size) {
                setStatus('fireHotspots', 'loading');
            }

            const csvText = await fetchFireCsv();
            let hotspots = normalizeHotspots(csvText);
            if (!hotspots.length) {
                const eonetPayload = await fetchJsonWithTimeout(API_URLS.EONET_OPEN_EVENTS);
                hotspots = normalizeEonetWildfireEvents(eonetPayload);
            }
            if (!hotspots.length) throw new Error('No fire hotspots available');

            upsertHotspots(hotspots);
            updateData('fireHotspots', hotspots);
            setStatus('fireHotspots', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('fireHotspots', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('fireHotspots', []);
            }
        }
    }, [isEnabled, setStatus, upsertHotspots, updateData, viewer]);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return undefined;

        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
            updateData('fireHotspots', []);
            setStatus('fireHotspots', 'idle');
            viewer.scene.requestRender();
            return undefined;
        }

        pollHotspots();
        pollTimerRef.current = setInterval(
            pollHotspots,
            POLL_INTERVALS.FIRE_HOTSPOTS || 600000
        );

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        };
    }, [clearEntities, isEnabled, pollHotspots, setStatus, updateData, viewer]);

    return null;
}
