import Phaser from 'phaser';
import gsap from 'gsap';
import { COLORS, GAME, KELIR } from '../constants';
import { textStyle } from '../systems/Effects';
import { drawGunungan, preloadGunungan } from '../systems/Gunungan';
import { Lighting } from '../systems/Lighting';
import { Sounds } from '../systems/SoundSystem';
import storyConfig from '../data/story-config.json';

// 'demo' (CPU against CPU) is only reachable with ?mode=demo, for watching the AI.
export type Mode = 'arcade' | 'cpu' | 'versus' | 'dojo' | 'demo';

// Title: the gunungan stands in the middle of the kelir, as before a show.
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  preload(): void {
    preloadGunungan(this);
  }

  create(): void {
    new Lighting(this);
    const floorTop = GAME.height - KELIR.floorHeight;
    this.add.rectangle(GAME.width / 2, floorTop + KELIR.floorHeight / 2, GAME.width, KELIR.floorHeight, COLORS.gedebog);

    const kayon = drawGunungan(this, GAME.width / 2, 300, 380).setDepth(10);
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      gsap.to(kayon, { angle: 2, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }

    this.add.text(GAME.width / 2, 55, 'Hanoman: Perang Wayang', textStyle(46, '#fff9e6', '#1c110a')).setOrigin(0.5).setDepth(101);

    // ---- Arcade Story Button ----
    const arcadeBtnY = floorTop - 125;
    const btnBg = this.add
      .rectangle(GAME.width / 2, arcadeBtnY, 520, 52, 0x1c110a, 0.94)
      .setStrokeStyle(3, 0xf5c451)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });

    const arcadeText = this.add
      .text(GAME.width / 2, arcadeBtnY, '⚔️   ARCADE STORY : RAMAYANA   ⚔️', {
        ...textStyle(22, '#ffe082', '#1c110a'),
      })
      .setOrigin(0.5)
      .setDepth(102);

    // High contrast hint text: dark ink on kelir background with sharp resolution
    this.add
      .text(GAME.width / 2, arcadeBtnY + 38, '[ ENTER / KLIK ] Mulai Petualangan Cerita', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#1a0e05',
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(102);

    if (!prefersReducedMotion) {
      gsap.to([btnBg, arcadeText], {
        scale: 1.03,
        duration: 0.9,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    }

    btnBg.on('pointerover', () => {
      Sounds.cempala(1.4, 0.3);
      btnBg.setFillStyle(0x3a1f0c, 0.98);
      btnBg.setStrokeStyle(4, 0xffe082);
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x1c110a, 0.94);
      btnBg.setStrokeStyle(3, 0xf5c451);
    });
    btnBg.on('pointerdown', () => this.start('arcade'));

    // ---- Classic Match Mode Options (WCAG min 44x44px touch targets) ----
    const menuY = floorTop - 40;
    const createPillButton = (x: number, text: string, mode: Mode, isHighlight = false) => {
      const w = 240;
      const h = 44;
      const bg = this.add
        .rectangle(x, menuY, w, h, 0x1c110a, 0.9)
        .setStrokeStyle(2, isHighlight ? 0xffe082 : 0x6b5526)
        .setDepth(101)
        .setInteractive({ useHandCursor: true });

      const label = this.add
        .text(x, menuY, text, {
          fontFamily: 'Georgia, serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: isHighlight ? '#ffe082' : '#ffffff',
          resolution: 2,
        })
        .setOrigin(0.5)
        .setDepth(102);

      bg.on('pointerover', () => {
        Sounds.cempala(1.8, 0.25);
        bg.setFillStyle(0x3a2212, 0.98);
        bg.setStrokeStyle(2, 0xf5c451);
        label.setColor('#ffe082');
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(0x1c110a, 0.9);
        bg.setStrokeStyle(2, isHighlight ? 0xffe082 : 0x6b5526);
        label.setColor(isHighlight ? '#ffe082' : '#ffffff');
      });
      bg.on('pointerdown', () => {
        Sounds.cempala(1.2, 0.6);
        this.start(mode);
      });
      return bg;
    };

    createPillButton(GAME.width / 2 - 260, '1  Lawan Dalang (CPU)', 'cpu');
    createPillButton(GAME.width / 2, '2  Dua Pemain (Versus)', 'versus');
    createPillButton(GAME.width / 2 + 260, '3  🥋 Dojo Uji Coba Rig', 'dojo', true);

    this.add
      .text(
        GAME.width / 2,
        floorTop + 38,
        'P1:  A D jalan · W lompat · J tangan · K tendang · U I O aji (Triwikrama, Ekor Api, Mengecil) · tahan mundur = tangkis\n' +
          'P2:  ← → jalan · ↑ lompat · , tangan · . tendang · L ; \' aji',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#fff5db',
          stroke: '#1a0d05',
          strokeThickness: 3,
          align: 'center',
          lineSpacing: 4,
          resolution: 2,
        },
      )
      .setOrigin(0.5)
      .setDepth(101);

    // Development shortcut: ?mode=arcade|cpu|versus|dojo|demo skips the title.
    const urlMode = new URLSearchParams(window.location.search).get('mode') as Mode | null;
    if (urlMode === 'arcade' || urlMode === 'cpu' || urlMode === 'versus' || urlMode === 'dojo' || urlMode === 'demo') {
      return this.start(urlMode);
    }

    const kb = this.input.keyboard!;
    kb.once('keydown-ENTER', () => this.start('arcade'));
    kb.once('keydown-SPACE', () => this.start('arcade'));
    kb.once('keydown-ONE', () => this.start('cpu'));
    kb.once('keydown-NUMPAD_ONE', () => this.start('cpu'));
    kb.once('keydown-TWO', () => this.start('versus'));
    kb.once('keydown-NUMPAD_TWO', () => this.start('versus'));
    kb.once('keydown-THREE', () => this.start('dojo'));
    kb.once('keydown-NUMPAD_THREE', () => this.start('dojo'));
    kb.once('keydown-D', () => this.start('dojo'));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.removeAllListeners();
      gsap.killTweensOf([btnBg, arcadeText, kayon]);
    });
  }

  private start(mode: Mode): void {
    Sounds.gong('ageng', 0.8);
    if (mode === 'dojo') {
      this.scene.start('DojoScene');
      return;
    }

    if (mode === 'arcade' && storyConfig?.chapters?.length > 0) {
      const ch1 = storyConfig.chapters[0];
      this.scene.start('CinematicScene', {
        badge: '🎬 PROLOG BABAK 1',
        title: ch1.title,
        subtitle: ch1.subtitle,
        videoUrl: ch1.introVideo,
        durationSeconds: 8,
        onComplete: () => {
          this.scene.start('FightScene', {
            mode: 'arcade',
            wins: [0, 0],
            round: 1,
            chapterIndex: 1,
            player1Char: ch1.player1,
            cpuChar: ch1.cpu,
          });
        },
      });
      return;
    }
    this.scene.start('FightScene', { mode, wins: [0, 0], round: 1 });
  }
}
