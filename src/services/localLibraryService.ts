import type { Album, Artist, Playlist, Track } from '../types';

const DB_NAME = 'crafted_music_vault_db';
const DB_VERSION = 2;
const STORE_TRACKS = 'tracks';
const STORE_PLAYLISTS = 'playlists';

class LocalLibraryService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_TRACKS)) {
          db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
          db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'id' });
        }
      };
    });

    return this.dbPromise;
  }

  public async saveTracks(tracks: Track[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction([STORE_TRACKS], 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    tracks.forEach((track) => store.put(track));
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async loadStoredTracks(): Promise<Track[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_TRACKS], 'readonly');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list: Track[] = req.result || [];
        const hydrated = list.map((t) => {
          if (t.fileBlob && (!t.audioUrl || t.audioUrl.startsWith('blob:'))) {
            try {
              t.audioUrl = URL.createObjectURL(t.fileBlob);
            } catch (e) {}
          }
          return t;
        });
        resolve(hydrated);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteStoredTrack(id: string): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction([STORE_TRACKS], 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    store.delete(id);
  }

  public async savePlaylists(playlists: Playlist[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction([STORE_PLAYLISTS], 'readwrite');
    const store = tx.objectStore(STORE_PLAYLISTS);
    store.clear();
    playlists.forEach((pl) => store.put(pl));
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async loadStoredPlaylists(): Promise<Playlist[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PLAYLISTS], 'readonly');
      const store = tx.objectStore(STORE_PLAYLISTS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async clearAllAppStorage(): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction([STORE_TRACKS, STORE_PLAYLISTS], 'readwrite');
      tx.objectStore(STORE_TRACKS).clear();
      tx.objectStore(STORE_PLAYLISTS).clear();
    } catch (e) {}
    try {
      localStorage.clear();
    } catch (e) {}
  }

  public async pickAudioFiles(playlistName?: string): Promise<{ playlistName: string; tracks: Track[] } | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      (input as any).webkitdirectory = true;
      input.accept = 'audio/*,.mp3,.flac,.wav,.m4a,.ogg,.opus,.aac';

      input.onchange = async () => {
        const files = input.files;
        if (!files || files.length === 0) {
          resolve(null);
          return;
        }

        let detectedName = playlistName || 'My Music';
        const firstFile = files[0];
        if (firstFile.webkitRelativePath) {
          const parts = firstFile.webkitRelativePath.split('/');
          if (parts.length > 1 && parts[0]) {
            detectedName = parts[0];
          }
        }

        const newTracks: Track[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|flac|wav|m4a|ogg|opus|aac)$/i)) {
            const track = await this.parseFileToTrack(file, detectedName);
            newTracks.push(track);
          }
        }

        if (newTracks.length > 0) {
          await this.saveTracks(newTracks);
          resolve({ playlistName: detectedName, tracks: newTracks });
        } else {
          resolve(null);
        }
      };

      input.click();
    });
  }

  public async parseFileToTrack(file: File, albumName?: string): Promise<Track> {
    const rawName = file.name.replace(/\.[^/.]+$/, '');
    let title = rawName;
    let artist = 'Local Artist';
    let album = albumName || 'Local Music';

    if (rawName.includes(' - ')) {
      const parts = rawName.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }

    const audioUrl = URL.createObjectURL(file);
    const duration = await this.getAudioDuration(audioUrl);
    const ext = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';

    return {
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title,
      artist,
      album,
      duration,
      format: ext,
      audioUrl,
      source: 'local',
      fileBlob: file,
      dateAdded: Date.now(),
    };
  }

  private getAudioDuration(url: string): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => resolve(Math.round(audio.duration || 180));
      audio.onerror = () => resolve(180);
      audio.src = url;
    });
  }

  public groupTracksByArtist(tracks: Track[]): Artist[] {
    const map = new Map<string, Track[]>();
    tracks.forEach((t) => {
      const artist = (t.artist || 'Unknown Artist').trim();
      if (!map.has(artist)) map.set(artist, []);
      map.get(artist)!.push(t);
    });

    return Array.from(map.entries()).map(([name, songList], idx) => ({
      id: `artist-${idx}`,
      name,
      albumCount: new Set(songList.map((s) => s.album)).size,
      trackCount: songList.length,
    }));
  }

  public groupTracksByAlbum(tracks: Track[]): Album[] {
    const map = new Map<string, Track[]>();
    tracks.forEach((t) => {
      const albumTitle = (t.album || 'Navidrome Vault').trim();
      if (!map.has(albumTitle)) map.set(albumTitle, []);
      map.get(albumTitle)!.push(t);
    });

    return Array.from(map.entries()).map(([title, songList], idx) => {
      const artists = Array.from(new Set(songList.map((s) => s.artist).filter(Boolean)));
      const displayArtist =
        artists.length === 1
          ? artists[0]
          : artists.length > 1
          ? 'Various Artists'
          : 'Unknown Artist';
      const covers = songList.map((s) => s.coverUrl || '').filter(Boolean);

      return {
        id: `album-${idx}`,
        title,
        artist: displayArtist,
        trackCount: songList.length,
        coverUrl: covers[0] || undefined,
        tracks: songList,
      };
    });
  }
}

export const localLibraryService = new LocalLibraryService();
