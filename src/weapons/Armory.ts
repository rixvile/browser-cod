/**
 * Магазины, резерв, смена оружия и перезарядка. Симуляция передаёт сюда
 * игровое время. Поэтому пауза замораживает все таймеры, а UI только наблюдает.
 * Для нового ствола добавь конфигурацию в WEAPONS и модель в AssetManager.
 */
import { WEAPONS } from '../config/gameplay.ts';
export class Armory {
  slot = 0;
  magazines = WEAPONS.map((w) => w.magazine);
  reserves = WEAPONS.map((w) => w.reserve);
  cooldown = 0;
  reloadLeft = 0;
  get spec() {
    return WEAPONS[this.slot];
  }
  get ammo() {
    return this.magazines[this.slot];
  }
  get spare() {
    return this.reserves[this.slot];
  }
  /** Смена отменяет незавершённое пополнение. Патроны переводятся только в момент завершения. */
  equip(i: number): boolean {
    if (!Number.isInteger(i) || !WEAPONS[i] || i === this.slot) return false;
    this.slot = i;
    this.reloadLeft = 0;
    this.cooldown = 0.18;
    return true;
  }
  reload(): boolean {
    if (this.reloadLeft > 0 || this.ammo === this.spec.magazine || this.spare <= 0) return false;
    this.reloadLeft = this.spec.reload;
    return true;
  }
  /** Списывает ровно один патрон на спуск, включая выстрел дробовика. */
  fire(): boolean {
    if (this.cooldown > 0 || this.reloadLeft > 0 || this.ammo <= 0) return false;
    this.magazines[this.slot]--;
    this.cooldown = this.spec.interval;
    return true;
  }
  tick(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloadLeft <= 0) return;
    this.reloadLeft = Math.max(0, this.reloadLeft - dt);
    if (this.reloadLeft === 0) {
      const amount = Math.min(this.spec.magazine - this.ammo, this.spare);
      this.magazines[this.slot] += amount;
      this.reserves[this.slot] -= amount;
    }
  }
}
