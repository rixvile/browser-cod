/**
 * Библиотека процедурных моделей. Вся геометрия локальна, внешние загрузки для
 * начала игры не нужны. Будущий GLB можно вернуть из robot() или weapon(),
 * сохранив оси, основание и габариты, на которые рассчитывает ArenaView.
 */
import * as T from 'three';
import { WEAPONS } from '../config/gameplay.ts';
const cube = new T.BoxGeometry(1, 1, 1);
const tube = new T.CylinderGeometry(1, 1, 1, 10);
const palette = new Map<string, T.MeshStandardMaterial>();
/** Материалы переиспользуются всеми ботами, оружием и архитектурными деталями. */
export function paint(color: string, glow = false) {
  const key = color + (glow ? '!' : '');
  if (!palette.has(key))
    palette.set(
      key,
      new T.MeshStandardMaterial({
        color,
        roughness: 0.8,
        metalness: 0.18,
        emissive: glow ? color : 0,
        emissiveIntensity: glow ? 1.4 : 0,
      }),
    );
  return palette.get(key)!;
}
export function part(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
  glow = false,
) {
  const m = new T.Mesh(cube, paint(color, glow));
  m.position.set(x, y, z);
  m.scale.set(w, h, d);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
/** Поворот цилиндра между концами одинаков для антенн, стрел и распорок. */
export function beam(parent: T.Object3D, a: T.Vector3, b: T.Vector3, r: number, color: string) {
  const axis = b.clone().sub(a),
    m = new T.Mesh(tube, paint(color));
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.scale.set(r, axis.length(), r);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), axis.normalize());
  m.castShadow = true;
  parent.add(m);
  return m;
}
export function robot(id: number) {
  const root = new T.Group(),
    body = new T.Group();
  root.add(body);
  const plate = ['#ab6544', '#738a83', '#a78b59', '#87766a'][id % 4],
    dark = '#283532',
    joint = '#414e49';
  const legs = [-0.21, 0.21].map((x) => {
    const hip = new T.Group();
    body.add(hip);
    hip.position.set(x, 0.76, 0);
    part(hip, 0, -0.17, 0, 0.24, 0.36, 0.25, dark);
    part(hip, 0, -0.4, 0.035, 0.23, 0.17, 0.27, plate);
    part(hip, 0, -0.54, -0.015, 0.17, 0.23, 0.18, joint);
    part(hip, 0, -0.68, 0.04, 0.27, 0.15, 0.36, dark);
    return hip;
  });
  part(body, 0, 0.78, 0, 0.59, 0.22, 0.38, joint);
  part(body, 0, 1.08, -0.01, 0.71, 0.49, 0.43, dark);
  part(body, 0, 1.14, 0.2, 0.63, 0.36, 0.12, plate);
  part(body, 0, 1.18, 0.274, 0.25, 0.055, 0.035, '#ffc980', true);
  part(body, 0, 1.41, 0, 0.19, 0.16, 0.18, joint);
  part(body, 0, 1.6, 0, 0.49, 0.34, 0.44, plate);
  part(body, 0, 1.61, 0.215, 0.41, 0.13, 0.06, dark);
  part(body, 0.02, 1.62, 0.251, 0.25, 0.045, 0.02, '#ffb36b', true);
  for (const x of [-0.43, 0.43]) {
    part(body, x, 1.2, 0, 0.26, 0.25, 0.34, plate);
    part(body, x, 1.02, 0.08, 0.17, 0.31, 0.22, dark);
  }
  part(body, 0.4, 1.02, 0.32, 0.16, 0.17, 0.47, joint);
  part(body, 0.4, 1.04, 0.57, 0.1, 0.1, 0.19, dark);
  return { root, body, legs };
}
/** Модель от первого лица смотрит вдоль -Z. Выход ствола нужен эффекту вспышки.
 * Все варианты имеют собственный силуэт, а баланс хранится в config/gameplay.ts. */
