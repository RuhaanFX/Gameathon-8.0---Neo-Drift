import React, { useState, useEffect } from 'react';
import { Shield, Fuel, Wrench, Zap, Play, ChevronRight, Terminal, Compass, Eye } from 'lucide-react';

interface SettingIntroModalProps {
  onBeginGame: () => void;
  onSkip?: () => void;
}

const INTRO_BEATS = [
  {
    chapter: 'CH. 01 // THE COLLAPSE',
    title: 'THE YEAR IS 2088',
    subtitle: 'FOUR DECADES AFTER THE PACIFIC GRID COLLAPSE',
    text: 'When the Continental AI Network fractured in 2048, human civilization split in two. The megacorporations sealed themselves inside towering, neon-shielded Megacities—leaving the vast irradiated badlands of Sector 09 to rust and ruin.',
    highlight: 'Outside the city walls, only the Nomads remain.',
    badge: 'HISTORICAL ARCHIVE',
    accentColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/40',
  },
  {
    chapter: 'CH. 02 // RIG SURVIVAL',
    title: 'THE MULE 4X4 & RESOURCE ECONOMY',
    subtitle: 'TWO RESOURCES KEEP YOU BREATHING IN THE WASTELAND',
    text: 'You pilot the MULE—a heavily armored 4x4 off-road rig. Survival hinges on two critical resources:\n\n• FUEL: Powers your high-torque turbine. If your fuel runs completely dry, your engine stalls dead in the dunes.\n• SCRAPS: Metal salvaged from ruined installations. Used to patch hull breaches, fix mechanical breakdowns, or synthesize emergency propellant.',
    highlight: 'Run out of fuel? Deploy on foot to scavenge canisters, or synthesize emergency fuel with 15 Scrap.',
    badge: 'SURVIVAL PROTOCOL',
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/40',
  },
  {
    chapter: 'CH. 03 // DRONE THREAT & TECH CORES',
    title: 'PATROL DRONES & OVERCLOCKING',
    subtitle: 'MILITARY CORES DROPPED BY NEUTRALIZED DRONES',
    text: 'Aegis Security combat drones prowl the ruined highway corridors. Ram them or blast them with your EMP shockwave [SPACE]. Downed drones eject Rare Tech Cores—allowing you to field-upgrade your rover:',
    highlight: 'Choose between High-Torque Speed, Reinforced Nano-Plating, or Fuel Efficiency!',
    badge: 'TACTICAL TELEMETRY',
    accentColor: 'text-fuchsia-400',
    borderColor: 'border-fuchsia-500/40',
  },
];

export const SettingIntroModal: React.FC<SettingIntroModalProps> = ({
  onBeginGame,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const activeBeat = INTRO_BEATS[currentStep];
  const isLastStep = currentStep === INTRO_BEATS.length - 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (isLastStep) {
          onBeginGame();
        } else {
          setCurrentStep((prev) => prev + 1);
        }
      } else if (e.code === 'Escape') {
        if (onSkip) onSkip();
        else onBeginGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isLastStep, onBeginGame, onSkip]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md select-none animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col justify-between overflow-hidden">
        {/* Subtle scanline and grid background overlay */}
        <div className="absolute inset-0 bg-radial from-cyan-950/20 via-transparent to-transparent pointer-events-none" />

        {/* Top Header: Step Indicator & Skip Button */}
        <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-cyber font-bold text-xs tracking-widest text-cyan-400 uppercase">
              {activeBeat.chapter}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {INTRO_BEATS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStep ? 'w-8 bg-cyan-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
                title={`Go to slide ${idx + 1}`}
              />
            ))}

            <button
              onClick={onSkip || onBeginGame}
              className="ml-3 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors px-2.5 py-1 rounded bg-slate-900 border border-slate-800 cursor-pointer"
            >
              SKIP INTRO
            </button>
          </div>
        </div>

        {/* Middle Content Section */}
        <div className="relative z-10 my-2">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-widest px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              {activeBeat.badge}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {activeBeat.subtitle}
            </span>
          </div>

          <h2 className="font-cyber font-black text-2xl sm:text-3xl tracking-wide text-slate-100 mb-4">
            {activeBeat.title}
          </h2>

          <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-4 sm:p-5 mb-4">
            <p className="text-slate-200 text-sm sm:text-base font-sans leading-relaxed whitespace-pre-line">
              {activeBeat.text}
            </p>
          </div>

          {/* Key Survival Highlight Box */}
          <div className={`p-3.5 rounded-xl border bg-slate-950/80 ${activeBeat.borderColor} flex items-start gap-3`}>
            {currentStep === 0 ? (
              <Compass className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            ) : currentStep === 1 ? (
              <Fuel className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <Zap className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs sm:text-sm font-mono text-slate-200">
              <span className="font-bold text-slate-100 mr-1.5">INTELLIGENCE:</span>
              <span>{activeBeat.highlight}</span>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="relative z-10 border-t border-slate-800/80 pt-5 mt-5 flex items-center justify-between gap-4">
          <div className="text-xs font-mono text-slate-400 hidden sm:block">
            <span>Press </span>
            <kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700 text-slate-300">
              SPACE
            </kbd>
            <span> or </span>
            <kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700 text-slate-300">
              ENTER
            </kbd>
            <span> to advance</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 font-cyber font-bold text-xs uppercase cursor-pointer"
              >
                BACK
              </button>
            )}

            {isLastStep ? (
              <button
                onClick={onBeginGame}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-cyber font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/30 cursor-pointer active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>BEGIN EXPEDITION</span>
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95 transition-all"
              >
                <span>CONTINUE</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
