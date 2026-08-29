// Navidrome & Subsonic REST API Client

import type { SubsonicServerConfig, Track, Playlist } from '../types';

function md5(string: string): string {
  function RotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function AddUnsigned(lX: number, lY: number) {
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    } else {
      return lResult ^ lX8 ^ lY8;
    }
  }
  function F(x: number, y: number, z: number) {
    return (x & y) | (~x & z);
  }
  function G(x: number, y: number, z: number) {
    return (x & z) | (y & ~z);
  }
  function H(x: number, y: number, z: number) {
    return x ^ y ^ z;
  }
  function I(x: number, y: number, z: number) {
    return y ^ (x | ~z);
  }
  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function ConvertToWordArray(string: string) {
    let lWordCount;
    const lMessageLength = string.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function WordToHex(lValue: number) {
    let WordToHexValue = '',
      WordToHexValue_temp = '',
      lByte,
      lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = '0' + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }

  let x: number[] = [];
  let k, AA, BB, CC, DD, a, b, c, d;
  const S11 = 7,
    S12 = 12,
    S13 = 17,
    S14 = 22;
  const S21 = 5,
    S22 = 9,
    S23 = 14,
    S24 = 20;
  const S31 = 4,
    S32 = 11,
    S33 = 16,
    S34 = 23;
  const S41 = 6,
    S42 = 10,
    S43 = 15,
    S44 = 21;

  x = ConvertToWordArray(string);
  a = 0x67452301;
  b = 0xefcdab89;
  c = 0x98badcfe;
  d = 0x10325476;

  for (k = 0; k < x.length; k += 16) {
    AA = a;
    BB = b;
    CC = c;
    DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
    b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);
    a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xf4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);
    a = AddUnsigned(a, AA);
    b = AddUnsigned(b, BB);
    c = AddUnsigned(c, CC);
    d = AddUnsigned(d, DD);
  }

  const temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);
  return temp.toLowerCase();
}

export const PRECONFIGURED_SERVERS: SubsonicServerConfig[] = [
  {
    id: 'navidrome-wifi',
    name: 'Navidrome (Wi-Fi 192.168.1.5)',
    url: 'http://192.168.1.5:4533',
    username: 'admin',
    password: 'admin',
    authType: 'token',
    isActive: true,
    status: 'disconnected',
  },
  {
    id: 'navidrome-tailscale',
    name: 'Navidrome (Tailscale 100.75.16.37)',
    url: 'http://100.75.16.37:4533',
    username: 'admin',
    password: 'admin',
    authType: 'token',
    isActive: false,
    status: 'disconnected',
  },
];

