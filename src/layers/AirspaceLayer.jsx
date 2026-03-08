import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { RESTRICTED_AIRSPACE } from '../constants/staticData';

export default function AirspaceLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.airspace.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);
    const entitiesRef = useRef([]);

    useEffect(() => {
        if (!isEnabled) {
            entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
            entitiesRef.current = [];
            setStatus('airspace', 'idle');
            return;
        }

        setStatus('airspace', 'loading');

        // Add static airspace entities
        RESTRICTED_AIRSPACE.forEach((zone) => {
            const entity = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(zone.center[0], zone.center[1], 0),
                name: zone.name,
                ellipse: {
                    semiMinorAxis: zone.radius,
                    semiMajorAxis: zone.radius,
                    material: new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(zone.color)),
                    outline: true,
                    outlineColor: Cesium.Color.fromCssColorString(zone.borderColor),
                    outlineWidth: 2,
                    extrudedHeight: zone.type === 'Prohibited' ? 15000 : 5000,
                },
                properties: {
                    _layerType: 'airspace',
                    id: zone.id,
                    type: zone.type.toUpperCase(),
                    radius: `${(zone.radius / 1000).toFixed(1)} km`,
                    status: 'ACTIVE RESTRICTION',
                },
            });
            entitiesRef.current.push(entity);
        });

        updateData('airspace', RESTRICTED_AIRSPACE);
        setStatus('airspace', 'active');

        return () => {
            entitiesRef.current.forEach((entity) => {
                if (!viewer.isDestroyed()) viewer.entities.remove(entity);
            });
            entitiesRef.current = [];
        };
    }, [isEnabled, viewer, updateData, setStatus]);

    return null;
}
