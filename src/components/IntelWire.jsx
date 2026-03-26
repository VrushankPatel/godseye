import React, { useEffect, useMemo, useRef, useState } from 'react';
import useStore from '../store/useStore';
import { API_URLS } from '../constants/dataSources';
import { getRuntimeKey } from '../utils/runtimeEnv';
import { fetchJsonWithPolicy } from '../utils/network';
import {
    INTEL_REGIONS,
    buildIntelRegionCounts,
    classifyIntelSeverity,
    matchesIntelRegion,
} from '../services/intelMonitor';

const INTEL_REFRESH_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;
const MAX_ITEMS = 18;
const INTEL_CACHE_KEY = 'godseye:intel-wire-cache:v2';
const INTEL_CACHE_MAX_AGE_MS = 4 * 60 * 60 * 1000;
const INTEL_KEYWORD_RE = /(military|defen[cs]e|army|navy|air\s*force|missile|drone|strike|conflict|war|border|security|intel|nato|ukraine|russia|china|taiwan|israel|iran|syria)/i;
const GUARDIAN_API_BASE = 'https://content.guardianapis.com/search';
const GUARDIAN_API_KEY = getRuntimeKey('VITE_GUARDIAN_API_KEY', ' Guardian intelligence enrichment');
const HN_API_BASE = 'https://hn.algolia.com/api/v1/search';
const GUARDIAN_QUERIES = [
    'military conflict',
    'war security',
    'border tensions',
    'missile strike',
];
const HN_QUERIES = [
    'military conflict',
    'open source intelligence',
];

function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function parsePublishedAt(raw) {
    const ts = Date.parse(String(raw || ''));
    return Number.isFinite(ts) ? ts : 0;
}

async function fetchGuardianIntel() {
    if (!GUARDIAN_API_KEY) return [];

    const requests = GUARDIAN_QUERIES.map((query) => {
        const url = `${GUARDIAN_API_BASE}?q=${encodeURIComponent(query)}&api-key=${GUARDIAN_API_KEY}&page-size=12&show-fields=headline`;
        return fetchJsonWithPolicy(url, {
            timeoutMs: FETCH_TIMEOUT_MS,
            retries: 1,
            circuitKey: `intel:guardian:${query}`,
        }).catch(() => null);
    });
    const responses = await Promise.all(requests);
    const items = [];

    for (const data of responses) {
        const results = data?.response?.results;
        if (!Array.isArray(results)) continue;
        for (const result of results) {
            const title = normalizeText(result?.fields?.headline || result?.webTitle || '');
            const link = normalizeText(result?.webUrl || '');
            if (!title || !link) continue;
            items.push({
                id: `guardian-${link}`,
                source: `Guardian ${normalizeText(result?.sectionName || 'World')}`.trim(),
                title,
                link,
                publishedAt: parsePublishedAt(result?.webPublicationDate),
            });
        }
    }

    return items;
}

async function fetchHackerNewsIntel() {
    const requests = HN_QUERIES.map((query) => {
        const url = `${HN_API_BASE}?query=${encodeURIComponent(query)}&tags=story`;
        return fetchJsonWithPolicy(url, {
            timeoutMs: FETCH_TIMEOUT_MS,
            retries: 1,
            circuitKey: `intel:hackernews:${query}`,
        }).catch(() => null);
    });
    const responses = await Promise.all(requests);
    const items = [];

    for (const data of responses) {
        const hits = Array.isArray(data?.hits) ? data.hits : [];
        for (const hit of hits) {
            const title = normalizeText(hit?.title || hit?.story_title || '');
            const link = normalizeText(hit?.url || hit?.story_url || '');
            if (!title || !link) continue;
            items.push({
                id: `hn-${hit?.objectID || link}`,
                source: 'Hacker News',
                title,
                link,
                publishedAt: parsePublishedAt(hit?.created_at),
            });
        }
    }

    return items;
}

function relativeTime(timestampMs) {
    if (!timestampMs) return 'now';
    const diff = Date.now() - timestampMs;
    if (diff < 60_000) return 'now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
}

function readIntelCache() {
    try {
        const raw = localStorage.getItem(INTEL_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.items) || !parsed.items.length) return null;
        const items = parsed.items.slice(0, MAX_ITEMS);
        const lastUpdatedAt = Number.isFinite(parsed.lastUpdatedAt) ? parsed.lastUpdatedAt : 0;
        return { items, lastUpdatedAt };
    } catch (err) {
        return null;
    }
}

function isIntelCacheFresh(cache, now = Date.now()) {
    if (!cache?.lastUpdatedAt) return false;
    return now - cache.lastUpdatedAt < INTEL_CACHE_MAX_AGE_MS;
}

async function fetchManifestIntel() {
    const payload = await fetchJsonWithPolicy(API_URLS.INTEL_WIRE_MANIFEST, {
        timeoutMs: FETCH_TIMEOUT_MS,
        retries: 1,
        circuitKey: 'intel:manifest',
    });
    return Array.isArray(payload?.items) ? payload.items : [];
}

