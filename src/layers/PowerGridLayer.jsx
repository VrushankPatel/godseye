import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 18000;
const MAX_POWER_PLANTS = 5500;
const MIN_PLANT_CAPACITY_MW = 60;

function toNumber(value) {
    const parsed = Number.parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : null;
}

function toIso(value) {
    const ts = Date.parse(String(value || ''));
    return Number.isFinite(ts) ? new Date(ts).toISOString() : 'N/A';
}

function parseCsvLine(line) {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (ch === ',' && !inQuotes) {
            cells.push(current.trim());
            current = '';
            continue;
        }
        current += ch;
    }

    cells.push(current.trim());
    return cells;
}

function fuelColor(fuel) {
    const key = String(fuel || '').toLowerCase();
    if (key.includes('coal')) return '#6b7280';
    if (key.includes('gas')) return '#60a5fa';
    if (key.includes('hydro')) return '#38bdf8';
    if (key.includes('solar')) return '#f59e0b';
    if (key.includes('wind')) return '#86efac';
    if (key.includes('nuclear')) return '#f472b6';
    return '#facc15';
}

function createPlantIcon(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 30, 30);
    ctx.beginPath();
    ctx.arc(15, 15, 9, 0, Math.PI * 2);
    ctx.fillStyle = `${color}33`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PP', 15, 15);

    return canvas.toDataURL('image/png');
}

function createOutageIcon(level) {
    const color = level === 'SEVERE' ? '#ef4444' : level === 'MODERATE' ? '#f97316' : '#facc15';

    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 30, 30);
    ctx.beginPath();
    ctx.arc(15, 15, 9, 0, Math.PI * 2);
    ctx.fillStyle = `${color}38`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OG', 15, 15);

    return canvas.toDataURL('image/png');
}

