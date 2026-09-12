import React, { useEffect, useRef, useState } from 'react';
import {
  getEffectiveCameraVideoUrl,
  isHlsStreamUrl,
  isYoutubeEmbedUrl,
  getProxiedCameraFrameUrl,
} from '../services/cctvFeeds';

function extractYoutubeId(url) {
  if (!url) return '';
  const match = String(url).match(/(?:embed\/|watch\?v=|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : '';
}

function formatEmbedUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('autoplay', '1');
    parsed.searchParams.set('mute', '1');
    parsed.searchParams.set('controls', '0');
    parsed.searchParams.set('playsinline', '1');
    parsed.searchParams.set('enablejsapi', '1');
    parsed.searchParams.set('rel', '0');
    parsed.searchParams.set('modestbranding', '1');
    return parsed.toString();
  } catch {
    return url;
  }
}

export default function CctvHoverPlayer({ feed }) {
  const videoRef = useRef(null);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [imageNonce, setImageNonce] = useState(Date.now());

  const effectiveVideo = getEffectiveCameraVideoUrl(feed);
  const isYoutube = Boolean(effectiveVideo && isYoutubeEmbedUrl(effectiveVideo));
  const isHls = Boolean(effectiveVideo && isHlsStreamUrl(effectiveVideo));
  const isDirectVideo = Boolean(effectiveVideo && !isYoutube && !isHls);

  // Auto-refresh static snapshot images every 6 seconds
  useEffect(() => {
    if (effectiveVideo) return;
    const interval = setInterval(() => {
      setImageNonce(Date.now());
    }, 6000);
    return () => clearInterval(interval);
  }, [effectiveVideo]);

  // Handle HLS stream setup
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !effectiveVideo || !isHls) return;

    let hlsInstance = null;
    let cancelled = false;

    if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = effectiveVideo;
      videoEl.play().catch(() => {});
    } else {
      import('hls.js')
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (Hls.isSupported()) {
            hlsInstance = new Hls({ enableWorker: false, lowLatencyMode: true });
            hlsInstance.loadSource(effectiveVideo);
            hlsInstance.attachMedia(videoEl);
            hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
              if (!cancelled) {
                videoEl.play().catch(() => {});
              }
            });
            hlsInstance.on(Hls.Events.ERROR, () => {
              if (!cancelled) setMediaFailed(true);
            });
          } else {
            videoEl.src = effectiveVideo;
          }
        })
        .catch(() => {
          if (!cancelled) setMediaFailed(true);
        });
    }

    return () => {
      cancelled = true;
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [effectiveVideo, isHls]);

  const rawImage = feed.fallbackUrl || feed.url;
  const proxiedImage = getProxiedCameraFrameUrl(rawImage, feed.id);
  const cacheBustedImage = proxiedImage ? `${proxiedImage}${proxiedImage.includes('?') ? '&' : '?'}_t=${imageNonce}` : '';

  return (
    <div className="relative w-full aspect-video bg-black/80 rounded overflow-hidden border border-white/10 shadow-inner">
      {/* 1. YouTube Live Feed */}
      {isYoutube && !mediaFailed && (
        <iframe
          src={formatEmbedUrl(effectiveVideo)}
          title={feed.name || 'CCTV stream'}
          className="w-full h-full object-cover pointer-events-none border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          loading="eager"
          onError={() => setMediaFailed(true)}
        />
      )}

      {/* 2. HLS or Direct Video Feed */}
      {(isHls || isDirectVideo) && !mediaFailed && (
        <video
          ref={videoRef}
          src={isDirectVideo ? effectiveVideo : undefined}
          autoPlay
          muted
          playsInline
          loop
          className="w-full h-full object-cover bg-black"
          onError={() => setMediaFailed(true)}
        />
      )}

      {/* 3. Static/Refresh Image Feed or Fallback */}
      {(!effectiveVideo || mediaFailed) && cacheBustedImage && (
        <img
          src={cacheBustedImage}
          alt={feed.name || 'CCTV snapshot'}
          className="w-full h-full object-cover"
          onError={() => {
            const ytId = extractYoutubeId(feed.videoUrl);
            if (ytId && !cacheBustedImage.includes('img.youtube.com')) {
              // Try YouTube poster
              setMediaFailed(true);
            }
          }}
        />
      )}

      {/* 4. Completely offline / no-signal fallback */}
      {(!cacheBustedImage && !effectiveVideo) || (mediaFailed && !cacheBustedImage) ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black/90 p-2 text-center">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping mb-1.5" />
          <div className="text-[10px] font-mono tracking-widest text-red-400 font-semibold">SIGNAL STANDBY</div>
          <div className="text-[9px] font-mono text-white/50 tracking-wider mt-0.5">CONNECTING PROXY...</div>
        </div>
      ) : null}

      {/* Tactical HUD Reticle Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-1.5">
        {/* Top HUD bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 font-bold tracking-wider">LIVE CAM</span>
          </div>
          <div className="bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded text-[8px] font-mono text-white/70 tracking-widest">
            {feed.city || feed.provider || 'SURVEILLANCE'}
          </div>
        </div>

        {/* Center reticle cross */}
        <div className="self-center flex items-center justify-center opacity-30">
          <div className="w-4 h-[1px] bg-emerald-400" />
          <div className="h-4 w-[1px] bg-emerald-400 -ml-2" />
        </div>

        {/* Bottom HUD bar */}
        <div className="flex items-center justify-between text-[8px] font-mono text-white/60 bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded">
          <span className="truncate max-w-[170px]">{feed.id || 'CAM-NODE'}</span>
          <span className="text-emerald-400 font-semibold tracking-wider">REC ●</span>
        </div>
      </div>
    </div>
  );
}
