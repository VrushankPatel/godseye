import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';

const MIN_PITCH_DEG = -88;
const MAX_PITCH_DEG = -32;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function pitchDegToSlider(pitchDeg) {
    const clamped = clamp(pitchDeg, MIN_PITCH_DEG, MAX_PITCH_DEG);
    return ((clamped - MIN_PITCH_DEG) / (MAX_PITCH_DEG - MIN_PITCH_DEG)) * 100;
}

function sliderToPitchDeg(sliderValue) {
    const normalized = clamp(Number(sliderValue) || 0, 0, 100) / 100;
    return MIN_PITCH_DEG + normalized * (MAX_PITCH_DEG - MIN_PITCH_DEG);
}

export default function CityTiltControl() {
    const viewerRef = useStore((s) => s.viewerRef);
    const city3DActive = useStore((s) => s.city3DActive);
    const citiesVisible = useStore((s) => s.citiesVisible);
    const setAutoRotating = useStore((s) => s.setAutoRotating);

    const [sliderValue, setSliderValue] = useState(0);
    const lastAppliedRef = useRef(0);

    useEffect(() => {
        if (!viewerRef || viewerRef.isDestroyed()) return undefined;

        const syncFromCamera = () => {
            if (viewerRef.isDestroyed()) return;
            const pitchDeg = Cesium.Math.toDegrees(viewerRef.camera.pitch);
            const mapped = pitchDegToSlider(pitchDeg);
            if (Math.abs(mapped - lastAppliedRef.current) < 0.45) return;
            lastAppliedRef.current = mapped;
            setSliderValue(mapped);
        };

        syncFromCamera();
        viewerRef.camera.changed.addEventListener(syncFromCamera);
        return () => {
            viewerRef.camera.changed.removeEventListener(syncFromCamera);
        };
    }, [viewerRef]);

    const angleLabel = useMemo(() => {
        const pitchDeg = sliderToPitchDeg(sliderValue);
        return `${Math.round(Math.abs(pitchDeg))}°`;
    }, [sliderValue]);

    const handleSliderChange = (event) => {
        const nextValue = clamp(Number(event.target.value), 0, 100);
        setSliderValue(nextValue);
        lastAppliedRef.current = nextValue;

        if (!viewerRef || viewerRef.isDestroyed()) return;

        setAutoRotating(false);
        const nextPitchDeg = sliderToPitchDeg(nextValue);
        viewerRef.camera.setView({
            destination: viewerRef.camera.position,
            orientation: {
                heading: viewerRef.camera.heading,
                pitch: Cesium.Math.toRadians(nextPitchDeg),
                roll: viewerRef.camera.roll,
            },
        });
        viewerRef.scene.requestRender();
    };

    if (!city3DActive) return null;

    return (
        <div
            className="city-tilt-control glass-panel pointer-events-auto"
            style={{
                position: 'absolute',
                top: '50%',
                right: citiesVisible ? '420px' : '18px',
                transform: 'translateY(-50%)',
                zIndex: 30,
                width: '58px',
                padding: '8px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
            }}
        >
            <span className="text-[9px] tracking-[0.2em] text-cyan-200 uppercase">3D</span>
            <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(sliderValue)}
                onChange={handleSliderChange}
                className="city-tilt-slider"
                orient="vertical"
                aria-label="3D camera angle"
                title="Adjust 3D camera angle"
            />
            <span className="text-[9px] tracking-[0.18em] text-text-dim uppercase">{angleLabel}</span>
        </div>
    );
}
