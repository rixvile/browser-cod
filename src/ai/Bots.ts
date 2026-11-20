/**
 * Пять состояний дрона. Решение о поведении принимается несколько раз в секунду,
 * движение и готовность оружия обновляются каждым шагом. Рендер только читает корпус.
 */
import { BOT, PLAYER } from '../config/gameplay.ts';
import { BOT_SPAWNS, PATROL, type Vec3 } from '../world/map.ts';
import { distance, floorAt, slide, visible } from '../world/physics.ts';
import type { Player } from '../player/Player.ts';
import { Navigation } from './Navigation.ts';
export type BotState = 'IDLE' | 'PATROL' | 'CHASE' | 'ATTACK' | 'DEAD';
export interface BotUnit {
  id: number;
  pos: Vec3;
  yaw: number;
  hp: number;
  state: BotState;
  wait: number;
  think: number;
  shot: number;
  track: Vec3[];
  goal: Vec3;
  memory: number;
  impact: number;
  phase: number;
}
export const botEye = (b: BotUnit): Vec3 => ({ x: b.pos.x, y: b.pos.y + 1.57, z: b.pos.z });
function fresh(id: number, p: Vec3): BotUnit {
  return {
    id,
    pos: { ...p },
    yaw: 0,
    hp: BOT.health,
    state: 'IDLE',
    wait: 0.65 + id * 0.25,
    think: 0,
    shot: 1 + id * 0.34,
    track: [],
    goal: { ...p },
    memory: 0,
    impact: 0,
    phase: id * 1.7,
  };
}
export class Bots {
  units: BotUnit[];
  nav: Navigation;
  random: () => number;
  constructor(nav: Navigation, random: () => number) {
    this.nav = nav;
    this.random = random;
    this.units = Array.from({ length: BOT.count }, (_, i) => fresh(i, BOT_SPAWNS[i]));
  }
  /** Возрождение выбирает свободную точку на удалении, чтобы бот не возникал рядом с игроком. */
  private respawn(b: BotUnit, player: Player): void {
    const far = BOT_SPAWNS.filter(
      (p) =>
        distance(p, player.pos) > 12 &&
        this.units.every((o) => o === b || o.state === 'DEAD' || distance(o.pos, p) > 2),
    );
    const pool = far.length ? far : BOT_SPAWNS;
    Object.assign(b, fresh(b.id, pool[Math.floor(this.random() * pool.length)]));
  }
  /** Зрение обновляет последнюю известную позицию. Потеря видимости ведёт к
   * краткому преследованию, затем бот возвращается к маршруту патруля. */
  private decide(b: BotUnit, p: Player): void {
    const d = distance(b.pos, p.pos);
    const sees = p.health > 0 && d <= BOT.sight && visible(botEye(b), p.eye);
    if (sees) {
      b.memory = 2.5;
      b.goal = { ...p.pos };
    }
    if (sees && d <= BOT.attackRange) {
      b.state = 'ATTACK';
      b.track = [];
      return;
    }
    if (b.memory > 0 && p.health > 0) {
      b.state = 'CHASE';
      b.track = this.nav.path(b.pos, b.goal);
      return;
    }
    if (b.state !== 'PATROL' || !b.track.length) {
      b.state = 'PATROL';
      b.goal = PATROL[Math.floor(this.random() * PATROL.length)];
      b.track = this.nav.path(b.pos, b.goal);
    }
  }
  update(dt: number, p: Player, fire: (b: BotUnit, hit: boolean) => void): void {
    for (const b of this.units) {
      b.impact = Math.max(0, b.impact - dt);
      if (b.state === 'DEAD') {
        b.wait -= dt;
        if (b.wait <= 0) this.respawn(b, p);
        continue;
      }
      if (b.state === 'IDLE' && (b.wait -= dt) > 0) continue;
      b.memory = Math.max(0, b.memory - dt);
      b.shot -= dt;
      b.think -= dt;
      if (b.think <= 0) {
        this.decide(b, p);
        b.think = BOT.think + this.random() * 0.16;
      }
      if (b.state === 'ATTACK') {
        b.yaw = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
        if (b.shot <= 0 && p.health > 0 && visible(botEye(b), p.eye)) {
          b.shot = BOT.fireDelay * (0.85 + this.random() * 0.55);
          const chance = Math.max(
            0.35,
            0.87 - distance(b.pos, p.pos) * 0.016 - (p.sprinting ? 0.12 : 0),
          );
          fire(b, this.random() < chance);
        }
      } else {
        const target = b.track[0];
        if (!target) continue;
        const dx = target.x - b.pos.x,
          dz = target.z - b.pos.z,
          n = Math.hypot(dx, dz);
        if (n < 0.3) {
          b.track.shift();
          continue;
        }
        b.yaw = Math.atan2(dx, dz);
        const stride = Math.min(n, BOT.speed * dt * (b.state === 'CHASE' ? 1 : 0.69));
        slide(b.pos, (dx / n) * stride, (dz / n) * stride, BOT.radius, BOT.height, PLAYER.step);
        b.pos.y = floorAt(b.pos.x, b.pos.z, BOT.radius, b.pos.y + PLAYER.step);
        b.phase += stride * 3;
      }
    }
  }
  /** Маркирует смерть единожды. За начисление очков отвечает Simulation. */
  damage(b: BotUnit, n: number): boolean {
    if (b.state === 'DEAD') return false;
    b.hp = Math.max(0, b.hp - n);
    b.impact = 0.12;
    if (b.hp > 0) return false;
    b.state = 'DEAD';
    b.wait = BOT.respawn;
    b.track = [];
    return true;
  }
}
