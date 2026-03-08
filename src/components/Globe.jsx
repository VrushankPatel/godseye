import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { DEFAULT_CAMERA } from '../constants/dataSources';
import AircraftLayer from '../layers/AircraftLayer';
import SatelliteLayer from '../layers/SatelliteLayer';
import SeismicLayer from '../layers/SeismicLayer';
import CameraLayer from '../layers/CameraLayer';
import AirspaceLayer from '../layers/AirspaceLayer';
import TrafficLayer from '../layers/TrafficLayer';

const TRACK_SAMPLE_INTERVAL_MS = 1000;
const MAX_TRACK_POINTS = 220;
const MIN_TRACK_POINT_DISTANCE_METERS = 250;

export default function Globe() {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const trailEntityRef = useRef(null);
    const trailPositionsRef = useRef([]);
    const trailTimerRef = useRef(null);
    const [viewerReady, setViewerReady] = useState(false);
    const setViewerRefStore = useStore((s) => s.setViewerRef);
    const isAutoRotating = useStore((s) => s.isAutoRotating);
    const setAutoRotating = useStore((s) => s.setAutoRotating);
    const setInspector = useStore((s) => s.setInspector);
    const trackedTarget = useStore((s) => s.trackedTarget);
    const clearTrackedTarget = useStore((s) => s.clearTrackedTarget);

    const removeTrail = useCallback(() => {
        clearInterval(trailTimerRef.current);
        trailTimerRef.current = null;
        trailPositionsRef.current = [];

        const viewer = viewerRef.current;
        if (viewer && !viewer.isDestroyed() && trailEntityRef.current) {
            viewer.entities.remove(trailEntityRef.current);
        }
        trailEntityRef.current = null;
    }, []);

    // Initialize Cesium viewer
    useEffect(() => {
        if (!containerRef.current || viewerRef.current) return;

        // Core Initialization - bypass Ion tokens with robust URL templates
        const esriProvider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maximumLevel: 19,
            credit: 'Esri World Imagery'
        });

        const viewer = new Cesium.Viewer(containerRef.current, {
            terrainProvider: new Cesium.EllipsoidTerrainProvider(),
            baseLayer: new Cesium.ImageryLayer(esriProvider),
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
            skyAtmosphere: false,
            scene3DOnly: true,
            shadows: false,
            requestRenderMode: false,
        });

        // Force a dark, eye-friendly space backdrop (no bright atmospheric blue)
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0a0f');
        if (viewer.scene.skyBox) {
            viewer.scene.skyBox.show = false;
        }
        viewer.scene.globe.showGroundAtmosphere = false;
        viewer.scene.fog.enabled = false;
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
                pitch: Cesium.Math.toRadians(-90),
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
                    ...props,
                    type: props._layerType || 'unknown',
                    name: pickedObject.id.name || 'Unknown',
                    _entityId: pickedObject.id.id || null,
                });
            } else {
                // Clicked on empty space, close inspector
                setInspector(null);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        return () => {
            handler.destroy();
            removeTrail();
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                viewerRef.current.destroy();
            }
            viewerRef.current = null;
            setViewerRefStore(null);
        };
    }, [removeTrail, setAutoRotating, setInspector, setViewerRefStore]);

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

    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer || viewer.isDestroyed()) return;

        if (!trackedTarget?.entityId) {
            viewer.trackedEntity = undefined;
            removeTrail();
            return;
        }

        const targetEntity = viewer.entities.getById(trackedTarget.entityId);
        if (!targetEntity) {
            clearTrackedTarget();
            removeTrail();
            return;
        }

        setAutoRotating(false);
        viewer.trackedEntity = targetEntity;
        removeTrail();

        const trailColor = trackedTarget.type === 'satellites'
            ? Cesium.Color.fromCssColorString('#ffaa00')
            : Cesium.Color.fromCssColorString('#00b4ff');

        trailEntityRef.current = viewer.entities.add({
            id: `track-trail-${trackedTarget.entityId}`,
            polyline: {
                positions: new Cesium.CallbackProperty(() => trailPositionsRef.current, false),
                width: 2.5,
                material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: 0.2,
                    taperPower: 0.4,
                    color: trailColor.withAlpha(0.85),
                }),
                clampToGround: false,
            },
        });

        const captureTrailPoint = () => {
            const liveEntity = viewer.entities.getById(trackedTarget.entityId);
            if (!liveEntity) {
                clearTrackedTarget();
                removeTrail();
                return;
            }

            let position = null;
            const positionProp = liveEntity.position;
            if (positionProp && typeof positionProp.getValue === 'function') {
                position = positionProp.getValue(viewer.clock.currentTime);
            } else if (positionProp) {
                position = positionProp;
            }

            if (!position) return;

            const trail = trailPositionsRef.current;
            const lastPoint = trail[trail.length - 1];
            if (!lastPoint || Cesium.Cartesian3.distance(lastPoint, position) >= MIN_TRACK_POINT_DISTANCE_METERS) {
                trail.push(Cesium.Cartesian3.clone(position));
                if (trail.length > MAX_TRACK_POINTS) {
                    trail.splice(0, trail.length - MAX_TRACK_POINTS);
                }
                viewer.scene.requestRender();
            }
        };

        captureTrailPoint();
        trailTimerRef.current = setInterval(captureTrailPoint, TRACK_SAMPLE_INTERVAL_MS);

        return () => {
            clearInterval(trailTimerRef.current);
            trailTimerRef.current = null;
        };
    }, [trackedTarget, clearTrackedTarget, removeTrail, setAutoRotating]);

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
                    <TrafficLayer viewer={viewerRef.current} />
                    <AirspaceLayer viewer={viewerRef.current} />
                </>
            )}
        </>
    );
}
