import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 12000;
const MAX_STATIONS = 2600;

const METAR_BBOXES = [
    '-180,-90,-90,0',
    '-90,-90,0,0',
    '0,-90,90,0',
    '90,-90,180,0',
    '-180,0,-90,90',
    '-90,0,0,90',
    '0,0,90,90',
    '90,0,180,90',
];

const FLIGHT_CATEGORY_STYLE = {
    LIFR: { color: '#ef4444', code: 'LR' },
    IFR: { color: '#f97316', code: 'IF' },
    MVFR: { color: '#eab308', code: 'MV' },
    VFR: { color: '#22c55e', code: 'VF' },
    UNKNOWN: { color: '#60a5fa', code: 'UK' },
};

function resolveFlightCategory(value) {
    const raw = String(value || '').trim().toUpperCase();
    if (raw === 'LIFR') return 'LIFR';
    if (raw === 'IFR') return 'IFR';
    if (raw === 'MVFR') return 'MVFR';
    if (raw === 'VFR') return 'VFR';
    return 'UNKNOWN';
}

function createMetarIcon(style) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 32, 32);
    ctx.beginPath();
    ctx.arc(16, 16, 10.5, 0, Math.PI * 2);
    ctx.fillStyle = `${style.color}33`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = style.color;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style.code, 16, 16);

    return canvas.toDataURL('image/png');
}

function toIsoFromEpochSeconds(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 'N/A';
    return new Date(num * 1000).toISOString();
}

function toNullableNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function formatValue(value, unit = '') {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'number') {
        return unit ? `${value} ${unit}` : String(value);
    }
    return String(value);
}

