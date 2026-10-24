import React from 'react';
import { Gauge, Shield, Fuel, Zap, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { DroneUpgradeChoice, VehicleStats, VehicleUpgrades } from '../types/game';

interface DroneUpgradeModalProps {
  onSelectUpgrade: (choice: DroneUpgradeChoice) => void;
  currentStats: VehicleStats;
  currentUpgrades: VehicleUpgrades;
}

interface OptionConfig {
  id: DroneUpgradeChoice;
  title: string;
  category: string;
  icon: React.ReactNode;
  accentBorder: string;
  accentBg: string;
  accentText: string;
  headlineBonus: string;
  perks: string[];
  description: string;
}

export const DroneUpgradeModal: React.FC<DroneUpgradeModalProps> = ({
  onSelectUpgrade,
  currentStats,
  currentUpgrades,
}) => {
  const options: OptionConfig[] = [
    {
      id: 'speed',
      title: 'TURBINE SUPERCHARGER',
      category: 'SPEED & ACCELERATION',
      icon: <Gauge className="w-6 h-6 text-cyan-400" />,
      accentBorder: 'border-cyan-500/70 hover:border-cyan-400',
      accentBg: 'bg-cyan-950/40 hover:bg-cyan-950/70',
      accentText: 'text-cyan-400',
      headlineBonus: '+15 KM/H TOP SPEED // +25% ACCELERATION',
      perks: [
        `Engine Level ${currentUpgrades.engineLevel} → ${currentUpgrades.engineLevel + 1}`,
        'Increased torque for steep dune climbs',
        'Enhanced turbo boost velocity cap',
      ],
      description: 'Rewires high-frequency drone turbine coils directly into the MULE transmission for blistering desert sprint speeds.',
    },
    {
      id: 'durability',
      title: 'REINFORCED NANO-PLATING',
      category: 'DURABILITY & ARMOR',
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
      accentBorder: 'border-emerald-500/70 hover:border-emerald-400',
      accentBg: 'bg-emerald-950/40 hover:bg-emerald-950/70',
      accentText: 'text-emerald-400',
      headlineBonus: '+35 MAX HULL // +60 REPAIR INTEGRITY',
      perks: [
        `Hull Level ${currentUpgrades.hullLevel} → ${currentUpgrades.hullLevel + 1}`,
        `Max Hull: ${currentStats.maxHealth} → ${currentStats.maxHealth + 35}`,
        'Absorbs high-speed rock & drone collision shocks',
      ],
      description: 'Fuses drone ballistic composite tiles into the cruiser undercarriage and side cowlings to shrug off harsh wasteland hazards.',
    },
    {
      id: 'efficiency',
      title: 'ECO-BURN FUEL REACTOR',
      category: 'FUEL EFFICIENCY & REFUEL',
      icon: <Fuel className="w-6 h-6 text-amber-400" />,
      accentBorder: 'border-amber-500/70 hover:border-amber-400',
      accentBg: 'bg-amber-950/40 hover:bg-amber-950/70',
      accentText: 'text-amber-400',
      headlineBonus: '-35% FUEL BURN RATE // +50% INSTANT FUEL',
      perks: [
        'Extends driving range between scavenging runs',
        'Instant emergency fuel synthesis (+50% tank fill)',
        'Synthesize fuel with 30% fewer scraps',
      ],
      description: 'Installs an adaptive micro-distiller that purifies low-grade badland petroleum and extends combustion cycles.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(168,85,247,0.3)] overflow-hidden">
        {/* Glow corner accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-fuchsia-950/80 border border-fuchsia-500/80 text-fuchsia-400">
              <Sparkles className="w-6 h-6 animate-spin [animation-duration:8s]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-cyber font-black text-lg sm:text-xl text-slate-100 uppercase tracking-wider">
                  RARE TECH CORE SALVAGED
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/50 uppercase font-bold">
                  MILITARY SPEC
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Downed patrol drone core extracted. Select 1 field overclock to permanently upgrade your MULE 4x4 rig.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Choices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {options.map((opt) => (
            <div
              key={opt.id}
              onClick={() => onSelectUpgrade(opt.id)}
              className={`rounded-2xl border p-5 transition-all cursor-pointer flex flex-col justify-between group shadow-lg ${opt.accentBorder} ${opt.accentBg}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 group-hover:scale-110 transition-transform">
                    {opt.icon}
                  </div>
                  <span className={`text-[10px] font-mono font-bold tracking-wider uppercase ${opt.accentText}`}>
                    {opt.category}
                  </span>
                </div>

                <h3 className="font-cyber font-bold text-sm text-slate-100 group-hover:text-white transition-colors mb-2">
                  {opt.title}
                </h3>

                <div className={`text-xs font-mono font-bold mb-3 ${opt.accentText}`}>
                  {opt.headlineBonus}
                </div>

                <p className="text-xs text-slate-300 font-sans leading-relaxed mb-4">
                  {opt.description}
                </p>

                <div className="space-y-1.5 border-t border-slate-800/80 pt-3">
                  {opt.perks.map((perk, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] font-mono text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectUpgrade(opt.id);
                }}
                className={`mt-5 w-full py-2.5 rounded-xl font-cyber font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 bg-slate-900 group-hover:bg-slate-800 text-slate-200 border border-slate-700 group-hover:border-slate-500`}
              >
                <span>INSTALL OVERCLOCK</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer info note */}
        <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>More tech cores can be salvaged by disabling Aegis patrol drones with your EMP shockwave [SPACE].</span>
          <span className="text-slate-500">MULE FIELD WORKBENCH</span>
        </div>
      </div>
    </div>
  );
};
