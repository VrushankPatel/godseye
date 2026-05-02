import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS } from '../constants/dataSources';
import { discoverAllFeeds } from '../services/feedDiscovery';
import {
    mergeFeeds,
    normalize511Feeds,
    normalizeCaltransFeed,
    normalizeTflFeeds,
    prioritizeFeeds,
} from '../services/cctvFeeds';
import { isSharedCacheFresh } from '../services/sharedRuntimeCache';
import { readLayerCache, writeLayerCache } from '../utils/layerCache';
import { fetchJsonWithPolicy, fetchTextWithPolicy } from '../utils/network';

const MAX_CALTRANS_CAMERAS = 2400;
const MAX_ONTARIO_CAMERAS = 850;
const MAX_ALBERTA_CAMERAS = 800;
const MAX_TFL_CAMERAS = 850;
const REQUEST_TIMEOUT_MS = 12000;
const DEFAULT_RENDERED_CAMERAS = 6000;
const CAMERA_CACHE_KEY = 'cctv-feeds-v3';
const CAMERA_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

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
                videoUrl: cam.resolvedVideoUrl || cam.videoUrl || null,
                resolvedVideoUrl: cam.resolvedVideoUrl || null,
                fallbackUrl: cam.fallbackUrl || cam.url || null,
                detailsUrl: cam.detailsUrl || null,
                mediaType: cam.mediaType || 'image',
                mediaEnabled: true,
                streamCapable: Boolean(cam.streamCapable),
                refreshSeconds: cam.refreshSeconds || 5,
                verificationStatus: cam.verificationStatus || 'unknown',
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
    const markLayerFetchStart = useStore((s) => s.markLayerFetchStart);
    const sharedRuntimeCache = useStore((s) => s.sharedRuntimeCache);
    const entitiesRef = useRef([]);

    const clearEntities = useCallback(() => {
        entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
        entitiesRef.current = [];
    }, [viewer]);

    useEffect(() => {
        let cancelled = false;

        async function loadCameras() {
            if (!isEnabled) return;
            markLayerFetchStart('cctv', { sourceName: 'Verified CCTV manifest' });
            setStatus('cctv', 'loading', { sourceName: 'Verified CCTV manifest' });
            clearEntities();

            const imageUrl = createCameraIcon();
            if (!imageUrl) {
                updateData('cctv', [], { sourceName: 'Verified CCTV manifest', health: 'error', errorCode: 'icon_generation_failed' });
                setStatus('cctv', 'error', { sourceName: 'Verified CCTV manifest', errorCode: 'icon_generation_failed' });
                return;
            }
            const renderBudget = getCameraRenderBudget(activeShader);
            const cachedFeeds = readLayerCache(CAMERA_CACHE_KEY, CAMERA_CACHE_TTL_MS);
            const sharedManifestFeeds = Array.isArray(sharedRuntimeCache?.data?.cctvManifest?.feeds)
                ? sharedRuntimeCache.data.cctvManifest.feeds
                : [];
            const hasFreshSharedManifest = isSharedCacheFresh(sharedRuntimeCache?.timestamp) && sharedManifestFeeds.length > 0;
            if (Array.isArray(cachedFeeds) && cachedFeeds.length && !cancelled && isEnabled && !viewer.isDestroyed()) {
                const prioritizedCachedFeeds = prioritizeFeeds(
                    cachedFeeds.filter((f) => Boolean(f.videoUrl || f.url || f.fallbackUrl))
                );
                const cachedRenderFeeds = downsampleFeeds(prioritizedCachedFeeds, renderBudget);
                entitiesRef.current = addEntitiesToViewer(viewer, cachedRenderFeeds, imageUrl);
                updateData('cctv', prioritizedCachedFeeds, {
                    sourceName: 'Local CCTV cache',
                    isCached: true,
                    health: 'cached',
                });
                setStatus('cctv', 'active', {
                    sourceName: 'Local CCTV cache',
                    isCached: true,
                    health: 'cached',
                });
            }

            if (hasFreshSharedManifest && !cancelled && isEnabled && !viewer.isDestroyed()) {
                const prioritizedSharedFeeds = prioritizeFeeds(
                    sharedManifestFeeds.filter((f) => Boolean(f.videoUrl || f.url || f.fallbackUrl))
                );
                const sharedRenderFeeds = downsampleFeeds(prioritizedSharedFeeds, renderBudget);
                clearEntities();
                entitiesRef.current = addEntitiesToViewer(viewer, sharedRenderFeeds, imageUrl);
                updateData('cctv', prioritizedSharedFeeds, {
                    sourceName: 'Shared RTDB CCTV cache',
                    isCached: true,
                    health: 'cached',
                });
                setStatus('cctv', 'active', {
                    sourceName: 'Shared RTDB CCTV cache',
                    isCached: true,
                    health: 'cached',
                });
                return;
            }

            const [manifestRes, caltransRes, ontarioRes, albertaRes, tflRes] = await Promise.allSettled([
                fetchJsonWithPolicy(API_URLS.VERIFIED_CCTV_MANIFEST, {
                    timeoutMs: REQUEST_TIMEOUT_MS,
                    retries: 1,
                    circuitKey: 'cctv:manifest',
                }),
                fetchTextWithPolicy(API_URLS.CAMERA_CALTRANS_CATALOG, {
                    timeoutMs: REQUEST_TIMEOUT_MS,
                    retries: 1,
                    circuitKey: 'cctv:caltrans-catalog',
                }),
                fetchJsonWithPolicy(API_URLS.CAMERA_ONTARIO_511, {
                    timeoutMs: REQUEST_TIMEOUT_MS,
                    retries: 1,
                    circuitKey: 'cctv:ontario-511',
                }),
                fetchJsonWithPolicy(API_URLS.CAMERA_ALBERTA_511, {
                    timeoutMs: REQUEST_TIMEOUT_MS,
                    retries: 1,
                    circuitKey: 'cctv:alberta-511',
                }),
                fetchJsonWithPolicy(API_URLS.CAMERA_TFL_JAMCAMS, {
                    timeoutMs: REQUEST_TIMEOUT_MS,
                    retries: 1,
                    circuitKey: 'cctv:tfl-jamcams',
                }),
            ]);

            const manifestFeeds = manifestRes.status === 'fulfilled' && Array.isArray(manifestRes.value?.feeds)
                ? manifestRes.value.feeds
                : [];
            const caltransFeeds = caltransRes.status === 'fulfilled'
                ? normalizeCaltransFeed(caltransRes.value, MAX_CALTRANS_CAMERAS)
                : [];
            const ontarioFeeds = ontarioRes.status === 'fulfilled'
                ? normalize511Feeds(ontarioRes.value, 'Ontario 511', 'Ontario', MAX_ONTARIO_CAMERAS, 'https://511on.ca')
                : [];
            const albertaFeeds = albertaRes.status === 'fulfilled'
                ? normalize511Feeds(albertaRes.value, 'Alberta 511', 'Alberta', MAX_ALBERTA_CAMERAS, 'https://511.alberta.ca')
                : [];
            const tflFeeds = tflRes.status === 'fulfilled'
                ? normalizeTflFeeds(tflRes.value, MAX_TFL_CAMERAS)
                : [];

            let govFeeds = mergeFeeds([manifestFeeds, caltransFeeds, ontarioFeeds, albertaFeeds, tflFeeds]);
            govFeeds = govFeeds.filter((f) => Boolean(f.videoUrl || f.url || f.fallbackUrl));
            govFeeds = prioritizeFeeds(govFeeds);
            const renderFeeds = downsampleFeeds(govFeeds, renderBudget);

            if (cancelled || !isEnabled || viewer.isDestroyed()) return;

            if (govFeeds.length) {
                clearEntities();
                entitiesRef.current = addEntitiesToViewer(viewer, renderFeeds, imageUrl);
                updateData('cctv', govFeeds, {
                    sourceName: manifestFeeds.length ? 'Verified CCTV manifest + live catalogs' : 'Live CCTV catalogs',
                    isCached: false,
                    health: 'live',
                });
                setStatus('cctv', 'active', {
                    sourceName: manifestFeeds.length ? 'Verified CCTV manifest + live catalogs' : 'Live CCTV catalogs',
                    isCached: false,
                    health: 'live',
                });
                writeLayerCache(CAMERA_CACHE_KEY, govFeeds);
            } else if (!cachedFeeds?.length) {
                setStatus('cctv', 'error', {
                    sourceName: 'Verified CCTV manifest',
                    errorCode: 'no_camera_feeds',
                });
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
                    updateData('cctv', displayable, {
                        sourceName: 'Verified CCTV manifest + live discovery',
                        isCached: false,
                        health: 'live',
                    });
                    setStatus('cctv', 'active', {
                        sourceName: 'Verified CCTV manifest + live discovery',
                        isCached: false,
                        health: 'live',
                    });
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
            updateData('cctv', [], { status: 'idle', sourceName: 'CCTV disabled', health: 'idle' });
            setStatus('cctv', 'idle', { sourceName: 'CCTV disabled', health: 'idle' });
        }

        return () => {
            cancelled = true;
            clearEntities();
        };
    }, [activeShader, isEnabled, viewer, updateData, setStatus, markLayerFetchStart, clearEntities, sharedRuntimeCache]);

    return null;
}
