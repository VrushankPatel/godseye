import React, { useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const REQUEST_TIMEOUT_MS = 12000;

async function fetchJsonWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

function normalizeGeoJsonFeatures(payload, sourceLabel) {
    if (!payload?.features?.length) return [];
    return payload.features.map((f) => {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) return null;
        return {
            id: `seismic-${props.code || props.ids || Math.random().toString(36).slice(2)}`,
            name: props.title || props.place || 'Unknown Quake',
            lat: coords[1],
            lng: coords[0],
            depth_km: coords[2] || 0,
            magnitude: props.mag || 0,
            time: props.time ? new Date(props.time).toISOString() : null,
            source: sourceLabel,
            type: 'seismic',
        };
    }).filter(Boolean);
}

export default function SeismicLayer() {
    const isEnabled = useStore((s) => s.layers.seismic.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);

    const pollTimerRef = useRef(null);
    const mountedRef = useRef(true);

    const fetchSeismic = useCallback(async () => {
        if (!mountedRef.current) return;
        setStatus('seismic', 'loading');

        try {
            const usgsUrl = API_URLS.USGS_EARTHQUAKE_FEED || 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson';
            const payload = await fetchJsonWithTimeout(usgsUrl);
            if (!mountedRef.current) return;

            const events = normalizeGeoJsonFeatures(payload, 'USGS');
            updateData('seismic', events);
            setStatus('seismic', events.length ? 'active' : 'error');
        } catch (err) {
            if (mountedRef.current) {
                setStatus('seismic', 'error');
            }
        }
    }, [setStatus, updateData]);

    useEffect(() => {
        mountedRef.current = true;

        if (!isEnabled) {
            clearInterval(pollTimerRef.current);
            updateData('seismic', []);
            setStatus('seismic', 'idle');
            return;
        }

        fetchSeismic();
        pollTimerRef.current = setInterval(fetchSeismic, POLL_INTERVALS.SEISMIC || 120000);

        return () => {
            mountedRef.current = false;
            clearInterval(pollTimerRef.current);
        };
    }, [isEnabled, fetchSeismic, updateData, setStatus]);

    return null;
}
