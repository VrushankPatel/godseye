import React, { useEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';

const VEHICLE_VIEWS = [
  { id: 'CHASE', label: 'Chase' },
  { id: 'TOP', label: 'Top-Down' },
  { id: 'SIDE', label: 'Side' },
  { id: 'CINEMATIC', label: 'Drone' },
];

export default function VehicleDashboard({ vehicle }) {
  const trackedTarget = useStore((s) => s.trackedTarget);
  const toggleTrackedTarget = useStore((s) => s.toggleTrackedTarget);
  const trackingView = useStore((s) => s.trackingView);
  const setTrackingView = useStore((s) => s.setTrackingView);

  const canvasRef = useRef(null);
  const [liveSpeed, setLiveSpeed] = useState(vehicle.speedKmh || 50);
  const [liveHeading, setLiveHeading] = useState(vehicle.headingDeg || 0);

  const isTracked = trackedTarget?.entityId === vehicle._entityId;

  // Listen to live telemetry updates for the selected vehicle
  useEffect(() => {
    const handleVehicleUpdate = (e) => {
      const data = e.detail;
      if (data && data.id === vehicle._entityId) {
        if (Number.isFinite(data.speedKmh)) setLiveSpeed(data.speedKmh);
        if (Number.isFinite(data.headingDeg)) setLiveHeading(data.headingDeg);
      }
    };
    window.addEventListener('godseye:vehicle-telemetry', handleVehicleUpdate);
    return () => window.removeEventListener('godseye:vehicle-telemetry', handleVehicleUpdate);
  }, [vehicle._entityId]);

  // Animated LiDAR Forward Road Scanner
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = null;
    let offset = 0;

    const renderScanner = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Background grid
      ctx.fillStyle = 'rgba(5, 12, 8, 0.85)';
      ctx.fillRect(0, 0, w, h);

      // LiDAR radar sweep fan
      const horizonY = h * 0.35;
      const centerX = w * 0.5;

      // Draw perspective road
      ctx.beginPath();
      ctx.moveTo(centerX - 15, horizonY);
      ctx.lineTo(centerX + 15, horizonY);
      ctx.lineTo(w * 0.9, h);
      ctx.lineTo(w * 0.1, h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 255, 150, 0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 255, 150, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Moving lane dividers
      offset = (offset + (liveSpeed > 0 ? liveSpeed * 0.05 : 0.4)) % 30;
      ctx.strokeStyle = 'rgba(0, 255, 200, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 18]);
      ctx.lineDashOffset = -offset;

      ctx.beginPath();
      ctx.moveTo(centerX, horizonY);
      ctx.lineTo(centerX, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Radar sweep fan
      ctx.beginPath();
      ctx.moveTo(centerX, h - 5);
      ctx.arc(centerX, h - 5, h * 0.85, Math.PI * 1.15, Math.PI * 1.85);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 220, 255, 0.04)';
      ctx.fill();

      // Forward sensor reticle
      ctx.strokeStyle = 'rgba(0, 255, 150, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, h * 0.65, 10, 0, Math.PI * 2);
      ctx.stroke();

      // Vehicle lead indicator
      ctx.fillStyle = liveSpeed > 20 ? '#00ff95' : '#ffaa00';
      ctx.fillRect(centerX - 12, h - 22, 24, 16);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(centerX - 12, h - 22, 24, 16);

      // LiDAR Distance markers
      ctx.fillStyle = 'rgba(0, 255, 150, 0.6)';
      ctx.font = '8px monospace';
      ctx.fillText('RADAR 120m', 8, 14);
      ctx.fillText('LIDAR ACTIVE', w - 65, 14);

      animId = requestAnimationFrame(renderScanner);
    };

    animId = requestAnimationFrame(renderScanner);
    return () => cancelAnimationFrame(animId);
  }, [liveSpeed]);

  const handleToggleTrack = () => {
    if (!isTracked) {
      setTrackingView('CHASE');
    }
    toggleTrackedTarget({
      entityId: vehicle._entityId,
      type: 'traffic',
      label: vehicle.name,
    });
  };

  const speedMph = Math.round(liveSpeed * 0.621371);
  const flowColor = liveSpeed > 45 ? 'text-emerald-400' : (liveSpeed > 20 ? 'text-amber-400' : 'text-red-400');
  const flowBg = liveSpeed > 45 ? 'bg-emerald-500/10 border-emerald-500/30' : (liveSpeed > 20 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30');

  return (
    <div className="flex flex-col gap-3 font-mono">
      {/* 1. Camera Tracking & Chase Control Banner */}
      <div className="flex flex-col gap-2 p-2.5 rounded border border-white/10 bg-black/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isTracked ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />
            <span className="text-[11px] font-semibold text-white tracking-wider">
              {isTracked ? 'CAMERA TRACKING VEHICLE' : 'CHASE CAMERA STANDBY'}
            </span>
          </div>
          <span className="text-[9px] text-white/50">{vehicle.plate}</span>
        </div>

        {/* View mode buttons */}
        <div className="grid grid-cols-4 gap-1">
          {VEHICLE_VIEWS.map((v) => {
            const active = isTracked && trackingView === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setTrackingView(v.id);
                  if (!isTracked) handleToggleTrack();
                }}
                className={`text-[10px] py-1 px-1.5 rounded transition-all text-center ${
                  active
                    ? 'bg-electric-blue text-black font-bold shadow-[0_0_10px_rgba(0,180,255,0.6)]'
                    : 'bg-white/5 hover:bg-white/15 text-white/80'
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>

        {/* Lock/Disengage toggle button */}
        <button
          type="button"
          onClick={handleToggleTrack}
          className={`w-full py-1.5 rounded text-[11px] font-bold tracking-widest uppercase transition-all ${
            isTracked
              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(0,255,150,0.2)]'
          }`}
        >
          {isTracked ? 'DISENGAGE CHASE CAMERA' : 'FOLLOW VEHICLE ON MAP'}
        </button>
      </div>

      {/* 2. Forward LiDAR Radar View */}
      <div className="relative rounded overflow-hidden border border-white/10 shadow-inner">
        <canvas
          ref={canvasRef}
          width={320}
          height={130}
          className="w-full h-[130px] block"
        />
        <div className="absolute bottom-1.5 left-2 text-[9px] text-emerald-300/80 bg-black/60 px-1.5 py-0.5 rounded">
          COMPASS: {String(liveHeading).padStart(3, '0')}°
        </div>
        <div className="absolute bottom-1.5 right-2 text-[9px] text-white/70 bg-black/60 px-1.5 py-0.5 rounded">
          {vehicle.driverMode?.slice(0, 20)}
        </div>
      </div>

      {/* 3. Speedometer & Congestion Meter */}
      <div className="grid grid-cols-2 gap-2">
        {/* Speed Dial Card */}
        <div className="p-2 rounded bg-black/30 border border-white/10 flex flex-col items-center justify-center">
          <div className="text-[9px] text-white/50 tracking-widest uppercase">Live Velocity</div>
          <div className="flex items-baseline gap-1 my-0.5">
            <span className={`text-2xl font-bold font-mono tracking-tight ${flowColor}`}>
              {liveSpeed}
            </span>
            <span className="text-[10px] text-white/60">KM/H</span>
          </div>
          <div className="text-[10px] text-white/40">{speedMph} MPH</div>
        </div>

        {/* Traffic Flow Status Card */}
        <div className={`p-2 rounded border flex flex-col justify-center ${flowBg}`}>
          <div className="text-[9px] text-white/50 tracking-widest uppercase">Corridor Flow</div>
          <div className={`text-xs font-bold my-0.5 tracking-wider truncate ${flowColor}`}>
            {vehicle.flowStatus}
          </div>
          <div className="text-[10px] text-white/60">
            INDEX: {vehicle.flowLevel}% RATING
          </div>
        </div>
      </div>

      {/* 4. Full Telemetry Attributes */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 p-2.5 rounded bg-black/30 border border-white/10 text-[10px]">
        <div>
          <div className="text-white/40 uppercase tracking-widest text-[8px]">Category</div>
          <div className="text-white/90 truncate">{vehicle.vehicleCategory}</div>
        </div>
        <div>
          <div className="text-white/40 uppercase tracking-widest text-[8px]">Make / Model</div>
          <div className="text-white/90 truncate">{vehicle.model}</div>
        </div>
        <div>
          <div className="text-white/40 uppercase tracking-widest text-[8px]">Power Storage</div>
          <div className="text-emerald-300 font-semibold">{vehicle.batteryFuel}</div>
        </div>
        <div>
          <div className="text-white/40 uppercase tracking-widest text-[8px]">Drive Mode</div>
          <div className="text-white/90 truncate">{vehicle.driverMode}</div>
        </div>
        <div>
          <div className="text-white/40 uppercase tracking-widest text-[8px]">Roadway</div>
          <div className="text-white/90 truncate">{vehicle.roadName}</div>
        </div>
        <div>
          <div className="text-white/40 uppercase tracking-widest text-[8px]">Assigned Destination</div>
          <div className="text-electric-blue truncate">{vehicle.destination}</div>
        </div>
      </div>
    </div>
  );
}