function normalizeOutages(payload) {
    const rows = Array.isArray(payload?.results) ? payload.results : [];

    return rows
        .map((row, index) => {
            const lat = toNumber(row?.geo_point_2d?.lat ?? row?.centroid?.lat);
            const lon = toNumber(row?.geo_point_2d?.lon ?? row?.centroid?.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

            const meters = toNumber(row?.metersaffected);
            const level = Number.isFinite(meters) && meters >= 50000
                ? 'SEVERE'
                : Number.isFinite(meters) && meters >= 5000
                    ? 'MODERATE'
                    : 'LOW';

            const utility = row?.utilitydisclaimer || row?.name || 'Unknown Utility';
            const county = row?.county || 'N/A';
            const state = row?.state || 'N/A';
            const id = `outage-${row?.utility_id || utility}-${county}-${state}-${index}`.replace(/[^a-zA-Z0-9_.-]/g, '_');

            return {
                id,
                assetType: 'OUTAGE',
                name: `Outage - ${county}, ${state}`,
                utility,
                county,
                state,
                metersAffected: Number.isFinite(meters) ? Math.round(meters) : null,
                severityLevel: level,
                cause: row?.cause || row?.incident_cause || 'N/A',
                status: row?.statuskind || 'N/A',
                started: toIso(row?.reportedstarttime),
                estRestore: toIso(row?.estimatedrestorationtime),
                lat,
                lon,
                source: 'US DOE ODIN real-time outages',
                reference: API_URLS.ODIN_OUTAGES,
            };
        })
        .filter(Boolean);
}

function normalizePowerPlants(rawCsv) {
    const lines = String(rawCsv || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length < 2) return [];

    const header = parseCsvLine(lines[0]);
    const indexByField = new Map(header.map((field, idx) => [field, idx]));

    const idxName = indexByField.get('name');
    const idxCountry = indexByField.get('country_long');
    const idxLat = indexByField.get('latitude');
    const idxLon = indexByField.get('longitude');
    const idxFuel = indexByField.get('primary_fuel');
    const idxCapacity = indexByField.get('capacity_mw');
    const idxOwner = indexByField.get('owner');
    const idxSource = indexByField.get('source');
    const idxUrl = indexByField.get('url');
    const idxYear = indexByField.get('commissioning_year');
    const idxId = indexByField.get('gppd_idnr');

    const records = [];

    for (let i = 1; i < lines.length; i += 1) {
        const row = parseCsvLine(lines[i]);
        const lat = toNumber(row[idxLat]);
        const lon = toNumber(row[idxLon]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

        const capacity = toNumber(row[idxCapacity]);
        if (!Number.isFinite(capacity) || capacity < MIN_PLANT_CAPACITY_MW) continue;

        const idSeed = row[idxId] || `${row[idxName]}-${lat}-${lon}`;
        records.push({
            id: `plant-${idSeed}`.replace(/[^a-zA-Z0-9_.-]/g, '_'),
            assetType: 'POWER_PLANT',
            name: row[idxName] || 'Power Plant',
            country: row[idxCountry] || 'N/A',
            fuel: row[idxFuel] || 'Unknown',
            capacityMw: Math.round(capacity),
            owner: row[idxOwner] || 'N/A',
            commissioned: row[idxYear] || 'N/A',
            lat,
            lon,
            source: row[idxSource] || 'WRI Global Power Plant Database',
            reference: row[idxUrl] || API_URLS.WRI_GLOBAL_POWER_PLANTS_CSV,
        });
    }

    return records
        .sort((a, b) => b.capacityMw - a.capacityMw)
        .slice(0, MAX_POWER_PLANTS);
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

async function fetchOutages() {
    const direct = `${API_URLS.ODIN_OUTAGES}?limit=1200`;
    const proxy = `${API_URLS.ODIN_OUTAGES_PROXY}${encodeURIComponent(direct)}`;

    try {
        return await fetchJsonWithTimeout(direct);
    } catch (err) {
        return fetchJsonWithTimeout(proxy);
    }
}

async function fetchPowerPlantsCsv() {
    try {
        return await fetchTextWithTimeout(API_URLS.WRI_GLOBAL_POWER_PLANTS_CSV);
    } catch (err) {
        const proxied = `${API_URLS.WRI_GLOBAL_POWER_PLANTS_PROXY}${encodeURIComponent(API_URLS.WRI_GLOBAL_POWER_PLANTS_CSV)}`;
        return fetchTextWithTimeout(proxied, REQUEST_TIMEOUT_MS * 2);
    }
}

export default function PowerGridLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.powerGrid.enabled);
    const cachedData = useStore((s) => s.layers.powerGrid.data);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);

    const entitiesRef = useRef(new Map());
    const dataRef = useRef(new Map());
    const pollTimerRef = useRef(null);
    const plantsLoadedRef = useRef(false);
    const iconCacheRef = useRef(new Map());

    const clearEntities = useCallback(() => {
        entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
        entitiesRef.current.clear();
        dataRef.current.clear();
        plantsLoadedRef.current = false;
    }, [viewer]);

    const setEntitiesVisible = useCallback((visible) => {
        entitiesRef.current.forEach((entity) => {
            entity.show = visible;
        });
    }, []);

    const getPlantIcon = useCallback((fuel) => {
        const color = fuelColor(fuel);
        const key = `PLANT-${color}`;
        if (iconCacheRef.current.has(key)) return iconCacheRef.current.get(key);
        const icon = createPlantIcon(color);
        iconCacheRef.current.set(key, icon);
        return icon;
    }, []);

    const getOutageIcon = useCallback((level) => {
        const key = `OUTAGE-${level}`;
        if (iconCacheRef.current.has(key)) return iconCacheRef.current.get(key);
        const icon = createOutageIcon(level);
        iconCacheRef.current.set(key, icon);
        return icon;
    }, []);

    const upsertAssets = useCallback((assets) => {
        const activeIds = new Set();

        assets.forEach((asset) => {
            const idPrefix = asset.assetType === 'OUTAGE' ? 'grid-outage-' : 'power-plant-';
            const entityId = `${idPrefix}${asset.id}`;
            activeIds.add(entityId);
            dataRef.current.set(entityId, asset);

            const position = Cesium.Cartesian3.fromDegrees(asset.lon, asset.lat, 50);
            const icon = asset.assetType === 'OUTAGE'
                ? getOutageIcon(asset.severityLevel)
                : getPlantIcon(asset.fuel);

            if (entitiesRef.current.has(entityId)) {
                const entity = entitiesRef.current.get(entityId);
                entity.position = position;
                entity.name = asset.name;
                if (entity.billboard) entity.billboard.image = icon;
                entity.properties.assetType = asset.assetType;
                entity.properties.country = asset.country || 'N/A';
                entity.properties.latitude = asset.lat.toFixed(4);
                entity.properties.longitude = asset.lon.toFixed(4);
                entity.properties.reference = asset.reference;
                if (asset.assetType === 'OUTAGE') {
                    entity.properties.utility = asset.utility;
                    entity.properties.county = asset.county;
                    entity.properties.state = asset.state;
                    entity.properties.metersAffected = asset.metersAffected !== null ? String(asset.metersAffected) : 'N/A';
                    entity.properties.severityLevel = asset.severityLevel;
                    entity.properties.cause = asset.cause;
                    entity.properties.status = asset.status;
                    entity.properties.started = asset.started;
                    entity.properties.estRestore = asset.estRestore;
                } else {
                    entity.properties.fuel = asset.fuel;
                    entity.properties.capacityMw = `${asset.capacityMw} MW`;
                    entity.properties.owner = asset.owner;
                    entity.properties.commissioned = asset.commissioned;
                }
                return;
            }

            const entity = viewer.entities.add({
                id: entityId,
                name: asset.name,
                position,
                billboard: {
                    image: icon,
                    scale: asset.assetType === 'OUTAGE' ? 0.62 : 0.52,
                    alignedAxis: Cesium.Cartesian3.UNIT_Z,
                    disableDepthTestDistance: 9000000,
                },
                properties: {
                    _layerType: 'powerGrid',
                    assetType: asset.assetType,
                    source: asset.source,
                    reference: asset.reference,
                    latitude: asset.lat.toFixed(4),
                    longitude: asset.lon.toFixed(4),
                    ...(asset.assetType === 'OUTAGE'
                        ? {
                            utility: asset.utility,
                            county: asset.county,
                            state: asset.state,
                            metersAffected: asset.metersAffected !== null ? String(asset.metersAffected) : 'N/A',
                            severityLevel: asset.severityLevel,
                            cause: asset.cause,
                            status: asset.status,
                            started: asset.started,
                            estRestore: asset.estRestore,
                        }
                        : {
                            country: asset.country,
                            fuel: asset.fuel,
                            capacityMw: `${asset.capacityMw} MW`,
                            owner: asset.owner,
                            commissioned: asset.commissioned,
                        }),
                },
            });

            entitiesRef.current.set(entityId, entity);
        });

        for (const [entityId, entity] of entitiesRef.current.entries()) {
            if (!activeIds.has(entityId)) {
                viewer.entities.remove(entity);
                entitiesRef.current.delete(entityId);
                dataRef.current.delete(entityId);
            }
        }
    }, [getOutageIcon, getPlantIcon, viewer]);

    const syncStore = useCallback(() => {
        updateData('powerGrid', Array.from(dataRef.current.values()));
    }, [updateData]);

    const pollPowerGrid = useCallback(async () => {
        if (!isEnabled) return;

        try {
            if (!dataRef.current.size) {
                setStatus('powerGrid', 'loading');
            }

            const [outagesPayload, plantsCsv] = await Promise.all([
                fetchOutages(),
                plantsLoadedRef.current ? Promise.resolve(null) : fetchPowerPlantsCsv(),
            ]);

            const outages = normalizeOutages(outagesPayload);
            let plants = [];

            if (plantsCsv) {
                plants = normalizePowerPlants(plantsCsv);
                plantsLoadedRef.current = true;
            } else {
                plants = Array.from(dataRef.current.values()).filter((item) => item.assetType === 'POWER_PLANT');
            }

            const merged = [...plants, ...outages];
            if (!merged.length) throw new Error('No power-grid assets available');

            upsertAssets(merged);
            setEntitiesVisible(true);
            syncStore();
            setStatus('powerGrid', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('powerGrid', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('powerGrid', []);
            }
        }
    }, [isEnabled, setEntitiesVisible, setStatus, syncStore, updateData, upsertAssets, viewer]);

    const hydrateFromCache = useCallback(() => {
        if (!Array.isArray(cachedData) || !cachedData.length) return;

        const normalized = cachedData
            .map((item) => {
                if (!item || !item.assetType) return null;
                const lat = Number(item.lat);
                const lon = Number(item.lon);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
                return {
                    ...item,
                    lat,
                    lon,
                };
            })
            .filter(Boolean);

        if (!normalized.length) return;
        plantsLoadedRef.current = normalized.some((item) => item.assetType === 'POWER_PLANT');
        upsertAssets(normalized);
        setEntitiesVisible(true);
        setStatus('powerGrid', 'active');
    }, [cachedData, setEntitiesVisible, setStatus, upsertAssets]);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return undefined;

        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            setEntitiesVisible(false);
            setStatus('powerGrid', 'idle');
            viewer.scene.requestRender();
            return undefined;
        }

        hydrateFromCache();
        pollPowerGrid();
        pollTimerRef.current = setInterval(
            pollPowerGrid,
            POLL_INTERVALS.POWER_GRID || 300000
        );

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        };
    }, [hydrateFromCache, isEnabled, pollPowerGrid, setEntitiesVisible, setStatus, viewer]);

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
