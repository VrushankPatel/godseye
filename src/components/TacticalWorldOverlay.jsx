import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import overlayRegistry from '../services/overlayRegistry';
import { getProxiedCameraFrameUrl } from '../services/cctvFeeds';

const MAX_CCTV_ALTITUDE_M = 14000;
const MAX_VEHICLE_CALLOUT_ALTITUDE_M = 3500;
const FULL_VEHICLE_TIP_ALTITUDE_M = 1000;
const MAX_VISIBLE_VEHICLE_CALLOUTS = 40;
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
    const trackedTarget = useStore((s) => s.trackedTarget);
    const trackedTargetRef = useRef(trackedTarget);
    trackedTargetRef.current = trackedTarget;
    const setHoverInfo = useStore((s) => s.setHoverInfo);
    const clearHoverInfo = useStore((s) => s.clearHoverInfo);

    const vehicleHoverActiveRef = useRef(false);
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
                        setInspector(hit.data);
                        setTrackedTarget({
                            type: 'traffic',
                            entityId: hit.data.id,
                            label: hit.data.carName || hit.data.name || hit.data.callsign,
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
                if (foundHit.type === 'vehicle') {
                    vehicleHoverActiveRef.current = true;
                    setHoverInfo({
                        ...foundHit.data,
                        isVehicle: true,
                        screenX: e.clientX,
                        screenY: e.clientY,
                        timestamp: Date.now(),
                    });
                } else if (vehicleHoverActiveRef.current) {
                    vehicleHoverActiveRef.current = false;
                    clearHoverInfo();
                }
            } else {
                if (container.style.cursor === 'pointer') {
                    container.style.cursor = 'default';
                }
                if (vehicleHoverActiveRef.current) {
                    vehicleHoverActiveRef.current = false;
                    clearHoverInfo();
                }
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
            if (vehicleHoverActiveRef.current) {
                vehicleHoverActiveRef.current = false;
                clearHoverInfo();
            }
        };
    }, [clearHoverInfo, setHoverInfo, setInspector, setTrackedTarget, viewer]);

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

                const isZoomedIn = cameraHeightM <= FULL_VEHICLE_TIP_ALTITUDE_M;
                const vehicleCandidates = [];

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
                    const isTracked = trackedTargetRef.current?.entityId === veh.vehicleData?.id;
                    const speedMph = Math.round((veh.currentMps || 0) * 2.23694);
                    const speedKmh = Math.round((veh.currentMps || 0) * 3.6);
                    const isStopped = veh.currentMps < 0.2 || (veh.signalColor === 'red');

                    const hitVehData = {
                        ...(veh.vehicleData || {}),
                        id: veh.vehicleData?.id || `vehicle-${i}`,
                        name: veh.vehicleData?.name || veh.vehicleData?.carName || 'Vehicle',
                        carName: veh.vehicleData?.carName || veh.vehicleData?.name || 'Vehicle',
                        model: veh.vehicleData?.model || veh.vehicleData?.shortModel || '',
                        shortModel: veh.vehicleData?.shortModel || '',
                        shortLabel: veh.vehicleData?.shortLabel || veh.vehicleData?.name || '',
                        brand: veh.vehicleData?.brand || 'Automotive',
                        plate: veh.vehicleData?.plate || 'GJ01 AB 4821',
                        country: veh.vehicleData?.country || 'IN',
                        countryName: veh.vehicleData?.countryName || 'India',
                        isVehicle: true,
                        speedKmh,
                        speedMph,
                        isStopped,
                        headingDeg: Math.round(veh.headingDeg || 0),
                    };

                    // Register hit area around vehicle pointer chevron
                    cardHitsRef.current.push({
                        type: 'vehicle',
                        x: sx - 12,
                        y: sy - 12,
                        w: 24,
                        h: 24,
                        data: hitVehData,
                    });

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

                    // Collect candidate for callout rendering
                    if (drawCallouts) {
                        const isFull = isZoomedIn || isHovered || isTracked;
                        let calloutW, calloutH, callX, callY;

                        if (isFull) {
                            calloutW = 148;
                            calloutH = 34;
                            const leadOffset = (i % 2 === 0) ? 16 : -16;
                            callX = leadOffset > 0 ? sx + leadOffset : sx + leadOffset - calloutW;
                            callY = sy - 38;
                        } else {
                            // Smaller compact tooltip for zoomed out view
                            calloutW = 68;
                            calloutH = 16;
                            callX = Math.round(sx - calloutW / 2);
                            callY = Math.round(sy - 24);
                        }

                        const centerDist = Math.hypot(sx - clientW / 2, sy - clientH / 2);

                        vehicleCandidates.push({
                            veh,
                            i,
                            sx,
                            sy,
                            isFull,
                            isHovered,
                            isTracked,
                            isStopped,
                            speedKmh,
                            speedMph,
                            hitVehData,
                            calloutW,
                            calloutH,
                            callX,
                            callY,
                            centerDist,
                        });
                    }
                }

                // Screen-space declutter to eliminate crowding & overlapping boxes
                if (vehicleCandidates.length > 0) {
                    const acceptedCallouts = [];
                    const occupiedBoxes = [];

                    const hasOverlap = (targetBox, margin) => {
                        for (let b = 0; b < occupiedBoxes.length; b++) {
                            const box = occupiedBoxes[b];
                            if (!(
                                targetBox.x + targetBox.w + margin < box.x ||
                                box.x + box.w + margin < targetBox.x ||
                                targetBox.y + targetBox.h + margin < box.y ||
                                box.y + box.h + margin < targetBox.y
                            )) {
                                return true;
                            }
                        }
                        return false;
                    };

                    // 1. Always prioritize hovered or tracked vehicles
                    for (let c = 0; c < vehicleCandidates.length; c++) {
                        const cand = vehicleCandidates[c];
                        if (cand.isHovered || cand.isTracked) {
                            acceptedCallouts.push(cand);
                            occupiedBoxes.push({
                                x: cand.callX,
                                y: cand.callY,
                                w: cand.calloutW,
                                h: cand.calloutH,
                            });
                        }
                    }

                    // 2. Sort remaining candidates by distance to screen center
                    const remaining = vehicleCandidates.filter(c => !c.isHovered && !c.isTracked);
                    remaining.sort((a, b) => a.centerDist - b.centerDist);

                    const margin = isZoomedIn ? 6 : 10;
                    for (let c = 0; c < remaining.length; c++) {
                        if (acceptedCallouts.length >= MAX_VISIBLE_VEHICLE_CALLOUTS) break;
                        const cand = remaining[c];
                        const box = {
                            x: cand.callX,
                            y: cand.callY,
                            w: cand.calloutW,
                            h: cand.calloutH,
                        };
                        if (!hasOverlap(box, margin)) {
                            acceptedCallouts.push(cand);
                            occupiedBoxes.push(box);
                        }
                    }

                    // Render accepted vehicle callouts
                    for (let c = 0; c < acceptedCallouts.length; c++) {
                        const cand = acceptedCallouts[c];
                        const {
                            veh,
                            sx,
                            sy,
                            isFull,
                            isHovered,
                            isStopped,
                            speedKmh,
                            hitVehData,
                            calloutW,
                            calloutH,
                            callX,
                            callY,
                            i,
                        } = cand;

                        if (isFull) {
                            // ── FULL TIP (Zoomed In or Hovered/Tracked) ──
                            const leadOffset = (i % 2 === 0) ? 16 : -16;

                            // Leader line connecting pointer to callout card
                            ctx.beginPath();
                            ctx.arc(sx, sy - 3, 2, 0, Math.PI * 2);
                            ctx.fillStyle = isStopped ? '#ff4455' : (isHovered ? '#00e5ff' : '#00ffc8');
                            ctx.fill();

                            ctx.beginPath();
                            ctx.moveTo(sx, sy - 3);
                            ctx.lineTo(leadOffset > 0 ? callX : callX + calloutW, callY + calloutH / 2);
                            ctx.strokeStyle = isStopped
                                ? 'rgba(255, 68, 85, 0.8)'
                                : (isHovered ? '#00e5ff' : 'rgba(0, 229, 255, 0.65)');
                            ctx.lineWidth = 1;
                            ctx.stroke();

                            // Callout dark backing tactical glass plate
                            ctx.save();
                            if (isHovered) {
                                ctx.shadowColor = 'rgba(0, 229, 255, 0.6)';
                                ctx.shadowBlur = 8;
                            }
                            ctx.fillStyle = isStopped ? 'rgba(32, 6, 14, 0.94)' : 'rgba(3, 14, 26, 0.92)';
                            ctx.strokeStyle = isStopped ? '#ff4455' : (isHovered ? '#00e5ff' : 'rgba(0, 229, 255, 0.55)');
                            ctx.lineWidth = isHovered ? 1.5 : 1;
                            drawRoundedRect(ctx, callX, callY, calloutW, calloutH, 3);
                            ctx.fill();
                            ctx.stroke();
                            ctx.restore();

                            // Left accent indicator bar
                            ctx.fillStyle = isStopped ? '#ff4455' : (isHovered ? '#00e5ff' : '#00ffc8');
                            ctx.fillRect(callX, callY + 2, 2.5, calloutH - 4);

                            // Line 1: Car Name & Brand
                            const rawCarName = (veh.vehicleData?.shortLabel || veh.vehicleData?.carName || veh.vehicleData?.name || 'VEHICLE').toUpperCase();
                            const carNameDisplay = rawCarName.length > 17 ? rawCarName.slice(0, 16) + '…' : rawCarName;

                            ctx.fillStyle = isHovered ? '#00e5ff' : '#ffffff';
                            ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
                            ctx.textAlign = 'left';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(carNameDisplay, callX + 7, callY + 9.5);

                            // Model variant or country tag on right
                            const modelTag = (veh.vehicleData?.shortModel || veh.vehicleData?.model || veh.vehicleData?.country || '').slice(0, 7).toUpperCase();
                            if (modelTag) {
                                ctx.fillStyle = 'rgba(0, 229, 255, 0.65)';
                                ctx.font = '7.5px "JetBrains Mono", monospace';
                                ctx.textAlign = 'right';
                                ctx.fillText(modelTag, callX + calloutW - 6, callY + 9.5);
                            }

                            // Subtle hairline separator
                            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                            ctx.lineWidth = 0.6;
                            ctx.beginPath();
                            ctx.moveTo(callX + 4, callY + 18);
                            ctx.lineTo(callX + calloutW - 4, callY + 18);
                            ctx.stroke();

                            // Line 2: Authentic License Plate Badge
                            const plateText = veh.vehicleData?.plate || 'GJ01 AB 4821';
                            const plateBadgeW = 68;
                            const plateBadgeH = 10.5;
                            const plateBadgeX = callX + 7;
                            const plateBadgeY = callY + 20.5;

                            ctx.fillStyle = '#ffcc00';
                            ctx.fillRect(plateBadgeX, plateBadgeY, plateBadgeW, plateBadgeH);
                            ctx.strokeStyle = '#000000';
                            ctx.lineWidth = 0.5;
                            ctx.strokeRect(plateBadgeX, plateBadgeY, plateBadgeW, plateBadgeH);

                            ctx.fillStyle = '#000000';
                            ctx.font = 'bold 7px "JetBrains Mono", monospace';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(plateText, plateBadgeX + plateBadgeW / 2, plateBadgeY + plateBadgeH / 2 + 0.5);

                            // Line 2: Live Velocity or Stop Status on right
                            ctx.textAlign = 'right';
                            ctx.textBaseline = 'middle';
                            if (isStopped) {
                                ctx.fillStyle = '#ff4455';
                                ctx.font = 'bold 8px "JetBrains Mono", monospace';
                                ctx.fillText('🔴 STOP', callX + calloutW - 6, callY + 25.5);
                            } else {
                                ctx.fillStyle = '#00ffc8';
                                ctx.font = 'bold 8px "JetBrains Mono", monospace';
                                ctx.fillText(`${speedKmh} KM/H`, callX + calloutW - 6, callY + 25.5);
                            }
                        } else {
                            // ── SMALLER TOOLTIP (Zoomed Out Overview) ──
                            // Thin leader line directly up to compact pill
                            ctx.beginPath();
                            ctx.moveTo(sx, sy - 3);
                            ctx.lineTo(sx, callY + calloutH);
                            ctx.strokeStyle = isStopped ? 'rgba(255, 68, 85, 0.6)' : 'rgba(0, 229, 255, 0.5)';
                            ctx.lineWidth = 0.8;
                            ctx.stroke();

                            // Compact pill backdrop
                            ctx.fillStyle = isStopped ? 'rgba(32, 6, 14, 0.90)' : 'rgba(3, 14, 26, 0.88)';
                            ctx.strokeStyle = isStopped ? 'rgba(255, 68, 85, 0.7)' : 'rgba(0, 229, 255, 0.5)';
                            ctx.lineWidth = 1;
                            drawRoundedRect(ctx, callX, callY, calloutW, calloutH, 2.5);
                            ctx.fill();
                            ctx.stroke();

                            // Small status indicator dot
                            ctx.beginPath();
                            ctx.arc(callX + 6, callY + calloutH / 2, 2.2, 0, Math.PI * 2);
                            ctx.fillStyle = isStopped ? '#ff4455' : '#00ffc8';
                            ctx.fill();

                            // Short car model name
                            const shortLabel = (veh.vehicleData?.shortModel || veh.vehicleData?.shortLabel || 'CAR').toUpperCase();
                            const truncShort = shortLabel.length > 7 ? shortLabel.slice(0, 6) : shortLabel;

                            ctx.fillStyle = '#ffffff';
                            ctx.font = 'bold 7.5px "JetBrains Mono", monospace';
                            ctx.textAlign = 'left';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(truncShort, callX + 11, callY + calloutH / 2 + 0.5);

                            // Micro metric on right
                            ctx.fillStyle = isStopped ? '#ff6677' : '#00ffc8';
                            ctx.font = '7px "JetBrains Mono", monospace';
                            ctx.textAlign = 'right';
                            ctx.fillText(isStopped ? 'STOP' : `${speedKmh}k`, callX + calloutW - 4, callY + calloutH / 2 + 0.5);
                        }

                        // Register hit for HUD card
                        cardHitsRef.current.push({
                            type: 'vehicle',
                            x: callX,
                            y: callY,
                            w: calloutW,
                            h: calloutH,
                            data: hitVehData,
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
