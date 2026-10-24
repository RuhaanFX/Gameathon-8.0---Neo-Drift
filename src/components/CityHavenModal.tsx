import React, { useState } from 'react';
import {
  Wrench,
  ShoppingBag,
  MessageSquare,
  BookOpen,
  ArrowRight,
  Shield,
  Zap,
  Fuel,
  Disc,
  Check,
  Sparkles,
  Cpu,
  Terminal,
  Activity,
} from 'lucide-react';
import { CityData, StoryLog, VehicleStats, VehicleUpgrades, CyberwareItem } from '../types/game';
import { UPGRADES_CATALOG, UpgradeItem, CYBERWARE_CATALOG } from '../data/gameContent';
import { audioEngine } from '../audio/audioEngine';

interface CityHavenModalProps {
  city: CityData;
  stats: VehicleStats;
  upgrades: VehicleUpgrades;
  storyLogs: StoryLog[];
  cyberwareList: CyberwareItem[];
  onUpgrade: (upgrade: UpgradeItem) => void;
  onRepairVehicle: () => void;
  onRefuelVehicle: () => void;
  onBuySpareParts: () => void;
  onInstallCyberware: (item: CyberwareItem) => void;
  onContinueDriving: () => void;
}

export const CityHavenModal: React.FC<CityHavenModalProps> = ({
  city,
  stats,
  upgrades,
  storyLogs,
  cyberwareList,
  onUpgrade,
  onRepairVehicle,
  onRefuelVehicle,
  onBuySpareParts,
  onInstallCyberware,
  onContinueDriving,
}) => {
  const [activeTab, setActiveTab] = useState<'garage' | 'ripperdoc' | 'bazaar' | 'cantina' | 'logs'>('garage');
  const [selectedDialogueIndex, setSelectedDialogueIndex] = useState(0);

  const repairCost = Math.round((stats.maxHealth - stats.health) * 0.8);
  const refuelCost = Math.round((100 - stats.fuel) * 0.5);

  const getUpgradeCurrentTier = (category: string) => {
    switch (category) {
      case 'hull':
        return upgrades.hullLevel;
      case 'engine':
        return upgrades.engineLevel;
      case 'suspension':
        return upgrades.suspensionLevel;
      case 'emp':
        return upgrades.empLevel;
      case 'solar':
        return upgrades.solarLevel;
      case 'drone':
        return upgrades.droneLevel;
      default:
        return 1;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-950/85 backdrop-blur-md select-none overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl border border-cyan-500/30 bg-[#090c15] text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Hero Banner with City Garage Art */}
        <div className="relative h-44 md:h-52 w-full overflow-hidden shrink-0">
          <img
            src="/src/assets/images/city_haven_garage_1792678900378.jpg"
            alt={city.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center brightness-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090c15] via-[#090c15]/60 to-transparent" />

          {/* City Title & Specs */}
          <div className="absolute bottom-4 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-1">
                {city.subtitle}
              </div>
              <h2 className="text-2xl md:text-3xl font-cyber font-bold text-white tracking-wide">
                {city.name}
              </h2>
            </div>

            {/* Currencies & Ready CTA */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-1.5 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <Disc className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">Scrap</span>
                  <span className="font-mono-nums font-bold text-amber-300">{stats.scrap}</span>
                </div>
                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
                  <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-400">Parts</span>
                  <span className="font-mono-nums font-bold text-emerald-300">{stats.spareParts}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  audioEngine.playRepairSound();
                  onContinueDriving();
                }}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95"
                title="Exit city menu and drive back into the open wasteland"
              >
                <span>HIT HIGHWAY</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <button
            onClick={() => setActiveTab('garage')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-cyber font-semibold tracking-wider transition-colors border-b-2 cursor-pointer ${
              activeTab === 'garage'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>CYBER GARAGE</span>
          </button>

          <button
            onClick={() => setActiveTab('ripperdoc')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-cyber font-semibold tracking-wider transition-colors border-b-2 cursor-pointer ${
              activeTab === 'ripperdoc'
                ? 'border-fuchsia-400 text-fuchsia-400 bg-fuchsia-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>RIPPERDOC CLINIC</span>
          </button>

          <button
            onClick={() => setActiveTab('bazaar')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-cyber font-semibold tracking-wider transition-colors border-b-2 cursor-pointer ${
              activeTab === 'bazaar'
                ? 'border-amber-400 text-amber-400 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>NEON BAZAAR</span>
          </button>

          <button
            onClick={() => setActiveTab('cantina')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-cyber font-semibold tracking-wider transition-colors border-b-2 cursor-pointer ${
              activeTab === 'cantina'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>CANTINA & LOCALS</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-cyber font-semibold tracking-wider transition-colors border-b-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'border-purple-400 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>STORY LOGS</span>
          </button>
        </div>

        {/* Tab Content Panes */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-200">
          {/* TAB 1: CYBER GARAGE */}
          {activeTab === 'garage' && (
            <div className="space-y-6">
              {/* Quick Service Station */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <h3 className="font-cyber text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">
                  Vehicle Maintenance Bay
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Repair Hull */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-cyan-400" />
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Restore Hull Integrity</div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Current: {Math.round(stats.health)} / {stats.maxHealth} HP
                        </div>
                      </div>
                    </div>
                    {stats.health < stats.maxHealth ? (
                      <button
                        onClick={onRepairVehicle}
                        disabled={stats.scrap < repairCost}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-mono text-xs font-bold cursor-pointer"
                      >
                        Repair ({repairCost} Scrap)
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Optimal
                      </span>
                    )}
                  </div>

                  {/* Refuel Tank */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <Fuel className="w-5 h-5 text-amber-400" />
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Refill Quantum Fuel</div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Tank Level: {Math.round(stats.fuel)}%
                        </div>
                      </div>
                    </div>
                    {stats.fuel < 100 ? (
                      <button
                        onClick={onRefuelVehicle}
                        disabled={stats.scrap < refuelCost}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-mono text-xs font-bold cursor-pointer"
                      >
                        Refuel ({refuelCost} Scrap)
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Full
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hardware Upgrades Catalog */}
              <div>
                <h3 className="font-cyber text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">
                  Cruiser Hardware Upgrades
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {UPGRADES_CATALOG.map((item) => {
                    const currentTier = getUpgradeCurrentTier(item.category);
                    const isInstalled = currentTier >= item.tier;
                    const canAfford = stats.scrap >= item.costScrap && stats.spareParts >= item.costParts;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                          isInstalled
                            ? 'bg-slate-900/30 border-slate-800 text-slate-400'
                            : 'bg-slate-900/80 border-slate-700/80 text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-cyber font-bold text-xs text-slate-100">{item.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                              TIER {item.tier}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mb-3">{item.description}</p>
                          <div className="text-[11px] font-mono text-cyan-300 font-semibold mb-4">
                            ★ {item.statBonus}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                          <div className="text-xs font-mono text-slate-300">
                            Cost:{' '}
                            <strong className="text-amber-400 font-mono-nums">{item.costScrap} Scrap</strong> +{' '}
                            <strong className="text-emerald-400 font-mono-nums">{item.costParts} Parts</strong>
                          </div>

                          {isInstalled ? (
                            <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Installed
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                audioEngine.playRepairSound();
                                onUpgrade(item);
                              }}
                              disabled={!canAfford}
                              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-cyber font-bold text-xs uppercase cursor-pointer"
                            >
                              Install Upgrade
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: RIPPERDOC CLINIC */}
          {activeTab === 'ripperdoc' && (
            <div className="space-y-6">
              {/* Ripperdoc Intro Banner */}
              <div className="bg-slate-900/60 border border-fuchsia-500/30 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-fuchsia-950/80 border border-fuchsia-500/50 flex items-center justify-center text-fuchsia-400 shrink-0">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-fuchsia-400 uppercase tracking-widest font-cyber">
                      CHROME CLINIC · DR. SILAS "CHROME" VANE
                    </div>
                    <h3 className="font-cyber font-bold text-sm md:text-base text-white">
                      Black-Market Cyberware Implants
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      "Sit back in the surgical chair, drifter. We weld military-grade cybernetics into neural cortex and vehicle rig alike."
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono">
                  <Cpu className="w-4 h-4 text-fuchsia-400" />
                  <span className="text-slate-400">Active Implants:</span>
                  <span className="font-bold text-fuchsia-300">
                    {cyberwareList.filter((c) => c.installed).length} Installed
                  </span>
                </div>
              </div>

              {/* Cyberware Catalog */}
              <div>
                <h3 className="font-cyber text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">
                  Surgical Implants & Rig Cybernetics
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CYBERWARE_CATALOG.map((item) => {
                    const isInstalled = cyberwareList.some((c) => c.id === item.id && c.installed);
                    const canAfford = stats.scrap >= item.costScrap && stats.spareParts >= item.costParts;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                          isInstalled
                            ? 'bg-fuchsia-950/20 border-fuchsia-500/60 shadow-md shadow-fuchsia-500/10'
                            : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-cyber font-bold text-xs text-slate-100 flex items-center gap-1.5">
                              <Cpu className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                              {item.name}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-fuchsia-950 border border-fuchsia-500/40 text-fuchsia-300 font-bold uppercase">
                              {item.slot}
                            </span>
                          </div>

                          <div className="text-[10px] font-mono text-slate-500 mb-2">
                            {item.brand} · Tier {item.tier}
                          </div>

                          <p className="text-xs text-slate-300 mb-3">{item.description}</p>

                          <div className="text-[11px] font-mono text-fuchsia-300 font-semibold mb-4 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                            ⚡ {item.perkSummary}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                          <div className="text-xs font-mono text-slate-300">
                            {!isInstalled ? (
                              <div className="flex items-center gap-3">
                                <span className={stats.scrap >= item.costScrap ? 'text-amber-300' : 'text-rose-400'}>
                                  {item.costScrap} Scrap
                                </span>
                                {item.costParts > 0 && (
                                  <span className={stats.spareParts >= item.costParts ? 'text-emerald-300' : 'text-rose-400'}>
                                    {item.costParts} Parts
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1.5 text-xs">
                                <Check className="w-3.5 h-3.5" /> Cyberware Active
                              </span>
                            )}
                          </div>

                          {!isInstalled && (
                            <button
                              onClick={() => {
                                audioEngine.playCyberwareInstall();
                                onInstallCyberware(item);
                              }}
                              disabled={!canAfford}
                              className={`px-3.5 py-1.5 rounded-lg font-cyber font-bold text-xs tracking-wider uppercase cursor-pointer transition-all ${
                                canAfford
                                  ? 'bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 shadow-md shadow-fuchsia-500/20 active:scale-95'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              Install Implant
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NEON BAZAAR */}
          {activeTab === 'bazaar' && (
            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <h3 className="font-cyber text-xs text-amber-400 font-bold uppercase tracking-wider mb-2">
                  Roadside Preparedness Market
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Keep spare nanite components in your cargo bay. When tire punctures or alternator
                  glitches occur on the road, you can patch them immediately.
                </p>

                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 max-w-md">
                  <div className="flex items-center gap-3">
                    <Wrench className="w-6 h-6 text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold text-slate-200">Nanite Spare Parts Crate (+1)</div>
                      <div className="text-[11px] font-mono text-slate-400">Used for quick roadside repairs</div>
                    </div>
                  </div>
                  <button
                    onClick={onBuySpareParts}
                    disabled={stats.scrap < 25}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-cyber font-bold text-xs uppercase cursor-pointer"
                  >
                    Buy (25 Scrap)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CANTINA & LOCALS */}
          {activeTab === 'cantina' && (
            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <div className="text-xs font-cyber text-emerald-400 font-bold uppercase tracking-wider mb-2">
                  The Neon Lotus Cantina
                </div>
                <p className="text-xs text-slate-400 mb-6 italic">{city.loreSnippet}</p>

                {/* Character Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {city.cantinaDialogue.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedDialogueIndex(idx)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedDialogueIndex === idx
                          ? 'bg-slate-900 border-emerald-500/80 shadow-md'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-cyber font-bold text-xs text-slate-100">{item.speaker}</span>
                        <span className="text-[10px] font-mono text-emerald-400">{item.role}</span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-3">"{item.text}"</p>
                    </div>
                  ))}
                </div>

                {/* Active Dialogue Readout */}
                <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-emerald-500/40">
                  <div className="flex items-center gap-2 mb-2 font-cyber text-xs text-emerald-300 font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Talking with {city.cantinaDialogue[selectedDialogueIndex].speaker}:</span>
                  </div>
                  <blockquote className="text-sm text-slate-200 leading-relaxed italic">
                    "{city.cantinaDialogue[selectedDialogueIndex].text}"
                  </blockquote>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STORY LOGS JOURNAL */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="text-xs font-cyber text-purple-400 font-bold uppercase tracking-wider mb-3">
                Recovered Wasteland Transmission Archives
              </div>

              <div className="space-y-3">
                {storyLogs.map((log) => (
                  <div key={log.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-cyber text-xs font-bold text-purple-300">{log.title}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {log.author} · {log.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{log.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