export class SubsonicService {
  private generateSalt(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  public generateAuthParams(config: SubsonicServerConfig, usePlainPassword = false): URLSearchParams {
    const params = new URLSearchParams();
    const username = config.username || 'admin';
    const password = config.password || 'admin';

    params.append('u', username);
    params.append('v', '1.16.1');
    params.append('c', 'CraftedMusicPlayer');
    params.append('f', 'json');

    if (usePlainPassword) {
      params.append('p', password);
    } else {
      const salt = this.generateSalt();
      const token = md5(password + salt);
      params.append('t', token);
      params.append('s', salt);
    }

    return params;
  }

  public cleanUrl(url: string): string {
    let clean = (url || '').trim().replace(/\/+$/, '');
    try {
      if (clean.includes('/app/')) {
        clean = clean.split('/app/')[0];
      }
    } catch (e) {}

    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
    return clean;
  }

  public async ping(config: SubsonicServerConfig): Promise<{ success: boolean; latencyMs: number; version?: string; error?: string }> {
    const startTime = performance.now();
    const baseUrl = this.cleanUrl(config.url);

    const attempts = [
      () => this.generateAuthParams(config, false),
      () => this.generateAuthParams(config, true),
    ];

    let lastError = 'Connection failed';

    for (const makeParams of attempts) {
      try {
        const params = makeParams();
        const res = await fetch(`${baseUrl}/rest/ping.view?${params.toString()}`, {
          signal: AbortSignal.timeout(6000),
        });

        const latencyMs = Math.round(performance.now() - startTime);

        if (res.ok) {
          const json = await res.json();
          const sub = json['subsonic-response'];
          if (sub && sub.status === 'ok') {
            return {
              success: true,
              latencyMs,
              version: sub.version || sub.serverVersion,
            };
          } else if (sub && sub.error) {
            lastError = sub.error.message || `Error code ${sub.error.code}`;
          }
        }
      } catch (e: any) {
        lastError = e.message || 'Network unreachable';
      }
    }

    return {
      success: false,
      latencyMs: 0,
      error: lastError,
    };
  }

  public async search(config: SubsonicServerConfig, query: string, songCount = 500): Promise<{ tracks: Track[]; albums: any[]; artists: any[] }> {
    try {
      const baseUrl = this.cleanUrl(config.url);
      const params = this.generateAuthParams(config, true);
      params.append('query', query || '');
      params.append('songCount', songCount.toString());
      params.append('albumCount', '100');
      params.append('artistCount', '100');

      const res = await fetch(`${baseUrl}/rest/search3.view?${params.toString()}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return { tracks: [], albums: [], artists: [] };

      const json = await res.json();
      const sr = json['subsonic-response']?.searchResult3;
      if (!sr) return { tracks: [], albums: [], artists: [] };

      const rawSongs = sr.song || [];
      const songList = Array.isArray(rawSongs) ? rawSongs : [rawSongs];

      const tracks: Track[] = songList.map((s: any) => ({
        id: `subsonic-${s.id}`,
        subsonicId: s.id,
        title: s.title || 'Untitled',
        artist: s.artist || 'Unknown Artist',
        album: s.album || 'Navidrome Vault',
        duration: s.duration || 180,
        coverUrl: s.coverArt ? this.getCoverArtUrl(config, s.coverArt, 500) : undefined,
        audioUrl: this.getStreamUrl(config, s.id),
        source: 'subsonic' as const,
        trackNumber: s.track,
        year: s.year,
        bitrate: s.bitRate,
        format: s.suffix?.toUpperCase() || 'AUDIO',
      }));

      return {
        tracks,
        albums: sr.album || [],
        artists: sr.artist || [],
      };
    } catch (e) {
      console.warn('Subsonic search error:', e);
      return { tracks: [], albums: [], artists: [] };
    }
  }

  public async getRandomSongs(config: SubsonicServerConfig, size = 500): Promise<Track[]> {
    try {
      const baseUrl = this.cleanUrl(config.url);
      const params = this.generateAuthParams(config, true);
      params.append('size', size.toString());

      const res = await fetch(`${baseUrl}/rest/getRandomSongs.view?${params.toString()}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return [];

      const json = await res.json();
      const rawSongs = json['subsonic-response']?.randomSongs?.song || [];
      const songList = Array.isArray(rawSongs) ? rawSongs : [rawSongs];

      return songList.map((s: any) => ({
        id: `subsonic-${s.id}`,
        subsonicId: s.id,
        title: s.title || 'Untitled',
        artist: s.artist || 'Unknown Artist',
        album: s.album || 'Navidrome Vault',
        duration: s.duration || 180,
        coverUrl: s.coverArt ? this.getCoverArtUrl(config, s.coverArt, 500) : undefined,
        audioUrl: this.getStreamUrl(config, s.id),
        source: 'subsonic' as const,
        trackNumber: s.track,
        year: s.year,
        bitrate: s.bitRate,
        format: s.suffix?.toUpperCase() || 'AUDIO',
      }));
    } catch (e) {
      console.warn('Failed to fetch Subsonic random songs:', e);
      return [];
    }
  }

  public async getPlaylists(config: SubsonicServerConfig): Promise<Playlist[]> {
    try {
      const baseUrl = this.cleanUrl(config.url);
      const params = this.generateAuthParams(config, true);

      const res = await fetch(`${baseUrl}/rest/getPlaylists.view?${params.toString()}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return [];

      const json = await res.json();
      const rawPls = json['subsonic-response']?.playlists?.playlist || [];
      const plList = Array.isArray(rawPls) ? rawPls : [rawPls];

      return plList.map((p: any) => ({
        id: `subsonic-pl-${p.id}`,
        name: p.name || 'Remote Playlist',
        trackCount: p.songCount || 0,
        coverUrl: p.coverArt ? this.getCoverArtUrl(config, p.coverArt, 500) : undefined,
        tracks: [],
        isCustom: false,
      }));
    } catch (e) {
      console.warn('Failed to fetch Subsonic playlists:', e);
      return [];
    }
  }

  public async getPlaylistTracks(config: SubsonicServerConfig, playlistId: string): Promise<Track[]> {
    try {
      const cleanId = playlistId.replace(/^subsonic-pl-/, '');
      const baseUrl = this.cleanUrl(config.url);
      const params = this.generateAuthParams(config, true);
      params.append('id', cleanId);

      const res = await fetch(`${baseUrl}/rest/getPlaylist.view?${params.toString()}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return [];

      const json = await res.json();
      const playlistObj = json['subsonic-response']?.playlist;
      const rawEntries = playlistObj?.entry || [];
      const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

      return entries.map((s: any) => ({
        id: `subsonic-${s.id}`,
        subsonicId: s.id,
        title: s.title || 'Untitled',
        artist: s.artist || 'Unknown Artist',
        album: s.album || playlistObj?.name || 'Navidrome Playlist',
        duration: s.duration || 180,
        coverUrl: s.coverArt ? this.getCoverArtUrl(config, s.coverArt, 500) : undefined,
        audioUrl: this.getStreamUrl(config, s.id),
        source: 'subsonic' as const,
        trackNumber: s.track,
        year: s.year,
        bitrate: s.bitRate,
        format: s.suffix?.toUpperCase() || 'AUDIO',
      }));
    } catch (e) {
      console.warn('Failed to fetch Subsonic playlist tracks:', e);
      return [];
    }
  }

  public async getAllSongs(config: SubsonicServerConfig): Promise<Track[]> {
    try {
      // 1. Try search3.view with empty query
      const searchRes = await this.search(config, '', 500);
      if (searchRes.tracks && searchRes.tracks.length > 0) {
        return searchRes.tracks;
      }

      // 2. Try getRandomSongs.view fallback
      const randomSongs = await this.getRandomSongs(config, 500);
      if (randomSongs && randomSongs.length > 0) {
        return randomSongs;
      }

      return [];
    } catch (e) {
      console.warn('Failed to fetch Navidrome songs:', e);
      return [];
    }
  }

  public getStreamUrl(config: SubsonicServerConfig, songId: string): string {
    const baseUrl = this.cleanUrl(config.url);
    const params = this.generateAuthParams(config, true);
    params.append('id', songId);
    params.append('format', 'raw');
    return `${baseUrl}/rest/stream.view?${params.toString()}`;
  }

  public getCoverArtUrl(config: SubsonicServerConfig, coverArtId: string, size: number = 500): string {
    const baseUrl = this.cleanUrl(config.url);
    const params = this.generateAuthParams(config, true);
    params.append('id', coverArtId);
    params.append('size', size.toString());
    return `${baseUrl}/rest/getCoverArt.view?${params.toString()}`;
  }
}

export const subsonicService = new SubsonicService();
