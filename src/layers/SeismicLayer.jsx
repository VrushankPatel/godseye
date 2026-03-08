import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { useDataFetcher } from '../hooks/useDataFetcher';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

export default function SeismicLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.seismic.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);
    const entitiesRef = useRef([]);

    // Clear entities on unmount or disable
    useEffect(() => {
        if (!isEnabled) {
            entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
            entitiesRef.current = [];
        }
        return () => {
            entitiesRef.current.forEach((entity) => {
                if (!viewer.isDestroyed()) viewer.entities.remove(entity);
            });
        };
    }, [isEnabled, viewer]);

    // Handle incoming GeoJSON data
    const handleData = (data) => {
        setStatus('seismic', 'active');

        // Clear old entities
        entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
        entitiesRef.current = [];

        const features = data.features || [];
        updateData('seismic', features);

        features.forEach((feature) => {
            const { geometry, properties } = feature;
            if (!geometry || !properties) return;

            const [lng, lat, depth] = geometry.coordinates;
            const mag = properties.mag;

            // Color based on magnitude
            let color = Cesium.Color.fromCssColorString('#ffaa00').withAlpha(0.6); // Amber
            if (mag > 5.0) color = Cesium.Color.fromCssColorString('#ff3333').withAlpha(0.7); // Red

            // Size based on magnitude
            const radius = Math.max(10000, mag * 25000);

            const entity = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
                name: properties.title,
                ellipse: {
                    semiMinorAxis: radius,
                    semiMajorAxis: radius,
                    material: new Cesium.ColorMaterialProperty(color),
                    outline: true,
                    outlineColor: Cesium.Color.fromCssColorString('#ff3333'),
                    outlineWidth: 2,
                },
                properties: {
                    _layerType: 'seismic',
                    magnitude: mag,
                    depth: `${depth} km`,
                    location: properties.place,
                    time: new Date(properties.time).toISOString(),
                    tsunami: properties.tsunami ? 'Warning Issued' : 'None',
                },
            });

            entitiesRef.current.push(entity);
        });
    };

    const handleError = (error) => {
        console.error('Seismic fetch error:', error);
        setStatus('seismic', 'error');
    };

    // Poll USGS data
    useDataFetcher(
        API_URLS.USGS_EARTHQUAKES_DAY, // Or HOUR if day is too heavy
        POLL_INTERVALS.SEISMIC,
        isEnabled,
        handleData,
        handleError
    );

    // Set loading status when enabling
    useEffect(() => {
        if (isEnabled && entitiesRef.current.length === 0) {
            setStatus('seismic', 'loading');
        }
    }, [isEnabled, setStatus]);

    return null;
}
