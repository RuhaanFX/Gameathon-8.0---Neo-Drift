import React, { useEffect } from 'react';
import { Volume2, VolumeX, Compass, Play } from 'lucide-react';

interface TitleScreenProps {
  onStartGame: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  isMuted,
  onToggleMute,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div className="relative w-full h-screen overflow-hidden select-none bg-[#07090e] text-slate-100 flex flex-col justify-between p-6 md:p-10">
      {/* Cinematic Background Artwork */}
      <img
        src="/src/assets/images/wasteland_title_hero_1792678899777.jpg"
        alt="NEO DRIFT 2088 Wasteland 4x4"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center brightness-[0.7] scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/40 to-[#07090e]/30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07090e]/90 via-[#07090e]/40 to-transparent pointer-events-none" />

      {/* Top Bar: Minimal Badge + Audio Toggle */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="font-cyber text-xs tracking-widest text-cyan-400/90 font-bold uppercase">
            MULE 4x4 EXPEDITION // 2088
          </span>
        </div>

        <button
          onClick={onToggleMute}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-700/60 bg-slate-900/70 hover:bg-slate-800 text-xs font-mono text-slate-300 transition-colors pointer-events-auto cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          <span>{isMuted ? 'UNMUTE AUDIO' : 'AUDIO ON'}</span>
        </button>
      </div>

      {/* Centerpiece Hero Title */}
      <div className="relative z-10 max-w-2xl w-full mx-auto my-auto flex flex-col items-start">
        <div className="mb-3">
          <span className="text-xs font-mono font-semibold tracking-widest uppercase text-amber-400/90 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/30">
            SCI-FI 4X4 WASTELAND SURVIVAL
          </span>
        </div>

        {/* Clean, bold, iconic title */}
        <h1 className="font-cyber font-black text-5xl sm:text-6xl md:text-7xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-amber-400 drop-shadow-[0_0_35px_rgba(6,182,212,0.4)] mb-3">
          NEO DRIFT
        </h1>

        <p className="text-slate-300 text-base md:text-lg max-w-lg mb-8 leading-relaxed font-sans">
          Traverse ruined badlands in your armored 4x4 rover. Scavenge high-grade tech, repair field breakdowns, and venture on foot into forgotten megacity ruins.
        </p>

        {/* Big Start Button */}
        <button
          onClick={onStartGame}
          className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-cyber font-extrabold text-sm tracking-wider uppercase transition-all duration-200 shadow-xl shadow-cyan-500/25 active:scale-95 flex items-center gap-3 cursor-pointer border border-cyan-300/40"
        >
          <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
          <span>START EXPEDITION</span>
          <span className="text-xs font-mono font-normal opacity-75 hidden sm:inline ml-2">
            [ENTER / SPACE]
          </span>
        </button>
      </div>

      {/* Simple, sleek control ribbon at bottom */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono border-t border-slate-800/70 pt-4 gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-cyan-400 font-bold">CONTROLS:</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">WASD</span>
          <span>Drive/Walk</span>
          <span>·</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">SHIFT</span>
          <span>Turbo</span>
          <span>·</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">V</span>
          <span>Dashboard</span>
          <span>·</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">F</span>
          <span>Nomad On-Foot</span>
          <span>·</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">E</span>
          <span>Scavenge/Interact</span>
        </div>

        <div className="text-slate-500 text-xs">
          Sector 01 — 18 Open Badlands
        </div>
      </div>
    </div>
  );
};
