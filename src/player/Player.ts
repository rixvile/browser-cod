/**
 * Тело игрока и управление взглядом. Ввод приходит численно, поэтому движение
 * работает без браузера в тестах. Камера позже читает высоту глаз и углы.
 */
import { PLAYER } from '../config/gameplay.ts';
import { clamp, fits, slide, vertical } from '../world/physics.ts';
import type { Vec3 } from '../world/map.ts';
export interface InputFrame {
  forward: number;
  side: number;
  sprint: boolean;
  crouch: boolean;
  jump: boolean;
  fire: boolean;
  pressed: boolean;
  ads: boolean;
  turn: number;
}
export const NEUTRAL: InputFrame = {
  forward: 0,
  side: 0,
  sprint: false,
  crouch: false,
  jump: false,
  fire: false,
  pressed: false,
  ads: false,
  turn: 0,
};
export class Player {
  pos: Vec3;
  yaw: number;
  pitch = 0;
  vy = 0;
  grounded = true;
  crouched = false;
  moving = false;
  sprinting = false;
  ads = false;
  bob = 0;
  health: number = PLAYER.health;
  shield = 0;
  respawnLeft = 0;
  constructor(spawn: Vec3, yaw = 0) {
    this.pos = { ...spawn };
    this.yaw = yaw;
  }
  get height() {
    return this.crouched ? PLAYER.crouchHeight : PLAYER.height;
  }
  get eye(): Vec3 {
    return { x: this.pos.x, y: this.pos.y + this.height - 0.17, z: this.pos.z };
  }
  look(dx: number, dy: number, sensitivity: number): void {
    const factor = PLAYER.lookRate * sensitivity * (this.ads ? 0.65 : 1);
    this.yaw -= dx * factor;
    this.pitch = clamp(this.pitch - dy * factor, -1.42, 1.42);
  }
  /** Нормализация диагонали сохраняет скорость. Сидящий игрок может встать,
   * только если для полного коллайдера достаточно свободного пространства. */
  step(input: InputFrame, dt: number): void {
    this.crouched = input.crouch || (this.crouched && !fits(this.pos, PLAYER.radius, PLAYER.height));
    this.ads = input.ads;
    this.sprinting = input.sprint && input.forward > 0 && !this.crouched && !this.ads;
    this.yaw -= input.turn * dt * 1.65;
    const speed = this.crouched ? PLAYER.crouch : this.sprinting ? PLAYER.sprint : PLAYER.walk;
    const n = Math.max(1, Math.hypot(input.forward, input.side)),
      f = input.forward / n,
      s = input.side / n;
    const co = Math.cos(this.yaw),
      si = Math.sin(this.yaw);
    this.moving = Boolean(f || s);
    if (this.moving) this.bob += dt * speed * 1.65;
    slide(
      this.pos,
      (-si * f + co * s) * dt * speed,
      (-co * f - si * s) * dt * speed,
      PLAYER.radius,
      this.height,
      this.grounded ? PLAYER.step : 0,
    );
    if (input.jump && this.grounded && !this.crouched) {
      this.vy = PLAYER.jump;
      this.grounded = false;
    }
    const moved = vertical(this.pos, this.vy - PLAYER.gravity * dt, dt, PLAYER.radius, this.height);
    this.vy = moved.velocity;
    this.grounded = moved.grounded;
    this.shield = Math.max(0, this.shield - dt);
  }
}
