/**
 * Переводит события браузера в команды и InputFrame. Физические code работают
 * и при русской раскладке. Разовые нажатия потребляются только первым шагом.
 * Выход из Pointer Lock, потеря фокуса и скрытие вкладки передают управление паузе.
 */
import type { InputFrame } from './Player.ts';
interface Callbacks {
  active: () => boolean;
  look: (dx: number, dy: number) => void;
  pause: () => void;
  reload: () => void;
  slot: (i: number) => void;
  cycle: (d: number) => void;
  lockState: (fallback: boolean) => void;
}
export class Input {
  private keys = new Set<string>();
  private fire = false;
  private ads = false;
  private tap = false;
  private jump = false;
  private locked = false;
  private target: HTMLCanvasElement;
  private cb: Callbacks;
  private scope = new AbortController();
  constructor(canvas: HTMLCanvasElement, cb: Callbacks) {
    this.target = canvas;
    this.cb = cb;
    const s = { signal: this.scope.signal };
    document.addEventListener(
      'keydown',
      (e) => {
        if (!cb.active() || e.metaKey || e.altKey) return;
        if (
          [
            'Space',
            'ControlLeft',
            'ControlRight',
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
            'Tab',
          ].includes(e.code)
        )
          e.preventDefault();
        if (!e.repeat) {
          if (e.code === 'Escape' || e.code === 'KeyP') {
            cb.pause();
            return;
          }
          if (e.code === 'KeyR') cb.reload();
          if (/^Digit[1-9]$/.test(e.code)) cb.slot(Number(e.code.slice(5)) - 1);
          if (e.code === 'Space') this.jump = true;
        }
        this.keys.add(e.code);
      },
      s,
    );
    document.addEventListener('keyup', (e) => this.keys.delete(e.code), s);
    canvas.addEventListener(
      'mousedown',
      (e) => {
        if (!cb.active()) return;
        e.preventDefault();
        if (e.button === 0) {
          this.fire = true;
          this.tap = true;
        }
        if (e.button === 2) this.ads = true;
      },
      s,
    );
    document.addEventListener(
      'mouseup',
      (e) => {
        if (e.button === 0) this.fire = false;
        if (e.button === 2) this.ads = false;
      },
      s,
    );
    document.addEventListener(
      'mousemove',
      (e) => {
        if (cb.active() && (document.pointerLockElement === canvas || e.target === canvas))
          cb.look(e.movementX, e.movementY);
      },
      s,
    );
    canvas.addEventListener('contextmenu', (e) => e.preventDefault(), s);
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (cb.active()) {
          e.preventDefault();
          cb.cycle(Math.sign(e.deltaY));
        }
      },
      { ...s, passive: false },
    );
    document.addEventListener(
      'pointerlockchange',
      () => {
        const next = document.pointerLockElement === canvas,
          was = this.locked;
        this.locked = next;
        if (next) cb.lockState(false);
        else if (was && cb.active()) cb.pause();
      },
      s,
    );
    document.addEventListener(
      'pointerlockerror',
      () => {
        if (cb.active()) cb.lockState(true);
      },
      s,
    );
    window.addEventListener(
      'blur',
      () => {
        if (cb.active()) cb.pause();
      },
      s,
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden && cb.active()) cb.pause();
      },
      s,
    );
  }
  /** Должен вызываться прямо из обработчика кнопки. Старые браузеры возвращают void.
   * При отказе остаются относительные движения над canvas и поворот стрелками. */
  capture(): void {
    this.clear();
    this.target.focus({ preventScroll: true });
    try {
      if (!this.target.requestPointerLock) {
        this.cb.lockState(true);
        return;
      }
      const p = this.target.requestPointerLock();
      if (p && typeof p.catch === 'function')
        p.catch(() => {
          if (this.cb.active() && document.pointerLockElement !== this.target) this.cb.lockState(true);
        });
    } catch {
      this.cb.lockState(true);
    }
  }
  clear(): void {
    this.keys.clear();
    this.fire = this.ads = this.tap = this.jump = false;
  }
  release(): void {
    this.clear();
    if (document.pointerLockElement === this.target) document.exitPointerLock();
  }
  frame(): InputFrame {
    const has = (...k: string[]) => k.some((code) => this.keys.has(code));
    const input = {
      forward: +has('KeyW', 'ArrowUp') - +has('KeyS', 'ArrowDown'),
      side: +has('KeyD') - +has('KeyA'),
      turn: +has('ArrowRight') - +has('ArrowLeft'),
      sprint: has('ShiftLeft', 'ShiftRight'),
      crouch: has('KeyC', 'ControlLeft', 'ControlRight'),
      jump: this.jump,
      fire: this.fire,
      pressed: this.tap,
      ads: this.ads,
    };
    this.tap = this.jump = false;
    return input;
  }
  dispose(): void {
    this.release();
    this.scope.abort();
  }
}
