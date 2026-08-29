import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface ClickWheelProps {
  size?: number;
  className?: string;
}

export const ClickWheel: React.FC<ClickWheelProps> = ({ size = 260, className = '' }) => {
  const {
    handleWheelScroll,
    handleWheelButton,
    handleStickDirection,
    isPlaying,
  } = useMusicPlayer();

  const wheelRef = useRef<HTMLDivElement | null>(null);

  // Wheel Rotary State
  const [isWheelDragging, setIsWheelDragging] = useState(false);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const lastAngleRef = useRef<number | null>(null);
  const accumulatedAngleRef = useRef<number>(0);
  const STEP_DEGREES = 14;

  // Analogue Joystick State
  const stickRef = useRef<HTMLDivElement | null>(null);
  const [stickOffset, setStickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isStickActive, setIsStickActive] = useState(false);
  const [isStickReturning, setIsStickReturning] = useState(false);
  const stickStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const maxDistanceRef = useRef<number>(0);
  const lastDirectionRef = useRef<string | null>(null);
  const repeatTimerRef = useRef<any>(null);
  const stickHoldTimerRef = useRef<any>(null);
  const isHoldTriggeredRef = useRef<boolean>(false);

  const MAX_STICK_RADIUS = 22;
  const DEADZONE = 10;

  // --- Wheel Angular Logic ---
  const getAngle = (clientX: number, clientY: number): number | null => {
    if (!wheelRef.current) return null;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    let rad = Math.atan2(deltaY, deltaX);
    let deg = (rad * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return deg;
  };

  const handleWheelPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.analogue-stick-zone')) return;

    setIsWheelDragging(true);
    lastAngleRef.current = getAngle(e.clientX, e.clientY);
    accumulatedAngleRef.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleWheelPointerMove = (e: React.PointerEvent) => {
    if (!isWheelDragging || lastAngleRef.current === null) return;

    const currentAngle = getAngle(e.clientX, e.clientY);
    if (currentAngle === null) return;

    let deltaAngle = currentAngle - lastAngleRef.current;
    if (deltaAngle > 180) deltaAngle -= 360;
    else if (deltaAngle < -180) deltaAngle += 360;

    accumulatedAngleRef.current += deltaAngle;
    lastAngleRef.current = currentAngle;

    if (Math.abs(accumulatedAngleRef.current) >= STEP_DEGREES) {
      const steps = Math.trunc(accumulatedAngleRef.current / STEP_DEGREES);
      accumulatedAngleRef.current -= steps * STEP_DEGREES;
      handleWheelScroll(steps);
    }
  };

  const handleWheelPointerUp = (e: React.PointerEvent) => {
    setIsWheelDragging(false);
    lastAngleRef.current = null;
    accumulatedAngleRef.current = 0;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  // --- Analogue Thumbstick & Press / Hold Logic ---
  const handleStickPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsStickActive(true);
    setIsStickReturning(false);
    isHoldTriggeredRef.current = false;
    stickStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    maxDistanceRef.current = 0;
    lastDirectionRef.current = null;

    if (repeatTimerRef.current) {
      clearInterval(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }

    // Long-press hold timer to trigger Track Actions Context Menu
    if (stickHoldTimerRef.current) clearTimeout(stickHoldTimerRef.current);
    stickHoldTimerRef.current = setTimeout(() => {
      if (maxDistanceRef.current < 9) {
        isHoldTriggeredRef.current = true;
        setActiveButton('select');
        handleWheelButton('hold' as any);
        setTimeout(() => setActiveButton(null), 200);
      }
    }, 480);

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleStickPointerMove = (e: React.PointerEvent) => {
    if (!isStickActive || !stickStartRef.current) return;

    const rawDx = e.clientX - stickStartRef.current.x;
    const rawDy = e.clientY - stickStartRef.current.y;
    const distance = Math.hypot(rawDx, rawDy);
    maxDistanceRef.current = Math.max(maxDistanceRef.current, distance);

    if (distance >= 8 && stickHoldTimerRef.current) {
      clearTimeout(stickHoldTimerRef.current);
      stickHoldTimerRef.current = null;
    }

    const angle = Math.atan2(rawDy, rawDx);
    const clampedDist = Math.min(distance, MAX_STICK_RADIUS);
    const renderX = Math.cos(angle) * clampedDist;
    const renderY = Math.sin(angle) * clampedDist;

    setStickOffset({ x: renderX, y: renderY });

    if (distance >= DEADZONE) {
      let direction: 'up' | 'down' | 'left' | 'right';
      if (Math.abs(rawDy) > Math.abs(rawDx)) {
        direction = rawDy < 0 ? 'up' : 'down';
      } else {
        direction = rawDx < 0 ? 'left' : 'right';
      }

      if (lastDirectionRef.current !== direction) {
        lastDirectionRef.current = direction;
        handleStickDirection(direction);

        if (repeatTimerRef.current) clearInterval(repeatTimerRef.current);
        repeatTimerRef.current = setInterval(() => {
          handleStickDirection(direction);
        }, 220);
      }
    } else {
      lastDirectionRef.current = null;
      if (repeatTimerRef.current) {
        clearInterval(repeatTimerRef.current);
        repeatTimerRef.current = null;
      }
    }
  };

  const handleStickPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (stickHoldTimerRef.current) {
      clearTimeout(stickHoldTimerRef.current);
      stickHoldTimerRef.current = null;
    }
    if (repeatTimerRef.current) {
      clearInterval(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }

    const duration = stickStartRef.current ? Date.now() - stickStartRef.current.time : 999;
    const maxDist = maxDistanceRef.current;

    setIsStickActive(false);
    setIsStickReturning(true);
    setStickOffset({ x: 0, y: 0 });

    if (!isHoldTriggeredRef.current && maxDist < 9 && duration < 400) {
      setActiveButton('select');
      handleWheelButton('select');
      setTimeout(() => setActiveButton(null), 150);
    }

    stickStartRef.current = null;
    lastDirectionRef.current = null;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  useEffect(() => {
    return () => {
      if (repeatTimerRef.current) clearInterval(repeatTimerRef.current);
      if (stickHoldTimerRef.current) clearTimeout(stickHoldTimerRef.current);
    };
  }, []);

  const handleOuterButtonClick = (btn: 'menu' | 'prev' | 'next' | 'play-pause', e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveButton(btn);
    handleWheelButton(btn);
    setTimeout(() => setActiveButton(null), 180);
  };

  return (
    <div
      ref={wheelRef}
      onPointerDown={handleWheelPointerDown}
      onPointerMove={handleWheelPointerMove}
      onPointerUp={handleWheelPointerUp}
      onPointerCancel={handleWheelPointerUp}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`relative select-none rounded-full bg-[#1A1414] shadow-wheel-outer border border-[#352929] flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden ${className}`}
    >
      {/* Crafted Conic Wheel Brush Texture */}
      <div className="absolute inset-0 rounded-full bg-wheel-metal opacity-40 pointer-events-none" />
      <div className="absolute inset-0 rounded-full bg-radial-gradient from-transparent via-black/20 to-black/70 pointer-events-none" />

      {/* Concentric grooves */}
      <div className="absolute inset-2 rounded-full border border-white/[0.04] pointer-events-none" />
      <div className="absolute inset-6 rounded-full border border-black/50 pointer-events-none" />

      {/* TOP: MENU Button */}
      <button
        type="button"
        onClick={(e) => handleOuterButtonClick('menu', e)}
        className={`absolute top-2.5 flex flex-col items-center justify-center px-4 py-1.5 text-xs font-mono font-bold tracking-widest transition-all duration-150 rounded-full ${
          activeButton === 'menu'
            ? 'text-crafted-brand-rust scale-95 drop-shadow-[0_0_10px_rgba(212,91,62,0.9)]'
            : 'text-crafted-text-muted hover:text-white'
        }`}
      >
        MENU
      </button>

      {/* LEFT: PREVIOUS (⏮️) Button */}
      <button
        type="button"
        onClick={(e) => handleOuterButtonClick('prev', e)}
        className={`absolute left-3 flex items-center justify-center p-2.5 transition-all duration-150 rounded-full ${
          activeButton === 'prev'
            ? 'text-crafted-brand-rust scale-95 drop-shadow-[0_0_10px_rgba(212,91,62,0.9)]'
            : 'text-crafted-text-muted hover:text-white'
        }`}
        title="Previous"
      >
        <SkipBack size={18} fill="currentColor" />
      </button>

      {/* RIGHT: NEXT (⏭️) Button */}
      <button
        type="button"
        onClick={(e) => handleOuterButtonClick('next', e)}
        className={`absolute right-3 flex items-center justify-center p-2.5 transition-all duration-150 rounded-full ${
          activeButton === 'next'
            ? 'text-crafted-brand-rust scale-95 drop-shadow-[0_0_10px_rgba(212,91,62,0.9)]'
            : 'text-crafted-text-muted hover:text-white'
        }`}
        title="Next"
      >
        <SkipForward size={18} fill="currentColor" />
      </button>

      {/* BOTTOM: PLAY / PAUSE (⏯️) Button */}
      <button
        type="button"
        onClick={(e) => handleOuterButtonClick('play-pause', e)}
        className={`absolute bottom-2.5 flex items-center justify-center p-2.5 transition-all duration-150 rounded-full ${
          activeButton === 'play-pause'
            ? 'text-crafted-brand-violet scale-95 drop-shadow-[0_0_10px_rgba(107,100,246,0.9)]'
            : 'text-crafted-text-muted hover:text-white'
        }`}
        title="Play / Pause"
      >
        {isPlaying ? (
          <Pause size={18} fill="currentColor" />
        ) : (
          <Play size={18} fill="currentColor" className="translate-x-0.5" />
        )}
      </button>

      {/* CENTER: ANALOGUE THUMBSTICK / JOYSTICK + CLICK & HOLD */}
      <div
        className="analogue-stick-zone relative z-20 w-[42%] h-[42%] rounded-full bg-[#140F0F] border border-[#2D2222] shadow-stick-base flex items-center justify-center p-1 cursor-pointer"
        onPointerDown={handleStickPointerDown}
        onPointerMove={handleStickPointerMove}
        onPointerUp={handleStickPointerUp}
        onPointerCancel={handleStickPointerUp}
      >
        <ChevronUp size={11} className={`absolute top-1 text-[#453636] pointer-events-none transition-colors ${stickOffset.y < -DEADZONE ? 'text-crafted-brand-rust' : ''}`} />
        <ChevronDown size={11} className={`absolute bottom-1 text-[#453636] pointer-events-none transition-colors ${stickOffset.y > DEADZONE ? 'text-crafted-brand-rust' : ''}`} />
        <ChevronLeft size={11} className={`absolute left-1 text-[#453636] pointer-events-none transition-colors ${stickOffset.x < -DEADZONE ? 'text-crafted-brand-rust' : ''}`} />
        <ChevronRight size={11} className={`absolute right-1 text-[#453636] pointer-events-none transition-colors ${stickOffset.x > DEADZONE ? 'text-crafted-brand-rust' : ''}`} />

        <div
          ref={stickRef}
          style={{
            transform: `translate3d(${stickOffset.x}px, ${stickOffset.y}px, 0)`,
          }}
          className={`joystick-thumb ${
            isStickReturning ? 'returning' : ''
          } relative w-[80%] h-[80%] rounded-full bg-gradient-to-b from-[#2C2222] via-[#201818] to-[#161010] border border-[#483838] shadow-stick-cap flex items-center justify-center group ${
            activeButton === 'select'
              ? 'ring-2 ring-crafted-brand-violet border-crafted-brand-violet bg-[#322424]'
              : isStickActive
              ? 'border-crafted-brand-rust shadow-[0_0_15px_rgba(212,91,62,0.35)]'
              : ''
          }`}
        >
          <div className="absolute inset-1.5 rounded-full border border-white/[0.06] pointer-events-none" />
          <div className="absolute inset-3 rounded-full border border-black/60 pointer-events-none" />

          <div
            className={`w-3 h-3 rounded-full transition-colors duration-150 ${
              isStickActive
                ? 'bg-crafted-brand-rust shadow-[0_0_8px_rgba(212,91,62,0.8)]'
                : activeButton === 'select'
                ? 'bg-crafted-brand-violet shadow-[0_0_8px_rgba(107,100,246,0.8)]'
                : 'bg-[#554242]'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
