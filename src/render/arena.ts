/**
 * Преобразует данные карты в статические партии коробок. Сотни рёбер
 * контейнеров, перекрытий и дорожных меток рисуются несколькими InstancedMesh.
 * Промышленные надписи — собственные CanvasTexture; их можно заменить атласом.
 */
import * as T from 'three';
import { BLOCKS, type Surface } from '../world/map.ts';
import { seeded } from './scenery.ts';
const COLORS: Record<Surface, string> = {
  cement: '#9b9a85',
  sand: '#b6aa89',
  rust: '#ae6846',
  teal: '#657e76',
  charcoal: '#414d47',
};
type BoxInstance = [number, number, number, number, number, number, string];
/** Повторяющийся мелкий песок даёт масштаб при движении. Шум фиксирован при каждом запуске. */
function groundMap() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!,
    im = ctx.createImageData(256, 256),
    rng = seeded(181);
  for (let i = 0; i < im.data.length; i += 4) {
    const n = 198 + Math.floor(rng() * 32);
    im.data[i] = n + 5;
    im.data[i + 1] = n;
    im.data[i + 2] = n - 11;
    im.data[i + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  for (let i = 0; i < 225; i++) {
    ctx.fillStyle = i % 3 ? '#a6997d' : '#d9cdb5';
    const x = rng() * 256,
      y = rng() * 256;
    ctx.fillRect(x, y, 1 + rng() * 3, 1);
  }
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(28, 28);
  tex.anisotropy = 4;
  return tex;
}
function sign(
  scene: T.Scene,
  txt: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  color: string,
  background: string,
  rot = 0,
) {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 192;
  const a = c.getContext('2d')!;
  a.fillStyle = background;
  a.fillRect(0, 0, c.width, c.height);
  a.fillStyle = color;
  a.textAlign = 'center';
  a.textBaseline = 'middle';
  a.font = 'bold 128px Arial';
  a.translate(384, 100);
  a.scale(670 / Math.max(1, a.measureText(txt).width), 1);
  a.fillText(txt, 0, 0);
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 4;
  const m = new T.Mesh(
    new T.PlaneGeometry(w, h),
    new T.MeshStandardMaterial({ map, roughness: 0.95, side: T.DoubleSide }),
  );
  m.position.set(x, y, z);
  m.rotation.y = rot;
  scene.add(m);
}
export function buildArena(scene: T.Scene) {
  const ground = new T.Mesh(
    new T.PlaneGeometry(330, 330),
    new T.MeshStandardMaterial({ color: '#b8a588', map: groundMap(), roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const items: BoxInstance[] = [];
  const add = (...box: BoxInstance) => items.push(box);
  for (const b of BLOCKS) {
    const c = COLORS[b.surface],
      top = b.y + b.h,
      front = b.z + b.d / 2;
    add(b.x, b.y + b.h / 2, b.z, b.w, b.h, b.d, c);
    if (b.kind === 'container') {
      for (let x = -b.w / 2 + 0.24; x < b.w / 2; x += 0.4)
        for (const side of [-1, 1])
          add(b.x + x, b.y + b.h / 2, b.z + side * (b.d / 2 + 0.018), 0.065, b.h - 0.18, 0.065, c);
      for (const y of [0.12, b.h - 0.13])
        add(b.x, b.y + y, b.z, b.w + 0.11, 0.12, b.d + 0.11, '#575a4d');
      for (const side of [-1, 1])
        for (const end of [-1, 1])
          add(
            b.x + side * (b.w / 2 - 0.07),
            b.y + b.h / 2,
            b.z + end * (b.d / 2 + 0.025),
            0.13,
            b.h,
            0.12,
            '#666957',
          );
      sign(
        scene,
        b.surface === 'rust' ? 'RS / 017' : 'RS / 042',
        b.x + b.w * 0.21,
        b.y + b.h * 0.71,
        front + 0.066,
        1.8,
        0.45,
        '#e0d1ad',
        c,
      );
    }
    if (b.kind === 'crate') {
      for (const f of [-0.34, 0.34])
        add(b.x + b.w * f, b.y + b.h / 2, b.z, 0.11, b.h + 0.045, b.d + 0.05, '#4e5850');
      add(b.x, b.y + 0.15, b.z, b.w + 0.03, 0.15, b.d + 0.04, '#545a4e');
    }
    if (b.kind === 'barrier') {
      add(b.x, top - 0.24, b.z, b.w + 0.035, 0.21, b.d + 0.035, '#d99b55');
    }
    if (b.kind === 'wall' && (b.w > 6 || b.d > 6)) {
      add(b.x, top - 0.17, b.z, b.w + 0.1, 0.14, b.d + 0.1, '#74786a');
    }
  }
  // Фасад диспетчерской и слоистая кромка плиты создают узнаваемую линию горизонта.
  add(0, 7.39, -18.48, 17.3, 0.19, 0.18, '#b76740');
  // Технологические шкафы и воздухозаборники помогают различать крылья
  // диспетчерской с дальней стороны арены. Все детали утоплены в стены.
  add(5.8, 2.45, -18.62, 3.9, 2.65, 0.12, '#5d6b60');
  for (let i = 0; i < 8; i++) add(5.8, 1.48 + i * 0.265, -18.52, 3.52, 0.095, 0.14, '#808471');
  for (const x of [-7.75, -7.42]) add(x, 3.55, -18.54, 0.135, 6.6, 0.18, '#8f684c');
  for (const x of [-6.9, -4.8, 4.8, 6.9]) {
    add(x, 6.56, -18.56, 0.74, 0.18, 0.26, '#565f52');
    add(x, 6.53, -18.4, 0.46, 0.075, 0.05, '#e5b279');
  }
  for (let z = -9; z < 1; z += 2.1) {
    add(-11.38, 1.3, z, 0.14, 2.1, 0.14, '#676e61');
    add(-11.31, 1.7, z, 0.1, 0.27, 0.25, '#b67f54');
  }
  for (const x of [-5.8, 5.8]) {
    add(x, 5.42, -18.66, 4.94, 1.65, 0.14, '#3f514f');
    for (let i = -2; i <= 2; i++) add(x + i * 0.93, 5.42, -18.56, 0.075, 1.65, 0.1, '#888977');
    add(x, 4.52, -18.47, 5.13, 0.14, 0.53, '#646b5b');
  }
  sign(scene, 'K E S T R E L', 0, 7.59, -18.47, 5.7, 0.55, '#f3dbb7', '#6a6b59');
  sign(scene, '01', -5.8, 2.1, -18.59, 2.2, 1.65, '#ded1ad', '#8c8e7c');
  sign(scene, 'STATION   /   B', 18, 1.47, -1.47, 3.6, 0.65, '#d8cba8', '#6c776a');
  for (let i = 0; i < 7; i++) add(-23 + i * 1.5, 4.65, -11.55, 0.91, 0.39, 0.09, '#4b5952');
  for (let z = -11; z < 3; z += 2.4) add(-11.38, 4.6, z, 0.11, 0.18, 1.25, '#d09a67');
  // Путевая разметка и швы умышленно не входят в физику.
  for (const x of [-11, 11])
    for (let z = -18; z < 26; z += 3.8) add(x, 0.014, z, 0.1, 0.018, 2.0, '#d5c29e');
  for (const z of [-18, 18])
    for (let x = -22; x < 23; x += 4) add(x, 0.013, z, 2.0, 0.017, 0.11, '#d5c29e');
  for (let i = 0; i < 9; i++) add(-2.2 + i * 0.55, 0.025, 23.5, 0.26, 0.022, 0.72, '#b38b51');
  for (const b of BLOCKS.filter((b) => b.kind === 'step'))
    add(b.x, b.h + 0.008, b.z + b.d / 2 - 0.06, b.w - 0.05, 0.016, 0.085, '#dbbb82');
  const geo = new T.BoxGeometry(1, 1, 1),
    mat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.91, metalness: 0.08 });
  const mesh = new T.InstancedMesh(geo, mat, items.length),
    dummy = new T.Object3D();
  items.forEach(([x, y, z, w, h, d, c], i) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, new T.Color(c));
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}
