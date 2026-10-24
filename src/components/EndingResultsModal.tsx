import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Shield,
  Radio,
  Flame,
  Award,
  RotateCcw,
  Compass,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { CampaignEndingType, CampaignStoryState, VehicleStats } from '../types/game';
import { ENDINGS_DATA } from '../data/gameContent';
import { audioEngine } from '../audio/audioEngine';

interface EndingResultsModalProps {
  endingType: CampaignEndingType;
  campaignState: CampaignStoryState;
  stats: VehicleStats;
  onRestartCampaign: () => void;
  onContinueFreeRoam: () => void;
}

export const EndingResultsModal: React.FC<EndingResultsModalProps> = ({
  endingType,
  campaignState,
  stats,
  onRestartCampaign,
  onContinueFreeRoam,
}) => {
  const ending = ENDINGS_DATA[endingType];
  const [currentNarrativeStep, setCurrentNarrativeStep] = useState(0);
  const [showDebrief, setShowDebrief] = useState(false);

  useEffect(() => {
    audioEngine.playBreachSuccess();
  }, []);

  const handleNextNarration = () => {
    audioEngine.playScrapChime();
    if (currentNarrativeStep < ending.narrationLines.length - 1) {
      setCurrentNarrativeStep((prev) => prev + 1);
    } else {
      setShowDebrief(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-xl select-none overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-cyan-500/40 bg-[#070b14] text-slate-100 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Banner with Ending Status */}
        <div className="px-6 py-4 border-b border-cyan-500/20 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${ending.badgeColor}`}>
              {ending.badgeText}
            </span>
            <span className="font-cyber font-bold text-sm text-slate-200">
              EXPEDITION COMPLETE // SECTOR 18 REACHED
            </span>
          </div>

          <div className="text-xs font-mono text-slate-400">
            FINAL EPILOGUE
          </div>
        </div>

        {/* Dynamic Sequence Content */}
        {!showDebrief ? (
          <div className="p-8 md:p-12 flex flex-col justify-between min-h-[380px] space-y-8">
            <div className="space-y-4">
              <h1 className="text-2xl md:text-3xl font-cyber font-bold tracking-wide text-white">
                {ending.title}
              </h1>
              <p className="text-sm md:text-base font-mono text-cyan-400/90 italic">
                “{ending.tagline}”
              </p>
            </div>

            {/* Typewriter-Style Narration Card */}
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-700/60 text-slate-200 font-mono text-sm md:text-base leading-relaxed min-h-[140px] flex items-center">
              <p className="animate-fadeIn">
                {ending.narrationLines[currentNarrativeStep]}
              </p>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="text-xs font-mono text-slate-400">
                Transmission {currentNarrativeStep + 1} of {ending.narrationLines.length}
              </div>

              <button
                onClick={handleNextNarration}
                className="px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <span>{currentNarrativeStep < ending.narrationLines.length - 1 ? 'CONTINUE' : 'VIEW EXPEDITION SCORECARD'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Mission Scorecard & Decisions Debrief */
          <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-cyber font-bold text-white tracking-wide">
                EXPEDITION DEBRIEF & CONSEQUENCES
              </h2>
              <p className="text-xs font-mono text-cyan-400">
                Official transmission logged to Haven-9 Survival Council
              </p>
            </div>

            {/* Fates Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
                <span className="text-[11px] font-cyber font-bold text-cyan-400 block uppercase">
                  Haven-9 Fate
                </span>
                <p className="text-xs font-mono text-slate-300 leading-relaxed">
                  {ending.havenFate}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
                <span className="text-[11px] font-cyber font-bold text-amber-400 block uppercase">
                  AEGIS Intelligence
                </span>
                <p className="text-xs font-mono text-slate-300 leading-relaxed">
                  {ending.aegisFate}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
                <span className="text-[11px] font-cyber font-bold text-emerald-400 block uppercase">
                  Wasteland Roads
                </span>
                <p className="text-xs font-mono text-slate-300 leading-relaxed">
                  {ending.wastelandFate}
                </p>
              </div>
            </div>

            {/* Campaign Decisions Summary */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="font-cyber font-bold text-xs uppercase text-slate-300 flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" />
                <span>KEY DECISIONS & METRICS RECORD</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">TOTAL DISTANCE:</span>
                  <span className="text-cyan-300 font-bold">{stats.odometer.toFixed(2)} km</span>
                </div>

                <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">UNIT TX-84:</span>
                  <span className={`font-bold ${campaignState.helpedMaintenanceUnit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {campaignState.helpedMaintenanceUnit ? 'Repaired & Allied' : 'Salvaged / Left'}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">DR. CHEN DATA:</span>
                  <span className={`font-bold ${campaignState.hasDrChenKey ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {campaignState.hasDrChenKey ? 'Recovered' : 'Not Found'}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">MULE HULL STATUS:</span>
                  <span className="text-slate-200 font-bold">{stats.health} / {stats.maxHealth} HP</span>
                </div>
              </div>

              <div className="text-xs font-mono text-cyan-300/90 italic pt-2 border-t border-slate-800/80">
                {ending.toneQuote}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                onClick={onRestartCampaign}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-cyber font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>START NEW CAMPAIGN</span>
              </button>

              <button
                onClick={onContinueFreeRoam}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>CONTINUE FREE ROAM // EXPLORE WASTES</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
