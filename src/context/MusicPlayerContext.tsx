import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type {
  Album,
  Artist,
  IpodMenuItem,
  IpodScreenView,
  LyricsData,
  Playlist,
  SubsonicServerConfig,
  Track,
} from '../types';
import { audioEngine, DEFAULT_EQ_PRESETS } from '../services/audioEngine';
import { lyricsService } from '../services/lyricsService';
import { subsonicService, PRECONFIGURED_SERVERS } from '../services/subsonicService';
import { localLibraryService } from '../services/localLibraryService';
import { coverService } from '../services/coverService';
import { DEMO_PLAYLISTS, DEMO_TRACKS } from '../services/demoTracks';

interface MusicPlayerContextType {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';

  lyricsData: LyricsData | null;
  activeLyricIndex: number;
  lyricsOffset: number;
  isLoadingLyrics: boolean;

  currentView: IpodScreenView;
  activeMenuId: string;
  selectedMenuIndex: number;
  currentMenuItems: IpodMenuItem[];

  allTracks: Track[];
  playlists: Playlist[];
  artists: Artist[];
  albums: Album[];
  hiddenTrackIds: string[];
  servers: SubsonicServerConfig[];
  activeServer: SubsonicServerConfig | null;

  // Batch Metadata Fetching State
  isFetchingAllMetadata: boolean;
  metadataProgress: { current: number; total: number; title: string } | null;
  fetchAllMetadata: () => Promise<void>;
  fetchPlaylistMetadata: (playlistId: string) => Promise<void>;
  fetchAlbumMetadata: (albumId: string) => Promise<void>;
  fetchArtistMetadata: (artistName: string) => Promise<void>;
  resetApp: () => Promise<void>;

  // Track Action Context Modal state
  actionModalTrack: Track | null;
  isActionModalOpen: boolean;
  setActionModalTrack: (track: Track | null) => void;
  setIsActionModalOpen: (open: boolean) => void;

  eqPresets: string[];
  activeEqPreset: string;
  currentEqGains: number[];

  wheelClickSoundEnabled: boolean;
  wheelHapticsEnabled: boolean;

  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  setVolumeLevel: (vol: number) => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  setLyricsOffsetDelta: (delta: number) => void;
  seekToLyricLine: (seconds: number) => void;
  setCurrentView: (view: IpodScreenView) => void;
  setWheelClickSoundEnabled: (enabled: boolean) => void;
  setWheelHapticsEnabled: (enabled: boolean) => void;

  handleWheelScroll: (delta: number) => void;
  handleWheelButton: (button: 'menu' | 'prev' | 'next' | 'play-pause' | 'select' | 'hold') => void;
  handleStickDirection: (dir: 'up' | 'down' | 'left' | 'right') => void;
  navigateMenuTo: (menuId: string) => void;
  navigateMenuBack: () => void;

