/**
 * Попадание по корпусу и сенсору дрона. Луч начинается у глаз игровой камеры.
 * Сначала ограничиваем дальность ближайшей стеной, потом ищем ближайшую цель.
 * Рендер получает конечную точку трассера независимо от попадания.
 */
import { wallDistance, rayBox } from '../world/physics.ts';
import type { Vec3 } from '../world/map.ts';
import type { BotUnit } from '../ai/Bots.ts';
export function trace(o: Vec3, v: Vec3, units: readonly BotUnit[]) {
  let t = wallDistance(o, v, 90),
    target: BotUnit | undefined,
    head = false;
  for (const b of units) {
    if (b.state === 'DEAD') continue;
    const base = { x: b.pos.x, z: b.pos.z };
    const body = rayBox(o, v, { ...base, y: b.pos.y + 0.09, w: 0.83, h: 1.28, d: 0.58 }, t);
    if (body < t) {
      t = body;
      target = b;
      head = false;
    }
    const optic = rayBox(o, v, { ...base, y: b.pos.y + 1.37, w: 0.56, h: 0.45, d: 0.53 }, t);
    if (optic < t) {
      t = optic;
      target = b;
      head = true;
    }
  }
  return { target, head, end: { x: o.x + v.x * t, y: o.y + v.y * t, z: o.z + v.z * t } };
}
