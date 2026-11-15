/** Unified input: keyboard, mouse, touch, gamepad. */

export interface InputState {
  holding: boolean;        // primary thrust action
  justPressed: boolean;    // true for exactly one frame
  justReleased: boolean;
  pointerX: number;        // last pointer x in logical coords
  pointerY: number;
  anyKeyThisFrame: boolean;
}

export class InputManager {
  private _holding = false;
  private _justPressed = false;
  private _justReleased = false;
  private _pointerX = 0;
  private _pointerY = 0;
  private _anyKeyThisFrame = false;
  private _scaleX = 1;
  private _scaleY = 1;
  private _offsetX = 0;
  private _offsetY = 0;
  private _canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._bindEvents();
  }

  updateScale(
    canvasLogicalW: number, canvasLogicalH: number,
    canvasCssW: number, canvasCssH: number,
    offsetX: number, offsetY: number
  ): void {
    this._scaleX = canvasLogicalW / canvasCssW;
    this._scaleY = canvasLogicalH / canvasCssH;
    this._offsetX = offsetX;
    this._offsetY = offsetY;
  }

  /** Call once per render frame to clear one-shot flags. */
  endFrame(): void {
    this._justPressed = false;
    this._justReleased = false;
    this._anyKeyThisFrame = false;
  }

  get state(): InputState {
    return {
      holding: this._holding,
      justPressed: this._justPressed,
      justReleased: this._justReleased,
      pointerX: this._pointerX,
      pointerY: this._pointerY,
      anyKeyThisFrame: this._anyKeyThisFrame,
    };
  }

  get holding(): boolean { return this._holding; }
  get justPressed(): boolean { return this._justPressed; }
  get justReleased(): boolean { return this._justReleased; }
  get pointerX(): number { return this._pointerX; }
  get pointerY(): number { return this._pointerY; }

  private _press(): void {
    if (!this._holding) {
      this._justPressed = true;
    }
    this._holding = true;
    this._anyKeyThisFrame = true;
  }

  private _release(): void {
    if (this._holding) {
      this._justReleased = true;
    }
    this._holding = false;
  }

  private _toLogical(clientX: number, clientY: number): [number, number] {
    const rect = this._canvas.getBoundingClientRect();
    return [
      (clientX - rect.left) * this._scaleX,
      (clientY - rect.top) * this._scaleY,
    ];
  }

  private _bindEvents(): void {
    // Keyboard
    window.addEventListener('keydown', e => {
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        this._press();
      }
      this._anyKeyThisFrame = true;
    });
    window.addEventListener('keyup', e => {
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        this._release();
      }
    });

    // Mouse
    this._canvas.addEventListener('mousedown', e => {
      const [lx, ly] = this._toLogical(e.clientX, e.clientY);
      this._pointerX = lx;
      this._pointerY = ly;
      this._press();
    });
    window.addEventListener('mouseup', () => this._release());
    this._canvas.addEventListener('mousemove', e => {
      const [lx, ly] = this._toLogical(e.clientX, e.clientY);
      this._pointerX = lx;
      this._pointerY = ly;
    });

    // Touch
    this._canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) {
        const [lx, ly] = this._toLogical(t.clientX, t.clientY);
        this._pointerX = lx;
        this._pointerY = ly;
      }
      this._press();
    }, { passive: false });
    this._canvas.addEventListener('touchend', e => {
      e.preventDefault();
      this._release();
    }, { passive: false });
    this._canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) {
        const [lx, ly] = this._toLogical(t.clientX, t.clientY);
        this._pointerX = lx;
        this._pointerY = ly;
      }
    }, { passive: false });

    // Gamepad polling (done in game loop)
  }

  /** Poll gamepad. Call each frame. */
  pollGamepad(): void {
    const gamepads = navigator.getGamepads?.();
    if (!gamepads) return;
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp) continue;
      const held = (gp.buttons[0]?.pressed ?? false) ||
                   (gp.buttons[1]?.pressed ?? false) ||
                   (gp.axes[1] !== undefined && gp.axes[1] < -0.5);
      if (held) this._press();
      else if (this._holding) this._release();
    }
  }
}
