import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS } from '../constants/dataSources';
import { CAMERA_FEEDS } from '../constants/staticData';
import { WORLDCAMS_FEEDS } from '../constants/worldcamsFeeds';
import { discoverAllFeeds } from '../services/feedDiscovery';
import { readLayerCache, writeLayerCache } from '../utils/layerCache';
import { fetchTextWithPolicy } from '../utils/network';

const MAX_CALTRANS_CAMERAS = 2400;
const MAX_ONTARIO_CAMERAS = 850;
const MAX_ALBERTA_CAMERAS = 800;
const MAX_TFL_CAMERAS = 850;
const MAX_TOTAL_CAMERAS = 8000;
const REQUEST_TIMEOUT_MS = 12000;
const DEFAULT_RENDERED_CAMERAS = 6000;
const CAMERA_CACHE_KEY = 'cctv-feeds-v3';
const CAMERA_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

function parseJsonPayload(payload) {
    if (!payload) return null;
    if (typeof payload === 'string') {
        try { return JSON.parse(payload); } catch { return null; }
    }
    return payload;
}

function splitCatalogPayload(payload) {
    return payload.split(/[^\x20-\x7E]+/).map((p) => p.trim()).filter(Boolean);
}

function inferMediaTypeFromUrls({ url, videoUrl }) {
    const combined = `${videoUrl || ''} ${url || ''}`.toLowerCase();
    if (!combined.trim()) return 'image';
    if (combined.includes('.m3u8') || combined.includes('.mp4') || combined.includes('.webm')) return 'video';
    if (combined.includes('.htm') || combined.includes('.html') || combined.includes('youtube.com/embed') || combined.includes('player?url=')) return 'embed';
    return 'image';
}

function normalizeCaltransFeed(text) {
    const feeds = [];
    const seen = new Set();
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith('cctv[')) continue;
        const payloadMatch = line.match(/=\s*'(.*)';$/);
        if (!payloadMatch) continue;
        const parts = splitCatalogPayload(payloadMatch[1]);
        if (parts.length < 4) continue;
        const pageUrl = parts[0];
        const lng = Number(parts[1]);
        const lat = Number(parts[2]);
        const name = parts[3] || `Caltrans Camera ${i + 1}`;
        const streamFlag = String(parts[4] || '0').trim();
        const streamCapable = streamFlag === '1';
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !pageUrl.startsWith('https://')) continue;
        const locMatch = pageUrl.match(/\/vm\/loc\/([^/]+)\/([^/.]+)\.htm$/i);
        const district = locMatch?.[1] || 'd0';
        const slug = locMatch?.[2] || `cam-${i + 1}`;
        const key = `${district}-${slug}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const stillImageUrl = `https://cwwp2.dot.ca.gov/data/${district}/cctv/image/${slug}/${slug}.jpg`;
        feeds.push({
            id: `caltrans-${key}`, name, lat, lng,
            url: stillImageUrl,
            videoUrl: streamCapable ? pageUrl : null,
            fallbackUrl: stillImageUrl,
            city: 'California',
            mediaType: streamCapable ? 'caltrans' : 'image',
            streamCapable, refreshSeconds: 5, provider: 'Caltrans',
        });
        if (feeds.length >= MAX_CALTRANS_CAMERAS) break;
    }
    return feeds;
}

