import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 12000;
const BATCH_SIZE = 24;

const AIR_QUALITY_NODES = [
    { id: 'delhi', name: 'Delhi', country: 'IN', lat: 28.6139, lng: 77.2090 },
    { id: 'mumbai', name: 'Mumbai', country: 'IN', lat: 19.0760, lng: 72.8777 },
    { id: 'kolkata', name: 'Kolkata', country: 'IN', lat: 22.5726, lng: 88.3639 },
    { id: 'karachi', name: 'Karachi', country: 'PK', lat: 24.8607, lng: 67.0011 },
    { id: 'dhaka', name: 'Dhaka', country: 'BD', lat: 23.8103, lng: 90.4125 },
    { id: 'beijing', name: 'Beijing', country: 'CN', lat: 39.9042, lng: 116.4074 },
    { id: 'shanghai', name: 'Shanghai', country: 'CN', lat: 31.2304, lng: 121.4737 },
    { id: 'seoul', name: 'Seoul', country: 'KR', lat: 37.5665, lng: 126.9780 },
    { id: 'tokyo', name: 'Tokyo', country: 'JP', lat: 35.6895, lng: 139.6917 },
    { id: 'bangkok', name: 'Bangkok', country: 'TH', lat: 13.7563, lng: 100.5018 },
    { id: 'jakarta', name: 'Jakarta', country: 'ID', lat: -6.2088, lng: 106.8456 },
    { id: 'singapore', name: 'Singapore', country: 'SG', lat: 1.3521, lng: 103.8198 },
    { id: 'tehran', name: 'Tehran', country: 'IR', lat: 35.6892, lng: 51.3890 },
    { id: 'riyadh', name: 'Riyadh', country: 'SA', lat: 24.7136, lng: 46.6753 },
    { id: 'cairo', name: 'Cairo', country: 'EG', lat: 30.0444, lng: 31.2357 },
    { id: 'lagos', name: 'Lagos', country: 'NG', lat: 6.5244, lng: 3.3792 },
    { id: 'johannesburg', name: 'Johannesburg', country: 'ZA', lat: -26.2041, lng: 28.0473 },
    { id: 'nairobi', name: 'Nairobi', country: 'KE', lat: -1.2864, lng: 36.8172 },
    { id: 'london', name: 'London', country: 'GB', lat: 51.5072, lng: -0.1276 },
    { id: 'paris', name: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522 },
    { id: 'berlin', name: 'Berlin', country: 'DE', lat: 52.52, lng: 13.4050 },
    { id: 'madrid', name: 'Madrid', country: 'ES', lat: 40.4168, lng: -3.7038 },
    { id: 'rome', name: 'Rome', country: 'IT', lat: 41.9028, lng: 12.4964 },
    { id: 'warsaw', name: 'Warsaw', country: 'PL', lat: 52.2297, lng: 21.0122 },
    { id: 'moscow', name: 'Moscow', country: 'RU', lat: 55.7558, lng: 37.6173 },
    { id: 'new_york', name: 'New York', country: 'US', lat: 40.7128, lng: -74.0060 },
    { id: 'la', name: 'Los Angeles', country: 'US', lat: 34.0522, lng: -118.2437 },
    { id: 'chicago', name: 'Chicago', country: 'US', lat: 41.8781, lng: -87.6298 },
    { id: 'toronto', name: 'Toronto', country: 'CA', lat: 43.6532, lng: -79.3832 },
    { id: 'mexico_city', name: 'Mexico City', country: 'MX', lat: 19.4326, lng: -99.1332 },
    { id: 'sao_paulo', name: 'Sao Paulo', country: 'BR', lat: -23.5505, lng: -46.6333 },
    { id: 'buenos_aires', name: 'Buenos Aires', country: 'AR', lat: -34.6037, lng: -58.3816 },
    { id: 'lima', name: 'Lima', country: 'PE', lat: -12.0464, lng: -77.0428 },
    { id: 'sydney', name: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093 },
    { id: 'melbourne', name: 'Melbourne', country: 'AU', lat: -37.8136, lng: 144.9631 },
    { id: 'auckland', name: 'Auckland', country: 'NZ', lat: -36.8509, lng: 174.7645 },
];

