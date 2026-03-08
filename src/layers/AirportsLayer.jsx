import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 18000;
const MAX_AIRPORTS = 12000;

const TYPE_PRIORITY = {
    large_airport: 4,
    medium_airport: 3,
    small_airport: 2,
    heliport: 1,
};

const TYPE_STYLE = {
    large_airport: {
        color: Cesium.Color.fromCssColorString('#93c5fd').withAlpha(0.95),
        size: 6,
        tag: 'LG',
    },
    medium_airport: {
        color: Cesium.Color.fromCssColorString('#60a5fa').withAlpha(0.92),
        size: 5,
        tag: 'MD',
    },
    default: {
        color: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.85),
        size: 4,
        tag: 'AP',
    },
};

function toNumber(value) {
    const parsed = Number.parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : null;
}

function escapeCsvCell(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
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
            cells.push(current);
            current = '';
            continue;
        }

        current += ch;
    }

    cells.push(current);
    return cells.map((cell) => escapeCsvCell(cell));
}

function parseOurAirportsCsv(rawText) {
    const lines = String(rawText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    if (!lines.length) return [];

    const header = parseCsvLine(lines[0]);
    const indexByField = new Map(header.map((field, idx) => [field.replace(/^"|"$/g, ''), idx]));

    const getIndex = (field) => indexByField.get(field);

    const idIdx = getIndex('ident');
    const typeIdx = getIndex('type');
    const nameIdx = getIndex('name');
    const latIdx = getIndex('latitude_deg');
    const lonIdx = getIndex('longitude_deg');
    const elevIdx = getIndex('elevation_ft');
    const countryIdx = getIndex('iso_country');
    const regionIdx = getIndex('iso_region');
    const cityIdx = getIndex('municipality');
    const scheduledIdx = getIndex('scheduled_service');
    const iataIdx = getIndex('iata_code');
    const gpsIdx = getIndex('gps_code');
    const wikiIdx = getIndex('wikipedia_link');

    if (
        idIdx === undefined ||
        typeIdx === undefined ||
        nameIdx === undefined ||
        latIdx === undefined ||
        lonIdx === undefined
    ) {
        return [];
    }

    const airports = [];

    for (let i = 1; i < lines.length; i += 1) {
        const row = parseCsvLine(lines[i]);
        if (row.length <= lonIdx) continue;

        const ident = row[idIdx];
        const type = row[typeIdx] || 'unknown';
        const name = row[nameIdx] || ident || 'Unknown Airport';
        const lat = toNumber(row[latIdx]);
        const lon = toNumber(row[lonIdx]);

        if (!ident || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;

        const scheduledService = String(row[scheduledIdx] || '').toLowerCase() === 'yes';
        const iata = row[iataIdx] || '';

        const includeAirport =
            type === 'large_airport' ||
            type === 'medium_airport' ||
            (scheduledService && type !== 'closed') ||
            Boolean(iata);

        if (!includeAirport) continue;

        const elevationFt = toNumber(row[elevIdx]);
        const elevationM = Number.isFinite(elevationFt) ? Math.round(elevationFt * 0.3048) : null;
        const priority = TYPE_PRIORITY[type] || 0;

        airports.push({
            id: ident,
            type,
            name,
            lat,
            lon,
            iata,
            gps: row[gpsIdx] || '',
            country: row[countryIdx] || 'N/A',
            region: row[regionIdx] || 'N/A',
            city: row[cityIdx] || 'N/A',
            scheduledService: scheduledService ? 'YES' : 'NO',
            elevation: Number.isFinite(elevationM) ? `${elevationM} m` : 'N/A',
            source: 'OurAirports Open Data',
            reference:
                row[wikiIdx] ||
                `https://ourairports.com/airports/${encodeURIComponent(ident)}/`,
            _priority: priority,
        });
    }

    return airports
        .sort((a, b) => {
            if (a._priority !== b._priority) return b._priority - a._priority;
            if (a.country !== b.country) return a.country.localeCompare(b.country);
            return a.name.localeCompare(b.name);
        })
        .slice(0, MAX_AIRPORTS)
        .map(({ _priority, ...airport }) => airport);
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

function getStyle(type) {
    if (type === 'large_airport') return TYPE_STYLE.large_airport;
    if (type === 'medium_airport') return TYPE_STYLE.medium_airport;
    return TYPE_STYLE.default;
}

export default function AirportsLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.airports.enabled);
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

    const upsertAirports = useCallback(
        (airports) => {
            const activeIds = new Set();

            airports.forEach((airport) => {
                const entityId = `airport-${airport.id}`;
                activeIds.add(entityId);

                const style = getStyle(airport.type);
                const position = Cesium.Cartesian3.fromDegrees(airport.lon, airport.lat, 70);

                if (entitiesRef.current.has(entityId)) {
                    const entity = entitiesRef.current.get(entityId);
                    entity.position = position;
                    entity.name = airport.name;
                    if (entity.point) {
                        entity.point.color = style.color;
                        entity.point.pixelSize = style.size;
                    }
                    entity.properties.iata = airport.iata || 'N/A';
                    entity.properties.icao = airport.id;
                    entity.properties.airportType = airport.type;
                    entity.properties.city = airport.city;
                    entity.properties.country = airport.country;
                    entity.properties.region = airport.region;
                    entity.properties.scheduledService = airport.scheduledService;
                    entity.properties.elevation = airport.elevation;
                    entity.properties.latitude = airport.lat.toFixed(4);
                    entity.properties.longitude = airport.lon.toFixed(4);
                    entity.properties.reference = airport.reference;
                    return;
                }

                const entity = viewer.entities.add({
                    id: entityId,
                    position,
                    name: airport.name,
                    point: {
                        pixelSize: style.size,
                        color: style.color,
                        outlineColor: Cesium.Color.fromCssColorString('#0f172a').withAlpha(0.95),
                        outlineWidth: 1,
                        disableDepthTestDistance: 9000000,
                    },
                    properties: {
                        _layerType: 'airports',
                        iata: airport.iata || 'N/A',
                        icao: airport.id,
                        airportType: airport.type,
                        city: airport.city,
                        country: airport.country,
                        region: airport.region,
                        scheduledService: airport.scheduledService,
                        elevation: airport.elevation,
                        source: airport.source,
                        reference: airport.reference,
                        latitude: airport.lat.toFixed(4),
                        longitude: airport.lon.toFixed(4),
                    },
                });

                entitiesRef.current.set(entityId, entity);
            });

            for (const [entityId, entity] of entitiesRef.current.entries()) {
                if (!activeIds.has(entityId)) {
                    viewer.entities.remove(entity);
                    entitiesRef.current.delete(entityId);
                }
            }
        },
        [viewer]
    );

    const pollAirports = useCallback(async () => {
        if (!isEnabled) return;

        try {
            if (!entitiesRef.current.size) {
                setStatus('airports', 'loading');
            }

            let rawText = '';
            try {
                rawText = await fetchTextWithTimeout(API_URLS.OURAIRPORTS_AIRPORTS_CSV);
            } catch (directErr) {
                rawText = await fetchTextWithTimeout(API_URLS.OURAIRPORTS_AIRPORTS_CSV_PROXY);
            }

            const airports = parseOurAirportsCsv(rawText);
            if (!airports.length) throw new Error('No airports parsed from source');

            upsertAirports(airports);
            updateData('airports', airports);
            setStatus('airports', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('airports', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('airports', []);
            }
        }
    }, [isEnabled, setStatus, upsertAirports, updateData, viewer]);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return undefined;

        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
            updateData('airports', []);
            setStatus('airports', 'idle');
            viewer.scene.requestRender();
            return undefined;
        }

        pollAirports();
        pollTimerRef.current = setInterval(pollAirports, POLL_INTERVALS.AIRPORTS || 86400000);

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        };
    }, [clearEntities, isEnabled, pollAirports, setStatus, updateData, viewer]);

    return null;
}
