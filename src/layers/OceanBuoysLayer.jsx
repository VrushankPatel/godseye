import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 12000;
const MAX_BUOYS = 3200;

function parseNumber(value) {
    if (value === undefined || value === null) return null;
    const raw = String(value).trim();
    if (!raw || raw === 'MM') return null;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

function toIsoTimestamp(parts) {
    const [year, month, day, hour, minute] = parts.map((value) =>
        Number.parseInt(String(value), 10)
    );
    if (
        !Number.isFinite(year) ||
        !Number.isFinite(month) ||
        !Number.isFinite(day) ||
        !Number.isFinite(hour) ||
        !Number.isFinite(minute)
    ) {
        return 'N/A';
    }
    const utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    return utc.toISOString();
}

function buildBuoyStyle(windSpeedMs) {
    if (!Number.isFinite(windSpeedMs)) {
        return { color: '#38bdf8', code: 'BY' };
    }
    if (windSpeedMs >= 20) return { color: '#ef4444', code: 'HV' };
    if (windSpeedMs >= 12) return { color: '#f97316', code: 'GW' };
    if (windSpeedMs >= 8) return { color: '#eab308', code: 'MW' };
    return { color: '#38bdf8', code: 'BY' };
}

function createBuoyIcon(style) {
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
    ctx.fillText(style.code, 17, 17);

    return canvas.toDataURL('image/png');
}

function normalizeBuoyRows(rawText) {
    const lines = String(rawText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.startsWith('#'));

    const results = [];
    for (const line of lines) {
        const cols = line.split(/\s+/);
        if (cols.length < 22) continue;

        const station = cols[0];
        const lat = parseNumber(cols[1]);
        const lng = parseNumber(cols[2]);
        if (!station || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const windDir = parseNumber(cols[8]);
        const windSpeed = parseNumber(cols[9]);
        const gust = parseNumber(cols[10]);
        const waveHeight = parseNumber(cols[11]);
        const dominantPeriod = parseNumber(cols[12]);
        const averagePeriod = parseNumber(cols[13]);
        const meanWaveDir = parseNumber(cols[14]);
        const pressure = parseNumber(cols[15]);
        const pressureTendency = parseNumber(cols[16]);
        const airTemp = parseNumber(cols[17]);
        const waterTemp = parseNumber(cols[18]);
        const dewPoint = parseNumber(cols[19]);
        const visibility = parseNumber(cols[20]);
        const tide = parseNumber(cols[21]);
        const style = buildBuoyStyle(windSpeed);

        results.push({
            id: station,
            name: `Buoy ${station}`,
            lat,
            lng,
            timestamp: toIsoTimestamp(cols.slice(3, 8)),
            windDirection: Number.isFinite(windDir) ? `${Math.round(windDir)}°` : 'N/A',
            windSpeed: Number.isFinite(windSpeed) ? `${windSpeed.toFixed(1)} m/s` : 'N/A',
            gust: Number.isFinite(gust) ? `${gust.toFixed(1)} m/s` : 'N/A',
            waveHeight: Number.isFinite(waveHeight) ? `${waveHeight.toFixed(1)} m` : 'N/A',
            dominantWavePeriod: Number.isFinite(dominantPeriod) ? `${Math.round(dominantPeriod)} s` : 'N/A',
            averageWavePeriod: Number.isFinite(averagePeriod) ? `${Math.round(averagePeriod)} s` : 'N/A',
            meanWaveDirection: Number.isFinite(meanWaveDir) ? `${Math.round(meanWaveDir)}°` : 'N/A',
            pressure: Number.isFinite(pressure) ? `${pressure.toFixed(1)} hPa` : 'N/A',
            pressureTendency: Number.isFinite(pressureTendency) ? `${pressureTendency.toFixed(1)} hPa` : 'N/A',
            airTemp: Number.isFinite(airTemp) ? `${airTemp.toFixed(1)} °C` : 'N/A',
            waterTemp: Number.isFinite(waterTemp) ? `${waterTemp.toFixed(1)} °C` : 'N/A',
            dewPoint: Number.isFinite(dewPoint) ? `${dewPoint.toFixed(1)} °C` : 'N/A',
            visibility: Number.isFinite(visibility) ? `${visibility.toFixed(1)} nmi` : 'N/A',
            tide: Number.isFinite(tide) ? `${tide.toFixed(2)} ft` : 'N/A',
            source: 'NOAA NDBC',
            reference: `https://www.ndbc.noaa.gov/station_page.php?station=${encodeURIComponent(station)}`,
            style,
        });
    }

    return results.slice(0, MAX_BUOYS);
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

export default function OceanBuoysLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.oceanBuoys.enabled);
    const cachedBuoys = useStore((s) => s.layers.oceanBuoys.data);
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

    const setEntitiesVisible = useCallback((visible) => {
        entitiesRef.current.forEach((entity) => {
            entity.show = visible;
        });
    }, []);

    const getIcon = useCallback((style) => {
        const key = `${style.code}|${style.color}`;
        if (iconCacheRef.current.has(key)) {
            return iconCacheRef.current.get(key);
        }
        const icon = createBuoyIcon(style);
        iconCacheRef.current.set(key, icon);
        return icon;
    }, []);

    const upsertBuoys = useCallback(
        (buoys) => {
            const currentIds = new Set();

            buoys.forEach((buoy) => {
                const entityId = `ocean-buoy-${buoy.id}`;
                currentIds.add(entityId);
                const position = Cesium.Cartesian3.fromDegrees(buoy.lng, buoy.lat, 180);
                const icon = getIcon(buoy.style);

                if (entitiesRef.current.has(entityId)) {
                    const entity = entitiesRef.current.get(entityId);
                    entity.position = position;
                    entity.name = buoy.name;
                    if (entity.billboard) entity.billboard.image = icon;
                    entity.properties.station = buoy.id;
                    entity.properties.timestamp = buoy.timestamp;
                    entity.properties.windDirection = buoy.windDirection;
                    entity.properties.windSpeed = buoy.windSpeed;
                    entity.properties.gust = buoy.gust;
                    entity.properties.waveHeight = buoy.waveHeight;
                    entity.properties.dominantWavePeriod = buoy.dominantWavePeriod;
                    entity.properties.averageWavePeriod = buoy.averageWavePeriod;
                    entity.properties.meanWaveDirection = buoy.meanWaveDirection;
                    entity.properties.pressure = buoy.pressure;
                    entity.properties.pressureTendency = buoy.pressureTendency;
                    entity.properties.airTemp = buoy.airTemp;
                    entity.properties.waterTemp = buoy.waterTemp;
                    entity.properties.dewPoint = buoy.dewPoint;
                    entity.properties.visibility = buoy.visibility;
                    entity.properties.tide = buoy.tide;
                    entity.properties.latitude = buoy.lat.toFixed(4);
                    entity.properties.longitude = buoy.lng.toFixed(4);
                    entity.properties.reference = buoy.reference;
                    return;
                }

                const entity = viewer.entities.add({
                    id: entityId,
                    position,
                    name: buoy.name,
                    billboard: {
                        image: icon,
                        scale: 0.6,
                        alignedAxis: Cesium.Cartesian3.UNIT_Z,
                        disableDepthTestDistance: 9000000,
                    },
                    properties: {
                        _layerType: 'oceanBuoys',
                        station: buoy.id,
                        timestamp: buoy.timestamp,
                        windDirection: buoy.windDirection,
                        windSpeed: buoy.windSpeed,
                        gust: buoy.gust,
                        waveHeight: buoy.waveHeight,
                        dominantWavePeriod: buoy.dominantWavePeriod,
                        averageWavePeriod: buoy.averageWavePeriod,
                        meanWaveDirection: buoy.meanWaveDirection,
                        pressure: buoy.pressure,
                        pressureTendency: buoy.pressureTendency,
                        airTemp: buoy.airTemp,
                        waterTemp: buoy.waterTemp,
                        dewPoint: buoy.dewPoint,
                        visibility: buoy.visibility,
                        tide: buoy.tide,
                        source: buoy.source,
                        reference: buoy.reference,
                        latitude: buoy.lat.toFixed(4),
                        longitude: buoy.lng.toFixed(4),
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

    const pollBuoys = useCallback(async () => {
        if (!isEnabled) return;
        try {
            if (!entitiesRef.current.size) {
                setStatus('oceanBuoys', 'loading');
            }

            let raw = '';
            let lastError = null;
            const candidates = [
                API_URLS.NDBC_LATEST_OBS_PROXY,
                API_URLS.NDBC_LATEST_OBS_PROXY_ALT,
                API_URLS.NDBC_LATEST_OBS,
            ];
            for (const candidate of candidates) {
                try {
                    raw = await fetchTextWithTimeout(candidate);
                    if (raw) break;
                } catch (err) {
                    lastError = err;
                }
            }
            if (!raw && lastError) {
                throw lastError;
            }

            const buoys = normalizeBuoyRows(raw);
            if (!buoys.length) throw new Error('No buoy observations returned');

            upsertBuoys(buoys);
            updateData('oceanBuoys', buoys);
            setStatus('oceanBuoys', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('oceanBuoys', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('oceanBuoys', []);
            }
        }
    }, [isEnabled, setStatus, upsertBuoys, updateData, viewer]);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return undefined;

        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            setEntitiesVisible(false);
            setStatus('oceanBuoys', 'idle');
            viewer.scene.requestRender();
            return undefined;
        }

        if (Array.isArray(cachedBuoys) && cachedBuoys.length) {
            upsertBuoys(cachedBuoys);
            setEntitiesVisible(true);
            setStatus('oceanBuoys', 'active');
            viewer.scene.requestRender();
        }

        pollBuoys();
        pollTimerRef.current = setInterval(
            pollBuoys,
            POLL_INTERVALS.OCEAN_BUOYS || 300000
        );

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        };
    }, [
        cachedBuoys,
        isEnabled,
        pollBuoys,
        setEntitiesVisible,
        setStatus,
        upsertBuoys,
        viewer,
    ]);

    useEffect(
        () => () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        },
        [clearEntities]
    );

    return null;
}
