import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Terminal, ShieldAlert, Cpu, CheckCircle2, XCircle, AlertTriangle, Disc, Wrench, BatteryCharging, Zap } from 'lucide-react';
import { HackingTarget, HackingDaemon } from '../types/game';
import { audioEngine } from '../audio/audioEngine';

interface CyberdeckModalProps {
  target: HackingTarget;
  bonusBufferSlots: number;
  bonusTimeSec: number;
  onSuccess: (targetId: string, completedDaemons: HackingDaemon[]) => void;
  onClose: () => void;
}

const HEX_POOL = ['1C', 'BD', '55', 'E9', '7A', 'FF'];

export const CyberdeckModal: React.FC<CyberdeckModalProps> = ({
  target,
  bonusBufferSlots,
  bonusTimeSec,
  onSuccess,
  onClose,
}) => {
  const totalBufferSize = target.bufferSize + bonusBufferSlots;
  const initialTime = target.timeLimitSec + bonusTimeSec;

  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [timerStarted, setTimerStarted] = useState(false);
  const [buffer, setBuffer] = useState<string[]>([]);
  const [isRowTurn, setIsRowTurn] = useState<boolean>(true); // starts selecting from active row
  const [activeRowIdx, setActiveRowIdx] = useState<number>(0);
  const [activeColIdx, setActiveColIdx] = useState<number | null>(null);
  const [usedCells, setUsedCells] = useState<Set<string>>(new Set());
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [successReport, setSuccessReport] = useState<{
    completed: HackingDaemon[];
    totalScrap: number;
    totalParts: number;
    totalBattery: number;
  } | null>(null);

  // Generate deterministic matrix based on target id
  const matrix = useMemo(() => {
    const size = target.matrixSize;
    const grid: string[][] = [];

    // Ensure required daemon bytes exist in solvable positions
    const requiredBytes = new Set<string>();
    target.daemons.forEach((d) => d.sequence.forEach((b) => requiredBytes.add(b)));
    const reqList = Array.from(requiredBytes);

    let seed = 0;
    for (let i = 0; i < target.id.length; i++) seed += target.id.charCodeAt(i);

    for (let r = 0; r < size; r++) {
      const row: string[] = [];
      for (let c = 0; c < size; c++) {
        seed = (seed * 9301 + 49297) % 233280;
        const rnd = seed / 233280;
        if (rnd < 0.65 && reqList.length > 0) {
          row.push(reqList[Math.floor(rnd * reqList.length) % reqList.length]);
        } else {
          row.push(HEX_POOL[Math.floor(rnd * HEX_POOL.length) % HEX_POOL.length]);
        }
      }
      grid.push(row);
    }
    return grid;
  }, [target]);

  // Check which daemons are satisfied by the current buffer
  const evaluateDaemons = useCallback(
    (currentBuffer: string[]) => {
      const bufferStr = currentBuffer.join(',');
      return target.daemons.map((d) => {
        const seqStr = d.sequence.join(',');
        const isMatched = bufferStr.includes(seqStr);
        return {
          ...d,
          completed: isMatched,
        };
      });
    },
    [target.daemons]
  );

  const evaluatedDaemons = useMemo(() => evaluateDaemons(buffer), [buffer, evaluateDaemons]);

  // Finalize breach attempt
  const finishBreach = useCallback(
    (finalBuffer: string[]) => {
      setIsFinished(true);
      const evaluated = evaluateDaemons(finalBuffer);
      const completed = evaluated.filter((d) => d.completed);

      if (completed.length > 0) {
        audioEngine.playBreachSuccess();
        const totalScrap = completed.reduce((sum, d) => sum + d.scrapReward, 0);
        const totalParts = completed.reduce((sum, d) => sum + d.partsReward, 0);
        const totalBattery = completed.reduce((sum, d) => sum + d.batteryReward, 0);

        setSuccessReport({
          completed,
          totalScrap,
          totalParts,
          totalBattery,
        });

        setTimeout(() => {
          onSuccess(target.id, completed);
        }, 1200);
      } else {
        audioEngine.playBreachFail();
      }
    },
    [evaluateDaemons, onSuccess, target.id]
  );

  // Timer countdown
  useEffect(() => {
    if (!timerStarted || isFinished) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finishBreach(buffer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStarted, isFinished, buffer, finishBreach]);

  // Click a matrix cell
  const handleCellClick = (r: number, c: number) => {
    if (isFinished) return;
    const cellKey = `${r},${c}`;
    if (usedCells.has(cellKey)) return;

    // Must click in active row or column
    if (isRowTurn && r !== activeRowIdx) return;
    if (!isRowTurn && c !== activeColIdx) return;

    // Start timer on first move
    if (!timerStarted) {
      setTimerStarted(true);
    }

    const value = matrix[r][c];
    audioEngine.playCyberdeckBeep(880 + buffer.length * 90);

    const newBuffer = [...buffer, value];
    const newUsed = new Set(usedCells);
    newUsed.add(cellKey);

    setBuffer(newBuffer);
    setUsedCells(newUsed);

    // Switch selection axes
    if (isRowTurn) {
      setIsRowTurn(false);
      setActiveColIdx(c);
    } else {
      setIsRowTurn(true);
      setActiveRowIdx(r);
    }

    // Check if buffer is full or all daemons solved
    const evaluated = evaluateDaemons(newBuffer);
    const allSolved = evaluated.every((d) => d.completed);

    if (newBuffer.length >= totalBufferSize || allSolved) {
      finishBreach(newBuffer);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/90 backdrop-blur-md select-none">
      <div className="relative w-full max-w-4xl rounded-2xl border border-cyan-500/40 bg-[#090d18] text-slate-100 shadow-2xl overflow-hidden flex flex-col font-mono">
        {/* Cyberpunk Terminal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 border-b border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-cyan-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-cyber flex items-center gap-2">
                <span>CYBERDECK BREACH PROTOCOL</span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                  {target.securityFirm}
                </span>
              </div>
              <h2 className="text-sm md:text-base font-bold text-white font-cyber tracking-wide">
                {target.title}
              </h2>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-2 ${
              timeLeft <= 8 ? 'bg-rose-950/60 border-rose-500/70 text-rose-400 animate-pulse' : 'bg-slate-950 border-cyan-500/40 text-cyan-300'
            }`}>
              <Cpu className="w-3.5 h-3.5" />
              <span>BREACH TIME: {timeLeft}s</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Abort Hacking"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Breach Work Area */}
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto max-h-[75vh]">
          {/* Left Column: Code Matrix Grid (7 cols) */}
          <div className="md:col-span-7 flex flex-col">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <ShieldAlert className="w-3.5 h-3.5" />
                MEMORY BUFFER MATRIX
              </span>
              <span className="text-[11px] text-slate-400">
                Active Selection: <strong className={isRowTurn ? 'text-amber-400' : 'text-cyan-400'}>{isRowTurn ? 'ROW' : 'COLUMN'}</strong>
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-[#060912] shadow-inner flex flex-col items-center justify-center">
              <div
                className="grid gap-2 select-none"
                style={{ gridTemplateColumns: `repeat(${target.matrixSize}, minmax(0, 1fr))` }}
              >
                {matrix.map((row, r) =>
                  row.map((hex, c) => {
                    const isUsed = usedCells.has(`${r},${c}`);
                    const isSelectable = !isUsed && !isFinished && (isRowTurn ? r === activeRowIdx : c === activeColIdx);

                    return (
                      <button
                        key={`${r}-${c}`}
                        disabled={!isSelectable}
                        onClick={() => handleCellClick(r, c)}
                        className={`w-11 h-11 md:w-12 md:h-12 rounded-lg font-mono text-sm font-bold flex items-center justify-center transition-all ${
                          isUsed
                            ? 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
                            : isSelectable
                            ? 'bg-cyan-950/80 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-400 shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer ring-1 ring-cyan-400/50'
                            : 'bg-slate-950/60 text-slate-500 border border-slate-800/80 cursor-not-allowed opacity-60'
                        }`}
                      >
                        {isUsed ? '··' : hex}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Alternates Row ➔ Column with each byte</span>
              <span className="text-cyan-400">Buffer: {buffer.length} / {totalBufferSize}</span>
            </div>
          </div>

          {/* Right Column: Buffer & Target Daemons (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            {/* Cyberdeck Buffer Slots */}
            <div>
              <div className="text-xs text-slate-400 mb-2 font-semibold flex items-center justify-between">
                <span>BUFFER SLOTS</span>
                <span className="text-[10px] text-slate-500 font-normal">RAM CAPACITY</span>
              </div>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalBufferSize }).map((_, idx) => {
                  const val = buffer[idx];
                  return (
                    <div
                      key={idx}
                      className={`flex-1 h-12 rounded-lg border flex items-center justify-center font-mono text-xs md:text-sm font-bold transition-all ${
                        val
                          ? 'bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/30'
                          : 'bg-slate-950 border-slate-800 text-slate-600'
                      }`}
                    >
                      {val || '_'}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Target Daemons to Upload */}
            <div className="flex-1 flex flex-col">
              <div className="text-xs text-slate-400 mb-2 font-semibold">TARGET DAEMONS</div>
              <div className="flex flex-col gap-2.5">
                {evaluatedDaemons.map((daemon) => {
                  return (
                    <div
                      key={daemon.id}
                      className={`p-3 rounded-xl border transition-all ${
                        daemon.completed
                          ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-300 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold font-cyber flex items-center gap-1.5">
                          {daemon.completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          )}
                          {daemon.name}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          daemon.completed ? 'bg-emerald-900/80 text-emerald-300' : 'bg-slate-900 text-slate-400'
                        }`}>
                          {daemon.completed ? 'UPLOADED' : 'PENDING'}
                        </span>
                      </div>

                      {/* Required Sequence */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] text-slate-400">SEQUENCE:</span>
                        <div className="flex items-center gap-1">
                          {daemon.sequence.map((code, sIdx) => (
                            <span
                              key={sIdx}
                              className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                                daemon.completed
                                  ? 'bg-emerald-900 text-emerald-200 border border-emerald-500/50'
                                  : 'bg-slate-900 text-cyan-300 border border-slate-700'
                              }`}
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Reward Preview */}
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>Reward:</span>
                        <span className="text-amber-300 font-semibold">{daemon.rewardDescription}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Result Overlay Banner */}
        {isFinished && successReport && (
          <div className="p-4 bg-emerald-950/90 border-t border-emerald-500/60 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="font-cyber font-bold text-emerald-300 text-sm">
                  BREACH PROTOCOL SUCCESSFUL! ({successReport.completed.length} Daemons Uploaded)
                </span>
                <div className="text-slate-300 mt-0.5">
                  Decrypted corporate payload transferred directly into your inventory cargo.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {successReport.totalScrap > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 text-amber-300 font-bold">
                  <Disc className="w-3.5 h-3.5 text-amber-400" />
                  +{successReport.totalScrap} Scrap
                </span>
              )}
              {successReport.totalParts > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 text-emerald-300 font-bold">
                  <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                  +{successReport.totalParts} Parts
                </span>
              )}
              {successReport.totalBattery > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 text-cyan-300 font-bold">
                  <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" />
                  +{successReport.totalBattery}% Wattage
                </span>
              )}
            </div>
          </div>
        )}

        {isFinished && !successReport && (
          <div className="p-4 bg-rose-950/90 border-t border-rose-500/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-rose-300">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>
                <strong className="font-cyber font-bold text-sm block">ICE INTRUSION DETECTED / BREACH FAILED</strong>
                Buffer sequences did not match target daemons before connection timeout.
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-cyber font-bold cursor-pointer"
            >
              DISCONNECT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
