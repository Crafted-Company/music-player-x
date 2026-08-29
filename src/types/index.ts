export type AudioSourceType = 'demo' | 'local' | 'subsonic' | 'stream';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl?: string;
  audioUrl: string;
  source: AudioSourceType;
  path?: string;
  subsonicId?: string;
  format?: string;
  bitrate?: number;
  year?: number | string;
  trackNumber?: number;
  fileBlob?: Blob;
  dateAdded?: number;
}

export interface LyricLine {
  time: number; // seconds (float)
  text: string;
  translation?: string;
}

export interface LyricsData {
  synced: boolean;
  lines: LyricLine[];
  offset: number; // in seconds (+/- offset)
  source?: string;
  rawLrc?: string;
  plainLyrics?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year?: number | string;
  coverUrl?: string;
  trackCount: number;
  tracks?: Track[];
}

export interface Artist {
  id: string;
  name: string;
  albumCount: number;
  trackCount?: number;
  coverUrl?: string;
}

export interface Playlist {
  id: string;
  name: string;
  trackCount: number;
  coverUrl?: string;
  tracks: Track[];
  isCustom?: boolean;
}

export interface SubsonicServerConfig {
  id: string;
  name: string;
  url: string;
  username: string;
  password?: string;
  token?: string;
  salt?: string;
  authType: 'token' | 'plain' | 'password';
  isActive: boolean;
  status?: 'connected' | 'error' | 'disconnected' | 'testing';
  latencyMs?: number;
  lastChecked?: number;
}

export interface EqualizerPreset {
  id: string;
  name: string;
  gains: number[]; // 5 frequency bands: [60Hz, 250Hz, 1000Hz, 4000Hz, 12000Hz] in dB (-12 to +12)
}

export type IpodScreenView = 'menu' | 'now-playing' | 'lyrics' | 'queue' | 'equalizer' | 'server';

export interface IpodMenuItem {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string | number;
  hasChildren?: boolean;
  targetMenuId?: string;
  action?: () => void;
  iconName?: string;
  coverUrl?: string;
  data?: any;
}

export interface IpodMenuState {
  currentMenuId: string;
  selectedIndex: number;
  history: { menuId: string; selectedIndex: number }[];
}

export type WheelDirection = 'clockwise' | 'counter-clockwise';
