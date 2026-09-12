/**
 * Radio Audio Engine & Synthetic Analog Static Generator
 * Provides seamless HTML5 audio streaming and real-time Web Audio API
 * analog AM/FM static noise synthesis during tuning gestures.
 */

class RadioAudioEngine {
  constructor() {
    this._audio = null;
    this._currentStation = null;
    this._statusCallback = null;
    this._volume = 0.8;
    this._isMuted = false;

    // Web Audio API Static Synth
    this._audioCtx = null;
    this._staticSource = null;
    this._staticFilter = null;
    this._staticGain = null;
    this._isTuning = false;
  }

  initAudioContext() {
    if (this._audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      this._audioCtx = new AudioContextClass();
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  _startStaticSynth() {
    if (!this._audioCtx) this.initAudioContext();
    if (!this._audioCtx) return;

    if (this._audioCtx.state === 'suspended') {
      this._audioCtx.resume().catch(() => {});
    }

    if (this._staticSource) return;

    try {
      // 0.75s loop of white noise
      const bufferSize = Math.max(1, Math.floor(this._audioCtx.sampleRate * 0.75));
      const buffer = this._audioCtx.createBuffer(1, bufferSize, this._audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this._staticSource = this._audioCtx.createBufferSource();
      this._staticSource.buffer = buffer;
      this._staticSource.loop = true;

      // Bandpass filter to simulate analog receiver RF white noise
      this._staticFilter = this._audioCtx.createBiquadFilter();
      this._staticFilter.type = 'bandpass';
      this._staticFilter.frequency.value = 1650;
      this._staticFilter.Q.value = 0.6;

      this._staticGain = this._audioCtx.createGain();
      this._staticGain.gain.value = 0;

      this._staticSource.connect(this._staticFilter);
      this._staticFilter.connect(this._staticGain);
      this._staticGain.connect(this._audioCtx.destination);
      this._staticSource.start();
    } catch {
      // Ignore synth initialization errors
    }
  }

  setTuningActive(active, intensity = 1.0) {
    this._isTuning = active;
    if (active) {
      this._startStaticSynth();
    }

    if (!this._audioCtx || !this._staticGain) return;

    try {
      const now = this._audioCtx.currentTime;
      const effectiveGain = active && !this._isMuted
        ? Math.min(0.04, this._volume * 0.035 * intensity)
        : 0;

      this._staticGain.gain.cancelScheduledValues(now);
      this._staticGain.gain.setValueAtTime(this._staticGain.gain.value, now);
      this._staticGain.gain.linearRampToValueAtTime(effectiveGain, now + 0.03);
    } catch {
      // Ignore audio parameter scheduling errors
    }
  }

  onStatusChange(cb) {
    this._statusCallback = cb;
  }

  _notify(status, error = null) {
    if (typeof this._statusCallback === 'function') {
      this._statusCallback({
        status,
        error,
        station: this._currentStation,
      });
    }
  }

  playStation(station, useFallback = false) {
    if (!station) return;
    this.initAudioContext();
    this.stopTuningNoise();

    if (this._audio) {
      try {
        this._audio.pause();
        this._audio.removeAttribute('src');
        this._audio.load();
      } catch {
        // Safe tear down
      }
      this._audio = null;
    }

    this._currentStation = station;
    const streamUrl = (useFallback && station.fallbackStreamUrl)
      ? station.fallbackStreamUrl
      : station.streamUrl;

    if (!streamUrl) {
      this._notify('error', 'Station stream URL unavailable');
      return;
    }

    this._notify('buffering');

    const audio = new Audio();
    this._audio = audio;
    audio.preload = 'none';
    audio.volume = this._isMuted ? 0 : this._volume;
    audio.src = streamUrl;

    audio.addEventListener('playing', () => {
      if (this._audio !== audio) return;
      this._notify('playing');
    });

    audio.addEventListener('waiting', () => {
      if (this._audio !== audio) return;
      this._notify('buffering');
    });

    audio.addEventListener('pause', () => {
      if (this._audio !== audio) return;
      this._notify('stopped');
    });

    audio.addEventListener('error', () => {
      if (this._audio !== audio) return;
      if (!useFallback && station.fallbackStreamUrl) {
        // Attempt fallback stream
        this.playStation(station, true);
        return;
      }
      this._notify('error', 'Live stream unavailable or blocked by broadcaster');
    });

    audio.play().catch(() => {
      if (this._audio === audio) {
        this._notify('error', 'Playback blocked by browser autoplay policy');
      }
    });

    // Notify upstream of station click
    if (station.id) {
      fetch(`/api/radio/click/${encodeURIComponent(station.id)}`, { method: 'POST' }).catch(() => {});
    }
  }

  pause() {
    if (this._audio) {
      try {
        this._audio.pause();
      } catch {
        // Ignore
      }
    }
    this._notify('stopped');
  }

  stop() {
    if (this._audio) {
      try {
        this._audio.pause();
        this._audio.removeAttribute('src');
        this._audio.load();
      } catch {
        // Ignore
      }
      this._audio = null;
    }
    this.stopTuningNoise();
    this._notify('stopped');
  }

  stopTuningNoise() {
    this.setTuningActive(false);
  }

  setVolume(fraction) {
    this._volume = Math.max(0, Math.min(1, Number(fraction) || 0));
    if (this._audio) {
      this._audio.volume = this._isMuted ? 0 : this._volume;
    }
    if (this._isTuning) {
      this.setTuningActive(true);
    }
  }

  setMuted(muted) {
    this._isMuted = Boolean(muted);
    if (this._audio) {
      this._audio.volume = this._isMuted ? 0 : this._volume;
    }
    if (this._isTuning) {
      this.setTuningActive(!this._isMuted);
    }
  }

  getVolume() {
    return this._volume;
  }

  isMuted() {
    return this._isMuted;
  }
}

export const radioAudio = new RadioAudioEngine();
