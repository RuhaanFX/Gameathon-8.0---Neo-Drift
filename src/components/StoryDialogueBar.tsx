import React, { useState, useEffect } from 'react';
import { Radio, ChevronRight, X, Volume2, Sparkles, MessageSquare } from 'lucide-react';
import { StoryDialogue } from '../types/game';

interface StoryDialogueBarProps {
  dialogue: StoryDialogue | null;
  onDismiss: () => void;
  onNext?: () => void;
  hasMore?: boolean;
}

export const StoryDialogueBar: React.FC<StoryDialogueBarProps> = ({
  dialogue,
  onDismiss,
  onNext,
  hasMore = false,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!dialogue) {
      setDisplayedText('');
      return;
    }

    const fullText = dialogue.text;
    let currIdx = 0;
    setIsTyping(true);
    setDisplayedText('');

    const interval = setInterval(() => {
      currIdx += 2;
      if (currIdx >= fullText.length) {
        setDisplayedText(fullText);
        setIsTyping(false);
        clearInterval(interval);
      } else {
        setDisplayedText(fullText.slice(0, currIdx));
      }
    }, 18);

    return () => clearInterval(interval);
  }, [dialogue]);

  // Auto-dismiss or auto-advance after dialogue is read (12s after finish)
  useEffect(() => {
    if (!dialogue || isTyping) return;

    const timer = setTimeout(() => {
      if (hasMore && onNext) {
        onNext();
      } else {
        onDismiss();
      }
    }, 12000);

    return () => clearTimeout(timer);
  }, [dialogue, isTyping, hasMore, onNext, onDismiss]);

  // Space / Enter key to advance dialogue smoothly
  useEffect(() => {
    if (!dialogue) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if inside an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        if (isTyping) {
          e.preventDefault();
          setDisplayedText(dialogue.text);
          setIsTyping(false);
        } else {
          e.preventDefault();
          if (hasMore && onNext) {
            onNext();
          } else {
            onDismiss();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogue, isTyping, hasMore, onNext, onDismiss]);

  if (!dialogue) return null;

  const isUrgent = dialogue.priority === 'urgent';

  const handleBarClick = () => {
    if (isTyping) {
      setDisplayedText(dialogue.text);
      setIsTyping(false);
    } else {
      if (hasMore && onNext) {
        onNext();
      } else {
        onDismiss();
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pointer-events-auto select-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 z-40 mb-2 px-2">
      <div
        className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl border ${
          isUrgent
            ? 'bg-rose-950/90 border-rose-500/80 shadow-[0_0_35px_rgba(244,63,94,0.35)]'
            : 'bg-slate-950/92 border-cyan-500/60 shadow-[0_0_35px_rgba(6,182,212,0.25)]'
        }`}
      >
        {/* Animated decorative top frequency beam */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-amber-400 to-cyan-500 opacity-80" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
          {/* Speaker Identity & Channel */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div
              className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${
                isUrgent
                  ? 'bg-rose-900/60 border-rose-500/80 text-rose-300'
                  : 'bg-cyan-950/80 border-cyan-500/80 text-cyan-400'
              }`}
            >
              <Radio className="w-4 h-4 animate-pulse" />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-cyber font-black text-sm tracking-wider uppercase text-slate-100">
                {dialogue.speaker}
              </span>
              {dialogue.role && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {dialogue.role}
                </span>
              )}
            </div>

            {dialogue.channel && (
              <span className="text-[10px] font-mono font-semibold text-amber-400/90 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                {dialogue.channel}
              </span>
            )}
          </div>

          {/* Controls: Audio Wave / Skip Typewriter / Next / Dismiss */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {/* Audio Waveform visualization */}
            <div className="flex items-center gap-0.5 h-4 px-2 py-1 rounded bg-slate-900/80 border border-slate-800">
              <span className="w-0.5 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-0.5 h-3.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-0.5 h-2.5 bg-cyan-400 rounded-full animate-bounce" />
              <span className="w-0.5 h-4 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
              <span className="w-0.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
            </div>

            {isTyping && (
              <button
                onClick={() => {
                  setDisplayedText(dialogue.text);
                  setIsTyping(false);
                }}
                className="text-[10px] font-mono text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900/60 border border-slate-800 cursor-pointer"
                title="Instant Text"
              >
                Instant
              </button>
            )}

            {hasMore && onNext && (
              <button
                onClick={onNext}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 text-xs font-cyber font-bold cursor-pointer transition-colors"
                title="Next Dialogue"
              >
                <span>NEXT</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onDismiss}
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors border border-slate-800 cursor-pointer"
              title="Dismiss Dialogue"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Narrative Text */}
        <p
          onClick={handleBarClick}
          className="text-slate-200 text-sm sm:text-base font-sans leading-relaxed tracking-wide min-h-[2.5rem] cursor-pointer"
        >
          {displayedText}
          {isTyping && <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse" />}
        </p>

        {/* Subtitle bottom metadata indicator */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="text-slate-500 flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3 text-cyan-400" />
            <span>WASTELAND LOG // ROUTE TO CIVILIZATION</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="text-cyan-400/80 text-[10px] font-mono hidden sm:inline-block">
              {hasMore ? '[SPACE / Click for Next]' : '[SPACE / Click to Continue]'}
            </span>
            <span className="text-slate-500">
              {dialogue.timestamp || '2088.10.23'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
