import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 12000;
const BATCH_SIZE = 24;

const WEATHER_NODES = [
    { id: 'nyc', name: 'New York', country: 'US', lat: 40.7128, lng: -74.0060 },
    { id: 'la', name: 'Los Angeles', country: 'US', lat: 34.0522, lng: -118.2437 },
    { id: 'chicago', name: 'Chicago', country: 'US', lat: 41.8781, lng: -87.6298 },
    { id: 'toronto', name: 'Toronto', country: 'CA', lat: 43.6532, lng: -79.3832 },
    { id: 'mexico_city', name: 'Mexico City', country: 'MX', lat: 19.4326, lng: -99.1332 },
    { id: 'sao_paulo', name: 'Sao Paulo', country: 'BR', lat: -23.5505, lng: -46.6333 },
    { id: 'buenos_aires', name: 'Buenos Aires', country: 'AR', lat: -34.6037, lng: -58.3816 },
    { id: 'lima', name: 'Lima', country: 'PE', lat: -12.0464, lng: -77.0428 },
    { id: 'bogota', name: 'Bogota', country: 'CO', lat: 4.711, lng: -74.0721 },
    { id: 'london', name: 'London', country: 'GB', lat: 51.5072, lng: -0.1276 },
    { id: 'paris', name: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522 },
    { id: 'berlin', name: 'Berlin', country: 'DE', lat: 52.52, lng: 13.4050 },
    { id: 'madrid', name: 'Madrid', country: 'ES', lat: 40.4168, lng: -3.7038 },
    { id: 'rome', name: 'Rome', country: 'IT', lat: 41.9028, lng: 12.4964 },
    { id: 'amsterdam', name: 'Amsterdam', country: 'NL', lat: 52.3676, lng: 4.9041 },
    { id: 'stockholm', name: 'Stockholm', country: 'SE', lat: 59.3293, lng: 18.0686 },
    { id: 'warsaw', name: 'Warsaw', country: 'PL', lat: 52.2297, lng: 21.0122 },
    { id: 'istanbul', name: 'Istanbul', country: 'TR', lat: 41.0082, lng: 28.9784 },
    { id: 'moscow', name: 'Moscow', country: 'RU', lat: 55.7558, lng: 37.6173 },
    { id: 'cairo', name: 'Cairo', country: 'EG', lat: 30.0444, lng: 31.2357 },
    { id: 'lagos', name: 'Lagos', country: 'NG', lat: 6.5244, lng: 3.3792 },
    { id: 'nairobi', name: 'Nairobi', country: 'KE', lat: -1.2864, lng: 36.8172 },
    { id: 'johannesburg', name: 'Johannesburg', country: 'ZA', lat: -26.2041, lng: 28.0473 },
    { id: 'casablanca', name: 'Casablanca', country: 'MA', lat: 33.5731, lng: -7.5898 },
    { id: 'addis_ababa', name: 'Addis Ababa', country: 'ET', lat: 8.9806, lng: 38.7578 },
    { id: 'dubai', name: 'Dubai', country: 'AE', lat: 25.2048, lng: 55.2708 },
    { id: 'riyadh', name: 'Riyadh', country: 'SA', lat: 24.7136, lng: 46.6753 },
    { id: 'tehran', name: 'Tehran', country: 'IR', lat: 35.6892, lng: 51.3890 },
    { id: 'jerusalem', name: 'Jerusalem', country: 'IL', lat: 31.7683, lng: 35.2137 },
    { id: 'karachi', name: 'Karachi', country: 'PK', lat: 24.8607, lng: 67.0011 },
    { id: 'mumbai', name: 'Mumbai', country: 'IN', lat: 19.0760, lng: 72.8777 },
    { id: 'delhi', name: 'Delhi', country: 'IN', lat: 28.6139, lng: 77.2090 },
    { id: 'kolkata', name: 'Kolkata', country: 'IN', lat: 22.5726, lng: 88.3639 },
    { id: 'bangkok', name: 'Bangkok', country: 'TH', lat: 13.7563, lng: 100.5018 },
    { id: 'jakarta', name: 'Jakarta', country: 'ID', lat: -6.2088, lng: 106.8456 },
    { id: 'singapore', name: 'Singapore', country: 'SG', lat: 1.3521, lng: 103.8198 },
    { id: 'kuala_lumpur', name: 'Kuala Lumpur', country: 'MY', lat: 3.1390, lng: 101.6869 },
    { id: 'manila', name: 'Manila', country: 'PH', lat: 14.5995, lng: 120.9842 },
    { id: 'hong_kong', name: 'Hong Kong', country: 'HK', lat: 22.3193, lng: 114.1694 },
    { id: 'shanghai', name: 'Shanghai', country: 'CN', lat: 31.2304, lng: 121.4737 },
    { id: 'beijing', name: 'Beijing', country: 'CN', lat: 39.9042, lng: 116.4074 },
    { id: 'seoul', name: 'Seoul', country: 'KR', lat: 37.5665, lng: 126.9780 },
    { id: 'tokyo', name: 'Tokyo', country: 'JP', lat: 35.6895, lng: 139.6917 },
    { id: 'osaka', name: 'Osaka', country: 'JP', lat: 34.6937, lng: 135.5023 },
    { id: 'sydney', name: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093 },
    { id: 'melbourne', name: 'Melbourne', country: 'AU', lat: -37.8136, lng: 144.9631 },
    { id: 'brisbane', name: 'Brisbane', country: 'AU', lat: -27.4698, lng: 153.0251 },
    { id: 'auckland', name: 'Auckland', country: 'NZ', lat: -36.8509, lng: 174.7645 },
    { id: 'honolulu', name: 'Honolulu', country: 'US', lat: 21.3069, lng: -157.8583 },
    { id: 'anchorage', name: 'Anchorage', country: 'US', lat: 61.2181, lng: -149.9003 },
];

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
            const entries = chunks.flatMap((chunk, index) =>
                normalizeWeatherResponse(chunk, responses[index] || [])
            );

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
