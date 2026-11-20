/**
 * Связывает симуляцию, ввод, Three.js и звук на одной временной шкале.
 * Выдаёт UI неизменяемые снимки по событиям и при изменении видимых значений.
 * === PERFORMANCE SENSITIVE === Симуляция работает с фиксированным dt. Отрисовка и DOM
 * имеют собственный темп. На паузе скрытая вкладка не накапливает игровое время.
 */
import { Simulation, type GameEvent } from './Simulation.ts';
import { type GameClient, type GameUIState, type GameActions, type Mode } from './contract.ts';
import { Navigation } from '../ai/Navigation.ts';
import { loadSettings, saveSettings, validateSettings, type Settings } from '../config/settings.ts';
import { PLAYER, RULES, WEAPONS } from '../config/gameplay.ts';
import { ArenaView } from '../render/ArenaView.ts';
import { AudioManager } from '../audio/AudioManager.ts';
import { Input } from '../player/Input.ts';
const STEP = 1 / 60;
export class Game implements GameClient {
  private mode: Mode = 'menu';
  private settings = loadSettings();
  private readonly nav = new Navigation();
  private sim = new Simulation(this.nav, (e) => this.event(e));
  private sound = new AudioManager(this.settings);
  private view?: ArenaView;
  private input?: Input;
  private error = '';
  private fallback = false;
  private listeners = new Set<() => void>();
  private snapshot: GameUIState;
  private raf = 0;
  private last = 0;
  private accumulated = 0;
  private hudClock = 0;
  private fps = 0;
  private frameMs = 0;
  private samples = 0;
  private duration = 0;
  constructor(host: HTMLElement) {
    try {
      this.view = new ArenaView(host, this.settings);
      this.input = new Input(this.view.canvas, {
        active: () => this.mode === 'playing',
        look: (x, y) => {
          if (this.sim.player.health > 0) this.sim.player.look(x, y, this.settings.sensitivity);
        },
        pause: () => this.pause(),
        reload: () => this.sim.reload(),
        slot: (i) => this.sim.equip(i),
        cycle: (d) => this.sim.equip((this.sim.armory.slot + d + WEAPONS.length) % WEAPONS.length),
        lockState: (f) => {
          this.fallback = f;
          this.publish();
        },
      });
      this.view.canvas.addEventListener('webglcontextlost', this.lost);
      this.view.canvas.addEventListener('webglcontextrestored', this.restored);
    } catch (e) {
      this.error =
        'Для полигона нужен WebGL 2. Включи аппаратное ускорение в браузере и обнови страницу.';
      console.error('Relay Shift: инициализация графики', e);
    }
    this.snapshot = this.read();
    if (this.view) this.raf = requestAnimationFrame(this.frame);
  }
  private lost = (e: Event) => {
    e.preventDefault();
    this.pause();
    this.error = 'Графический контекст потерян. Ожидание восстановления…';
    this.publish();
  };
  private restored = () => {
    this.error = '';
    this.view?.apply(this.settings);
    this.publish();
  };
  private event(e: GameEvent) {
    this.view?.onEvent(e);
    this.sound.onEvent(e);
  }
  private start() {
    if (!this.view || this.error) return;
    this.sim = new Simulation(this.nav, (e) => this.event(e));
    this.view.reset();
    this.enter();
  }
  private enter() {
    this.mode = 'playing';
    this.last = performance.now();
    this.accumulated = 0;
    this.fallback = false;
    this.sound.unlock();
    this.sound.setPlaying(true);
    this.input?.capture();
    this.publish();
  }
  private pause() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.input?.release();
    this.sound.setPlaying(false);
    this.accumulated = 0;
    this.publish();
  }
  private menu() {
    this.mode = 'menu';
    this.input?.release();
    this.sound.setPlaying(false);
    this.view?.reset();
    this.sim = new Simulation(this.nav, (e) => this.event(e));
    this.publish();
  }
  private update<K extends keyof Settings>(key: K, value: Settings[K]) {
    const next = validateSettings({ ...this.settings, [key]: value });
    this.settings = next;
    saveSettings(next);
    if (key === 'graphics' || key === 'shadows' || key === 'fx' || key === 'fov') this.view?.apply(next);
    this.sound.apply(next);
    this.publish();
  }
  actions: GameActions = {
    start: () => this.start(),
    restart: () => this.start(),
    resume: () => {
      if (this.mode === 'paused' && !this.error) this.enter();
    },
    pause: () => this.pause(),
    mainMenu: () => this.menu(),
    capture: () => {
      if (this.mode === 'playing') this.input?.capture();
    },
    reload: () => {
      if (this.mode === 'playing') this.sim.reload();
    },
    changeWeapon: (i) => {
      if (this.mode === 'playing') this.sim.equip(i);
    },
    updateSetting: (k, v) => this.update(k, v),
  };
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getSnapshot = () => this.snapshot;
  private read(): GameUIState {
    const s = this.sim,
      p = s.player,
      a = s.armory,
      debug = this.settings.debug;
    return {
      mode: this.mode,
      ready: !!this.view && !this.error,
      error: this.error,
      fallback: this.fallback,
      settings: this.settings,
      health: p.health,
      maxHealth: PLAYER.health,
      weapon: a.spec.name,
      weaponKind: a.spec.kind,
      slot: a.slot,
      ammo: a.ammo,
      magazine: a.spec.magazine,
      weaponCount: WEAPONS.length,
      reserve: a.spare,
      reloading: a.reloadLeft > 0,
      reloadProgress: a.reloadLeft ? Math.round((1 - a.reloadLeft / a.spec.reload) * 20) * 5 : 0,
      ads: p.ads,
      sprinting: p.sprinting,
      hit: s.hitLeft > 0,
      hurt: s.hurtLeft > 0,
      killMessage: s.killLeft > 0 ? (s.lastHead ? 'Точное попадание' : 'Цель отключена') : '',
      kills: s.kills,
      deaths: s.deaths,
      score: s.score,
      goal: RULES.goal,
      limitSeconds: RULES.duration,
      seconds: Math.ceil(s.remaining),
      respawn: Math.max(0, Math.ceil(p.respawnLeft)),
      shield: p.shield > 0,
      accuracy: s.shots ? Math.round((100 * s.hits) / s.shots) : 0,
      fps: debug ? this.fps : 0,
      frameMs: debug ? this.frameMs : 0,
      draws: debug ? (this.view?.draws ?? 0) : 0,
      enemies: s.bots.units.filter((b) => b.state !== 'DEAD').length,
    };
  }
  /** Стабильная ссылка на snapshot нужна useSyncExternalStore. Чистый рендер
   * сцены без изменения цифр не порождает дерево React на каждом кадре. */
  private publish(): void {
    const next = this.read();
    if (
      this.snapshot &&
      (Object.keys(next) as (keyof GameUIState)[]).every((k) => next[k] === this.snapshot[k])
    )
      return;
    this.snapshot = next;
    this.listeners.forEach((fn) => fn());
  }
  private frame = (now: number) => {
    const elapsed = this.last ? Math.max(0, (now - this.last) / 1000) : STEP;
    this.last = now;
    const dt = Math.min(0.1, elapsed);
    if (this.mode === 'playing' && this.input) {
      this.accumulated += dt;
      while (this.accumulated >= STEP) {
        this.sim.step(STEP, this.input.frame());
        this.accumulated -= STEP;
        if (this.sim.ended) {
          this.mode = 'results';
          this.input.release();
          this.sound.setPlaying(false);
          this.accumulated = 0;
          this.publish();
          break;
        }
      }
    }
    if (!this.error) this.view?.render(this.sim, this.mode === 'menu', dt, this.mode === 'playing');
    this.duration += elapsed;
    this.samples++;
    if (this.duration >= 0.5) {
      this.fps = Math.round(this.samples / this.duration);
      this.frameMs = Math.round((this.duration * 10000) / this.samples) / 10;
      this.duration = 0;
      this.samples = 0;
    }
    this.hudClock += dt;
    if (this.hudClock >= 0.05) {
      this.hudClock = 0;
      if (this.mode === 'playing' || this.settings.debug) this.publish();
    }
    this.raf = requestAnimationFrame(this.frame);
  };
  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.mode = 'menu';
    this.input?.dispose();
    this.sound.dispose();
    this.view?.canvas.removeEventListener('webglcontextlost', this.lost);
    this.view?.canvas.removeEventListener('webglcontextrestored', this.restored);
    this.view?.dispose();
    this.listeners.clear();
  }
}