export default function IntelWire({ embedded = false, hidden = false, onHide = null }) {
    const appIsActive = useStore((s) => s.appIsActive);
    const sharedItems = useStore((s) => s.intelFeedItems);
    const sharedStatus = useStore((s) => s.intelFeedStatus);
    const sharedLastUpdatedAt = useStore((s) => s.intelFeedLastUpdatedAt);
    const intelRegion = useStore((s) => s.intelRegion);
    const setIntelRegion = useStore((s) => s.setIntelRegion);
    const setIntelFeedSnapshot = useStore((s) => s.setIntelFeedSnapshot);
    const [items, setItems] = useState([]);
    const [lastUpdatedAt, setLastUpdatedAt] = useState(0);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [status, setStatus] = useState('loading');
    const [reloadTick, setReloadTick] = useState(0);
    const itemsRef = useRef([]);

    useEffect(() => {
        itemsRef.current = Array.isArray(items) ? items : [];
    }, [items]);

    useEffect(() => {
        if (!sharedItems.length && !sharedLastUpdatedAt && sharedStatus === 'idle') return;
        setItems(sharedItems);
        setLastUpdatedAt(sharedLastUpdatedAt);
        setStatus(sharedStatus);
    }, [sharedItems, sharedLastUpdatedAt, sharedStatus]);

    useEffect(() => {
        try {
            const cache = readIntelCache();
            if (!cache) return;
            const fresh = isIntelCacheFresh(cache);
            setItems(cache.items);
            setLastUpdatedAt(cache.lastUpdatedAt);
            setStatus(fresh ? 'active' : 'stale');
            setIntelFeedSnapshot({
                items: cache.items,
                status: fresh ? 'active' : 'stale',
                lastUpdatedAt: cache.lastUpdatedAt,
            });
        } catch (err) {
            // Ignore local cache issues.
        }
    }, [setIntelFeedSnapshot]);

    useEffect(() => {
        if (!appIsActive) return undefined;
        let cancelled = false;

        const loadIntel = async () => {
            const cache = readIntelCache();
            if (reloadTick === 0 && isIntelCacheFresh(cache)) {
                setItems(cache.items);
                setLastUpdatedAt(cache.lastUpdatedAt);
                setStatus('active');
                setIntelFeedSnapshot({
                    items: cache.items,
                    status: 'active',
                    lastUpdatedAt: cache.lastUpdatedAt,
                });
                return;
            }

            if (!itemsRef.current.length) {
                setStatus('loading');
                setIntelFeedSnapshot({
                    items: itemsRef.current,
                    status: 'loading',
                    lastUpdatedAt,
                });
            }
            const [guardianItems, hnItems, manifestItems] = await Promise.all([
                fetchGuardianIntel().catch(() => []),
                fetchHackerNewsIntel().catch(() => []),
                fetchManifestIntel().catch(() => []),
            ]);

            if (cancelled) return;

            const merged = [];
            const seen = new Set();

            const ingest = (items) => {
                for (const item of items) {
                    const dedupeKey = `${item.link}::${item.title}`;
                    if (seen.has(dedupeKey)) continue;
                    seen.add(dedupeKey);
                    merged.push(item);
                }
            };

            ingest(manifestItems);
            ingest(guardianItems);
            ingest(hnItems);

            const keywordFiltered = merged.filter((item) => INTEL_KEYWORD_RE.test(item.title));
            const chosen = (keywordFiltered.length >= 6 ? keywordFiltered : merged)
                .sort((a, b) => b.publishedAt - a.publishedAt)
                .slice(0, MAX_ITEMS);

            if (chosen.length) {
                const now = Date.now();
                setItems(chosen);
                setLastUpdatedAt(now);
                setStatus('active');
                setIntelFeedSnapshot({
                    items: chosen,
                    status: 'active',
                    lastUpdatedAt: now,
                });
                try {
                    localStorage.setItem(INTEL_CACHE_KEY, JSON.stringify({
                        items: chosen,
                        lastUpdatedAt: now,
                    }));
                } catch (err) {
                    // Ignore cache write errors.
                }
                return;
            }

            if (itemsRef.current.length) {
                setStatus('stale');
                setIntelFeedSnapshot({
                    items: itemsRef.current,
                    status: 'stale',
                    lastUpdatedAt,
                });
            } else {
                setStatus('error');
                setIntelFeedSnapshot({
                    items: [],
                    status: 'error',
                    lastUpdatedAt: 0,
                });
            }
        };

        loadIntel();
        const timer = setInterval(() => {
            const cache = readIntelCache();
            if (isIntelCacheFresh(cache)) return;
            loadIntel();
        }, INTEL_REFRESH_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [appIsActive, lastUpdatedAt, reloadTick, setIntelFeedSnapshot]);

    const updatedLabel = useMemo(() => {
        if (status === 'loading' && !lastUpdatedAt) return 'syncing';
        if (!lastUpdatedAt) return 'offline';
        return relativeTime(lastUpdatedAt);
    }, [lastUpdatedAt, status]);

    const regionCounts = useMemo(() => buildIntelRegionCounts(items), [items]);
    const visibleItems = useMemo(
        () => items.filter((item) => matchesIntelRegion(item, intelRegion)),
        [items, intelRegion]
    );

    if (hidden) return null;

    const containerClass = embedded ? 'rcp-section' : 'glass-panel pointer-events-auto';
    const containerStyle = embedded
        ? undefined
        : {
            position: 'absolute',
            right: '16px',
            top: '92px',
            width: '360px',
            zIndex: 35,
            border: '1px solid rgba(0, 180, 255, 0.42)',
            background: 'rgba(8, 12, 22, 0.75)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
        };

    return (
        <div
            className={containerClass}
            style={containerStyle}
        >
            <div className={`flex items-center justify-between px-3 py-2 border-b border-cyan-500/30 ${embedded ? 'rcp-header' : ''}`}>
                <div className="text-cyan-200 tracking-[0.22em] text-[11px] uppercase flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    Live Intel Wire
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim">{updatedLabel}</span>
                    <button
                        onClick={() => setIsCollapsed((prev) => !prev)}
                        className={embedded ? 'rcp-action' : 'text-text-dim hover:text-white text-xs'}
                        title={isCollapsed ? 'Expand intel wire' : 'Collapse intel wire'}
                    >
                        {isCollapsed ? '▾' : '▴'}
                    </button>
                    {typeof onHide === 'function' && (
                        <button
                            onClick={onHide}
                            className={embedded ? 'rcp-action' : 'text-text-dim hover:text-white text-xs'}
                            title="Hide intel wire"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            <div className="px-2 py-2 border-b border-cyan-500/10">
                <div className="grid grid-cols-3 gap-1.5">
                    {INTEL_REGIONS.map((region) => {
                        const isActive = intelRegion === region.id;
                        return (
                            <button
                                key={region.id}
                                onClick={() => setIntelRegion(region.id)}
                                className={`text-[9px] tracking-[0.18em] uppercase border px-2 py-1.5 rounded-sm transition-colors ${
                                    isActive
                                        ? 'border-cyan-300/60 text-cyan-100 bg-cyan-500/10'
                                        : 'border-white/10 text-text-dim hover:border-cyan-500/30 hover:text-cyan-200'
                                }`}
                                title={`${region.label} intelligence`}
                            >
                                <span>{region.label}</span>{' '}
                                <span className={isActive ? 'text-cyan-300' : 'text-text-dim'}>
                                    {regionCounts[region.id] || 0}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {!isCollapsed && (
                <div className={embedded ? 'max-h-[240px] overflow-y-auto' : 'max-h-[300px] overflow-y-auto'}>
                    {visibleItems.length ? (
                        visibleItems.map((item) => (
                            <a
                                key={item.id}
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`block px-3 py-2 border-b border-cyan-500/10 hover:bg-cyan-500/10 transition-colors ${embedded ? 'text-[11px]' : ''}`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="text-[10px] tracking-[0.22em] uppercase text-cyan-300">{item.source}</div>
                                    <span
                                        className={`text-[8px] tracking-[0.16em] uppercase ${
                                            classifyIntelSeverity(item) === 'critical'
                                                ? 'text-red-300'
                                                : classifyIntelSeverity(item) === 'elevated'
                                                    ? 'text-amber-300'
                                                    : 'text-emerald-300'
                                        }`}
                                    >
                                        {classifyIntelSeverity(item)}
                                    </span>
                                </div>
                                <div className="text-[12px] leading-snug text-slate-100">{item.title}</div>
                                <div className="text-[10px] tracking-[0.2em] uppercase text-text-dim mt-1">{relativeTime(item.publishedAt)}</div>
                            </a>
                        ))
                    ) : (
                        <div className="px-3 py-3 border-b border-cyan-500/10">
                            <div className="text-[10px] tracking-[0.2em] uppercase text-cyan-300 mb-2">
                                {items.length && status !== 'loading' ? 'NO REGIONAL MATCHES' : status === 'loading' ? 'SYNCING FEEDS...' : 'WIRE OFFLINE'}
                            </div>
                            <div className="text-[11px] leading-snug text-text-dim">
                                {items.length && status !== 'loading'
                                    ? 'This region currently has no matching live intelligence headlines.'
                                    : status === 'loading'
                                    ? 'Collecting intelligence headlines from public sources.'
                                    : 'News providers are temporarily unreachable. Retry to refresh now.'}
                            </div>
                            {status !== 'loading' && !items.length && (
                                <button
                                    onClick={() => setReloadTick((v) => v + 1)}
                                    className="mt-2 px-2 py-1 border border-cyan-500/35 text-[10px] tracking-[0.2em] text-cyan-200 hover:bg-cyan-500/10 rounded-sm"
                                >
                                    RETRY
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
