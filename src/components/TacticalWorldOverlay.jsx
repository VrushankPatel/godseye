import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import overlayRegistry from '../services/overlayRegistry';
import { getProxiedCameraFrameUrl } from '../services/cctvFeeds';

const MAX_CCTV_ALTITUDE_M = 14000;
const MAX_VEHICLE_CALLOUT_ALTITUDE_M = 3600;
const CCTV_CARD_W = 120;
const CCTV_CARD_H = 72;
const CCTV_THUMB_W = 112;
const CCTV_THUMB_H = 50;
const CCTV_MIN_SEP_PX = 115;
const MAX_VISIBLE_CCTV_CARDS = 18;
const MAX_CONCURRENT_FRAME_FETCHES = 4;
const FRAME_REFRESH_INTERVAL_MS = 12000;

// Shared in-memory image cache for CCTV camera frames
const frameImageCache = new Map();
// Tracking active in-flight fetches to prevent queue flooding
const inFlightFetches = new Set();
let lastFetchLaunchTime = 0;

function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function fetchCameraFrame(camId, url) {
    if (!url || inFlightFetches.has(camId)) return;
    const now = Date.now();
    const cached = frameImageCache.get(camId);
    if (cached && now - cached.loadedAt < FRAME_REFRESH_INTERVAL_MS) return;
    if (inFlightFetches.size >= MAX_CONCURRENT_FRAME_FETCHES) return;
    if (now - lastFetchLaunchTime < 150) return;

    lastFetchLaunchTime = now;
    inFlightFetches.add(camId);

    const proxiedUrl = getProxiedCameraFrameUrl(url, camId);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
        frameImageCache.set(camId, {
            image: img,
            status: 'loaded',
            loadedAt: Date.now(),
        });
        inFlightFetches.delete(camId);
    };

    img.onerror = () => {
        frameImageCache.set(camId, {
            image: null,
            status: 'error',
            loadedAt: Date.now(),
        });
        inFlightFetches.delete(camId);
    };

    img.src = proxiedUrl;
}

