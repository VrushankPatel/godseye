import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { DEFAULT_CAMERA } from '../constants/dataSources';
import AircraftLayer from '../layers/AircraftLayer';
import SatelliteLayer from '../layers/SatelliteLayer';
import SeismicLayer from '../layers/SeismicLayer';
import AirportsLayer from '../layers/AirportsLayer';
import SeismicStationsLayer from '../layers/SeismicStationsLayer';
import HazardsLayer from '../layers/HazardsLayer';
import DisasterLayer from '../layers/DisasterLayer';
import WeatherAlertsLayer from '../layers/WeatherAlertsLayer';
import OceanBuoysLayer from '../layers/OceanBuoysLayer';
import VolcanoesLayer from '../layers/VolcanoesLayer';
import SpaceWeatherLayer from '../layers/SpaceWeatherLayer';
import MetarLayer from '../layers/MetarLayer';
import FireHotspotsLayer from '../layers/FireHotspotsLayer';
import AviationHazardsLayer from '../layers/AviationHazardsLayer';
import SolarFlaresLayer from '../layers/SolarFlaresLayer';
import WeatherLayer from '../layers/WeatherLayer';
import AirQualityLayer from '../layers/AirQualityLayer';
import CameraLayer from '../layers/CameraLayer';
import AirspaceLayer from '../layers/AirspaceLayer';
import TrafficLayer from '../layers/TrafficLayer';
import MilitaryActivityLayer from '../layers/MilitaryActivityLayer';
import MilitaryBasesLayer from '../layers/MilitaryBasesLayer';
import ForbiddenZonesLayer from '../layers/ForbiddenZonesLayer';

const TRACK_SAMPLE_INTERVAL_MS = 1000;
const MAX_TRACK_POINTS = 220;
const MIN_TRACK_POINT_DISTANCE_METERS = 250;
const AIRCRAFT_MODEL_URI = '/models/Cesium_Air.glb';
const TRACKED_AIRCRAFT_MODEL_HEADING_OFFSET_DEG = 90;

const AIRCRAFT_TRACK_VIEWS = {
    CHASE: new Cesium.Cartesian3(2200, 0, 700),
    TOP: new Cesium.Cartesian3(0, 0, 4200),
    SIDE: new Cesium.Cartesian3(0, -2400, 700),
    CINEMATIC: new Cesium.Cartesian3(4200, -1800, 1300),
};

const SATELLITE_TRACK_VIEWS = {
    ORBIT: new Cesium.Cartesian3(-32000, 0, 11000),
    NADIR: new Cesium.Cartesian3(0, 0, 36000),
    WIDE: new Cesium.Cartesian3(-60000, 22000, 20000),
};

function getTrackViewOffset(type, view) {
    if (type === 'satellites') {
        return SATELLITE_TRACK_VIEWS[view] || SATELLITE_TRACK_VIEWS.ORBIT;
    }
    return AIRCRAFT_TRACK_VIEWS[view] || AIRCRAFT_TRACK_VIEWS.CHASE;
}

function readNumericProperty(property, time) {
    if (property === undefined || property === null) return null;
    try {
        const value = typeof property.getValue === 'function' ? property.getValue(time) : property;
        return Number.isFinite(value) ? value : null;
    } catch (err) {
        return null;
    }
}

function getTrackedHeadingDegrees(entity, time) {
    if (!entity?.properties) return 0;

    const directHeading = readNumericProperty(entity.properties._headingDeg, time);
    if (Number.isFinite(directHeading)) return directHeading;

    try {
        const textHeading = typeof entity.properties.heading?.getValue === 'function'
            ? entity.properties.heading.getValue(time)
            : entity.properties.heading;
        const parsed = Number.parseFloat(String(textHeading || '0'));
        return Number.isFinite(parsed) ? parsed : 0;
    } catch (err) {
        return 0;
    }
}

