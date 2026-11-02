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
  private hasActiveVideo = false;
  private videoEl?: HTMLVideoElement;

  constructor() {
    super('CinematicScene');
  }

  preload(): void {
    preloadGunungan(this);
  }

  create(data: CinematicData): void {
    this.configData = data;
    this.isFinishing = false;
    this.hasActiveVideo = false;

    // 1. Deep theatrical dark backdrop (covers fighters & fight UI underneath)
    const backdrop = this.add
      .rectangle(GAME.width / 2, GAME.height / 2, GAME.width, GAME.height, 0x060402, 0)
      .setDepth(1);
    gsap.to(backdrop, { fillAlpha: 0.94, duration: 0.35, ease: 'power2.out' });

    // 2. Warm kelir lighting & stage floor
    new Lighting(this);
    const floorTop = GAME.height - KELIR.floorHeight;
    this.add
      .rectangle(GAME.width / 2, floorTop + KELIR.floorHeight / 2, GAME.width, KELIR.floorHeight, COLORS.gedebog, 0.9)
      .setDepth(2);

    // 3. Golden center aura behind Gunungan
    const aura = this.add.circle(GAME.width / 2, 320, 160, 0xf5c451, 0.08).setDepth(3);
    gsap.to(aura, { scale: 1.3, alpha: 0.16, duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });

    // 4. Center Kayon / Gunungan
    const kayon = drawGunungan(this, GAME.width / 2, 325, 330).setDepth(10);
    gsap.to(kayon, { angle: 3, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });

    // 5. Header Badge with decorative dark pill container
    const badgeText = data.badge ?? 'LAKON RAMAYANA';
    this.add
      .rectangle(GAME.width / 2, 65, 380, 32, 0x1f1107, 0.95)
      .setStrokeStyle(1.5, 0xf5c451, 0.85)
      .setDepth(20);

    this.add
      .text(GAME.width / 2, 65, badgeText, {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: '#f5c451',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(21);

    // 6. Title with strong drop-shadow and outline
    this.add
      .text(GAME.width / 2, 115, data.title, {
        ...textStyle(32),
        stroke: '#120803',
        strokeThickness: 5,
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 6, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(21);

    // 7. Subtitle with clear contrasting serif font
    this.add
      .text(GAME.width / 2, 155, data.subtitle, {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: '#fce3b6',
        fontStyle: 'italic',
        stroke: '#120803',
        strokeThickness: 3,
        shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 4, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(21);

    // 8. Progress Bar (placed below Gunungan, grounded & clean)
    const duration = data.durationSeconds ?? (data.badge?.includes('RAGE') ? 10 : 6);
    const barY = 505;
    this.add
      .rectangle(GAME.width / 2, barY, 404, 10, 0x140b04, 0.9)
      .setStrokeStyle(1, 0x8a6a2a, 0.7)
      .setDepth(20);

    const progressBar = this.add
      .rectangle(GAME.width / 2 - 200, barY, 0, 6, 0xf5c451)
      .setOrigin(0, 0.5)
      .setDepth(21);

    gsap.to(progressBar, {
      width: 400,
      duration,
      ease: 'linear',
      onComplete: () => {
        if (!this.hasActiveVideo) this.finish();
      },
    });

    // 9. Skip Button with interactive hover feedback
    const skipBtn = this.add
      .rectangle(GAME.width / 2, GAME.height - 35, 340, 34, 0x180d05, 0.9)
      .setStrokeStyle(1.5, 0xf5c451, 0.8)
      .setDepth(22)
      .setInteractive({ useHandCursor: true });

    const skipTxt = this.add
      .text(GAME.width / 2, GAME.height - 35, 'TEKAN [SPASI / ENTER / KLIK] UNTUK LEWATI', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#f5c451',
      })
      .setOrigin(0.5)
      .setDepth(23);

    skipBtn.on('pointerover', () => {
      skipBtn.setFillStyle(0x381e0a, 1);
      skipTxt.setColor('#fff4cf');
    });
    skipBtn.on('pointerout', () => {
      skipBtn.setFillStyle(0x180d05, 0.9);
      skipTxt.setColor('#f5c451');
    });
    skipBtn.on('pointerdown', () => this.finish());

    // 10. Video Playback handling
    if (data.videoUrl) {
      this.tryPlayVideo(data.videoUrl);
    }

    const kb = this.input.keyboard!;
    kb.once('keydown-SPACE', () => this.finish());
    kb.once('keydown-ENTER', () => this.finish());
    this.input.once('pointerdown', () => this.finish());
  }

  private tryPlayVideo(url: string): void {
    try {
      const vid = document.createElement('video');
      vid.src = url;
      vid.autoplay = true;
      vid.muted = false;
      vid.playsInline = true;
      vid.style.position = 'absolute';
      vid.style.top = '12%';
      vid.style.left = '15%';
      vid.style.width = '70%';
      vid.style.height = '68%';
      vid.style.objectFit = 'contain';
      vid.style.backgroundColor = '#000000';
      vid.style.zIndex = '1000';
      vid.style.borderRadius = '12px';
      vid.style.border = '3px solid #f5c451';
      vid.style.boxShadow = '0 0 35px rgba(245, 196, 81, 0.7)';

      vid.onplaying = () => {
        this.hasActiveVideo = true;
      };

      vid.onended = () => {
        this.hasActiveVideo = false;
        this.finish();
      };

      vid.onerror = () => {
        this.hasActiveVideo = false;
        if (this.videoEl) {
          this.videoEl.remove();
          this.videoEl = undefined;
        }
      };

      document.body.appendChild(vid);
      this.videoEl = vid;

      vid.play().catch(() => {
        // Fallback if browser blocks unmuted autoplay
        vid.muted = true;
        vid.play().catch(() => {
          this.hasActiveVideo = false;
          if (this.videoEl) {
            this.videoEl.remove();
            this.videoEl = undefined;
          }
        });
      });
    } catch {
      this.hasActiveVideo = false;
    }
  }

  private finish(): void {
    if (this.isFinishing) return;
    this.isFinishing = true;

    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.remove();
      this.videoEl = undefined;
    }

    gsap.killTweensOf(this);
    this.cameras.main.fade(300, 10, 6, 3);
    this.time.delayedCall(320, () => {
      this.configData.onComplete();
    });
  }
}
