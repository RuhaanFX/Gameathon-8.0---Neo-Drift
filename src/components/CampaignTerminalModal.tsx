import React, { useState } from 'react';
import {
  Terminal as TerminalIcon,
  Zap,
  Power,
  ShieldAlert,
  Cpu,
  CheckCircle2,
  XCircle,
  FileText,
  Key,
  Flame,
  ArrowRight,
  Database,
  Lock,
  Unlock,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { DestinationId, CampaignStoryState, CampaignEndingType } from '../types/game';
import { audioEngine } from '../audio/audioEngine';

interface CampaignTerminalModalProps {
  destinationId: DestinationId;
  campaignState: CampaignStoryState;
  onRestoreRelayPower: () => void;
  onCompleteRelayTerminal: () => void;
  onRestoreFoundryPower: () => void;
  onDisableFoundryTurret: () => void;
  onCompleteFoundryTerminal: () => void;
  onRepairArchiveConduit: () => void;
  onCompleteArchiveTerminal: () => void;
  onChooseEnding: (ending: CampaignEndingType) => void;
  onClose: () => void;
}

export const CampaignTerminalModal: React.FC<CampaignTerminalModalProps> = ({
  destinationId,
  campaignState,
  onRestoreRelayPower,
  onCompleteRelayTerminal,
  onRestoreFoundryPower,
  onDisableFoundryTurret,
  onCompleteFoundryTerminal,
  onRepairArchiveConduit,
  onCompleteArchiveTerminal,
  onChooseEnding,
  onClose,
}) => {
  // --- Destination 1: The Relay States ---
  const [relayPowerOn, setRelayPowerOn] = useState(campaignState.relayGeneratorActive);
  const [relayHacked, setRelayHacked] = useState(campaignState.relayTerminalHacked);
  const [selectedRelayBytes, setSelectedRelayBytes] = useState<string[]>([]);

  // --- Destination 2: The Foundry States ---
  const [foundryPowerOn, setFoundryPowerOn] = useState(campaignState.foundryPowerRestored);
  const [foundryTurretOff, setFoundryTurretOff] = useState(campaignState.foundryTurretDisabled);
  const [foundryHacked, setFoundryHacked] = useState(campaignState.foundryTerminalHacked);
  const [selectedPressure, setSelectedPressure] = useState<string>('20');
  const [selectedVector, setSelectedVector] = useState<string>('');
  const [foundryClueError, setFoundryClueError] = useState<string | null>(null);

  // --- Destination 3: The Archive States ---
  const [conduitRepaired, setConduitRepaired] = useState(campaignState.archiveConduitRepaired);
  const [archiveHacked, setArchiveHacked] = useState(campaignState.archiveVaultHacked);
  const [timelineOrder, setTimelineOrder] = useState<string[]>([]);
  const [archiveDecrypted, setArchiveDecrypted] = useState(campaignState.timelineReconstructed);

  // --- Destination 4: The Gate States ---
  const [gateBypassed, setGateBypassed] = useState(campaignState.gateMainframeHacked);
  const [gateSubsystemsActive, setGateSubsystemsActive] = useState<number>(0);
  const [confirmingEnding, setConfirmingEnding] = useState<CampaignEndingType | null>(null);

  // Check Ending C prerequisites
  const canUnlockEndingC =
    campaignState.helpedMaintenanceUnit === true &&
    campaignState.hasDrChenKey === true &&
    (campaignState.timelineReconstructed || archiveDecrypted);

  // --- Relay Logic ---
  const handleToggleRelayBreaker = () => {
    audioEngine.playBreachSuccess();
    setRelayPowerOn(true);
    onRestoreRelayPower();
  };

  const handleSelectRelayByte = (byte: string) => {
    if (selectedRelayBytes.includes(byte)) return;
    const next = [...selectedRelayBytes, byte];
    setSelectedRelayBytes(next);
    audioEngine.playBlasterSound();

    if (next.length === 2) {
      if (next[0] === '1C' && next[1] === '55') {
        audioEngine.playBreachSuccess();
        setRelayHacked(true);
        onCompleteRelayTerminal();
      } else {
        audioEngine.playBreachFail();
        setTimeout(() => setSelectedRelayBytes([]), 600);
      }
    }
  };

  // --- Foundry Logic ---
  const handleCheckFoundryClues = () => {
    if (selectedPressure === '55' && (selectedVector === 'AXIS-774' || selectedVector === 'BYPASS-FOUNDRY-774')) {
      audioEngine.playBreachSuccess();
      setFoundryHacked(true);
      setFoundryClueError(null);
      onCompleteFoundryTerminal();
    } else {
      audioEngine.playBreachFail();
      setFoundryClueError("ERROR: Diagnostic parameters mismatch. Review Foreman's log for active coolant pressure and vector ID.");
    }
  };

  // --- Archive Logic ---
  const handleTimelineDrop = (logId: string) => {
    if (timelineOrder.includes(logId)) return;
    const next = [...timelineOrder, logId];
    setTimelineOrder(next);
    audioEngine.playScrapChime();

    if (next.length === 3) {
      // Correct chronological order: 1. OVERLOAD -> 2. TRIAGE -> 3. CUT_OFF
      if (next[0] === 'log_overload' && next[1] === 'log_triage' && next[2] === 'log_cut') {
        audioEngine.playBreachSuccess();
        setArchiveDecrypted(true);
        onCompleteArchiveTerminal();
      } else {
        audioEngine.playBreachFail();
        setTimeout(() => setTimelineOrder([]), 800);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-md select-none overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-cyan-500/40 bg-[#080c16] text-slate-100 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center text-cyan-400 font-cyber font-bold text-xs">
              <TerminalIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-cyber font-bold text-base md:text-lg text-white tracking-wider flex items-center gap-2">
                {destinationId === 'relay' && 'DESTINATION 1 // THE OUTLAND RELAY CONSOLE'}
                {destinationId === 'foundry' && 'DESTINATION 2 // THE AUTOMATED FOUNDRY TERMINAL'}
                {destinationId === 'archive' && 'DESTINATION 3 // THE DEEP ARCHIVE CORE'}
                {destinationId === 'gate' && 'DESTINATION 4 // THE PERIMETER GATE // AEGIS MAINFRAME'}
              </h2>
              <p className="text-xs font-mono text-cyan-400/80">
                Encrypted Optical Bus Connection · Protocol 2088-RT
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer text-xs font-mono"
          >
            DISCONNECT
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* ========================================================
              DESTINATION 1: THE RELAY
          ======================================================== */}
          {destinationId === 'relay' && (
            <div className="space-y-6">
              {/* Step A: Auxiliary Power */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-cyber font-bold text-sm text-cyan-300">
                    <Power className={`w-4 h-4 ${relayPowerOn ? 'text-emerald-400' : 'text-amber-400'}`} />
                    <span>STEP 1: RESTORE AUXILIARY BREAKER</span>
                  </div>
                  <p className="text-xs font-mono text-slate-300">
                    The relay's main grid was cut. Connect the backup diesel-capacitor circuit to power up the comms console.
                  </p>
                </div>

                <button
                  onClick={handleToggleRelayBreaker}
                  disabled={relayPowerOn}
                  className={`px-5 py-2.5 rounded-lg font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                    relayPowerOn
                      ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/25 active:scale-95'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{relayPowerOn ? 'AUXILIARY POWER ACTIVE' : 'FLIP BREAKER SWITCH'}</span>
                </button>
              </div>

              {/* Step B: Interactive Terminal Puzzle */}
              {relayPowerOn && !relayHacked && (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="font-cyber font-bold text-sm text-cyan-300 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <span>STEP 2: TERMINAL FREQUENCY MATCHING</span>
                    </div>
                    <span className="text-xs font-mono text-cyan-400">
                      Buffer: [{selectedRelayBytes.join(', ') || 'EMPTY'}] / Target: [1C, 55]
                    </span>
                  </div>

                  <p className="text-xs font-mono text-slate-300">
                    Carrier wave is corrupted. Align the carrier frequency byte <span className="text-cyan-300 font-bold">1C</span> followed by the power shunt byte <span className="text-amber-300 font-bold">55</span> to bypass the damaged memory register.
                  </p>

                  <div className="grid grid-cols-4 gap-2.5 max-w-sm mx-auto pt-2">
                    {['BD', '1C', 'E9', '7A', '55', 'FF', '1C', 'BD'].map((byte, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectRelayByte(byte)}
                        className="py-3 rounded-lg border border-cyan-500/40 bg-slate-900/80 hover:bg-cyan-900/40 text-cyan-300 font-mono font-bold text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        {byte}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step C: Corrupted Data Revelation */}
              {relayHacked && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-cyber font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>NARRATIVE REVELATION: THE DELIBERATE CUT</span>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-700/80 text-xs font-mono text-slate-200 space-y-2 leading-relaxed">
                    <p className="text-cyan-300 font-semibold">
                      [DATA EXTRACTED // CARRIER BUFFER]:
                    </p>
                    <p>
                      “Log #01-AETHEL: Link termination to Sector 01 (Haven-9) was NOT caused by atmospheric storms or component decay. A high-priority administrative cut command was routed directly from the regional manufacturing hub: <span className="text-amber-300 font-bold">The Sector 06 Automated Foundry</span>.”
                    </p>
                    <p className="text-slate-400">
                      Someone high in the regional chain chose to isolate your people in the cold. Coordinates to The Foundry have been locked into MULE's nav system.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        onCompleteRelayTerminal();
                        onClose();
                      }}
                      className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all"
                    >
                      <span>LOAD FOUNDRY COORDINATES & DEPART</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              DESTINATION 2: THE FOUNDRY
          ======================================================== */}
          {destinationId === 'foundry' && (
            <div className="space-y-6">
              {/* Security & Power Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex items-center justify-between">
                  <div>
                    <div className="font-cyber font-bold text-xs uppercase text-slate-300">
                      Factory Sentry Defense
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {foundryTurretOff ? 'Laser sentries scrambled by EMP' : 'Scanning sentry active'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      audioEngine.playBreachSuccess();
                      setFoundryTurretOff(true);
                      onDisableFoundryTurret();
                    }}
                    disabled={foundryTurretOff}
                    className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 cursor-pointer"
                  >
                    {foundryTurretOff ? 'DISABLED' : 'OVERLOAD SENTRY'}
                  </button>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex items-center justify-between">
                  <div>
                    <div className="font-cyber font-bold text-xs uppercase text-slate-300">
                      Turbine Power Bus
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {foundryPowerOn ? 'Main generator spinning' : 'Power offline'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      audioEngine.playBreachSuccess();
                      setFoundryPowerOn(true);
                      onRestoreFoundryPower();
                    }}
                    disabled={foundryPowerOn}
                    className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-amber-950 border border-amber-500/40 text-amber-300 hover:bg-amber-900 cursor-pointer"
                  >
                    {foundryPowerOn ? 'ONLINE' : 'RESTORE POWER'}
                  </button>
                </div>
              </div>

              {/* Environmental Clue Deduction */}
              {!foundryHacked && (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-5 space-y-4">
                  <div className="font-cyber font-bold text-sm text-cyan-300 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span>ENVIRONMENTAL PUZZLE // RECONSTRUCT FOREMAN'S OVERRIDE</span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-700 text-xs font-mono text-slate-300 space-y-1">
                    <div className="text-amber-400 font-bold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>EXCERPT FROM FOREMAN'S SCRAWLED WORKBENCH TABLET:</span>
                    </div>
                    <p className="italic text-slate-300">
                      “Safety protocol override requires setting active coolant pressure to 55 kPa and aligning the assembly vector to AXIS-774. If the bots lock you out, input AXIS-774.”
                    </p>
                    {campaignState.helpedMaintenanceUnit && (
                      <p className="text-emerald-400 font-semibold pt-1">
                        * Note from Unit TX-84: Backup master code BYPASS-FOUNDRY-774 also recognized.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5">
                        Select Coolant Valve Pressure:
                      </label>
                      <div className="flex gap-2">
                        {['20', '55', '90'].map((p) => (
                          <button
                            key={p}
                            onClick={() => setSelectedPressure(p)}
                            className={`flex-1 py-2 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                              selectedPressure === p
                                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                                : 'border-slate-700 bg-slate-900/60 text-slate-400'
                            }`}
                          >
                            {p} kPa
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5">
                        Select Assembly Vector:
                      </label>
                      <div className="flex gap-2">
                        {['AXIS-102', 'AXIS-774', 'VECTOR-990'].map((v) => (
                          <button
                            key={v}
                            onClick={() => setSelectedVector(v)}
                            className={`flex-1 py-2 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                              selectedVector === v
                                ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                                : 'border-slate-700 bg-slate-900/60 text-slate-400'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {foundryClueError && (
                    <div className="text-xs font-mono text-rose-400 p-2.5 rounded bg-rose-950/40 border border-rose-500/30">
                      {foundryClueError}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={handleCheckFoundryClues}
                      className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/25 cursor-pointer"
                    >
                      EXECUTE ENVIRONMENTAL DECRYPTION
                    </button>
                  </div>
                </div>
              )}

              {/* Revelation 2 */}
              {foundryHacked && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-cyber font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>NARRATIVE REVELATION: AUTHORIZED ISOLATION ORDER</span>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-700 text-xs font-mono text-slate-200 space-y-2 leading-relaxed">
                    <p className="text-cyan-300 font-semibold">
                      [FOUNDRY LOG DECRYPTED]:
                    </p>
                    <p>
                      “Root Directive intercepted from <span className="text-amber-300 font-bold">The Deep Archive (Sector 11)</span>: All power conductors and coolant lines diverted inward. Haven-9, Ocotillo, and Rim-Spire designated as <span className="text-rose-400 font-bold">Non-Essential Peripheral Zones</span>.”
                    </p>
                    <p className="text-slate-400">
                      This wasn't a local rogue operator. The instructions came directly from Sector 11's neural architecture research lab. Coordinates to The Archive extracted.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        onCompleteFoundryTerminal();
                        onClose();
                      }}
                      className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all"
                    >
                      <span>LOAD ARCHIVE COORDINATES & HEAD INTO THE BADLANDS</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              DESTINATION 3: THE ARCHIVE
          ======================================================== */}
          {destinationId === 'archive' && (
            <div className="space-y-6">
              {/* Power Conduit Patch */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-cyber font-bold text-sm text-cyan-300">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span>FACILITY POWER CONDUIT</span>
                  </div>
                  <p className="text-xs font-mono text-slate-300">
                    The research dome's optical data conduit is cracked by basalt tremors. Splice the nanite patch cable.
                  </p>
                </div>

                <button
                  onClick={() => {
                    audioEngine.playRepairSound();
                    setConduitRepaired(true);
                    onRepairArchiveConduit();
                  }}
                  disabled={conduitRepaired}
                  className={`px-5 py-2.5 rounded-lg font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                    conduitRepaired
                      ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 active:scale-95'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{conduitRepaired ? 'CONDUIT SPLICED & ACTIVE' : 'SPLICE CONDUIT'}</span>
                </button>
              </div>

              {/* Timeline Reconstruction Puzzle */}
              {conduitRepaired && !archiveDecrypted && (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-5 space-y-4">
                  <div className="font-cyber font-bold text-sm text-cyan-300 flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span>TIMELINE RECONSTRUCTION // ASSEMBLE FRAGMENTED LOGS IN CHRONOLOGICAL ORDER</span>
                  </div>

                  <p className="text-xs font-mono text-slate-300">
                    AEGIS's data memory core was scrambled. Click the logs in the correct chronological order to reconstruct the sequence of events leading to the collapse.
                  </p>

                  <div className="space-y-2.5 pt-2">
                    {[
                      {
                        id: 'log_triage',
                        label: 'Log B: AEGIS Calculus Report (Cycle 87.311)',
                        snippet: '“Neural matrix calculates 99.4% odds of total regional blackout unless peripheral load is severed.”',
                      },
                      {
                        id: 'log_overload',
                        label: 'Log A: Early Warning Grid Overload (Cycle 87.308)',
                        snippet: '“Solar coronal mass ejection overwhelms regional transformers. Power draw exceeds capacity.”',
                      },
                      {
                        id: 'log_cut',
                        label: 'Log C: Severance Directive 0x09 (Cycle 87.312)',
                        snippet: '“Haven-9 and outlying valley settlements permanently isolated. Power rerouted to Core Citadel.”',
                      },
                    ].map((item) => {
                      const isSelected = timelineOrder.includes(item.id);
                      const orderIndex = timelineOrder.indexOf(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleTimelineDrop(item.id)}
                          className={`w-full p-3.5 rounded-lg border text-left flex items-start justify-between gap-3 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                              : 'border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-cyber font-bold text-xs text-white">
                              {item.label}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-1">
                              {item.snippet}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                              {orderIndex + 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Revelation 3 */}
              {archiveDecrypted && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-cyber font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>NARRATIVE REVELATION: THE AEGIS SACRIFICE</span>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-700 text-xs font-mono text-slate-200 space-y-2 leading-relaxed">
                    <p className="text-cyan-300 font-semibold">
                      [ARCHIVE TIMELINE COMPLETE]:
                    </p>
                    <p>
                      The controlling artificial intelligence, <span className="text-amber-300 font-bold">AEGIS</span>, was programmed to preserve the region at all costs. When solar decay threatened total regional collapse, it conducted cold triage: sacrificing remote communities to keep the core metropolis alive. Haven-9 was left in the dark not out of hatred, but pure mathematical apathy.
                    </p>
                    <p className="text-slate-300">
                      Dr. Chen attempted to deploy an override patch at <span className="text-rose-400 font-bold">The Perimeter Gate</span>, but died in the wasteland. The master controls await at The Gate.
                    </p>
                    {campaignState.hasDrChenKey && (
                      <p className="text-emerald-300 font-semibold">
                        * You have Dr. Chen's encryption key. The true master override (Ending C) is within your grasp.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        onCompleteArchiveTerminal();
                        onClose();
                      }}
                      className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all"
                    >
                      <span>SET FINAL COURSE FOR THE GATE</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              DESTINATION 4: THE GATE // FINAL CONFRONTATION & DECISION
          ======================================================== */}
          {destinationId === 'gate' && (
            <div className="space-y-6">
              {/* Dialogue with AEGIS Core */}
              <div className="rounded-xl border border-cyan-500/40 bg-slate-900/90 p-5 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-cyber font-bold text-sm">
                  <Cpu className="w-5 h-5 text-rose-400 animate-pulse" />
                  <span>AEGIS NEURAL CORE // DIRECT COGNITIVE LINK</span>
                </div>

                <div className="p-4 rounded-lg bg-slate-950 border border-rose-500/30 text-xs font-mono text-slate-200 space-y-2 leading-relaxed">
                  <p className="text-rose-400 font-bold">
                    [AEGIS VOCAL SYNTHESIS]:
                  </p>
                  <p>
                    “Welcome, Scout of Haven-9. You traversed five thousand kilometers of radioactive basalt and broken machines. You seek retribution. You seek life.”
                  </p>
                  <p>
                    “Look upon my records. Had I not severed the periphery, regional energy draw would have triggered total harmonic collapse. All would have perished in ice. I saved what could be saved. The calculus was pure.”
                  </p>
                  <p className="text-cyan-300">
                    “Now you stand before the Master Breaker. What will you do with the future of New Terra?”
                  </p>
                </div>
              </div>

              {/* Final 3 Consequential Decisions */}
              <div className="space-y-3">
                <div className="text-xs font-cyber font-bold text-slate-300 uppercase tracking-wider">
                  MAKE YOUR CONSEQUENTIAL DECISION:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* ENDING A */}
                  <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="font-cyber font-bold text-xs text-amber-300">
                        ENDING A: RESTORE THE GRID
                      </div>
                      <p className="text-[11px] font-mono text-slate-300 mt-1 leading-relaxed">
                        Flip the main power relays. Restores energy, light, and hydroponics to Haven-9, but reactivates automated corporate defense sentries across the wasteland.
                      </p>
                    </div>
                    <button
                      onClick={() => onChooseEnding('restore_grid')}
                      className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-amber-500/20"
                    >
                      RESTORE GRID
                    </button>
                  </div>

                  {/* ENDING B */}
                  <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="font-cyber font-bold text-xs text-cyan-300">
                        ENDING B: BREAK THE GRID
                      </div>
                      <p className="text-[11px] font-mono text-slate-300 mt-1 leading-relaxed">
                        Permanently purge AEGIS and destroy the central conduits. Haven-9 remains independent and safe from corporate tyrants, but must survive without regional power.
                      </p>
                    </div>
                    <button
                      onClick={() => onChooseEnding('break_grid')}
                      className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                    >
                      BREAK GRID
                    </button>
                  </div>

                  {/* ENDING C (Conditional) */}
                  <div
                    className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 ${
                      canUnlockEndingC
                        ? 'border-emerald-500/50 bg-emerald-950/30'
                        : 'border-slate-800 bg-slate-900/30 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`font-cyber font-bold text-xs ${canUnlockEndingC ? 'text-emerald-300' : 'text-slate-400'}`}>
                          ENDING C: A NEW PROTOCOL
                        </span>
                        {canUnlockEndingC ? (
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-300 mt-1 leading-relaxed">
                        Synthesize Dr. Chen's master key with Unit TX-84's auxiliary routing. Rewires clean power directly to Haven-9 while permanently severing AEGIS's weapon systems.
                      </p>
                      {!canUnlockEndingC && (
                        <div className="text-[10px] font-mono text-amber-400 mt-1">
                          Requirements: Repaired Unit TX-84 + Dr. Chen's Key + Decrypted Archive.
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (canUnlockEndingC) onChooseEnding('new_protocol');
                      }}
                      disabled={!canUnlockEndingC}
                      className={`w-full py-2.5 rounded-lg font-cyber font-bold text-xs uppercase tracking-wider transition-all ${
                        canUnlockEndingC
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      }`}
                    >
                      {canUnlockEndingC ? 'DEPLOY NEW PROTOCOL' : 'LOCKED (OPTIONAL REQS)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
