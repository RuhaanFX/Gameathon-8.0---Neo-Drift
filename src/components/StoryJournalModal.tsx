import React from 'react';
import { X, BookOpen, Radio, Sparkles } from 'lucide-react';
import { StoryLog } from '../types/game';

interface StoryJournalModalProps {
  logs: StoryLog[];
  onClose: () => void;
}

export const StoryJournalModal: React.FC<StoryJournalModalProps> = ({ logs, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-950/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-2xl rounded-2xl border border-cyan-500/30 bg-[#090c15] text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-cyber font-bold text-sm text-slate-100">NOVA STORY ARCHIVES</h3>
              <p className="text-[11px] font-mono text-slate-400">Decrypted transmissions along the highway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of Decrypted Logs */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">
              No radio logs intercepted yet. Drive further along the dunes to catch transmissions.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-cyber text-xs font-bold text-cyan-300">{log.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {log.author} · {log.timestamp}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{log.content}</p>
                <div className="mt-2 text-[10px] font-mono text-amber-400/80 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Unlocked at {log.unlockedAtKm} km</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>{logs.length} transmission logs logged</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-cyber font-bold text-xs uppercase cursor-pointer"
          >
            Close Journal
          </button>
        </div>
      </div>
    </div>
  );
};