export default function TacticalWorldOverlay({ viewer }) {
    const canvasRef = useRef(null);
    const hoveredCardRef = useRef(null);
    const cardHitsRef = useRef([]);

    const cctvEnabled = useStore((s) => s.layers.cctv.enabled);
    const trafficEnabled = useStore((s) => s.layers.traffic.enabled);
    const setInspector = useStore((s) => s.setInspector);
    const setTrackedTarget = useStore((s) => s.setTrackedTarget);

    const scratchWin = useRef(new Cesium.Cartesian2());

    useEffect(() => {
        if (!viewer || viewer.isDestroyed() || !viewer.container) return;
        const container = viewer.container;

        const onContainerClick = (e) => {
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            for (const hit of cardHitsRef.current) {
                if (
                    mouseX >= hit.x &&
                    mouseX <= hit.x + hit.w &&
                    mouseY >= hit.y &&
                    mouseY <= hit.y + hit.h
                ) {
                    if (hit.type === 'cctv') {
                        setInspector({
                            type: 'cctv',
                            id: hit.data.id,
                            name: hit.data.name,
                            city: hit.data.city || 'Public Feed',
                            provider: hit.data.provider || 'CCTV Network',
                            url: hit.data.url,
                            videoUrl: hit.data.videoUrl || hit.data.url,
                            mediaType: hit.data.mediaType || 'image',
                            status: 'ACTIVE PREVIEW',
                        });
                        return;
                    } else if (hit.type === 'vehicle') {
                        setTrackedTarget({
                            type: 'traffic',
                            entityId: hit.data.id,
                        });
                        return;
                    }
                }
            }
        };

        const onContainerMouseMove = (e) => {
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            let foundHit = null;
            for (const hit of cardHitsRef.current) {
                if (
                    mouseX >= hit.x &&
                    mouseX <= hit.x + hit.w &&
                    mouseY >= hit.y &&
                    mouseY <= hit.y + hit.h
                ) {
                    foundHit = hit;
                    break;
                }
            }

            hoveredCardRef.current = foundHit?.data?.id || null;
            if (foundHit) {
                container.style.cursor = 'pointer';
            } else if (container.style.cursor === 'pointer') {
                container.style.cursor = 'default';
            }
        };

        container.addEventListener('click', onContainerClick);
        container.addEventListener('mousemove', onContainerMouseMove);

        return () => {
            container.removeEventListener('click', onContainerClick);
            container.removeEventListener('mousemove', onContainerMouseMove);
            if (container.style.cursor === 'pointer') {
                container.style.cursor = 'default';
            }
        };
    }, [setInspector, setTrackedTarget, viewer]);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scene = viewer.scene;
        const winScratch = scratchWin.current;

        const renderOverlay = () => {
            if (!canvas || viewer.isDestroyed()) return;

            const dpr = window.devicePixelRatio || 1;
            const clientW = canvas.clientWidth;
            const clientH = canvas.clientHeight;

            if (canvas.width !== Math.floor(clientW * dpr) || canvas.height !== Math.floor(clientH * dpr)) {
                canvas.width = Math.floor(clientW * dpr);
                canvas.height = Math.floor(clientH * dpr);
            }

            ctx.save();
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, clientW, clientH);

            cardHitsRef.current = [];

            const cameraHeightM = viewer.camera.positionCartographic?.height || 10000;

            // ─────────────────────────────────────────────────────────────
            // 1. VEHICLE MOTION POINTERS & TACTICAL HUD CALLOUTS
            // ─────────────────────────────────────────────────────────────
            if (trafficEnabled && overlayRegistry.isTrafficActive()) {
                const vehicles = overlayRegistry.getVehicles();
                const drawCallouts = cameraHeightM <= MAX_VEHICLE_CALLOUT_ALTITUDE_M;

                for (let i = 0; i < vehicles.length; i++) {
                    const veh = vehicles[i];
                    const pos = veh.point?.position || veh.position;
                    if (!pos) continue;

                    const winPos = Cesium.SceneTransforms.worldToWindowCoordinates(scene, pos, winScratch);
                    if (!winPos) continue;

                    const sx = winPos.x;
                    const sy = winPos.y;

                    // Frustum viewport culling
                    if (sx < -20 || sx > clientW + 20 || sy < -20 || sy > clientH + 20) {
                        continue;
                    }

                    const headingRad = Cesium.Math.toRadians(veh.headingDeg || 0);
                    const isHovered = hoveredCardRef.current === veh.vehicleData?.id;
                    const speedMph = Math.round((veh.currentMps || 0) * 2.23694);
                    const isStopped = veh.currentMps < 0.2 || (veh.signalColor === 'red');

                    // Draw sleek directional vehicle pointer / chevron
                    ctx.save();
                    ctx.translate(sx, sy);
                    ctx.rotate(headingRad);

                    // Tactical arrow chevron
                    ctx.beginPath();
                    ctx.moveTo(0, -7);
                    ctx.lineTo(4, 5);
                    ctx.lineTo(0, 2);
                    ctx.lineTo(-4, 5);
                    ctx.closePath();

                    const pointerColor = isStopped
                        ? '#ff4455'
                        : (isHovered ? '#00e5ff' : (veh.vehicleData?.paintColor || '#00ffc8'));

                    ctx.fillStyle = pointerColor;
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Corner bracket accents around vehicle
                    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    // Top-left
                    ctx.moveTo(-7, -4); ctx.lineTo(-7, -7); ctx.lineTo(-4, -7);
                    // Top-right
                    ctx.moveTo(4, -7); ctx.lineTo(7, -7); ctx.lineTo(7, -4);
                    // Bottom-right
                    ctx.moveTo(7, 4); ctx.lineTo(7, 7); ctx.lineTo(4, 7);
                    // Bottom-left
                    ctx.moveTo(-4, 7); ctx.lineTo(-7, 7); ctx.lineTo(-7, 4);
                    ctx.stroke();

                    ctx.restore();

                    // Draw tactical HUD callout box (VEH-XXXX) with leader line when zoomed in
                    if (drawCallouts) {
                        const vehTag = veh.vehicleData?.vehTag || `VEH-${String(veh.spawnSeed || i).padStart(4, '0')}`;
                        const model = veh.vehicleData?.shortLabel;
                        const metricText = isStopped ? 'STOP' : (isHovered && model ? model.slice(0, 8) : `${speedMph} MPH`);
                        const primaryText = vehTag;

                        const calloutW = 68;
                        const calloutH = 18;
                        const leadOffset = (i % 2 === 0) ? 14 : -14;
                        const callX = leadOffset > 0 ? sx + leadOffset : sx + leadOffset - calloutW;
                        const callY = sy - 24;

                        // Thin leader line connecting pointer to callout
                        ctx.beginPath();
                        ctx.moveTo(sx, sy - 2);
                        ctx.lineTo(callX + (leadOffset > 0 ? 0 : calloutW), callY + calloutH / 2);
                        ctx.strokeStyle = isStopped ? 'rgba(255, 68, 85, 0.7)' : 'rgba(0, 229, 255, 0.7)';
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        // Callout dark backing plate
                        ctx.fillStyle = isStopped ? 'rgba(32, 6, 12, 0.9)' : 'rgba(3, 14, 26, 0.88)';
                        ctx.strokeStyle = isStopped ? '#ff4455' : 'rgba(0, 229, 255, 0.5)';
                        ctx.lineWidth = 1;
                        drawRoundedRect(ctx, callX, callY, calloutW, calloutH, 3);
                        ctx.fill();
                        ctx.stroke();

                        // Left accent bar
                        ctx.fillStyle = isStopped ? '#ff4455' : '#00e5ff';
                        ctx.fillRect(callX, callY + 2, 2.5, calloutH - 4);

                        // Callout Text
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(primaryText, callX + 5, callY + calloutH / 2 - 1);

                        // Micro metric
                        ctx.fillStyle = isStopped ? '#ff6677' : '#00ffc8';
                        ctx.font = '8px "JetBrains Mono", monospace';
                        ctx.textAlign = 'right';
                        ctx.fillText(metricText, callX + calloutW - 4, callY + calloutH / 2 - 1);

                        // Register hit for clicking / tracking
                        cardHitsRef.current.push({
                            type: 'vehicle',
                            x: callX,
                            y: callY,
                            w: calloutW,
                            h: calloutH,
                            data: veh.vehicleData || { id: `vehicle-${i}` },
                        });
                    }
                }
            }

            // ─────────────────────────────────────────────────────────────
            // 2. AMBIENT CCTV PREVIEW CARDS (OPEN BY DEFAULT)
            // ─────────────────────────────────────────────────────────────
            if (cctvEnabled && cameraHeightM <= MAX_CCTV_ALTITUDE_M) {
                const cameras = overlayRegistry.getCameras();
                const candidates = [];

                for (let i = 0; i < cameras.length; i++) {
                    const cam = cameras[i];
                    if (!cam.position) continue;

                    const winPos = Cesium.SceneTransforms.worldToWindowCoordinates(scene, cam.position, winScratch);
                    if (!winPos) continue;

                    const sx = winPos.x;
                    const sy = winPos.y;

                    // Ensure inside visible viewport with margin
                    if (sx < 60 || sx > clientW - 60 || sy < 90 || sy > clientH - 40) {
                        continue;
                    }

                    // Compute screen center distance for ranking
                    const centerDx = sx - clientW / 2;
                    const centerDy = sy - clientH / 2;
                    const distToCenter = Math.sqrt(centerDx * centerDx + centerDy * centerDy);

                    candidates.push({
                        cam,
                        sx,
                        sy,
                        distToCenter,
                    });
                }

                // Sort candidates nearest to screen center
                candidates.sort((a, b) => a.distToCenter - b.distToCenter);

                // Greedy nearest-first screen-space declutter
                const accepted = [];
                const minSepSq = CCTV_MIN_SEP_PX * CCTV_MIN_SEP_PX;

                for (const cand of candidates) {
                    if (accepted.length >= MAX_VISIBLE_CCTV_CARDS) break;
                    let overlaps = false;
                    for (const acc of accepted) {
                        const dx = cand.sx - acc.sx;
                        const dy = cand.sy - acc.sy;
                        if (dx * dx + dy * dy < minSepSq) {
                            overlaps = true;
                            break;
                        }
                    }
                    if (!overlaps) {
                        accepted.push(cand);
                    }
                }

                // Render accepted CCTV cards
                for (const { cam, sx, sy } of accepted) {
                    const cardX = Math.round(sx - CCTV_CARD_W / 2);
                    const cardY = Math.round(sy - CCTV_CARD_H - 18);
                    const isHovered = hoveredCardRef.current === cam.id;

                    // Request image frame from proxy
                    fetchCameraFrame(cam.id, cam.url || cam.fallbackUrl);
                    const frameData = frameImageCache.get(cam.id);

                    // 1. Camera street ground anchor
                    ctx.save();
                    ctx.fillStyle = '#00e5ff';
                    ctx.shadowColor = '#00e5ff';
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();

                    // 2. Cyan leader line from anchor up to card base
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(sx, cardY + CCTV_CARD_H);
                    ctx.strokeStyle = isHovered ? '#00e5ff' : 'rgba(0, 229, 255, 0.75)';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();

                    // 3. Card backdrop & border
                    ctx.save();
                    if (isHovered) {
                        ctx.shadowColor = 'rgba(0, 229, 255, 0.8)';
                        ctx.shadowBlur = 12;
                    }
                    drawRoundedRect(ctx, cardX, cardY, CCTV_CARD_W, CCTV_CARD_H, 4);
                    ctx.fillStyle = 'rgba(3, 14, 26, 0.95)';
                    ctx.fill();
                    ctx.strokeStyle = isHovered ? '#ffffff' : '#00e5ff';
                    ctx.lineWidth = isHovered ? 2 : 1.5;
                    ctx.stroke();
                    ctx.restore();

                    // 4. Image thumbnail slot (16:9)
                    const thumbX = cardX + 4;
                    const thumbY = cardY + 4;

                    if (frameData?.status === 'loaded' && frameData.image) {
                        try {
                            ctx.drawImage(frameData.image, thumbX, thumbY, CCTV_THUMB_W, CCTV_THUMB_H);
                        } catch {
                            // Render fallback placeholder on canvas draw error
                        }
                    } else {
                        // Sleek tactical "IMAGE UNAVAILABLE" / "ACQUIRING..." placeholder
                        ctx.fillStyle = '#071828';
                        ctx.fillRect(thumbX, thumbY, CCTV_THUMB_W, CCTV_THUMB_H);

                        // Decorative inner border
                        ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(thumbX + 1, thumbY + 1, CCTV_THUMB_W - 2, CCTV_THUMB_H - 2);

                        // Video icon / camera glyph
                        ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
                        ctx.beginPath();
                        ctx.arc(thumbX + CCTV_THUMB_W / 2, thumbY + CCTV_THUMB_H / 2 - 5, 8, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.fillStyle = '#071828';
                        ctx.beginPath();
                        ctx.arc(thumbX + CCTV_THUMB_W / 2, thumbY + CCTV_THUMB_H / 2 - 5, 4, 0, Math.PI * 2);
                        ctx.fill();

                        // Label
                        ctx.fillStyle = frameData?.status === 'error' ? '#ff6677' : '#00e5ff';
                        ctx.font = 'bold 8px "JetBrains Mono", monospace';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        const statusMsg = frameData?.status === 'error' ? 'IMAGE UNAVAILABLE' : 'CONNECTING FEED...';
                        ctx.fillText(statusMsg, thumbX + CCTV_THUMB_W / 2, thumbY + CCTV_THUMB_H / 2 + 12);
                    }

                    // 5. Solid black title bar banner at bottom
                    const titleY = cardY + CCTV_CARD_H - 16;
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.moveTo(cardX, titleY);
                    ctx.lineTo(cardX + CCTV_CARD_W, titleY);
                    ctx.lineTo(cardX + CCTV_CARD_W, cardY + CCTV_CARD_H - 4);
                    ctx.quadraticCurveTo(cardX + CCTV_CARD_W, cardY + CCTV_CARD_H, cardX + CCTV_CARD_W - 4, cardY + CCTV_CARD_H);
                    ctx.lineTo(cardX + 4, cardY + CCTV_CARD_H);
                    ctx.quadraticCurveTo(cardX, cardY + CCTV_CARD_H, cardX, cardY + CCTV_CARD_H - 4);
                    ctx.closePath();
                    ctx.fill();

                    // Camera name text in uppercase monospace
                    const cleanName = (cam.name || 'CCTV CAMERA').toUpperCase();
                    ctx.fillStyle = isHovered ? '#00e5ff' : '#ffffff';
                    ctx.font = 'bold 8px "JetBrains Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const maxChars = 20;
                    const truncatedName = cleanName.length > maxChars ? cleanName.slice(0, maxChars - 2) + '..' : cleanName;
                    ctx.fillText(truncatedName, cardX + CCTV_CARD_W / 2, titleY + 8);

                    // Register hit area
                    cardHitsRef.current.push({
                        type: 'cctv',
                        x: cardX,
                        y: cardY,
                        w: CCTV_CARD_W,
                        h: CCTV_CARD_H,
                        data: cam,
                    });
                }
            }

            ctx.restore();
        };

        const removePostRender = viewer.scene.postRender.addEventListener(renderOverlay);

        return () => {
            removePostRender();
        };
    }, [cctvEnabled, trafficEnabled, viewer]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 6,
            }}
        />
    );
}
