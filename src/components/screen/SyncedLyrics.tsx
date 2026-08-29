import React, { useEffect, useRef } from 'react';
import { Minus, Plus, RefreshCw, Sparkles, Clock, Music } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface SyncedLyricsProps {
  className?: string;
}

export const SyncedLyrics: React.FC<SyncedLyricsProps> = ({ className = '' }) => {
  const {
    currentTrack,
    lyricsData,
    activeLyricIndex,
    lyricsOffset,
    isLoadingLyrics,
    setLyricsOffsetDelta,
    seekToLyricLine,
  } = useMusicPlayer();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const isUserScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<any>(null);

  // Auto-scroll smooth centering whenever activeLyricIndex changes (unless user is actively dragging)
  useEffect(() => {
    if (!isUserScrollingRef.current && activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLyricIndex]);

  const handleContainerScroll = () => {
    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 2000);
  };

  const handleLineClick = (seconds: number) => {
    isUserScrollingRef.current = false;
    seekToLyricLine(seconds);
  };

  if (isLoadingLyrics) {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-6 text-center space-y-3 bg-[#140F0F] ${className}`}>
        <RefreshCw className="w-7 h-7 text-crafted-brand-rust animate-spin" />
        <p className="text-xs text-crafted-text-muted font-medium tracking-wide">
          Syncing real-time lyrics...
        </p>
      </div>
    );
  }

  if (!lyricsData || !lyricsData.lines || lyricsData.lines.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-6 text-center space-y-3 bg-[#140F0F] ${className}`}>
        <Music className="w-8 h-8 text-crafted-text-dim" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-crafted-text">No Synchronized Lyrics</p>
          <p className="text-[11px] text-crafted-text-dim font-serif italic">
            {currentTrack?.title || 'Unknown Track'} — Instrumental
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full select-none bg-[#140F0F] ${className}`}>
      {/* Top Lyric Bar: Offset tuning controls & status */}
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-[#2C2121] bg-[#1A1313] text-[11px]">
        <div className="flex items-center space-x-1.5 text-crafted-brand-rust font-mono text-[10px]">
          <Sparkles size={12} />
          <span className="truncate max-w-[130px]">{lyricsData.source || '// LIVE SYNC'}</span>
        </div>

        {/* Micro-Timing Offset Controls (+/- 0.1s) */}
        <div className="flex items-center space-x-1 bg-[#100C0C] rounded-lg px-2 py-0.5 border border-[#352929]">
          <Clock size={11} className="text-crafted-text-dim mr-0.5" />
          <button
            type="button"
            onClick={() => setLyricsOffsetDelta(-0.1)}
            className="p-0.5 hover:text-crafted-brand-rust transition-colors"
            title="Offset -0.1s"
          >
            <Minus size={11} />
          </button>
          <span className="font-mono text-[10px] min-w-[34px] text-center text-[#F3EFEF]">
            {lyricsOffset >= 0 ? `+${lyricsOffset.toFixed(1)}s` : `${lyricsOffset.toFixed(1)}s`}
          </span>
          <button
            type="button"
            onClick={() => setLyricsOffsetDelta(0.1)}
            className="p-0.5 hover:text-crafted-brand-rust transition-colors"
            title="Offset +0.1s"
          >
            <Plus size={11} />
          </button>
        </div>
      </div>

      {/* Lyrics Scrollable Container */}
      <div
        ref={containerRef}
        onScroll={handleContainerScroll}
        className="flex-1 overflow-y-auto px-4 py-8 space-y-3.5 scroll-smooth text-center"
      >
        {lyricsData.lines.map((line, idx) => {
          const isActive = idx === activeLyricIndex;
          const isPassed = idx < activeLyricIndex;

          return (
            <div
              key={`${line.time}-${idx}`}
              ref={isActive ? activeLineRef : null}
              onClick={() => handleLineClick(line.time)}
              className={`lyric-line cursor-pointer py-1.5 px-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'lyric-active text-base sm:text-lg font-bold text-white bg-crafted-brand-rust/20 border border-crafted-brand-rust/40 shadow-[0_0_20px_rgba(212,91,62,0.3)]'
                  : isPassed
                  ? 'text-xs sm:text-sm text-crafted-text-dim/60 hover:text-crafted-text-muted'
                  : 'text-xs sm:text-sm text-crafted-text-muted hover:text-white'
              }`}
            >
              <p className="leading-relaxed tracking-wide">{line.text}</p>
              {line.translation && (
                <p className="text-[11px] text-crafted-text-dim mt-0.5">{line.translation}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
