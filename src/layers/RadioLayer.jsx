import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { fetchRadioStations, getStationCategoryColor } from '../services/radioService';
import { radioAudio } from '../services/radioAudio';

const RADIO_MARKER_PREFIX = 'radio-station-';

export default function RadioLayer({ viewer }) {
  const enabled = useStore((state) => state.layers.radio.enabled);
  const setLayerData = useStore((state) => state.setLayerData);
  const setLayerStatus = useStore((state) => state.setLayerStatus);
  const setRadioActiveStation = useStore((state) => state.setRadioActiveStation);
  const setRadioPlaybackStatus = useStore((state) => state.setRadioPlaybackStatus);
  const setRadioTunerOpen = useStore((state) => state.setRadioTunerOpen);

  const dataSourceRef = useRef(null);
  const clickHandlerRef = useRef(null);
  const stationsMapRef = useRef(new Map());

  // Initialize CustomDataSource
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    const ds = new Cesium.CustomDataSource('radio-layer');
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    return () => {
      if (viewer && !viewer.isDestroyed() && ds) {
        viewer.dataSources.remove(ds, true);
      }
      dataSourceRef.current = null;
    };
  }, [viewer]);

  // Click handler to pick radio stations directly on the globe
  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !enabled) return;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    clickHandlerRef.current = handler;

    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      if (!picked || !picked.id) return;

      const entity = picked.id;
      const entityId = typeof entity.id === 'string' ? entity.id : '';

      if (entityId.startsWith(RADIO_MARKER_PREFIX)) {
        const stationId = entityId.replace(RADIO_MARKER_PREFIX, '');
        const station = stationsMapRef.current.get(stationId);
        if (station) {
          setRadioActiveStation(station);
          setRadioTunerOpen(true);
          radioAudio.playStation(station);
          setRadioPlaybackStatus('playing');

          // Smoothly center camera slightly above station
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(station.lon, station.lat, 450000),
            duration: 1.5,
          });
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      if (handler && !handler.isDestroyed()) {
        handler.destroy();
      }
      clickHandlerRef.current = null;
    };
  }, [viewer, enabled, setRadioActiveStation, setRadioTunerOpen, setRadioPlaybackStatus]);

  // Load and sync station markers
  const loadStations = useCallback(async () => {
    if (!enabled || !dataSourceRef.current) return;

    setLayerStatus('radio', 'loading');
    try {
      const payload = await fetchRadioStations({ limit: 600 });
      const stations = payload.stations || [];

      if (!dataSourceRef.current) return;
      const ds = dataSourceRef.current;
      ds.entities.removeAll();
      stationsMapRef.current.clear();

      stations.forEach((station) => {
        if (!Number.isFinite(station.lat) || !Number.isFinite(station.lon)) return;
        stationsMapRef.current.set(station.id, station);

        const hexColor = getStationCategoryColor(station);
        const markerColor = Cesium.Color.fromCssColorString(hexColor);

        ds.entities.add({
          id: `${RADIO_MARKER_PREFIX}${station.id}`,
          name: station.name,
          position: Cesium.Cartesian3.fromDegrees(station.lon, station.lat, 50),
          point: {
            pixelSize: 8,
            color: markerColor,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            disableDepthTestDistance: 5000000,
          },
          label: {
            text: station.name.length > 22 ? `${station.name.slice(0, 20)}...` : station.name,
            font: '10px monospace',
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -12),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3500000),
            disableDepthTestDistance: 5000000,
          },
          properties: {
            station,
            _layerType: 'radio',
          },
        });
      });

      setLayerData('radio', stations, {
        sourceName: 'Radio Browser / Open Stream Directory',
        status: 'active',
        timestamp: payload.timestamp || Date.now(),
      });
      setLayerStatus('radio', 'active');
    } catch {
      setLayerStatus('radio', 'error');
    }
  }, [enabled, setLayerData, setLayerStatus]);

  useEffect(() => {
    if (!enabled) {
      if (dataSourceRef.current) {
        dataSourceRef.current.entities.removeAll();
      }
      return;
    }
    loadStations();
  }, [enabled, loadStations]);

  return null;
}
