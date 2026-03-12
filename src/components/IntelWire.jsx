import React, { useEffect, useMemo, useState } from 'react';

const INTEL_REFRESH_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;
const MAX_ITEMS = 18;
const INTEL_KEYWORD_RE = /(military|defen[cs]e|army|navy|air\s*force|missile|drone|strike|conflict|war|border|security|intel|nato|ukraine|russia|china|taiwan|israel|iran|syria)/i;

const INTEL_SOURCES = [
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

async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
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
        const raw = await fetchWithTimeout(rawProxy);
        if (raw && !/^\s*error code:\s*\d+/i.test(raw)) {
            return raw;
        }
    } catch (err) {
        // fall through to get-proxy path
    }

    const wrapped = await fetchWithTimeout(getProxy);
    const parsed = JSON.parse(wrapped);
    if (!parsed?.contents) {
        throw new Error('Feed payload missing contents');
    }
    return String(parsed.contents);
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

    useEffect(() => {
        let cancelled = false;

        const loadIntel = async () => {
            const results = await Promise.allSettled(
                INTEL_SOURCES.map(async (source) => {
                    try {
                        const text = await fetchRssText(source.url);
                        return extractFeedItems(text, source.name);
                    } catch (err) {
                        return [];
                    }
                })
            );

            if (cancelled) return;

            const merged = [];
            const seen = new Set();
            for (const result of results) {
                if (result.status !== 'fulfilled') continue;
                for (const item of result.value) {
                    const dedupeKey = `${item.link}::${item.title}`;
                    if (seen.has(dedupeKey)) continue;
                    seen.add(dedupeKey);
                    merged.push(item);
                }
            }

            const keywordFiltered = merged.filter((item) => INTEL_KEYWORD_RE.test(item.title));
            const chosen = (keywordFiltered.length >= 6 ? keywordFiltered : merged)
                .sort((a, b) => b.publishedAt - a.publishedAt)
                .slice(0, MAX_ITEMS);

            setItems(chosen);
            setLastUpdatedAt(Date.now());
        };

        loadIntel();
        const timer = setInterval(loadIntel, INTEL_REFRESH_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    const hasItems = items.length > 0;
    const updatedLabel = useMemo(() => {
        if (!lastUpdatedAt) return 'syncing';
        return relativeTime(lastUpdatedAt);
    }, [lastUpdatedAt]);

    if (hidden || !hasItems) return null;

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
                    {items.map((item) => (
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
                    ))}
                </div>
            )}
        </div>
    );
}
