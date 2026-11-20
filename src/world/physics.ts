/**
 * Бескадровая математика для коллизий, попаданий и зрения ботов.
 * Все координаты основания/высоты согласованы со схемой world/map.ts.
 * === PERFORMANCE SENSITIVE === Один короткий луч обходит небольшую статичную карту.
 */
import { BLOCKS, HALF, type Box, type Vec3 } from './map.ts';
import { PLAYER } from '../config/gameplay.ts';
const EPS = 0.001;
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.z - b.z);
export function direction(yaw: number, pitch: number): Vec3 {
  const level = Math.cos(pitch);
  return { x: -Math.sin(yaw) * level, y: Math.sin(pitch), z: -Math.cos(yaw) * level };
}
/** Круглый след игрока против прямоугольника. Скругление углов позволяет скользить вдоль стен. */
function overlaps(x: number, z: number, r: number, b: Box): boolean {
  const dx = Math.max(Math.abs(x - b.x) - b.w / 2, 0),
    dz = Math.max(Math.abs(z - b.z) - b.d / 2, 0);
  return dx * dx + dz * dz < r * r;
}
export function fits(p: Vec3, r: number, height: number): boolean {
  return BLOCKS.every(
    (b) => b.y >= p.y + height - EPS || b.y + b.h <= p.y + EPS || !overlaps(p.x, p.z, r, b),
  );
}
/** Самая высокая поверхность под ногами, достижимая с текущего уровня. */
export function floorAt(x: number, z: number, r: number, limit: number): number {
  let top = 0;
  for (const b of BLOCKS)
    if (b.y + b.h <= limit + EPS && b.y + b.h > top && overlaps(x, z, r, b)) top = b.y + b.h;
  return top;
}
/** Поочерёдно разрешаем движение по x и z. Небольшие ступени поднимают ноги,
 * а высокая стенка гасит только компоненту движения поперёк неё. */
export function slide(p: Vec3, dx: number, dz: number, r: number, height: number, step: number): void {
  for (const [axis, delta] of [
    ['x', dx],
    ['z', dz],
  ] as const) {
    if (!delta) continue;
    const trial = { ...p, [axis]: clamp(p[axis] + delta, -HALF + r, HALF - r) };
    trial.y = Math.max(p.y, floorAt(trial.x, trial.z, r, p.y + step));
    if (fits(trial, r, height)) Object.assign(p, trial);
  }
}
/** Вертикальное перемещение с проверкой потолка по пересечённому отрезку. */
export function vertical(
  p: Vec3,
  velocity: number,
  dt: number,
  r: number,
  h: number,
): { velocity: number; grounded: boolean } {
  const next = p.y + velocity * dt;
  if (velocity <= 0) {
    const support = floorAt(p.x, p.z, r, p.y + EPS);
    if (next <= support + EPS) {
      p.y = support;
      return { velocity: 0, grounded: true };
    }
  } else {
    let ceiling = Infinity;
    for (const b of BLOCKS)
      if (b.y >= p.y + h - EPS && overlaps(p.x, p.z, r, b)) ceiling = Math.min(ceiling, b.y);
    if (next + h > ceiling) {
      p.y = ceiling - h;
      return { velocity: 0, grounded: false };
    }
  }
  p.y = next;
  return { velocity, grounded: false };
}
/** Метод интервалов (slab). Возвращает расстояние до входа в AABB. Ветвь для
 * почти нулевой компоненты избегает деления на ноль при взгляде вдоль стены. */
export function rayBox(o: Vec3, v: Vec3, b: Box, maximum = 100): number {
  let near = 0,
    far = maximum;
  for (const [axis, lo, hi] of [
    ['x', b.x - b.w / 2, b.x + b.w / 2],
    ['y', b.y, b.y + b.h],
    ['z', b.z - b.d / 2, b.z + b.d / 2],
  ] as const) {
    if (Math.abs(v[axis]) < 1e-8) {
      if (o[axis] < lo || o[axis] > hi) return Infinity;
      continue;
    }
    const a = (lo - o[axis]) / v[axis],
      c = (hi - o[axis]) / v[axis];
    near = Math.max(near, Math.min(a, c));
    far = Math.min(far, Math.max(a, c));
    if (near > far) return Infinity;
  }
  return near;
}
export function wallDistance(o: Vec3, v: Vec3, maximum = 100): number {
  let hit = maximum;
  for (const b of BLOCKS) hit = Math.min(hit, rayBox(o, v, b, hit));
  if (v.y < 0) hit = Math.min(hit, -o.y / v.y);
  return hit;
}
/** Видимость измеряется между оптическими модулями. Укрытие блокирует игрока и бота одинаково. */
export function visible(a: Vec3, b: Vec3): boolean {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    dz = b.z - a.z,
    n = Math.hypot(dx, dy, dz);
  return n < EPS || wallDistance(a, { x: dx / n, y: dy / n, z: dz / n }, n) >= n - 0.025;
}
/** Навигационная сетка использует узлы только на земле; терраса имеет выделенный маршрут. */
export function walkableOnGround(x: number, z: number, r: number): boolean {
  return fits({ x, y: 0, z }, r, PLAYER.height);
}
