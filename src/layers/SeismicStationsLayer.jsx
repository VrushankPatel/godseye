import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 15000;
const MAX_STATIONS = 14000;

const STATION_STYLE = {
    active: {
        pointColor: Cesium.Color.fromCssColorString('#22d3ee').withAlpha(0.95),
        outlineColor: Cesium.Color.fromCssColorString('#0f172a').withAlpha(0.95),
        pixelSize: 5,
        status: 'ACTIVE',
    },
    inactive: {
        pointColor: Cesium.Color.fromCssColorString('#64748b').withAlpha(0.75),
        outlineColor: Cesium.Color.fromCssColorString('#0f172a').withAlpha(0.95),
        pixelSize: 3,
        status: 'INACTIVE',
    },
};

function toIsoOrNA(value) {
    if (!value) return 'N/A';
    const ts = Date.parse(String(value));
    return Number.isFinite(ts) ? new Date(ts).toISOString() : 'N/A';
}

function buildIrisStationsQueryUrl() {
    const today = new Date().toISOString().slice(0, 10);
    const params = new URLSearchParams({
        endafter: today,
    });
    return `${API_URLS.IRIS_STATIONS_TEXT}&${params.toString()}`;
}

function parseStationRows(rawText) {
    const nowMs = Date.now();
    const lines = String(rawText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));

    const dedupByStation = new Map();

    for (const line of lines) {
        const cols = line.split('|').map((value) => value.trim());
        if (cols.length < 8) continue;

        const network = cols[0] || '';
        const station = cols[1] || '';
        const lat = Number.parseFloat(cols[2]);
        const lng = Number.parseFloat(cols[3]);
        const elevation = Number.parseFloat(cols[4]);
        const siteName = cols[5] || 'Unknown Station';
        const startTimeRaw = cols[6] || '';
        const endTimeRaw = cols[7] || '';

        if (!network || !station) continue;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const startMs = Date.parse(startTimeRaw);
        const endMs = Date.parse(endTimeRaw);
        const isActive = !Number.isFinite(endMs) || endMs >= nowMs;
        const rank = (isActive ? 10_000_000_000_000 : 0) + (Number.isFinite(startMs) ? startMs : 0);

        const stationKey = `${network}.${station}`;
        const prev = dedupByStation.get(stationKey);
        if (prev && prev._rank > rank) {
            continue;
        }

        dedupByStation.set(stationKey, {
            id: stationKey,
            network,
            station,
            name: `${network}.${station}`,
            siteName,
            lat,
            lng,
            elevationMeters: Number.isFinite(elevation) ? elevation : 0,
            isActive,
            operationalStatus: isActive ? 'ACTIVE' : 'INACTIVE',
            startTime: toIsoOrNA(startTimeRaw),
            endTime: toIsoOrNA(endTimeRaw),
            source: 'IRIS FDSN Station Service',
            reference: 'https://service.iris.edu/fdsnws/station/1/',
            _rank: rank,
        });
    }

    return Array.from(dedupByStation.values())
        .sort((a, b) => {
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            if (a.network !== b.network) return a.network.localeCompare(b.network);
            return a.station.localeCompare(b.station);
        })
        .slice(0, MAX_STATIONS)
        .map(({ _rank, ...station }) => station);
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

export default function SeismicStationsLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.seismicStations.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);

    const entitiesRef = useRef(new Map());
    const pollTimerRef = useRef(null);

    const clearEntities = useCallback(() => {
        entitiesRef.current.forEach((entity) => {
            if (!viewer.isDestroyed()) viewer.entities.remove(entity);
        });
        entitiesRef.current.clear();
    }, [viewer]);

    const upsertStations = useCallback(
        (stations) => {
            const activeEntityIds = new Set();

            stations.forEach((station) => {
                const entityId = `seis-station-${station.id}`;
                activeEntityIds.add(entityId);

                const style = station.isActive ? STATION_STYLE.active : STATION_STYLE.inactive;
                const altitude = Math.max(0, station.elevationMeters) + 120;
                const position = Cesium.Cartesian3.fromDegrees(station.lng, station.lat, altitude);

                if (entitiesRef.current.has(entityId)) {
                    const entity = entitiesRef.current.get(entityId);
                    entity.position = position;
                    entity.name = `${station.name} - ${station.siteName}`;

                    if (entity.point) {
                        entity.point.color = style.pointColor;
                        entity.point.outlineColor = style.outlineColor;
                        entity.point.pixelSize = style.pixelSize;
                    }

                    entity.properties.network = station.network;
                    entity.properties.station = station.station;
                    entity.properties.siteName = station.siteName;
                    entity.properties.operationalStatus = style.status;
                    entity.properties.startTime = station.startTime;
                    entity.properties.endTime = station.endTime;
                    entity.properties.elevation = `${Math.round(station.elevationMeters)} m`;
                    entity.properties.latitude = station.lat.toFixed(4);
                    entity.properties.longitude = station.lng.toFixed(4);
                    return;
                }

                const entity = viewer.entities.add({
                    id: entityId,
                    position,
                    name: `${station.name} - ${station.siteName}`,
                    point: {
                        pixelSize: style.pixelSize,
                        color: style.pointColor,
                        outlineColor: style.outlineColor,
                        outlineWidth: 1,
                        disableDepthTestDistance: 9000000,
                    },
                    properties: {
                        _layerType: 'seismicStations',
                        network: station.network,
                        station: station.station,
                        siteName: station.siteName,
                        operationalStatus: style.status,
                        startTime: station.startTime,
                        endTime: station.endTime,
                        elevation: `${Math.round(station.elevationMeters)} m`,
                        source: station.source,
                        reference: station.reference,
                        latitude: station.lat.toFixed(4),
                        longitude: station.lng.toFixed(4),
                    },
                });

                entitiesRef.current.set(entityId, entity);
            });

            for (const [entityId, entity] of entitiesRef.current.entries()) {
                if (!activeEntityIds.has(entityId)) {
                    viewer.entities.remove(entity);
                    entitiesRef.current.delete(entityId);
                }
            }
        },
        [viewer]
    );

    const pollStations = useCallback(async () => {
        if (!isEnabled) return;

        try {
            if (!entitiesRef.current.size) {
                setStatus('seismicStations', 'loading');
            }

            let rawText = '';
            try {
                rawText = await fetchTextWithTimeout(buildIrisStationsQueryUrl());
            } catch (scopedErr) {
                rawText = await fetchTextWithTimeout(API_URLS.IRIS_STATIONS_TEXT);
            }

            const stations = parseStationRows(rawText);
            if (!stations.length) throw new Error('No seismic stations available');

            upsertStations(stations);
            updateData('seismicStations', stations);
            setStatus('seismicStations', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('seismicStations', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('seismicStations', []);
            }
        }
    }, [isEnabled, setStatus, upsertStations, updateData, viewer]);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return undefined;

        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
            updateData('seismicStations', []);
            setStatus('seismicStations', 'idle');
            viewer.scene.requestRender();
            return undefined;
        }

        pollStations();
        pollTimerRef.current = setInterval(
            pollStations,
            POLL_INTERVALS.SEISMIC_STATIONS || 43200000
        );

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        };
    }, [clearEntities, isEnabled, pollStations, setStatus, updateData, viewer]);

    return null;
}
