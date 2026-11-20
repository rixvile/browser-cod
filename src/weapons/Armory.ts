/** Запасы каждого слота и игровые таймеры. Все переходы идут на шагах симуляции. */
import { WEAPONS } from '../config/gameplay.ts';

const SINGLE_START = 0.22;
const SINGLE_FINISH = 0.18;
const TAP_WINDOW = 0.055;

export class Armory {
  slot = 0;
  magazines = WEAPONS.map((w) => w.magazine);
  reserves = WEAPONS.map((w) => w.reserve);
  private delays = WEAPONS.map(() => 0);
  get cooldown() {
    return this.delays[this.slot];
  }
  reloadLeft = 0;
  reloadDuration = 0;
  private nextTransfer = Infinity;
  private bufferedTap = false;
  get spec() {
    return WEAPONS[this.slot];
  }
  get ammo() {
    return this.magazines[this.slot];
  }
  get spare() {
    return this.reserves[this.slot];
  }
  get reloadProgress() {
    return this.reloadLeft > 0 ? 1 - this.reloadLeft / this.reloadDuration : 0;
  }
  clearTrigger() {
    this.bufferedTap = false;
  }
  equip(i: number): boolean {
    if (!Number.isInteger(i) || !WEAPONS[i] || i === this.slot) return false;
    this.slot = i;
    this.reloadLeft = 0;
    this.clearTrigger();
    this.delays[i] = Math.max(this.delays[i], 0.18);
    return true;
  }
  reload(): boolean {
    const count = Math.min(this.spec.magazine - this.ammo, this.spare);
    if (this.reloadLeft > 0 || count <= 0) return false;
    this.clearTrigger();
    if (this.spec.reloadStyle === 'single') {
      this.reloadDuration = SINGLE_START + count * this.spec.reload + SINGLE_FINISH;
      this.nextTransfer = SINGLE_START + this.spec.reload;
    } else {
      this.reloadDuration = this.spec.reload + (this.ammo === 0 ? 0.22 : 0);
      this.nextTransfer = this.spec.reload * 0.69;
    }
    this.reloadLeft = this.reloadDuration;
    return true;
  }
  /** Одно раннее нажатие учитывается только в самом конце задержки. Удержание не повторяет его. */
  wantsShot(pressed: boolean, held: boolean): boolean {
    if (this.reloadLeft > 0) {
      if (!pressed || this.spec.reloadStyle !== 'single' || !this.ammo) return false;
      this.reloadLeft = 0;
    }
    if (!this.spec.automatic && pressed && this.cooldown <= TAP_WINDOW) this.bufferedTap = true;
    if (this.cooldown > 0) return false;
    const requested = this.spec.automatic ? held || pressed : this.bufferedTap;
    this.clearTrigger();
    return requested;
  }
  fire(): boolean {
    if (this.cooldown > 0 || this.reloadLeft > 0 || this.ammo <= 0) return false;
    this.magazines[this.slot]--;
    this.delays[this.slot] = this.spec.interval;
    return true;
  }
  tick(dt: number, onLoad?: () => void): void {
    for (let i = 0; i < this.delays.length; i++) this.delays[i] = Math.max(0, this.delays[i] - dt);
    if (this.reloadLeft <= 0) return;
    this.reloadLeft = Math.max(0, this.reloadLeft - dt);
    const elapsed = this.reloadDuration - this.reloadLeft;
    // Большой шаг может пересечь несколько вставок. Уже зачисленное сохраняется при отмене.
    while (elapsed >= this.nextTransfer && this.spare > 0 && this.ammo < this.spec.magazine) {
      const single = this.spec.reloadStyle === 'single';
      const count = single ? 1 : Math.min(this.spec.magazine - this.ammo, this.spare);
      this.magazines[this.slot] += count;
      this.reserves[this.slot] -= count;
      this.nextTransfer = single ? this.nextTransfer + this.spec.reload : Infinity;
      onLoad?.();
    }
  }
}