  hideTrack: (trackId: string) => void;
  unhideTrack: (trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  deleteTrack: (trackId: string) => void;

  openDirectoryPicker: () => Promise<void>;
  saveServerConfig: (server: SubsonicServerConfig) => void;
  testServerConnection: (serverId: string) => Promise<boolean>;
  loadSubsonicLibrary: (server: SubsonicServerConfig) => Promise<void>;
  setEqPreset: (name: string) => void;
  setEqBandGain: (bandIndex: number, gainDb: number) => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

export const MusicPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allTracks, setAllTracks] = useState<Track[]>(DEMO_TRACKS);
  const [playlists, setPlaylists] = useState<Playlist[]>(DEMO_PLAYLISTS);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);

  const [isFetchingAllMetadata, setIsFetchingAllMetadata] = useState<boolean>(false);
  const [metadataProgress, setMetadataProgress] = useState<{ current: number; total: number; title: string } | null>(null);

  const [actionModalTrack, setActionModalTrack] = useState<Track | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);

  const [hiddenTrackIds, setHiddenTrackIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crafted_hidden_tracks');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [queue, setQueue] = useState<Track[]>(DEMO_TRACKS);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('all');
  const [shuffleDeck, setShuffleDeck] = useState<number[]>([]);

  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [activeLyricIndex, setActiveLyricIndex] = useState<number>(-1);
  const [lyricsOffset, setLyricsOffset] = useState<number>(0);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);

  const [currentView, setCurrentView] = useState<IpodScreenView>('now-playing');

  const [activeMenuId, setActiveMenuId] = useState<string>('main');
  const [selectedMenuIndex, setSelectedMenuIndex] = useState<number>(0);
  const [menuHistory, setMenuHistory] = useState<{ menuId: string; selectedIndex: number }[]>([]);

  const [servers, setServers] = useState<SubsonicServerConfig[]>(() => {
    try {
      const saved = localStorage.getItem('crafted_servers');
      if (saved) {
        const parsed = JSON.parse(saved) as SubsonicServerConfig[];
        const valid = parsed.filter((s) => s.url && !s.url.includes('localhost'));
        if (valid.length > 0) {
          return valid.map((s) => ({
            ...s,
            password: s.password || 'admin',
          }));
        }
      }
    } catch (e) {}
    return PRECONFIGURED_SERVERS;
  });

  const [activeServer, setActiveServer] = useState<SubsonicServerConfig | null>(() => {
    try {
      const saved = localStorage.getItem('crafted_servers');
      if (saved) {
        const list = JSON.parse(saved) as SubsonicServerConfig[];
        const found = list.find((s) => s.isActive && s.url && !s.url.includes('localhost'));
        if (found) return { ...found, password: found.password || 'admin' };
      }
    } catch (e) {}
    return PRECONFIGURED_SERVERS[0];
  });

  const eqPresets = Object.keys(DEFAULT_EQ_PRESETS);
  const [activeEqPreset, setActiveEqPreset] = useState<string>('Crafted Warmth');
  const [currentEqGains, setCurrentEqGains] = useState<number[]>(DEFAULT_EQ_PRESETS['Crafted Warmth']);

  const [wheelClickSoundEnabled, setWheelClickSoundEnabled] = useState<boolean>(true);
  const [wheelHapticsEnabled, setWheelHapticsEnabled] = useState<boolean>(true);

  const audioElRef = useRef<HTMLAudioElement>(audioEngine.getAudioElement());

  // Load stored tracks & playlists on startup & sync with server
  useEffect(() => {
    const initLibrary = async () => {
      const stored = await localLibraryService.loadStoredTracks();
      const storedPlaylists = await localLibraryService.loadStoredPlaylists();

      if (stored && stored.length > 0) {
        const hydrated = stored.map((t) => {
          const parsed = coverService.parseArtistAndTitle(t.title, t.artist);
          const cachedArtist = coverService.getCachedArtist(t.title) || coverService.getCachedArtist(parsed.title);
          const finalArtist =
            t.artist && t.artist !== 'Various Artists'
              ? t.artist
              : cachedArtist || (parsed.artist && parsed.artist !== 'Various Artists' ? parsed.artist : t.artist);
          const cachedCover =
            t.coverUrl ||
            coverService.getCachedCover(t.title, finalArtist) ||
            coverService.getCachedCover(parsed.title, parsed.artist) ||
            undefined;
          return {
            ...t,
            artist: finalArtist || 'Unknown Artist',
            coverUrl: cachedCover,
          };
        });
        setAllTracks(hydrated);
        if (!currentTrack) {
          setCurrentTrack(hydrated[0]);
          setQueue(hydrated);
        }
      }
      if (storedPlaylists && storedPlaylists.length > 0) {
        setPlaylists(storedPlaylists);
      }

      const srvToConnect = activeServer || PRECONFIGURED_SERVERS[0];
      if (srvToConnect) {
        loadSubsonicLibrary(srvToConnect);
      }
    };
    initLibrary();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const srv = activeServer || PRECONFIGURED_SERVERS[0];
        if (srv) {
          loadSubsonicLibrary(srv);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const visibleTracks = allTracks.filter((t) => !hiddenTrackIds.includes(t.id));

  // Update artists & albums & 1-4 cover collages
  useEffect(() => {
    const derivedArtists = localLibraryService.groupTracksByArtist(visibleTracks);
    const derivedAlbums = localLibraryService.groupTracksByAlbum(visibleTracks);
    setArtists(derivedArtists);
    setAlbums(derivedAlbums);

    playlists.forEach(async (pl) => {
      const validPlTracks = (pl.tracks || []).filter((t) => !hiddenTrackIds.includes(t.id));
      if (validPlTracks.length > 0 && !pl.coverUrl) {
        const covers = validPlTracks.map((t) => t.coverUrl || '').filter(Boolean);
        if (covers.length > 0) {
          const mosaic = await coverService.generateMosaicCollage(covers);
          setPlaylists((curr) =>
            curr.map((item) => (item.id === pl.id && item.coverUrl !== mosaic ? { ...item, coverUrl: mosaic } : item))
          );
        }
      }
    });
  }, [allTracks, hiddenTrackIds]);

  // Audio listeners & System MediaSession Notification Sync
  useEffect(() => {
    const audio = audioElRef.current;
    audioEngine.setEqualizerGains(currentEqGains);
    audioEngine.setVolume(volume);

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if ('mediaSession' in navigator && audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: Math.max(1, audio.duration),
            playbackRate: audio.playbackRate || 1.0,
            position: Math.min(audio.currentTime, audio.duration),
          });
        } catch (e) {}
      }
    };
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onPlay = () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };
    const onPause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };
    const onEnded = () => {
      // Guard against mid-stream network hiccups triggering premature end
      if (audio.duration > 5 && audio.currentTime < audio.duration - 2) {
        console.warn('Stream interrupted before end, not skipping');
        return;
      }
      if (repeatMode === 'one') {
        audioEngine.seek(0);
        audioEngine.play();
      } else {
        nextTrack();
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => audioEngine.play());
      navigator.mediaSession.setActionHandler('pause', () => audioEngine.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) seek(details.seekTime);
      });
      navigator.mediaSession.setActionHandler('seekbackward', () => seek(Math.max(0, audio.currentTime - 10)));
      navigator.mediaSession.setActionHandler('seekforward', () => seek(Math.min(audio.duration || 0, audio.currentTime + 10)));
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [repeatMode, queue, queueIndex, duration]);

  // Sync Android / System Lockscreen & Notification Panel Metadata
  useEffect(() => {
    if ('mediaSession' in navigator) {
      if (currentTrack) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album || 'Crafted Vault',
          artwork: [
            {
              src: currentTrack.coverUrl || '/icon.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        });
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      } else {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      }
    }
  }, [currentTrack, isPlaying]);

  // Active lyric tracker
  useEffect(() => {
    if (!lyricsData || !lyricsData.lines || lyricsData.lines.length === 0) {
      setActiveLyricIndex(-1);
      return;
    }
    const idx = lyricsService.findActiveLineIndex(lyricsData.lines, currentTime, lyricsOffset);
    setActiveLyricIndex(idx);
  }, [currentTime, lyricsData, lyricsOffset]);

  // Auto-fetch artwork & lyrics online when track plays
  useEffect(() => {
    if (!currentTrack) return;
    setLyricsOffset(0);

    if (!currentTrack.coverUrl) {
      const cached = coverService.getCachedCover(currentTrack.title, currentTrack.artist);
      if (cached) {
        setCurrentTrack((curr) => (curr && curr.id === currentTrack.id ? { ...curr, coverUrl: cached } : curr));
        setAllTracks((curr) => curr.map((t) => (t.id === currentTrack.id ? { ...t, coverUrl: cached } : t)));
      } else {
        coverService.fetchArtworkOnline(currentTrack.title, currentTrack.artist).then((result) => {
          if (result.coverUrl) {
            const finalArtist = (currentTrack.artist === 'Various Artists' && result.discoveredArtist) ? result.discoveredArtist : currentTrack.artist;
            setCurrentTrack((curr) =>
              curr && curr.id === currentTrack.id ? { ...curr, coverUrl: result.coverUrl!, artist: finalArtist } : curr
            );
            setAllTracks((curr) => {
              const updated = curr.map((t) =>
                t.id === currentTrack.id ? { ...t, coverUrl: result.coverUrl!, artist: finalArtist } : t
              );
              localLibraryService.saveTracks(updated);
              return updated;
            });
          }
        });
      }
    }

    setIsLoadingLyrics(true);
    lyricsService
      .fetchLyrics(currentTrack)
      .then((data) => {
        setLyricsData(data);
      })
      .finally(() => {
        setIsLoadingLyrics(false);
      });
  }, [currentTrack?.id]);

  const resetApp = async () => {
    await localLibraryService.clearAllAppStorage();
    setAllTracks([]);
    setPlaylists([]);
    setHiddenTrackIds([]);
    setCurrentTrack(null);
    setQueue([]);
    setQueueIndex(0);
    setActiveServer(null);
    setActiveMenuId('main');
    setSelectedMenuIndex(0);
    setCurrentView('menu');
  };

  const fetchPlaylistMetadata = async (playlistId: string) => {
    const cleanId = playlistId.replace(/^pl-/, '');
    const targetPl = playlists.find(
      (p) =>
        p.id === cleanId ||
        `pl-${p.id}` === playlistId ||
        p.id === playlistId ||
        p.id === `subsonic-album-pl-${cleanId}`
    );
    if (!targetPl || !targetPl.tracks || targetPl.tracks.length === 0) return;

    setIsFetchingAllMetadata(true);
    const plTracks = [...targetPl.tracks];
    const total = plTracks.length;

    for (let i = 0; i < total; i++) {
      const track = plTracks[i];
      setMetadataProgress({
        current: i + 1,
        total,
        title: `${track.title} - ${track.artist}`,
      });

      const res = await coverService.fetchArtworkOnline(track.title, track.artist);
      if (res.coverUrl) {
        track.coverUrl = res.coverUrl;
      }
      if (track.artist === 'Various Artists' && res.discoveredArtist) {
        track.artist = res.discoveredArtist;
      }
      await lyricsService.fetchLyrics(track);
    }

    const covers = plTracks.map((t) => t.coverUrl || '').filter(Boolean);
    const mosaic = covers.length > 0 ? await coverService.generateMosaicCollage(covers) : targetPl.coverUrl;

    const updatedPls = playlists.map((p) =>
      p.id === targetPl.id ? { ...p, tracks: plTracks, coverUrl: mosaic } : p
    );
    setPlaylists(updatedPls);
    await localLibraryService.savePlaylists(updatedPls);

    const updatedTracks = allTracks.map((t) => {
      const match = plTracks.find((pt) => pt.id === t.id);
      return match ? { ...t, coverUrl: match.coverUrl || t.coverUrl, artist: match.artist || t.artist } : t;
    });
    setAllTracks(updatedTracks);
    await localLibraryService.saveTracks(updatedTracks);

    setIsFetchingAllMetadata(false);
    setMetadataProgress(null);
  };

  const fetchAlbumMetadata = async (albumId: string) => {
    const targetAlb = albums.find((a) => a.id === albumId || `alb-${a.id}` === albumId);
    const albTracks =
      targetAlb?.tracks?.filter((t) => !hiddenTrackIds.includes(t.id)) ||
      visibleTracks.filter((t) => t.album === targetAlb?.title);
    if (!albTracks || albTracks.length === 0) return;

    setIsFetchingAllMetadata(true);
    const total = albTracks.length;

    for (let i = 0; i < total; i++) {
      const track = albTracks[i];
      setMetadataProgress({
        current: i + 1,
        total,
        title: `${track.title} - ${track.artist}`,
      });

      const res = await coverService.fetchArtworkOnline(track.title, track.artist);
      if (res.coverUrl) {
        track.coverUrl = res.coverUrl;
      }
      if (track.artist === 'Various Artists' && res.discoveredArtist) {
        track.artist = res.discoveredArtist;
      }
      await lyricsService.fetchLyrics(track);
    }

    const updatedTracks = allTracks.map((t) => {
      const match = albTracks.find((at) => at.id === t.id);
      return match ? { ...t, coverUrl: match.coverUrl || t.coverUrl, artist: match.artist || t.artist } : t;
    });
    setAllTracks(updatedTracks);
    await localLibraryService.saveTracks(updatedTracks);

    setIsFetchingAllMetadata(false);
    setMetadataProgress(null);
  };

  const fetchArtistMetadata = async (artistName: string) => {
    const artTracks = visibleTracks.filter((t) => t.artist === artistName);
    if (!artTracks || artTracks.length === 0) return;

    setIsFetchingAllMetadata(true);
    const total = artTracks.length;

    for (let i = 0; i < total; i++) {
      const track = artTracks[i];
      setMetadataProgress({
        current: i + 1,
        total,
        title: `${track.title} - ${track.artist}`,
      });

      const res = await coverService.fetchArtworkOnline(track.title, track.artist);
      if (res.coverUrl) {
        track.coverUrl = res.coverUrl;
      }
      if (track.artist === 'Various Artists' && res.discoveredArtist) {
        track.artist = res.discoveredArtist;
      }
      await lyricsService.fetchLyrics(track);
    }

    const updatedTracks = allTracks.map((t) => {
      const match = artTracks.find((at) => at.id === t.id);
      return match ? { ...t, coverUrl: match.coverUrl || t.coverUrl, artist: match.artist || t.artist } : t;
    });
    setAllTracks(updatedTracks);
    await localLibraryService.saveTracks(updatedTracks);

    setIsFetchingAllMetadata(false);
    setMetadataProgress(null);
  };

  const fetchAllMetadata = async () => {
    if (isFetchingAllMetadata || allTracks.length === 0) return;

    setIsFetchingAllMetadata(true);
    const total = allTracks.length;
    const updatedTracks: Track[] = [...allTracks];

    for (let i = 0; i < total; i++) {
      const track = updatedTracks[i];
      setMetadataProgress({
        current: i + 1,
        total,
        title: `${track.title} - ${track.artist}`,
      });

      const res = await coverService.fetchArtworkOnline(track.title, track.artist);
      if (res.coverUrl) {
        track.coverUrl = res.coverUrl;
      }
      if (track.artist === 'Various Artists' && res.discoveredArtist) {
        track.artist = res.discoveredArtist;
      }
      await lyricsService.fetchLyrics(track);
    }

    setAllTracks(updatedTracks);
    await localLibraryService.saveTracks(updatedTracks);

    const updatedPlaylists = await Promise.all(
      playlists.map(async (pl) => {
        const plTracks = (pl.tracks || []).map((t) => {
          const found = updatedTracks.find((ut) => ut.id === t.id);
          return found || t;
        });
        const covers = plTracks.map((t) => t.coverUrl || '').filter(Boolean);
        const mosaic = covers.length > 0 ? await coverService.generateMosaicCollage(covers) : pl.coverUrl;
        return {
          ...pl,
          tracks: plTracks,
          coverUrl: mosaic,
        };
      })
    );

    setPlaylists(updatedPlaylists);
    await localLibraryService.savePlaylists(updatedPlaylists);

    setIsFetchingAllMetadata(false);
    setMetadataProgress(null);
  };

  const playTrack = (track: Track, newQueue?: Track[]) => {
    let playUrl = track.audioUrl;
    const effectiveServer = activeServer || PRECONFIGURED_SERVERS[0];
    if (track.source === 'subsonic' && track.subsonicId && effectiveServer) {
      playUrl = subsonicService.getStreamUrl(effectiveServer, track.subsonicId);
      track.audioUrl = playUrl;
    }

    if (newQueue && newQueue.length > 0) {
      const filtered = newQueue.filter((t) => !hiddenTrackIds.includes(t.id));
      setQueue(filtered);
      const idx = filtered.findIndex((t) => t.id === track.id);
      setQueueIndex(idx !== -1 ? idx : 0);
    } else {
      const existingIdx = queue.findIndex((t) => t.id === track.id);
      if (existingIdx !== -1) {
        setQueueIndex(existingIdx);
      } else {
        setQueue((curr) => [track, ...curr]);
        setQueueIndex(0);
      }
    }

    setCurrentTrack(track);
    audioEngine.loadTrack(playUrl);
    audioEngine.play();
  };

  const togglePlayPause = () => {
    if (!currentTrack && visibleTracks.length > 0) {
      playTrack(visibleTracks[0]);
      return;
    }
    if (isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.play();
    }
  };

  const nextTrack = () => {
    if (queue.length === 0) return;

    let nextIdx = queueIndex + 1;

    if (isShuffle) {
      // True non-repeating shuffle deck
      let currentDeck = [...shuffleDeck];
      if (currentDeck.length === 0) {
        const pool = Array.from({ length: queue.length }, (_, i) => i).filter((i) => i !== queueIndex);
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        currentDeck = pool.length > 0 ? pool : [0];
      }
      nextIdx = currentDeck.shift()!;
      setShuffleDeck(currentDeck);
    } else if (nextIdx >= queue.length) {
      if (repeatMode === 'off') {
        audioEngine.pause();
        return;
      }
      nextIdx = 0;
    }

    setQueueIndex(nextIdx);
    const nextT = queue[nextIdx];
    if (nextT) {
      playTrack(nextT, queue);
    }
  };

  const prevTrack = () => {
    if (queue.length === 0) return;
    if (currentTime > 3) {
      seek(0);
      return;
    }
    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = queue.length - 1;
    }
    setQueueIndex(prevIdx);
    const prevT = queue[prevIdx];
    if (prevT) {
      playTrack(prevT, queue);
    }
  };

  const seek = (seconds: number) => {
    audioEngine.seek(seconds);
    setCurrentTime(seconds);
  };

  const setVolumeLevel = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    audioEngine.setVolume(clamped);
    setIsMuted(clamped === 0);
  };

  const toggleShuffle = () => {
    setIsShuffle((curr) => {
      const next = !curr;
      if (next) {
        setShuffleDeck([]);
      }
      return next;
    });
  };

  const cycleRepeatMode = () => {
    setRepeatMode((curr) => (curr === 'off' ? 'all' : curr === 'all' ? 'one' : 'off'));
  };

  const setLyricsOffsetDelta = (delta: number) => {
    setLyricsOffset((curr) => Math.round((curr + delta) * 10) / 10);
  };

  const seekToLyricLine = (seconds: number) => {
    seek(seconds);
    if (!isPlaying) {
      audioEngine.play();
    }
  };

  const setEqPreset = (presetName: string) => {
    const gains = DEFAULT_EQ_PRESETS[presetName];
    if (gains) {
      setActiveEqPreset(presetName);
      setCurrentEqGains([...gains]);
      audioEngine.setEqualizerGains(gains);
    }
  };

  const setEqBandGain = (bandIndex: number, gainDb: number) => {
    const newGains = [...currentEqGains];
    newGains[bandIndex] = gainDb;
    setCurrentEqGains(newGains);
    setActiveEqPreset('Custom');
    audioEngine.setEqualizerGains(newGains);
  };

  const hideTrack = (trackId: string) => {
    setHiddenTrackIds((prev) => {
      const updated = Array.from(new Set([...prev, trackId]));
      localStorage.setItem('crafted_hidden_tracks', JSON.stringify(updated));
      return updated;
    });
  };

  const unhideTrack = (trackId: string) => {
    setHiddenTrackIds((prev) => {
      const updated = prev.filter((id) => id !== trackId);
      localStorage.setItem('crafted_hidden_tracks', JSON.stringify(updated));
      return updated;
    });
  };

  const removeTrackFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) => {
      const updated = prev.map((pl) => {
        if (pl.id === playlistId && pl.tracks) {
          const updatedTracks = pl.tracks.filter((t) => t.id !== trackId);
          return { ...pl, tracks: updatedTracks, trackCount: updatedTracks.length };
        }
        return pl;
      });
      localLibraryService.savePlaylists(updated);
      return updated;
    });
  };

  const addTrackToPlaylist = (playlistId: string, track: Track) => {
    setPlaylists((prev) => {
      const updated = prev.map((pl) => {
        if (pl.id === playlistId) {
          const existing = pl.tracks || [];
          if (!existing.some((t) => t.id === track.id)) {
            const upTracks = [...existing, track];
            return { ...pl, tracks: upTracks, trackCount: upTracks.length };
          }
        }
        return pl;
      });
      localLibraryService.savePlaylists(updated);
      return updated;
    });
  };

  const deleteTrack = async (trackId: string) => {
    await localLibraryService.deleteStoredTrack(trackId);
    setAllTracks((prev) => prev.filter((t) => t.id !== trackId));
    setQueue((prev) => prev.filter((t) => t.id !== trackId));
  };

  const openDirectoryPicker = async () => {
    try {
      const result = await localLibraryService.pickAudioFiles();
      if (result && result.tracks.length > 0) {
        setAllTracks((prev) => [...prev, ...result.tracks]);

        const folderCovers = result.tracks.map((t) => t.coverUrl || '').filter(Boolean);
        const folderCoverUrl = await coverService.generateMosaicCollage(folderCovers);
        const newPl: Playlist = {
          id: `playlist-folder-${Date.now()}`,
          name: result.playlistName,
          trackCount: result.tracks.length,
          coverUrl: folderCoverUrl,
          tracks: result.tracks,
          isCustom: true,
        };

        setPlaylists((prev) => [newPl, ...prev]);
        await localLibraryService.savePlaylists([newPl]);

        setActiveMenuId('playlists');
        setSelectedMenuIndex(0);
        setCurrentView('menu');
      }
    } catch (e: any) {
      console.warn('Folder import error:', e);
    }
  };

  const saveServerConfig = (server: SubsonicServerConfig) => {
    setServers((curr) => {
      const existing = curr.findIndex((s) => s.id === server.id);
      let updated;
      if (existing !== -1) {
        updated = [...curr];
        updated[existing] = server;
      } else {
        updated = [...curr, server];
      }
      localStorage.setItem('crafted_servers', JSON.stringify(updated));
      return updated;
    });
  };

  const testServerConnection = async (serverId: string): Promise<boolean> => {
    const target = servers.find((s) => s.id === serverId);
    if (!target) return false;

    saveServerConfig({ ...target, status: 'testing' });
    const result = await subsonicService.ping(target);

    const updatedConfig: SubsonicServerConfig = {
      ...target,
      status: result.success ? 'connected' : 'error',
      latencyMs: result.latencyMs,
      lastChecked: Date.now(),
    };
    saveServerConfig(updatedConfig);

    if (result.success) {
      setActiveServer(updatedConfig);
      await loadSubsonicLibrary(updatedConfig);
    }
    return result.success;
  };

  const loadSubsonicLibrary = async (server: SubsonicServerConfig) => {
    try {
      const remoteSongs = await subsonicService.getAllSongs(server);
      if (remoteSongs.length > 0) {
        let finalMergedSongs: Track[] = [];

        setAllTracks((curr) => {
          const nonSubsonic = curr.filter((t) => t.source !== 'subsonic');
          const mergedRemote = remoteSongs.map((remote) => {
            const parsed = coverService.parseArtistAndTitle(remote.title, remote.artist);
            const cleanTitle = parsed.title || remote.title;
            const existing = curr.find(
              (t) => t.id === remote.id || t.title === cleanTitle || t.title === remote.title
            );

            const cachedArtist = coverService.getCachedArtist(cleanTitle) || coverService.getCachedArtist(remote.title);
            const cachedCover =
              existing?.coverUrl ||
              coverService.getCachedCover(cleanTitle, parsed.artist) ||
              coverService.getCachedCover(remote.title, remote.artist);

            const finalArtist =
              (existing?.artist && existing.artist !== 'Various Artists')
                ? existing.artist
                : cachedArtist || (parsed.artist && parsed.artist !== 'Various Artists' ? parsed.artist : remote.artist);

            return {
              ...remote,
              title: cleanTitle,
              artist: finalArtist || 'Unknown Artist',
              coverUrl: cachedCover || remote.coverUrl,
            };
          });

          finalMergedSongs = mergedRemote;
          const merged = [...nonSubsonic, ...mergedRemote];
          localLibraryService.saveTracks(merged);
          return merged;
        });

        // Group enriched remote songs by album/folder into Playlists
        const albumGroups = new Map<string, Track[]>();
        finalMergedSongs.forEach((song) => {
          const folderName = song.album || 'Navidrome Vault';
          if (!albumGroups.has(folderName)) albumGroups.set(folderName, []);
          albumGroups.get(folderName)!.push(song);
        });

        const albumPlaylists: Playlist[] = await Promise.all(
          Array.from(albumGroups.entries()).map(async ([folderName, songs]) => {
            const cleanSlug = folderName.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const covers = songs.map((s) => s.coverUrl || '').filter(Boolean);
            const mosaic = covers.length > 0 ? await coverService.generateMosaicCollage(covers) : undefined;
            return {
              id: `subsonic-folder-${cleanSlug}`,
              name: folderName,
              trackCount: songs.length,
              coverUrl: mosaic,
              tracks: songs,
            };
          })
        );

        // Fetch user custom playlists from Navidrome
        const remotePlaylists = await subsonicService.getPlaylists(server);
        const populatedCustomPlaylists: Playlist[] = [];

        for (const pl of remotePlaylists) {
          const rawTracks = await subsonicService.getPlaylistTracks(server, pl.id);
          const enrichedTracks = rawTracks.map((raw) => {
            const match = finalMergedSongs.find((m) => m.id === raw.id || m.title === raw.title);
            return match || raw;
          });
          const covers = enrichedTracks.map((t) => t.coverUrl || '').filter(Boolean);
          const mosaic = covers.length > 0 ? await coverService.generateMosaicCollage(covers) : pl.coverUrl;

          populatedCustomPlaylists.push({
            ...pl,
            tracks: enrichedTracks,
            trackCount: enrichedTracks.length || pl.trackCount,
            coverUrl: mosaic,
          });
        }

        // Deduplicate combined playlists by normalized name so no duplicate folders exist
        const playlistMap = new Map<string, Playlist>();
        [...populatedCustomPlaylists, ...albumPlaylists].forEach((pl) => {
          const key = pl.name.toLowerCase().trim();
          if (!playlistMap.has(key)) {
            playlistMap.set(key, pl);
          } else {
            const existing = playlistMap.get(key)!;
            if ((pl.tracks?.length || 0) > (existing.tracks?.length || 0)) {
              playlistMap.set(key, pl);
            }
          }
        });
        const uniqueSubsonicPlaylists = Array.from(playlistMap.values());

        if (uniqueSubsonicPlaylists.length > 0) {
          setPlaylists((curr) => {
            const nonSubsonic = curr.filter((p) => !p.id.startsWith('subsonic-'));
            const updated = [...nonSubsonic, ...uniqueSubsonicPlaylists];
            localLibraryService.savePlaylists(updated);
            return updated;
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load Subsonic library:', e);
    }
  };

  const computeMenuItems = (): IpodMenuItem[] => {
    // 1. Inside Playlist Submenu
    if (activeMenuId.startsWith('pl-')) {
      const plId = activeMenuId.replace(/^pl-/, '');
      const targetPl = playlists.find(
        (p) =>
          p.id === plId ||
          `pl-${p.id}` === activeMenuId ||
          p.id === `subsonic-pl-${plId}` ||
          p.id === `subsonic-album-pl-${plId}`
      );
      const validTracks = (targetPl?.tracks || []).filter((t) => !hiddenTrackIds.includes(t.id));

      const items: IpodMenuItem[] = [
        {
          id: `fetch-meta-${targetPl?.id || activeMenuId}`,
          label: 'Fetch Playlist Metadata',
          sublabel: 'Download covers & lyrics for this playlist',
          iconName: 'Sparkles',
          action: () => {
            if (targetPl) fetchPlaylistMetadata(targetPl.id);
          },
        },
      ];

      if (validTracks.length > 0) {
        const songItems = validTracks.map((t) => ({
          id: t.id,
          label: t.title,
          sublabel: t.artist,
          badge: `${Math.floor(t.duration / 60)}:${Math.floor(t.duration % 60).toString().padStart(2, '0')}`,
          iconName: 'Music2',
          coverUrl: t.coverUrl || coverService.getCachedCover(t.title, t.artist) || undefined,
          action: () => {
            playTrack(t, validTracks);
            setCurrentView('now-playing');
          },
        }));
        return [...items, ...songItems];
      }

      return [
        ...items,
        {
          id: 'empty-pl',
          label: targetPl?.name || 'Playlist',
          sublabel: 'No songs found in playlist',
        },
      ];
    }

    // 2. Inside Album Submenu
    if (activeMenuId.startsWith('alb-')) {
      const albId = activeMenuId.replace(/^alb-/, '');
      const targetAlb = albums.find((a) => a.id === albId || `alb-${a.id}` === activeMenuId);
      const validTracks =
        targetAlb?.tracks?.filter((t) => !hiddenTrackIds.includes(t.id)) ||
        visibleTracks.filter((t) => t.album === targetAlb?.title);

      const items: IpodMenuItem[] = [
        {
          id: `fetch-meta-${targetAlb?.id || activeMenuId}`,
          label: 'Fetch Album Metadata',
          sublabel: 'Download covers & lyrics for this album',
          iconName: 'Sparkles',
          action: () => {
            if (targetAlb) fetchAlbumMetadata(targetAlb.id);
          },
        },
      ];

      if (validTracks.length > 0) {
        const songItems = validTracks.map((t) => ({
          id: t.id,
          label: t.title,
          sublabel: t.artist,
          badge: `${Math.floor(t.duration / 60)}:${Math.floor(t.duration % 60).toString().padStart(2, '0')}`,
          iconName: 'Music2',
          coverUrl: t.coverUrl || coverService.getCachedCover(t.title, t.artist) || undefined,
          action: () => {
            playTrack(t, validTracks);
            setCurrentView('now-playing');
          },
        }));
        return [...items, ...songItems];
      }

      return [
        ...items,
        {
          id: 'empty-alb',
          label: targetAlb?.title || 'Album',
          sublabel: 'No songs found in album',
        },
      ];
    }

    // 3. Inside Artist Submenu
    if (activeMenuId.startsWith('art-')) {
      const artId = activeMenuId.replace(/^art-/, '');
      const targetArt = artists.find((a) => a.id === artId || `art-${a.id}` === activeMenuId);
      const validTracks = visibleTracks.filter((t) => t.artist === targetArt?.name);

      const items: IpodMenuItem[] = [
        {
          id: `fetch-meta-${targetArt?.id || activeMenuId}`,
          label: 'Fetch Artist Metadata',
          sublabel: 'Download covers & lyrics for this artist',
          iconName: 'Sparkles',
          action: () => {
            if (targetArt) fetchArtistMetadata(targetArt.name);
          },
        },
      ];

      if (validTracks.length > 0) {
        const songItems = validTracks.map((t) => ({
          id: t.id,
          label: t.title,
          sublabel: t.album,
          badge: `${Math.floor(t.duration / 60)}:${Math.floor(t.duration % 60).toString().padStart(2, '0')}`,
          iconName: 'Music2',
          coverUrl: t.coverUrl || coverService.getCachedCover(t.title, t.artist) || undefined,
          action: () => {
            playTrack(t, validTracks);
            setCurrentView('now-playing');
          },
        }));
        return [...items, ...songItems];
      }

      return [
        ...items,
        {
          id: 'empty-art',
          label: targetArt?.name || 'Artist',
          sublabel: 'No songs found for artist',
        },
      ];
    }

    switch (activeMenuId) {
      case 'main':
        return [
          { id: 'now-playing', label: 'Now Playing', iconName: 'Music', action: () => setCurrentView('now-playing') },
          { id: 'music', label: 'Music', iconName: 'Library', hasChildren: true, targetMenuId: 'music' },
          { id: 'playlists', label: 'Playlists', iconName: 'ListMusic', badge: playlists.length, hasChildren: true, targetMenuId: 'playlists' },
          { id: 'lyrics', label: 'Lyrics', iconName: 'Mic2', action: () => setCurrentView('lyrics') },
          { id: 'equalizer', label: 'Equalizer', iconName: 'Sliders', hasChildren: true, targetMenuId: 'equalizer' },
          { id: 'servers', label: 'Navidrome Server', iconName: 'Server', badge: activeServer ? 'Connected' : 'Configure', hasChildren: true, targetMenuId: 'servers' },
          { id: 'local-scan', label: 'Scan Local Audio', iconName: 'FolderPlus', action: () => openDirectoryPicker() },
          { id: 'settings', label: 'Settings', iconName: 'Settings', hasChildren: true, targetMenuId: 'settings' },
        ];

      case 'music':
        return [
          { id: 'songs', label: 'All Songs', iconName: 'Disc', badge: visibleTracks.length, hasChildren: true, targetMenuId: 'songs' },
          { id: 'artists', label: 'Artists', iconName: 'Users', badge: artists.length, hasChildren: true, targetMenuId: 'artists' },
          { id: 'albums', label: 'Albums', iconName: 'Layers', badge: albums.length, hasChildren: true, targetMenuId: 'albums' },
        ];

      case 'playlists':
        return playlists.map((pl) => ({
          id: `pl-${pl.id}`,
          label: pl.name,
          sublabel: `${(pl.tracks || []).filter((t) => !hiddenTrackIds.includes(t.id)).length || pl.trackCount} tracks`,
          iconName: 'ListMusic',
          coverUrl: pl.coverUrl,
          hasChildren: true,
          targetMenuId: `pl-${pl.id}`,
        }));

      case 'songs':
        return visibleTracks.map((t) => ({
          id: t.id,
          label: t.title,
          sublabel: t.artist,
          badge: `${Math.floor(t.duration / 60)}:${Math.floor(t.duration % 60).toString().padStart(2, '0')}`,
          iconName: 'Music2',
          coverUrl: t.coverUrl || coverService.getCachedCover(t.title, t.artist) || undefined,
          action: () => {
            playTrack(t, visibleTracks);
            setCurrentView('now-playing');
          },
        }));

      case 'artists':
        return artists.map((art) => ({
          id: `art-${art.id}`,
          label: art.name,
          sublabel: `${art.trackCount} songs`,
          iconName: 'Users',
          hasChildren: true,
          targetMenuId: `art-${art.id}`,
        }));

      case 'albums':
        return albums.map((alb) => ({
          id: `alb-${alb.id}`,
          label: alb.title,
          sublabel: `${alb.artist} • ${alb.trackCount} tracks`,
          iconName: 'Disc',
          coverUrl: alb.coverUrl,
          hasChildren: true,
          targetMenuId: `alb-${alb.id}`,
        }));

      case 'equalizer':
        return eqPresets.map((preset) => ({
          id: `eq-${preset}`,
          label: preset,
          sublabel: activeEqPreset === preset ? 'Active' : undefined,
          iconName: 'Sliders',
          action: () => {
            setEqPreset(preset);
          },
        }));

      case 'servers':
        return servers.map((srv) => ({
          id: `srv-${srv.id}`,
          label: srv.name,
          sublabel: `${srv.url} ${srv.latencyMs ? `(${srv.latencyMs}ms)` : ''}`,
          badge: srv.status === 'connected' ? 'Connected' : srv.status === 'testing' ? 'Testing...' : 'Test/Sync',
          iconName: 'Server',
          action: () => {
            testServerConnection(srv.id);
          },
        }));

      case 'settings':
        return [
          {
            id: 'fetch-metadata-btn',
            label: 'Fetch All Metadata',
            badge: isFetchingAllMetadata ? 'Fetching...' : 'Batch',
            iconName: 'Sparkles',
            action: () => fetchAllMetadata(),
          },
          {
            id: 'hidden-tracks',
            label: 'Hidden Songs (Recycle Bin)',
            badge: hiddenTrackIds.length > 0 ? hiddenTrackIds.length : 'None',
            iconName: 'Eye',
            hasChildren: true,
            targetMenuId: 'hidden-tracks',
          },
          {
            id: 'toggle-sound',
            label: 'Rotary Audio Clicks',
            badge: wheelClickSoundEnabled ? 'ON' : 'OFF',
            iconName: 'Volume2',
            action: () => setWheelClickSoundEnabled(!wheelClickSoundEnabled),
          },
          {
            id: 'toggle-haptics',
            label: 'Haptic Vibration',
            badge: wheelHapticsEnabled ? 'ON' : 'OFF',
            iconName: 'Vibrate',
            action: () => setWheelHapticsEnabled(!wheelHapticsEnabled),
          },
          {
            id: 'reset-app-btn',
            label: 'Reset App (Clear Local Library & Cache)',
            iconName: 'Trash2',
            action: () => resetApp(),
          },
        ];

      case 'hidden-tracks': {
        const hiddenList = allTracks.filter((t) => hiddenTrackIds.includes(t.id));
        if (hiddenList.length === 0) {
          return [
            {
              id: 'no-hidden',
              label: 'No Hidden Songs',
              sublabel: 'Hold any song to hide it',
            },
          ];
        }
        return hiddenList.map((t) => ({
          id: `hidden-${t.id}`,
          label: t.title,
          sublabel: `${t.artist} • Tap to Restore`,
          iconName: 'RotateCcw',
          coverUrl: t.coverUrl || coverService.getCachedCover(t.title, t.artist) || undefined,
          action: () => {
            unhideTrack(t.id);
          },
        }));
      }

      default:
        return [];
    }
  };

  const currentMenuItems = computeMenuItems();

  const navigateMenuTo = (menuId: string) => {
    setMenuHistory((curr) => [...curr, { menuId: activeMenuId, selectedIndex: selectedMenuIndex }]);
    setActiveMenuId(menuId);
    setSelectedMenuIndex(0);
  };

  const navigateMenuBack = () => {
    if (activeMenuId.startsWith('pl-')) {
      setActiveMenuId('playlists');
      setSelectedMenuIndex(0);
      return;
    }
    if (activeMenuId.startsWith('alb-')) {
      setActiveMenuId('albums');
      setSelectedMenuIndex(0);
      return;
    }
    if (activeMenuId.startsWith('art-')) {
      setActiveMenuId('artists');
      setSelectedMenuIndex(0);
      return;
    }

    if (menuHistory.length > 0) {
      const last = menuHistory[menuHistory.length - 1];
      setMenuHistory((curr) => curr.slice(0, curr.length - 1));
      setActiveMenuId(last.menuId);
      setSelectedMenuIndex(last.selectedIndex);
    } else {
      if (activeMenuId !== 'main') {
        setActiveMenuId('main');
        setSelectedMenuIndex(0);
      } else {
        setCurrentView('now-playing');
      }
    }
  };

  const handleWheelScroll = (delta: number) => {
    if (wheelClickSoundEnabled) {
      audioEngine.playClickSound(0.8);
    }
    if (wheelHapticsEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate(6);
      } catch (e) {}
    }

    if (currentView === 'menu') {
      const max = currentMenuItems.length;
      if (max === 0) return;
      setSelectedMenuIndex((curr) => {
        let next = curr + delta;
        if (next < 0) next = max - 1;
        if (next >= max) next = 0;
        return next;
      });
    } else if (currentView === 'now-playing' || currentView === 'lyrics') {
      setVolumeLevel(volume + delta * 0.04);
    }
  };

  const handleStickDirection = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (wheelClickSoundEnabled) {
      audioEngine.playClickSound(0.9);
    }
    if (wheelHapticsEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch (e) {}
    }

    if (currentView === 'menu') {
      const max = currentMenuItems.length;
      if (max === 0) return;

      switch (direction) {
        case 'up':
          setSelectedMenuIndex((curr) => (curr > 0 ? curr - 1 : max - 1));
          break;
        case 'down':
          setSelectedMenuIndex((curr) => (curr < max - 1 ? curr + 1 : 0));
          break;
        case 'right':
          handleWheelButton('select');
          break;
        case 'left':
          navigateMenuBack();
          break;
      }
    } else if (currentView === 'now-playing') {
      switch (direction) {
        case 'left':
          prevTrack();
          break;
        case 'right':
          nextTrack();
          break;
        case 'up':
          setCurrentView('menu');
          break;
        case 'down':
          setCurrentView('lyrics');
          break;
      }
    } else if (currentView === 'lyrics') {
      switch (direction) {
        case 'right':
          nextTrack();
          break;
        case 'left':
          prevTrack();
          break;
        case 'up':
          setCurrentView('menu');
          break;
        case 'down':
          setCurrentView('now-playing');
          break;
      }
    }
  };

  const handleWheelButton = (button: 'menu' | 'prev' | 'next' | 'play-pause' | 'select' | 'hold') => {
    if (wheelClickSoundEnabled) {
      audioEngine.playClickSound(1.2);
    }
    if (wheelHapticsEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate(14);
      } catch (e) {}
    }

    switch (button) {
      case 'hold': {
        if (currentView === 'menu') {
          const item = currentMenuItems[selectedMenuIndex];
          if (item) {
            const track = allTracks.find((t) => t.id === item.id);
            if (track) {
              setActionModalTrack(track);
              setIsActionModalOpen(true);
            }
          }
        } else if (currentTrack) {
          setActionModalTrack(currentTrack);
          setIsActionModalOpen(true);
        }
        break;
      }

      case 'menu':
        if (currentView === 'menu') {
          if (activeMenuId.startsWith('pl-')) {
            setActiveMenuId('playlists');
            setSelectedMenuIndex(0);
          } else if (activeMenuId.startsWith('alb-')) {
            setActiveMenuId('albums');
            setSelectedMenuIndex(0);
          } else if (activeMenuId.startsWith('art-')) {
            setActiveMenuId('artists');
            setSelectedMenuIndex(0);
          } else if (activeMenuId !== 'main') {
            navigateMenuBack();
          } else {
            if (currentTrack) setCurrentView('now-playing');
          }
        } else {
          setCurrentView('menu');
        }
        break;

      case 'prev':
        prevTrack();
        break;

      case 'next':
        nextTrack();
        break;

      case 'play-pause':
        togglePlayPause();
        break;

      case 'select':
        if (currentView === 'menu') {
          const item = currentMenuItems[selectedMenuIndex];
          if (item) {
            if (item.action) {
              item.action();
            } else if (item.targetMenuId) {
              navigateMenuTo(item.targetMenuId);
            }
          }
        } else if (currentView === 'now-playing') {
          setCurrentView('lyrics');
        } else if (currentView === 'lyrics') {
          setCurrentView('now-playing');
        }
        break;
    }
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        currentTrack,
        queue,
        queueIndex,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        repeatMode,
        lyricsData,
        activeLyricIndex,
        lyricsOffset,
        isLoadingLyrics,
        currentView,
        activeMenuId,
        selectedMenuIndex,
        currentMenuItems,
        allTracks,
        playlists,
        artists,
        albums,
        hiddenTrackIds,
        servers,
        activeServer,
        isFetchingAllMetadata,
        metadataProgress,
        fetchAllMetadata,
        fetchPlaylistMetadata,
        fetchAlbumMetadata,
        fetchArtistMetadata,
        resetApp,
        actionModalTrack,
        isActionModalOpen,
        setActionModalTrack,
        setIsActionModalOpen,
        eqPresets,
        activeEqPreset,
        currentEqGains,
        wheelClickSoundEnabled,
        wheelHapticsEnabled,
        playTrack,
        togglePlayPause,
        nextTrack,
        prevTrack,
        seek,
        setVolumeLevel,
        toggleShuffle,
        cycleRepeatMode,
        setLyricsOffsetDelta,
        seekToLyricLine,
        setCurrentView,
        setWheelClickSoundEnabled,
        setWheelHapticsEnabled,
        handleWheelScroll,
        handleWheelButton,
        handleStickDirection,
        navigateMenuTo,
        navigateMenuBack,
        hideTrack,
        unhideTrack,
        removeTrackFromPlaylist,
        addTrackToPlaylist,
        deleteTrack,
        openDirectoryPicker,
        saveServerConfig,
        testServerConnection,
        loadSubsonicLibrary,
        setEqPreset,
        setEqBandGain,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
};
