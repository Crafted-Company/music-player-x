// Rock-Solid Universal HTML5 Audio Engine with Race-Condition Protected Stream Loading

export const EQ_FREQUENCIES = [60, 250, 1000, 4000, 12000];

export const DEFAULT_EQ_PRESETS: { [key: string]: number[] } = {
  Flat: [0, 0, 0, 0, 0],
  'Bass Booster': [6, 4, 1, 0, -1],
  'Crafted Warmth': [4, 2, -1, 2, 4],
  Electronic: [5, 3, 0, 2, 5],
  Acoustic: [3, 2, 1, 3, 4],
  Rock: [5, 3, -1, 3, 6],
  Vocal: [-2, 1, 4, 3, 1],
  'Late Night': [3, 1, 0, -2, -4],
};

class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private clickAudioCtx: AudioContext | null = null;
  private playbackSessionId: number = 0;
  private currentExpectedUrl: string = '';

  private initAudioElement(): HTMLAudioElement {
    if (this.audio) return this.audio;

    if (typeof document !== 'undefined') {
      const existing = document.getElementById('crafted-master-audio') as HTMLAudioElement;
      if (existing) {
        this.audio = existing;
      } else {
        this.audio = document.createElement('audio');
        this.audio.id = 'crafted-master-audio';
        this.audio.setAttribute('playsinline', 'true');
        this.audio.setAttribute('webkit-playsinline', 'true');
        this.audio.style.display = 'none';

        if (document.body) {
          document.body.appendChild(this.audio);
        } else {
          document.addEventListener('DOMContentLoaded', () => {
            if (this.audio && !document.getElementById('crafted-master-audio')) {
              document.body?.appendChild(this.audio);
            }
          });
        }
      }
    } else {
      this.audio = new Audio();
    }

    this.audio.preload = 'auto';

    // In-memory Blob fallback ONLY when direct stream encounters unrecoverable codec error for current song
    this.audio.onerror = async () => {
      const audioEl = this.audio;
      if (!audioEl) return;
      const targetSession = this.playbackSessionId;
      const targetUrl = this.currentExpectedUrl;

      if (targetUrl && !targetUrl.startsWith('blob:') && !targetUrl.startsWith('data:')) {
        try {
          const res = await fetch(targetUrl);
          if (res.ok && this.playbackSessionId === targetSession) {
            const blob = await res.blob();
            if (this.playbackSessionId === targetSession) {
              audioEl.src = URL.createObjectURL(blob);
              audioEl.play().catch(() => {});
            }
          }
        } catch (e) {}
      }
    };

    return this.audio;
  }

  public getAudioElement(): HTMLAudioElement {
    return this.initAudioElement();
  }

  public loadTrack(url: string) {
    const audio = this.initAudioElement();
    this.playbackSessionId++;
    this.currentExpectedUrl = url;
    audio.src = url;
    audio.load();
  }

  public async play(): Promise<void> {
    const audio = this.initAudioElement();
    const targetSession = this.playbackSessionId;
    const targetUrl = this.currentExpectedUrl;

    try {
      await audio.play();
    } catch (err) {
      if (this.playbackSessionId !== targetSession) return;
      if (targetUrl && !targetUrl.startsWith('blob:') && !targetUrl.startsWith('data:')) {
        try {
          const res = await fetch(targetUrl);
          if (res.ok && this.playbackSessionId === targetSession) {
            const blob = await res.blob();
            if (this.playbackSessionId === targetSession) {
              audio.src = URL.createObjectURL(blob);
              await audio.play();
            }
          }
        } catch (blobErr) {
          console.warn('Playback error:', blobErr);
        }
      }
    }
  }

  public pause() {
    const audio = this.initAudioElement();
    audio.pause();
  }

  public seek(seconds: number) {
    const audio = this.initAudioElement();
    if (isFinite(seconds)) {
      audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || 0));
    }
  }

  public setVolume(volume: number) {
    const audio = this.initAudioElement();
    const clamped = Math.max(0, Math.min(1, volume));
    audio.volume = clamped;
  }

  public setEqualizerGains(_gains: number[]) {}

  public getFrequencyData(array: Uint8Array<any>): void {
    array.fill(0);
  }

  public getTimeDomainData(array: Uint8Array<any>): void {
    array.fill(128);
  }

  /**
   * Synthesize mechanical rotary wheel click
   */
  public playClickSound(intensity: number = 1.0) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.clickAudioCtx) {
        this.clickAudioCtx = new AudioCtx();
      }
      if (this.clickAudioCtx.state === 'suspended') {
        this.clickAudioCtx.resume();
      }

      const now = this.clickAudioCtx.currentTime;
      const osc = this.clickAudioCtx.createOscillator();
      const gain = this.clickAudioCtx.createGain();
      const filter = this.clickAudioCtx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400 + Math.random() * 200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.015);

      filter.type = 'bandpass';
      filter.frequency.value = 2200;
      filter.Q.value = 3.0;

      const clickVolume = 0.09 * Math.max(0.1, Math.min(1.5, intensity));
      gain.gain.setValueAtTime(clickVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.clickAudioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.02);
    } catch (e) {}
  }
}

export const audioEngine = new AudioEngine();
