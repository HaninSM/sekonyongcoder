// Authentic Javanese Wayang Kulit Sound Engine using Web Audio API
// Produces: Cempala (wooden knock), Kepyak (bronze plates), Gong Ageng (deep bell),
// Slendro chimes, punch/kick impacts, whooshes, and flame roars with zero network latency.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private unlocked = false;

  constructor() {
    this.setupUnlockListeners();
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  private setupUnlockListeners(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      const ctx = this.initCtx();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            this.unlocked = true;
          });
        } else {
          this.unlocked = true;
        }
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  public isAudioUnlocked(): boolean {
    return this.unlocked && this.ctx?.state === 'running';
  }

  public resume(): void {
    const ctx = this.initCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.unlocked = true;
      });
    }
  }

  // 1. CEMPALA DALANG: Wooden mallet striking the puppet chest (DOK / TOK)
  public cempala(pitch = 1, volume = 0.8): void {
    const ctx = this.initCtx();
    if (!ctx || this.isMuted) return;
    this.resume();

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Wood resonance: rapid pitch drop with high damping
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(45 * pitch, t + 0.08);

    gain.gain.setValueAtTime(0.8 * volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    // Click transient (mallet impact)
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(600 * pitch, t);
    click.frequency.exponentialRampToValueAtTime(100, t + 0.02);
    clickGain.gain.setValueAtTime(0.5 * volume, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);
    click.connect(clickGain);
    clickGain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
    click.start(t);
    click.stop(t + 0.03);
  }

  // 2. KEPYAK: Dalang foot striking bronze jingling plates (blocked attacks)
  public kepyak(volume = 0.6): void {
    const ctx = this.initCtx();
    if (!ctx || this.isMuted) return;
    this.resume();

    const t = ctx.currentTime;
    // Metallic bronze rattle: high multiple frequencies
    [1200, 1850, 2600, 3400].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 80, t);

      const dur = 0.08 + idx * 0.02;
      gain.gain.setValueAtTime((0.25 / (idx + 1)) * volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    });
  }

  // 3. HIT IMPACT: Punch, Kick, or Heavy Attack
  public hit(heavy = false, volume = 0.85): void {
    const ctx = this.initCtx();
    if (!ctx || this.isMuted) return;
    this.resume();

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = heavy ? 'sawtooth' : 'sine';
    const startFreq = heavy ? 160 : 260;
    const endFreq = heavy ? 30 : 60;
    const dur = heavy ? 0.22 : 0.14;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    // Noise crunch for bone/impact texture
    const bufferSize = ctx.sampleRate * (heavy ? 0.08 : 0.04);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4 * volume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + (heavy ? 0.08 : 0.04));

    osc.connect(gain);
    gain.connect(ctx.destination);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + dur);
    noise.start(t);
  }

  // 4. WHOOSH: Jump, dodge, or rapid limb swing
  public whoosh(pitch = 1, volume = 0.4): void {
    const ctx = this.initCtx();
    if (!ctx || this.isMuted) return;
    this.resume();

    const t = ctx.currentTime;
    const dur = 0.16;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(250 * pitch, t);
    filter.frequency.exponentialRampToValueAtTime(900 * pitch, t + dur * 0.5);
    filter.frequency.exponentialRampToValueAtTime(150 * pitch, t + dur);
    filter.Q.setValueAtTime(2.5, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(volume, t + dur * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(t);
  }

  // 5. FIREBALL / AJI EKOR API: Mystical roaring flame burst
  public fireball(volume = 0.7): void {
    const ctx = this.initCtx();
    if (!ctx || this.isMuted) return;
    this.resume();

    const t = ctx.currentTime;
    const dur = 0.45;

    // Sub-bass sweep + noisy flame crackle
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + dur);
    oscGain.gain.setValueAtTime(0.5 * volume, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);

    this.whoosh(0.7, volume * 0.8);
  }

  // 6. GONG AGENG / KEMPUL: Deep, majestic Javanese bronze gong chime
  public gong(type: 'ageng' | 'kempul' = 'ageng', volume = 0.9): void {
    const ctx = this.initCtx();
    if (!ctx || this.isMuted) return;
    this.resume();

    const t = ctx.currentTime;
    const fundamental = type === 'ageng' ? 68.0 : 136.0; // Deep low C# / D
    const dur = type === 'ageng' ? 3.5 : 2.0;

    // Harmonic partials of traditional tuned Javanese gamelan bronze
    const partials = [
      { ratio: 1.0, gain: 1.0 },
      { ratio: 2.12, gain: 0.45 },
      { ratio: 3.48, gain: 0.25 },
      { ratio: 4.86, gain: 0.12 },
    ];

    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * p.ratio, t);

      gain.gain.setValueAtTime(p.gain * volume * 0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    });

    // Initial warm mallet stroke
    this.cempala(0.8, 0.7);
  }

  // 7. SULUK SLENDRO HARMONIC CHIME: Resonant ancient gamelan harmony
  public sulukChime(volume = 0.5): void {
    const ctx = this.initCtx();
    if (!ctx || this.isMuted) return;
    this.resume();

    const t = ctx.currentTime;
    // Javanese Slendro scale notes (Nem, Barang, Gulu, Dada)
    const slendro = [220, 252, 288, 330];

    slendro.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.12);

      const dur = 1.8;
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.18 * volume, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.12 + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + dur);
    });
  }

  // 8. REVIVE / BANGKIT KEMBALI: Resonant celestial resurrection sound
  public revive(): void {
    this.gong('ageng', 1.0);
    this.sulukChime(0.8);
  }
}

export const Sounds = new SoundEngine();
