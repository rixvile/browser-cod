/**
 * Собственные короткие сигналы Web Audio. Контекст создаётся по жесту пользователя.
 * Музыкальная и событийная шины управляются независимо. Во время паузы
 * фон затихает. Для замены синтеза сэмплами достаточно сохранить onEvent().
 */
import { WEAPONS } from '../config/gameplay.ts';
import type { GameEvent } from '../core/Simulation.ts';
import type { Settings } from '../config/settings.ts';
export class AudioManager {
  private ctx?: AudioContext;
  private master?: GainNode;
  private effects?: GainNode;
  private music?: GainNode;
  private active = false;
  private settings: Settings;
  private noise?: AudioBuffer;
  constructor(s: Settings) {
    this.settings = s;
  }
  unlock(): void {
    if (!this.ctx) {
      try {
        const c = new AudioContext();
        this.ctx = c;
        this.master = c.createGain();
        this.effects = c.createGain();
        this.music = c.createGain();
        this.master.gain.value = 0;
        this.music.gain.value = 0;
        this.effects.connect(this.master);
        this.music.connect(this.master);
        this.master.connect(c.destination);
        const length = Math.floor(c.sampleRate * 0.4);
        this.noise = c.createBuffer(1, length, c.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        for (const hz of [55, 82.4, 110.3]) {
          const n = c.createOscillator();
          n.type = 'sine';
          n.frequency.value = hz;
          n.connect(this.music);
          n.start();
        }
        this.apply(this.settings);
      } catch {
        return;
      }
    }
    void this.ctx.resume().catch(() => {});
  }
  apply(s: Settings): void {
    this.settings = s;
    const t = this.ctx?.currentTime ?? 0;
    this.master?.gain.setTargetAtTime(s.master, t, 0.03);
    this.effects?.gain.setTargetAtTime(s.effects, t, 0.03);
    this.music?.gain.setTargetAtTime(this.active ? s.music * 0.035 : 0, t, 0.12);
  }
  setPlaying(on: boolean): void {
    this.active = on;
    this.apply(this.settings);
  }
  private tone(hz: number, end: number, duration: number, level: number, type: OscillatorType = 'sine') {
    const c = this.ctx;
    if (!c || !this.effects) return;
    const t = c.currentTime,
      osc = c.createOscillator(),
      gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, t);
    osc.frequency.exponentialRampToValueAtTime(end, t + duration);
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(this.effects);
    osc.start(t);
    osc.stop(t + duration + 0.01);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  private burst(slot: number) {
    const c = this.ctx;
    if (!c || !this.effects || !this.noise) return;
    const t = c.currentTime,
      s = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = this.noise;
    f.type = 'lowpass';
    const d = [0.105, 0.075, 0.19][slot];
    const brightness = [3400, 4700, 2350][slot] * (0.93 + Math.random() * 0.14);
    f.frequency.setValueAtTime(brightness, t);
    f.frequency.exponentialRampToValueAtTime(brightness * 0.21, t + d);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f);
    f.connect(g);
    g.connect(this.effects);
    s.start(t, Math.random() * 0.12);
    s.stop(t + d);
    s.onended = () => {
      s.disconnect();
      f.disconnect();
      g.disconnect();
    };
  }
  onEvent(e: GameEvent): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (e.type === 'shot') {
      this.burst(e.slot);
      const weight = WEAPONS[e.slot].flash;
      this.tone(WEAPONS[e.slot].soundHz * (0.96 + Math.random() * 0.08), 43, 0.11 * weight, 0.17, 'triangle');
    } else if (e.type === 'enemyShot') this.tone(122, 64, 0.08, 0.048, 'triangle');
    else if (e.type === 'hit' || e.type === 'kill')
      this.tone(e.type === 'kill' ? 840 : 560, e.type === 'kill' ? 1190 : 680, 0.085, 0.075);
    else if (e.type === 'hurt' || e.type === 'death') this.tone(130, 48, 0.15, 0.11, 'triangle');
    else if (e.type === 'empty') this.tone(680, 250, 0.022, 0.043, 'triangle');
    else if (e.type === 'load') this.tone(310, 95, 0.06, 0.08, 'triangle');
    else if (e.type === 'reload' || e.type === 'equip') this.tone(430, 170, 0.04, 0.04, 'triangle');
    else if (e.type === 'spawn') this.tone(260, 620, 0.23, 0.09);
  }
  dispose(): void {
    if (this.ctx) void this.ctx.close().catch(() => {});
  }
}
