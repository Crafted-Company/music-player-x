import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../../services/audioEngine';

interface VisualizerCanvasProps {
  isPlaying: boolean;
  className?: string;
  barCount?: number;
  height?: number;
}

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({
  isPlaying,
  className = '',
  barCount = 32,
  height = 48,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 64;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      if (isPlaying) {
        audioEngine.getFrequencyData(dataArray);
      } else {
        // Decay to zero when paused
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = Math.max(0, dataArray[i] - 4);
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const barWidth = (width / barCount) * 0.7;
      const gap = (width / barCount) * 0.3;

      for (let i = 0; i < barCount; i++) {
        // Sample frequencies smoothly across the spectrum
        const dataIndex = Math.floor((i / barCount) * 48);
        const value = dataArray[dataIndex] || 0;
        const percent = value / 255;
        const barHeight = Math.max(3, percent * (canvas.height - 4));

        const x = i * (barWidth + gap) + gap / 2;
        const y = canvas.height - barHeight;

        // Crafted gradient: Violet to Rust
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, 'rgba(107, 100, 246, 0.75)');
        gradient.addColorStop(0.7, 'rgba(212, 91, 62, 0.9)');
        gradient.addColorStop(1, 'rgba(245, 158, 11, 1)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        ctx.fill();

        // Subtle glow peak cap
        if (barHeight > 8) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillRect(x, y, barWidth, 1.5);
        }
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, barCount]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={height}
      className={`w-full ${className}`}
    />
  );
};
