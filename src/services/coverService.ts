export class CoverService {
  private cache = new Map<string, string>();

  constructor() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('cover_cache_')) {
          const val = localStorage.getItem(k);
          if (val) {
            const rawKey = k.replace('cover_cache_', '');
            this.cache.set(rawKey, val);
          }
        }
      }
    } catch (e) {}
  }

  public getCachedCover(trackTitle: string, artistName: string): string | null {
    const key = `${trackTitle}:${artistName}`.toLowerCase().trim();
    if (this.cache.has(key)) return this.cache.get(key)!;
    const titleOnlyKey = trackTitle.toLowerCase().trim();
    if (this.cache.has(titleOnlyKey)) return this.cache.get(titleOnlyKey)!;
    return null;
  }

  public parseArtistAndTitle(rawTitle: string, rawArtist?: string): { title: string; artist: string } {
    let title = (rawTitle || '').trim();
    let artist = (rawArtist || '').trim();

    const isGenericArtist =
      !artist ||
      /various\s*artists/i.test(artist) ||
      /unknown/i.test(artist) ||
      /local\s*artist/i.test(artist);

    if (isGenericArtist && (title.includes(' - ') || title.includes(' – ') || title.includes(' — '))) {
      const parts = title.split(/\s*[-–—]\s*/);
      if (parts.length >= 2) {
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }
    } else if (isGenericArtist && /by\s+([A-Za-z0-9\s]+)/i.test(title)) {
      const match = title.match(/(.*?)\s+by\s+([A-Za-z0-9\s]+)/i);
      if (match) {
        title = match[1].trim();
        artist = match[2].trim();
      }
    }

    title = title
      .replace(/^\d+[\s._-]+/, '')
      .replace(/\.(mp3|flac|wav|m4a|ogg|opus|aac)$/i, '')
      .replace(/\s*\([^)]*(official|audio|video|lyrics|hd|4k|remaster|explicit)[^)]*\)/gi, '')
      .replace(/\s*\[[^\]]*(official|audio|video|lyrics|hd|4k|remaster|explicit)[^\]]*\]/gi, '')
      .trim();

    if (isGenericArtist && /various\s*artists/i.test(artist)) {
      artist = '';
    }

    return { title, artist };
  }

  /**
   * Fetch high-res album artwork and discovered artist from iTunes Search API
   */
  public async fetchArtworkOnline(
    trackTitle: string,
    artistName: string
  ): Promise<{ coverUrl: string | null; discoveredArtist?: string }> {
    if (!trackTitle) return { coverUrl: null };

    const parsed = this.parseArtistAndTitle(trackTitle, artistName);
    const key = `${parsed.title}:${parsed.artist}`.toLowerCase().trim();
    const titleOnlyKey = parsed.title.toLowerCase().trim();

    if (this.cache.has(key)) return { coverUrl: this.cache.get(key)! };
    if (this.cache.has(titleOnlyKey)) return { coverUrl: this.cache.get(titleOnlyKey)! };

    try {
      const searchTerms: string[] = [];
      if (parsed.artist) {
        searchTerms.push(`${parsed.title} ${parsed.artist}`);
      }
      searchTerms.push(parsed.title);

      for (const termRaw of searchTerms) {
        if (!termRaw || termRaw.length < 2) continue;
        const term = encodeURIComponent(termRaw);
        const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=10`);
        if (res.ok) {
          const data = await res.json();
          const results: any[] = data.results || [];
          if (results.length > 0) {
            // 1. If artist given, find matching artist
            let bestResult = results[0];
            if (parsed.artist) {
              const matched = results.find(
                (item: any) =>
                  item.artistName?.toLowerCase().includes(parsed.artist.toLowerCase()) ||
                  parsed.artist.toLowerCase().includes(item.artistName?.toLowerCase())
              );
              if (matched) bestResult = matched;
            } else {
              // 2. If no artist (e.g. was Various Artists), prioritize exact 1:1 title matches (e.g. 'So High' by Doja Cat)
              const exactTitleMatch = results.find(
                (item: any) => item.trackName?.toLowerCase().trim() === parsed.title.toLowerCase().trim()
              );
              if (exactTitleMatch) bestResult = exactTitleMatch;
            }

            const artwork100 = bestResult.artworkUrl100;
            if (artwork100) {
              const highResUrl = artwork100.replace('100x100bb', '600x600bb');
              this.cache.set(key, highResUrl);
              this.cache.set(titleOnlyKey, highResUrl);
              try {
                localStorage.setItem(`cover_cache_${key}`, highResUrl);
                localStorage.setItem(`cover_cache_${titleOnlyKey}`, highResUrl);
              } catch (e) {}
              return { coverUrl: highResUrl, discoveredArtist: bestResult.artistName };
            }
          }
        }
      }
    } catch (e) {}
    return { coverUrl: null };
  }

  public async generateMosaicCollage(coverUrls: string[], size: number = 400): Promise<string> {
    const validUrls = Array.from(new Set(coverUrls.filter((u) => !!u))).slice(0, 4);

    if (validUrls.length === 0) {
      return this.createPlaceholderCover('Playlist', size);
    }
    if (validUrls.length === 1) {
      return validUrls[0];
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return validUrls[0];

    ctx.fillStyle = '#1A1414';
    ctx.fillRect(0, 0, size, size);

    const loadPromises = validUrls.map((url) => {
      return new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    });

    const loadedImgs = await Promise.all(loadPromises);
    const available = loadedImgs.filter((img): img is HTMLImageElement => img !== null);

    if (available.length === 0) {
      return this.createPlaceholderCover('Playlist', size);
    }
    if (available.length === 1) {
      ctx.drawImage(available[0], 0, 0, size, size);
      return canvas.toDataURL('image/jpeg', 0.88);
    }

    const half = size / 2;

    if (available.length === 2) {
      ctx.drawImage(available[0], 0, 0, half, size);
      ctx.drawImage(available[1], half, 0, half, size);

      ctx.strokeStyle = '#151212';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(half, 0);
      ctx.lineTo(half, size);
      ctx.stroke();
    } else if (available.length === 3) {
      ctx.drawImage(available[0], 0, 0, half, size);
      ctx.drawImage(available[1], half, 0, half, half);
      ctx.drawImage(available[2], half, half, half, half);

      ctx.strokeStyle = '#151212';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(half, 0);
      ctx.lineTo(half, size);
      ctx.moveTo(half, half);
      ctx.lineTo(size, half);
      ctx.stroke();
    } else {
      ctx.drawImage(available[0], 0, 0, half, half);
      ctx.drawImage(available[1], half, 0, half, half);
      ctx.drawImage(available[2], 0, half, half, half);
      ctx.drawImage(available[3], half, half, half, half);

      ctx.strokeStyle = '#151212';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(half, 0);
      ctx.lineTo(half, size);
      ctx.moveTo(0, half);
      ctx.lineTo(size, half);
      ctx.stroke();
    }

    return canvas.toDataURL('image/jpeg', 0.88);
  }

  public createPlaceholderCover(title: string = 'Music', size: number = 400): string {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#221A1A';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#D45B3E';
    ctx.font = `bold ${Math.round(size * 0.25)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♫', size / 2, size / 2 - 10);

    ctx.fillStyle = '#A19898';
    ctx.font = `500 ${Math.round(size * 0.06)}px monospace`;
    ctx.fillText(title, size / 2, size / 2 + size * 0.22);

    return canvas.toDataURL('image/png');
  }
}

export const coverService = new CoverService();
