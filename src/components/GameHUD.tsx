import React, { useState } from 'react';
import {
  Zap,
  Shield,
  Fuel,
  Flame,
  Radio as RadioIcon,
  Camera,
  Wrench,
  Disc,
  Volume2,
  VolumeX,
  Compass,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  User,
  Car,
  Footprints,
  Eye,
  EyeOff,
  Terminal,
  Cpu,
  Target,
  Scan,
  Cloud,
  CloudRain,
  CloudLightning,
  Gauge,
  Sparkles,
  Pause,
} from 'lucide-react';
import { CameraViewMode, NearestCityInfo } from '../game/threeScene';
import {
  MechanicalFailure,
  VehicleStats,
  VehicleUpgrades,
  CyberwareItem,
  HackingTarget,
  WeatherType,
  StoryDialogue,
} from '../types/game';
import { StoryDialogueBar } from './StoryDialogueBar';

interface GameHUDProps {
  stats: VehicleStats;
  upgrades: VehicleUpgrades;
  failure: MechanicalFailure | null;
  currentCityName: string;
  distToNextCity: number;
  totalCityDist: number;
  nearestCity: NearestCityInfo;
  cameraMode: CameraViewMode;
  isMuted: boolean;
  radioOn: boolean;
  currentStationName: string;
  currentTrackName: string;
  activeDialogue?: StoryDialogue | null;
  onDismissDialogue?: () => void;
  onNextDialogue?: () => void;
  hasMoreDialogues?: boolean;
  isOnFoot: boolean;
  distToRover: number;
  isScannerActive: boolean;
  nearestHackingTarget: HackingTarget | null;
  scannerTargets: Array<{ id: string; title: string; distanceMeters: number; type: string; isHacked?: boolean; secFirm?: string; label?: string }>;
  cyberwareList: CyberwareItem[];
  currentWeather: WeatherType;
  campaignChapterTitle?: string;
  campaignObjective?: string;
  storyPrompt?: { id: string; label: string; action: string; distMeters: number } | null;
  onTriggerStoryPrompt?: () => void;
  onOpenDashboard?: () => void;
  onCycleWeather: () => void;
  onTogglePlayerMode: () => void;
  onToggleScanner: () => void;
  onTriggerHacking: () => void;
  onTriggerEmp: () => void;
  onTriggerScavenge: () => void;
  onRoadsideRepair: () => void;
  onSynthesizeFuel?: () => void;
  onCycleCamera: () => void;
  onCycleRadio: () => void;
  onToggleMute: () => void;
  onOpenJournal: () => void;
  onVirtualDrive: (code: string, held: boolean) => void;
  isAcidShieldActive?: boolean;
  onToggleAcidShield?: () => void;
  acidRainShieldStatus?: 'protected' | 'moving_warning' | 'no_shield' | 'out_of_battery' | 'on_foot_danger' | 'clear' | string;
  onPause?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  upgrades,
  failure,
  currentCityName,
  distToNextCity,
  nearestCity,
  cameraMode,
  isMuted,
  radioOn,
  currentStationName,
  currentTrackName,
  activeDialogue = null,
  onDismissDialogue = () => {},
  onNextDialogue,
  hasMoreDialogues = false,
  isOnFoot,
  distToRover,
  isScannerActive,
  nearestHackingTarget,
  scannerTargets,
  cyberwareList,
  currentWeather,
  campaignChapterTitle,
  campaignObjective,
  storyPrompt,
  onTriggerStoryPrompt,
  onOpenDashboard,
  onCycleWeather,
  onTogglePlayerMode,
  onToggleScanner,
  onTriggerHacking,
  onTriggerEmp,
  onTriggerScavenge,
  onRoadsideRepair,
  onSynthesizeFuel,
  onCycleCamera,
  onCycleRadio,
  onToggleMute,
  onOpenJournal,
  onVirtualDrive,
  isAcidShieldActive = false,
  onToggleAcidShield,
  acidRainShieldStatus = 'clear',
  onPause,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const healthPercent = Math.round((stats.health / stats.maxHealth) * 100);
  const fuelPercent = Math.round(stats.fuel);
  const batteryPercent = Math.round(stats.battery);
  const heatPercent = Math.round(stats.heat);

