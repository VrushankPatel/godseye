import React, { useEffect, useMemo, useRef, useState } from 'react';
import useStore from '../store/useStore';
import {
    NEWS_RELAY_GROUPS,
    getRelayChannels,
    getRelayGroupForIntelRegion,
} from '../constants/newsRelay';
import { matchesIntelRegion } from '../services/intelMonitor';

function relativeTime(timestampMs) {
    if (!timestampMs) return 'now';
    const diff = Date.now() - timestampMs;
    if (diff < 60_000) return 'now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
}

function isHlsChannel(channel) {
    return channel?.type === 'hls' && /\.m3u8(\?|$)/i.test(String(channel?.streamUrl || ''));
}

export default function LiveNewsRelayPanel() {
    const intelRegion = useStore((s) => s.intelRegion);
    const items = useStore((s) => s.intelFeedItems);
    const lastUpdatedAt = useStore((s) => s.intelFeedLastUpdatedAt);
    const [activeGroup, setActiveGroup] = useState(getRelayGroupForIntelRegion(intelRegion));
    const [activeChannelId, setActiveChannelId] = useState('');
    const [streamFailed, setStreamFailed] = useState(false);
    const videoRef = useRef(null);

    useEffect(() => {
        setActiveGroup(getRelayGroupForIntelRegion(intelRegion));
    }, [intelRegion]);

    const channels = useMemo(() => getRelayChannels(activeGroup), [activeGroup]);

    useEffect(() => {
        if (!channels.length) {
            setActiveChannelId('');
            return;
        }
        if (!channels.some((channel) => channel.id === activeChannelId)) {
            setActiveChannelId(channels[0].id);
        }
    }, [activeChannelId, channels]);

    const activeChannel = useMemo(() => {
        return channels.find((channel) => channel.id === activeChannelId) || channels[0] || null;
    }, [activeChannelId, channels]);

    useEffect(() => {
        setStreamFailed(false);
    }, [activeChannel?.id]);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl || !activeChannel || !isHlsChannel(activeChannel)) return undefined;

        let disposed = false;
        let hlsInstance = null;

        const setup = async () => {
            if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
                videoEl.src = activeChannel.streamUrl;
                return;
            }

            try {
                const module = await import('hls.js');
                if (disposed) return;
                const Hls = module.default;
                if (Hls?.isSupported?.()) {
                    hlsInstance = new Hls({
                        enableWorker: true,
                        lowLatencyMode: true,
                        backBufferLength: 30,
                    });
                    hlsInstance.loadSource(activeChannel.streamUrl);
                    hlsInstance.attachMedia(videoEl);
                    hlsInstance.on(Hls.Events.ERROR, (_, data) => {
                        if (data?.fatal) setStreamFailed(true);
                    });
                } else {
                    videoEl.src = activeChannel.streamUrl;
                }
            } catch (err) {
                if (!disposed) setStreamFailed(true);
            }
        };

        setup();

        return () => {
            disposed = true;
            if (hlsInstance) hlsInstance.destroy();
        };
    }, [activeChannel]);

    const contextRegion = activeGroup === 'mideast' || activeGroup === 'europe' || activeGroup === 'asia'
        ? activeGroup
        : intelRegion;

    const scopedItems = useMemo(() => {
        return (items || [])
            .filter((item) => matchesIntelRegion(item, contextRegion))
            .slice(0, 2);
    }, [contextRegion, items]);

    const groupCounts = useMemo(() => {
        const counts = {};
        for (const group of NEWS_RELAY_GROUPS) {
            counts[group.id] = getRelayChannels(group.id).length;
        }
        return counts;
    }, []);

    const activeSourceUrl = activeChannel?.sourceUrl || activeChannel?.streamUrl || '';

    return (
        <div className="rcp-section">
            <div className="rcp-header">
                <span>LIVE NEWS RELAY</span>
                <div className="flex items-center gap-2">
                    <span className="news-relay-live">
                        <span className="news-relay-live-dot" />
                        LIVE
                    </span>
                    {activeSourceUrl && (
                        <a
                            href={activeSourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rcp-action"
                        >
                            OPEN
                        </a>
                    )}
                </div>
            </div>

            <div className="news-relay-tabs">
                {NEWS_RELAY_GROUPS.map((group) => {
                    const isActive = group.id === activeGroup;
                    return (
                        <button
                            key={group.id}
                            onClick={() => setActiveGroup(group.id)}
                            className={`news-relay-tab ${isActive ? 'is-active' : ''}`}
                        >
                            <span>{group.label}</span>
                            <span>{groupCounts[group.id] || 0}</span>
                        </button>
                    );
                })}
            </div>

            <div className="news-relay-player-wrap">
                {activeChannel ? (
                    activeChannel.type === 'youtube' ? (
                        <iframe
                            key={activeChannel.id}
                            src={activeChannel.streamUrl}
                            title={`${activeChannel.name} live stream`}
                            className="news-relay-frame"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    ) : !streamFailed ? (
                        <video
                            key={activeChannel.id}
                            ref={videoRef}
                            className="news-relay-frame"
                            autoPlay
                            muted
                            controls
                            playsInline
                            poster={activeChannel.previewUrl || undefined}
                            onError={() => setStreamFailed(true)}
                        />
                    ) : (
                        <div className="news-relay-fallback">
                            <div className="news-relay-fallback-title">STREAM HANDOFF REQUIRED</div>
                            <div className="news-relay-fallback-copy">
                                This relay is currently refusing direct playback. Open the provider stream in a new tab.
                            </div>
                        </div>
                    )
                ) : (
                    <div className="news-relay-fallback">
                        <div className="news-relay-fallback-title">NO RELAY CHANNELS</div>
                        <div className="news-relay-fallback-copy">
                            No verified channels are currently assigned to this theater group.
                        </div>
                    </div>
                )}
            </div>

            {activeChannel && (
                <div className="news-relay-meta">
                    <div>
                        <div className="news-relay-title">{activeChannel.provider}</div>
                        <div className="news-relay-note">{activeChannel.note}</div>
                    </div>
                    <div className="news-relay-language">{activeChannel.language}</div>
                </div>
            )}

            <div className="news-relay-grid">
                {channels.map((channel) => (
                    <button
                        key={channel.id}
                        onClick={() => setActiveChannelId(channel.id)}
                        className={`news-relay-chip ${channel.id === activeChannel?.id ? 'is-active' : ''}`}
                        title={channel.note}
                    >
                        {channel.name}
                    </button>
                ))}
            </div>

            {scopedItems.length > 0 && (
                <div className="news-relay-context">
                    {scopedItems.map((item) => (
                        <a
                            key={item.id}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="news-relay-context-item"
                        >
                            <div className="news-relay-context-top">
                                <span>{item.source}</span>
                                <span>{relativeTime(item.publishedAt || lastUpdatedAt)}</span>
                            </div>
                            <div className="news-relay-context-title">{item.title}</div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
