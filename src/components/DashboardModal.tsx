import React from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Fuel,
  BatteryCharging,
  Flame,
  Shield,
  X,
  Radio,
  Sparkles,
} from 'lucide-react';
import { VehicleStats, VehicleUpgrades, MechanicalFailure } from '../types/game';
import { audioEngine } from '../audio/audioEngine';

interface DashboardModalProps {
  stats: VehicleStats;
  upgrades: VehicleUpgrades;
  failure: MechanicalFailure | null;
  onRepairComponent: () => void;
  onClose: () => void;
}

export const DashboardModal: React.FC<DashboardModalProps> = ({
  stats,
  upgrades,
  failure,
  onRepairComponent,
  onClose,
}) => {
  const isCrackedFuel = failure?.type === 'cracked_fuel_line';
  const hasRepairSupplies = stats.spareParts >= 1 && stats.scrap >= 10;

  const handleRepair = () => {
    if (!hasRepairSupplies) return;
    audioEngine.playRepairSound();
    onRepairComponent();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-950/85 backdrop-blur-md select-none">
      <div className="relative w-full max-w-3xl rounded-2xl border border-cyan-500/40 bg-[#090d16] text-slate-100 shadow-2xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center text-cyan-400 font-cyber font-bold text-xs">
              MULE
            </div>
            <div>
              <h2 className="font-cyber font-bold text-base md:text-lg text-white tracking-wider flex items-center gap-2">
                <span>ON-BOARD TELEMETRY // DASHBOARD DIAGNOSTIC</span>
              </h2>
              <p className="text-xs font-mono text-cyan-400/80">
                Cruiser Model: MULE-44 Expedition Rig · Chassis ID #HAVEN-07
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dashboard Instruments & Gauges */}
        <div className="p-6 space-y-6">
          {/* Main Gauges Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Speed & Max */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  SPEED
                </span>
                <span className="text-cyan-400">KM/H</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-cyber font-bold text-white font-mono-nums">
                  {Math.round(stats.speed)}
                </span>
                <span className="text-xs font-mono text-slate-500">/ {stats.maxSpeed}</span>
              </div>
              <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (stats.speed / stats.maxSpeed) * 100)}%` }}
                />
              </div>
            </div>

            {/* Fuel Cell */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-amber-400" />
                  FUEL CELL
                </span>
                <span className={stats.fuel < 25 ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                  {Math.round(stats.fuel)}%
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-3xl font-cyber font-bold font-mono-nums ${stats.fuel < 25 ? 'text-rose-400' : 'text-white'}`}>
                  {Math.round(stats.fuel)}
                </span>
                <span className="text-xs font-mono text-slate-500">LITERS</span>
              </div>
              <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${stats.fuel < 25 ? 'bg-rose-500' : 'bg-amber-400'}`}
                  style={{ width: `${stats.fuel}%` }}
                />
              </div>
            </div>

            {/* Battery / Aux Power */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                  BATTERY
                </span>
                <span className="text-emerald-400">{Math.round(stats.battery)}%</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-cyber font-bold text-white font-mono-nums">
                  {Math.round(stats.battery)}
                </span>
                <span className="text-xs font-mono text-slate-500">KW</span>
              </div>
              <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${stats.battery}%` }}
                />
              </div>
            </div>

            {/* Engine Heat */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  TURBINE HEAT
                </span>
                <span className={stats.heat > 75 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                  {Math.round(stats.heat)}°C
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-3xl font-cyber font-bold font-mono-nums ${stats.heat > 75 ? 'text-rose-400' : 'text-white'}`}>
                  {Math.round(stats.heat)}
                </span>
                <span className="text-xs font-mono text-slate-500">/ 100°</span>
              </div>
              <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${stats.heat > 75 ? 'bg-rose-500' : 'bg-cyan-500'}`}
                  style={{ width: `${stats.heat}%` }}
                />
              </div>
            </div>
          </div>

          {/* Critical Component Diagnostic Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h3 className="font-cyber font-bold text-sm text-cyan-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-400" />
              <span>VEHICLE SUBSYSTEM INTEGRITY STATUS</span>
            </h3>

            {failure ? (
              <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <div className="font-cyber font-bold text-rose-300 text-sm">
                      {failure.title}
                    </div>
                    <p className="text-xs text-rose-200/90 font-mono mt-1">
                      {failure.description}
                    </p>
                    <div className="text-[11px] text-amber-300/80 font-mono mt-1">
                      Solution: {failure.solutionText}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRepair}
                  disabled={!hasRepairSupplies}
                  className={`px-4 py-2.5 rounded-lg font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                    hasRepairSupplies
                      ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-lg shadow-rose-500/20 active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  <span>
                    {hasRepairSupplies ? 'REPAIR COMPONENT [1 PART + 10 SCRAP]' : 'INSUFFICIENT SCRAP/PARTS'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="font-cyber font-bold text-emerald-300 text-sm">
                      ALL PROPULSION CONDUITS NOMINAL
                    </div>
                    <p className="text-xs text-emerald-200/80 font-mono mt-0.5">
                      Fuel line sealed. Turbine pressure holding at 14.2 bar. Rig ready for highway transit.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 px-2.5 py-1 rounded bg-emerald-900/40 border border-emerald-500/30">
                  SYSTEM READY
                </span>
              </div>
            )}

            {/* Quick Specs Footprint */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs font-mono">
              <div className="text-slate-400">
                <span className="text-slate-500 block">Hull Armor:</span>
                <span className="text-slate-200 font-semibold">{stats.health} / {stats.maxHealth} HP</span>
              </div>
              <div className="text-slate-400">
                <span className="text-slate-500 block">Scrap Reserve:</span>
                <span className="text-amber-300 font-semibold">{stats.scrap} Units</span>
              </div>
              <div className="text-slate-400">
                <span className="text-slate-500 block">Nanite Spare Parts:</span>
                <span className="text-cyan-300 font-semibold">{stats.spareParts} In Cargo</span>
              </div>
              <div className="text-slate-400">
                <span className="text-slate-500 block">Odometer:</span>
                <span className="text-slate-200 font-semibold">{stats.odometer.toFixed(2)} km</span>
              </div>
            </div>
          </div>

          {/* Narrative Reminder */}
          <div className="p-3.5 rounded-lg border border-cyan-500/20 bg-cyan-950/20 text-xs font-mono text-cyan-200/90 flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Mission Protocol: Haven-9 is relying on you. Search nearby wreckage for components if supplies run dry.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            RETURN TO DRIVING
          </button>
        </div>
      </div>
    </div>
  );
};
