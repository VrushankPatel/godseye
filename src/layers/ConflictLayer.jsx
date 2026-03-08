import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 15000;
const MAX_CONFLICTS = 1200;

const WIKIDATA_CONFLICT_QUERY = `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?item ?itemLabel ?coord ?start ?inception ?countryLabel ?fatalities WHERE {
  ?item wdt:P31/wdt:P279* wd:Q350604.
  ?item wdt:P625 ?coord.
  OPTIONAL { ?item wdt:P580 ?start. }
  OPTIONAL { ?item wdt:P571 ?inception. }
  OPTIONAL { ?item wdt:P17 ?country. }
  OPTIONAL { ?item wdt:P1120 ?fatalities. }
  FILTER(
    (BOUND(?start) && ?start >= "2010-01-01T00:00:00Z"^^xsd:dateTime) ||
    (BOUND(?inception) && ?inception >= "2010-01-01T00:00:00Z"^^xsd:dateTime)
  )
  FILTER(NOT EXISTS { ?item wdt:P582 ?end. })
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 1200
`;

function toIsoOrNA(value) {
    if (!value) return 'N/A';
    const ts = Date.parse(String(value));
    return Number.isFinite(ts) ? new Date(ts).toISOString() : 'N/A';
}

function parseWktPoint(pointWkt) {
    if (!pointWkt) return null;
    const match = String(pointWkt).match(/Point\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (!match) return null;

    const lon = Number.parseFloat(match[1]);
    const lat = Number.parseFloat(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    return { lat, lon };
}

function parseConflictBindings(payload) {
    const bindings = payload?.results?.bindings;
    if (!Array.isArray(bindings)) return [];

    const seen = new Set();
    const conflicts = [];

    for (const row of bindings) {
        const itemUrl = row?.item?.value || '';
        const qid = itemUrl.split('/').pop();
        if (!qid || seen.has(qid)) continue;

        const coord = parseWktPoint(row?.coord?.value);
        if (!coord) continue;

        const startIso = toIsoOrNA(row?.start?.value);
        const inceptionIso = toIsoOrNA(row?.inception?.value);
        const started = startIso !== 'N/A' ? startIso : inceptionIso;

        conflicts.push({
            id: qid,
            name: row?.itemLabel?.value || qid,
            lat: coord.lat,
            lon: coord.lon,
            country: row?.countryLabel?.value || 'N/A',
            started,
            fatalities: row?.fatalities?.value || 'N/A',
            source: 'Wikidata SPARQL (Recent ongoing conflicts)',
            reference: itemUrl || `https://www.wikidata.org/wiki/${qid}`,
        });

        seen.add(qid);
        if (conflicts.length >= MAX_CONFLICTS) break;
    }

    return conflicts;
}

function createConflictIcon() {
    const canvas = document.createElement('canvas');
    canvas.width = 34;
    canvas.height = 34;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 34, 34);
    ctx.beginPath();
    ctx.arc(17, 17, 11.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4d6d33';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff4d6d';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CF', 17, 17);

    return canvas.toDataURL('image/png');
}

async function fetchJsonWithTimeout(url, query, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const params = new URLSearchParams({
            format: 'json',
            query,
        });

        const response = await fetch(`${url}?${params.toString()}`, {
            signal: controller.signal,
            cache: 'no-store',
            headers: {
                Accept: 'application/sparql-results+json',
            },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

export default function ConflictLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.conflicts.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);

    const entitiesRef = useRef(new Map());
    const pollTimerRef = useRef(null);
    const iconRef = useRef(null);

    const clearEntities = useCallback(() => {
        entitiesRef.current.forEach((entity) => {
            if (!viewer.isDestroyed()) viewer.entities.remove(entity);
        });
        entitiesRef.current.clear();
    }, [viewer]);

    const upsertConflicts = useCallback(
        (conflicts) => {
            const currentIds = new Set();
            if (!iconRef.current) iconRef.current = createConflictIcon();

            conflicts.forEach((conflict) => {
                const entityId = `conflict-${conflict.id}`;
                currentIds.add(entityId);

                const position = Cesium.Cartesian3.fromDegrees(conflict.lon, conflict.lat, 1200);
                if (entitiesRef.current.has(entityId)) {
                    const entity = entitiesRef.current.get(entityId);
                    entity.position = position;
                    entity.name = conflict.name;
                    entity.properties.country = conflict.country;
                    entity.properties.started = conflict.started;
                    entity.properties.fatalities = conflict.fatalities;
                    entity.properties.latitude = conflict.lat.toFixed(4);
                    entity.properties.longitude = conflict.lon.toFixed(4);
                    entity.properties.reference = conflict.reference;
                    return;
                }

                const entity = viewer.entities.add({
                    id: entityId,
                    position,
                    name: conflict.name,
                    billboard: {
                        image: iconRef.current,
                        scale: 0.62,
                        alignedAxis: Cesium.Cartesian3.UNIT_Z,
                        disableDepthTestDistance: 9000000,
                    },
                    properties: {
                        _layerType: 'conflicts',
                        country: conflict.country,
                        started: conflict.started,
                        fatalities: conflict.fatalities,
                        source: conflict.source,
                        reference: conflict.reference,
                        latitude: conflict.lat.toFixed(4),
                        longitude: conflict.lon.toFixed(4),
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
        [viewer]
    );

    const pollConflicts = useCallback(async () => {
        if (!isEnabled) return;

        try {
            if (!entitiesRef.current.size) {
                setStatus('conflicts', 'loading');
            }

            const payload = await fetchJsonWithTimeout(
                API_URLS.WIKIDATA_SPARQL,
                WIKIDATA_CONFLICT_QUERY
            );

            const conflicts = parseConflictBindings(payload);
            if (!conflicts.length) throw new Error('No conflicts parsed');

            upsertConflicts(conflicts);
            updateData('conflicts', conflicts);
            setStatus('conflicts', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('conflicts', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('conflicts', []);
            }
        }
    }, [isEnabled, setStatus, upsertConflicts, updateData, viewer]);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return undefined;

        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
            updateData('conflicts', []);
            setStatus('conflicts', 'idle');
            viewer.scene.requestRender();
            return undefined;
        }

        pollConflicts();
        pollTimerRef.current = setInterval(
            pollConflicts,
            POLL_INTERVALS.CONFLICTS || 900000
        );

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        };
    }, [clearEntities, isEnabled, pollConflicts, setStatus, updateData, viewer]);

    return null;
}
