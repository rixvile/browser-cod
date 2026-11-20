/**
 * === UI INTEGRATION POINT === Из этого контракта React читает только данные.
 * Команды передаются GameActions. Здесь нет ссылок на Three.js, DOM, ботов или
 * оружейный менеджер. Новые поля добавляй совместимо с существующими экранами.
 */
import type { Settings } from '../config/settings.ts';
export type Mode = 'menu' | 'playing' | 'paused' | 'results';
export interface GameUIState {
  mode: Mode;
  ready: boolean;
  error: string;
  fallback: boolean;
  settings: Settings;
  health: number;
  maxHealth: number;
  weapon: string;
  weaponKind: string;
  slot: number;
  ammo: number;
  magazine: number;
  weaponCount: number;
  reserve: number;
  reloading: boolean;
  reloadProgress: number;
  ads: boolean;
  sprinting: boolean;
  hit: boolean;
  hurt: boolean;
  killMessage: string;
  kills: number;
  deaths: number;
  score: number;
  goal: number;
  limitSeconds: number;
  seconds: number;
  respawn: number;
  shield: boolean;
  accuracy: number;
  fps: number;
  frameMs: number;
  draws: number;
  enemies: number;
}
export interface GameActions {
  start(): void;
  resume(): void;
  pause(): void;
  restart(): void;
  mainMenu(): void;
  capture(): void;
  reload(): void;
  changeWeapon(slot: number): void;
  updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void;
}
export interface GameClient {
  /** React useSyncExternalStore подписывается на замену снимка. */ subscribe: (
    fn: () => void,
  ) => () => void;
  getSnapshot: () => GameUIState;
  actions: GameActions;
}