  const canEnterRover = isOnFoot && distToRover <= 6.5;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 md:p-6 overflow-hidden select-none">
      {/* Windshield Acid Rain Hazard Banner & Dynamic Shield Status */}
      {currentWeather === 'acid_rain' && (
        <div className="absolute inset-0 pointer-events-none z-15 border-4 border-lime-500/30 shadow-[inset_0_0_120px_rgba(132,204,22,0.22)]">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto max-w-xl w-full px-4">
            {isOnFoot ? (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-rose-950/95 border-2 border-rose-500 rounded-2xl shadow-[0_0_30px_rgba(244,63,94,0.5)] backdrop-blur-md animate-pulse">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <div className="font-cyber text-xs font-bold text-rose-300 uppercase tracking-wider">
                      CAUSTIC STORM // SEEK SHELTER IN 4X4 ROVER [F]
                    </div>
                    <div className="font-mono text-[10px] text-rose-200/90">
                      Hazard suit degrading (-4 HP/s). Return to the rover and enter immediately.
                    </div>
                  </div>
                </div>
                <button
                  onClick={onTogglePlayerMode}
                  disabled={!canEnterRover}
                  className={`px-3 py-1.5 rounded-xl font-cyber font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    canEnterRover ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-lg' : 'bg-rose-900/60 text-rose-400/60 cursor-not-allowed'
                  }`}
                >
                  ENTER [F]
                </button>
              </div>
            ) : acidRainShieldStatus === 'protected' ? (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-950/95 border-2 border-emerald-400/90 rounded-2xl shadow-[0_0_30px_rgba(52,211,153,0.35)] backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-cyan-300 animate-pulse shrink-0" />
                  <div>
                    <div className="font-cyber text-xs font-bold text-emerald-300 uppercase tracking-wider">
                      CANOPY SHIELD ENGAGED // VEHICLE STATIONARY // HULL PROTECTED
                    </div>
                    <div className="font-mono text-[10px] text-emerald-200/90">
                      Draining battery (-3.2%/s) · Remain stationary inside until the acid storm passes.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-mono-nums text-xs font-bold text-cyan-300 px-2 py-1 rounded bg-slate-950/60 border border-cyan-500/40">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{batteryPercent}%</span>
                </div>
              </div>
            ) : acidRainShieldStatus === 'moving_warning' ? (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-950/95 border-2 border-amber-400 rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.45)] backdrop-blur-md animate-pulse">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-cyber text-xs font-bold text-amber-300 uppercase tracking-wider">
                      SHIELD DESTABILIZED // VEHICLE MUST REMAIN STATIONARY!
                    </div>
                    <div className="font-mono text-[10px] text-amber-200/90">
                      Aerodynamic velocity shear is destabilizing the shield canopy. Bring rover to a stop.
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-amber-400 font-bold px-2 py-1 rounded bg-amber-950 border border-amber-500/50">
                  STOP 4X4
                </span>
              </div>
            ) : acidRainShieldStatus === 'out_of_battery' ? (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-rose-950/95 border-2 border-rose-500 rounded-2xl shadow-[0_0_30px_rgba(244,63,94,0.45)] backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <div className="font-cyber text-xs font-bold text-rose-300 uppercase tracking-wider">
                      SHIELD COLLAPSED // BATTERY DEPLETED
                    </div>
                    <div className="font-mono text-[10px] text-rose-200/90">
                      Canopy shield has fallen. Hull taking acid damage.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-lime-950/95 border-2 border-lime-400 rounded-2xl shadow-[0_0_30px_rgba(163,230,53,0.4)] backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <CloudRain className="w-5 h-5 text-lime-400 shrink-0 animate-bounce" />
                  <div>
                    <div className="font-cyber text-xs font-bold text-lime-300 uppercase tracking-wider">
                      ACID RAIN FALLING // STOP VEHICLE & DEPLOY SHIELD [B]
                    </div>
                    <div className="font-mono text-[10px] text-lime-200/90">
                      Corrosive acid precipitation eating hull (-2.5 HP/s). Stop and deploy canopy shield.
                    </div>
                  </div>
                </div>
                {onToggleAcidShield && (
                  <button
                    onClick={onToggleAcidShield}
                    className="px-3.5 py-1.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-950" />
                    <span>DEPLOY [B]</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TOP BAR: COMPASS WAYPOINT & VITALS --- */}
      <div className="flex items-start justify-between gap-4 w-full">
        {/* Top-Left: Open-World Waypoint */}
        <div className="bg-slate-950/85 border border-slate-800/90 rounded-xl p-3.5 max-w-xs pointer-events-auto shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-cyber text-xs font-bold text-slate-200 tracking-wider">
                {nearestCity.name.toUpperCase()}
              </span>
            </div>
            <span className="font-mono-nums text-xs text-cyan-400 font-bold">
              {distToNextCity.toFixed(2)} km
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Odometer: <strong className="text-slate-200 font-mono-nums">{stats.odometer.toFixed(2)} km</strong></span>
            <span className="text-amber-400 font-semibold">{nearestCity.cardinal}</span>
          </div>

          {/* On-Foot Return to Rover Beacon Indicator */}
          {isOnFoot && (
            <div className={`mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono ${
              canEnterRover ? 'text-emerald-300' : 'text-slate-400'
            }`}>
              <span className="flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-cyan-400" />
                4x4 Rover Distance:
              </span>
              <strong className="font-mono-nums">{distToRover.toFixed(1)} m</strong>
            </div>
          )}
        </div>

        {/* Top-Center: Crystal Clear Waypoint, Compass, Campaign Banner & Weather Sensor */}
        <div className="flex flex-col md:flex-row items-center gap-2.5">
          {campaignChapterTitle && (
            <div className="flex flex-col items-center sm:items-start px-3.5 py-1.5 rounded-xl bg-slate-950/90 border border-amber-500/50 shadow-xl pointer-events-auto">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-[10px] font-cyber text-amber-300 font-bold tracking-widest uppercase">
                  {campaignChapterTitle}
                </span>
              </div>
              {campaignObjective && (
                <div className="text-[11px] font-mono text-slate-200 mt-0.5 truncate max-w-xs sm:max-w-md">
                  <span className="text-cyan-400 font-bold mr-1">MISSION:</span>
                  <span>{campaignObjective}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-xl bg-slate-950/90 border border-cyan-500/40 text-xs font-mono text-slate-200 shadow-xl pointer-events-auto">
            {/* Bespoke Vertical Arrow SVG */}
            <div
              className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/60 flex items-center justify-center transition-transform duration-200"
              style={{ transform: `rotate(${nearestCity.relativeBearingDeg}deg)` }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-cyan-300 fill-current">
                <polygon points="12,2 21,21 12,16 3,21" />
              </svg>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-cyber text-cyan-300 font-bold tracking-wider">
                  DESTINATION: {nearestCity.name.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 font-bold">
                  {nearestCity.directionHint}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-300">
                {nearestCity.distanceKm.toFixed(2)} km away · Heading {nearestCity.cardinal}
              </span>
            </div>
          </div>

          {/* Cyber-Weather Indicator Pill */}
          <button
            onClick={onCycleWeather}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono shadow-xl transition-all cursor-pointer pointer-events-auto active:scale-95 ${
              currentWeather === 'acid_rain'
                ? 'bg-lime-950/90 border-lime-500/80 text-lime-300 ring-1 ring-lime-400/50'
                : currentWeather === 'data_storm'
                ? 'bg-fuchsia-950/90 border-fuchsia-500/80 text-fuchsia-300 ring-1 ring-fuchsia-400/50'
                : 'bg-slate-950/90 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
            title="Atmospheric Weather Sensor (Click to cycle weather)"
          >
            {currentWeather === 'acid_rain' ? (
              <CloudRain className="w-4 h-4 text-lime-400 shrink-0" />
            ) : currentWeather === 'data_storm' ? (
              <CloudLightning className="w-4 h-4 text-fuchsia-400 shrink-0" />
            ) : (
              <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-cyber text-[10px] font-bold tracking-wider uppercase">
                  {currentWeather === 'acid_rain'
                    ? 'ACID RAIN'
                    : currentWeather === 'data_storm'
                    ? 'DATA STORM'
                    : 'TWILIGHT SMOG'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                {currentWeather === 'acid_rain'
                  ? 'HULL CORROSION'
                  : currentWeather === 'data_storm'
                  ? 'ION VORTEX ACTIVE'
                  : 'ATMOSPHERE STABLE'}
              </span>
            </div>
          </button>
        </div>

        {/* Top-Right: Resources & Vehicle / Nomad Vitals */}
        <div className="flex flex-col items-end gap-2.5 pointer-events-auto">
          {/* Currencies & Pause Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-950/85 border border-slate-800/90 rounded-xl px-3.5 py-2 shadow-xl">
              <div className="flex items-center gap-1.5 px-2 py-0.5 border-r border-slate-800 text-xs font-mono">
                <Disc className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400">Scrap</span>
                <span className="font-mono-nums text-amber-300 font-bold">{stats.scrap}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono">
                <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Parts</span>
                <span className="font-mono-nums text-emerald-300 font-bold">{stats.spareParts}</span>
              </div>
            </div>

            {onPause && (
              <button
                onClick={onPause}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-950/85 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-xl shadow-xl text-xs font-cyber font-bold text-slate-300 hover:text-cyan-300 transition-all cursor-pointer active:scale-95"
                title="Pause Game [ESC / P]"
              >
                <Pause className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">PAUSE [ESC]</span>
              </button>
            )}
          </div>

          {/* Vitals Box */}
          <div className="bg-slate-950/85 border border-slate-800/90 rounded-xl p-3 w-64 shadow-xl">
            {/* Hull */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="flex items-center gap-1 text-slate-300">
                  <Shield className="w-3 h-3 text-cyan-400" />
                  Cruiser Hull
                </span>
                <span className="font-mono-nums text-xs font-bold text-slate-200">{healthPercent}%</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-200 ${
                    healthPercent > 50 ? 'bg-cyan-400' : healthPercent > 25 ? 'bg-amber-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${healthPercent}%` }}
                />
              </div>
            </div>

            {/* Fuel & Battery */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-0.5">
                  <span className="flex items-center gap-1">
                    <Fuel className="w-2.5 h-2.5 text-amber-400" /> Fuel
                  </span>
                  <span className="font-mono-nums text-slate-200">{fuelPercent}%</span>
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full transition-all" style={{ width: `${fuelPercent}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-0.5">
                  <span className="flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 text-sky-400" /> Battery
                  </span>
                  <span className="font-mono-nums text-slate-200">{batteryPercent}%</span>
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                  <div className="bg-sky-400 h-full transition-all" style={{ width: `${batteryPercent}%` }} />
                </div>
              </div>
            </div>

            {/* Heat */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-0.5">
                <span className="flex items-center gap-1">
                  <Flame className={`w-2.5 h-2.5 ${heatPercent > 75 ? 'text-rose-400' : 'text-slate-400'}`} />
                  Engine Heat
                </span>
                <span className={`font-mono-nums ${heatPercent > 75 ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                  {heatPercent}%
                </span>
              </div>
              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    heatPercent > 80 ? 'bg-rose-500' : heatPercent > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${heatPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* --- MECHANICAL FAILURE ALERT BANNER --- */}
      {failure && (
        <div className="mx-auto w-full max-w-xl bg-slate-950/95 border-2 border-rose-500/80 rounded-2xl p-4 shadow-[0_0_30px_rgba(244,63,94,0.35)] pointer-events-auto my-2 backdrop-blur-sm transition-all">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-500/60 shrink-0 text-rose-400 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-cyber text-xs font-bold text-rose-400 tracking-wider uppercase">
                    {failure.title}
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950 border border-rose-500/50 text-rose-300 uppercase">
                    CRITICAL WARNING
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-200 leading-snug">
                  {failure.description}
                </div>
                <div className="text-[11px] font-mono text-amber-300/90 mt-1 flex items-center gap-1.5">
                  <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Fix: 1 Nanite Part + 10 Scrap required to seal leak</span>
                </div>
              </div>
            </div>

            {/* Clear Action Buttons: Dashboard [V] or Quick Patch */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              {onOpenDashboard && (
                <button
                  onClick={onOpenDashboard}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-cyan-500/60 hover:bg-slate-800 text-cyan-300 font-cyber font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
                  title="Open MULE Dashboard [V]"
                >
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>DASHBOARD [V]</span>
                </button>
              )}

              <button
                onClick={onRoadsideRepair}
                disabled={stats.spareParts < 1 || stats.scrap < 10}
                className={`px-3.5 py-2 rounded-xl font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all ${
                  stats.spareParts >= 1 && stats.scrap >= 10
                    ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
                title={stats.spareParts >= 1 && stats.scrap >= 10 ? 'Quick Patch Conduit' : 'Scrap or Parts required'}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>QUICK PATCH</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PROXIMITY HACKING BANNER --- */}
      {nearestHackingTarget && (
        <div className="mx-auto bg-fuchsia-950/90 border border-fuchsia-500/80 rounded-xl p-3 max-w-lg shadow-2xl pointer-events-auto flex items-center justify-between gap-4 mb-2 animate-pulse">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-fuchsia-400 shrink-0" />
            <div>
              <div className="font-cyber text-xs font-bold text-fuchsia-200 uppercase flex items-center gap-2">
                <span>{nearestHackingTarget.title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-fuchsia-900 rounded text-fuchsia-300">
                  {nearestHackingTarget.securityFirm}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-300">
                Encrypted corporate ICE detected. Press [H] or click to breach buffer.
              </div>
            </div>
          </div>
          <button
            onClick={onTriggerHacking}
            className="px-4 py-2 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider cursor-pointer shrink-0 shadow-lg shadow-fuchsia-500/25 active:scale-95 flex items-center gap-1.5"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>JACK IN [H]</span>
          </button>
        </div>
      )}

      {/* --- CYBER-EYE SCANNER FULL-SCREEN AR HUD --- */}
      {isScannerActive && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Green/Cyan HUD corner brackets */}
          <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-emerald-400/80 pointer-events-none" />
          <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-emerald-400/80 pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-emerald-400/80 pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-emerald-400/80 pointer-events-none" />

          {/* Center Scan Reticle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
            <div className="w-20 h-20 rounded-full border border-emerald-500/40 border-dashed animate-spin flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
            </div>
            <div className="mt-2 px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-mono text-emerald-300 font-bold tracking-widest uppercase">
              KIROSHI AR SWEEP · ACTIVE
            </div>
          </div>

          {/* Tactical Scanned Target Cards Panel (Right Side) */}
          <div className="absolute top-28 right-6 w-72 flex flex-col gap-2 pointer-events-auto">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/90 border border-emerald-500/40 text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                ACQUIRED SIGNALS ({scannerTargets.length})
              </span>
              <span className="text-slate-400">[Q] EXIT</span>
            </div>

            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {scannerTargets.map((st) => (
                <div
                  key={st.id}
                  className={`p-2.5 rounded-xl border text-xs font-mono backdrop-blur-sm ${
                    st.type === 'terminal'
                      ? 'bg-fuchsia-950/80 border-fuchsia-500/60 text-fuchsia-200'
                      : st.type === 'salvage'
                      ? 'bg-amber-950/80 border-amber-500/60 text-amber-200'
                      : 'bg-rose-950/80 border-rose-500/60 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="truncate max-w-[170px]">{st.title}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-900 rounded font-mono">
                      {st.distanceMeters}m
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 flex items-center justify-between">
                    <span>{st.secFirm || st.label || st.type}</span>
                    {st.type === 'terminal' && !st.isHacked && (
                      <button
                        onClick={onTriggerHacking}
                        className="px-2 py-0.5 rounded bg-fuchsia-500 text-slate-950 font-bold text-[9px] hover:bg-fuchsia-400 cursor-pointer"
                      >
                        BREACH
                      </button>
                    )}
                    {st.type === 'salvage' && (
                      <span className="text-amber-400 font-semibold">[E to scavenge]</span>
                    )}
                  </div>
                </div>
              ))}
              {scannerTargets.length === 0 && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 text-center">
                  No electronic signals within optics range. Advance towards ruins.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- FLOATING CONTEXTUAL STORY PROMPT --- */}
      {storyPrompt && (
        <div className="mx-auto mb-2 pointer-events-auto z-30 animate-bounce">
          <button
            onClick={onTriggerStoryPrompt}
            className="flex items-center gap-3 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-amber-400 to-cyan-500 hover:brightness-110 text-slate-950 font-cyber font-bold text-xs md:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(6,182,212,0.6)] active:scale-95 transition-all cursor-pointer border border-white/30"
          >
            <span className="w-6 h-6 rounded bg-slate-950/25 flex items-center justify-center font-mono font-bold text-xs text-slate-950">
              E
            </span>
            <span>{storyPrompt.label}</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950/25">
              {storyPrompt.distMeters}m
            </span>
          </button>
        </div>
      )}

      {/* --- OUT OF FUEL // ENGINE STALLED ALERT BANNER --- */}
      {stats.fuel <= 0 && (
        <div className="mx-auto w-full max-w-xl bg-slate-950/95 border-2 border-amber-500/90 rounded-2xl p-4 shadow-[0_0_35px_rgba(245,158,11,0.4)] pointer-events-auto my-2 backdrop-blur-md animate-pulse">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-amber-950/90 border border-amber-500/80 shrink-0 text-amber-400 mt-0.5">
                <Fuel className="w-5 h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-cyber text-xs font-bold text-amber-400 tracking-wider uppercase">
                    ENGINE STALLED // FUEL EXHAUSTED
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/50 uppercase">
                    CRITICAL
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-200 leading-snug">
                  The turbine cannot fire without fuel. Use 15 Scrap to synthesize emergency propellant, or dismount on-foot [F] to scavenge canisters.
                </div>
                <div className="text-[11px] font-mono text-cyan-300 mt-1">
                  Scraps available: <strong className="text-amber-400 font-mono-nums">{stats.scrap}</strong> (Need 15)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              {onSynthesizeFuel && (
                <button
                  onClick={onSynthesizeFuel}
                  disabled={stats.scrap < 15}
                  className={`px-4 py-2.5 rounded-xl font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all ${
                    stats.scrap >= 15
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30 ring-2 ring-amber-400'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                  title={stats.scrap >= 15 ? 'Synthesize emergency propellant (15 Scraps)' : 'Need 15 Scraps'}
                >
                  <Fuel className="w-4 h-4" />
                  <span>SYNTHESIZE (15 SCRAP)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- CINEMATIC NARRATIVE DIALOGUE BAR --- */}
      {activeDialogue && (
        <StoryDialogueBar
          dialogue={activeDialogue}
          onDismiss={onDismissDialogue}
          onNext={onNextDialogue}
          hasMore={hasMoreDialogues}
        />
      )}

      {/* --- UNIFIED BOTTOM COLLAPSIBLE CONTROL DOCK --- */}
      <div className="relative mx-auto w-full max-w-3xl pointer-events-auto flex flex-col items-center">
        <button
          onClick={() => setDockCollapsed(!dockCollapsed)}
          className="mb-1 flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-slate-950/90 border-t border-x border-slate-800 text-[11px] font-mono text-slate-400 hover:text-cyan-400 cursor-pointer"
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
        </button>

        {!dockCollapsed && (
          <div className="w-full bg-slate-950/90 border border-slate-800/90 rounded-2xl p-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
            {/* Speedometer & Mode Readout */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl border border-cyan-500/40 bg-slate-900/80 flex flex-col items-center justify-center">
                <span className="font-cyber font-black text-2xl text-cyan-300 font-mono-nums leading-none">
                  {stats.speed}
                </span>
                <span className="text-[9px] font-mono text-slate-400 uppercase mt-0.5">KM/H</span>
              </div>

              <div className="flex flex-col text-xs font-mono text-slate-400">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  {isOnFoot ? <Footprints className="w-3.5 h-3.5 text-emerald-400" /> : <Car className="w-3.5 h-3.5 text-cyan-400" />}
                  {isOnFoot ? 'Nomad On-Foot' : 'Sci-Fi 4x4 Cruiser'}
                </span>
                <span className="text-[11px] text-cyan-400">
                  {isOnFoot ? `WASD Walk · Space Jump` : `Shift Turbo Boost · 4WD`}
                </span>
              </div>
            </div>

            {/* Core Action Buttons: Enter/Exit Vehicle, Scavenge, Dashboard, EMP */}
            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePlayerMode}
                disabled={isOnFoot && !canEnterRover}
                className={`px-4 py-2.5 rounded-xl font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md ${
                  isOnFoot
                    ? canEnterRover
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                }`}
                title="Enter or Exit 4x4 Cruiser (F)"
              >
                {isOnFoot ? <Car className="w-4 h-4" /> : <User className="w-4 h-4" />}
                <span>{isOnFoot ? (canEnterRover ? 'ENTER 4x4' : 'FAR FROM 4x4') : 'EXIT VEHICLE'}</span>
                <span className="text-[10px] font-mono opacity-80">[F]</span>
              </button>

              <button
                onClick={onTriggerScavenge}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md shadow-amber-500/20"
                title="Gather nearby salvage (E)"
              >
                <Disc className="w-4 h-4" />
                <span>SCAVENGE</span>
                <span className="text-[10px] font-mono opacity-80">[E]</span>
              </button>

              <button
                onClick={onOpenDashboard}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/40 hover:bg-slate-800 text-cyan-300 font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md"
                title="Inspect MULE dashboard & repair components"
              >
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span>DASHBOARD</span>
                {failure && failure.type !== 'none' && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping ml-0.5" />
                )}
              </button>

              {!isOnFoot && (
                <>
                  <button
                    onClick={onTriggerEmp}
                    disabled={stats.battery < 15}
                    className={`px-3.5 py-2.5 rounded-xl font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                      stats.battery >= 15
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                    title="Fire EMP shockwave to disable scavenger drones (Space)"
                  >
                    <Zap className="w-4 h-4" />
                    <span>EMP</span>
                    <span className="text-[10px] font-mono opacity-80">[SPACE]</span>
                  </button>

                  <button
                    onClick={onToggleAcidShield}
                    className={`px-3.5 py-2.5 rounded-xl font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md ${
                      isAcidShieldActive
                        ? 'bg-cyan-400 text-slate-950 shadow-cyan-400/40 ring-2 ring-cyan-300 animate-pulse'
                        : 'bg-slate-900 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-950/40'
                    }`}
                    title="Toggle Acid Rain Canopy Shield (B) [Requires Vehicle Stationary]"
                  >
                    <Shield className="w-4 h-4" />
                    <span>{isAcidShieldActive ? 'SHIELD ON' : 'SHIELD'}</span>
                    <span className="text-[10px] font-mono opacity-80">[B]</span>
                  </button>
                </>
              )}

              {/* Cyber-Eye Scanner Button */}
              <button
                onClick={onToggleScanner}
                className={`px-3.5 py-2.5 rounded-xl font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md ${
                  isScannerActive
                    ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30 ring-2 ring-emerald-400'
                    : 'bg-slate-900 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40'
                }`}
                title="Toggle Kiroshi Cyber-Eye Scanner Mode (Q)"
              >
                {isScannerActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>SCANNER</span>
                <span className="text-[10px] font-mono opacity-80">[Q]</span>
              </button>

              {/* In-Range Hacking Prompt Button */}
              {nearestHackingTarget && (
                <button
                  onClick={onTriggerHacking}
                  className="px-3.5 py-2.5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-lg shadow-fuchsia-500/25 animate-pulse"
                  title="Jack in and breach corporate terminal (H)"
                >
                  <Cpu className="w-4 h-4" />
                  <span>HACK</span>
                  <span className="text-[10px] font-mono opacity-80">[H]</span>
                </button>
              )}
            </div>

            {/* Cyber Radio Mini-Player */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <RadioIcon className={`w-4 h-4 ${radioOn ? 'text-cyan-400' : 'text-slate-500'}`} />
              <div className="flex flex-col max-w-[130px]">
                <span className="text-[10px] font-cyber text-slate-400 truncate">
                  {radioOn ? currentStationName : 'RADIO OFF'}
                </span>
                <span className="text-xs font-mono text-cyan-300 font-semibold truncate">
                  {radioOn ? currentTrackName : '---'}
                </span>
              </div>
              <button
                onClick={onCycleRadio}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
                title="Switch Radio Station (R)"
              >
                <span className="text-[10px] font-mono font-bold text-cyan-400">TUNE</span>
              </button>
              <button
                onClick={onToggleMute}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
                title="Toggle Sound"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </div>

            {/* Camera View Switcher */}
            <button
              onClick={onCycleCamera}
              className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-mono text-slate-300 flex items-center gap-1.5 cursor-pointer"
              title="Change Camera Angle (C)"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span className="uppercase text-[11px] font-bold">{cameraMode}</span>
            </button>

            {/* Atmospheric Weather Switcher */}
            <button
              onClick={onCycleWeather}
              className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                currentWeather === 'acid_rain'
                  ? 'bg-lime-950/60 border-lime-500/50 text-lime-300'
                  : currentWeather === 'data_storm'
                  ? 'bg-fuchsia-950/60 border-fuchsia-500/50 text-fuchsia-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title="Cycle Atmospheric Weather Pattern"
            >
              {currentWeather === 'acid_rain' ? (
                <CloudRain className="w-3.5 h-3.5 text-lime-400" />
              ) : currentWeather === 'data_storm' ? (
                <CloudLightning className="w-3.5 h-3.5 text-fuchsia-400" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="uppercase text-[11px] font-bold">
                {currentWeather === 'acid_rain' ? 'ACID RAIN' : currentWeather === 'data_storm' ? 'DATA STORM' : 'TWILIGHT'}
              </span>
            </button>

            {/* Pause Screen Button */}
            {onPause && (
              <button
                onClick={onPause}
                className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer transition-all"
                title="Pause Game [ESC / P]"
              >
                <Pause className="w-3.5 h-3.5 text-cyan-400" />
                <span className="uppercase text-[11px] font-bold">PAUSE</span>
                <span className="text-[10px] font-mono opacity-70">[ESC]</span>
              </button>
            )}
          </div>
        )}

        {/* Mobile / Casual Drive Touch Controls */}
        <div className="flex md:hidden items-center justify-between w-full mt-2 px-2 pointer-events-auto">
          <div className="flex items-center gap-2">
            <button
              onPointerDown={() => onVirtualDrive('KeyA', true)}
              onPointerUp={() => onVirtualDrive('KeyA', false)}
              className="w-12 h-12 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 font-bold active:bg-cyan-500 active:text-slate-950 flex items-center justify-center font-cyber"
            >
              ◀
            </button>
            <button
              onPointerDown={() => onVirtualDrive('KeyD', true)}
              onPointerUp={() => onVirtualDrive('KeyD', false)}
              className="w-12 h-12 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 font-bold active:bg-cyan-500 active:text-slate-950 flex items-center justify-center font-cyber"
            >
              ▶
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onPointerDown={() => onVirtualDrive('KeyS', true)}
              onPointerUp={() => onVirtualDrive('KeyS', false)}
              className="w-12 h-12 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 font-bold active:bg-rose-500 active:text-slate-950 flex items-center justify-center font-cyber"
            >
              ▼
            </button>
            <button
              onPointerDown={() => onVirtualDrive('ShiftLeft', true)}
              onPointerUp={() => onVirtualDrive('ShiftLeft', false)}
              className="w-12 h-12 rounded-xl bg-amber-600/90 border border-amber-400 text-slate-950 font-bold active:bg-amber-400 flex items-center justify-center font-cyber text-xs"
              title="Turbo Boost / Sprint"
            >
              BOOST
            </button>
            <button
              onPointerDown={() => onVirtualDrive('KeyW', true)}
              onPointerUp={() => onVirtualDrive('KeyW', false)}
              className="w-14 h-12 rounded-xl bg-cyan-600/90 border border-cyan-400 text-slate-950 font-bold active:bg-cyan-400 flex items-center justify-center font-cyber text-sm"
            >
              ▲
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
