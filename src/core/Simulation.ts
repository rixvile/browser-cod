/**
 * Авторитетное состояние тренировки. Все таймеры измеряются игровым временем.
 * Внешний цикл передаёт шаг, нормализованный ввод и обработчик одноразовых событий.
 * === DO NOT MODIFY WITHOUT CHECKING DEPENDENCIES === Порядок смерти, очков и
 * смены раунда проверяется в tests/. Движку не нужны React, Three.js или localStorage.
 */
import { BOT, HEAD_FACTOR, RULES } from '../config/gameplay.ts';
import { Player, type InputFrame } from '../player/Player.ts';
import { Armory } from '../weapons/Armory.ts';
import { PLAYER_SPAWNS, type Vec3 } from '../world/map.ts';
import { clamp, direction, distance } from '../world/physics.ts';
import { Bots, botEye } from '../ai/Bots.ts';
import { Navigation } from '../ai/Navigation.ts';
import { trace } from '../combat/hitscan.ts';
export type GameEvent =
  | { type: 'shot'; slot: number; from: Vec3; to: Vec3 }
  | { type: 'enemyShot'; from: Vec3; to: Vec3 }
  | { type: 'hit' | 'kill' | 'hurt' | 'reload' | 'spawn' | 'death' | 'equip'; head?: boolean };
export type Emit = (e: GameEvent) => void;
export class Simulation {
  player: Player;
  armory = new Armory();
  bots: Bots;
  kills = 0;
  deaths = 0;
  score = 0;
  shots = 0;
  hits = 0;
  remaining: number = RULES.duration;
  ended = false;
  hitLeft = 0;
  hurtLeft = 0;
  killLeft = 0;
  lastHead = false;
  private random: () => number;
  private emit: Emit;
  constructor(nav: Navigation, emit: Emit = () => {}, random: () => number = Math.random) {
    this.random = random;
    this.emit = emit;
    this.player = new Player(PLAYER_SPAWNS[0]);
    this.player.shield = RULES.spawnShield;
    this.bots = new Bots(nav, random);
  }
  equip(i: number): void {
    if (this.player.health > 0 && this.armory.equip(i)) this.emit({ type: 'equip' });
  }
  reload(): void {
    if (this.player.health > 0 && this.armory.reload()) this.emit({ type: 'reload' });
  }
  private shoot(): void {
    if (!this.armory.fire()) return;
    const gun = this.armory.spec,
      p = this.player,
      o = p.eye;
    const spread = gun.spread * (p.ads ? gun.adsSpread : 1) * (p.sprinting ? 1.8 : 1);
    let landed = false;
    for (let i = 0; i < gun.pellets; i++) {
      const a = this.random() * Math.PI * 2,
        r = Math.sqrt(this.random()) * spread;
      const v = direction(p.yaw + Math.cos(a) * r, p.pitch + Math.sin(a) * r);
      const hit = trace(o, v, this.bots.units);
      if (i === 0) this.emit({ type: 'shot', slot: this.armory.slot, from: o, to: hit.end });
      if (!hit.target) continue;
      landed = true;
      this.hitLeft = 0.17;
      if (this.bots.damage(hit.target, Math.round(gun.damage * (hit.head ? HEAD_FACTOR : 1)))) {
        this.kills++;
        this.score += RULES.killPoints + (hit.head ? RULES.precisionBonus : 0);
        this.killLeft = 1.2;
        this.lastHead = hit.head;
        this.emit({ type: 'kill', head: hit.head });
      } else this.emit({ type: 'hit', head: hit.head });
    }
    this.shots++;
    if (landed) this.hits++;
    p.pitch = clamp(p.pitch + gun.recoil * (p.ads ? 0.66 : 1), -1.42, 1.42);
  }
  /** Все попадания ботов проходят здесь. Несколько выстрелов за один шаг
   * могут вызвать только одну смерть и только один запуск таймера возрождения. */
  hurt(amount: number): void {
    const p = this.player;
    if (this.ended || p.health <= 0 || p.shield > 0) return;
    p.health = Math.max(0, p.health - amount);
    this.hurtLeft = 0.33;
    this.emit({ type: 'hurt' });
    if (p.health === 0) {
      this.deaths++;
      p.respawnLeft = RULES.respawn;
      p.ads = false;
      this.emit({ type: 'death' });
    }
  }
  private respawn(): void {
    const live = this.bots.units.filter((b) => b.state !== 'DEAD');
    const nearest = (s: Vec3) => Math.min(...live.map((b) => distance(s, b.pos)), 100);
    const p = PLAYER_SPAWNS.reduce((a, b) => (nearest(b) > nearest(a) ? b : a));
    this.player = new Player(p, Math.atan2(p.x, p.z));
    this.player.shield = RULES.spawnShield;
    const slot = this.armory.slot;
    this.armory = new Armory();
    this.armory.slot = slot;
    this.emit({ type: 'spawn' });
  }
  /** Владелец шага — GameLoop. Симуляция сама завершает матч при цели или истечении времени. */
  step(dt: number, input: InputFrame): void {
    if (this.ended) return;
    this.remaining = Math.max(0, this.remaining - dt);
    this.hitLeft = Math.max(0, this.hitLeft - dt);
    this.hurtLeft = Math.max(0, this.hurtLeft - dt);
    this.killLeft = Math.max(0, this.killLeft - dt);
    if (this.player.health > 0) {
      this.player.step(input, dt);
      this.armory.tick(dt);
      if (input.pressed || (input.fire && this.armory.spec.automatic)) this.shoot();
    } else if ((this.player.respawnLeft -= dt) <= 0) this.respawn();
    if (this.kills >= RULES.goal || this.remaining <= 0) {
      this.ended = true;
      return;
    }
    this.bots.update(dt, this.player, (b, hit) => {
      const aim = this.player.eye;
      if (!hit) {
        aim.x += (this.random() - 0.5) * 2;
        aim.y += 0.8;
      }
      this.emit({ type: 'enemyShot', from: botEye(b), to: aim });
      if (hit) this.hurt(BOT.damage);
    });
  }
}
