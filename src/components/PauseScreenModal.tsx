import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  Compass,
  Shield,
  Zap,
  Fuel,
  Wrench,
  Disc,
  Eye,
  Camera,
  Keyboard,
  Cloud,
  CloudRain,
  CloudLightning,
  AlertTriangle,
  Wind,
} from 'lucide-react';
import {
  VehicleStats,
  VehicleUpgrades,
  WeatherType,
} from '../types/game';
import { CameraViewMode } from '../game/threeScene';
import { audioEngine } from '../audio/audioEngine';

interface PauseScreenModalProps {
  stats: VehicleStats;
  upgrades: VehicleUpgrades;
  currentCityName: string;
  distToNextCity: number;
  campaignChapterTitle: string;
  campaignObjective: string;
  cameraMode: CameraViewMode;
  currentWeather: WeatherType;
  currentStationName: string;
  currentTrackName: string;
  radioOn: boolean;
  onResume: () => void;
  onRestart: () => void;
  onCycleCamera: () => void;
  onSetCameraMode: (mode: CameraViewMode) => void;
  onCycleRadio: () => void;
  onSetRadioStation: (idx: number) => void;
  onToggleRadio: () => void;
  onCycleWeather: () => void;
}

export const PauseScreenModal: React.FC<PauseScreenModalProps> = ({
  stats,
  upgrades,
  currentCityName,
  distToNextCity,
  campaignChapterTitle,
  campaignObjective,
  cameraMode,
  currentWeather,
  currentStationName,
  currentTrackName,
  radioOn,
  onResume,
  onRestart,
  onSetCameraMode,
  onSetRadioStation,
  onToggleRadio,
  onCycleWeather,
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'controls' | 'vitals'>('audio');
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  // Live Volume States
  const [masterVol, setMasterVol] = useState(Math.round(audioEngine.getMasterVolume() * 100));
  const [ambienceVol, setAmbienceVol] = useState(Math.round(audioEngine.getAmbienceVolume() * 100));
  const [musicVol, setMusicVol] = useState(Math.round(audioEngine.getMusicVolume() * 100));
  const [sfxVol, setSfxVol] = useState(Math.round(audioEngine.getSfxVolume() * 100));

  // Handle ESC or P to resume immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        onResume();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onResume]);

  const handleMasterChange = (val: number) => {
    setMasterVol(val);
    audioEngine.setMasterVolume(val / 100);
  };

  const handleAmbienceChange = (val: number) => {
    setAmbienceVol(val);
    audioEngine.setAmbienceVolume(val / 100);
  };

  const handleMusicChange = (val: number) => {
    setMusicVol(val);
    audioEngine.setMusicVolume(val / 100);
  };

  const handleSfxChange = (val: number) => {
    setSfxVol(val);
    audioEngine.setSfxVolume(val / 100);
  };

  const stations = audioEngine.getStations();
  const currentStationIndex = audioEngine.getStationIndex();

  const healthPercent = Math.round((stats.health / stats.maxHealth) * 100);
  const fuelPercent = Math.round(stats.fuel);
  const batteryPercent = Math.round(stats.battery);
  const heatPercent = Math.round(stats.heat);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-lg select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900/95 border-2 border-cyan-500/50 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.25)] flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Animated Cyber Neon Top Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-amber-400 to-cyan-500 animate-pulse" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="font-cyber font-black text-lg tracking-wider text-slate-100 uppercase">
                SYSTEM STANDBY // PAUSED
              </span>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/60 text-cyan-300 font-bold">
                MULE 4X4
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              {campaignChapterTitle} · {distToNextCity.toFixed(2)} km to {currentCityName.toUpperCase()}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              onClick={() => {
                audioEngine.playMenuClick();
                onResume();
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-cyber font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>RESUME [ESC]</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => {
              audioEngine.playMenuClick();
              setActiveTab('audio');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-cyber font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'audio'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>SOUNDSCAPING & AUDIO</span>
          </button>

          <button
            onClick={() => {
              audioEngine.playMenuClick();
              setActiveTab('controls');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-cyber font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'controls'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>CONTROLS & CAMERA</span>
          </button>

          <button
            onClick={() => {
              audioEngine.playMenuClick();
              setActiveTab('vitals');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-cyber font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'vitals'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>EXPEDITION VITALS</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'audio' && (
            <div className="space-y-6">
              {/* Soundscape Sliders */}
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-cyber font-bold text-xs uppercase tracking-wider">
                    <Sliders className="w-4 h-4" />
                    <span>AUDIO MIXER & SOUNDSCAPE VOLUMES</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Web Audio Procedural Synthesis</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Master Volume */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                        Master Volume
                      </span>
                      <span className="font-mono-nums text-cyan-400 font-bold">{masterVol}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={masterVol}
                      onChange={(e) => handleMasterChange(Number(e.target.value))}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Wasteland Ambience & Desert Wind */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Wind className="w-3.5 h-3.5 text-amber-400" />
                        Wasteland Wind & Dunes Ambience
                      </span>
                      <span className="font-mono-nums text-amber-400 font-bold">{ambienceVol}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={ambienceVol}
                      onChange={(e) => handleAmbienceChange(Number(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Cyber-Radio & Synthwave */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-fuchsia-400" />
                        Cyber-Radio & Music
                      </span>
                      <span className="font-mono-nums text-fuchsia-400 font-bold">{musicVol}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={musicVol}
                      onChange={(e) => handleMusicChange(Number(e.target.value))}
                      className="w-full accent-fuchsia-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* SFX, Engine & Tire Sand Friction */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        Vehicle Engine & Tire Gravel SFX
                      </span>
                      <span className="font-mono-nums text-emerald-400 font-bold">{sfxVol}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sfxVol}
                      onChange={(e) => handleSfxChange(Number(e.target.value))}
                      className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Radio Station Selector */}
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <span className="font-cyber font-bold text-xs uppercase tracking-wider text-slate-200">
                      CYBERPUNK RADIO TUNER
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      audioEngine.playMenuClick();
                      onToggleRadio();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border cursor-pointer transition-all ${
                      radioOn
                        ? 'bg-emerald-950 border-emerald-500/70 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {radioOn ? 'RADIO: ON' : 'RADIO: MUTED'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {stations.map((st, idx) => {
                    const isSelected = currentStationIndex === idx;
                    return (
                      <button
                        key={st.id}
                        onClick={() => {
                          audioEngine.playMenuClick();
                          onSetRadioStation(idx);
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-400" />
                        )}
                        <div className="flex items-center justify-between text-xs font-cyber font-bold text-slate-100">
                          <span>{st.name}</span>
                          {isSelected && <span className="text-[10px] text-cyan-400 font-mono">ACTIVE</span>}
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 mt-1 leading-snug">
                          {st.desc}
                        </p>
                        <div className="text-[10px] font-mono text-slate-400 mt-2">
                          {st.bpm} BPM Procedural Chords
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs font-mono text-slate-400 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <span>Current Broadcast: <strong className="text-slate-200">{currentStationName}</strong></span>
                  <span className="text-cyan-400">Track: «{currentTrackName}»</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="space-y-6">
              {/* Camera Perspective Mode */}
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-cyber font-bold text-xs uppercase tracking-wider border-b border-slate-800 pb-2">
                  <Camera className="w-4 h-4" />
                  <span>CAMERA VIEWPOINT</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['chase', 'cockpit', 'cinematic'] as CameraViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        audioEngine.playMenuClick();
                        onSetCameraMode(mode);
                      }}
                      className={`p-3 rounded-xl border text-center font-cyber font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        cameraMode === mode
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mode === 'chase' && 'CHASE CAM (3RD-PERSON)'}
                      {mode === 'cockpit' && 'COCKPIT CAM (1ST-PERSON)'}
                      {mode === 'cinematic' && 'CINEMATIC WIDE CAM'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Complete Controls Field Guide */}
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-cyan-400 font-cyber font-bold text-xs uppercase tracking-wider border-b border-slate-800 pb-2">
                  <Keyboard className="w-4 h-4" />
                  <span>KEYBOARD & VEHICLE FIELD MANUAL</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-cyan-400 font-bold block mb-1">DRIVE & ACCELERATE</span>
                    <span className="text-slate-300">W / S / A / D or Arrow Keys</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-cyan-400 font-bold block mb-1">HANDBRAKE DRIFT / JUMP</span>
                    <span className="text-slate-300">Spacebar</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-cyan-400 font-bold block mb-1">NITRO TURBO BOOST</span>
                    <span className="text-slate-300">Left Shift (in Rover)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-amber-400 font-bold block mb-1">MOUNT / DISMOUNT ROVER</span>
                    <span className="text-slate-300">F Key (when close to MULE)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-emerald-400 font-bold block mb-1">DEPLOY CANOPY SHIELD</span>
                    <span className="text-slate-300">B Key (Hold stationary inside)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-cyan-400 font-bold block mb-1">DASHBOARD DIAGNOSTICS</span>
                    <span className="text-slate-300">V Key</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-cyan-400 font-bold block mb-1">TACTICAL CYBER-SCANNER</span>
                    <span className="text-slate-300">X Key</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-cyan-400 font-bold block mb-1">CYCLE RADIO STATION</span>
                    <span className="text-slate-300">R Key</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-cyan-400 font-bold block mb-1">CYCLE CAMERA VIEW</span>
                    <span className="text-slate-300">C Key</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-amber-400 font-bold block mb-1">CONTEXTUAL INTERACTION</span>
                    <span className="text-slate-300">E Key (Terminals, Salvage, POIs)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-cyan-400 font-bold block mb-1">STORY LOG JOURNAL</span>
                    <span className="text-slate-300">J Key</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-rose-400 font-bold block mb-1">PAUSE / SYSTEM MENU</span>
                    <span className="text-slate-300">ESC or P Key</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vitals' && (
            <div className="space-y-6">
              {/* Mission Progress */}
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-cyber font-bold text-xs uppercase tracking-wider border-b border-slate-800 pb-2">
                  <Compass className="w-4 h-4" />
                  <span>CURRENT OBJECTIVE & WAYPOINT</span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-cyber font-bold text-amber-300 text-sm">{campaignChapterTitle}</h4>
                  <p className="font-mono text-xs text-slate-300">{campaignObjective}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/80">
                  <span>Next Outpost: <strong className="text-slate-200">{currentCityName.toUpperCase()}</strong></span>
                  <span>Distance: <strong className="text-cyan-400 font-mono-nums">{distToNextCity.toFixed(2)} km</strong></span>
                  <span>Odometer: <strong className="text-slate-200 font-mono-nums">{stats.odometer.toFixed(2)} km</strong></span>
                </div>
              </div>

              {/* Vehicle Vitals Breakdown */}
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-cyber font-bold text-xs uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>MULE 4X4 HARDWARE TELEMETRY</span>
                  </span>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-amber-400 flex items-center gap-1">
                      <Disc className="w-3.5 h-3.5" /> Scrap: <strong>{stats.scrap}</strong>
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5" /> Parts: <strong>{stats.spareParts}</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Hull */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-300">Cruiser Hull Durability</span>
                      <span className="font-mono-nums font-bold text-cyan-300">{stats.health} / {stats.maxHealth} ({healthPercent}%)</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-cyan-400 h-full transition-all" style={{ width: `${healthPercent}%` }} />
                    </div>
                  </div>

                  {/* Fuel */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-300">Propellant Reserve</span>
                      <span className="font-mono-nums font-bold text-amber-300">{fuelPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-amber-400 h-full transition-all" style={{ width: `${fuelPercent}%` }} />
                    </div>
                  </div>

                  {/* Battery */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-300">Capacitor Cells (Shield Power)</span>
                      <span className="font-mono-nums font-bold text-emerald-300">{batteryPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-emerald-400 h-full transition-all" style={{ width: `${batteryPercent}%` }} />
                    </div>
                  </div>

                  {/* Heat */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-300">Core Turbine Heat</span>
                      <span className="font-mono-nums font-bold text-rose-300">{heatPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-rose-500 h-full transition-all" style={{ width: `${heatPercent}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800/90 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {showRestartConfirm ? (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-mono text-rose-400 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Restart run from the crash site?
              </span>
              <button
                onClick={() => {
                  audioEngine.playMenuClick();
                  onRestart();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-cyber text-xs font-bold cursor-pointer"
              >
                CONFIRM RESTART
              </button>
              <button
                onClick={() => setShowRestartConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-cyber text-xs font-bold cursor-pointer"
              >
                CANCEL
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowRestartConfirm(true)}
              className="text-xs font-mono text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart Expedition from Beginning</span>
            </button>
          )}

          <button
            onClick={() => {
              audioEngine.playMenuClick();
              onResume();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-cyber font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME EXPEDITION [ESC / P]</span>
          </button>
        </div>

      </div>
    </div>
  );
};
