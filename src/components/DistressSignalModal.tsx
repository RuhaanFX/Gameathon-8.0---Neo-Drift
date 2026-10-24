import React, { useState } from 'react';
import {
  AlertTriangle,
  Radio,
  Wrench,
  Battery,
  BatteryCharging,
  Cpu,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Key,
  FileText,
  Disc,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { VehicleStats } from '../types/game';
import { audioEngine } from '../audio/audioEngine';

export type DistressEventType = 'maintenance_unit_tx84' | 'wrecked_expedition_buggy' | 'roadside_repair_station';

interface DistressSignalModalProps {
  eventType: DistressEventType;
  stats: VehicleStats;
  helpedMaintenanceUnit: boolean | null;
  hasDrChenKey: boolean;
  onHelpMaintenanceUnit: () => void;
  onScavengeMaintenanceUnit: () => void;
  onSearchExpeditionBuggy: () => void;
  onRoadsideRecharge: () => void;
  onRoadsideCraftPart: () => void;
  onClose: () => void;
}

export const DistressSignalModal: React.FC<DistressSignalModalProps> = ({
  eventType,
  stats,
  helpedMaintenanceUnit,
  hasDrChenKey,
  onHelpMaintenanceUnit,
  onScavengeMaintenanceUnit,
  onSearchExpeditionBuggy,
  onRoadsideRecharge,
  onRoadsideCraftPart,
  onClose,
}) => {
  const [outcomeMessage, setOutcomeMessage] = useState<string | null>(null);

  // Unit TX-84 handlers
  const canRepairUnit = stats.spareParts >= 2 && stats.battery >= 20;

  const handleRepairUnit = () => {
    if (!canRepairUnit) return;
    audioEngine.playRepairSound();
    onHelpMaintenanceUnit();
    setOutcomeMessage(
      "Unit TX-84's optical lenses flare to a peaceful cyan. 'REPAIR COMPLETE. GRATITUDE PROTOCOL ENGAGED. INDUSTRIAL SECURITY OVERRIDE CODE TRANSMITTED: BYPASS-FOUNDRY-774. IF YOU REACH THE GATE, MY AUXILIARY SUB-GRID WILL STAND WITH YOU.'"
    );
  };

  const handleScavengeUnit = () => {
    audioEngine.playScrapChime();
    onScavengeMaintenanceUnit();
    setOutcomeMessage(
      "You strip TX-84's copper coils, alloy chassis, and capacitors (+45 Scrap). The maintenance unit's indicator lights flicker and fade into permanent darkness."
    );
  };

  const handleSearchBuggy = () => {
    audioEngine.playBreachSuccess();
    onSearchExpeditionBuggy();
    setOutcomeMessage(
      "You pry open the crushed glovebox of Nomad Cruiser 02. Inside lies a protected biometric drive labeled 'DR. EVELYN CHEN - MASTER AEGIS OVERRIDE CYPHER'. This encryption key is vital to rewriting the regional protocol at The Gate."
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-950/85 backdrop-blur-md select-none">
      <div className="relative w-full max-w-2xl rounded-2xl border border-cyan-500/40 bg-[#0a0e19] text-slate-100 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded border border-amber-500/40 bg-amber-950/40 flex items-center justify-center text-amber-400 font-cyber font-bold text-xs">
              SOS
            </div>
            <div>
              <h2 className="font-cyber font-bold text-base md:text-lg text-white tracking-wider flex items-center gap-2">
                {eventType === 'maintenance_unit_tx84' && 'DISTRESS BEACON // AUTOMATED UNIT TX-84'}
                {eventType === 'wrecked_expedition_buggy' && 'EXPEDITION WRECKAGE // CRUISER 02'}
                {eventType === 'roadside_repair_station' && 'AUTONOMOUS ROADSIDE DEPOT #09'}
              </h2>
              <p className="text-xs font-mono text-amber-400/80">
                Wasteland Encounter Telemetry · Sub-Band 94.2 MHz
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {eventType === 'maintenance_unit_tx84' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 flex gap-4 items-start">
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-1 animate-pulse" />
                <div className="space-y-2 text-xs md:text-sm font-mono text-slate-200">
                  <p>
                    Partially buried beneath a collapsed basalt slab, a heavy-duty industrial maintenance robot is sparking violently. Its voice synthesis unit crackles:
                  </p>
                  <p className="text-amber-300 italic border-l-2 border-amber-500/60 pl-3 py-1">
                    “B-BZZT... CHASSIS DAMAGE CRITICAL. BATTERY CAPACITY 04%. PRIMARY SUBROUTINE: MAINTAIN REGIONAL CONDUITS. REQUESTING ASSISTANCE OR FIELD TERMINATION...”
                  </p>
                  <p className="text-slate-400 text-xs">
                    Assisting the unit will consume precious Nanite Spare Parts and vehicle battery, which you may need for the hazardous roads ahead.
                  </p>
                </div>
              </div>

              {outcomeMessage ? (
                <div className="p-4 rounded-xl border border-cyan-500/40 bg-cyan-950/30 text-xs md:text-sm font-mono text-cyan-200">
                  {outcomeMessage}
                </div>
              ) : helpedMaintenanceUnit !== null ? (
                <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/40 text-xs font-mono text-slate-400">
                  You have already resolved this encounter ({helpedMaintenanceUnit ? 'Unit TX-84 Repaired' : 'Unit Dismantled for Scrap'}).
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleRepairUnit}
                    disabled={!canRepairUnit}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      canRepairUnit
                        ? 'border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-200 hover:border-emerald-400'
                        : 'border-slate-800 bg-slate-900/40 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-cyber font-bold text-xs uppercase mb-1">
                      <Wrench className="w-4 h-4 text-emerald-400" />
                      <span>REPAIR UNIT TX-84</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Cost: 2 Spare Parts + 20% Battery.
                      <span className="block text-emerald-400 font-semibold mt-1">
                        Unlocks industrial override codes & potential alliance at The Gate.
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={handleScavengeUnit}
                    className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/40 text-rose-200 hover:border-rose-400 text-left flex flex-col justify-between transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 font-cyber font-bold text-xs uppercase mb-1">
                      <Cpu className="w-4 h-4 text-rose-400" />
                      <span>SALVAGE FOR SCRAP</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Preserve your parts. Dismantle TX-84 for +45 Scrap.
                      <span className="block text-rose-400 font-semibold mt-1">
                        TX-84 permanently deactivated.
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {eventType === 'wrecked_expedition_buggy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex gap-4 items-start">
                <Disc className="w-6 h-6 text-cyan-400 shrink-0 mt-1" />
                <div className="space-y-2 text-xs md:text-sm font-mono text-slate-200">
                  <p>
                    An overturned research rover lies crushed against a boulder. Its markings match MULE's chassis series: Nomad Cruiser 02, driven by Dr. Evelyn Chen during the initial crisis.
                  </p>
                  <p className="text-slate-300">
                    The cockpit has been weathered by acid rain, but the sealed black-box flight recorder and encrypted personal terminal remain intact.
                  </p>
                </div>
              </div>

              {outcomeMessage ? (
                <div className="p-4 rounded-xl border border-cyan-500/40 bg-cyan-950/30 text-xs md:text-sm font-mono text-cyan-200">
                  {outcomeMessage}
                </div>
              ) : hasDrChenKey ? (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs font-mono text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Dr. Chen's Master Security Key is secured in your inventory.</span>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    onClick={handleSearchBuggy}
                    className="w-full p-4 rounded-xl border border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-200 font-cyber font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
                  >
                    <Key className="w-4 h-4 text-cyan-400" />
                    <span>SEARCH CABIN & EXTRACT ENCRYPTED DATADISK</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {eventType === 'roadside_repair_station' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex gap-4 items-start">
                <BatteryCharging className="w-6 h-6 text-emerald-400 shrink-0 mt-1" />
                <div className="space-y-1 text-xs md:text-sm font-mono text-slate-200">
                  <p className="font-semibold text-emerald-300">
                    Autonomous Solar Recharging Depot #09
                  </p>
                  <p className="text-slate-400">
                    A forgotten highway maintenance hub with functional photovoltaic collector arrays and a basic nanite fabricator.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    audioEngine.playBreachSuccess();
                    onRoadsideRecharge();
                  }}
                  className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-left flex flex-col justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-cyber font-bold text-xs uppercase text-emerald-300 mb-1">
                    <Battery className="w-4 h-4 text-emerald-400" />
                    <span>SUPERCHARGE BATTERY</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Connect high-voltage cable. Restores +40% Battery capacity.
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (stats.scrap >= 35) {
                      audioEngine.playRepairSound();
                      onRoadsideCraftPart();
                    }
                  }}
                  disabled={stats.scrap < 35}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    stats.scrap >= 35
                      ? 'border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-200'
                      : 'border-slate-800 bg-slate-900/40 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2 font-cyber font-bold text-xs uppercase text-cyan-300 mb-1">
                    <Wrench className="w-4 h-4 text-cyan-400" />
                    <span>FABRICATE SPARE PART</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Cost: 35 Scrap. Assembles 1 Nanite Spare Part for repairs.
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            RESUME EXPEDITION
          </button>
        </div>
      </div>
    </div>
  );
};
