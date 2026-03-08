import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { DEFAULT_CAMERA } from '../constants/dataSources';
import AircraftLayer from '../layers/AircraftLayer';
import SatelliteLayer from '../layers/SatelliteLayer';
import SeismicLayer from '../layers/SeismicLayer';
import CameraLayer from '../layers/CameraLayer';
import AirspaceLayer from '../layers/AirspaceLayer';

export default function Globe() {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const [viewerReady, setViewerReady] = useState(false);
    const setViewerRefStore = useStore((s) => s.setViewerRef);
    const isAutoRotating = useStore((s) => s.isAutoRotating);
    const setAutoRotating = useStore((s) => s.setAutoRotating);
    const setInspector = useStore((s) => s.setInspector);

    // Initialize Cesium viewer
    useEffect(() => {
        if (!containerRef.current || viewerRef.current) return;

        const arcgisProvider = Cesium.ArcGisMapServerImageryProvider.fromUrl(
            'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
        );

        const viewer = new Cesium.Viewer(containerRef.current, {
            terrainProvider: new Cesium.EllipsoidTerrainProvider(),
            baseLayer: Cesium.ImageryLayer.fromProviderAsync(arcgisProvider),
            baseLayerPicker: false,
            animation: false,
            fullscreenButton: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            sceneModePicker: false,
            selectionIndicator: false,
            timeline: false,
            navigationHelpButton: false,
            creditContainer: document.createElement('div'), // hide credits
            skyBox: new Cesium.SkyBox({
                sources: {
                    positiveX: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==',
                    negativeX: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==',
                    positiveY: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==',
                    negativeY: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==',
                    positiveZ: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==',
                    negativeZ: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==',
                },
            }),
            skyAtmosphere: new Cesium.SkyAtmosphere(),
            scene3DOnly: true,
            shadows: false,
            requestRenderMode: false,
        });

        // Set dark sky background
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0a0f');
        viewer.scene.globe.enableLighting = true;

        // Tweak camera controls for a crisper, more pleasant dragging experience
        viewer.scene.screenSpaceCameraController.inertiaSpin = 0;
        viewer.scene.screenSpaceCameraController.inertiaTranslate = 0;
        viewer.scene.screenSpaceCameraController.inertiaZoom = 0;
        viewer.scene.screenSpaceCameraController.enableTilt = true;

        // Set initial camera position
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                DEFAULT_CAMERA.longitude,
                DEFAULT_CAMERA.latitude,
                DEFAULT_CAMERA.height
            ),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-45),
                roll: 0,
            },
            duration: 0,
        });

        viewerRef.current = viewer;
        setViewerRefStore(viewer);
        setViewerReady(true);

        // Stop auto-rotation on user interaction
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction(() => {
            setAutoRotating(false);
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
        handler.setInputAction(() => {
            setAutoRotating(false);
        }, Cesium.ScreenSpaceEventType.WHEEL);

        // Entity click handler
        handler.setInputAction((click) => {
            const pickedObject = viewer.scene.pick(click.position);
            if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties) {
                const props = {};
                const propertyNames = pickedObject.id.properties.propertyNames;
                const time = viewer.clock.currentTime;

                propertyNames.forEach((name) => {
                    try {
                        const val = pickedObject.id.properties[name].getValue(time);
                        if (val !== undefined) props[name] = val;
                    } catch (e) {
                        // Fallback for simple properties
                        props[name] = pickedObject.id.properties[name];
                    }
                });

                setInspector({
                    type: props._layerType || 'unknown',
                    name: pickedObject.id.name || 'Unknown',
                    ...props,
                });
            } else {
                // Clicked on empty space, close inspector
                setInspector(null);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        return () => {
            handler.destroy();
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                viewerRef.current.destroy();
            }
            viewerRef.current = null;
        };
    }, []);

    // Auto-rotation
    useEffect(() => {
        if (!viewerRef.current) return;
        const viewer = viewerRef.current;

        let animationFrameId;
        const rotate = () => {
            if (isAutoRotating && viewer && !viewer.isDestroyed()) {
                viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.0003);
            }
            animationFrameId = requestAnimationFrame(rotate);
        };

        if (isAutoRotating) {
            animationFrameId = requestAnimationFrame(rotate);
        }

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [isAutoRotating]);

    return (
        <>
            <div
                ref={containerRef}
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            />
            {viewerReady && viewerRef.current && (
                <>
                    <AircraftLayer viewer={viewerRef.current} />
                    <SatelliteLayer viewer={viewerRef.current} />
                    <SeismicLayer viewer={viewerRef.current} />
                    <CameraLayer viewer={viewerRef.current} />
                    <AirspaceLayer viewer={viewerRef.current} />
                </>
            )}
        </>
    );
}
