import React from 'react';
import { Sliders, RotateCcw } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { EQ_FREQUENCIES } from '../../services/audioEngine';

export const EqualizerPanel: React.FC = () => {
  const {
    eqPresets,
    activeEqPreset,
    currentEqGains,
    setEqPreset,
    setEqBandGain,
  } = useMusicPlayer();

  const freqLabels = ['60Hz', '250Hz', '1kHz', '4kHz', '12kHz'];

  return (
    <div className="space-y-5 p-4 rounded-xl bg-[#14141E] border border-white/[0.08]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-crafted-brand-violet" />
          <h3 className="text-sm font-semibold text-white">5-Band Acoustic Equalizer</h3>
        </div>
        <button
          type="button"
          onClick={() => setEqPreset('Flat')}
          className="text-xs flex items-center space-x-1 text-crafted-text-dim hover:text-white transition-colors"
          title="Reset to Flat"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>

      {/* Preset Chips */}
      <div className="flex flex-wrap gap-1.5">
        {eqPresets.map((preset) => {
          const isActive = activeEqPreset === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => setEqPreset(preset)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-crafted-brand-violet text-white font-semibold shadow-[0_0_12px_rgba(107,100,246,0.5)]'
                  : 'bg-[#1C1C28] text-crafted-text-muted hover:text-white hover:bg-[#252536] border border-white/[0.04]'
              }`}
            >
              {preset}
            </button>
          );
        })}
      </div>

      {/* Vertical Frequency Sliders */}
      <div className="grid grid-cols-5 gap-2 pt-2">
        {currentEqGains.map((gain, index) => {
          const freq = EQ_FREQUENCIES[index];
          const label = freqLabels[index];

          return (
            <div key={freq} className="flex flex-col items-center space-y-2">
              <span className="text-[10px] font-mono text-crafted-text-muted">
                {gain > 0 ? `+${gain}` : gain}dB
              </span>

              {/* Vertical Slider Track */}
              <div className="h-28 flex items-center justify-center relative py-1">
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={gain}
                  onChange={(e) => setEqBandGain(index, parseFloat(e.target.value))}
                  className="w-24 h-1.5 bg-[#252536] rounded-lg appearance-none cursor-pointer accent-crafted-brand-rust -rotate-90"
                />
              </div>

              <span className="text-[10px] font-medium text-crafted-text-dim text-center">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
