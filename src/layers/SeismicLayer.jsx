import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 12000;
const IRIS_LOOKBACK_DAYS = 7;
const IRIS_MIN_MAGNITUDE = 2.5;
const MAX_SEISMIC_EVENTS = 2500;

function formatDateOnly(date) {
    return date.toISOString().slice(0, 10);
}

function buildIrisQueryUrl() {
    const end = new Date();
    const start = new Date(end.getTime() - IRIS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
        format: 'text',
        starttime: formatDateOnly(start),
        endtime: formatDateOnly(end),
        minmagnitude: String(IRIS_MIN_MAGNITUDE),
        limit: String(MAX_SEISMIC_EVENTS),
    });
    return `${API_URLS.IRIS_EARTHQUAKES_TEXT}&${params.toString()}`;
}

async function fetchJsonWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchTextWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } finally {
        clearTimeout(timeoutId);
    }
}

function normalizeGeoJsonFeatures(payload, sourceLabel) {
    const features = Array.isArray(payload?.features) ? payload.features : [];
    return features
        .map((feature) => {
            const coordinates = feature?.geometry?.coordinates;
            if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

            const [lng, lat, depth = 0] = coordinates;
            const properties = feature?.properties || {};
            const mag = Number(properties.mag);
            const eventTime = Number(properties.time);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            return {
                id: feature.id || `${eventTime}-${lat}-${lng}`,
                geometry: {
                    type: 'Point',
                    coordinates: [lng, lat, Number.isFinite(depth) ? depth : 0],
                },
                properties: {
                    ...properties,
                    mag: Number.isFinite(mag) ? mag : 0,
                    time: Number.isFinite(eventTime) ? eventTime : Date.now(),
                    source: sourceLabel,
                },
            };
        })
        .filter(Boolean);
}

function parseIrisTextFeed(text) {
    if (!text || typeof text !== 'string') return [];
    const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));

    return lines
        .map((line) => {
            const parts = line.split('|');
            if (parts.length < 12) return null;

            const [
                eventId,
                eventTime,
                latRaw,
                lngRaw,
                depthRaw,
                ,
                ,
                ,
                ,
                magType,
                magRaw,
                ,
                place,
            ] = parts;

            const lat = Number(latRaw);
            const lng = Number(lngRaw);
            const depth = Number(depthRaw);
            const mag = Number(magRaw);
            const timeMs = Date.parse(eventTime);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            return {
                id: eventId || `${timeMs}-${lat}-${lng}`,
                geometry: {
                    type: 'Point',
                    coordinates: [lng, lat, Number.isFinite(depth) ? depth : 0],
                },
                properties: {
                    mag: Number.isFinite(mag) ? mag : 0,
                    magType: magType || 'N/A',
                    place: place || 'Unknown',
                    title: `${magType || 'EQ'} ${Number.isFinite(mag) ? mag.toFixed(1) : 'N/A'} - ${place || 'Unknown'}`,
                    time: Number.isFinite(timeMs) ? timeMs : Date.now(),
                    tsunami: 0,
                    source: 'IRIS',
                },
            };
        })
        .filter(Boolean);
}

function dedupeFeatures(features) {
    const seen = new Set();
    const result = [];

    for (const feature of features) {
        const coords = feature?.geometry?.coordinates || [];
        const props = feature?.properties || {};
        const eventTime = Number(props.time) || 0;
        const lat = Number(coords[1]);
        const lng = Number(coords[0]);
        const key = feature.id || `${eventTime}-${lat.toFixed(3)}-${lng.toFixed(3)}`;

        if (seen.has(key)) continue;
        seen.add(key);
        result.push(feature);

        if (result.length >= MAX_SEISMIC_EVENTS) break;
    }

    return result;
}

export default function SeismicLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.seismic.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);
    const entitiesRef = useRef([]);
    const pollTimerRef = useRef(null);

    const clearEntities = useCallback(() => {
        entitiesRef.current.forEach((entity) => {
            if (!viewer.isDestroyed()) viewer.entities.remove(entity);
        });
        entitiesRef.current = [];
    }, [viewer]);

    const renderFeatures = useCallback((features) => {
        clearEntities();
        updateData('seismic', features);

        features.forEach((feature) => {
            const { geometry, properties } = feature;
            if (!geometry || !properties) return;

            const [lng, lat, depth] = geometry.coordinates;
            const mag = properties.mag;

            // Color based on magnitude
            let color = Cesium.Color.fromCssColorString('#ffaa00').withAlpha(0.6); // Amber
            if (mag > 5.0) color = Cesium.Color.fromCssColorString('#ff3333').withAlpha(0.7); // Red

            // Size based on magnitude
            const radius = Math.max(10000, mag * 25000);

            const entity = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
                name: properties.title,
                ellipse: {
                    semiMinorAxis: radius,
                    semiMajorAxis: radius,
                    material: new Cesium.ColorMaterialProperty(color),
                    outline: true,
                    outlineColor: Cesium.Color.fromCssColorString('#ff3333'),
                    outlineWidth: 2,
                },
                properties: {
                    _layerType: 'seismic',
                    magnitude: mag,
                    depth: `${depth} km`,
                    location: properties.place,
                    time: new Date(properties.time).toISOString(),
                    tsunami: properties.tsunami ? 'Warning Issued' : 'None',
                },
            });

            entitiesRef.current.push(entity);
        });
    }, [clearEntities, updateData, viewer]);

    const pollSeismic = useCallback(async () => {
        if (!isEnabled) return;

        try {
            if (!entitiesRef.current.length) {
                setStatus('seismic', 'loading');
            }

            const usgsResults = await Promise.allSettled([
                fetchJsonWithTimeout(API_URLS.USGS_EARTHQUAKES_HOUR),
                fetchJsonWithTimeout(API_URLS.USGS_EARTHQUAKES_DAY),
            ]);

            const usgsFeatures = [];
            if (usgsResults[0].status === 'fulfilled') {
                usgsFeatures.push(...normalizeGeoJsonFeatures(usgsResults[0].value, 'USGS_HOUR'));
            }
            if (usgsResults[1].status === 'fulfilled') {
                usgsFeatures.push(...normalizeGeoJsonFeatures(usgsResults[1].value, 'USGS_DAY'));
            }

            let features = dedupeFeatures(usgsFeatures);

            // Fallback source for resilience when USGS endpoint is unavailable.
            if (!features.length) {
                const irisText = await fetchTextWithTimeout(buildIrisQueryUrl());
                features = dedupeFeatures(parseIrisTextFeed(irisText));
            }

            if (!features.length) {
                throw new Error('No seismic events available from configured feeds');
            }

            renderFeatures(features);
            setStatus('seismic', 'active');
            viewer.scene.requestRender();
        } catch (error) {
            setStatus('seismic', entitiesRef.current.length ? 'active' : 'error');
            if (!entitiesRef.current.length) {
                updateData('seismic', []);
            }
        }
    }, [isEnabled, renderFeatures, setStatus, updateData, viewer]);

    useEffect(() => {
        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
            updateData('seismic', []);
            setStatus('seismic', 'idle');
            return;
        }

        pollSeismic();
        pollTimerRef.current = setInterval(pollSeismic, POLL_INTERVALS.SEISMIC);

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        };
    }, [isEnabled, pollSeismic, clearEntities, setStatus, updateData]);

    return null;
}
