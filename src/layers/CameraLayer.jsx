import React, { useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';
import { CAMERA_FEEDS } from '../constants/staticData';

const CALTRANS_CATALOG_URL = 'https://cwwp2.dot.ca.gov/data/d3/cctv/cctvStatusD03.csv';
const REQUEST_TIMEOUT_MS = 12000;
const MAX_TOTAL_CAMERAS = 6500;

function normalizeCaltransFeed(text) {
    const feeds = [];
    const lines = text.split('\n').slice(2); // skip header
    for (const line of lines) {
        const parts = line.split(',');
        if (parts.length < 8) continue;
        const lat = parseFloat(parts[5]);
        const lng = parseFloat(parts[6]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const name = (parts[2] || 'Unknown').replace(/"/g, '').trim();
        const imageUrl = (parts[9] || '').replace(/"/g, '').trim();
        feeds.push({
            id: `caltrans-${parts[0]}`,
            name,
            lat,
            lng,
            url: imageUrl || null,
            city: 'California',
            type: 'traffic',
            provider: 'Caltrans',
        });
    }
    return feeds;
}

async function fetchWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

export default function CameraLayer() {
    const isEnabled = useStore((s) => s.layers.cctv.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);
    const loadedRef = useRef(false);

    const loadCameras = useCallback(async () => {
        setStatus('cctv', 'loading');

        // Start with static feeds
        const allFeeds = [...CAMERA_FEEDS];

        // Try fetching live Caltrans catalog
        try {
            const response = await fetchWithTimeout(CALTRANS_CATALOG_URL);
            const text = await response.text();
            const caltrans = normalizeCaltransFeed(text);
            allFeeds.push(...caltrans);
        } catch (_) {
            // Continue with static feeds only
        }

        // Dedupe and cap
        const seen = new Set();
        const deduped = [];
        for (const feed of allFeeds) {
            if (seen.has(feed.id)) continue;
            seen.add(feed.id);
            deduped.push(feed);
            if (deduped.length >= MAX_TOTAL_CAMERAS) break;
        }

        updateData('cctv', deduped);
        setStatus('cctv', deduped.length ? 'active' : 'error');
        loadedRef.current = true;
    }, [updateData, setStatus]);

    useEffect(() => {
        if (!isEnabled) {
            updateData('cctv', []);
            setStatus('cctv', 'idle');
            return;
        }

        if (!loadedRef.current) {
            loadCameras();
        } else {
            // Just re-push the existing data
            setStatus('cctv', 'active');
        }
    }, [isEnabled, loadCameras, updateData, setStatus]);

    return null;
}
