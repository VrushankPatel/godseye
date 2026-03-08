import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 12000;
const MAX_HAZARDS = 650;

const HAZARD_STYLE = {
    CONVECTIVE: { color: '#ef4444', marker: '#ff6b6b' },
    TURB: { color: '#f97316', marker: '#ff9f43' },
    ICE: { color: '#38bdf8', marker: '#7dd3fc' },
    IFR: { color: '#a855f7', marker: '#c084fc' },
    MTW: { color: '#f59e0b', marker: '#fbbf24' },
    UNKNOWN: { color: '#9ca3af', marker: '#cbd5e1' },
};

function toIsoFromEpochSeconds(value) {
    const sec = Number(value);
    if (!Number.isFinite(sec)) return 'N/A';
    return new Date(sec * 1000).toISOString();
}

function resolveStyle(hazard) {
    const key = String(hazard || '').trim().toUpperCase();
    return HAZARD_STYLE[key] || HAZARD_STYLE.UNKNOWN;
}

function extractPositions(coords) {
    if (!Array.isArray(coords)) return [];
    return coords
        .map((node) => {
            const lat = Number(node?.lat);
            const lon = Number(node?.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
            return { lat, lon };
        })
        .filter(Boolean);
}

function computeCentroid(positions) {
    if (!positions.length) return null;
    const sum = positions.reduce(
        (acc, p) => ({ lat: acc.lat + p.lat, lon: acc.lon + p.lon }),
        { lat: 0, lon: 0 }
    );
    return {
        lat: sum.lat / positions.length,
        lon: sum.lon / positions.length,
    };
}

function normalizeHazards(payload) {
    const rows = Array.isArray(payload) ? payload : [];
    return rows
        .map((row, index) => {
            const positions = extractPositions(row?.coords);
            if (positions.length < 3) return null;

            const centroid = computeCentroid(positions);
            if (!centroid) return null;

            const hazard = String(row?.hazard || 'UNKNOWN').trim().toUpperCase();
            const style = resolveStyle(hazard);
            const icaoId = String(row?.icaoId || '').trim().toUpperCase() || 'UNKNOWN';
            const seriesId = String(row?.seriesId || '').trim().toUpperCase() || `SERIES-${index}`;
            const validFrom = toIsoFromEpochSeconds(row?.validTimeFrom);
            const validTo = toIsoFromEpochSeconds(row?.validTimeTo);
            const hazardType = String(row?.airSigmetType || 'UNKNOWN').trim().toUpperCase();
            const severity = Number.isFinite(Number(row?.severity))
                ? String(Number(row?.severity))
                : 'N/A';
            const altLo1 = Number.isFinite(Number(row?.altitudeLow1))
                ? String(Number(row.altitudeLow1))
                : 'N/A';
            const altLo2 = Number.isFinite(Number(row?.altitudeLow2))
                ? String(Number(row.altitudeLow2))
                : 'N/A';
            const altHi1 = Number.isFinite(Number(row?.altitudeHi1))
                ? String(Number(row.altitudeHi1))
                : 'N/A';
            const altHi2 = Number.isFinite(Number(row?.altitudeHi2))
                ? String(Number(row.altitudeHi2))
                : 'N/A';
            const movementDir = Number.isFinite(Number(row?.movementDir))
                ? `${Math.round(Number(row.movementDir))}°`
                : 'N/A';
            const movementSpd = Number.isFinite(Number(row?.movementSpd))
                ? `${Math.round(Number(row.movementSpd))} kt`
                : 'N/A';

            const id = `airsigmet-${icaoId}-${seriesId}-${String(row?.validTimeFrom || index)}`.replace(
                /[^a-zA-Z0-9_.-]/g,
                '_'
            );

            const positionsFlat = [];
            positions.forEach((p) => {
                positionsFlat.push(p.lon, p.lat);
            });

            return {
                id,
                name: `${hazardType} ${seriesId} ${hazard}`,
                icaoId,
                seriesId,
                hazard,
                hazardType,
                validFrom,
                validTo,
                severity,
                altitudeLow1: altLo1,
                altitudeLow2: altLo2,
                altitudeHigh1: altHi1,
                altitudeHigh2: altHi2,
                movementDir,
                movementSpd,
                rawText: String(row?.rawAirSigmet || 'N/A'),
                receiptTime: String(row?.receiptTime || 'N/A'),
                creationTime: String(row?.creationTime || 'N/A'),
                centroid,
                positionsFlat,
                style,
                source: 'NOAA AviationWeather AIRSIGMET',
                reference: API_URLS.AIRSIGMET,
            };
        })
        .filter(Boolean)
        .slice(0, MAX_HAZARDS);
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

export default function AviationHazardsLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.aviationHazards.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);

    const entitiesRef = useRef(new Map());
    const pollTimerRef = useRef(null);

    const clearEntities = useCallback(() => {
        entitiesRef.current.forEach((bundle) => {
            if (!viewer.isDestroyed()) {
                if (bundle.polygon) viewer.entities.remove(bundle.polygon);
                if (bundle.marker) viewer.entities.remove(bundle.marker);
            }
        });
        entitiesRef.current.clear();
    }, [viewer]);

    const upsertHazards = useCallback(
        (hazards) => {
            const currentIds = new Set();

            hazards.forEach((hazard) => {
                const bundleId = hazard.id;
                currentIds.add(bundleId);
                const centroidPos = Cesium.Cartesian3.fromDegrees(
                    hazard.centroid.lon,
                    hazard.centroid.lat,
                    1600
                );
                const polygonHierarchy = Cesium.Cartesian3.fromDegreesArray(
                    hazard.positionsFlat
                );
                const fillColor = Cesium.Color.fromCssColorString(hazard.style.color).withAlpha(0.22);
                const markerColor = Cesium.Color.fromCssColorString(hazard.style.marker);

                const commonProps = {
                    _layerType: 'aviationHazards',
                    icaoId: hazard.icaoId,
                    seriesId: hazard.seriesId,
                    hazard: hazard.hazard,
                    hazardType: hazard.hazardType,
                    validFrom: hazard.validFrom,
                    validTo: hazard.validTo,
                    severity: hazard.severity,
                    altitudeLow1: hazard.altitudeLow1,
                    altitudeLow2: hazard.altitudeLow2,
                    altitudeHigh1: hazard.altitudeHigh1,
                    altitudeHigh2: hazard.altitudeHigh2,
                    movementDir: hazard.movementDir,
                    movementSpd: hazard.movementSpd,
                    receiptTime: hazard.receiptTime,
                    creationTime: hazard.creationTime,
                    source: hazard.source,
                    reference: hazard.reference,
                    rawText: hazard.rawText,
                    latitude: hazard.centroid.lat.toFixed(4),
                    longitude: hazard.centroid.lon.toFixed(4),
                };

                if (entitiesRef.current.has(bundleId)) {
                    const bundle = entitiesRef.current.get(bundleId);
                    if (bundle.polygon) {
                        bundle.polygon.polygon.hierarchy = polygonHierarchy;
                        bundle.polygon.polygon.material = fillColor;
                        bundle.polygon.name = hazard.name;
                        bundle.polygon.properties = commonProps;
                    }
                    if (bundle.marker) {
                        bundle.marker.position = centroidPos;
                        bundle.marker.name = hazard.name;
                        bundle.marker.point.color = markerColor;
                        bundle.marker.properties = commonProps;
                    }
                    return;
                }

                const polygon = viewer.entities.add({
                    id: `${bundleId}-poly`,
                    name: hazard.name,
                    polygon: {
                        hierarchy: polygonHierarchy,
                        material: fillColor,
                        outline: true,
                        outlineColor: Cesium.Color.fromCssColorString(hazard.style.color).withAlpha(0.8),
                        outlineWidth: 1.5,
                        perPositionHeight: false,
                        height: 0,
                    },
                    properties: commonProps,
                });

                const marker = viewer.entities.add({
                    id: `${bundleId}-marker`,
                    name: hazard.name,
                    position: centroidPos,
                    point: {
                        pixelSize: 7,
                        color: markerColor,
                        outlineColor: Cesium.Color.BLACK.withAlpha(0.55),
                        outlineWidth: 1,
                        disableDepthTestDistance: 9000000,
                    },
                    properties: commonProps,
                });

                entitiesRef.current.set(bundleId, { polygon, marker });
            });

            for (const [bundleId, bundle] of entitiesRef.current.entries()) {
                if (!currentIds.has(bundleId)) {
                    if (bundle.polygon) viewer.entities.remove(bundle.polygon);
                    if (bundle.marker) viewer.entities.remove(bundle.marker);
                    entitiesRef.current.delete(bundleId);
                }
            }
        },
        [viewer]
    );

    const pollHazards = useCallback(async () => {
        if (!isEnabled) return;
        try {
            if (!entitiesRef.current.size) {
                setStatus('aviationHazards', 'loading');
            }

            const payload = await fetchJsonWithTimeout(API_URLS.AIRSIGMET);
            const hazards = normalizeHazards(payload);
            if (!hazards.length) throw new Error('No active aviation hazards');

            upsertHazards(hazards);
            updateData('aviationHazards', hazards);
            setStatus('aviationHazards', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('aviationHazards', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('aviationHazards', []);
            }
        }
    }, [isEnabled, setStatus, upsertHazards, updateData, viewer]);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return undefined;

        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
            updateData('aviationHazards', []);
            setStatus('aviationHazards', 'idle');
            viewer.scene.requestRender();
            return undefined;
        }

        pollHazards();
        pollTimerRef.current = setInterval(
            pollHazards,
            POLL_INTERVALS.AIR_HAZARDS || 300000
        );

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        };
    }, [clearEntities, isEnabled, pollHazards, setStatus, updateData, viewer]);

    return null;
}
