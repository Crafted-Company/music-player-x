import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  Sparkles,
  Play,
  Pause,
  RefreshCw,
} from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { SyncedLyrics } from './SyncedLyrics';
import { IpodMenuScreen } from './IpodMenuScreen';

interface TopScreenProps {
  className?: string;
}

export const TopScreen: React.FC<TopScreenProps> = ({ className = '' }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    currentView,
    setCurrentView,
    seek,
    setVolumeLevel,
    toggleShuffle,
    cycleRepeatMode,
    isFetchingAllMetadata,
    metadataProgress,
  } = useMusicPlayer();

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentDisplayTime = isScrubbing ? scrubTime : currentTime;
  const progressPercent = duration > 0 ? (currentDisplayTime / duration) * 100 : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setScrubTime(val);
  };

  const handleSeekStart = () => {
    setIsScrubbing(true);
    setScrubTime(currentTime);
  };

  const handleSeekEnd = () => {
    setIsScrubbing(false);
    seek(scrubTime);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    if (width > 0 && duration > 0) {
      const targetTime = (clickX / width) * duration;
      seek(targetTime);
    }
  };

  return (
    <div
      className={`relative w-full h-full rounded-2xl bg-[#0E0B0B] border-[3px] border-[#382C2C] shadow-[inset_0_4px_12px_rgba(0,0,0,0.9),0_4px_20px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col ${className}`}
    >
      {/* CRT / LCD Glass Subtle Reflection */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent pointer-events-none z-20" />

      {/* Classic iPod Clean Status Bar (Center is clean for camera notch) */}
      <div className="relative z-10 flex items-center justify-between px-3.5 py-1.5 bg-[#171212] border-b border-[#2C2121] text-[11px] font-mono text-crafted-text-dim">
        <div className="flex items-center space-x-1.5">
          {isPlaying ? (
            <Play size={10} fill="#10B981" className="text-emerald-400" />
          ) : (
            <Pause size={10} fill="#A19898" className="text-crafted-text-muted" />
          )}
          <span className="text-[10px] text-crafted-text-muted font-bold">
            {currentTrack?.format || 'AUDIO'}
          </span>
        </div>

        {/* Center: Empty (for camera notch) */}
        <div />

        {/* Right: Battery */}
        <div className="flex items-center space-x-1">
          <div className="w-5 h-2.5 rounded-[2px] border border-[#665252] p-[1px] flex items-center">
            <div className="w-full h-full bg-emerald-400/90 rounded-[1px]" />
          </div>
          <div className="w-[1.5px] h-1 bg-[#665252] rounded-r" />
        </div>
      </div>

      {/* Screen Body */}
      <div className="relative z-10 flex-1 overflow-hidden flex flex-col">
        {currentView === 'menu' ? (
          <IpodMenuScreen />
        ) : currentView === 'lyrics' ? (
          <SyncedLyrics />
        ) : (
          /* NOW PLAYING CENTERED ARTWORK DISPLAY */
          <div className="flex-1 flex flex-col items-center justify-between p-3 sm:p-4 text-center">
            {/* Center Large Album Artwork */}
            <div
              onClick={() => setCurrentView('lyrics')}
              className="relative group shrink-0 w-36 h-36 sm:w-44 sm:h-44 rounded-xl overflow-hidden shadow-2xl border-2 border-[#3A2D2D] bg-[#1E1717] cursor-pointer my-auto transition-transform active:scale-98"
              title="Tap to Flip to Lyrics"
            >
              {currentTrack?.coverUrl ? (
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-crafted-brand-rust">
                  <Sparkles size={32} />
                </div>
              )}
            </div>

            {/* Song Title & Artist */}
            <div className="w-full max-w-xs space-y-0.5 my-1">
              <h2 className="text-sm sm:text-base font-bold text-[#F3EFEF] truncate tracking-tight">
                {currentTrack?.title || 'No Track Selected'}
              </h2>
              <p className="text-xs text-[#A19898] truncate font-medium">
                {currentTrack?.artist || 'Select track from menu'}
              </p>
              <p className="text-[10px] text-[#756C6C] font-serif italic truncate">
                {currentTrack?.album || 'Audio Vault'}
              </p>
            </div>

            {/* Scrub Progress Bar */}
            <div className="w-full max-w-xs space-y-1 mt-auto">
              <div
                onClick={handleProgressBarClick}
                className="relative flex items-center w-full py-1 cursor-pointer"
              >
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentDisplayTime}
                  onChange={handleSeekChange}
                  onMouseDown={handleSeekStart}
                  onMouseUp={handleSeekEnd}
                  onTouchStart={handleSeekStart}
                  onTouchEnd={handleSeekEnd}
                  className="w-full h-2 bg-[#261D1D] rounded-full appearance-none cursor-pointer accent-crafted-brand-rust"
                  style={{
                    background: `linear-gradient(90deg, #6B64F6 0%, #D45B3E ${progressPercent}%, #261D1D ${progressPercent}%, #261D1D 100%)`,
                  }}
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-crafted-text-dim px-0.5">
                <span>{formatTime(currentDisplayTime)}</span>
                <span>-{formatTime(Math.max(0, duration - currentDisplayTime))}</span>
              </div>

              {/* Volume & Shuffle Toolbar */}
              <div className="flex items-center justify-between pt-1 border-t border-[#261D1D] text-crafted-text-muted">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={toggleShuffle}
                    className={`p-1 rounded transition-colors ${
                      isShuffle ? 'text-crafted-brand-violet' : 'text-crafted-text-dim hover:text-white'
                    }`}
                  >
                    <Shuffle size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={cycleRepeatMode}
                    className={`p-1 rounded transition-colors ${
                      repeatMode !== 'off'
                        ? 'text-crafted-brand-rust'
                        : 'text-crafted-text-dim hover:text-white'
                    }`}
                  >
                    {repeatMode === 'one' ? <Repeat1 size={12} /> : <Repeat size={12} />}
                  </button>
                </div>

                <div className="flex items-center space-x-1.5 text-[10px]">
                  {isMuted || volume === 0 ? (
                    <VolumeX size={12} className="text-crafted-brand-rust" />
                  ) : (
                    <Volume2 size={12} className="text-crafted-text-dim" />
                  )}
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
                    className="w-16 h-1.5 bg-[#261D1D] rounded-full appearance-none cursor-pointer accent-crafted-brand-rust"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Batch Metadata Fetching Floating Toast / Modal */}
      {isFetchingAllMetadata && metadataProgress && (
        <div className="absolute inset-x-3 bottom-3 z-50 p-3 rounded-xl bg-[#1A1212]/95 border border-[#3E2D2D] backdrop-blur-md shadow-2xl flex items-center space-x-3 text-left animate-in fade-in slide-in-from-bottom-2 duration-200">
          <RefreshCw size={16} className="text-crafted-brand-rust animate-spin shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-white">
              <span>Fetching Online Metadata...</span>
              <span className="font-mono text-[10px] text-crafted-brand-rust">
                {metadataProgress.current}/{metadataProgress.total}
              </span>
            </div>
            <p className="text-[10px] text-crafted-text-dim truncate">{metadataProgress.title}</p>
          </div>
        </div>
      )}
    </div>
  );
};
