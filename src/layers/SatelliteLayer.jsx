import React, { useEffect, useRef, useCallback } from 'react';
import * as satellite from 'satellite.js';
import useStore from '../store/useStore';
import { POLL_INTERVALS } from '../constants/dataSources';

const TLE_API_BASE = 'https://tle.ivanstanojevic.me/api/tle/';
const PAGE_SIZE = 100;
const MAX_FETCH_PAGES = 80;
const PAGE_FETCH_CONCURRENCY = 6;
const MAX_RENDERED_SATELLITES = 8000;

const FALLBACK_TLE = `ISS (ZARYA)
1 25544U 98067A   24068.31846065  .00017169  00000+0  31416-3 0  9997
2 25544  51.6406   9.2062 0005705  72.1866  33.9189 15.49883492443026
HST
1 20580U 90037B   24068.27218384  .00003290  00000+0  16259-3 0  9991
2 20580  28.4694 207.2185 0002448  91.1354  30.8351 15.00052309489568
NOAA 19
1 33591U 09005A   24068.45524317  .00000114  00000+0  10065-3 0  9997
2 33591  99.1672  46.8524 0014282 259.9571  99.9880 14.12871373778526`;

function parseFallbackTle(text) {
    const records = [];
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    for (let i = 0; i < lines.length; i += 3) {
        if (i + 2 >= lines.length) break;
        const name = lines[i].trim();
        const line1 = lines[i + 1].trim();
        const line2 = lines[i + 2].trim();
        if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) continue;
        try {
            const satrec = satellite.twoline2satrec(line1, line2);
            records.push({ id: String(satrec.satnum), name, satrec });
        } catch (_) { }
    }
    return records;
}

function parseTleApiMember(member = []) {
    const records = [];
    for (const item of member) {
        if (!item?.line1 || !item?.line2) continue;
        try {
            const satrec = satellite.twoline2satrec(item.line1.trim(), item.line2.trim());
            if (!satrec?.satnum) continue;
            records.push({
                id: String(item.satelliteId || satrec.satnum),
                name: item.name || `SAT-${item.satelliteId || satrec.satnum}`,
                satrec,
            });
        } catch (_) { }
    }
    return records;
}

function getTotalPages(view) {
    const last = view?.last;
    if (!last || typeof last !== 'string') return null;
    const match = last.match(/[?&]page=(\d+)/);
    return match ? Number(match[1]) : null;
}

async function fetchTlePage(page, signal) {
    const response = await fetch(`${TLE_API_BASE}?page=${page}&page-size=${PAGE_SIZE}`, {
        signal, cache: 'no-store',
    });
    if (!response.ok) throw new Error(`TLE API HTTP ${response.status}`);
    return response.json();
}

function propagateAllToLatLng(records) {
    const now = new Date();
    const gmst = satellite.gstime(now);
    const result = [];
    for (const { id, name, satrec } of records.slice(0, MAX_RENDERED_SATELLITES)) {
        try {
            const pv = satellite.propagate(satrec, now);
            const posEci = pv?.position;
            if (!posEci || typeof posEci === 'boolean') continue;
            const posGd = satellite.eciToGeodetic(posEci, gmst);
            const lng = satellite.degreesLong(posGd.longitude);
            const lat = satellite.degreesLat(posGd.latitude);
            const heightKm = posGd.height;
            if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(heightKm)) continue;
            const velocity = pv.velocity;
            const vKmh = velocity ? Math.round(Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2) * 3600) : null;
            result.push({
                id: `satellite-${id}`,
                name,
                lat,
                lng,
                alt_m: heightKm * 1000,
                altitude: `${Math.round(heightKm)} km`,
                velocity: vKmh !== null ? `${vKmh} km/h` : 'N/A',
                inclination: `${((satrec.inclo || 0) * 180 / Math.PI).toFixed(2)}°`,
            });
        } catch (_) { }
    }
    return result;
}

export default function SatelliteLayer() {
    const isEnabled = useStore((s) => s.layers.satellites.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);

    const satRecordsRef = useRef([]);
    const updateTimerRef = useRef(null);
    const abortRef = useRef(null);

    const propagateAndUpdate = useCallback(() => {
        if (!satRecordsRef.current.length) return;
        const propagated = propagateAllToLatLng(satRecordsRef.current);
        updateData('satellites', propagated);
    }, [updateData]);

    const loadFromPaginatedApi = useCallback(async (signal) => {
        const aggregate = [];
        const firstPage = await fetchTlePage(1, signal);
        aggregate.push(...parseTleApiMember(firstPage.member));
        updateData('satellites', propagateAllToLatLng(aggregate));

        const totalPages = getTotalPages(firstPage.view) || 1;
        const pagesToFetch = Math.min(MAX_FETCH_PAGES, totalPages);

        for (let start = 2; start <= pagesToFetch; start += PAGE_FETCH_CONCURRENCY) {
            const pages = [];
            for (let p = start; p < start + PAGE_FETCH_CONCURRENCY && p <= pagesToFetch; p++) pages.push(p);
            const results = await Promise.allSettled(pages.map((p) => fetchTlePage(p, signal)));
            for (const r of results) {
                if (r.status === 'fulfilled') aggregate.push(...parseTleApiMember(r.value.member));
            }
            if (signal.aborted) return [];
            updateData('satellites', propagateAllToLatLng(aggregate));
        }
        return aggregate;
    }, [updateData]);

    const loadSatellites = useCallback(async () => {
        setStatus('satellites', 'loading');
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const records = await loadFromPaginatedApi(controller.signal);
            if (controller.signal.aborted) return;
            if (!records.length) throw new Error('No records');
            satRecordsRef.current = records;
            setStatus('satellites', 'active');
            propagateAndUpdate();
            updateTimerRef.current = setInterval(propagateAndUpdate, POLL_INTERVALS.SATELLITES);
        } catch (err) {
            if (controller.signal.aborted) return;
            const fallback = parseFallbackTle(FALLBACK_TLE);
            satRecordsRef.current = fallback;
            updateData('satellites', propagateAllToLatLng(fallback));
            setStatus('satellites', fallback.length ? 'active' : 'error');
            updateTimerRef.current = setInterval(propagateAndUpdate, POLL_INTERVALS.SATELLITES);
        }
    }, [setStatus, updateData, loadFromPaginatedApi, propagateAndUpdate]);

    useEffect(() => {
        if (!isEnabled) {
            clearInterval(updateTimerRef.current);
            if (abortRef.current) abortRef.current.abort();
            satRecordsRef.current = [];
            updateData('satellites', []);
            setStatus('satellites', 'idle');
            return;
        }
        loadSatellites();
        return () => {
            clearInterval(updateTimerRef.current);
            if (abortRef.current) abortRef.current.abort();
        };
    }, [isEnabled, loadSatellites, updateData, setStatus]);

    return null;
}
