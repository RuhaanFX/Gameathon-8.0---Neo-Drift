/**
 * Procedural Web Audio Engine for NEO DRIFT 2088
 * Provides dynamic vehicle audio, ambient synth sound effects,
 * and procedural chill synthwave/lofi radio stations without external MP3 files.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private musicFilterNode: BiquadFilterNode | null = null;

  // Soundscape audio nodes
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private tireGain: GainNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;
  private acidRainGain: GainNode | null = null;
  private shieldHumGain: GainNode | null = null;

  // Volumes
  private masterVolume = 0.8;
  private musicVolume = 0.55;
  private sfxVolume = 0.75;
  private ambienceVolume = 0.5;
  private isPaused = false;

  // Engine synth
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  // Radio music generator state
  private radioStationIndex = 0;
  private isRadioPlaying = true;
  private radioStep = 0;
  private radioIntervalId: number | null = null;
  private currentTrackName = 'Midnight Glow';
  private muted = false;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.setValueAtTime(this.ambienceVolume, this.ctx.currentTime);
      this.ambienceGain.connect(this.masterGain);

      // Music runs through a lowpass filter so we can create a cozy muffled lofi sound on pause!
      this.musicFilterNode = this.ctx.createBiquadFilter();
      this.musicFilterNode.type = 'lowpass';
      this.musicFilterNode.frequency.setValueAtTime(20000, this.ctx.currentTime);
      this.musicFilterNode.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.musicFilterNode);

      this.initEngineSynth();
      this.initAtmosphericSoundscapes();
      this.startRadio();
    } catch {
      // AudioContext unavailable or blocked until user gesture
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  // Volume Control Accessors
  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.04);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx && this.isRadioPlaying) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.04);
    }
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.04);
    }
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setAmbienceVolume(vol: number) {
    this.ambienceVolume = Math.max(0, Math.min(1, vol));
    if (this.ambienceGain && this.ctx) {
      this.ambienceGain.gain.setTargetAtTime(this.ambienceVolume, this.ctx.currentTime, 0.04);
    }
  }

  public getAmbienceVolume(): number {
    return this.ambienceVolume;
  }

  // --- Dynamic Vehicle Engine Sound ---
  private initEngineSynth() {
    if (!this.ctx || !this.sfxGain) return;

    // Dual oscillator engine with lowpass filter
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineGain = this.ctx.createGain();

    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';

    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);
    this.engineOsc2.frequency.setValueAtTime(45.5, this.ctx.currentTime);

    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

    this.engineGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  // --- Atmospheric Soundscapes (Wind, Tire Friction, Acid Rain Hiss, Shield Hum) ---
  private initAtmosphericSoundscapes() {
    if (!this.ctx || !this.ambienceGain || !this.sfxGain) return;

    try {
      // 1. Desert Wasteland Wind (Looping filtered pink/brown noise with slow LFO)
      const windBufferSize = this.ctx.sampleRate * 2.5;
      const windBuffer = this.ctx.createBuffer(1, windBufferSize, this.ctx.sampleRate);
      const windData = windBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < windBufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        windData[i] = (b0 + b1 + b2) * 0.18;
      }

      const windSource = this.ctx.createBufferSource();
      windSource.buffer = windBuffer;
      windSource.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'lowpass';
      this.windFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

      windSource.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.ambienceGain);
      windSource.start();

      // 2. Off-Road Sand & Gravel Tire Friction Loop
      const tireBufferSize = this.ctx.sampleRate * 1.5;
      const tireBuffer = this.ctx.createBuffer(1, tireBufferSize, this.ctx.sampleRate);
      const tireData = tireBuffer.getChannelData(0);
      for (let i = 0; i < tireBufferSize; i++) {
        tireData[i] = (Math.random() * 2 - 1) * 0.35;
      }

      const tireSource = this.ctx.createBufferSource();
      tireSource.buffer = tireBuffer;
      tireSource.loop = true;

      this.tireFilter = this.ctx.createBiquadFilter();
      this.tireFilter.type = 'bandpass';
      this.tireFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
      this.tireFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);

      this.tireGain = this.ctx.createGain();
      this.tireGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

      tireSource.connect(this.tireFilter);
      this.tireFilter.connect(this.tireGain);
      this.tireGain.connect(this.sfxGain);
      tireSource.start();

      // 3. Continuous Caustic Acid Rain Patter / Sizzle Loop
      const rainBufferSize = this.ctx.sampleRate * 2.0;
      const rainBuffer = this.ctx.createBuffer(1, rainBufferSize, this.ctx.sampleRate);
      const rainData = rainBuffer.getChannelData(0);
      for (let i = 0; i < rainBufferSize; i++) {
        rainData[i] = (Math.random() * 2 - 1) * 0.25;
      }

      const rainSource = this.ctx.createBufferSource();
      rainSource.buffer = rainBuffer;
      rainSource.loop = true;

      const rainFilter = this.ctx.createBiquadFilter();
      rainFilter.type = 'highpass';
      rainFilter.frequency.setValueAtTime(3600, this.ctx.currentTime);

      this.acidRainGain = this.ctx.createGain();
      this.acidRainGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      rainSource.connect(rainFilter);
      rainFilter.connect(this.acidRainGain);
      this.acidRainGain.connect(this.ambienceGain);
      rainSource.start();

      // 4. Forcefield Canopy Shield Resonance Hum
      const humOsc1 = this.ctx.createOscillator();
      const humOsc2 = this.ctx.createOscillator();
      humOsc1.type = 'sine';
      humOsc2.type = 'triangle';
      humOsc1.frequency.setValueAtTime(74, this.ctx.currentTime);
      humOsc2.frequency.setValueAtTime(148, this.ctx.currentTime);

      const humFilter = this.ctx.createBiquadFilter();
      humFilter.type = 'lowpass';
      humFilter.frequency.setValueAtTime(350, this.ctx.currentTime);

      this.shieldHumGain = this.ctx.createGain();
      this.shieldHumGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      humOsc1.connect(humFilter);
      humOsc2.connect(humFilter);
      humFilter.connect(this.shieldHumGain);
      this.shieldHumGain.connect(this.sfxGain);

      humOsc1.start();
      humOsc2.start();
    } catch {
      // Audio buffer creation caught
    }
  }

  // Dynamic Tire / Sand Drift Soundscape
  public updateTireFriction(speedRatio: number, isDrifting: boolean = false) {
    if (!this.ctx || !this.tireGain || !this.tireFilter || this.isPaused) return;
    const now = this.ctx.currentTime;
    if (speedRatio < 0.03) {
      this.tireGain.gain.setTargetAtTime(0.0001, now, 0.08);
    } else {
      const targetGain = Math.min(0.28, speedRatio * 0.12 + (isDrifting ? 0.14 : 0));
      const targetFreq = 500 + speedRatio * 900 + (isDrifting ? 450 : 0);
      this.tireGain.gain.setTargetAtTime(targetGain, now, 0.05);
      this.tireFilter.frequency.setTargetAtTime(targetFreq, now, 0.05);
    }
  }

  // Dynamic Wasteland Wind Soundscape
  public updateWind(speedRatio: number) {
    if (!this.ctx || !this.windGain || !this.windFilter || this.isPaused) return;
    const now = this.ctx.currentTime;
    const targetGain = 0.05 + speedRatio * 0.16;
    const targetFreq = 280 + speedRatio * 520;
    this.windGain.gain.setTargetAtTime(targetGain, now, 0.1);
    this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.1);
  }

  // Acid Rain Continuous Caustic Ambience
  public setAcidRainActive(active: boolean) {
    if (!this.ctx || !this.acidRainGain) return;
    const now = this.ctx.currentTime;
    this.acidRainGain.gain.setTargetAtTime(active ? 0.15 : 0.0001, now, 0.35);
  }

  // Canopy Shield Forcefield Hum
  public setShieldHum(active: boolean) {
    if (!this.ctx || !this.shieldHumGain) return;
    const now = this.ctx.currentTime;
    this.shieldHumGain.gain.setTargetAtTime(active ? 0.14 : 0.0001, now, 0.2);
  }

  // Nomad Footstep Soundscape
  public playFootstep() {
    if (!this.ctx || !this.sfxGain || this.isPaused) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.055);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420 + Math.random() * 160, now);
    filter.Q.setValueAtTime(2.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  // Pause Mode Soundscape Filtering (Ducks engine & applies cozy lowpass muffle to radio)
  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (paused) {
      this.playPause();
      if (this.musicFilterNode) {
        this.musicFilterNode.frequency.setTargetAtTime(420, now, 0.12);
      }
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      }
      if (this.tireGain) {
        this.tireGain.gain.setTargetAtTime(0, now, 0.04);
      }
      if (this.windGain) {
        this.windGain.gain.setTargetAtTime(0.03, now, 0.1);
      }
    } else {
      this.playResume();
      if (this.musicFilterNode) {
        this.musicFilterNode.frequency.setTargetAtTime(20000, now, 0.12);
      }
    }
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public playMenuClick() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playPause() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [659.25, 523.25, 392.0]; // E5, C5, G4 descending cyber chord
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.16, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.22);
    });
  }

  public playResume() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [392.0, 523.25, 659.25, 783.99]; // G4, C5, E5, G5 ascending cyber chord
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.035);
      gain.gain.setValueAtTime(0.16, now + idx * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.035);
      osc.stop(now + idx * 0.035 + 0.2);
    });
  }

  public updateEnginePitch(speedRatio: number, throttle: boolean) {
    if (!this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return;
    const now = this.ctx.currentTime;
    const baseFreq = 40 + speedRatio * 85 + (throttle ? 12 : 0);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.01, now, 0.08);

    const filterFreq = 120 + speedRatio * 420 + (throttle ? 180 : 0);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);

    const targetGain = 0.08 + speedRatio * 0.14 + (throttle ? 0.08 : 0);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.1);
  }

  public playTurboBoost() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Turbo jet turbine whine surge
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.35);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.4);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  // --- Sound Effects ---
  public playEmpBlast() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Sub-bass thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);

    // High electrical discharge crackle
    const zapOsc = this.ctx.createOscillator();
    const zapGain = this.ctx.createGain();
    zapOsc.type = 'sawtooth';
    zapOsc.frequency.setValueAtTime(800, now);
    zapOsc.frequency.exponentialRampToValueAtTime(100, now + 0.25);

    zapGain.gain.setValueAtTime(0.3, now);
    zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    zapOsc.connect(zapGain);
    zapGain.connect(this.sfxGain);
    zapOsc.start(now);
    zapOsc.stop(now + 0.3);
  }

  public playScrapChime() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

    frequencies.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.18, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.25);
    });
  }

  public playEnemyExplosion() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Noise burst simulation
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  public playRepairSound() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Metallic ratchet clicks
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(900 + i * 200, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.07);
    }
  }

  public playAlertBeep() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.setValueAtTime(740, now + 0.1); // F#5

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playCityFanfare() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [392, 523.25, 659.25, 783.99, 1046.5]; // G4, C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      gain.gain.setValueAtTime(0.22, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.5);
    });
  }

  public playUpgradeFanfare() {
    this.playCityFanfare();
  }

  public playBlasterSound() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  // --- Procedural Radio Stations ---
  public getStations() {
    return [
      { id: 'lofi', name: 'K-NEON LOFI CHILL', desc: 'Warm Rhodes chords & slow mellow bass', bpm: 72 },
      { id: 'synthwave', name: 'CYBER DUST SYNTH', desc: 'Arpeggiated basslines & 80s dusk pads', bpm: 98 },
      { id: 'ambient', name: 'WASTELAND BREEZE', desc: 'Ethereal floating echoes & warm serenity', bpm: 60 },
    ];
  }

  public getStationIndex(): number {
    return this.radioStationIndex;
  }

  public getCurrentTrackName(): string {
    return this.currentTrackName;
  }

  public toggleRadio(): boolean {
    this.isRadioPlaying = !this.isRadioPlaying;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.isRadioPlaying ? this.musicVolume : 0, this.ctx.currentTime, 0.2);
    }
    return this.isRadioPlaying;
  }

  public setRadioMuted(muted: boolean) {
    this.isRadioPlaying = !muted;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.isRadioPlaying ? this.musicVolume : 0, this.ctx.currentTime, 0.2);
    }
  }

  public isRadioOn(): boolean {
    return this.isRadioPlaying;
  }

  public cycleStation(): string {
    this.playStaticBurst();
    this.radioStationIndex = (this.radioStationIndex + 1) % 3;
    const trackNames = [
      ['Midnight Glow', 'Rain on Glass', 'Coffee in Shinjuku', 'Neon Dusk'],
      ['Outrun the Storm', 'Highway 2088', 'Gridrunner', 'Chrome Skyline'],
      ['Desert Mirage', 'Echoes of Eden', 'Quiet Monolith', 'Aurora Drift'],
    ];
    const tracks = trackNames[this.radioStationIndex];
    this.currentTrackName = tracks[Math.floor(Math.random() * tracks.length)];
    this.radioStep = 0;
    const stations = this.getStations();
    return stations[this.radioStationIndex].name;
  }

  public setStation(index: number): string {
    this.playStaticBurst();
    this.radioStationIndex = Math.max(0, Math.min(2, index));
    const trackNames = [
      ['Midnight Glow', 'Rain on Glass', 'Coffee in Shinjuku', 'Neon Dusk'],
      ['Outrun the Storm', 'Highway 2088', 'Gridrunner', 'Chrome Skyline'],
      ['Desert Mirage', 'Echoes of Eden', 'Quiet Monolith', 'Aurora Drift'],
    ];
    const tracks = trackNames[this.radioStationIndex];
    this.currentTrackName = tracks[Math.floor(Math.random() * tracks.length)];
    this.radioStep = 0;
    const stations = this.getStations();
    return stations[this.radioStationIndex].name;
  }

  private playStaticBurst() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  private startRadio() {
    if (this.radioIntervalId) {
      clearInterval(this.radioIntervalId);
    }

    // Step clock for procedural musical bars
    this.radioIntervalId = window.setInterval(() => {
      if (!this.ctx || !this.isRadioPlaying || !this.musicGain) return;
      this.stepMusic();
    }, 280);
  }

  private stepMusic() {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.radioStep = (this.radioStep + 1) % 16;

    if (this.radioStationIndex === 0) {
      // LOFI CHILL (Chords + subtle kick/rim)
      // Chord progressions: Cmaj7 -> Am7 -> Dm7 -> G7
      const chords = [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [293.66, 349.23, 440.00, 523.25], // Dm7
        [196.00, 246.94, 293.66, 349.23], // G7
      ];
      const chordIndex = Math.floor(this.radioStep / 4);

      if (this.radioStep % 4 === 0) {
        // Trigger warm chord pad
        const currentChord = chords[chordIndex % chords.length];
        currentChord.forEach((note) => {
          this.playLofiNote(note, now, 1.1);
        });
      }

      // Soft kick on beat 0 and 8, mellow hihat on 4, 12
      if (this.radioStep === 0 || this.radioStep === 8) {
        this.playSoftKick(now);
      }
      if (this.radioStep % 2 === 0) {
        this.playSoftHat(now);
      }
    } else if (this.radioStationIndex === 1) {
      // SYNTHWAVE 88 (Arpeggiated rolling bass + synth lead)
      const bassNotes = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
      const bassNote = bassNotes[this.radioStep % bassNotes.length];
      this.playSynthBass(bassNote, now);

      if (this.radioStep === 0 || this.radioStep === 8) {
        this.playSynthKick(now);
      }
      if (this.radioStep === 4 || this.radioStep === 12) {
        this.playSynthSnare(now);
      }

      // Melodic flourish
      if (this.radioStep % 4 === 2) {
        const leadNotes = [440, 523.25, 659.25, 587.33];
        this.playSynthLead(leadNotes[(this.radioStep / 2) % leadNotes.length], now);
      }
    } else {
      // WASTELAND BREEZE (Ambient meditative floating pads)
      if (this.radioStep % 8 === 0) {
        const droneNotes = [130.81, 164.81, 196.00, 246.94]; // C3, E3, G3, B3
        const note = droneNotes[(this.radioStep / 8) % droneNotes.length];
        this.playAmbientBell(note * 2, now);
        this.playAmbientBell(note * 3, now + 0.1);
      }
    }
  }

  private playLofiNote(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.06, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private playSoftKick(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.14);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.16);
  }

  private playSoftHat(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(4000, time);

    gain.gain.setValueAtTime(0.03, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  private playSynthBass(freq: number, time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + 0.2);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.24);
  }

  private playSynthKick(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.2);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.24);
  }

  private playSynthSnare(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, time);

    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  private playSynthLead(freq: number, time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.32);
  }

  private playAmbientBell(freq: number, time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.05, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.8);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 1.9);
  }

  // --- Cyberware & Cyberdeck Audio Synthesizers ---
  public playScannerPing() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.28);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(4.0, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playShieldEngage() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1800, now + 0.35);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.48);
  }

  public playShieldPowerDown() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.4);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.48);
  }

  public playCyberdeckBeep(pitch: number = 880) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.setValueAtTime(pitch * 1.5, now + 0.025);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playBreachSuccess() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 triumph arpeggio

    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + i * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  public playBreachFail() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.setValueAtTime(95, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playCyberwareInstall() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Pneumatic clamp
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(400, now);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noiseSource.start(now);

    // High tech chime
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.32);

    gain.gain.setValueAtTime(0.18, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now + 0.08);
    osc.stop(now + 0.48);
  }

  // --- Collision & Environmental Hazards Audio ---
  public playCrash(speedRatio: number = 0.5) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const intensity = Math.min(1.0, Math.max(0.2, speedRatio));

    // 1. Heavy low impact thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.28);

    gain.gain.setValueAtTime(0.55 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);

    // 2. Metallic crunch noise burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.2);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4 * intensity, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  public playAcidSizzle() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.3);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3200, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  public playLightningThunder() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // High electrical snap
    const zapOsc = this.ctx.createOscillator();
    const zapGain = this.ctx.createGain();
    zapOsc.type = 'sawtooth';
    zapOsc.frequency.setValueAtTime(2400, now);
    zapOsc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

    zapGain.gain.setValueAtTime(0.35, now);
    zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    zapOsc.connect(zapGain);
    zapGain.connect(this.sfxGain);
    zapOsc.start(now);
    zapOsc.stop(now + 0.15);

    // Deep distant thunder rumble
    const thunderOsc = this.ctx.createOscillator();
    const thunderGain = this.ctx.createGain();
    thunderOsc.type = 'sine';
    thunderOsc.frequency.setValueAtTime(75, now + 0.05);
    thunderOsc.frequency.exponentialRampToValueAtTime(20, now + 1.2);

    thunderGain.gain.setValueAtTime(0.01, now);
    thunderGain.gain.linearRampToValueAtTime(0.4, now + 0.15);
    thunderGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    thunderOsc.connect(thunderGain);
    thunderGain.connect(this.sfxGain);
    thunderOsc.start(now + 0.05);
    thunderOsc.stop(now + 1.35);
  }

  public playIonSurge() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Upward warp sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(1480, now + 0.45);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + 0.45);
    filter.Q.setValueAtTime(5, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.52);

    // Chime chord of power (Emaj7)
    const chord = [329.63, 415.30, 493.88, 659.25, 987.77];
    chord.forEach((freq, idx) => {
      const cOsc = this.ctx!.createOscillator();
      const cGain = this.ctx!.createGain();
      cOsc.type = 'sine';
      cOsc.frequency.setValueAtTime(freq, now + 0.1 + idx * 0.04);

      cGain.gain.setValueAtTime(0.18, now + 0.1 + idx * 0.04);
      cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      cOsc.connect(cGain);
      cGain.connect(this.sfxGain!);
      cOsc.start(now + 0.1 + idx * 0.04);
      cOsc.stop(now + 0.85);
    });
  }

  public dispose() {
    if (this.radioIntervalId) {
      clearInterval(this.radioIntervalId);
      this.radioIntervalId = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const audioEngine = new AudioEngine();
