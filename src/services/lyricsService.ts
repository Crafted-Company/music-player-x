import type { LyricLine, LyricsData, Track } from '../types';
import { coverService } from './coverService';

export class LyricsService {
  private cache = new Map<string, LyricsData>();

  public parseLrc(lrcText: string): LyricLine[] {
    if (!lrcText) return [];
    const lines = lrcText.split(/\r?\n/);
    const result: LyricLine[] = [];
    const timeTagRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      const timestamps: number[] = [];
      let match;
      timeTagRegex.lastIndex = 0;

      while ((match = timeTagRegex.exec(trimmed)) !== null) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const fractionStr = match[3] || '0';
        const fraction =
          fractionStr.length === 3 ? parseInt(fractionStr, 10) / 1000 : parseInt(fractionStr, 10) / 100;
        const totalSeconds = minutes * 60 + seconds + fraction;
        timestamps.push(totalSeconds);
      }

      if (timestamps.length > 0) {
        const text = trimmed.replace(timeTagRegex, '').trim();
        for (const time of timestamps) {
          result.push({ time, text: text || '♪' });
        }
      }
    }

    result.sort((a, b) => a.time - b.time);
    return result;
  }

  public async fetchLyrics(track: Track): Promise<LyricsData> {
    if (!track.title) {
      return this.getEmptyLyrics(track);
    }

    const parsed = coverService.parseArtistAndTitle(track.title, track.artist);
    const cacheKey = `${parsed.title}::${parsed.artist}`.toLowerCase();

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const localCached = localStorage.getItem(`lyrics_cache_${cacheKey}`);
      if (localCached) {
        const parsedData = JSON.parse(localCached) as LyricsData;
        this.cache.set(cacheKey, parsedData);
        return parsedData;
      }
    } catch (e) {}

    const searchQueries: string[] = [];
    if (parsed.artist) {
      searchQueries.push(`${parsed.title} ${parsed.artist}`);
    }
    searchQueries.push(parsed.title);

    for (const query of searchQueries) {
      if (!query || query.length < 2) continue;
      try {
        // Do NOT pass custom User-Agent in browser fetch to prevent CORS / forbidden header errors
        const searchRes = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`
        );

        if (searchRes.ok) {
          const searchData: any[] = await searchRes.json();
          if (Array.isArray(searchData) && searchData.length > 0) {
            let chosenItem = searchData[0];
            if (parsed.artist) {
              const matched = searchData.find(
                (item) =>
                  item.artistName?.toLowerCase().includes(parsed.artist.toLowerCase()) ||
                  parsed.artist.toLowerCase().includes(item.artistName?.toLowerCase())
              );
              if (matched) chosenItem = matched;
            } else {
              const exactTitle = searchData.find(
                (item) => item.trackName?.toLowerCase().trim() === parsed.title.toLowerCase().trim()
              );
              if (exactTitle) chosenItem = exactTitle;
            }

            if (chosenItem.syncedLyrics) {
              const lines = this.parseLrc(chosenItem.syncedLyrics);
              const lyricsData: LyricsData = {
                synced: true,
                lines,
                offset: 0,
                source: 'LRCLIB Live',
                rawLrc: chosenItem.syncedLyrics,
              };
              this.saveToCache(cacheKey, lyricsData);
              return lyricsData;
            } else if (chosenItem.plainLyrics) {
              const lines = this.createUnsyncedLines(chosenItem.plainLyrics, track.duration);
              const lyricsData: LyricsData = {
                synced: false,
                lines,
                offset: 0,
                source: 'LRCLIB Plain',
                plainLyrics: chosenItem.plainLyrics,
              };
              this.saveToCache(cacheKey, lyricsData);
              return lyricsData;
            }
          }
        }
      } catch (err) {
        console.warn('LRCLIB fetch error:', err);
      }
    }

    return this.getEmptyLyrics(track);
  }

  private getEmptyLyrics(track: Track): LyricsData {
    return {
      synced: false,
      lines: [
        { time: 0, text: `♪ ${track.title} ♪` },
        { time: 4, text: `${track.artist || 'Unknown Artist'}` },
        { time: 8, text: `Instrumental or lyrics unavailable` },
      ],
      offset: 0,
      source: 'Local',
    };
  }

  private createUnsyncedLines(plainText: string, totalDuration: number = 180): LyricLine[] {
    const rawLines = plainText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (rawLines.length === 0) return [];
    const step = totalDuration / (rawLines.length + 1);
    return rawLines.map((text, idx) => ({
      time: (idx + 1) * step,
      text: text.trim(),
    }));
  }

  private saveToCache(key: string, data: LyricsData) {
    this.cache.set(key, data);
    try {
      localStorage.setItem(`lyrics_cache_${key}`, JSON.stringify(data));
    } catch (e) {}
  }

  public findActiveLineIndex(lines: LyricLine[], currentTime: number, offsetSeconds: number = 0): number {
    if (!lines || lines.length === 0) return -1;
    const adjustedTime = currentTime + offsetSeconds;

    let activeIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= adjustedTime) {
        activeIndex = i;
      } else {
        break;
      }
    }
    return activeIndex;
  }
}

export const lyricsService = new LyricsService();