function normalize511Feeds(payload, provider, region, maxFeeds, originBase) {
    const parsed = parseJsonPayload(payload);
    if (!Array.isArray(parsed)) return [];
    const feeds = [];
    const normalizedBase = String(originBase || '').replace(/\/$/, '');
    for (const cam of parsed) {
        const lat = Number(cam?.Latitude);
        const lng = Number(cam?.Longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const firstView = Array.isArray(cam.Views)
            ? cam.Views.find((v) => v && v.Status === 'Enabled' && v.Url)
            : null;
        if (!firstView) continue;
        const viewUrl = firstView.Url.startsWith('http')
            ? firstView.Url
            : `${normalizedBase}${firstView.Url.startsWith('/') ? '' : '/'}${firstView.Url}`;
        feeds.push({
            id: `${provider.toLowerCase().replace(/\s+/g, '-')}-${cam.Id}-${firstView.Id || 'main'}`,
            name: cam.Location || `${cam.Roadway || 'Road'} ${cam.Direction || ''}`.trim(),
            lat, lng, url: viewUrl, fallbackUrl: viewUrl,
            city: region, mediaType: inferMediaTypeFromUrls({ url: viewUrl }),
            refreshSeconds: 5, provider,
        });
        if (feeds.length >= maxFeeds) break;
    }
    return feeds;
}

function normalizeTflFeeds(payload) {
    const parsed = parseJsonPayload(payload);
    if (!Array.isArray(parsed)) return [];
    const feeds = [];
    for (const cam of parsed) {
        const lat = Number(cam?.lat);
        const lng = Number(cam?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const metadata = {};
        if (Array.isArray(cam.additionalProperties)) {
            cam.additionalProperties.forEach((e) => { if (e?.key) metadata[e.key] = e.value; });
        }
        const imageUrl = metadata.imageUrl || '';
        const videoUrl = metadata.videoUrl || '';
        const primaryUrl = imageUrl || videoUrl;
        if (!primaryUrl) continue;
        feeds.push({
            id: `tfl-${cam.id || cam.commonName || feeds.length}`,
            name: cam.commonName || metadata.view || 'TfL JamCam',
            lat, lng, url: primaryUrl, videoUrl: videoUrl || null,
            fallbackUrl: imageUrl || null,
            city: 'London',
            mediaType: inferMediaTypeFromUrls({ url: imageUrl, videoUrl }),
            refreshSeconds: 5, provider: 'TfL JamCams',
        });
        if (feeds.length >= MAX_TFL_CAMERAS) break;
    }
    return feeds;
}

function mergeFeeds(feedGroups) {
    const merged = [];
    const seen = new Set();
    for (const group of feedGroups) {
        for (const feed of group) {
            if (!feed || !Number.isFinite(feed.lat) || !Number.isFinite(feed.lng)) continue;
            const key = `${feed.provider || 'pub'}:${feed.id || ''}:${feed.lat.toFixed(4)}:${feed.lng.toFixed(4)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(feed);
            if (merged.length >= MAX_TOTAL_CAMERAS) return merged;
        }
    }
    return merged;
}

function getCameraPriority(feed) {
    let score = 0;
    if (feed?.videoUrl) score += 50;
    if (feed?.streamCapable) score += 20;
    if (feed?.mediaType === 'video') score += 25;
    if (feed?.mediaType === 'embed') score += 18;
    if (feed?.provider === 'YouTube Live') score += 12;
    if (feed?.provider === 'TfL JamCams') score += 10;
    return score;
}

function prioritizeFeeds(feeds) {
    return [...(feeds || [])].sort((a, b) => getCameraPriority(b) - getCameraPriority(a));
}

function getCameraRenderBudget(activeShader) {
    if (activeShader === 'GOD') return 1600;
    return DEFAULT_RENDERED_CAMERAS;
}

function downsampleFeeds(feeds, maxCount) {
    if (!Array.isArray(feeds) || feeds.length <= maxCount) return feeds;
    const step = Math.max(1, Math.ceil(feeds.length / maxCount));
    const sampled = [];
    for (let i = 0; i < feeds.length && sampled.length < maxCount; i += step) {
        sampled.push(feeds[i]);
    }
    return sampled;
}

function createCameraIcon() {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(8, 12, 32, 20, 2);
    } else {
        ctx.rect(8, 12, 32, 20);
    }
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(24, 22, 6, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(24, 22, 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#00ff41';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20, 32);
    ctx.lineTo(16, 40);
    ctx.lineTo(32, 40);
    ctx.lineTo(28, 32);
    ctx.fillStyle = 'rgba(0, 255, 65, 0.55)';
    ctx.fill();
    return canvas.toDataURL();
}

function addEntitiesToViewer(viewer, feeds, imageUrl) {
    const entities = [];
    feeds.forEach((cam) => {
        const entity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(cam.lng, cam.lat, 140),
            name: cam.name,
            billboard: {
                image: imageUrl,
                scale: 0.58,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                disableDepthTestDistance: 9000000,
            },
            properties: {
                _layerType: 'cctv',
                id: cam.id,
                city: cam.city || 'Unknown',
                provider: cam.provider || 'Public',
                latitude: cam.lat.toFixed(4),
                longitude: cam.lng.toFixed(4),
                cameraType: 'TRAFFIC',
                url: cam.url || null,
                videoUrl: cam.videoUrl || null,
                fallbackUrl: cam.fallbackUrl || cam.url || null,
                detailsUrl: cam.detailsUrl || null,
                mediaType: cam.mediaType || 'image',
                mediaEnabled: true,
                streamCapable: Boolean(cam.streamCapable),
                refreshSeconds: cam.refreshSeconds || 5,
                status: cam.url || cam.videoUrl ? 'LIVE' : 'NO FEED URL',
            },
        });
        entities.push(entity);
    });
    return entities;
}

/**
 * CameraLayer — fetches from government APIs + dynamic discovery engine.
 * Adds Cesium billboard entities for each camera feed.
 */
export default function CameraLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.cctv.enabled);
    const activeShader = useStore((s) => s.activeShader);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);
    const entitiesRef = useRef([]);

    const clearEntities = useCallback(() => {
        entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
        entitiesRef.current = [];
    }, [viewer]);

    useEffect(() => {
        let cancelled = false;

        async function loadCameras() {
            if (!isEnabled) return;
            setStatus('cctv', 'loading');
            clearEntities();

            const imageUrl = createCameraIcon();
            if (!imageUrl) {
                updateData('cctv', []);
                setStatus('cctv', 'error');
                return;
            }
            const renderBudget = getCameraRenderBudget(activeShader);
            const cachedFeeds = readLayerCache(CAMERA_CACHE_KEY, CAMERA_CACHE_TTL_MS);
            if (Array.isArray(cachedFeeds) && cachedFeeds.length && !cancelled && isEnabled && !viewer.isDestroyed()) {
                const prioritizedCachedFeeds = prioritizeFeeds(
                    cachedFeeds.filter((f) => Boolean(f.videoUrl || f.url || f.fallbackUrl))
                );
                const cachedRenderFeeds = downsampleFeeds(prioritizedCachedFeeds, renderBudget);
                entitiesRef.current = addEntitiesToViewer(viewer, cachedRenderFeeds, imageUrl);
                updateData('cctv', prioritizedCachedFeeds);
                setStatus('cctv', 'active');
            }

            // Phase 1: Government / traffic APIs (fast, reliable)
            const [caltransRes, ontarioRes, albertaRes, tflRes] = await Promise.allSettled([
                fetchTextWithPolicy(API_URLS.CAMERA_CALTRANS_CATALOG, {
                    timeoutMs: REQUEST_TIMEOUT_MS,
                    retries: 1,
                    circuitKey: 'cctv:caltrans-catalog',
                }),
                fetchTextWithPolicy(API_URLS.CAMERA_ONTARIO_511_PROXY, {
                    timeoutMs: REQUEST_TIMEOUT_MS,
                    retries: 1,
                    circuitKey: 'cctv:ontario-511',
                }),
                fetchTextWithPolicy(API_URLS.CAMERA_ALBERTA_511_PROXY, {
                    timeoutMs: REQUEST_TIMEOUT_MS,
                    retries: 1,
                    circuitKey: 'cctv:alberta-511',
                }),
                fetchTextWithPolicy(API_URLS.CAMERA_TFL_JAMCAMS, {
                    timeoutMs: REQUEST_TIMEOUT_MS,
                    retries: 1,
                    circuitKey: 'cctv:tfl-jamcams',
                }),
            ]);

            const caltransFeeds = caltransRes.status === 'fulfilled' ? normalizeCaltransFeed(caltransRes.value) : [];
            const ontarioFeeds = ontarioRes.status === 'fulfilled'
                ? normalize511Feeds(ontarioRes.value, 'Ontario 511', 'Ontario', MAX_ONTARIO_CAMERAS, 'https://511on.ca')
                : [];
            const albertaFeeds = albertaRes.status === 'fulfilled'
                ? normalize511Feeds(albertaRes.value, 'Alberta 511', 'Alberta', MAX_ALBERTA_CAMERAS, 'https://511.alberta.ca')
                : [];
            const tflFeeds = tflRes.status === 'fulfilled' ? normalizeTflFeeds(tflRes.value) : [];

            let govFeeds = mergeFeeds([caltransFeeds, ontarioFeeds, albertaFeeds, tflFeeds, WORLDCAMS_FEEDS, CAMERA_FEEDS]);
            govFeeds = govFeeds.filter((f) => Boolean(f.videoUrl || f.url || f.fallbackUrl));
            govFeeds = prioritizeFeeds(govFeeds);
            const renderFeeds = downsampleFeeds(govFeeds, renderBudget);

            if (cancelled || !isEnabled || viewer.isDestroyed()) return;

            if (govFeeds.length) {
                clearEntities();
                entitiesRef.current = addEntitiesToViewer(viewer, renderFeeds, imageUrl);
                updateData('cctv', govFeeds);
                setStatus('cctv', 'active');
                writeLayerCache(CAMERA_CACHE_KEY, govFeeds);
            } else if (!cachedFeeds?.length) {
                setStatus('cctv', 'error');
            }

            // Phase 2: Supplemental discovery — background enrichment only.
            try {
                const discoveredFeeds = await discoverAllFeeds();
                if (cancelled || !isEnabled || viewer.isDestroyed()) return;

                const allFeeds = prioritizeFeeds(mergeFeeds([govFeeds, discoveredFeeds]));
                const displayable = allFeeds.filter((f) => Boolean(f.videoUrl || f.url || f.fallbackUrl));

                // Only re-render if we discovered new feeds
                if (displayable.length > govFeeds.length) {
                    clearEntities();
                    const sampled = downsampleFeeds(displayable, renderBudget);
                    entitiesRef.current = addEntitiesToViewer(viewer, sampled, imageUrl);
                    updateData('cctv', displayable);
                    setStatus('cctv', 'active');
                    writeLayerCache(CAMERA_CACHE_KEY, displayable);
                }
            } catch (err) {
                console.warn('[CameraLayer] Discovery phase failed:', err.message);
            }
        }

        if (isEnabled) {
            loadCameras();
        } else {
            clearEntities();
            updateData('cctv', []);
            setStatus('cctv', 'idle');
        }

        return () => {
            cancelled = true;
            clearEntities();
        };
    }, [activeShader, isEnabled, viewer, updateData, setStatus, clearEntities]);

    return null;
}
