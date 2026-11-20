/**
 * Дальний план и отличительный ориентир карты — параболическая антенна.
 * Статические детали создаются один раз. Фон, профили гор и все материалы
 * нарисованы программно. На правила видимости и навигацию они не влияют.
 */
import * as T from 'three';
import { beam, paint, part } from './AssetManager.ts';
const V = (x: number, y: number, z: number) => new T.Vector3(x, y, z);
export function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
/** Пустынное небо рисуется одной сферой. Высота определяет градиент, направление — мягкий солнечный диск. */
function sky(scene: T.Scene) {
  const material = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new T.Color('#667f84') },
      horizon: { value: new T.Color('#ead5ac') },
      sun: { value: V(-0.65, 0.21, -0.78).normalize() },
    },
    vertexShader:
      'varying vec3 dir; void main(){dir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec3 dir; uniform vec3 top; uniform vec3 horizon; uniform vec3 sun;
    void main(){vec3 v=normalize(dir);float blend=pow(clamp(v.y*1.52,0.,1.),0.67);float s=max(dot(v,sun),0.);
    vec3 c=mix(horizon,top,blend)+vec3(.44,.26,.10)*pow(s,14.)+vec3(1.,.72,.34)*smoothstep(.9988,.9995,s);
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`,
  });
  const m = new T.Mesh(new T.SphereGeometry(235, 36, 16), material);
  m.renderOrder = -5;
  scene.add(m);
}
/** Неровные треугольные грани дают нескольким хребтам собственный силуэт. */
function mountains(
  scene: T.Scene,
  radius: number,
  base: number,
  amplitude: number,
  color: string,
  seed: number,
) {
  const rng = seeded(seed),
    n = 112,
    p: T.Vector3[] = [],
    q: T.Vector3[] = [],
    cols: number[] = [],
    verts: number[] = [];
  const baseColor = new T.Color(color);
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n,
      h =
        base +
        amplitude *
          (0.46 +
            0.19 * Math.sin(5 * a + seed) +
            0.2 * Math.sin(11 * a + 0.5) +
            0.1 * Math.sin(19 * a) +
            rng() * 0.23);
    p.push(V(Math.cos(a) * radius, h, Math.sin(a) * radius));
    q.push(V(Math.cos(a) * (radius - 8 - rng() * 11), -2, Math.sin(a) * (radius - 8 - rng() * 11)));
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    for (const tri of [
      [p[i], q[i], p[j]],
      [q[i], q[j], p[j]],
    ]) {
      const col = baseColor.clone().multiplyScalar(0.81 + rng() * 0.3);
      for (const pt of tri) {
        verts.push(pt.x, pt.y, pt.z);
        cols.push(col.r, col.g, col.b);
      }
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
  scene.add(new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide })));
}
/** Радиальные панели настоящей параболы; сетка рёбер позволяет прочитать её масштаб издалека. */
function dish(scene: T.Scene, x: number, y: number, z: number, r: number, yaw: number) {
  const site = new T.Group();
  site.position.set(x, y, z);
  scene.add(site);
  const dark = '#444d46',
    rim = '#7a7966',
    supportH = r * 0.86;
  for (const side of [-1, 1]) {
    beam(site, V(side * r * 0.49, 0, -r * 0.23), V(0, supportH, r * 0.05), r * 0.047, dark);
    beam(site, V(side * r * 0.49, 0, r * 0.31), V(0, supportH, r * 0.05), r * 0.047, dark);
  }
  part(site, 0, 0.15, 0, r * 1.14, 0.3, r * 0.87, '#787868');
  const bowl = new T.Group();
  site.add(bowl);
  bowl.position.y = supportH;
  bowl.rotation.order = 'YXZ';
  bowl.rotation.y = yaw;
  bowl.rotation.x = -0.52;
  const count = 22,
    rings = 4,
    positions: number[] = [],
    colors: number[] = [];
  const point = (a: number, t: number) => V(Math.sin(a) * t * r, Math.cos(a) * t * r, t * t * r * 0.27);
  const panels = ['#c9c4a8', '#b9bca6', '#ddd3b1', '#bbbba1', '#d4cdb0'];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2,
      b = ((i + 1) / count) * Math.PI * 2,
      col = new T.Color(panels[(i * 3) % panels.length]);
    for (let j = 0; j < rings; j++) {
      const lo = j / rings,
        hi = (j + 1) / rings;
      for (const p of [
        point(a, lo),
        point(a, hi),
        point(b, hi),
        point(a, lo),
        point(b, hi),
        point(b, lo),
      ]) {
        positions.push(p.x, p.y, p.z);
        colors.push(col.r, col.g, col.b);
      }
    }
    beam(bowl, point(a, 1), point(b, 1), r * 0.012, rim);
    if (i % 2 === 0) {
      beam(bowl, point(a, 0.2), point(a, 1), r * 0.009, '#8a8b77');
    }
    if (i % 7 === 0) beam(bowl, point(a, 0.91), V(0, 0, r * 0.76), r * 0.014, dark);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const surface = new T.Mesh(
    geo,
    new T.MeshStandardMaterial({
      vertexColors: true,
      side: T.DoubleSide,
      roughness: 0.91,
      metalness: 0.14,
    }),
  );
  surface.castShadow = true;
  bowl.add(surface);
  beam(bowl, V(0, 0, r * 0.65), V(0, 0, r * 0.83), r * 0.066, '#645f50');
}
function tower(scene: T.Scene, x: number, z: number, h: number) {
  const group = new T.Group();
  scene.add(group);
  group.position.set(x, 0, z);
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (let t = 0; t < 6; t++) {
    const a = (t / 6) * h,
      b = ((t + 1) / 6) * h,
      w = 1.65 * (1 - t / 7),
      n = 1.65 * (1 - (t + 1) / 7);
    for (let i = 0; i < 4; i++) {
      const c = corners[i],
        d = corners[(i + 1) % 4],
        color = t % 2 ? '#b3694b' : '#525a50';
      beam(group, V(c[0] * w, a, c[1] * w), V(c[0] * n, b, c[1] * n), 0.095, color);
      beam(group, V(c[0] * w, a, c[1] * w), V(d[0] * n, b, d[1] * n), 0.048, color);
      beam(group, V(c[0] * w, a, c[1] * w), V(d[0] * w, a, d[1] * w), 0.052, color);
    }
  }
  beam(group, V(0, h, 0), V(0, h + 2.7, 0), 0.09, '#444a41');
  part(group, 0, h + 2.8, 0, 0.17, 0.25, 0.17, '#ff683d', true);
}
export function scenery(scene: T.Scene) {
  sky(scene);
  mountains(scene, 146, 4, 36, '#9b9f91', 11);
  mountains(scene, 102, 0, 21, '#a49d83', 7);
  mountains(scene, 77, -3, 14, '#968c70', 83);
  dish(scene, 0.2, 7.95, -22.3, 5.25, 0.43);
  dish(scene, 37, 2, -32, 3.8, -0.4);
  tower(scene, -19, -31.2, 15);
  tower(scene, 36, 8, 11);
  const poles = [
    [-26, -19],
    [-26, 0],
    [-26, 20],
  ];
  poles.forEach(([x, z]) => {
    part(scene, x, 4.4, z, 0.18, 8.8, 0.18, '#575744');
    part(scene, x, 8.35, z, 2.25, 0.13, 0.13, '#595441');
  });
  for (let k = 0; k < 2; k++)
    for (const offset of [-0.78, 0.78]) {
      const [xa, za] = poles[k],
        [xb, zb] = poles[k + 1];
      const c = new T.QuadraticBezierCurve3(
        V(xa + offset, 8.4, za),
        V((xa + xb) / 2 + offset, 6.35, (za + zb) / 2),
        V(xb + offset, 8.4, zb),
      );
      scene.add(
        new T.Line(
          new T.BufferGeometry().setFromPoints(c.getPoints(12)),
          new T.LineBasicMaterial({ color: '#3e4239' }),
        ),
      );
    }
}
