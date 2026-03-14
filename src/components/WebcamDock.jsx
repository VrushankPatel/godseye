import React, { useEffect, useMemo, useState } from 'react';
import useStore from '../store/useStore';

const PREVIEW_REFRESH_MS = 9000;
const MAX_DOCK_FEEDS = 6;

function isImageUrl(url) {
    return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(String(url || ''));
}

function withCacheBuster(url, nonce) {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        parsed.searchParams.set('_pv', String(nonce));
        return parsed.toString();
    } catch (err) {
        return `${url}${url.includes('?') ? '&' : '?'}_pv=${nonce}`;
    }
}

function extractYoutubeId(url) {
    const value = String(url || '');
    const embedMatch = value.match(/youtube\.com\/embed\/([^?&/]+)/i);
    if (embedMatch?.[1]) return embedMatch[1];
    const watchMatch = value.match(/[?&]v=([^?&/]+)/i);
    if (watchMatch?.[1]) return watchMatch[1];
    return '';
}

function pickFeaturedFeeds(feeds, limit = MAX_DOCK_FEEDS) {
    if (!Array.isArray(feeds) || feeds.length === 0) return [];

    const filtered = feeds.filter((feed) => feed && (feed.videoUrl || feed.url || feed.fallbackUrl));
    if (filtered.length <= limit) return filtered;

    const picked = [];
    const seenProviders = new Set();

    for (const feed of filtered) {
        const provider = String(feed.provider || '').toLowerCase();
        if (!provider || seenProviders.has(provider)) continue;
        picked.push(feed);
        seenProviders.add(provider);
        if (picked.length >= Math.ceil(limit / 2)) break;
    }

    for (const feed of filtered) {
        if (picked.length >= limit) break;
        if (!picked.includes(feed)) picked.push(feed);
    }

    return picked.slice(0, limit);
}

export default function WebcamDock() {
    const cctvEnabled = useStore((s) => s.layers.cctv.enabled);
    const cctvFeeds = useStore((s) => s.layers.cctv.data);
    const setInspector = useStore((s) => s.setInspector);
    const [previewNonce, setPreviewNonce] = useState(Date.now());

    useEffect(() => {
        if (!cctvEnabled) return undefined;
        const timer = setInterval(() => setPreviewNonce(Date.now()), PREVIEW_REFRESH_MS);
        return () => clearInterval(timer);
    }, [cctvEnabled]);

    const featuredFeeds = useMemo(() => pickFeaturedFeeds(cctvFeeds, MAX_DOCK_FEEDS), [cctvFeeds]);

    if (!cctvEnabled || featuredFeeds.length === 0) return null;

    const openFeed = (feed, index) => {
        setInspector({
            type: 'cctv',
            _entityId: `cctv-${feed.id || index}`,
            id: feed.id || `dock-${index}`,
            name: feed.name || 'Camera Feed',
            provider: feed.provider || 'Public Feed',
            city: feed.city || 'Unknown',
            latitude: Number(feed.lat || feed.latitude || 0).toFixed(4),
            longitude: Number(feed.lng || feed.longitude || 0).toFixed(4),
            url: feed.url || feed.fallbackUrl || '',
            videoUrl: feed.videoUrl || null,
            fallbackUrl: feed.fallbackUrl || feed.url || null,
            detailsUrl: feed.detailsUrl || null,
            mediaType: feed.mediaType || (feed.videoUrl ? 'video' : 'image'),
            streamCapable: Boolean(feed.streamCapable || feed.videoUrl),
            refreshSeconds: feed.refreshSeconds || 5,
            status: 'LIVE',
        });
    };

    return (
        <div
            className="glass-panel pointer-events-auto"
            style={{
                position: 'absolute',
                right: '16px',
                bottom: '114px',
                width: '460px',
                zIndex: 34,
                border: '1px solid rgba(0, 255, 65, 0.28)',
                background: 'rgba(6, 11, 18, 0.76)',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.46)',
            }}
        >
            <div className="px-3 py-2 border-b border-green-500/20 flex items-center justify-between">
                <div className="text-[11px] tracking-[0.25em] uppercase text-green-300">Live Webcam Dock</div>
                <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim">{featuredFeeds.length} live nodes</div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-2">
                {featuredFeeds.map((feed, index) => {
                    const previewUrl = isImageUrl(feed.fallbackUrl)
                        ? withCacheBuster(feed.fallbackUrl, previewNonce)
                        : isImageUrl(feed.url)
                            ? withCacheBuster(feed.url, previewNonce)
                            : (() => {
                                const ytId = extractYoutubeId(feed.videoUrl);
                                return ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '';
                            })();

                    return (
                        <button
                            key={`${feed.id || index}`}
                            onClick={() => openFeed(feed, index)}
                            className="relative text-left border border-cyan-500/25 rounded overflow-hidden bg-black/50 hover:border-cyan-300/60 transition-colors"
                            title={feed.name || 'Open feed'}
                        >
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt={feed.name || 'CCTV preview'}
                                    className="w-full h-[76px] object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-[76px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                            )}

                            <div className="absolute top-1 left-1 bg-black/75 text-[9px] px-1.5 py-0.5 tracking-[0.2em] uppercase text-green-300 border border-green-500/35">
                                Live
                            </div>
                            <div className="absolute inset-x-0 bottom-0 bg-black/78 px-1.5 py-1">
                                <div className="text-[10px] tracking-[0.12em] text-cyan-100 truncate">{feed.name || 'Camera'}</div>
                                <div className="text-[9px] tracking-[0.16em] uppercase text-text-dim truncate">{feed.city || feed.provider || 'Feed'}</div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
