import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 12000;
const MAX_ITEMS = 450;

function stripHtml(text) {
    const raw = String(text || '');
    return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseGeorssPoint(itemNode) {
    if (!itemNode) return null;
    const pointNode =
        itemNode.querySelector('georss\\:point') ||
        itemNode.querySelector('point') ||
        itemNode.getElementsByTagName('georss:point')?.[0];
    const raw = pointNode?.textContent?.trim();
    if (!raw) return null;
    const [latRaw, lngRaw] = raw.split(/\s+/);
    const lat = Number.parseFloat(latRaw);
    const lng = Number.parseFloat(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
}

function parseWeeklyVolcanoFeed(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(String(xmlText || ''), 'application/xml');
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
        throw new Error('Invalid volcano XML payload');
    }

    const items = Array.from(xmlDoc.getElementsByTagName('item'));
    return items
        .map((item) => {
            const point = parseGeorssPoint(item);
            if (!point) return null;

            const title = item.querySelector('title')?.textContent?.trim() || 'Volcanic Activity';
            const description = stripHtml(item.querySelector('description')?.textContent || '');
            const link = item.querySelector('link')?.textContent?.trim() || API_URLS.VOLCANO_WEEKLY_RSS;
            const guid = item.querySelector('guid')?.textContent?.trim() || '';
            const pubDateRaw = item.querySelector('pubDate')?.textContent?.trim() || '';
            const pubTs = Date.parse(pubDateRaw);
            const published = Number.isFinite(pubTs) ? new Date(pubTs).toISOString() : 'N/A';

            const idSeed = guid || `${title}-${pubDateRaw}-${point.lat}-${point.lng}`;
            const id = idSeed.replace(/[^a-zA-Z0-9_.-]/g, '_');

            return {
                id,
                name: title,
                lat: point.lat,
                lng: point.lng,
                published,
                summary: description || 'No summary available.',
                source: 'Smithsonian GVP / USGS Weekly Volcanic Activity Report',
                reference: link,
            };
        })
        .filter(Boolean)
        .slice(0, MAX_ITEMS);
}

function createVolcanoIcon() {
    const canvas = document.createElement('canvas');
    canvas.width = 34;
    canvas.height = 34;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 34, 34);
    ctx.beginPath();
    ctx.arc(17, 17, 11.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4d4d33';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff4d4d';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VO', 17, 17);

    return canvas.toDataURL('image/png');
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

export default function VolcanoesLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.volcanoes.enabled);
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

    const getIcon = useCallback(() => {
        if (iconRef.current) return iconRef.current;
        iconRef.current = createVolcanoIcon();
        return iconRef.current;
    }, []);

    const upsertVolcanoes = useCallback(
        (items) => {
            const currentIds = new Set();
            const icon = getIcon();

            items.forEach((item) => {
                const entityId = `volcano-${item.id}`;
                currentIds.add(entityId);
                const position = Cesium.Cartesian3.fromDegrees(item.lng, item.lat, 900);

                if (entitiesRef.current.has(entityId)) {
                    const entity = entitiesRef.current.get(entityId);
                    entity.position = position;
                    entity.name = item.name;
                    entity.properties.published = item.published;
                    entity.properties.summary = item.summary;
                    entity.properties.reference = item.reference;
                    entity.properties.latitude = item.lat.toFixed(4);
                    entity.properties.longitude = item.lng.toFixed(4);
                    return;
                }

                const entity = viewer.entities.add({
                    id: entityId,
                    position,
                    name: item.name,
                    billboard: {
                        image: icon,
                        scale: 0.64,
                        alignedAxis: Cesium.Cartesian3.UNIT_Z,
                        disableDepthTestDistance: 9000000,
                    },
                    properties: {
                        _layerType: 'volcanoes',
                        published: item.published,
                        summary: item.summary,
                        source: item.source,
                        reference: item.reference,
                        latitude: item.lat.toFixed(4),
                        longitude: item.lng.toFixed(4),
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

    const pollVolcanoes = useCallback(async () => {
        if (!isEnabled) return;
        try {
            if (!entitiesRef.current.size) {
                setStatus('volcanoes', 'loading');
            }

            let xmlText = '';
            try {
                xmlText = await fetchTextWithTimeout(API_URLS.VOLCANO_WEEKLY_RSS_PROXY);
            } catch (proxyErr) {
                xmlText = await fetchTextWithTimeout(API_URLS.VOLCANO_WEEKLY_RSS);
            }

            const volcanoes = parseWeeklyVolcanoFeed(xmlText);
            if (!volcanoes.length) throw new Error('No volcano activity items');

            upsertVolcanoes(volcanoes);
            updateData('volcanoes', volcanoes);
            setStatus('volcanoes', 'active');
            viewer.scene.requestRender();
        } catch (err) {
            setStatus('volcanoes', entitiesRef.current.size ? 'active' : 'error');
            if (!entitiesRef.current.size) {
                updateData('volcanoes', []);
            }
        }
    }, [isEnabled, setStatus, upsertVolcanoes, updateData, viewer]);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return undefined;

        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
            updateData('volcanoes', []);
            setStatus('volcanoes', 'idle');
            viewer.scene.requestRender();
            return undefined;
        }

        pollVolcanoes();
        pollTimerRef.current = setInterval(
            pollVolcanoes,
            POLL_INTERVALS.VOLCANOES || 3600000
        );

        return () => {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            clearEntities();
        };
    }, [clearEntities, isEnabled, pollVolcanoes, setStatus, updateData, viewer]);

    return null;
}
