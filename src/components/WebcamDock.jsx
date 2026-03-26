import React, { useEffect, useMemo, useState } from 'react';
import useStore from '../store/useStore';
import { isWithinIntelRegion } from '../services/intelMonitor';

const PREVIEW_REFRESH_MS = 9000;
const MAX_DOCK_FEEDS = 6;
const WEBCAM_REGIONS = [
    { id: 'all', label: 'ALL' },
    { id: 'mideast', label: 'MIDEAST' },
    { id: 'europe', label: 'EUROPE' },
    { id: 'asia', label: 'ASIA' },
    { id: 'americas', label: 'AMERICAS' },
];

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

    const filtered = feeds
        .filter((feed) => feed && (feed.videoUrl || feed.url || feed.fallbackUrl))
        .sort((a, b) => {
            const aScore = (a?.videoUrl ? 3 : 0) + (a?.mediaType === 'video' ? 2 : 0) + (a?.mediaType === 'embed' ? 1 : 0);
            const bScore = (b?.videoUrl ? 3 : 0) + (b?.mediaType === 'video' ? 2 : 0) + (b?.mediaType === 'embed' ? 1 : 0);
            return bScore - aScore;
        });
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
    const [activeRegion, setActiveRegion] = useState('all');
    const [dockVisible, setDockVisible] = useState(true);

    useEffect(() => {
        if (!cctvEnabled) {
            setDockVisible(true);
        }
    }, [cctvEnabled]);

    useEffect(() => {
        if (!cctvEnabled) return undefined;
        const timer = setInterval(() => setPreviewNonce(Date.now()), PREVIEW_REFRESH_MS);
        return () => clearInterval(timer);
    }, [cctvEnabled]);

    const regionCounts = useMemo(() => {
        const counts = Object.fromEntries(WEBCAM_REGIONS.map((region) => [region.id, 0]));
        counts.all = Array.isArray(cctvFeeds) ? cctvFeeds.length : 0;

        for (const feed of cctvFeeds || []) {
            const latitude = Number(feed.lat ?? feed.latitude);
            const longitude = Number(feed.lng ?? feed.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
            for (const region of WEBCAM_REGIONS) {
                if (region.id === 'all') continue;
                if (isWithinIntelRegion(latitude, longitude, region.id)) {
                    counts[region.id] += 1;
                }
            }
        }

        return counts;
    }, [cctvFeeds]);

    const filteredFeeds = useMemo(() => {
        if (activeRegion === 'all') return cctvFeeds;
        return (cctvFeeds || []).filter((feed) => {
            const latitude = Number(feed.lat ?? feed.latitude);
            const longitude = Number(feed.lng ?? feed.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
            return isWithinIntelRegion(latitude, longitude, activeRegion);
        });
    }, [activeRegion, cctvFeeds]);

    const featuredFeeds = useMemo(
        () => pickFeaturedFeeds(filteredFeeds, MAX_DOCK_FEEDS),
        [filteredFeeds]
    );

    if (!cctvEnabled || (cctvFeeds || []).length === 0) return null;

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
            mediaEnabled: true,
            streamCapable: Boolean(feed.streamCapable || feed.videoUrl),
            refreshSeconds: feed.refreshSeconds || 5,
            status: 'LIVE',
        });
    };

    if (!dockVisible) {
        return (
            <button
                onClick={() => setDockVisible(true)}
                className="glass-panel pointer-events-auto"
                style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bottom: '172px',
                    zIndex: 34,
                    border: '1px solid rgba(0, 255, 65, 0.28)',
                    background: 'rgba(6, 11, 18, 0.84)',
                    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.46)',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                }}
                title="Show live webcam dock"
            >
                <span className="text-[11px] tracking-[0.26em] uppercase text-green-300">Live Webcam Dock</span>
                <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim">Show</span>
            </button>
        );
    }

    return (
        <div
            className="glass-panel pointer-events-auto"
            style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                bottom: '172px',
                width: 'clamp(320px, 28vw, 420px)',
                zIndex: 34,
                border: '1px solid rgba(0, 255, 65, 0.28)',
                background: 'rgba(6, 11, 18, 0.76)',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.46)',
            }}
        >
            <div className="px-3 py-2 border-b border-green-500/20 flex items-center justify-between">
                <div className="text-[11px] tracking-[0.25em] uppercase text-green-300">Live Webcam Dock</div>
                <div className="flex items-center gap-2">
                    <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim">{featuredFeeds.length} live nodes</div>
                    <button
                        onClick={() => setDockVisible(false)}
                        className="text-[10px] tracking-[0.16em] uppercase text-text-dim hover:text-green-200 transition-colors"
                        style={{
                            border: '1px solid rgba(0, 255, 65, 0.22)',
                            background: 'rgba(0, 255, 65, 0.05)',
                            padding: '3px 7px',
                            lineHeight: 1,
                        }}
                        title="Hide live webcam dock"
                    >
                        Hide
                    </button>
                </div>
            </div>

            <div className="px-2 py-2 border-b border-green-500/10">
                <div className="grid grid-cols-5 gap-1">
                    {WEBCAM_REGIONS.map((region) => {
                        const isActive = region.id === activeRegion;
                        return (
                            <button
                                key={region.id}
                                onClick={() => setActiveRegion(region.id)}
                                className={`text-[8px] tracking-[0.16em] uppercase border px-1.5 py-1 rounded-sm transition-colors ${
                                    isActive
                                        ? 'border-green-400/60 text-green-200 bg-green-500/10'
                                        : 'border-white/10 text-text-dim hover:border-green-500/30 hover:text-green-200'
                                }`}
                            >
                                {region.label}
                                <span className="ml-1 opacity-70">{regionCounts[region.id] || 0}</span>
                            </button>
                        );
                    })}
                </div>
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
                {featuredFeeds.length === 0 && (
                    <div className="col-span-3 px-3 py-4 text-[10px] tracking-[0.16em] uppercase text-text-dim text-center border border-white/8 bg-black/30 rounded-sm">
                        No feeds in this region
                    </div>
                )}
            </div>
        </div>
    );
}
