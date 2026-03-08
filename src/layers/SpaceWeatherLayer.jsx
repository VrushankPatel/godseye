import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 12000;
const MIN_PROBABILITY = 8;
const MAX_POINTS = 9000;
const DECIMATION_LON_STEP = 3;
const DECIMATION_LAT_STEP = 2;

function toNormalizedLongitude(lon) {
    if (!Number.isFinite(lon)) return null;
    if (lon > 180) return lon - 360;
    return lon;
}

function getAuroraStyle(probability) {
    if (probability >= 30) return { color: '#ef4444', size: 7.6, code: 'H' };
    if (probability >= 22) return { color: '#f97316', size: 6.6, code: 'M' };
    if (probability >= 15) return { color: '#eab308', size: 5.7, code: 'E' };
    return { color: '#84cc16', size: 4.8, code: 'L' };
}

function createAuroraIcon(style) {
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 30, 30);
    ctx.beginPath();
    ctx.arc(15, 15, 8.8, 0, Math.PI * 2);
    ctx.fillStyle = `${style.color}3d`;
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

function normalizeAuroraGrid(payload) {
    const rows = Array.isArray(payload?.coordinates) ? payload.coordinates : [];
    const observationTime = payload?.['Observation Time'] || 'N/A';
    const forecastTime = payload?.['Forecast Time'] || 'N/A';
    const source = 'NOAA SWPC Aurora Model (Ovation)';

    const filtered = [];
    for (const row of rows) {
        if (!Array.isArray(row) || row.length < 3) continue;
        const rawLon = Number(row[0]);
        const lat = Number(row[1]);
        const probability = Number(row[2]);
        if (!Number.isFinite(rawLon) || !Number.isFinite(lat) || !Number.isFinite(probability)) continue;
        if (probability < MIN_PROBABILITY) continue;

        const lon = toNormalizedLongitude(rawLon);
        if (!Number.isFinite(lon)) continue;

        const lonBucket = Math.round(rawLon);
        const latBucket = Math.round(lat);
        const isHighSignal = probability >= 25;
        const decimationPass =
            lonBucket % DECIMATION_LON_STEP === 0 &&
            latBucket % DECIMATION_LAT_STEP === 0;
        if (!isHighSignal && !decimationPass) continue;

        const style = getAuroraStyle(probability);
        filtered.push({
            id: `aurora-${lonBucket}-${latBucket}`,
            name: 'Aurora Probability Cell',
            lon,
            lat,
            probability,
            style,
            observationTime,
            forecastTime,
            source,
            reference: API_URLS.SWPC_AURORA_LATEST,
        });
    }

    if (filtered.length <= MAX_POINTS) return filtered;

    const stride = Math.ceil(filtered.length / MAX_POINTS);
    return filtered.filter((_, index) => index % stride === 0);
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

export default function SpaceWeatherLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.spaceWeather.enabled);
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
        const key = `${style.code}|${style.color}`;
        if (iconCacheRef.current.has(key)) {
            return iconCacheRef.current.get(key);
        }
        const icon = createAuroraIcon(style);
        iconCacheRef.current.set(key, icon);
        return icon;
    }, []);

    const upsertCells = useCallback(
        (cells) => {
            const currentIds = new Set();

            cells.forEach((cell) => {
                const entityId = `spacewx-${cell.id}`;
                currentIds.add(entityId);
                const position = Cesium.Cartesian3.fromDegrees(cell.lon, cell.lat, 140000);
                const icon = getIcon(cell.style);

                if (entitiesRef.current.has(entityId)) {
                    const entity = entitiesRef.current.get(entityId);
                    entity.position = position;
                    entity.name = cell.name;
                    if (entity.billboard) {
                        entity.billboard.image = icon;
                        entity.billboard.scale = cell.style.size / 7;
                    }
                    entity.properties.probability = `${cell.probability}%`;
                    entity.properties.observationTime = cell.observationTime;
                    entity.properties.forecastTime = cell.forecastTime;
                    entity.properties.latitude = cell.lat.toFixed(2);
                    entity.properties.longitude = cell.lon.toFixed(2);
                    return;
                }

                const entity = viewer.entities.add({
                    id: entityId,
                    position,
                    name: cell.name,
                    billboard: {
                        image: icon,
                        scale: cell.style.size / 7,
                        alignedAxis: Cesium.Cartesian3.UNIT_Z,
                        disableDepthTestDistance: 9000000,
                    },
                    properties: {
                        _layerType: 'spaceWeather',
                        probability: `${cell.probability}%`,
                        band: cell.style.code === 'H' ? 'HIGH' : cell.style.code === 'M' ? 'MEDIUM' : cell.style.code === 'E' ? 'ELEVATED' : 'LOW',
                        observationTime: cell.observationTime,
                        forecastTime: cell.forecastTime,
                        source: cell.source,
                        reference: cell.reference,
                        latitude: cell.lat.toFixed(2),
                        longitude: cell.lon.toFixed(2),
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

    const pollSpaceWeather = useCallback(async () => {
        if (!isEnabled) return;
        try {
            if (!entitiesRef.current.size) {
                setStatus('spaceWeather', 'loading');
            }

            const payload = await fetchJsonWithTimeout(API_URLS.SWPC_AURORA_LATEST);
            const cells = normalizeAuroraGrid(payload);
            if (!cells.length) throw new Error('No aurora cells available');

            upsertCells(cells);
            updateData('spaceWeather', cells);
            setStatus('spaceWeather', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('spaceWeather', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('spaceWeather', []);
            }
        }
    }, [isEnabled, setStatus, upsertCells, updateData, viewer]);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return undefined;

        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
            updateData('spaceWeather', []);
            setStatus('spaceWeather', 'idle');
            viewer.scene.requestRender();
            return undefined;
        }

        pollSpaceWeather();
        pollTimerRef.current = setInterval(
            pollSpaceWeather,
            POLL_INTERVALS.SPACE_WEATHER || 300000
        );

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        };
    }, [clearEntities, isEnabled, pollSpaceWeather, setStatus, updateData, viewer]);

    return null;
}
