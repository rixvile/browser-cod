/** Записанные выстрелы и синтез интерфейса проходят через общую громкость эффектов. */
import { WEAPONS } from '../config/gameplay.ts';
import type { GameEvent } from '../core/Simulation.ts';
import type { Settings } from '../config/settings.ts';
import rifle from './recordings/rifle.wav?inline';
import pistol from './recordings/suppressed-pistol.wav?inline';
import shotgun from './recordings/shotgun.wav?inline';

const reports = {
  rifle: { url: rifle, gain: 0.53 },
  suppressedPistol: { url: pistol, gain: 0.22 },
  shotgun: { url: shotgun, gain: 0.70 },
};

export class AudioManager {
  private ctx?: AudioContext;
  private master?: GainNode;
  private effects?: GainNode;
  private music?: GainNode;
  private active = false;
  private settings: Settings;
  private readonly recordings = new Map<string, Promise<AudioBuffer | null>>();
  private session = 0;
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
        // Vite встраивает WAV и для сайта, и для PLAY.html. Декодируем один раз.
        for (const [name, report] of Object.entries(reports)) {
          const encoded = report.url.slice(report.url.indexOf(',') + 1);
          const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
          const decoded = c.decodeAudioData(bytes.buffer).catch(error => {
            console.warn('Relay Shift: ошибка декодирования звука', name, error);
            return null;
          });
          this.recordings.set(name, decoded);
        }
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
    if (this.active !== on) this.session++;
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
  private async playShot(slot: number) {
    const ctx = this.ctx;
    const effects = this.effects;
    if (!ctx || !effects || !this.active) return;
    const name = WEAPONS[slot].report;
    const session = this.session;
    const buffer = await this.recordings.get(name);
    if (!buffer || session !== this.session || ctx.state === 'closed') return;
    // Свой источник на выстрел позволяет естественно наложить хвосты в очереди.
    const voice = ctx.createBufferSource();
    const level = ctx.createGain();
    voice.buffer = buffer;
    voice.playbackRate.value = 0.987 + Math.random() * 0.026;
    level.gain.value = reports[name].gain;
    voice.connect(level);
    level.connect(effects);
    voice.onended = () => {
      voice.disconnect();
      level.disconnect();
    };
    voice.start();
  }
  onEvent(e: GameEvent): void {
    if (e.type === 'shot') {
      void this.playShot(e.slot);
      return;
    }
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (e.type === 'enemyShot') this.tone(122, 64, 0.08, 0.048, 'triangle');
    else if (e.type === 'hit' || e.type === 'kill')
      this.tone(e.type === 'kill' ? 840 : 560, e.type === 'kill' ? 1190 : 680, 0.085, 0.075);
    else if (e.type === 'hurt' || e.type === 'death') this.tone(130, 48, 0.15, 0.11, 'triangle');
    else if (e.type === 'empty') this.tone(680, 250, 0.022, 0.043, 'triangle');
    else if (e.type === 'load') this.tone(310, 95, 0.06, 0.08, 'triangle');
    else if (e.type === 'reload' || e.type === 'equip') this.tone(430, 170, 0.04, 0.04, 'triangle');
    else if (e.type === 'spawn') this.tone(260, 620, 0.23, 0.09);
  }
  dispose(): void {
    this.session++;
    this.recordings.clear();
    if (this.ctx) void this.ctx.close().catch(() => {});
  }
}
