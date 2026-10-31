import Phaser from 'phaser';
import { Sounds } from './SoundSystem';

export interface InputState {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  handPressed: boolean;
  kickPressed: boolean;
  triwikramaPressed: boolean;
  ekorApiPressed: boolean;
  mengecilPressed: boolean;
}

export const NO_INPUT: InputState = {
  left: false,
  right: false,
  jumpPressed: false,
  handPressed: false,
  kickPressed: false,
  triwikramaPressed: false,
  ekorApiPressed: false,
  mengecilPressed: false,
};

// Anything that can drive a fighter: a keyboard layout, touch overlay, or the CPU.
export interface Controller {
  read(): InputState;
  destroy?(): void;
}

type Action = 'left' | 'right' | 'jump' | 'hand' | 'kick' | 'triwikrama' | 'ekorApi' | 'mengecil';
type KeyMap = Record<Action, number[]>;

const K = Phaser.Input.Keyboard.KeyCodes;

// Two players share one keyboard: P1 on the left half, P2 on the right.
export const KEYMAPS: Record<'p1' | 'p2', KeyMap> = {
  p1: {
    left: [K.A],
    right: [K.D],
    jump: [K.W],
    hand: [K.J],
    kick: [K.K],
    triwikrama: [K.U],
    ekorApi: [K.I],
    mengecil: [K.O],
  },
  p2: {
    left: [K.LEFT],
    right: [K.RIGHT],
    jump: [K.UP],
    hand: [K.COMMA, K.NUMPAD_ONE],
    kick: [K.PERIOD, K.NUMPAD_TWO],
    triwikrama: [K.L, K.NUMPAD_FOUR],
    ekorApi: [K.SEMICOLON, K.NUMPAD_FIVE],
    mengecil: [K.QUOTES, K.NUMPAD_SIX],
  },
};

// Presses are latched from each key's 'down' event rather than read with
// JustDown: Phaser clears a key's just-down flag on release, so a tap that
// goes down and up between two frames would otherwise be lost.
export class KeyboardController implements Controller {
  private keys: Record<Action, Phaser.Input.Keyboard.Key[]>;
  private pressed = new Set<Action>();

  constructor(scene: Phaser.Scene, map: KeyMap) {
    const kb = scene.input.keyboard!;
    const entries = Object.entries(map) as [Action, number[]][];
    this.keys = Object.fromEntries(entries.map(([action, codes]) => [action, codes.map((c) => kb.addKey(c))])) as Record<
      Action,
      Phaser.Input.Keyboard.Key[]
    >;

    const listeners: [Phaser.Input.Keyboard.Key, () => void][] = [];
    for (const [action, keys] of Object.entries(this.keys) as [Action, Phaser.Input.Keyboard.Key[]][]) {
      for (const key of keys) {
        const onDown = () => this.pressed.add(action);
        key.on(Phaser.Input.Keyboard.Events.DOWN, onDown);
        listeners.push([key, onDown]);
      }
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const [key, fn] of listeners) key.off(Phaser.Input.Keyboard.Events.DOWN, fn);
    });
  }

  read(): InputState {
    const held = (a: Action) => this.keys[a].some((key) => key.isDown);
    const was = (a: Action) => this.pressed.has(a);
    const state: InputState = {
      left: held('left'),
      right: held('right'),
      jumpPressed: was('jump'),
      handPressed: was('hand'),
      kickPressed: was('kick'),
      triwikramaPressed: was('triwikrama'),
      ekorApiPressed: was('ekorApi'),
      mengecilPressed: was('mengecil'),
    };
    this.pressed.clear();
    return state;
  }
}

// On-screen touch controller for mobile, tablet, or click testing
export class TouchController implements Controller {
  private held = new Set<Action>();
  private pressed = new Set<Action>();
  private overlayEl?: HTMLDivElement;

