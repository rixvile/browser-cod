/**
 * Визуальный адаптер Three.js. Читает симуляцию, никогда не назначает урон
 * или очки. Представление оружия рисуется второй камерой после очистки глубины,
 * чтобы ближняя стена не отрезала модель. UI остаётся обычным DOM поверх canvas.
 */
import * as T from 'three';
import { BOT, WEAPONS } from '../config/gameplay.ts';
import type { Settings } from '../config/settings.ts';
import type { GameEvent, Simulation } from '../core/Simulation.ts';
import { robot, weapon } from './AssetManager.ts';
import { buildArena } from './arena.ts';
import { scenery } from './scenery.ts';
import { bakeModel, batchStatics } from './batching.ts';
export class ArenaView {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: T.WebGLRenderer;
  scene = new T.Scene();
  private camera = new T.PerspectiveCamera(54, 1, 0.08, 290);
  private nearScene = new T.Scene();
  private hands = new T.PerspectiveCamera(57, 1, 0.015, 8);
  private sun = new T.DirectionalLight('#ffdfaa', 2.55);
  private robots = Array.from({ length: BOT.count }, (_, i) => robot(i));
  private gear = WEAPONS.map((_, i) => weapon(i));
  private rig = new T.Group();
  private flash: T.Mesh;
  private traces: { mesh: T.Line; time: number }[] = [];
  private traceIndex = 0;
  private flashTime = 0;
  private kick = 0;
  private blend = 0;
  private clock = 0;
  private eyeY = NaN;
  private settings: Settings;
  private width = 0;
  private height = 0;
  private lastDraws = 0;
  constructor(host: HTMLElement, settings: Settings) {
    this.settings = settings;
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute('aria-label', 'Трёхмерная арена Кестрел');
    this.canvas.tabIndex = -1;
    host.appendChild(this.canvas);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.autoClear = false;
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.scene.fog = new T.FogExp2('#c8b99a', 0.0085);
    this.scene.add(new T.HemisphereLight('#d5e5e5', '#94816a', 1.72));
    this.sun.position.set(-29, 48, 17);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -43,
      right: 43,
      top: 43,
      bottom: -43,
      near: 1,
      far: 115,
    });
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.035;
    this.scene.add(this.sun);
    buildArena(this.scene);
    scenery(this.scene);
    batchStatics(this.scene);
    this.robots.forEach((r) => {
      r.legs.forEach(bakeModel);
      bakeModel(r.body);
      this.scene.add(r.root);
    });
    this.nearScene.add(new T.HemisphereLight('#f0e2c8', '#a2aaa0', 1.8));
    const key = new T.DirectionalLight('#fff0d6', 2.5);
    key.position.set(-2, 3, 1);
    this.nearScene.add(key, this.rig);
    this.gear.forEach((g) => {
      bakeModel(g.root);
      this.rig.add(g.root);
    });
    this.flash = new T.Mesh(
      new T.OctahedronGeometry(0.065, 0),
      new T.MeshBasicMaterial({ color: '#ffdb83', toneMapped: false }),
    );
    this.flash.visible = false;
    this.rig.add(this.flash);
    // Пул из десяти коротких трассеров избегает пересоздания буферов при каждом выстреле.
    for (let i = 0; i < 10; i++) {
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
      const line = new T.Line(
        geo,
        new T.LineBasicMaterial({
          color: '#ffc889',
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
        }),
      );
      line.visible = false;
      line.frustumCulled = false;
      this.scene.add(line);
      this.traces.push({ mesh: line, time: 0 });
    }
    this.apply(settings);
  }
  apply(s: Settings): void {
    this.settings = s;
    const ratio = Math.min(window.devicePixelRatio || 1, s.graphics === 'high' ? 1.5 : 0.85);
    if (this.renderer.getPixelRatio() !== ratio) this.renderer.setPixelRatio(ratio);
    const shadowChanged = this.renderer.shadowMap.enabled !== s.shadows;
    this.renderer.shadowMap.enabled = s.shadows;
    this.sun.castShadow = s.shadows;
    // Только смена режима теней меняет набор шейдеров. Ползунок FOV и
    // настройка трассеров не должны заново компилировать материалы всей карты.
    if (shadowChanged)
      this.scene.traverse((o) => {
        if (o instanceof T.Mesh) {
          const list = Array.isArray(o.material) ? o.material : [o.material];
          list.forEach((m) => {
            m.needsUpdate = true;
          });
        }
      });
    if (
      !this.width ||
      this.width !== this.canvas.clientWidth ||
      this.height !== this.canvas.clientHeight
    )
      this.resize();
  }
  private resize(): void {
    this.width = Math.max(1, this.canvas.parentElement?.clientWidth ?? innerWidth);
    this.height = Math.max(1, this.canvas.parentElement?.clientHeight ?? innerHeight);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.hands.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.hands.updateProjectionMatrix();
  }
  reset(): void {
    this.eyeY = NaN;
    this.kick = 0;
    this.flashTime = 0;
    this.blend = 0;
    for (const t of this.traces) {
      t.time = 0;
      t.mesh.visible = false;
    }
  }
  onEvent(e: GameEvent): void {
    if (e.type === 'spawn') {
      this.eyeY = NaN;
      return;
    }
    if (e.type !== 'shot' && e.type !== 'enemyShot') return;
    if (e.type === 'shot') {
      this.kick = 1;
      this.flashTime = 0.064;
    }
    if (this.settings.fx === 'low') return;
    const t = this.traces[this.traceIndex++ % this.traces.length],
      a = t.mesh.geometry.attributes.position;
    const origin =
      e.type === 'shot'
        ? {
            x: e.from.x + (e.to.x - e.from.x) * 0.07,
            y: e.from.y - 0.15 + (e.to.y - e.from.y) * 0.07,
            z: e.from.z + (e.to.z - e.from.z) * 0.07,
          }
        : e.from;
    a.setXYZ(0, origin.x, origin.y, origin.z);
    a.setXYZ(1, e.to.x, e.to.y, e.to.z);
    a.needsUpdate = true;
    t.time = 0.075;
    t.mesh.visible = true;
  }
  private showPlayer(sim: Simulation, dt: number) {
    const p = sim.player,
      eye = p.eye;
    this.camera.rotation.order = 'YXZ';
    const target = p.health > 0 ? eye.y : p.pos.y + 0.62;
    if (!Number.isFinite(this.eyeY)) this.eyeY = target;
    this.eyeY = T.MathUtils.damp(this.eyeY, target, 17, dt);
    const sway = p.moving && p.grounded ? Math.sin(p.bob) * 0.018 : 0;
    this.camera.position.set(eye.x, this.eyeY + sway, eye.z);
    this.camera.rotation.set(p.pitch + this.kick * 0.007, p.yaw, this.kick * 0.006, 'YXZ');
    this.blend = T.MathUtils.damp(this.blend, p.ads ? 1 : 0, 15, dt);
    const fov = this.settings.fov * (1 - this.blend * (1 - sim.armory.spec.zoom));
    this.setFov(fov, dt);
    const g = this.gear[sim.armory.slot];
    this.gear.forEach((o) => {
      o.root.visible = o === g;
    });
    const reload =
      sim.armory.reloadLeft > 0
        ? Math.sin((1 - sim.armory.reloadLeft / sim.armory.spec.reload) * Math.PI)
        : 0;
    this.rig.position.set(
      0.238 * (1 - this.blend) + sway * (1 - this.blend),
      -0.202 + 0.077 * this.blend - reload * 0.18 + Math.abs(sway) * 0.45,
      -0.69 + 0.21 * this.blend + this.kick * 0.05,
    );
    this.rig.rotation.set(this.kick * 0.055 - reload * 0.26, reload * 0.19, -reload * 0.41);
    this.flash.position.copy(g.muzzle.position);
    this.flash.scale.set(0.7, 0.74, sim.armory.spec.flash * (1 + this.kick));
    this.flash.rotation.z = this.clock * 75;
    this.flash.visible = this.flashTime > 0 && this.settings.fx === 'high';
  }
  private setFov(value: number, dt: number) {
    const next = T.MathUtils.damp(this.camera.fov, value, 18, dt);
    if (Math.abs(next - this.camera.fov) > 0.002) {
      this.camera.fov = next;
      this.camera.updateProjectionMatrix();
    }
  }
  /** Главное меню показывает ту же станцию с высокой обзорной точки. На паузе
   * камера сохраняет последнюю позицию игрока, свет и материалы обоих режимов общие. */
  render(sim: Simulation, menu: boolean, dt: number, active: boolean): void {
    if (this.width !== this.canvas.clientWidth || this.height !== this.canvas.clientHeight)
      this.resize();
    this.clock += dt;
    this.robots.forEach((r, i) => {
      const b = sim.bots.units[i];
      r.root.visible = b.state !== 'DEAD';
      r.root.position.set(b.pos.x, b.pos.y, b.pos.z);
      r.root.rotation.y = b.yaw;
      r.body.rotation.z = b.impact > 0 ? -0.1 : 0;
      r.legs.forEach((leg, j) => {
        leg.rotation.x =
          b.state === 'CHASE' || b.state === 'PATROL' ? Math.sin(b.phase + j * Math.PI) * 0.23 : 0;
      });
    });
    if (menu) {
      const a = Math.sin(this.clock * 0.055);
      this.camera.position.set(22.8 + a * 1.25, 10.7, 24.5 + a * 0.55);
      this.camera.lookAt(-5.3, 4.4, -9);
      this.setFov(48, dt);
    } else this.showPlayer(sim, active ? dt : 0);
    this.renderer.info.reset();
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    if (!menu && sim.player.health > 0) {
      this.renderer.clearDepth();
      this.renderer.render(this.nearScene, this.hands);
    }
    this.lastDraws = this.renderer.info.render.calls;
    if (active) {
      this.kick = Math.max(0, this.kick - dt * 9);
      this.flashTime = Math.max(0, this.flashTime - dt);
      for (const t of this.traces) {
        if (t.time > 0) {
          t.time -= dt;
          if (t.time <= 0) t.mesh.visible = false;
        }
      }
    }
  }
  get draws() {
    return this.lastDraws;
  }
  dispose(): void {
    const geometries = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>(),
      textures = new Set<T.Texture>();
    for (const scene of [this.scene, this.nearScene])
      scene.traverse((o) => {
        if (o instanceof T.Mesh || o instanceof T.Line) {
          geometries.add(o.geometry);
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            materials.add(m);
            if ('map' in m && m.map instanceof T.Texture) textures.add(m.map);
          }
        }
      });
    textures.forEach((x) => x.dispose());
    materials.forEach((x) => x.dispose());
    geometries.forEach((x) => x.dispose());
    this.renderer.dispose();
    this.canvas.remove();
  }
}
