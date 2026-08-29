import React from 'react';
import { EyeOff, Trash2, Plus, ArrowRightLeft, X } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import type { Track } from '../../types';

interface TrackActionModalProps {
  track: Track | null;
  playlistId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TrackActionModal: React.FC<TrackActionModalProps> = ({
  track,
  playlistId,
  isOpen,
  onClose,
}) => {
  const {
    hideTrack,
    deleteTrack,
    removeTrackFromPlaylist,
    playlists,
    addTrackToPlaylist,
  } = useMusicPlayer();

  if (!isOpen || !track) return null;

  const handleMoveToPlaylist = (targetPlaylistId: string) => {
    if (playlistId) {
      removeTrackFromPlaylist(playlistId, track.id);
    }
    addTrackToPlaylist(targetPlaylistId, track);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xs rounded-2xl bg-[#1C1515] border border-[#3A2C2C] shadow-2xl p-4 space-y-3 select-none text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C2121] pb-2">
          <div className="min-w-0 pr-2">
            <h3 className="text-xs font-bold text-white truncate">{track.title}</h3>
            <p className="text-[10px] text-crafted-text-dim truncate">{track.artist}</p>
          </div>
          <button onClick={onClose} className="p-1 text-crafted-text-muted hover:text-white">
            <X size={14} />
          </button>
        </div>

        {/* Actions List */}
        <div className="space-y-1.5 text-xs">
          {/* Hide Song */}
          <button
            type="button"
            onClick={() => {
              hideTrack(track.id);
              onClose();
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl bg-[#241B1B] hover:bg-[#2F2323] text-crafted-text transition-colors"
          >
            <EyeOff size={14} className="text-crafted-brand-rust" />
            <div className="text-left">
              <p className="font-medium text-white">Hide Song</p>
              <p className="text-[10px] text-crafted-text-dim">Hide from library (restore in Settings)</p>
            </div>
          </button>

          {/* Remove from Current Playlist if inside a Playlist */}
          {playlistId && (
            <button
              type="button"
              onClick={() => {
                removeTrackFromPlaylist(playlistId, track.id);
                onClose();
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl bg-[#241B1B] hover:bg-[#2F2323] text-rose-400 transition-colors"
            >
              <Trash2 size={14} />
              <div className="text-left">
                <p className="font-medium text-white">Remove from This Playlist</p>
              </div>
            </button>
          )}

          {/* Copy / Move between playlists */}
          {playlists.length > 0 && (
            <div className="pt-1 space-y-1">
              <p className="text-[10px] font-mono text-crafted-text-dim px-1 uppercase tracking-wider">
                {playlistId ? 'Move or Copy to Playlist' : 'Add to Playlist'}
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {playlists
                  .filter((p) => p.id !== playlistId && `pl-${p.id}` !== playlistId)
                  .map((pl) => (
                    <div
                      key={pl.id}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-[#181212] border border-[#2A2020]"
                    >
                      <span className="text-[11px] text-white truncate max-w-[120px]">{pl.name}</span>
                      <div className="flex items-center space-x-1">
                        {playlistId && (
                          <button
                            type="button"
                            onClick={() => handleMoveToPlaylist(pl.id)}
                            className="px-2 py-0.5 rounded bg-[#2D2222] hover:bg-[#3D2E2E] text-[10px] font-mono text-crafted-brand-rust flex items-center space-x-0.5"
                            title="Move track to this playlist"
                          >
                            <ArrowRightLeft size={10} />
                            <span>Move</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            addTrackToPlaylist(pl.id, track);
                            onClose();
                          }}
                          className="px-2 py-0.5 rounded bg-crafted-brand-rust hover:bg-crafted-brand-rustDark text-[10px] font-mono text-white flex items-center space-x-0.5"
                          title="Copy track to this playlist"
                        >
                          <Plus size={10} />
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Delete Local File */}
          {track.source === 'local' && (
            <button
              type="button"
              onClick={() => {
                deleteTrack(track.id);
                onClose();
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 transition-colors"
            >
              <Trash2 size={14} />
              <div className="text-left">
                <p className="font-medium">Delete Local Song</p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