export function weapon(slot: number) {
  const g = new T.Group(),
    dark = '#252c2a',
    black = '#141b1a',
    metal = '#435553',
    trim = WEAPONS[slot].color;
  const pistol = slot === 1,
    shotgun = slot === 2,
    bodyLength = pistol ? 0.28 : 0.49;
  part(g, 0, 0, 0, 0.115, 0.115, bodyLength, metal);
  part(g, 0, 0.057, -0.01, 0.12, 0.065, bodyLength * 0.94, trim);
  // Контрастные панели и маркировка читаются от бедра и в приближении.
  part(g, 0, 0.093, -0.026, 0.086, 0.012, bodyLength * 0.76, '#303b37');
  part(g, 0, 0.101, 0.04, 0.076, 0.008, 0.038, '#b07d50');
  for (const side of [-1, 1]) {
    part(g, side * 0.059, 0.036, -0.066, 0.006, 0.033, 0.117, '#303c38');
    part(g, side * 0.063, 0.036, -0.039, 0.004, 0.009, 0.041, '#d39d65');
  }
  part(g, 0, -0.105, 0.056, 0.075, 0.19, 0.1, black).rotation.x = -0.19;
  const muzzleZ = pistol ? -0.235 : shotgun ? -0.66 : -0.69;
  const v = (x: number, y: number, z: number) => new T.Vector3(x, y, z);
  beam(g, v(0, 0.026, -bodyLength * 0.43), v(0, 0.026, muzzleZ), pistol ? 0.025 : 0.031, dark);
  beam(g, v(0, 0.026, muzzleZ + 0.046), v(0, 0.026, muzzleZ - 0.018), 0.039, black);
  if (!pistol) {
    part(g, 0, -0.011, 0.3, 0.094, 0.078, 0.26, dark);
    part(g, 0, -0.035, 0.436, 0.115, 0.16, 0.04, black);
    part(g, 0, -0.108, -0.07, 0.078, 0.18, 0.099, black).rotation.x = 0.2;
    part(g, 0, -0.004, -0.333, 0.12, 0.13, shotgun ? 0.24 : 0.27, trim);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++)
        part(g, side * 0.061, 0.016, -0.24 - i * 0.037, 0.008, 0.035, 0.023, '#293430');
    }
    for (let i = 0; i < 6; i++) part(g, 0, 0.066, -0.24 - i * 0.033, 0.116, 0.017, 0.012, black);
    if (shotgun) beam(g, v(0, -0.045, -0.23), v(0, -0.045, -0.6), 0.029, metal);
  }
  // Передняя мушка и открытая прорезь остаются читаемыми в ADS.
  part(g, 0, 0.098, 0.11, 0.092, 0.022, 0.038, metal);
  for (const x of [-0.033, 0.033]) part(g, x, 0.119, 0.11, 0.013, 0.028, 0.022, dark);
  part(g, 0, 0.068, muzzleZ + 0.06, 0.036, 0.087, 0.032, dark);
  part(g, 0, 0.116, muzzleZ + 0.06, 0.012, 0.023, 0.019, '#f1ae64');
  // Перчатки и рукава дают вид от первого лица без внешней модели персонажа.
  part(g, 0.034, -0.121, 0.098, 0.105, 0.112, 0.127, '#514f3e').rotation.x = -0.22;
  part(g, 0.085, -0.171, 0.21, 0.115, 0.13, 0.26, '#454e45').rotation.y = 0.18;
  if (!pistol) {
    part(g, -0.047, -0.077, -0.33, 0.115, 0.095, 0.134, '#514f3e');
    part(g, -0.112, -0.129, -0.229, 0.115, 0.106, 0.23, '#454e45').rotation.y = -0.3;
  }
  const muzzle = new T.Object3D();
  muzzle.position.set(0, 0.026, muzzleZ - 0.023);
  g.add(muzzle);
  return { root: g, muzzle };
}
