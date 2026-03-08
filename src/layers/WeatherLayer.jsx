import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 12000;
const BATCH_SIZE = 48;

const WORLD_GRID_STEP = 8;
const INDIA_GRID_STEP = 4;

function formatCellId(lat, lon) {
    const latToken = `${lat >= 0 ? 'n' : 's'}${Math.abs(lat).toFixed(1).replace('.', '_')}`;
    const lonToken = `${lon >= 0 ? 'e' : 'w'}${Math.abs(lon).toFixed(1).replace('.', '_')}`;
    return `wx-${latToken}-${lonToken}`;
}

function buildWeatherNodes() {
    const nodesById = new Map();

    for (let lat = -56; lat <= 72; lat += WORLD_GRID_STEP) {
        for (let lon = -176; lon <= 176; lon += WORLD_GRID_STEP) {
            const id = formatCellId(lat, lon);
            nodesById.set(id, {
                id,
                name: `Grid ${lat.toFixed(1)}, ${lon.toFixed(1)}`,
                country: 'GLOBAL',
                lat,
                lng: lon,
            });
        }
    }

    // Extra densification for India to avoid sparse domestic coverage.
    for (let lat = 8; lat <= 36; lat += INDIA_GRID_STEP) {
        for (let lon = 68; lon <= 98; lon += INDIA_GRID_STEP) {
            const id = formatCellId(lat, lon);
            nodesById.set(id, {
                id,
                name: `India Grid ${lat.toFixed(1)}, ${lon.toFixed(1)}`,
                country: 'IN',
                lat,
                lng: lon,
            });
        }
    }

    return Array.from(nodesById.values());
}

const WEATHER_NODES = buildWeatherNodes();

const WEATHER_CODE_MAP = {
    0: { label: 'Clear', color: '#7dd3fc' },
    1: { label: 'Mostly Clear', color: '#7dd3fc' },
    2: { label: 'Partly Cloudy', color: '#93c5fd' },
    3: { label: 'Overcast', color: '#94a3b8' },
    45: { label: 'Fog', color: '#a8b3c8' },
    48: { label: 'Rime Fog', color: '#a8b3c8' },
    51: { label: 'Light Drizzle', color: '#60a5fa' },
    53: { label: 'Drizzle', color: '#3b82f6' },
    55: { label: 'Dense Drizzle', color: '#2563eb' },
    56: { label: 'Freezing Drizzle', color: '#38bdf8' },
    57: { label: 'Dense Freezing Drizzle', color: '#0284c7' },
    61: { label: 'Light Rain', color: '#60a5fa' },
    63: { label: 'Rain', color: '#3b82f6' },
    65: { label: 'Heavy Rain', color: '#1d4ed8' },
    66: { label: 'Light Freezing Rain', color: '#0ea5e9' },
    67: { label: 'Heavy Freezing Rain', color: '#0369a1' },
    71: { label: 'Light Snow', color: '#cbd5e1' },
    73: { label: 'Snow', color: '#94a3b8' },
    75: { label: 'Heavy Snow', color: '#64748b' },
    77: { label: 'Snow Grains', color: '#94a3b8' },
    80: { label: 'Rain Showers', color: '#60a5fa' },
    81: { label: 'Rain Showers', color: '#3b82f6' },
    82: { label: 'Violent Showers', color: '#1d4ed8' },
    85: { label: 'Snow Showers', color: '#94a3b8' },
    86: { label: 'Heavy Snow Showers', color: '#64748b' },
    95: { label: 'Thunderstorm', color: '#f59e0b' },
    96: { label: 'Storm + Hail', color: '#f97316' },
    99: { label: 'Severe Storm + Hail', color: '#ef4444' },
};
const MAX_ALERT_OVERLAYS = 800;

function toIsoOrNA(value) {
    const ts = Date.parse(String(value || ''));
    return Number.isFinite(ts) ? new Date(ts).toISOString() : 'N/A';
}