  constructor(scene: Phaser.Scene) {
    this.mountTouchUI();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  private mountTouchUI(): void {
    if (typeof document === 'undefined') return;

    // Idempotent: remove previous instances to avoid duplicate DOM elements
    document.getElementById('touch-controls-overlay')?.remove();
    document.getElementById('btn-toggle-touchpad')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'touch-controls-overlay';
    overlay.setAttribute('aria-label', 'Kontrol Sentuh Layar Wayang');
    overlay.style.position = 'absolute';
    overlay.style.bottom = '16px';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'space-between';
    overlay.style.alignItems = 'flex-end';
    overlay.style.padding = '0 20px';
    overlay.style.boxSizing = 'border-box';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '9000';
    overlay.style.userSelect = 'none';
    (overlay.style as any).webkitUserSelect = 'none';

    // Helper to create tactile buttons with proper inner padding and breathability
    const makeBtn = (
      iconHtml: string,
      label: string,
      action: Action,
      width: number,
      height: number,
      isRound = false,
      gridCol?: string,
      gridRow?: string,
    ) => {
      const btn = document.createElement('button');
      btn.setAttribute('type', 'button');
      if (gridCol) btn.style.gridColumn = gridCol;
      if (gridRow) btn.style.gridRow = gridRow;
      btn.style.width = `${width}px`;
      btn.style.height = `${height}px`;
      btn.style.boxSizing = 'border-box';
      btn.style.padding = isRound ? '4px' : '4px 8px';
      btn.style.borderRadius = isRound ? '50%' : '12px';
      btn.style.background = 'radial-gradient(circle at 35% 35%, rgba(45, 26, 14, 0.88), rgba(18, 10, 5, 0.94))';
      btn.style.border = '2px solid #f5c451';
      btn.style.color = '#ffe082';
      btn.style.fontFamily = 'Georgia, serif';
      btn.style.cursor = 'pointer';
      btn.style.touchAction = 'none';
      btn.style.display = 'flex';
      btn.style.flexDirection = 'column';
      btn.style.justifyContent = 'center';
      btn.style.alignItems = 'center';
      btn.style.gap = '2px';
      btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.7), inset 0 1px 3px rgba(255,224,130,0.3)';
      btn.style.transition = 'transform 0.08s ease-out, background 0.08s ease-out';
      btn.style.pointerEvents = 'auto';

      btn.innerHTML = `
        <div style="font-size:${isRound ? '16px' : '15px'}; line-height:1; display:flex; justify-content:center; align-items:center;">${iconHtml}</div>
        <div style="font-size:10px; font-weight:bold; letter-spacing:0.8px; line-height:1; white-space:nowrap; padding:0 2px;">${label}</div>
      `;

      const press = (e: Event) => {
        e.preventDefault();
        btn.style.background = 'radial-gradient(circle at 45% 45%, #ffe082, #d48806)';
        btn.style.color = '#140802';
        btn.style.transform = 'scale(0.92)';
        btn.style.borderColor = '#ffffff';
        this.held.add(action);
        this.pressed.add(action);
        Sounds.cempala(1.6, 0.25);
        if (navigator.vibrate) navigator.vibrate(15);
      };

      const release = (e: Event) => {
        e.preventDefault();
        btn.style.background = 'radial-gradient(circle at 35% 35%, rgba(45, 26, 14, 0.88), rgba(18, 10, 5, 0.94))';
        btn.style.color = '#ffe082';
        btn.style.transform = 'scale(1.0)';
        btn.style.borderColor = '#f5c451';
        this.held.delete(action);
      };

      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
      return btn;
    };

    // 1. LEFT D-PAD: Same original layout (Lompat top-center, Kiri bottom-left, Kanan bottom-right)
    // Widened to 74px so "LOMPAT", "KANAN", "KIRI" have plenty of margin/spacing from the golden frame
    const dpad = document.createElement('div');
    dpad.style.display = 'grid';
    dpad.style.gridTemplateColumns = 'repeat(3, 74px)';
    dpad.style.gridTemplateRows = 'repeat(2, 56px)';
    dpad.style.gap = '8px';
    dpad.style.pointerEvents = 'auto';

    dpad.appendChild(makeBtn('▲', 'LOMPAT', 'jump', 74, 56, false, '2', '1'));
    dpad.appendChild(makeBtn('◀', 'KIRI', 'left', 74, 56, false, '1', '2'));
    dpad.appendChild(makeBtn('▶', 'KANAN', 'right', 74, 56, false, '3', '2'));

    // 2. RIGHT ACTION PAD: Same original layout (Row 1: 3 circles, Row 2: 2 attack buttons)
    // Symmetrically spaced with generous breathability
    const actionPad = document.createElement('div');
    actionPad.style.display = 'flex';
    actionPad.style.flexDirection = 'column';
    actionPad.style.gap = '8px';
    actionPad.style.alignItems = 'flex-end';
    actionPad.style.pointerEvents = 'auto';

    // Row 1: 3 Circular Aji Buttons
    const ajiRow = document.createElement('div');
    ajiRow.style.display = 'flex';
    ajiRow.style.gap = '8px';
    ajiRow.appendChild(makeBtn('🔥', 'EKOR', 'ekorApi', 52, 52, true));
    ajiRow.appendChild(makeBtn('⚡', 'AJI', 'triwikrama', 52, 52, true));
    ajiRow.appendChild(makeBtn('🌀', 'KECIL', 'mengecil', 52, 52, true));

    // Row 2: 2 Attack Buttons (82px wide each, perfectly matching the 172px width of Row 1)
    const attackRow = document.createElement('div');
    attackRow.style.display = 'flex';
    attackRow.style.gap = '8px';
    attackRow.appendChild(makeBtn('🥊', 'PUKUL', 'hand', 82, 56, false));
    attackRow.appendChild(makeBtn('🦶', 'TENDANG', 'kick', 82, 56, false));

    actionPad.appendChild(ajiRow);
    actionPad.appendChild(attackRow);

    overlay.appendChild(dpad);
    overlay.appendChild(actionPad);

    // Auto-detect mobile touch: show by default on touch screens, hide on desktop unless screen is narrow or requested
    const isTouchDevice = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || window.innerWidth < 1024;
    overlay.style.display = isTouchDevice ? 'flex' : 'none';

    // Original Center Toggle Button at bottom-center
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'btn-toggle-touchpad';
    toggleBtn.innerHTML = `<span>🎮</span> <span>${isTouchDevice ? 'Sembunyikan Pad' : 'Tampilkan Pad Sentuh'}</span>`;
    toggleBtn.style.position = 'absolute';
    toggleBtn.style.bottom = '8px';
    toggleBtn.style.left = '50%';
    toggleBtn.style.transform = 'translateX(-50%)';
    toggleBtn.style.background = 'rgba(28, 17, 10, 0.88)';
    toggleBtn.style.color = '#ffe082';
    toggleBtn.style.border = '1px solid #6b5526';
    toggleBtn.style.borderRadius = '6px';
    toggleBtn.style.fontFamily = 'Georgia, serif';
    toggleBtn.style.fontSize = '11px';
    toggleBtn.style.padding = '4px 14px';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.zIndex = '9001';
    toggleBtn.style.pointerEvents = 'auto';
    toggleBtn.style.backdropFilter = 'blur(4px)';
    toggleBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.6)';
    toggleBtn.style.display = 'flex';
    toggleBtn.style.alignItems = 'center';
    toggleBtn.style.gap = '6px';

