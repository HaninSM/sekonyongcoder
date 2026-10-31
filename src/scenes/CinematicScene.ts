import Phaser from 'phaser';
import gsap from 'gsap';
import { COLORS, GAME, KELIR } from '../constants';
import { textStyle } from '../systems/Effects';
import { drawGunungan, preloadGunungan } from '../systems/Gunungan';
import { Lighting } from '../systems/Lighting';

export interface CinematicData {
  badge?: string;
  title: string;
  subtitle: string;
  videoUrl?: string;
  durationSeconds?: number;
  onComplete: () => void;
  characterImg?: string;
}

export class CinematicScene extends Phaser.Scene {
  private configData!: CinematicData;
  private isFinishing = false;
  private videoEl?: HTMLVideoElement;
  private containerEl?: HTMLDivElement;
  private hasPlayingVideo = false;

  constructor() {
    super('CinematicScene');
  }

  preload(): void {
    preloadGunungan(this);
  }

  create(data: CinematicData): void {
    this.configData = data;
    this.isFinishing = false;
    this.hasPlayingVideo = false;
    new Lighting(this);

    const floorTop = GAME.height - KELIR.floorHeight;
    this.add.rectangle(GAME.width / 2, floorTop + KELIR.floorHeight / 2, GAME.width, KELIR.floorHeight, COLORS.gedebog);

    const kayon = drawGunungan(this, GAME.width / 2, 320, 360).setDepth(10);
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      gsap.to(kayon, { angle: 3, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }

    // Badge (e.g. "FILM INTRO", "RAGE COMBAT", "FILM OUTRO")
    const badgeText = data.badge ?? 'LAKON RAMAYANA';
    this.add
      .text(GAME.width / 2, 50, `[ ${badgeText} ]`, {
        ...textStyle(18, '#ffe082', '#1c110a'),
      })
      .setOrigin(0.5)
      .setDepth(101);

    // Title & Subtitle with maximum contrast and crisp vector rasterization
    this.add.text(GAME.width / 2, 85, data.title, textStyle(34, '#fff9e6', '#1c110a')).setOrigin(0.5).setDepth(101);
    this.add
      .text(GAME.width / 2, 125, data.subtitle, {
        fontFamily: 'Georgia, serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#1a0e05',
        stroke: '#ffe082',
        strokeThickness: 3,
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(101);

    // Skip Button / Hint on Canvas
    const skipBtn = this.add
      .rectangle(GAME.width / 2, GAME.height - 35, 360, 42, 0x1c110a, 0.9)
      .setStrokeStyle(2, 0xf5c451)
      .setDepth(102)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(GAME.width / 2, GAME.height - 35, 'TEKAN [SPASI / ENTER / KLIK] UNTUK LEWATI', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#f5c451',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(103);

    skipBtn.on('pointerdown', () => this.finish());

    // Fallback timer & visual progress bar
    const duration = data.durationSeconds ?? (data.badge?.includes('RAGE') ? 10 : 6);
    this.add.rectangle(GAME.width / 2, 155, 400, 6, 0x4a3a1c).setDepth(101);
    const progressBar = this.add.rectangle(GAME.width / 2 - 200, 155, 0, 6, 0xf5c451).setOrigin(0, 0.5).setDepth(102);

    const progressTween = gsap.to(progressBar, {
      width: 400,
      duration,
      ease: 'linear',
      onComplete: () => {
        if (!this.hasPlayingVideo) {
          this.finish();
        }
      },
    });

    // Try HTML5 Video Playback if file is provided
    if (data.videoUrl) {
      this.tryPlayVideo(data.videoUrl, progressBar, progressTween);
    }

    const kb = this.input.keyboard!;
    kb.once('keydown-SPACE', () => this.finish());
    kb.once('keydown-ENTER', () => this.finish());
    kb.once('keydown-ESC', () => this.finish());
    this.input.once('pointerdown', () => this.finish());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupDom());
  }

  private tryPlayVideo(url: string, progressBar: Phaser.GameObjects.Rectangle, fallbackTween: gsap.core.Tween): void {
    try {
      const container = document.createElement('div');
      container.id = 'cinematic-video-overlay';
      container.setAttribute('role', 'dialog');
      container.setAttribute('aria-label', 'Video Sinematik');
      container.style.position = 'fixed';
      container.style.top = '50%';
      container.style.left = '50%';
      container.style.transform = 'translate(-50%, -50%)';
      container.style.width = 'min(86vw, 980px)';
      container.style.aspectRatio = '16 / 9';
      container.style.maxHeight = '72vh';
      container.style.zIndex = '9999';
      container.style.borderRadius = '12px';
      container.style.overflow = 'hidden';
      container.style.border = '3px solid #f5c451';
      container.style.boxShadow = '0 0 30px rgba(245, 196, 81, 0.55), 0 10px 40px rgba(0,0,0,0.9)';
      container.style.background = '#0d0805';

      const vid = document.createElement('video');
      vid.src = url;
      vid.autoplay = true;
      vid.muted = false;
      vid.preload = 'auto';
      vid.setAttribute('playsinline', '');
      vid.setAttribute('webkit-playsinline', '');
      vid.style.width = '100%';
      vid.style.height = '100%';
      vid.style.objectFit = 'contain';
      vid.style.display = 'block';

      // Controls overlay: Unmute button & Skip button directly in DOM
      const controlsBar = document.createElement('div');
      controlsBar.style.position = 'absolute';
      controlsBar.style.bottom = '12px';
      controlsBar.style.right = '12px';
      controlsBar.style.display = 'flex';
      controlsBar.style.gap = '8px';
      controlsBar.style.zIndex = '10';

      const unmuteBtn = document.createElement('button');
      unmuteBtn.id = 'cinematic-unmute-btn';
      unmuteBtn.innerText = '🔊 Bunyikan Suara';
      unmuteBtn.style.background = 'rgba(28, 17, 10, 0.9)';
      unmuteBtn.style.color = '#f5c451';
      unmuteBtn.style.border = '1px solid #f5c451';
      unmuteBtn.style.borderRadius = '6px';
      unmuteBtn.style.padding = '6px 12px';
      unmuteBtn.style.fontFamily = 'Georgia, serif';
      unmuteBtn.style.fontSize = '12px';
      unmuteBtn.style.cursor = 'pointer';
      unmuteBtn.style.display = 'none'; // hidden unless muted

      unmuteBtn.onclick = (e) => {
        e.stopPropagation();
        vid.muted = false;
        unmuteBtn.style.display = 'none';
      };

      const skipDomBtn = document.createElement('button');
      skipDomBtn.innerText = 'Lewati (Skip) ⏩';
      skipDomBtn.style.background = 'rgba(28, 17, 10, 0.9)';
      skipDomBtn.style.color = '#f2d49b';
      skipDomBtn.style.border = '1px solid #6b5526';
      skipDomBtn.style.borderRadius = '6px';
      skipDomBtn.style.padding = '6px 12px';
      skipDomBtn.style.fontFamily = 'Georgia, serif';
      skipDomBtn.style.fontSize = '12px';
      skipDomBtn.style.cursor = 'pointer';
      skipDomBtn.onclick = (e) => {
        e.stopPropagation();
        this.finish();
      };

      controlsBar.appendChild(unmuteBtn);
      controlsBar.appendChild(skipDomBtn);
      container.appendChild(vid);
      container.appendChild(controlsBar);

      // Clicking anywhere on the video container un-mutes audio if muted
      container.onclick = () => {
        if (vid.muted) {
          vid.muted = false;
          unmuteBtn.style.display = 'none';
        }
      };

      (document.getElementById('game-viewport') || document.body).appendChild(container);

      this.videoEl = vid;
      this.containerEl = container;

      vid.onended = () => {
        this.finish();
      };

      vid.ontimeupdate = () => {
        if (vid.duration && vid.duration > 0) {
          const ratio = Math.min(1, vid.currentTime / vid.duration);
          progressBar.width = ratio * 400;
        }
      };

      vid.onerror = (err) => {
        console.warn('Video failed to load or play:', url, err);
        this.hasPlayingVideo = false;
        this.cleanupDom();
        // Fallback tween takes over to finish cleanly
      };

      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.hasPlayingVideo = true;
            fallbackTween.kill();
          })
          .catch((error) => {
            console.warn('Unmuted autoplay prevented by browser; retrying muted:', error);
            // Browser autoplay policy: retry with sound muted
            vid.muted = true;
            unmuteBtn.style.display = 'block';
            vid
              .play()
              .then(() => {
                this.hasPlayingVideo = true;
                fallbackTween.kill();
              })
              .catch((err) => {
                console.warn('Even muted video autoplay failed:', err);
                this.hasPlayingVideo = false;
                this.cleanupDom();
              });
          });
      }
    } catch (e) {
      console.warn('tryPlayVideo exception:', e);
      this.hasPlayingVideo = false;
    }
  }

  private cleanupDom(): void {
    if (this.videoEl) {
      try {
        this.videoEl.pause();
        this.videoEl.removeAttribute('src');
        this.videoEl.load();
      } catch {
        // ignore
      }
      this.videoEl = undefined;
    }
    if (this.containerEl) {
      this.containerEl.remove();
      this.containerEl = undefined;
    }
  }

  private finish(): void {
    if (this.isFinishing) return;
    this.isFinishing = true;

    this.cleanupDom();
    gsap.killTweensOf(this);
    this.cameras.main.fade(300, 28, 17, 10);
    this.time.delayedCall(320, () => {
      this.configData.onComplete();
    });
  }
}