function getSeverityColor(severity) {
    const key = String(severity || '').trim().toLowerCase();
    if (key === 'extreme') return '#ef4444';
    if (key === 'severe') return '#f97316';
    if (key === 'moderate') return '#f59e0b';
    if (key === 'minor') return '#facc15';
    return '#fb7185';
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
        return { lng: avg.lng / points.length, lat: avg.lat / points.length };
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

function normalizeAlertOverlays(payload) {
    const features = Array.isArray(payload?.features) ? payload.features : [];
    const nowMs = Date.now();
    const dedup = new Map();

    for (const feature of features) {
        const props = feature?.properties || {};
        const center = computeGeometryCenter(feature?.geometry);
        if (!center) continue;

        const expiresTs = Date.parse(String(props.expires || ''));
        if (Number.isFinite(expiresTs) && expiresTs < nowMs) continue;

        const rawId = feature?.id || props.id || `${props.event}-${props.areaDesc}`;
        const id = String(rawId || '')
            .replace(/^urn:oid:/i, '')
            .replace(/[^a-zA-Z0-9_.-]/g, '_');
        if (!id) continue;

        dedup.set(id, {
            id: `wx-alert-${id}`,
            name: props.event || 'Weather Alert',
            country: 'US',
            lat: center.lat,
            lng: center.lng,
            weatherCode: -1,
            condition: `ALERT: ${props.event || 'Weather Alert'}`,
            color: getSeverityColor(props.severity),
            temperature: 'N/A',
            humidity: 'N/A',
            windSpeed: 'N/A',
            windDirection: 'N/A',
            updated: toIsoOrNA(props.sent || props.updated),
            source: 'NOAA / NWS Alerts',
            reference:
                props['@id'] ||
                props.web ||
                feature?.id ||
                API_URLS.NWS_ALERTS_ACTIVE,
            alertSeverity: props.severity || 'Unknown',
            alertUrgency: props.urgency || 'Unknown',
            alertArea: props.areaDesc || 'N/A',
        });
    }

    return Array.from(dedup.values()).slice(0, MAX_ALERT_OVERLAYS);
}

function chunkArray(items, size) {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

function getWeatherStyle(code) {
    return WEATHER_CODE_MAP[code] || { label: 'Unknown', color: '#9ca3af' };
}

function createWeatherIconDataUri(colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 30, 30);
    ctx.beginPath();
    ctx.arc(15, 15, 9, 0, Math.PI * 2);
    ctx.fillStyle = `${colorHex}33`;
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = colorHex;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(11, 15, 4.2, 0, Math.PI * 2);
    ctx.arc(16.5, 13.2, 5.3, 0, Math.PI * 2);
    ctx.arc(19.6, 15.2, 3.8, 0, Math.PI * 2);
    ctx.fillStyle = colorHex;
    ctx.fill();

    return canvas.toDataURL('image/png');
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

async function fetchWeatherBatch(batchNodes) {
    const latitudes = batchNodes.map((node) => node.lat).join(',');
    const longitudes = batchNodes.map((node) => node.lng).join(',');
    const url = `${API_URLS.OPEN_METEO_CURRENT}&latitude=${encodeURIComponent(latitudes)}&longitude=${encodeURIComponent(longitudes)}`;
    const payload = await fetchJsonWithTimeout(url);
    return Array.isArray(payload) ? payload : [payload];
}

function normalizeWeatherResponse(batchNodes, responseList) {
    return batchNodes
        .map((node, index) => {
            const item = responseList[index];
            const current = item?.current || {};
            const weatherCode = Number(current.weather_code);
            const weatherStyle = getWeatherStyle(weatherCode);
            const temperature = Number(current.temperature_2m);
            const humidity = Number(current.relative_humidity_2m);
            const windSpeed = Number(current.wind_speed_10m);
            const windDirection = Number(current.wind_direction_10m);

            return {
                id: node.id,
                name: node.name,
                country: node.country,
                lat: node.lat,
                lng: node.lng,
                weatherCode: Number.isFinite(weatherCode) ? weatherCode : -1,
                condition: weatherStyle.label,
                color: weatherStyle.color,
                temperature: Number.isFinite(temperature) ? `${temperature.toFixed(1)} °C` : 'N/A',
                humidity: Number.isFinite(humidity) ? `${Math.round(humidity)} %` : 'N/A',
                windSpeed: Number.isFinite(windSpeed) ? `${windSpeed.toFixed(1)} km/h` : 'N/A',
                windDirection: Number.isFinite(windDirection) ? `${Math.round(windDirection)}°` : 'N/A',
                updated: current.time || 'N/A',
                source: 'Open-Meteo',
                reference: 'https://open-meteo.com/',
            };
        });
}

export default function WeatherLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.weather.enabled);
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

    const getIcon = useCallback((color) => {
        if (iconCacheRef.current.has(color)) {
            return iconCacheRef.current.get(color);
        }
        const icon = createWeatherIconDataUri(color);
        iconCacheRef.current.set(color, icon);
        return icon;
    }, []);

    const upsertWeather = useCallback((entries) => {
        const currentIds = new Set();

        entries.forEach((entry) => {
            const entityId = `weather-${entry.id}`;
            currentIds.add(entityId);
            const position = Cesium.Cartesian3.fromDegrees(entry.lng, entry.lat, 200);
            const icon = getIcon(entry.color);

            if (entitiesRef.current.has(entityId)) {
                const entity = entitiesRef.current.get(entityId);
                entity.position = position;
                entity.name = `${entry.name} Weather`;
                entity.billboard.image = icon;
                entity.properties.condition = entry.condition;
                entity.properties.temperature = entry.temperature;
                entity.properties.humidity = entry.humidity;
                entity.properties.windSpeed = entry.windSpeed;
                entity.properties.windDirection = entry.windDirection;
                entity.properties.updated = entry.updated;
                entity.properties.alertSeverity = entry.alertSeverity || 'N/A';
                entity.properties.alertUrgency = entry.alertUrgency || 'N/A';
                entity.properties.alertArea = entry.alertArea || 'N/A';
                return;
            }

            const entity = viewer.entities.add({
                id: entityId,
                position,
                name: `${entry.name} Weather`,
                billboard: {
                    image: icon,
                    scale: 0.6,
                    alignedAxis: Cesium.Cartesian3.UNIT_Z,
                    disableDepthTestDistance: 9000000,
                },
                properties: {
                    _layerType: 'weather',
                    city: entry.name,
                    country: entry.country,
                    condition: entry.condition,
                    temperature: entry.temperature,
                    humidity: entry.humidity,
                    windSpeed: entry.windSpeed,
                    windDirection: entry.windDirection,
                    updated: entry.updated,
                    alertSeverity: entry.alertSeverity || 'N/A',
                    alertUrgency: entry.alertUrgency || 'N/A',
                    alertArea: entry.alertArea || 'N/A',
                    latitude: entry.lat.toFixed(4),
                    longitude: entry.lng.toFixed(4),
                    source: entry.source,
                    reference: entry.reference,
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

    const pollWeather = useCallback(async () => {
        if (!isEnabled) return;
        try {
            if (!entitiesRef.current.size) {
                setStatus('weather', 'loading');
            }

            const chunks = chunkArray(WEATHER_NODES, BATCH_SIZE);
            const responses = await Promise.all(chunks.map((chunk) => fetchWeatherBatch(chunk)));
            const weatherEntries = chunks.flatMap((chunk, index) =>
                normalizeWeatherResponse(chunk, responses[index] || [])
            );
            let alertEntries = [];
            try {
                const alertPayload = await fetchJsonWithTimeout(API_URLS.NWS_ALERTS_ACTIVE);
                alertEntries = normalizeAlertOverlays(alertPayload);
            } catch (err) {
                // Alerts are optional and US-specific; weather grid still remains global.
                alertEntries = [];
            }

            const entries = [...weatherEntries, ...alertEntries];

            if (!entries.length) throw new Error('No weather entries');

            upsertWeather(entries);
            updateData('weather', entries);
            setStatus('weather', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('weather', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('weather', []);
            }
        }
    }, [isEnabled, setStatus, upsertWeather, updateData, viewer]);

    useEffect(() => {
        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
            updateData('weather', []);
            setStatus('weather', 'idle');
            return;
        }

        pollWeather();
        pollTimerRef.current = setInterval(pollWeather, POLL_INTERVALS.WEATHER);

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        };
    }, [isEnabled, pollWeather, clearEntities, updateData, setStatus]);

    return null;
}
