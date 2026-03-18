import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';
import { getRuntimeKey } from '../utils/runtimeEnv';

const REQUEST_TIMEOUT_MS = 16000;
const PORT_PAGE_SIZE = 2000;
const MAX_PORTS = 4200;
const MAX_VESSELS = 5000;
const AIS_SYNC_INTERVAL_MS = 2000;
const AIS_API_KEY = getRuntimeKey('VITE_AISSTREAM_API_KEY', ' AIS live vessel tracking');

function toNumber(value) {
    const parsed = Number.parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : null;
}

function toIsoFromEpochMs(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return 'N/A';
    return new Date(num).toISOString();
}

function createPortIcon() {
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 30, 30);
    ctx.beginPath();
    ctx.arc(15, 15, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf833';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PT', 15, 15);

    return canvas.toDataURL('image/png');
}

function createVesselIcon() {
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 30, 30);
    ctx.beginPath();
    ctx.arc(15, 15, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffcc2e';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00ffcc';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', 15, 15);

    return canvas.toDataURL('image/png');
}

function normalizePortRows(payload) {
    const features = Array.isArray(payload?.features) ? payload.features : [];

    const ports = features
        .map((feature) => {
            const attrs = feature?.attributes || {};
            const lat = toNumber(attrs.latitude);
            const lon = toNumber(attrs.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

            const objectId = attrs.objectid || attrs.OBJECTID || `${lat}:${lon}`;
            return {
                id: `port-${objectId}`,
                assetType: 'PORT',
                name: attrs.portname || 'Port',
                lat,
                lon,
                portType: attrs.prttype || 'Unknown',
                portSize: attrs.prtsize || 'Unknown',
                status: attrs.status || 'Unknown',
                country: attrs.country || 'N/A',
                iso3: attrs.iso3 || 'N/A',
                updated: toIsoFromEpochMs(attrs.updatedate),
                source: 'WFP Global Ports',
                reference: 'https://gis.wfp.org/arcgis/rest/services/GLOBAL/GlobalPorts/FeatureServer/0',
            };
        })
        .filter(Boolean)
        .slice(0, MAX_PORTS);

    return ports;
}

function buildPortsQueryUrl(offset = 0, direct = true) {
    const base = `${API_URLS.GLOBAL_PORTS_ARCGIS_QUERY}&resultRecordCount=${PORT_PAGE_SIZE}&resultOffset=${offset}`;
    if (direct) return base;
    return `${API_URLS.GLOBAL_PORTS_ARCGIS_QUERY_PROXY}${encodeURIComponent(base)}`;
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
        const text = await response.text();
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object' && typeof parsed.contents === 'string') {
            return JSON.parse(parsed.contents);
        }
        return parsed;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchPortsAllPages() {
    const merged = [];

    const fetchPaged = async (direct) => {
        const rows = [];
        for (let offset = 0; offset < MAX_PORTS + PORT_PAGE_SIZE; offset += PORT_PAGE_SIZE) {
            const payload = await fetchJsonWithTimeout(buildPortsQueryUrl(offset, direct));
            const features = Array.isArray(payload?.features) ? payload.features : [];
            if (!features.length) break;
            rows.push(...features);
            if (features.length < PORT_PAGE_SIZE) break;
        }
        return rows;
    };

    try {
        merged.push(...(await fetchPaged(true)));
    } catch (err) {
        merged.push(...(await fetchPaged(false)));
    }

    return normalizePortRows({ features: merged });
}

function pickField(obj, fields) {
    for (const field of fields) {
        if (obj && obj[field] !== undefined && obj[field] !== null && obj[field] !== '') {
            return obj[field];
        }
    }
    return null;
}

function normalizeAisPosition(rawPayload) {
    const payload = rawPayload || {};
    const message = payload.Message || payload.message || payload;
    const position =
        message.PositionReport ||
        message.positionReport ||
        message.PositionReportClassA ||
        message.PositionReportClassB ||
        message.StandardClassBPositionReport ||
        payload.PositionReport ||
        payload.PositionReportClassA ||
        payload.PositionReportClassB ||
        null;

    if (!position) return null;

    const meta = payload.MetaData || payload.metadata || payload.metaData || {};
    const mmsi = String(
        pickField(position, ['UserID', 'UserId', 'MMSI', 'mmsi']) ||
        pickField(meta, ['MMSI', 'mmsi']) ||
        ''
    ).trim();
    if (!mmsi) return null;

    const lat = toNumber(pickField(position, ['Latitude', 'latitude', 'Lat', 'lat']));
    const lon = toNumber(pickField(position, ['Longitude', 'longitude', 'Lon', 'lon']));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    const sog = toNumber(pickField(position, ['Sog', 'SOG', 'speedOverGround']));
    const cog = toNumber(pickField(position, ['Cog', 'COG', 'courseOverGround']));
    const heading = toNumber(pickField(position, ['TrueHeading', 'Heading', 'heading']));
    const navStatus = pickField(position, ['NavigationalStatus', 'NavStatus']) || 'N/A';

    return {
        mmsi,
        lat,
        lon,
        sog,
        cog,
        heading,
        navStatus,
        updated: new Date().toISOString(),
    };
}

function normalizeAisStatic(rawPayload) {
    const payload = rawPayload || {};
    const message = payload.Message || payload.message || payload;
    const ship =
        message.ShipStaticData ||
        message.shipStaticData ||
        payload.ShipStaticData ||
        null;

    if (!ship) return null;

    const meta = payload.MetaData || payload.metadata || payload.metaData || {};
    const mmsi = String(
        pickField(ship, ['UserID', 'UserId', 'MMSI', 'mmsi']) ||
        pickField(meta, ['MMSI', 'mmsi']) ||
        ''
    ).trim();
    if (!mmsi) return null;

    return {
        mmsi,
        name: pickField(ship, ['Name', 'ShipName', 'name']) || pickField(meta, ['ShipName', 'shipName']) || `MMSI ${mmsi}`,
        callSign: pickField(ship, ['CallSign', 'callSign']) || pickField(meta, ['CallSign', 'callSign']) || 'N/A',
        destination: pickField(ship, ['Destination', 'destination']) || pickField(meta, ['Destination']) || 'N/A',
        imo: pickField(ship, ['ImoNumber', 'IMO', 'imo']) || pickField(meta, ['ImoNumber']) || 'N/A',
        shipType: pickField(ship, ['Type', 'ShipType']) || pickField(meta, ['ShipType']) || 'N/A',
    };
}

function toAisMessageList(eventPayload) {
    if (Array.isArray(eventPayload)) return eventPayload;
    if (Array.isArray(eventPayload?.Messages)) return eventPayload.Messages;
    return [eventPayload];
}

export default function MaritimeLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.maritime.enabled);
    const cachedData = useStore((s) => s.layers.maritime.data);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);

    const portEntitiesRef = useRef(new Map());
    const vesselEntitiesRef = useRef(new Map());
    const portsDataRef = useRef(new Map());
    const vesselDataRef = useRef(new Map());
    const vesselMetaRef = useRef(new Map());
    const portsPollTimerRef = useRef(null);
    const aisSyncTimerRef = useRef(null);
    const wsRef = useRef(null);
    const iconsRef = useRef({ port: null, vessel: null });

    const clearEntities = useCallback(() => {
        portEntitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
        vesselEntitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
        portEntitiesRef.current.clear();
        vesselEntitiesRef.current.clear();
        portsDataRef.current.clear();
        vesselDataRef.current.clear();
        vesselMetaRef.current.clear();
    }, [viewer]);

    const setEntitiesVisible = useCallback((visible) => {
        portEntitiesRef.current.forEach((entity) => {
            entity.show = visible;
        });
        vesselEntitiesRef.current.forEach((entity) => {
            entity.show = visible;
        });
    }, []);

    const syncStoreData = useCallback(() => {
        const merged = [
            ...portsDataRef.current.values(),
            ...vesselDataRef.current.values(),
        ];
        updateData('maritime', merged);
    }, [updateData]);

    const upsertPortEntities = useCallback((ports) => {
        const activeIds = new Set();

        ports.forEach((port) => {
            const entityId = `maritime-port-${port.id}`;
            activeIds.add(entityId);
            portsDataRef.current.set(entityId, port);

            const position = Cesium.Cartesian3.fromDegrees(port.lon, port.lat, 30);
            if (portEntitiesRef.current.has(entityId)) {
                const entity = portEntitiesRef.current.get(entityId);
                entity.position = position;
                entity.name = port.name;
                entity.properties.portType = port.portType;
                entity.properties.portSize = port.portSize;
                entity.properties.status = port.status;
                entity.properties.country = port.country;
                entity.properties.iso3 = port.iso3;
                entity.properties.updated = port.updated;
                entity.properties.latitude = port.lat.toFixed(4);
                entity.properties.longitude = port.lon.toFixed(4);
                return;
            }

            const entity = viewer.entities.add({
                id: entityId,
                name: port.name,
                position,
                billboard: {
                    image: iconsRef.current.port,
                    scale: 0.6,
                    alignedAxis: Cesium.Cartesian3.UNIT_Z,
                    disableDepthTestDistance: 9000000,
                },
                properties: {
                    _layerType: 'maritime',
                    assetType: 'PORT',
                    portType: port.portType,
                    portSize: port.portSize,
                    status: port.status,
                    country: port.country,
                    iso3: port.iso3,
                    updated: port.updated,
                    source: port.source,
                    reference: port.reference,
                    latitude: port.lat.toFixed(4),
                    longitude: port.lon.toFixed(4),
                },
            });

            portEntitiesRef.current.set(entityId, entity);
        });

        for (const [entityId, entity] of portEntitiesRef.current.entries()) {
            if (!activeIds.has(entityId)) {
                viewer.entities.remove(entity);
                portEntitiesRef.current.delete(entityId);
                portsDataRef.current.delete(entityId);
            }
        }
    }, [viewer]);

    const upsertVesselEntity = useCallback((vessel) => {
        const entityId = `maritime-vessel-${vessel.mmsi}`;
        vesselDataRef.current.set(entityId, vessel);

        const position = Cesium.Cartesian3.fromDegrees(vessel.lon, vessel.lat, 35);
        if (vesselEntitiesRef.current.has(entityId)) {
            const entity = vesselEntitiesRef.current.get(entityId);
            entity.position = position;
            entity.name = vessel.name;
            entity.properties.sog = vessel.sog;
            entity.properties.cog = vessel.cog;
            entity.properties.heading = vessel.heading;
            entity.properties.navStatus = vessel.navStatus;
            entity.properties.destination = vessel.destination;
            entity.properties.callSign = vessel.callSign;
            entity.properties.imo = vessel.imo;
            entity.properties.shipType = vessel.shipType;
            entity.properties.updated = vessel.updated;
            entity.properties.latitude = vessel.lat.toFixed(4);
            entity.properties.longitude = vessel.lon.toFixed(4);
            return;
        }

        const entity = viewer.entities.add({
            id: entityId,
            name: vessel.name,
            position,
            billboard: {
                image: iconsRef.current.vessel,
                scale: 0.52,
                alignedAxis: Cesium.Cartesian3.UNIT_Z,
                disableDepthTestDistance: 9000000,
                rotation: Cesium.Math.toRadians(Number.isFinite(vessel.heading) ? vessel.heading : 0),
            },
            properties: {
                _layerType: 'maritime',
                assetType: 'VESSEL',
                mmsi: vessel.mmsi,
                sog: vessel.sog,
                cog: vessel.cog,
                heading: vessel.heading,
                navStatus: vessel.navStatus,
                destination: vessel.destination,
                callSign: vessel.callSign,
                imo: vessel.imo,
                shipType: vessel.shipType,
                source: vessel.source,
                reference: vessel.reference,
                updated: vessel.updated,
                latitude: vessel.lat.toFixed(4),
                longitude: vessel.lon.toFixed(4),
            },
        });

        vesselEntitiesRef.current.set(entityId, entity);
    }, [viewer]);

    const pruneVesselsIfNeeded = useCallback(() => {
        const entries = Array.from(vesselDataRef.current.entries());
        if (entries.length <= MAX_VESSELS) return;

        entries
            .sort((a, b) => {
                const aTs = Date.parse(a[1]?.updated || '');
                const bTs = Date.parse(b[1]?.updated || '');
                return (Number.isFinite(aTs) ? aTs : 0) - (Number.isFinite(bTs) ? bTs : 0);
            })
            .slice(0, entries.length - MAX_VESSELS)
            .forEach(([entityId]) => {
                const entity = vesselEntitiesRef.current.get(entityId);
                if (entity) viewer.entities.remove(entity);
                vesselEntitiesRef.current.delete(entityId);
                vesselDataRef.current.delete(entityId);
            });
    }, [viewer]);

    const ingestAisMessage = useCallback((raw) => {
        const payload = raw || {};
        const messageType = String(payload?.MessageType || payload?.messageType || '').toLowerCase();

        if (messageType.includes('shipstatic')) {
            const staticMeta = normalizeAisStatic(payload);
            if (staticMeta) {
                vesselMetaRef.current.set(staticMeta.mmsi, staticMeta);
                const existingEntityId = `maritime-vessel-${staticMeta.mmsi}`;
                const existing = vesselDataRef.current.get(existingEntityId);
                if (existing) {
                    const merged = {
                        ...existing,
                        ...staticMeta,
                    };
                    upsertVesselEntity(merged);
                }
            }
            return;
        }

        if (!messageType.includes('position')) return;

        const position = normalizeAisPosition(payload);
        if (!position) return;

        const staticMeta = vesselMetaRef.current.get(position.mmsi) || {};
        const vessel = {
            assetType: 'VESSEL',
            mmsi: position.mmsi,
            name: staticMeta.name || `MMSI ${position.mmsi}`,
            callSign: staticMeta.callSign || 'N/A',
            destination: staticMeta.destination || 'N/A',
            imo: staticMeta.imo || 'N/A',
            shipType: staticMeta.shipType || 'N/A',
            lat: position.lat,
            lon: position.lon,
            sog: Number.isFinite(position.sog) ? `${position.sog.toFixed(1)} kn` : 'N/A',
            cog: Number.isFinite(position.cog) ? `${Math.round(position.cog)}°` : 'N/A',
            heading: Number.isFinite(position.heading) ? Math.round(position.heading) : null,
            navStatus: position.navStatus,
            updated: position.updated,
            source: 'AISstream realtime feed',
            reference: 'https://aisstream.io',
        };

        upsertVesselEntity(vessel);
        pruneVesselsIfNeeded();
    }, [pruneVesselsIfNeeded, upsertVesselEntity]);

    const closeAisSocket = useCallback(() => {
        if (wsRef.current) {
            try {
                wsRef.current.close();
            } catch (err) {
                // noop
            }
        }
        wsRef.current = null;
    }, []);

    const openAisSocket = useCallback(() => {
        if (!AIS_API_KEY || wsRef.current) return;

        const ws = new WebSocket(API_URLS.AISSTREAM_WS);
        wsRef.current = ws;

        ws.onopen = () => {
            const baseSubscription = {
                BoundingBoxes: [
                    [[90, -180], [-90, 180]],
                ],
                FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
            };

            ws.send(JSON.stringify({ ...baseSubscription, APIKey: AIS_API_KEY }));
            ws.send(JSON.stringify({ ...baseSubscription, Apikey: AIS_API_KEY }));
        };

        ws.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                const list = toAisMessageList(parsed);
                list.forEach(ingestAisMessage);
            } catch (err) {
                // ignore malformed chunks
            }
        };

        ws.onerror = () => {
            // keep ports active even if live AIS websocket is unavailable.
        };

        ws.onclose = () => {
            if (wsRef.current === ws) {
                wsRef.current = null;
            }
        };
    }, [ingestAisMessage]);

    const pollPorts = useCallback(async () => {
        if (!isEnabled) return;
        try {
            if (!portsDataRef.current.size) {
                setStatus('maritime', 'loading');
            }

            const ports = await fetchPortsAllPages();
            if (!ports.length) throw new Error('No global ports available');

            upsertPortEntities(ports);
            setEntitiesVisible(true);
            syncStoreData();
            setStatus('maritime', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('maritime', portEntitiesRef.current.size ? 'active' : 'error');
            if (!portEntitiesRef.current.size) {
                updateData('maritime', []);
            }
        }
    }, [isEnabled, setStatus, setEntitiesVisible, syncStoreData, updateData, upsertPortEntities, viewer]);

    const hydrateFromCache = useCallback(() => {
        if (!Array.isArray(cachedData) || !cachedData.length) return;

        const ports = cachedData.filter((item) => item?.assetType === 'PORT');
        const vessels = cachedData.filter((item) => item?.assetType === 'VESSEL');

        if (ports.length) upsertPortEntities(ports);
        vessels.forEach((vessel) => {
            if (!vessel?.mmsi || !Number.isFinite(Number(vessel?.lat)) || !Number.isFinite(Number(vessel?.lon))) return;
            upsertVesselEntity({
                ...vessel,
                lat: Number(vessel.lat),
                lon: Number(vessel.lon),
                heading: Number.isFinite(Number(vessel.heading)) ? Number(vessel.heading) : null,
            });
        });
        setEntitiesVisible(true);
        setStatus('maritime', 'active');
    }, [cachedData, setEntitiesVisible, setStatus, upsertPortEntities, upsertVesselEntity]);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return undefined;
        if (!iconsRef.current.port) iconsRef.current.port = createPortIcon();
        if (!iconsRef.current.vessel) iconsRef.current.vessel = createVesselIcon();

        if (!isEnabled) {
            clearInterval(portsPollTimerRef.current);
            clearInterval(aisSyncTimerRef.current);
            portsPollTimerRef.current = null;
            aisSyncTimerRef.current = null;
            closeAisSocket();
            setEntitiesVisible(false);
            setStatus('maritime', 'idle');
            viewer.scene.requestRender();
            return undefined;
        }

        hydrateFromCache();

        pollPorts();
        portsPollTimerRef.current = setInterval(
            pollPorts,
            POLL_INTERVALS.MARITIME_PORTS || 43200000
        );

        openAisSocket();
        aisSyncTimerRef.current = setInterval(() => {
            if (!isEnabled) return;
            if (!vesselDataRef.current.size && !portsDataRef.current.size) return;
            syncStoreData();
            viewer.scene.requestRender();
        }, AIS_SYNC_INTERVAL_MS);

        return () => {
            clearInterval(portsPollTimerRef.current);
            clearInterval(aisSyncTimerRef.current);
            portsPollTimerRef.current = null;
            aisSyncTimerRef.current = null;
            closeAisSocket();
        };
    }, [
        closeAisSocket,
        hydrateFromCache,
        isEnabled,
        openAisSocket,
        pollPorts,
        setEntitiesVisible,
        setStatus,
        syncStoreData,
        viewer,
    ]);

    useEffect(
        () => () => {
            clearInterval(portsPollTimerRef.current);
            clearInterval(aisSyncTimerRef.current);
            portsPollTimerRef.current = null;
            aisSyncTimerRef.current = null;
            closeAisSocket();
            clearEntities();
        },
        [clearEntities, closeAisSocket]
    );

    return null;
}
