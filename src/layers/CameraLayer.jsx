import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { CAMERA_FEEDS } from '../constants/staticData';

export default function CameraLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.cctv.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);
    const entitiesRef = useRef([]);

    useEffect(() => {
        if (!isEnabled) {
            entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
            entitiesRef.current = [];
            setStatus('cctv', 'idle');
            return;
        }

        setStatus('cctv', 'loading');

        // Create a canvas-based icon for the cameras
        const canvas = document.createElement('canvas');
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');

        // Draw camera icon (neon green border with center dot)
        ctx.strokeStyle = '#00ff41';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.roundRect(8, 12, 32, 20, 2);
        ctx.fill();
        ctx.stroke();

        // Lens
        ctx.beginPath();
        ctx.arc(24, 22, 6, 0, 2 * Math.PI);
        ctx.strokeStyle = '#00ff41';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(24, 22, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#00ff41';
        ctx.fill();

        // Base/Mount
        ctx.beginPath();
        ctx.moveTo(20, 32);
        ctx.lineTo(16, 40);
        ctx.lineTo(32, 40);
        ctx.lineTo(28, 32);
        ctx.fillStyle = 'rgba(0, 255, 65, 0.5)';
        ctx.fill();

        const imageUrl = canvas.toDataURL();

        // Add entities
        CAMERA_FEEDS.forEach((cam) => {
            const entity = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(cam.lng, cam.lat, 100),
                name: cam.name,
                billboard: {
                    image: imageUrl,
                    scale: 0.6,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    disableDepthTestDistance: 5000000, // Always visible from orbit
                },
                properties: {
                    _layerType: 'cctv',
                    id: cam.id,
                    city: cam.city,
                    latitude: cam.lat.toFixed(4),
                    longitude: cam.lng.toFixed(4),
                    type: cam.type.toUpperCase(),
                    url: cam.url, // URL needed for Inspector to render the <img> tag
                    fallbackUrl: cam.fallbackUrl,
                    status: 'LIVE',
                },
            });
            entitiesRef.current.push(entity);
        });

        updateData('cctv', CAMERA_FEEDS);
        setStatus('cctv', 'active');

        return () => {
            entitiesRef.current.forEach((entity) => {
                if (!viewer.isDestroyed()) viewer.entities.remove(entity);
            });
            entitiesRef.current = [];
        };
    }, [isEnabled, viewer, updateData, setStatus]);

    return null;
}
