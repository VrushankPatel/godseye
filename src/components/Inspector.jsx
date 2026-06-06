import React, { useState, useEffect, useMemo, useRef } from 'react';
import useStore from '../store/useStore';
import { LAYER_DEFS } from '../constants/dataSources';
import { isContinuousLiveCameraFeed } from '../services/cctvFeeds';

const TRACKABLE_LAYER_TYPES = new Set(['aircraft', 'satellites', 'militaryActivity']);
const DEFAULT_REFRESH_SECONDS = 5;
const AIRCRAFT_TRACK_VIEWS = [
    { id: 'CHASE', label: 'Chase' },
    { id: 'TOP', label: 'Top' },
    { id: 'SIDE', label: 'Side' },
    { id: 'CINEMATIC', label: 'Cinematic' },
];
const SATELLITE_TRACK_VIEWS = [
    { id: 'ORBIT', label: 'Orbit' },
    { id: 'NADIR', label: 'Nadir' },
    { id: 'WIDE', label: 'Wide' },
];

function appendCacheBuster(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        parsed.searchParams.set('_ts', String(Date.now()));
        return parsed.toString();
    } catch (err) {
        return `${url}${url.includes('?') ? '&' : '?'}_ts=${Date.now()}`;
    }
}

function resolveMediaType(inspector) {
    if (!inspector) return 'image';
    if (inspector.mediaType) return inspector.mediaType;
    if (!inspector.videoUrl) return 'image';

    const lowerUrl = String(inspector.videoUrl).toLowerCase();
    if (
        lowerUrl.endsWith('.mp4') ||
        lowerUrl.endsWith('.webm') ||
        lowerUrl.includes('.m3u8')
    ) {
        return 'video';
    }

    return 'embed';
}

function isHlsUrl(url) {
    return /\.m3u8(\?|$)/i.test(String(url || ''));
}

function unwrapWorldcamsPlayer(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        const isWorldcamsPlayer =
            parsed.hostname.includes('worldcams.tv') &&
            parsed.pathname.includes('/player');
        if (!isWorldcamsPlayer) return '';
        const nested = parsed.searchParams.get('url');
        if (!nested) return '';
        return nested;
    } catch (err) {
        return '';
    }
}

