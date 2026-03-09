import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import Globe from 'globe.gl';
import * as THREE from 'three';
import useStore from '../store/useStore';

/* ── City Preset Coordinates ─────────────────────────── */
export const CITY_COORDS = {
    GLOBAL: { lat: 20, lng: 0, alt: 2.5 },
    LONDON: { lat: 51.5074, lng: -0.1278, alt: 0.4 },
    'NEW YORK': { lat: 40.7128, lng: -74.006, alt: 0.4 },
    TOKYO: { lat: 35.6762, lng: 139.6503, alt: 0.4 },
    DUBAI: { lat: 25.2048, lng: 55.2708, alt: 0.4 },
    SYDNEY: { lat: -33.8688, lng: 151.2093, alt: 0.4 },
};

/* ── Dark Earth texture (generated canvas) ───────────── */
function createDarkEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Dark background
    ctx.fillStyle = '#050a05';
    ctx.fillRect(0, 0, 2048, 1024);

    return canvas.toDataURL();
}

/* ── Layer color map ─────────────────────────────────── */
const LAYER_COLORS = {
    aircraft: '#00ff41',
    satellites: '#ffaa00',
    seismic: '#ff4444',
    airports: '#00b4ff',
    cctv: '#ff00ff',
    traffic: '#ffff00',
    maritime: '#0088ff',
    powerGrid: '#ff8800',
    conflicts: '#ff0000',
    militaryActivity: '#ff2222',
    militaryBases: '#cc0000',
    forbiddenZones: '#ff4400',
    hazards: '#ff6600',
    disasters: '#ff3300',
    volcanoes: '#ff5500',
    fireHotspots: '#ff7700',
    weatherAlerts: '#ffcc00',
    spaceWeather: '#aa00ff',
    solarFlares: '#ffaa00',
    weather: '#0099cc',
    airQuality: '#66cc00',
    metar: '#00ccaa',
    oceanBuoys: '#0066cc',
    airspace: '#4488ff',
    seismicStations: '#cc4444',
};

/* ── Point size by layer ─────────────────────────────── */
const LAYER_POINT_SIZE = {
    aircraft: 0.25,
    satellites: 0.2,
    airports: 0.15,
    cctv: 0.2,
    default: 0.12,
};

export default function GlobeGL() {
    const containerRef = useRef(null);
    const globeRef = useRef(null);
    const frameIdRef = useRef(null);

    const layers = useStore((s) => s.layers);
    const setInspector = useStore((s) => s.setInspector);
    const setHoverInfo = useStore((s) => s.setHoverInfo);
    const clearHoverInfo = useStore((s) => s.clearHoverInfo);
    const isAutoRotating = useStore((s) => s.isAutoRotating);
    const focusHideEntities = useStore((s) => s.focusHideEntities);

    /* ── Aggregate all enabled layer data into points ── */
    const pointsData = useMemo(() => {
        if (focusHideEntities) return [];

        const points = [];
        for (const [layerName, layerState] of Object.entries(layers)) {
            if (!layerState.enabled || !layerState.data?.length) continue;

            const color = LAYER_COLORS[layerName] || '#00ff41';
            const size = LAYER_POINT_SIZE[layerName] || LAYER_POINT_SIZE.default;

            for (const item of layerState.data) {
                const lat = item.lat ?? item.latitude ?? item.geo_lat;
                const lng = item.lng ?? item.lon ?? item.longitude ?? item.geo_lon;
                if (lat == null || lng == null) continue;
                if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) continue;

                points.push({
                    lat: Number(lat),
                    lng: Number(lng),
                    alt: layerName === 'satellites' ? 0.08 : (item.alt_m ? Math.min(item.alt_m / 6371000, 0.05) : 0.001),
                    size,
                    color,
                    layerName,
                    name: item.name || item.callsign || item.id || 'Unknown',
                    _raw: item,
                });
            }
        }
        return points;
    }, [layers, focusHideEntities]);

    /* ── Initialize Globe ────────────────────────────── */
    useEffect(() => {
        if (!containerRef.current || globeRef.current) return;

        const globe = Globe()
            .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
            .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
            .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
            .showAtmosphere(true)
            .atmosphereColor('#00ff41')
            .atmosphereAltitude(0.25)
            .pointOfView({ lat: 20, lng: 0, altitude: 2.5 })
            .width(containerRef.current.clientWidth)
            .height(containerRef.current.clientHeight)
            // Points layer config
            .pointsData([])
            .pointLat('lat')
            .pointLng('lng')
            .pointAltitude('alt')
            .pointRadius('size')
            .pointColor('color')
            .pointsMerge(false)
            .pointResolution(4)
            // Click handler
            .onPointClick((point) => {
                if (!point) return;
                setInspector({
                    type: point.layerName,
                    name: point.name,
                    position: { lat: point.lat, lng: point.lng },
                    data: point._raw,
                });
            })
            // Hover
            .onPointHover((point) => {
                if (point) {
                    setHoverInfo({
                        name: point.name,
                        type: point.layerName,
                        x: containerRef.current.clientWidth / 2,
                        y: containerRef.current.clientHeight / 2,
                    });
                } else {
                    clearHoverInfo();
                }
            })
            (containerRef.current);

        // Customize Three.js scene
        const scene = globe.scene();
        scene.background = new THREE.Color(0x000000);

        // Custom green glow via directional light
        const ambientLight = new THREE.AmbientLight(0x002200, 0.6);
        scene.add(ambientLight);

        // Override renderer
        const renderer = globe.renderer();
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.8;

        // Globe material customization
        const globeMesh = globe.scene().children.find(c => c.type === 'Group');
        if (globeMesh) {
            globeMesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.emissive = new THREE.Color(0x001a00);
                    child.material.emissiveIntensity = 0.15;
                }
            });
        }

        // Auto-rotation
        const controls = globe.controls();
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.4;
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.minDistance = 101;
        controls.maxDistance = 1200;

        globeRef.current = globe;

        // Resize handler
        const onResize = () => {
            if (!containerRef.current) return;
            globe.width(containerRef.current.clientWidth);
            globe.height(containerRef.current.clientHeight);
        };
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
            cancelAnimationFrame(frameIdRef.current);
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
            globeRef.current = null;
        };
    }, []);

    /* ── Update points data ──────────────────────────── */
    useEffect(() => {
        if (!globeRef.current) return;
        globeRef.current.pointsData(pointsData);
    }, [pointsData]);

    /* ── Auto-rotation toggle ────────────────────────── */
    useEffect(() => {
        if (!globeRef.current) return;
        const controls = globeRef.current.controls();
        controls.autoRotate = isAutoRotating;
    }, [isAutoRotating]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
            }}
        />
    );
}
