import Phaser from 'phaser';
import { GAME, COLORS } from './constants';
import { FightScene } from './scenes/FightScene';
import { TitleScene } from './scenes/TitleScene';
import { CinematicScene } from './scenes/CinematicScene';
import { DojoScene } from './scenes/DojoScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME.width,
  height: GAME.height,
  backgroundColor: COLORS.kelir,
  antialias: true,
  antialiasGL: true,
  roundPixels: true,
  render: {
    antialias: true,
    antialiasGL: true,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: GAME.width,
    height: GAME.height,
  },
  scene: [TitleScene, CinematicScene, FightScene, DojoScene],
});

// Setup Mobile Portrait Landscape Rotation & Input Coordinate Translation
function setupOrientationAndScale(phaserGame: Phaser.Game) {
  const isPortraitMode = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(orientation: portrait)').matches || window.innerHeight > window.innerWidth;
  };

  const updateViewportSize = () => {
    const vp = document.getElementById('game-viewport');
    if (!vp) return;
    if (isPortraitMode()) {
      const h = window.innerHeight;
      const w = window.innerWidth;
      vp.style.width = `${h}px`;
      vp.style.height = `${w}px`;
    } else {
      vp.style.width = '100vw';
      vp.style.height = '100vh';
    }
  };
  updateViewportSize();

  const scale = phaserGame.scale;
  const origGetParentBounds = scale.getParentBounds.bind(scale);
  // Intercept getParentBounds: when viewport is rotated 90deg by CSS, available landscape dimensions swap width & height
  scale.getParentBounds = function () {
    if (!this.parent) return false;
    if (!isPortraitMode()) {
      return origGetParentBounds();
    }
    const newWidth = Math.max(window.innerWidth, window.innerHeight);
    const newHeight = Math.min(window.innerWidth, window.innerHeight);
    if (this.parentSize.width !== newWidth || this.parentSize.height !== newHeight) {
      this.parentSize.setSize(newWidth, newHeight);
      return true;
    }
    return false;
  };

  // Intercept transformPointer: when viewport is rotated 90deg clockwise, map screen touches to 1280x720 canvas
  const input = phaserGame.input as any;
  if (input && typeof input.transformPointer === 'function') {
    const origTransformPointer = input.transformPointer.bind(input);
    input.transformPointer = function (pointer: any, pageX: number, pageY: number, wasMove: boolean) {
      if (!isPortraitMode() || !phaserGame.canvas) {
        return origTransformPointer(pointer, pageX, pageY, wasMove);
      }
      const rect = phaserGame.canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = pageX - centerX;
      const dy = pageY - centerY;

      // Inverse 90deg clockwise rotation: (unrotatedDx = dy, unrotatedDy = -dx)
      const unrotatedDx = dy;
      const unrotatedDy = -dx;

      // When rotated 90deg, the canvas's local width corresponds to rect.height and local height to rect.width
      const localX = unrotatedDx + rect.height / 2;
      const localY = unrotatedDy + rect.width / 2;
      const gameX = (localX / rect.height) * GAME.width;
      const gameY = (localY / rect.width) * GAME.height;

      const p0 = pointer.position;
      const p1 = pointer.prevPosition;
      p1.x = p0.x;
      p1.y = p0.y;
      p0.x = gameX;
      p0.y = gameY;
    };
  }

  window.addEventListener('resize', () => {
    updateViewportSize();
    scale.refresh();
  });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      updateViewportSize();
      scale.refresh();
    }, 150);
  });
}

// Setup Auto Fullscreen on user gesture (pointerdown or keydown)
if (typeof window !== 'undefined') {
  setupOrientationAndScale(game);

  const requestAutoFullscreen = () => {
    if (!document.fullscreenElement) {
      const docEl = document.documentElement;
      const rfs =
        docEl.requestFullscreen ||
        (docEl as any).webkitRequestFullscreen ||
        (docEl as any).mozRequestFullScreen ||
        (docEl as any).msRequestFullscreen;

      if (rfs) {
        rfs
          .call(docEl)
          .then(() => {
            try {
              (screen.orientation as any)?.lock?.('landscape').catch(() => {});
            } catch {}
          })
          .catch(() => {});
      }
    }
  };

  // Trigger automatically on the very first touch/click or key press anywhere
  window.addEventListener('pointerdown', requestAutoFullscreen, { passive: true });
  window.addEventListener(
    'keydown',
    (e) => {
      if ((e.key === 'f' || e.key === 'F') && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (document.activeElement?.tagName !== 'INPUT') {
        requestAutoFullscreen();
      }
    },
    { passive: true },
  );

  document.addEventListener('fullscreenchange', () => {
    game.scale.refresh();
  });
}

// Dev only: lets tooling inspect the running game from the browser console.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