function normalizeMetarRows(rows) {
    if (!Array.isArray(rows)) return [];
    const byStation = new Map();

    rows.forEach((row) => {
        const lat = toNullableNumber(row?.lat);
        const lon = toNullableNumber(row?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        const icao = String(row?.icaoId || '').trim().toUpperCase();
        if (!icao) return;

        const obsTime = Number(row?.obsTime);
        const category = resolveFlightCategory(row?.fltCat || row?.flight_category);
        const style = FLIGHT_CATEGORY_STYLE[category];
        const key = icao;

        const normalized = {
            id: key,
            name: row?.name || `METAR ${icao}`,
            icao,
            lat,
            lon,
            category,
            style,
            observed: toIsoFromEpochSeconds(obsTime),
            windDirection: formatValue(row?.wdir),
            windSpeed: formatValue(toNullableNumber(row?.wspd), 'kt'),
            windGust: formatValue(toNullableNumber(row?.wgst), 'kt'),
            visibility: formatValue(row?.visib),
            altimeter: formatValue(toNullableNumber(row?.altim), 'hPa'),
            temperature: formatValue(toNullableNumber(row?.temp), '°C'),
            dewPoint: formatValue(toNullableNumber(row?.dewp), '°C'),
            weather: formatValue(row?.wxString),
            cloudCover: formatValue(row?.cover),
            rawObservation: formatValue(row?.rawOb),
            source: 'NOAA / AviationWeather.gov METAR',
            reference: `https://aviationweather.gov/data/metar?ids=${encodeURIComponent(icao)}`,
            _obsEpoch: Number.isFinite(obsTime) ? obsTime : 0,
        };

        const existing = byStation.get(key);
        if (!existing || normalized._obsEpoch > existing._obsEpoch) {
            byStation.set(key, normalized);
        }
    });

    return Array.from(byStation.values())
        .sort((a, b) => b._obsEpoch - a._obsEpoch)
        .slice(0, MAX_STATIONS);
}

function buildMetarUrl(bbox) {
    return `https://aviationweather.gov/api/data/metar?bbox=${bbox}&hours=2&format=json`;
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

async function fetchMetarRegion(bbox) {
    const directUrl = buildMetarUrl(bbox);
    try {
        const direct = await fetchJsonWithTimeout(directUrl);
        if (Array.isArray(direct)) return direct;
    } catch (err) {
        // Browser CORS blocks are expected on direct requests.
    }

    const proxyUrl = `${API_URLS.METAR_PROXY_BASE}${encodeURIComponent(directUrl)}`;
    const proxied = await fetchJsonWithTimeout(proxyUrl);
    return Array.isArray(proxied) ? proxied : [];
}

export default function MetarLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.metar.enabled);
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
        const icon = createMetarIcon(style);
        iconCacheRef.current.set(key, icon);
        return icon;
    }, []);

    const upsertStations = useCallback(
        (stations) => {
            const currentIds = new Set();

            stations.forEach((station) => {
                const entityId = `metar-${station.id}`;
                currentIds.add(entityId);
                const position = Cesium.Cartesian3.fromDegrees(station.lon, station.lat, 600);
                const icon = getIcon(station.style);

                if (entitiesRef.current.has(entityId)) {
                    const entity = entitiesRef.current.get(entityId);
                    entity.position = position;
                    entity.name = station.name;
                    if (entity.billboard) entity.billboard.image = icon;
                    entity.properties.category = station.category;
                    entity.properties.observed = station.observed;
                    entity.properties.windDirection = station.windDirection;
                    entity.properties.windSpeed = station.windSpeed;
                    entity.properties.windGust = station.windGust;
                    entity.properties.visibility = station.visibility;
                    entity.properties.altimeter = station.altimeter;
                    entity.properties.temperature = station.temperature;
                    entity.properties.dewPoint = station.dewPoint;
                    entity.properties.weather = station.weather;
                    entity.properties.cloudCover = station.cloudCover;
                    entity.properties.rawObservation = station.rawObservation;
                    entity.properties.latitude = station.lat.toFixed(4);
                    entity.properties.longitude = station.lon.toFixed(4);
                    return;
                }

                const entity = viewer.entities.add({
                    id: entityId,
                    position,
                    name: station.name,
                    billboard: {
                        image: icon,
                        scale: 0.62,
                        alignedAxis: Cesium.Cartesian3.UNIT_Z,
                        disableDepthTestDistance: 9000000,
                    },
                    properties: {
                        _layerType: 'metar',
                        icao: station.icao,
                        category: station.category,
                        observed: station.observed,
                        windDirection: station.windDirection,
                        windSpeed: station.windSpeed,
                        windGust: station.windGust,
                        visibility: station.visibility,
                        altimeter: station.altimeter,
                        temperature: station.temperature,
                        dewPoint: station.dewPoint,
                        weather: station.weather,
                        cloudCover: station.cloudCover,
                        rawObservation: station.rawObservation,
                        source: station.source,
                        reference: station.reference,
                        latitude: station.lat.toFixed(4),
                        longitude: station.lon.toFixed(4),
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

    const pollMetar = useCallback(async () => {
        if (!isEnabled) return;
        try {
            if (!entitiesRef.current.size) {
                setStatus('metar', 'loading');
            }

            const results = await Promise.allSettled(
                METAR_BBOXES.map((bbox) => fetchMetarRegion(bbox))
            );

            const mergedRows = results
                .filter((res) => res.status === 'fulfilled')
                .flatMap((res) => res.value);

            const stations = normalizeMetarRows(mergedRows);
            if (!stations.length) throw new Error('No METAR stations available');

            upsertStations(stations);
            updateData('metar', stations);
            setStatus('metar', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('metar', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('metar', []);
            }
        }
    }, [isEnabled, setStatus, upsertStations, updateData, viewer]);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return undefined;

        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
            updateData('metar', []);
            setStatus('metar', 'idle');
            viewer.scene.requestRender();
            return undefined;
        }

        pollMetar();
        pollTimerRef.current = setInterval(
            pollMetar,
            POLL_INTERVALS.METAR || 180000
        );

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        };
    }, [clearEntities, isEnabled, pollMetar, setStatus, updateData, viewer]);

    return null;
}
