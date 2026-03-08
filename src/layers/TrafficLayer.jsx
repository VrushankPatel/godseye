import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';

// We simulate traffic by creating animated particles moving along predefined paths in major cities.
// This avoids heavy Overpass API dependency while satisfying the "visual simulation" requirement.
const CITY_ROADS = [
    // NYC Manhattan Grid
    [[-74.010, 40.705], [-73.980, 40.730], [-73.950, 40.758], [-73.930, 40.780]],
    [[-74.005, 40.710], [-73.970, 40.740], [-73.940, 40.770]],
    [[-74.015, 40.715], [-73.990, 40.750], [-73.970, 40.785]],
    // London
    [[-0.140, 51.500], [-0.120, 51.510], [-0.090, 51.515], [-0.070, 51.508]],
    [[-0.150, 51.510], [-0.130, 51.520], [-0.100, 51.525], [-0.080, 51.518]],
    // Tokyo
    [[139.700, 35.660], [139.730, 35.665], [139.760, 35.680], [139.780, 35.700]],
    [[139.690, 35.680], [139.720, 35.690], [139.750, 35.695], [139.770, 35.710]],
];

export default function TrafficLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.traffic.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);
    const entitiesRef = useRef([]);
    const updateTimerRef = useRef(null);

    useEffect(() => {
        if (!isEnabled) {
            clearInterval(updateTimerRef.current);
            entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
            entitiesRef.current = [];
            setStatus('traffic', 'idle');
            return;
        }

        setStatus('traffic', 'loading');

        // Create a pulsing dot for vehicles
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ff69b4'; // Hot pink / neon red
        ctx.beginPath();
        ctx.arc(8, 8, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowColor = '#ff69b4';
        ctx.shadowBlur = 8;
        ctx.fill();
        const carImage = canvas.toDataURL();

        // Generate traffic particles
        const vehicles = [];
        let idCounter = 0;

        CITY_ROADS.forEach((road) => {
            // Create 5-10 cars per road segment
            const numCars = Math.floor(Math.random() * 5) + 5;

            for (let i = 0; i < numCars; i++) {
                // Pick a random starting segment of the road
                const segmentIdx = Math.floor(Math.random() * (road.length - 1));
                const start = road[segmentIdx];
                const end = road[segmentIdx + 1];

                // Random progress along that segment
                const progress = Math.random();

                vehicles.push({
                    id: `car-${idCounter++}`,
                    road,
                    segmentIdx,
                    progress,
                    speed: 0.005 + (Math.random() * 0.01), // speed coefficient
                    forward: Math.random() > 0.5 // direction
                });
            }
        });

        // Create entities
        vehicles.forEach((v) => {
            const start = v.road[v.segmentIdx];
            const end = v.road[v.segmentIdx + v.forward ? 1 : 0] || v.road[0];

            // Interpolate initial position
            const lng = start[0] + (end[0] - start[0]) * v.progress;
            const lat = start[1] + (end[1] - start[1]) * v.progress;

            const entity = viewer.entities.add({
                id: v.id,
                position: new Cesium.CallbackProperty(() => {
                    // Calculate current position based on simulated progress
                    const currentStart = v.road[v.segmentIdx];
                    const currentEnd = v.forward ? v.road[v.segmentIdx + 1] : v.road[v.segmentIdx - 1];

                    if (!currentEnd) {
                        // End of road, turn around
                        v.forward = !v.forward;
                        return Cesium.Cartesian3.fromDegrees(currentStart[0], currentStart[1], 10);
                    }

                    const curLng = currentStart[0] + (currentEnd[0] - currentStart[0]) * v.progress;
                    const curLat = currentStart[1] + (currentEnd[1] - currentStart[1]) * v.progress;

                    return Cesium.Cartesian3.fromDegrees(curLng, curLat, 10);
                }, false),
                billboard: {
                    image: carImage,
                    scale: 0.5,
                    disableDepthTestDistance: 100000,
                },
            });
            entitiesRef.current.push(entity);
        });

        updateData('traffic', vehicles);
        setStatus('traffic', 'active');

        // Animation Loop
        updateTimerRef.current = setInterval(() => {
            if (viewer.isDestroyed()) return;

            vehicles.forEach(v => {
                v.progress += v.speed;

                if (v.progress >= 1.0) {
                    v.progress = 0;
                    if (v.forward) {
                        v.segmentIdx++;
                        if (v.segmentIdx >= v.road.length - 1) {
                            v.forward = false;
                            v.segmentIdx = v.road.length - 1;
                        }
                    } else {
                        v.segmentIdx--;
                        if (v.segmentIdx <= 0) {
                            v.forward = true;
                            v.segmentIdx = 0;
                        }
                    }
                }
            });

            // Force repaint
            viewer.scene.requestRender();
        }, 50);

        return () => {
            clearInterval(updateTimerRef.current);
            entitiesRef.current.forEach((entity) => {
                if (!viewer.isDestroyed()) viewer.entities.remove(entity);
            });
            entitiesRef.current = [];
        };
    }, [isEnabled, viewer, updateData, setStatus]);

    return null;
}
