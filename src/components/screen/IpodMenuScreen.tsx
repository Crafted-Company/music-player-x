import React, { useEffect, useRef } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Disc,
  Users,
  Layers,
  ListMusic,
  Mic2,
  Sliders,
  Server,
  FolderPlus,
  Settings,
  Sparkles,
  Volume2,
  Vibrate,
  Monitor,
  Music2,
  Eye,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { TrackActionModal } from '../modal/TrackActionModal';

export const IpodMenuScreen: React.FC = () => {
  const {
    activeMenuId,
    selectedMenuIndex,
    currentMenuItems,
    navigateMenuBack,
    handleWheelButton,
    allTracks,
    playlists,
    albums,
    artists,
    actionModalTrack,
    isActionModalOpen,
    setActionModalTrack,
    setIsActionModalOpen,
  } = useMusicPlayer();

  const listRef = useRef<HTMLDivElement | null>(null);
  const selectedItemRef = useRef<HTMLDivElement | null>(null);

  const longPressTimerRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedMenuIndex]);

  const getMenuTitle = (menuId: string): string => {
    if (menuId.startsWith('pl-')) {
      const plId = menuId.replace(/^pl-/, '');
      const pl = playlists.find((p) => p.id === plId || `pl-${p.id}` === menuId || p.id === `subsonic-pl-${plId}`);
      return pl?.name || 'Playlist';
    }
    if (menuId.startsWith('alb-')) {
      const albId = menuId.replace(/^alb-/, '');
      const alb = albums.find((a) => a.id === albId || `alb-${a.id}` === menuId);
      return alb?.title || 'Album';
    }
    if (menuId.startsWith('art-')) {
      const artId = menuId.replace(/^art-/, '');
      const art = artists.find((a) => a.id === artId || `art-${a.id}` === menuId);
      return art?.name || 'Artist';
    }

    switch (menuId) {
      case 'main':
        return 'Navigation';
      case 'music':
        return 'Music';
      case 'playlists':
        return 'Playlists';
      case 'songs':
        return 'All Songs';
      case 'artists':
        return 'Artists';
      case 'albums':
        return 'Albums';
      case 'demo-tracks':
        return 'Master Hits';
      case 'equalizer':
        return 'Equalizer';
      case 'servers':
        return 'Navidrome Server';
      case 'settings':
        return 'Settings';
      case 'hidden-tracks':
        return 'Hidden Songs (Recycle Bin)';
      default:
        return 'Menu';
    }
  };

  const renderIcon = (name?: string, itemCoverUrl?: string) => {
    if (itemCoverUrl) {
      return (
        <img
          src={itemCoverUrl}
          alt="Thumbnail"
          className="w-7 h-7 rounded-md object-cover border border-[#3A2D2D] shrink-0"
        />
      );
    }

    const props = { size: 14, className: 'text-crafted-brand-rust' };
    switch (name) {
      case 'Music':
      case 'Disc':
        return <Disc {...props} />;
      case 'Library':
      case 'Layers':
        return <Layers {...props} />;
      case 'ListMusic':
        return <ListMusic {...props} />;
      case 'Mic2':
        return <Mic2 {...props} />;
      case 'Sliders':
        return <Sliders {...props} />;
      case 'Server':
        return <Server {...props} />;
      case 'FolderPlus':
        return <FolderPlus {...props} />;
      case 'Settings':
        return <Settings {...props} />;
      case 'Sparkles':
        return <Sparkles {...props} />;
      case 'Users':
      case 'User':
        return <Users {...props} />;
      case 'Volume2':
        return <Volume2 {...props} />;
      case 'Vibrate':
        return <Vibrate {...props} />;
      case 'Monitor':
        return <Monitor {...props} />;
      case 'Eye':
        return <Eye {...props} />;
      case 'RotateCcw':
        return <RotateCcw {...props} />;
      case 'Trash2':
        return <Trash2 {...props} className="text-rose-400" />;
      default:
        return <Music2 {...props} />;
    }
  };

  const handlePointerDownItem = (itemId: string, e: React.PointerEvent) => {
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    const track = allTracks.find((t) => t.id === itemId);
    if (track) {
      longPressTimerRef.current = setTimeout(() => {
        setActionModalTrack(track);
        setIsActionModalOpen(true);
      }, 450);
    }
  };

  const handlePointerMoveItem = (e: React.PointerEvent) => {
    if (touchStartPosRef.current) {
      const dist = Math.hypot(e.clientX - touchStartPosRef.current.x, e.clientY - touchStartPosRef.current.y);
      if (dist > 10 && longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handlePointerUpItem = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  return (
    <div className="flex flex-col h-full bg-[#140F0F] select-none overflow-hidden text-left">
      {/* Menu Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2D2121] bg-[#1B1414]">
        <div className="flex items-center space-x-1.5">
          {activeMenuId !== 'main' && (
            <button
              onClick={navigateMenuBack}
              className="p-0.5 -ml-1 text-crafted-brand-rust hover:text-white transition-colors"
              title="Back"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <span className="font-semibold text-xs text-white tracking-wide font-sans">
            {getMenuTitle(activeMenuId)}
          </span>
        </div>
        <span className="text-[10px] text-crafted-text-dim font-mono">
          {currentMenuItems.length > 0 ? `${selectedMenuIndex + 1}/${currentMenuItems.length}` : ''}
        </span>
      </div>

      {/* Menu Items List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto py-1 scroll-smooth divide-y divide-[#221818]"
      >
        {currentMenuItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-36 text-xs text-crafted-text-dim space-y-1 p-4 text-center">
            <p>No items found</p>
            <p className="text-[10px] text-crafted-text-muted">
              Connect to Navidrome or Scan Local Audio
            </p>
          </div>
        ) : (
          currentMenuItems.map((item, index) => {
            const isSelected = index === selectedMenuIndex;
            return (
              <div
                key={item.id}
                ref={isSelected ? selectedItemRef : null}
                onPointerDown={(e) => handlePointerDownItem(item.id, e)}
                onPointerMove={handlePointerMoveItem}
                onPointerUp={handlePointerUpItem}
                onPointerLeave={handlePointerUpItem}
                onClick={() => {
                  if (item.action) item.action();
                  else handleWheelButton('select');
                }}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'bg-gradient-to-r from-crafted-brand-rust/30 via-crafted-brand-rust/10 to-transparent text-white font-medium border-l-2 border-crafted-brand-rust'
                    : 'text-crafted-text-muted hover:text-crafted-text hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <div className="shrink-0">
                    {renderIcon(item.iconName, item.coverUrl)}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs truncate ${isSelected ? 'text-white font-medium' : 'text-[#E0D8D8]'}`}>
                      {item.label}
                    </p>
                    {item.sublabel && (
                      <p className="text-[10px] text-crafted-text-dim truncate">
                        {item.sublabel}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {item.badge !== undefined && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 border border-white/[0.06] text-crafted-text-muted font-mono">
                      {item.badge}
                    </span>
                  )}
                  {item.hasChildren && (
                    <ChevronRight size={13} className="text-crafted-text-dim" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <TrackActionModal
        track={actionModalTrack}
        playlistId={activeMenuId.startsWith('pl-') ? activeMenuId.replace(/^pl-/, '') : undefined}
        isOpen={isActionModalOpen}
        onClose={() => {
          setIsActionModalOpen(false);
          setActionModalTrack(null);
        }}
      />
    </div>
  );
};
