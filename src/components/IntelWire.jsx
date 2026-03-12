import React, { useEffect, useMemo, useRef, useState } from 'react';

const INTEL_REFRESH_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;
const MAX_ITEMS = 18;
const INTEL_CACHE_KEY = 'godseye:intel-wire-cache:v1';
const INTEL_KEYWORD_RE = /(military|defen[cs]e|army|navy|air\s*force|missile|drone|strike|conflict|war|border|security|intel|nato|ukraine|russia|china|taiwan|israel|iran|syria)/i;
const GUARDIAN_API_BASE = 'https://content.guardianapis.com/search';
const GUARDIAN_API_KEY = 'test';
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

const RSS_INTEL_SOURCES = [
    { name: 'Defense One', url: 'https://www.defenseone.com/rss/all/' },
    { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'BBC Europe', url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml' },
    { name: 'BBC Asia', url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml' },
];

function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function parsePublishedAt(raw) {
    const ts = Date.parse(String(raw || ''));
    return Number.isFinite(ts) ? ts : 0;
}

function buildAllOriginsRawUrl(url) {
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
}

function buildAllOriginsGetUrl(url) {
    return `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
}

async function fetchJsonWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            cache: 'no-store',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    } finally {
        clearTimeout(timeout);
    }
}

async function fetchTextWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            cache: 'no-store',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
    } finally {
        clearTimeout(timeout);
    }
}

async function fetchRssText(sourceUrl) {
    const rawProxy = buildAllOriginsRawUrl(sourceUrl);
    const getProxy = buildAllOriginsGetUrl(sourceUrl);

    try {
        const raw = await fetchTextWithTimeout(rawProxy);
        if (raw && !/^\s*error code:\s*\d+/i.test(raw)) {
            return raw;
        }
    } catch (err) {
        // fall through to get-proxy path
    }

    const wrapped = await fetchTextWithTimeout(getProxy);
    const parsed = JSON.parse(wrapped);
    if (!parsed?.contents) {
        throw new Error('Feed payload missing contents');
    }
    return String(parsed.contents);
}

async function fetchGuardianIntel() {
    const requests = GUARDIAN_QUERIES.map((query) => {
        const url = `${GUARDIAN_API_BASE}?q=${encodeURIComponent(query)}&api-key=${GUARDIAN_API_KEY}&page-size=12&show-fields=headline`;
        return fetchJsonWithTimeout(url).catch(() => null);
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
        return fetchJsonWithTimeout(url).catch(() => null);
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

function extractFeedItems(feedText, sourceName) {
    if (!feedText || typeof DOMParser === 'undefined') return [];
    const doc = new DOMParser().parseFromString(feedText, 'text/xml');

    const parserError = doc.querySelector('parsererror');
    if (parserError) return [];

    const itemNodes = [
        ...Array.from(doc.querySelectorAll('item')),
        ...Array.from(doc.querySelectorAll('entry')),
    ];

    return itemNodes.map((node, index) => {
        const title = normalizeText(node.querySelector('title')?.textContent || 'Untitled');
        const linkNode = node.querySelector('link');
        const link = normalizeText(
            linkNode?.getAttribute('href') ||
            linkNode?.textContent ||
            ''
        );
        const publishedRaw =
            node.querySelector('pubDate')?.textContent ||
            node.querySelector('published')?.textContent ||
            node.querySelector('updated')?.textContent ||
            '';

        return {
            id: `${sourceName}-${index}-${title.slice(0, 24)}`,
            source: sourceName,
            title,
            link,
            publishedAt: parsePublishedAt(publishedRaw),
        };
    }).filter((item) => item.title && item.link);
}

function relativeTime(timestampMs) {
    if (!timestampMs) return 'now';
    const diff = Date.now() - timestampMs;
    if (diff < 60_000) return 'now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function IntelWire({ embedded = false, hidden = false, onHide = null }) {
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
        try {
            const raw = localStorage.getItem(INTEL_CACHE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.items) || !parsed.items.length) return;
            setItems(parsed.items.slice(0, MAX_ITEMS));
            if (Number.isFinite(parsed.lastUpdatedAt)) {
                setLastUpdatedAt(parsed.lastUpdatedAt);
            }
            setStatus('stale');
        } catch (err) {
            // Ignore local cache issues.
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadIntel = async () => {
            if (!itemsRef.current.length) {
                setStatus('loading');
            }
            const [guardianItems, hnItems, rssResults] = await Promise.all([
                fetchGuardianIntel().catch(() => []),
                fetchHackerNewsIntel().catch(() => []),
                Promise.allSettled(
                    RSS_INTEL_SOURCES.map(async (source) => {
                        try {
                            const text = await fetchRssText(source.url);
                            return extractFeedItems(text, source.name);
                        } catch (err) {
                            return [];
                        }
                    })
                ),
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

            ingest(guardianItems);
            ingest(hnItems);
            for (const result of rssResults) {
                if (result.status !== 'fulfilled') continue;
                ingest(result.value);
            }

            const keywordFiltered = merged.filter((item) => INTEL_KEYWORD_RE.test(item.title));
            const chosen = (keywordFiltered.length >= 6 ? keywordFiltered : merged)
                .sort((a, b) => b.publishedAt - a.publishedAt)
                .slice(0, MAX_ITEMS);

            if (chosen.length) {
                const now = Date.now();
                setItems(chosen);
                setLastUpdatedAt(now);
                setStatus('active');
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
            } else {
                setStatus('error');
            }
        };

        loadIntel();
        const timer = setInterval(loadIntel, INTEL_REFRESH_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [reloadTick]);

    const updatedLabel = useMemo(() => {
        if (status === 'loading' && !lastUpdatedAt) return 'syncing';
        if (!lastUpdatedAt) return 'offline';
        return relativeTime(lastUpdatedAt);
    }, [lastUpdatedAt, status]);

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

            {!isCollapsed && (
                <div className={embedded ? 'max-h-[240px] overflow-y-auto' : 'max-h-[300px] overflow-y-auto'}>
                    {items.length ? (
                        items.map((item) => (
                            <a
                                key={item.id}
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`block px-3 py-2 border-b border-cyan-500/10 hover:bg-cyan-500/10 transition-colors ${embedded ? 'text-[11px]' : ''}`}
                            >
                                <div className="text-[10px] tracking-[0.22em] uppercase text-cyan-300 mb-1">{item.source}</div>
                                <div className="text-[12px] leading-snug text-slate-100">{item.title}</div>
                                <div className="text-[10px] tracking-[0.2em] uppercase text-text-dim mt-1">{relativeTime(item.publishedAt)}</div>
                            </a>
                        ))
                    ) : (
                        <div className="px-3 py-3 border-b border-cyan-500/10">
                            <div className="text-[10px] tracking-[0.2em] uppercase text-cyan-300 mb-2">
                                {status === 'loading' ? 'SYNCING FEEDS...' : 'WIRE OFFLINE'}
                            </div>
                            <div className="text-[11px] leading-snug text-text-dim">
                                {status === 'loading'
                                    ? 'Collecting intelligence headlines from public sources.'
                                    : 'News providers are temporarily unreachable. Retry to refresh now.'}
                            </div>
                            {status !== 'loading' && (
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