export default function Inspector() {
    const inspector = useStore((s) => s.inspector);
    const clearInspector = useStore((s) => s.clearInspector);
    const trackedTarget = useStore((s) => s.trackedTarget);
    const toggleTrackedTarget = useStore((s) => s.toggleTrackedTarget);
    const trackingView = useStore((s) => s.trackingView);
    const setTrackingView = useStore((s) => s.setTrackingView);
    const [isMaximized, setIsMaximized] = useState(false);
    const [imageSrc, setImageSrc] = useState('');
    const [imageFailed, setImageFailed] = useState(false);
    const [videoFailed, setVideoFailed] = useState(false);
    const [resolvedStreamUrl, setResolvedStreamUrl] = useState('');
    const [isResolvingStream, setIsResolvingStream] = useState(false);
    const [streamResolveFailed, setStreamResolveFailed] = useState(false);
    const hlsVideoRef = useRef(null);

    const mediaType = useMemo(() => resolveMediaType(inspector), [inspector]);
    const embeddedWorldcamsUrl = useMemo(
        () => unwrapWorldcamsPlayer(inspector?.videoUrl || ''),
        [inspector?.videoUrl]
    );
    const effectiveStreamUrl = useMemo(() => {
        if (resolvedStreamUrl) return resolvedStreamUrl;
        if (embeddedWorldcamsUrl) return embeddedWorldcamsUrl;
        if (isHlsUrl(inspector?.videoUrl || '')) return inspector.videoUrl;
        return '';
    }, [resolvedStreamUrl, embeddedWorldcamsUrl, inspector?.videoUrl]);
    const effectiveMediaType = useMemo(() => {
        if (effectiveStreamUrl) return 'video';
        if (mediaType === 'caltrans') return 'video';
        return mediaType;
    }, [effectiveStreamUrl, mediaType]);
    const isContinuousMedia = useMemo(
        () => isContinuousLiveCameraFeed({
            ...inspector,
            resolvedVideoUrl: effectiveStreamUrl || inspector?.resolvedVideoUrl,
            videoUrl: effectiveStreamUrl || inspector?.videoUrl,
        }),
        [effectiveStreamUrl, inspector]
    );
    const mediaStatusLabel = isContinuousMedia
        ? 'LIVE STREAM'
        : effectiveMediaType === 'image'
            ? 'REFRESH IMAGE'
            : 'REFRESH FEED';

    useEffect(() => {
        setIsMaximized(false);
        setImageSrc(appendCacheBuster(inspector?.url || inspector?.fallbackUrl || ''));
        setImageFailed(false);
        setVideoFailed(false);
        setResolvedStreamUrl('');
        setIsResolvingStream(false);
        setStreamResolveFailed(false);
    }, [inspector]);

    useEffect(() => {
        if (!inspector || inspector.type !== 'cctv' || effectiveMediaType !== 'image' || !inspector.url) return;

        const refreshSeconds = Math.max(
            2,
            Number(inspector.refreshSeconds) || DEFAULT_REFRESH_SECONDS
        );

        const timer = setInterval(() => {
            setImageSrc(appendCacheBuster(inspector.url));
            setImageFailed(false);
        }, refreshSeconds * 1000);

        return () => clearInterval(timer);
    }, [inspector, effectiveMediaType]);

    useEffect(() => {
        if (!inspector || inspector.type !== 'cctv') return;
        if (inspector.provider !== 'Caltrans') return;
        if (!inspector.streamCapable) return;
        if (effectiveStreamUrl || streamResolveFailed) return;
        const resolvedUrl = inspector.videoUrl || inspector.url || '';
        if (!resolvedUrl) {
            setStreamResolveFailed(true);
            return;
        }
        setResolvedStreamUrl(resolvedUrl);
        setIsResolvingStream(false);
        setStreamResolveFailed(false);
    }, [inspector, effectiveStreamUrl, streamResolveFailed]);

    useEffect(() => {
        const videoEl = hlsVideoRef.current;
        if (!videoEl) return;
        if (!effectiveStreamUrl || !isHlsUrl(effectiveStreamUrl)) return;

        let cancelled = false;
        let hlsInstance = null;

        const setupHls = async () => {
            if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
                videoEl.src = effectiveStreamUrl;
                return;
            }

            try {
                const module = await import('hls.js');
                if (cancelled) return;
                const Hls = module.default;
                if (Hls?.isSupported?.()) {
                    hlsInstance = new Hls({
                        enableWorker: true,
                        lowLatencyMode: true,
                    });
                    hlsInstance.loadSource(effectiveStreamUrl);
                    hlsInstance.attachMedia(videoEl);
                    hlsInstance.on(Hls.Events.ERROR, (_, data) => {
                        if (data?.fatal) {
                            setVideoFailed(true);
                        }
                    });
                } else {
                    videoEl.src = effectiveStreamUrl;
                }
            } catch (err) {
                if (!cancelled) {
                    setVideoFailed(true);
                }
            }
        };

        setupHls();

        return () => {
            cancelled = true;
            if (hlsInstance) {
                hlsInstance.destroy();
            }
        };
    }, [effectiveStreamUrl, inspector?.id]);

    if (!inspector) return null;

    // Non-media entities are shown in the unified right panel (MissionHud)
    const hasMediaPanel = inspector.type === 'cctv' || inspector.type === 'traffic';
    if (!hasMediaPanel) return null;

    const def = LAYER_DEFS[inspector.type] || { color: '#ffffff', icon: '❓', label: 'UNKNOWN' };
    const isTrackable = TRACKABLE_LAYER_TYPES.has(inspector.type) && Boolean(inspector._entityId);
    const isTracked =
        isTrackable &&
        trackedTarget?.entityId === inspector._entityId;
    const trackViewOptions = inspector.type === 'satellites'
        ? SATELLITE_TRACK_VIEWS
        : AIRCRAFT_TRACK_VIEWS;

    const handleImageError = () => {
        if (inspector.fallbackUrl && !imageSrc.startsWith(inspector.fallbackUrl)) {
            setImageSrc(appendCacheBuster(inspector.fallbackUrl));
            setImageFailed(false);
            return;
        }
        setImageFailed(true);
    };

    const handleTrackToggle = () => {
        if (!isTrackable) return;
        const normalizedTrackType = inspector.type === 'militaryActivity' ? 'aircraft' : inspector.type;
        if (!isTracked) {
            setTrackingView(normalizedTrackType === 'satellites' ? 'ORBIT' : 'CHASE');
        }
        toggleTrackedTarget({
            entityId: inspector._entityId,
            type: normalizedTrackType,
            label: inspector.name || inspector.callsign || inspector.id || 'TARGET',
        });
    };

    const handleVideoError = () => {
        setVideoFailed(true);
        if (inspector.url) {
            setImageSrc(appendCacheBuster(inspector.url));
        }
    };

    const renderCCTVMedia = (maxView = false) => {
        const hasAnyImageSource = Boolean(inspector.url || inspector.fallbackUrl || imageSrc);
        const embedUrl = inspector.videoUrl || inspector.url || inspector.detailsUrl || '';

        if (
            inspector.provider === 'Caltrans' &&
            inspector.streamCapable &&
            isResolvingStream &&
            !effectiveStreamUrl
        ) {
            return (
                <div className="w-full py-10 text-center text-cyan-200 border border-cyan-500/30 bg-cyan-900/10 tracking-widest text-xs">
                    RESOLVING LIVE STREAM...
                </div>
            );
        }

        if (effectiveMediaType === 'embed' && embedUrl && !videoFailed) {
            return (
                <iframe
                    src={embedUrl}
                    title="CCTV media feed"
                    className={`w-full border-0 ${maxView ? 'aspect-video max-h-[85vh]' : 'aspect-video'}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
            );
        }

        if (effectiveMediaType === 'video' && (effectiveStreamUrl || inspector.videoUrl) && !videoFailed) {
            const streamUrl = effectiveStreamUrl || inspector.videoUrl;
            const isHlsStream = isHlsUrl(streamUrl);
            return (
                <video
                    ref={isHlsStream ? hlsVideoRef : null}
                    src={isHlsStream ? undefined : streamUrl}
                    className={`w-full bg-black ${maxView ? 'max-h-[85vh]' : 'aspect-video'}`}
                    autoPlay
                    muted
                    controls
                    playsInline
                    onError={handleVideoError}
                />
            );
        }

        if (!hasAnyImageSource) {
            return (
                <div className="w-full py-12 text-center text-amber-200 border border-amber-400/30 bg-amber-900/10 tracking-widest text-xs">
                    FEED METADATA ONLY
                </div>
            );
        }

        return (
            <div className={`relative w-full ${maxView ? 'min-h-[50vh]' : ''}`}>
                {!imageFailed && (
                    <img
                        src={imageSrc || inspector.url}
                        alt="Camera Feed"
                        className={`w-full ${maxView ? 'max-h-[85vh] object-contain' : 'cursor-pointer hover:opacity-80 transition-opacity'}`}
                        onClick={!maxView ? () => setIsMaximized(true) : undefined}
                        onError={handleImageError}
                    />
                )}
                {imageFailed && (
                    <div className="w-full py-12 text-center text-red-300 border border-red-500/30 bg-red-900/20 tracking-widest text-xs">
                        NO SIGNAL
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <div
                className="absolute top-24 w-[22.5rem] pointer-events-none z-10 animate-slide-right"
                style={{ right: 'max(16px, env(safe-area-inset-right))' }}
            >
                <div className="glass-panel w-full flex flex-col pointer-events-auto shadow-[0_0_20px_rgba(0,180,255,0.15)]">

                    <div className="px-5 py-4 border-b border-border-panel flex justify-between items-center bg-black/40">
                        <div className="flex items-center gap-2">
                            <span style={{ color: def.color }} className="text-lg">{def.icon}</span>
                            <h2 className="text-sm tracking-widest text-text-primary">{def.label} TRK</h2>
                        </div>
                        <button
                            onClick={clearInspector}
                            className="text-text-dim hover:text-white hover:scale-110 transition-all font-bold"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="p-5 flex flex-col gap-4">

                        <div className="flex flex-col gap-1.5 mb-1">
                            <div className="text-[10px] leading-none text-text-dim tracking-widest uppercase">Target Ident</div>
                            <div className="text-[1.95rem] leading-[1.1] font-bold tracking-[0.04em] text-white break-words" style={{ textShadow: `0 0 10px ${def.color}40` }}>
                                {inspector.name || inspector.callsign || inspector.id || 'UNIDENTIFIED'}
                            </div>
                        </div>

                        {hasMediaPanel && (
                            <div className="w-full mb-3 rounded overflow-hidden relative group bg-black/40">
                                {renderCCTVMedia(false)}
                                <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setIsMaximized(true)}
                                        className="bg-black/80 px-2 py-1 text-[10px] text-white border border-white/20 hover:bg-white/20 transition-colors"
                                    >
                                        MAXIMIZE ⤢
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            {Object.entries(inspector).map(([key, value]) => {
                                if (
                                    key === 'type' ||
                                    key === 'name' ||
                                    key.startsWith('_') ||
                                    typeof value === 'object' ||
                                    key === 'url' ||
                                    key === 'fallbackUrl' ||
                                    key === 'videoUrl' ||
                                    key === 'mediaType' ||
                                    key === 'refreshSeconds' ||
                                    key === 'detailsUrl'
                                ) {
                                    return null;
                                }
                                return (
                                    <div key={key} className="flex flex-col gap-1">
                                        <div className="text-[10px] leading-none text-text-dim tracking-[0.16em] uppercase">{key}</div>
                                        <div
                                            className="text-[15px] leading-[1.2] text-text-primary tracking-[0.03em] break-words"
                                            title={String(value)}
                                        >
                                            {value !== null && value !== undefined ? String(value) : 'N/A'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {isTrackable && (
                            <button
                                onClick={handleTrackToggle}
                                className={`mt-2 border text-xs tracking-widest px-3 py-2.5 transition-colors ${isTracked
                                    ? 'border-red-400/50 text-red-200 bg-red-500/15 hover:bg-red-500/25'
                                    : 'border-cyan-400/50 text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20'
                                    }`}
                            >
                                {isTracked ? 'STOP TRACK' : 'TRACK TARGET'}
                            </button>
                        )}

                        {isTracked && (
                            <div className="mt-2">
                                <div className="text-[10px] text-text-dim tracking-widest uppercase mb-1.5">
                                    Track View
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {trackViewOptions.map((view) => (
                                        <button
                                            key={view.id}
                                            onClick={() => setTrackingView(view.id)}
                                            className={`border px-2 py-1.5 text-[10px] tracking-widest transition-colors ${trackingView === view.id
                                                ? 'border-cyan-300/70 text-cyan-100 bg-cyan-500/20'
                                                : 'border-white/15 text-text-dim bg-white/5 hover:bg-white/10 hover:text-white'
                                                }`}
                                        >
                                            {view.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>

                    <div className="py-2.5 px-5 border-t border-border-panel bg-black/40 flex justify-between items-center text-[9px] text-text-dim tracking-[0.2em]">
                        <span>{isTracked ? 'TRACKING ACTIVE' : 'INSPECT MODE'}</span>
                        <span className={isTracked ? 'animate-pulse' : ''} style={{ color: isTracked ? '#00ff41' : def.color }}>●</span>
                    </div>

                </div>
            </div>

            {isMaximized && hasMediaPanel && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 backdrop-blur-sm pointer-events-auto cursor-pointer"
                    onClick={() => setIsMaximized(false)}
                >
                    <div
                        className="relative w-[min(92vw,1400px)] border border-cyan-500/30 shadow-[0_0_50px_rgba(0,255,80,0.15)] cursor-auto bg-black"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-4 left-4 px-3 py-1 bg-black/80 text-green-500 font-mono text-sm border border-green-500/50 z-10 shadow-[0_0_10px_rgba(0,255,80,0.3)] flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isContinuousMedia ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`}></span> {mediaStatusLabel} - {inspector.name || 'CCTV CAMERA'}
                        </div>
                        <button
                            className="absolute top-4 right-4 text-white hover:text-red-500 hover:scale-110 transition-transform text-3xl font-bold z-10 bg-black/50 border border-white/20 w-10 h-10 flex items-center justify-center rounded-sm"
                            onClick={() => setIsMaximized(false)}
                        >
                            ✕
                        </button>
                        {renderCCTVMedia(true)}
                    </div>
                </div>
            )}
        </>
    );
}
