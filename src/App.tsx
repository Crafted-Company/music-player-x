import React, { useEffect, useState } from 'react';
import { MusicPlayerProvider, useMusicPlayer } from './context/MusicPlayerContext';
import { TopScreen } from './components/screen/TopScreen';
import { ClickWheel } from './components/clickwheel/ClickWheel';
import { ServerSettingsModal } from './components/server/ServerSettingsModal';

const MobilePlayerLayout: React.FC = () => {
  const {
    togglePlayPause,
    nextTrack,
    prevTrack,
    handleWheelButton,
    handleStickDirection,
    currentView,
    setCurrentView,
    activeMenuId,
  } = useMusicPlayer();

  const [isServerModalOpen, setIsServerModalOpen] = useState(false);

  useEffect(() => {
    if (activeMenuId === 'servers') {
      setIsServerModalOpen(true);
    }
  }, [activeMenuId]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) nextTrack();
          else handleStickDirection('right');
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) prevTrack();
          else handleStickDirection('left');
          break;

        case 'ArrowUp':
          e.preventDefault();
          handleStickDirection('up');
          break;

        case 'ArrowDown':
          e.preventDefault();
          handleStickDirection('down');
          break;

        case 'Enter':
          e.preventDefault();
          handleWheelButton('select');
          break;

        case 'KeyM':
          handleWheelButton('menu');
          break;

        case 'KeyL':
          setCurrentView(currentView === 'lyrics' ? 'now-playing' : 'lyrics');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentView,
    togglePlayPause,
    nextTrack,
    prevTrack,
    handleWheelButton,
    handleStickDirection,
    setCurrentView,
  ]);

  return (
    <div
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 10px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
        paddingLeft: '10px',
        paddingRight: '10px',
      }}
      className="relative w-full h-[100dvh] bg-[#151212] text-[#F3EFEF] flex flex-col justify-between overflow-hidden select-none"
    >
      {/* TOP HALF: Display Screen (Now Playing / Synced Lyrics / Menu) */}
      <div className="relative z-10 w-full flex-1 max-h-[58%] min-h-[220px] mb-2">
        <TopScreen className="h-full" />
      </div>

      {/* BOTTOM HALF: Click Wheel + Analogue Thumbstick */}
      <div className="relative z-10 w-full flex-1 max-h-[42%] flex items-center justify-center py-1">
        <ClickWheel size={250} />
      </div>

      <ServerSettingsModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <MusicPlayerProvider>
      <MobilePlayerLayout />
    </MusicPlayerProvider>
  );
}

export default App;
