import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import useStore from '../store/useStore';
import { fetchRadioStations, buildRadioTunerTicks, COMMON_GENRE_TAGS } from '../services/radioService';
import { radioAudio } from '../services/radioAudio';

const POPULAR_COUNTRIES = [
  { code: 'all', name: 'Worldwide / All Regions' },
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'JP', name: 'Japan' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'BR', name: 'Brazil' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
];

export default function RadioTuner() {
  const radioTunerOpen = useStore((s) => s.radioTunerOpen);
  const toggleRadioTuner = useStore((s) => s.toggleRadioTuner);
  const setRadioTunerOpen = useStore((s) => s.setRadioTunerOpen);
  const activeStation = useStore((s) => s.radioActiveStation);
  const setRadioActiveStation = useStore((s) => s.setRadioActiveStation);
  const playbackStatus = useStore((s) => s.radioPlaybackStatus);
  const setRadioPlaybackStatus = useStore((s) => s.setRadioPlaybackStatus);
  const volume = useStore((s) => s.radioVolume);
  const setVolume = useStore((s) => s.setRadioVolume);
  const filterCountry = useStore((s) => s.radioFilterCountry);
  const setFilterCountry = useStore((s) => s.setRadioFilterCountry);
  const filterTag = useStore((s) => s.radioFilterTag);
  const setFilterTag = useStore((s) => s.setRadioFilterTag);

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [tunerCoordinate, setTunerCoordinate] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dialWidth, setDialWidth] = useState(360);
  const [isMuted, setIsMuted] = useState(false);

  const dialRef = useRef(null);
  const dragTimeoutRef = useRef(null);

  // Sync audio status
  useEffect(() => {
    radioAudio.onStatusChange(({ status, error, station }) => {
      setRadioPlaybackStatus(status);
      if (error) {
        setErrorMsg(error);
      } else {
        setErrorMsg(null);
      }
      if (station && (!activeStation || activeStation.id !== station.id)) {
        setRadioActiveStation(station);
      }
    });
  }, [activeStation, setRadioActiveStation, setRadioPlaybackStatus]);

  // Load catalog when filter changes
  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetchRadioStations({
          country: filterCountry,
          tag: filterTag,
          limit: 300,
        });
        if (!cancelled && Array.isArray(res.stations)) {
          setStations(res.stations);
          if (res.stations.length > 0) {
            // Find current station index or default to 0
            if (activeStation) {
              const idx = res.stations.findIndex((s) => s.id === activeStation.id);
              if (idx !== -1) {
                setTunerCoordinate(idx);
              } else {
                setTunerCoordinate(0);
              }
            }
          }
        }
      } catch (err) {
        if (!cancelled) setErrorMsg(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [filterCountry, filterTag, activeStation]);

  // Measure dial width
  useEffect(() => {
    if (!dialRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 50) {
          setDialWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(dialRef.current);
    return () => observer.disconnect();
  }, [radioTunerOpen]);

  // Calculate tuner tape ticks and needle position
  const tunerModel = useMemo(() => {
    return buildRadioTunerTicks(tunerCoordinate, stations.length, dialWidth, {
      insetPx: 10,
      minPitchPx: 16,
      speedFactor: 4.5,
      labelStep: 5,
    });
  }, [tunerCoordinate, stations.length, dialWidth]);

  // Tune to index
  const tuneToIndex = useCallback((index, autoPlay = true) => {
    if (!stations.length) return;
    const boundedIndex = Math.max(0, Math.min(stations.length - 1, Math.floor(index)));
    setTunerCoordinate(boundedIndex);
    const station = stations[boundedIndex];
    if (station) {
      setRadioActiveStation(station);
      if (autoPlay) {
        radioAudio.playStation(station);
      }
    }
  }, [stations, setRadioActiveStation]);

  // Slider change handler
  const handleSliderInput = (e) => {
    const val = parseFloat(e.target.value);
    setTunerCoordinate(val);

    // Play synthetic static noise while scrubbing
    radioAudio.setTuningActive(true, 1.2);
    setIsDragging(true);

    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    dragTimeoutRef.current = setTimeout(() => {
      radioAudio.setTuningActive(false);
      setIsDragging(false);
      tuneToIndex(Math.round(val), true);
    }, 280);
  };

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    radioAudio.setTuningActive(false);
    setIsDragging(false);
    tuneToIndex(Math.round(val), true);
  };

  const handlePrevStation = () => {
    const nextIdx = Math.max(0, Math.floor(tunerCoordinate) - 1);
    tuneToIndex(nextIdx, true);
  };

  const handleNextStation = () => {
    const nextIdx = Math.min(stations.length - 1, Math.floor(tunerCoordinate) + 1);
    tuneToIndex(nextIdx, true);
  };

  const handlePlayPause = () => {
    if (playbackStatus === 'playing') {
      radioAudio.pause();
    } else {
      if (activeStation) {
        radioAudio.playStation(activeStation);
      } else if (stations.length > 0) {
        tuneToIndex(Math.round(tunerCoordinate), true);
      }
    }
  };

  const handleStop = () => {
    radioAudio.stop();
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    radioAudio.setVolume(newVol);
    if (isMuted && newVol > 0) {
      setIsMuted(false);
      radioAudio.setMuted(false);
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    radioAudio.setMuted(next);
  };

  const currentStationIndex = Math.min(
    stations.length - 1,
    Math.max(0, Math.floor(tunerCoordinate + 0.5))
  );
  const currentStation = stations[currentStationIndex] || activeStation;

  return (
    <>
      {/* Floating Tactical Radio Toggle Pill */}
      <button
        onClick={toggleRadioTuner}
        className={`fixed z-30 bottom-6 right-6 px-3.5 py-2 rounded-lg font-mono text-[11px] tracking-wider transition-all flex items-center gap-2 backdrop-blur-md border ${
          radioTunerOpen
            ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
            : playbackStatus === 'playing'
            ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.35)] animate-pulse'
            : 'bg-black/75 border-cyan-800/60 text-cyan-400/80 hover:border-cyan-400 hover:text-cyan-200 shadow-lg'
        }`}
        title="Toggle Retro Radio Tuner"
      >
        <span className="text-base">📻</span>
        <span className="font-bold">WORLD RADIO</span>
        {playbackStatus === 'playing' && (
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        )}
      </button>

      {/* Retro Analog Radio Tuner Panel */}
      {radioTunerOpen && (
        <div className="fixed z-30 bottom-20 right-6 w-[430px] max-w-[calc(100vw-2rem)] rounded-xl border border-cyan-500/30 bg-[#020b10]/95 backdrop-blur-xl shadow-[0_0_30px_rgba(0,180,255,0.18)] text-cyan-100 font-mono text-xs overflow-hidden select-none animate-fadeIn">
          {/* Top Brass / Aluminum Bezel Bar */}
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/60 via-[#041a24] to-cyan-950/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#ff6f4f]" />
              <span className="font-bold tracking-[0.2em] text-cyan-300 text-[11px]">
                TACTICAL WORLD RADIO · TUNER-88
              </span>
            </div>
            <button
              onClick={() => setRadioTunerOpen(false)}
              className="text-cyan-400/60 hover:text-cyan-200 text-base leading-none px-1"
              title="Close Tuner"
            >
              ✕
            </button>
          </div>

          <div className="p-3.5 space-y-3">
            {/* Filter Row: Country & Genre */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <label className="text-cyan-400/60 block text-[9px] tracking-wider uppercase mb-1">
                  Region / Country
                </label>
                <select
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                  className="w-full bg-[#03151f] border border-cyan-500/30 rounded px-2 py-1 text-cyan-200 text-[11px] focus:outline-none focus:border-cyan-400"
                >
                  {POPULAR_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-cyan-400/60 block text-[9px] tracking-wider uppercase mb-1">
                  Station Genre
                </label>
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="w-full bg-[#03151f] border border-cyan-500/30 rounded px-2 py-1 text-cyan-200 text-[11px] focus:outline-none focus:border-cyan-400"
                >
                  {COMMON_GENRE_TAGS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Retro Analog Frequency Dial Chassis */}
            <div className="rounded-lg border border-cyan-400/40 bg-gradient-to-b from-[#01090d] to-[#04181e] p-2.5 shadow-[inset_0_0_20px_rgba(0,212,255,0.08)]">
              {/* Dial Header / Readout */}
              <div className="flex justify-between items-center text-[9px] tracking-widest text-cyan-400/80 mb-1 font-semibold uppercase">
                <span>DIRECTORY BAND · FM 88-108 MHz</span>
                <span className="text-cyan-200">
                  {stations.length > 0
                    ? `CH ${String(currentStationIndex + 1).padStart(2, '0')} / ${String(stations.length).padStart(2, '0')}`
                    : 'NO STATIONS'}
                </span>
              </div>

              {/* Dial Scale Window */}
              <div
                ref={dialRef}
                className={`relative w-full h-14 overflow-hidden border-y border-cyan-400/35 bg-[#021017] rounded ${
                  isDragging ? 'shadow-[inset_0_0_15px_rgba(255,111,79,0.2)]' : ''
                }`}
                style={{
                  backgroundImage: `
                    linear-gradient(180deg, transparent 26px, rgba(65, 220, 231, 0.8) 27px, transparent 28px, transparent 31px, rgba(65, 220, 231, 0.5) 32px, transparent 33px),
                    radial-gradient(ellipse at center, rgba(39, 177, 191, 0.15), transparent 75%)
                  `,
                }}
              >
                {/* Scale Ticks Tape */}
                <div className="absolute inset-0 pointer-events-none">
                  {tunerModel.ticks.map((tick) => (
                    <div
                      key={tick.stationIndex}
                      className={`absolute top-1.5 bottom-0 border-l transition-opacity ${
                        tick.current
                          ? 'border-cyan-200 text-cyan-100 font-bold opacity-100'
                          : 'border-cyan-400/35 text-cyan-400/60 opacity-80'
                      }`}
                      style={{
                        left: `${tick.xPx}px`,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      {tick.label && (
                        <span className="text-[9px] pl-1 select-none">
                          {tick.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Glowing Analog Orange Needle */}
                <div
                  className="absolute z-10 top-0.5 bottom-0.5 w-[3px] bg-[#ff6f4f] rounded-full pointer-events-none shadow-[0_0_6px_#ff6f4f,0_0_12px_rgba(255,111,79,0.8)] transition-all duration-75"
                  style={{
                    left: `${tunerModel.needleX}px`,
                    transform: 'translateX(-50%)',
                  }}
                />

                {/* Transparent Range Input Slider for Dragging/Scrubbing */}
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, stations.length - 1)}
                  step="0.05"
                  value={tunerCoordinate}
                  onInput={handleSliderInput}
                  onChange={handleSliderChange}
                  disabled={stations.length === 0}
                  className="absolute z-20 inset-0 w-full h-full opacity-0 cursor-ew-resize touch-none"
                  aria-label="Tune available radio stations"
                />
              </div>

              {/* Station Name & Snapping Note */}
              <div className="flex justify-between items-center text-[10px] tracking-wider text-cyan-300 font-semibold mt-1.5 px-0.5 truncate">
                <span className="truncate max-w-[260px] text-cyan-100">
                  {loading
                    ? 'ACQUIRING BROADCASTERS...'
                    : currentStation
                    ? currentStation.name
                    : 'NO STATION TUNED'}
                </span>
                <span className="text-[8px] text-cyan-500 tracking-normal shrink-0">
                  {isDragging ? '⚡ ANALOG STATIC ACTIVE' : 'DIAL TO TUNE'}
                </span>
              </div>
            </div>

            {/* Active Station Card & Signal Readout */}
            {currentStation && (
              <div className="bg-[#03151f]/90 border border-cyan-500/20 rounded p-2 text-[10px] space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="px-1.5 py-0.5 bg-cyan-900/60 border border-cyan-500/40 rounded text-[9px] text-cyan-200 font-bold">
                      {currentStation.countryCode || 'WORLD'}
                    </span>
                    <span className="text-text-dim truncate">
                      {currentStation.country}
                      {currentStation.state ? ` · ${currentStation.state}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-[9px]">
                    <span className="text-cyan-400">{currentStation.bitrate} KBPS</span>
                    <span className="text-cyan-500">[{currentStation.codec || 'MP3'}]</span>
                  </div>
                </div>

                {currentStation.tags && currentStation.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {currentStation.tags.slice(0, 5).map((tag, i) => (
                      <span
                        key={i}
                        className="px-1 py-0.2 bg-cyan-950/80 text-cyan-300 text-[8px] rounded border border-cyan-800/40"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Transport & Playback Controls */}
            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
              <button
                onClick={handlePrevStation}
                disabled={stations.length === 0}
                className="py-1.5 bg-[#041a24] hover:bg-cyan-900/50 border border-cyan-500/30 rounded font-bold text-[10px] tracking-wider text-cyan-300 hover:text-white transition-all disabled:opacity-40"
                title="Previous Station"
              >
                ◀ PREV
              </button>

              <button
                onClick={handlePlayPause}
                disabled={stations.length === 0}
                className={`py-1.5 rounded font-bold text-[10px] tracking-wider transition-all border ${
                  playbackStatus === 'playing'
                    ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : playbackStatus === 'buffering'
                    ? 'bg-amber-950/80 border-amber-400 text-amber-200 animate-pulse'
                    : 'bg-cyan-950/80 border-cyan-400 text-cyan-200 hover:bg-cyan-800/50'
                }`}
              >
                {playbackStatus === 'playing'
                  ? '❚❚ PAUSE'
                  : playbackStatus === 'buffering'
                  ? 'CONNECTING'
                  : '▶ PLAY'}
              </button>

              <button
                onClick={handleNextStation}
                disabled={stations.length === 0}
                className="py-1.5 bg-[#041a24] hover:bg-cyan-900/50 border border-cyan-500/30 rounded font-bold text-[10px] tracking-wider text-cyan-300 hover:text-white transition-all disabled:opacity-40"
                title="Next Station"
              >
                NEXT ▶
              </button>

              <button
                onClick={handleStop}
                disabled={playbackStatus === 'stopped'}
                className="py-1.5 bg-[#041a24] hover:bg-red-950/60 border border-cyan-500/30 hover:border-red-500/50 rounded font-bold text-[10px] tracking-wider text-cyan-300 hover:text-red-300 transition-all disabled:opacity-40"
                title="Stop Stream"
              >
                ⏹ STOP
              </button>
            </div>

            {/* Volume Control Row */}
            <div className="flex items-center gap-2 pt-1 text-[10px] text-cyan-400/80">
              <button
                onClick={handleToggleMute}
                className="text-xs hover:text-cyan-200 transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? '🔇' : '🔊'}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="flex-1 accent-cyan-400 h-1 bg-cyan-950 rounded cursor-pointer"
                aria-label="Volume slider"
              />
              <span className="w-8 text-right font-mono text-[9px] text-cyan-200">
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>

            {/* Status Footer */}
            <div className="flex justify-between items-center text-[9px] text-cyan-400/60 pt-1 border-t border-cyan-500/20">
              <span>
                STATUS:{' '}
                <strong
                  className={
                    playbackStatus === 'playing'
                      ? 'text-emerald-400'
                      : playbackStatus === 'buffering'
                      ? 'text-amber-400 animate-pulse'
                      : 'text-cyan-400/60'
                  }
                >
                  {playbackStatus.toUpperCase()}
                </strong>
                {errorMsg && <span className="text-red-400 ml-1">({errorMsg})</span>}
              </span>
              {currentStation?.homepage && (
                <a
                  href={currentStation.homepage}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-cyan-400 hover:text-cyan-200 underline truncate max-w-[120px]"
                >
                  STATION WEB
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
