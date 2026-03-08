import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { FORBIDDEN_ZONES } from '../constants/staticData';

export default function ForbiddenZonesLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.forbiddenZones.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);
    const entitiesRef = useRef([]);

    useEffect(() => {
        if (!isEnabled) {
            entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
            entitiesRef.current = [];
            setStatus('forbiddenZones', 'idle');
            updateData('forbiddenZones', []);
            return;
        }

        setStatus('forbiddenZones', 'loading');

        FORBIDDEN_ZONES.forEach((zone) => {
            const entity = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(zone.center[0], zone.center[1], 0),
                name: zone.name,
                ellipse: {
                    semiMinorAxis: zone.radius,
                    semiMajorAxis: zone.radius,
                    material: new Cesium.ColorMaterialProperty(
                        Cesium.Color.fromCssColorString(zone.color)
                    ),
                    outline: true,
                    outlineColor: Cesium.Color.fromCssColorString(zone.borderColor),
                    outlineWidth: 2,
                    extrudedHeight: zone.severity === 'EXTREME' ? 22000 : zone.severity === 'HIGH' ? 14000 : 8000,
                },
                label: {
                    text: 'NO-GO',
                    font: '11px JetBrains Mono',
                    fillColor: Cesium.Color.fromCssColorString('#ff6b6b'),
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    pixelOffset: new Cesium.Cartesian2(0, -26),
                    disableDepthTestDistance: 9000000,
                },
                properties: {
                    _layerType: 'forbiddenZones',
                    id: zone.id,
                    country: zone.country,
                    category: zone.type,
                    type: zone.type,
                    severity: zone.severity,
                    status: zone.status,
                    reason: zone.reason,
                    access: zone.access,
                    radius: `${(zone.radius / 1000).toFixed(1)} km`,
                    latitude: zone.center[1].toFixed(4),
                    longitude: zone.center[0].toFixed(4),
                    source: zone.source,
                    reference: zone.reference,
                },
            });

            entitiesRef.current.push(entity);
        });

        updateData('forbiddenZones', FORBIDDEN_ZONES);
        setStatus('forbiddenZones', 'active');
        viewer.scene.requestRender();

        return () => {
            entitiesRef.current.forEach((entity) => {
                if (!viewer.isDestroyed()) viewer.entities.remove(entity);
            });
            entitiesRef.current = [];
        };
    }, [isEnabled, viewer, updateData, setStatus]);

    return null;
}
