import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useStore from '../store/useStore';
import {
    getDefaultRelayTopicId,
    getRelayChannels,
    resolveRelayTopics,
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

function RelayPlayer({ channel, onError, className = '' }) {
    const videoRef = useRef(null);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl || !channel || !isHlsChannel(channel)) return undefined;

        let disposed = false;
        let hlsInstance = null;

        const setup = async () => {
            if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
                videoEl.src = channel.streamUrl;
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
                    hlsInstance.loadSource(channel.streamUrl);
                    hlsInstance.attachMedia(videoEl);
                    hlsInstance.on(Hls.Events.ERROR, (_, data) => {
                        if (data?.fatal) onError?.();
                    });
                } else {
                    videoEl.src = channel.streamUrl;
                }
            } catch (err) {
                if (!disposed) onError?.();
            }
        };

        setup();

        return () => {
            disposed = true;
            if (hlsInstance) hlsInstance.destroy();
        };
    }, [channel, onError]);

    if (!channel) return null;

    if (channel.type === 'youtube') {
        return (
            <iframe
                key={channel.id}
                src={channel.streamUrl}
                title={`${channel.name} live stream`}
                className={className}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
            />
        );
    }

    return (
        <video
            key={channel.id}
            ref={videoRef}
            className={className}
            autoPlay
            muted
            controls
            playsInline
            poster={channel.previewUrl || undefined}
            onError={() => onError?.()}
        />
    );
}

export default function LiveNewsRelayPanel() {
    const intelRegion = useStore((s) => s.intelRegion);
    const items = useStore((s) => s.intelFeedItems);
    const lastUpdatedAt = useStore((s) => s.intelFeedLastUpdatedAt);
    const [relayTopics, setRelayTopics] = useState([]);
    const [activeTopicId, setActiveTopicId] = useState('');
    const [activeChannelId, setActiveChannelId] = useState('');
    const [streamFailed, setStreamFailed] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const theaterRef = useRef(null);
    const previousRegionRef = useRef(intelRegion);

    useEffect(() => {
        if (!isExpanded) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsExpanded(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isExpanded]);

    useEffect(() => {
        setRelayTopics(resolveRelayTopics(items, lastUpdatedAt));
    }, [items, lastUpdatedAt]);

    useEffect(() => {
        if (!relayTopics.length) {
            setActiveTopicId('');
            return;
        }
        const fallbackTopicId = getDefaultRelayTopicId(intelRegion, relayTopics);
        if (!relayTopics.some((topic) => topic.id === activeTopicId)) {
            setActiveTopicId(fallbackTopicId);
            return;
        }

        if (!activeTopicId) {
            setActiveTopicId(fallbackTopicId);
        }
    }, [activeTopicId, intelRegion, relayTopics]);

    useEffect(() => {
        if (!relayTopics.length) return;
        if (previousRegionRef.current === intelRegion) return;
        previousRegionRef.current = intelRegion;
        setActiveTopicId(getDefaultRelayTopicId(intelRegion, relayTopics));
    }, [intelRegion, relayTopics]);

    const activeTopic = useMemo(() => {
        return relayTopics.find((topic) => topic.id === activeTopicId) || relayTopics[0] || null;
    }, [activeTopicId, relayTopics]);

    const channels = useMemo(
        () => getRelayChannels(activeTopic, relayTopics),
        [activeTopic, relayTopics]
    );

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
    }, [activeChannel?.id, isExpanded]);

    const contextRegion = activeTopic?.channelGroups?.includes('mideast')
        ? 'mideast'
        : activeTopic?.channelGroups?.includes('europe')
            ? 'europe'
            : activeTopic?.channelGroups?.includes('asia')
                ? 'asia'
                : intelRegion;

    const scopedItems = useMemo(() => {
        return (items || [])
            .filter((item) => matchesIntelRegion(item, contextRegion))
            .slice(0, 2);
    }, [contextRegion, items]);

    const activeSourceUrl = activeChannel?.sourceUrl || activeChannel?.streamUrl || '';

    const requestNativeFullscreen = useCallback(async () => {
        const node = theaterRef.current;
        if (!node?.requestFullscreen) return;
        try {
            await node.requestFullscreen();
        } catch (err) {
            // Ignore browser fullscreen denials.
        }
    }, []);

    const renderPlayer = (expanded = false) => {
        if (!activeChannel) {
            return (
                <div className="news-relay-fallback">
                    <div className="news-relay-fallback-title">NO RELAY CHANNELS</div>
                    <div className="news-relay-fallback-copy">
                        No verified channels are currently assigned to this theater group.
                    </div>
                </div>
            );
        }

        if (streamFailed) {
            return (
                <div className="news-relay-fallback">
                    <div className="news-relay-fallback-title">STREAM HANDOFF REQUIRED</div>
                    <div className="news-relay-fallback-copy">
                        This relay is currently refusing direct playback. Open the provider stream in a new tab.
                    </div>
                </div>
            );
        }

        return (
            <RelayPlayer
                channel={activeChannel}
                onError={() => setStreamFailed(true)}
                className={expanded ? 'news-relay-frame news-relay-frame--theater' : 'news-relay-frame'}
            />
        );
    };

    return (
        <>
            <div className="rcp-section">
                <div className="rcp-header">
                    <span>LIVE NEWS RELAY</span>
                    <div className="flex items-center gap-2">
                        <span className="news-relay-live">
                            <span className="news-relay-live-dot" />
                            LIVE
                        </span>
                        {activeChannel && (
                            <button
                                onClick={() => setIsExpanded(true)}
                                className="rcp-action"
                                title="Expand relay stream"
                            >
                                MAX
                            </button>
                        )}
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
                    {relayTopics.map((topic) => {
                        const isActive = topic.id === activeTopic?.id;
                        return (
                            <button
                                key={topic.id}
                                onClick={() => setActiveTopicId(topic.id)}
                                className={`news-relay-tab ${isActive ? 'is-active' : ''}`}
                                title={`${topic.label} priority ${topic.score || 0}`}
                            >
                                <span>{topic.label}</span>
                                <span>{topic.matchCount || topic.score || 0}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="news-relay-player-wrap">
                    {isExpanded ? (
                        <button
                            onClick={() => setIsExpanded(true)}
                            className="news-relay-minimized-state"
                            title="Relay opened in theater mode"
                        >
                            RELAY IN THEATER MODE
                        </button>
                    ) : (
                        renderPlayer(false)
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

            {isExpanded && activeChannel && (
                <div className="news-relay-theater-backdrop" onClick={() => setIsExpanded(false)}>
                    <div
                        ref={theaterRef}
                        className="news-relay-theater"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="news-relay-theater-header">
                            <div>
                                <div className="news-relay-title">{activeChannel.provider}</div>
                                <div className="news-relay-note">{activeChannel.note}</div>
                            </div>
                            <div className="news-relay-theater-actions">
                                <button
                                    onClick={requestNativeFullscreen}
                                    className="rcp-action"
                                    title="Enter browser fullscreen"
                                >
                                    FULL
                                </button>
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
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="rcp-action"
                                    title="Close theater mode"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="news-relay-theater-body">
                            {renderPlayer(true)}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