export default function Globe() {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const trailEntityRef = useRef(null);
    const trailPositionsRef = useRef([]);
    const trailTimerRef = useRef(null);
    const trackedAircraftEntityIdRef = useRef(null);
    const hoveredEntityIdRef = useRef(null);
    const lastHoverUpdateMsRef = useRef(0);
    const [viewerReady, setViewerReady] = useState(false);
    const setViewerRefStore = useStore((s) => s.setViewerRef);
    const isAutoRotating = useStore((s) => s.isAutoRotating);
    const setAutoRotating = useStore((s) => s.setAutoRotating);
    const setInspector = useStore((s) => s.setInspector);
    const setHoverInfo = useStore((s) => s.setHoverInfo);
    const clearHoverInfo = useStore((s) => s.clearHoverInfo);
    const trackedTarget = useStore((s) => s.trackedTarget);
    const trackingView = useStore((s) => s.trackingView);
    const clearTrackedTarget = useStore((s) => s.clearTrackedTarget);

    const restoreTrackedAircraftVisual = useCallback(() => {
        const viewer = viewerRef.current;
        const trackedAircraftId = trackedAircraftEntityIdRef.current;
        trackedAircraftEntityIdRef.current = null;

        if (!viewer || viewer.isDestroyed() || !trackedAircraftId) return;
        const trackedEntity = viewer.entities.getById(trackedAircraftId);
        if (!trackedEntity) return;

        if (trackedEntity.billboard) {
            trackedEntity.billboard.show = true;
        }
        trackedEntity.model = undefined;
        trackedEntity.orientation = undefined;
    }, []);

    const applyTrackedAircraftVisual = useCallback((entity) => {
        if (!entity) return;

        if (
            trackedAircraftEntityIdRef.current &&
            trackedAircraftEntityIdRef.current !== entity.id
        ) {
            restoreTrackedAircraftVisual();
        }

        trackedAircraftEntityIdRef.current = entity.id;
        if (entity.billboard) {
            entity.billboard.show = false;
        }

        entity.model = {
            uri: AIRCRAFT_MODEL_URI,
            minimumPixelSize: 72,
            maximumScale: 140,
            incrementallyLoadTextures: true,
            silhouetteColor: Cesium.Color.fromCssColorString('#00b4ff').withAlpha(0.55),
            silhouetteSize: 1.2,
            disableDepthTestDistance: 9000000,
        };

        entity.orientation = new Cesium.CallbackProperty((time, result) => {
            const position = entity.position?.getValue
                ? entity.position.getValue(time)
                : entity.position;
            if (!position) return undefined;

            const headingDeg = getTrackedHeadingDegrees(entity, time);
            const headingRad = Cesium.Math.toRadians(
                headingDeg + TRACKED_AIRCRAFT_MODEL_HEADING_OFFSET_DEG
            );
            const hpr = new Cesium.HeadingPitchRoll(headingRad, 0, 0);
            return Cesium.Transforms.headingPitchRollQuaternion(position, hpr, Cesium.Ellipsoid.WGS84, undefined, result);
        }, false);
    }, [restoreTrackedAircraftVisual]);

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

        const parsePickedEntity = (pickedObject) => {
            if (!(Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties)) {
                return null;
            }

            const props = {};
            const propertyNames = pickedObject.id.properties.propertyNames || [];
            const time = viewer.clock.currentTime;

            propertyNames.forEach((name) => {
                try {
                    const val = pickedObject.id.properties[name].getValue(time);
                    if (val !== undefined) props[name] = val;
                } catch (e) {
                    props[name] = pickedObject.id.properties[name];
                }
            });

            return {
                ...props,
                type: props._layerType || 'unknown',
                name: pickedObject.id.name || 'Unknown',
                _entityId: pickedObject.id.id || null,
            };
        };

        // Entity click handler
        handler.setInputAction((click) => {
            const pickedObject = viewer.scene.pick(click.position);
            const parsed = parsePickedEntity(pickedObject);
            if (parsed) {
                clearHoverInfo();
                setInspector(parsed);
            } else {
                // Clicked on empty space, close inspector
                setInspector(null);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Hover preview handler
        handler.setInputAction((movement) => {
            const screenPos = movement?.endPosition;
            if (!screenPos) return;

            const pickedObject = viewer.scene.pick(screenPos);
            const parsed = parsePickedEntity(pickedObject);
            if (!parsed) {
                if (hoveredEntityIdRef.current !== null) {
                    hoveredEntityIdRef.current = null;
                    clearHoverInfo();
                }
                return;
            }

            const hoverEntityId = parsed._entityId || `${parsed.type}:${parsed.name}`;
            const now = performance.now();
            const shouldThrottle =
                hoveredEntityIdRef.current === hoverEntityId &&
                now - lastHoverUpdateMsRef.current < 33;
            if (shouldThrottle) return;

            hoveredEntityIdRef.current = hoverEntityId;
            lastHoverUpdateMsRef.current = now;
            setHoverInfo({
                ...parsed,
                screenX: screenPos.x,
                screenY: screenPos.y,
                timestamp: Date.now(),
            });
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        return () => {
            handler.destroy();
            removeTrail();
            restoreTrackedAircraftVisual();
            hoveredEntityIdRef.current = null;
            clearHoverInfo();
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                viewerRef.current.destroy();
            }
            viewerRef.current = null;
            setViewerRefStore(null);
        };
    }, [
        clearHoverInfo,
        removeTrail,
        restoreTrackedAircraftVisual,
        setAutoRotating,
        setHoverInfo,
        setInspector,
        setViewerRefStore,
    ]);

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
            restoreTrackedAircraftVisual();
            return;
        }

        const targetEntity = viewer.entities.getById(trackedTarget.entityId);
        if (!targetEntity) {
            clearTrackedTarget();
            removeTrail();
            restoreTrackedAircraftVisual();
            return;
        }

        setAutoRotating(false);
        if (trackedTarget.type === 'aircraft') {
            applyTrackedAircraftVisual(targetEntity);
        } else {
            restoreTrackedAircraftVisual();
        }
        targetEntity.viewFrom = Cesium.Cartesian3.clone(getTrackViewOffset(trackedTarget.type, trackingView));
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
    }, [
        trackedTarget,
        applyTrackedAircraftVisual,
        clearTrackedTarget,
        removeTrail,
        restoreTrackedAircraftVisual,
        setAutoRotating,
    ]);

    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer || viewer.isDestroyed() || !trackedTarget?.entityId) return;

        const targetEntity = viewer.entities.getById(trackedTarget.entityId);
        if (!targetEntity) return;

        targetEntity.viewFrom = Cesium.Cartesian3.clone(
            getTrackViewOffset(trackedTarget.type, trackingView)
        );

        // Cesium does not always apply viewFrom changes on an already-tracked entity.
        // Rebind tracking to force camera offset refresh for Top/Side/Cinematic controls.
        viewer.trackedEntity = undefined;
        viewer.trackedEntity = targetEntity;
        viewer.scene.requestRender();
    }, [trackedTarget, trackingView]);

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
                    <AirportsLayer viewer={viewerRef.current} />
                    <SeismicStationsLayer viewer={viewerRef.current} />
                    <HazardsLayer viewer={viewerRef.current} />
                    <DisasterLayer viewer={viewerRef.current} />
                    <WeatherAlertsLayer viewer={viewerRef.current} />
                    <OceanBuoysLayer viewer={viewerRef.current} />
                    <VolcanoesLayer viewer={viewerRef.current} />
                    <SpaceWeatherLayer viewer={viewerRef.current} />
                    <MetarLayer viewer={viewerRef.current} />
                    <FireHotspotsLayer viewer={viewerRef.current} />
                    <AviationHazardsLayer viewer={viewerRef.current} />
                    <SolarFlaresLayer viewer={viewerRef.current} />
                    <WeatherLayer viewer={viewerRef.current} />
                    <AirQualityLayer viewer={viewerRef.current} />
                    <CameraLayer viewer={viewerRef.current} />
                    <TrafficLayer viewer={viewerRef.current} />
                    <MilitaryActivityLayer viewer={viewerRef.current} />
                    <MilitaryBasesLayer viewer={viewerRef.current} />
                    <ForbiddenZonesLayer viewer={viewerRef.current} />
                    <AirspaceLayer viewer={viewerRef.current} />
                </>
            )}
        </>
    );
}