function chunkArray(items, size) {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

function classifyAqi(aqiValue) {
    if (!Number.isFinite(aqiValue)) return { band: 'UNKNOWN', color: '#9ca3af' };
    if (aqiValue <= 50) return { band: 'GOOD', color: '#22c55e' };
    if (aqiValue <= 100) return { band: 'MODERATE', color: '#facc15' };
    if (aqiValue <= 150) return { band: 'UNHEALTHY SENSITIVE', color: '#fb923c' };
    if (aqiValue <= 200) return { band: 'UNHEALTHY', color: '#ef4444' };
    if (aqiValue <= 300) return { band: 'VERY UNHEALTHY', color: '#a855f7' };
    return { band: 'HAZARDOUS', color: '#7f1d1d' };
}

function createAqiIconDataUri(colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 28;
    canvas.height = 28;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 28, 28);
    ctx.beginPath();
    ctx.arc(14, 14, 9.2, 0, Math.PI * 2);
    ctx.fillStyle = `${colorHex}33`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = colorHex;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AQ', 14, 14);

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

async function fetchAirQualityBatch(batchNodes) {
    const latitudes = batchNodes.map((node) => node.lat).join(',');
    const longitudes = batchNodes.map((node) => node.lng).join(',');
    const url = `${API_URLS.OPEN_METEO_AIR_QUALITY}&latitude=${encodeURIComponent(latitudes)}&longitude=${encodeURIComponent(longitudes)}`;
    const payload = await fetchJsonWithTimeout(url);
    return Array.isArray(payload) ? payload : [payload];
}

function normalizeAirQualityBatch(batchNodes, responseList) {
    return batchNodes.map((node, index) => {
        const item = responseList[index];
        const current = item?.current || {};
        const aqiNum = Number(current.us_aqi);
        const pm25 = Number(current.pm2_5);
        const pm10 = Number(current.pm10);
        const no2 = Number(current.nitrogen_dioxide);
        const ozone = Number(current.ozone);
        const classification = classifyAqi(aqiNum);

        return {
            id: node.id,
            name: node.name,
            country: node.country,
            lat: node.lat,
            lng: node.lng,
            aqi: Number.isFinite(aqiNum) ? Math.round(aqiNum) : null,
            band: classification.band,
            color: classification.color,
            pm25: Number.isFinite(pm25) ? `${pm25.toFixed(1)} µg/m³` : 'N/A',
            pm10: Number.isFinite(pm10) ? `${pm10.toFixed(1)} µg/m³` : 'N/A',
            no2: Number.isFinite(no2) ? `${no2.toFixed(1)} µg/m³` : 'N/A',
            ozone: Number.isFinite(ozone) ? `${ozone.toFixed(1)} µg/m³` : 'N/A',
            updated: current.time || 'N/A',
            source: 'Open-Meteo Air Quality',
            reference: 'https://open-meteo.com/en/docs/air-quality-api',
        };
    });
}

export default function AirQualityLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.airQuality.enabled);
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

    const getIcon = useCallback((color) => {
        if (iconCacheRef.current.has(color)) {
            return iconCacheRef.current.get(color);
        }
        const icon = createAqiIconDataUri(color);
        iconCacheRef.current.set(color, icon);
        return icon;
    }, []);

    const upsertAirQuality = useCallback((entries) => {
        const currentIds = new Set();

        entries.forEach((entry) => {
            const entityId = `air-quality-${entry.id}`;
            currentIds.add(entityId);
            const position = Cesium.Cartesian3.fromDegrees(entry.lng, entry.lat, 260);
            const icon = getIcon(entry.color);

            if (entitiesRef.current.has(entityId)) {
                const entity = entitiesRef.current.get(entityId);
                entity.position = position;
                entity.name = `${entry.name} Air Quality`;
                entity.billboard.image = icon;
                entity.properties.aqi = entry.aqi !== null ? String(entry.aqi) : 'N/A';
                entity.properties.band = entry.band;
                entity.properties.pm25 = entry.pm25;
                entity.properties.pm10 = entry.pm10;
                entity.properties.no2 = entry.no2;
                entity.properties.ozone = entry.ozone;
                entity.properties.updated = entry.updated;
                return;
            }

            const entity = viewer.entities.add({
                id: entityId,
                position,
                name: `${entry.name} Air Quality`,
                billboard: {
                    image: icon,
                    scale: 0.62,
                    alignedAxis: Cesium.Cartesian3.UNIT_Z,
                    disableDepthTestDistance: 9000000,
                },
                properties: {
                    _layerType: 'airQuality',
                    city: entry.name,
                    country: entry.country,
                    aqi: entry.aqi !== null ? String(entry.aqi) : 'N/A',
                    band: entry.band,
                    pm25: entry.pm25,
                    pm10: entry.pm10,
                    no2: entry.no2,
                    ozone: entry.ozone,
                    updated: entry.updated,
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

    const pollAirQuality = useCallback(async () => {
        if (!isEnabled) return;
        try {
            if (!entitiesRef.current.size) {
                setStatus('airQuality', 'loading');
            }

            const chunks = chunkArray(AIR_QUALITY_NODES, BATCH_SIZE);
            const responses = await Promise.all(chunks.map((chunk) => fetchAirQualityBatch(chunk)));
            const entries = chunks.flatMap((chunk, index) =>
                normalizeAirQualityBatch(chunk, responses[index] || [])
            );

            if (!entries.length) throw new Error('No air quality entries');

            upsertAirQuality(entries);
            updateData('airQuality', entries);
            setStatus('airQuality', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('airQuality', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('airQuality', []);
            }
        }
    }, [isEnabled, setStatus, upsertAirQuality, updateData, viewer]);

    useEffect(() => {
        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
            updateData('airQuality', []);
            setStatus('airQuality', 'idle');
            return;
        }

        pollAirQuality();
        pollTimerRef.current = setInterval(pollAirQuality, POLL_INTERVALS.AIR_QUALITY);

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        };
    }, [isEnabled, pollAirQuality, clearEntities, updateData, setStatus]);

    return null;
}