    toggleBtn.onclick = () => {
      const isVisible = overlay.style.display !== 'none';
      overlay.style.display = isVisible ? 'none' : 'flex';
      toggleBtn.innerHTML = `<span>🎮</span> <span>${isVisible ? 'Tampilkan Pad Sentuh' : 'Sembunyikan Pad'}</span>`;
    };

    const root = document.getElementById('game-viewport') || document.body;
    root.appendChild(overlay);
    root.appendChild(toggleBtn);
    this.overlayEl = overlay;
  }

  read(): InputState {
    const state: InputState = {
      left: this.held.has('left'),
      right: this.held.has('right'),
      jumpPressed: this.pressed.has('jump'),
      handPressed: this.pressed.has('hand'),
      kickPressed: this.pressed.has('kick'),
      triwikramaPressed: this.pressed.has('triwikrama'),
      ekorApiPressed: this.pressed.has('ekorApi'),
      mengecilPressed: this.pressed.has('mengecil'),
    };
    this.pressed.clear();
    return state;
  }

  destroy(): void {
    if (this.overlayEl) {
      this.overlayEl.remove();
      this.overlayEl = undefined;
    }
    const toggleBtn = document.getElementById('btn-toggle-touchpad');
    if (toggleBtn) toggleBtn.remove();
    this.held.clear();
    this.pressed.clear();
  }
}

// Combines keyboard, touch, or external controller into one unified input feed
export class CompositeController implements Controller {
  constructor(private controllers: Controller[]) {}

  read(): InputState {
    const states = this.controllers.map((c) => c.read());
    return {
      left: states.some((s) => s.left),
      right: states.some((s) => s.right),
      jumpPressed: states.some((s) => s.jumpPressed),
      handPressed: states.some((s) => s.handPressed),
      kickPressed: states.some((s) => s.kickPressed),
      triwikramaPressed: states.some((s) => s.triwikramaPressed),
      ekorApiPressed: states.some((s) => s.ekorApiPressed),
      mengecilPressed: states.some((s) => s.mengecilPressed),
    };
  }

  destroy(): void {
    this.controllers.forEach((c) => c.destroy?.());
  }
}

// Helper to instantiate Player 1 with both Keyboard and Touch gamepad support
export function createPlayerController(scene: Phaser.Scene, map: KeyMap, enableTouch = true): Controller {
  const kb = new KeyboardController(scene, map);
  if (!enableTouch) return kb;
  const touch = new TouchController(scene);
  return new CompositeController([kb, touch]);
}
