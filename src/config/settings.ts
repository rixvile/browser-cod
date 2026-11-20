/**
 * Центральное описание девяти настроек. При чтении старых или повреждённых
 * сохранений валидируется каждое поле. Меню изменяет их через GameActions.
 * === SAFE TO MODIFY === Диапазоны здесь одновременно задают границы в меню.
 */
export type Quality = 'low' | 'high';
export interface Settings {
  sensitivity: number;
  master: number;
  effects: number;
  music: number;
  fov: number;
  graphics: Quality;
  shadows: boolean;
  fx: Quality;
  debug: boolean;
}
export const DEFAULTS: Settings = {
  sensitivity: 1,
  master: 0.65,
  effects: 0.8,
  music: 0.2,
  fov: 76,
  graphics: 'high',
  shadows: true,
  fx: 'high',
  debug: false,
};
export const RANGES = {
  sensitivity: [0.2, 3, 0.05],
  master: [0, 1, 0.05],
  effects: [0, 1, 0.05],
  music: [0, 1, 0.05],
  fov: [55, 100, 1],
} as const;
const KEY = 'relay-shift.settings.v1';

/** Возвращает новый объект, сохраняя нулевую громкость и допустимые false. */
export function validateSettings(value: unknown): Settings {
  const clean = { ...DEFAULTS };
  if (!value || typeof value !== 'object') return clean;
  const raw = value as Record<string, unknown>;
  for (const key of Object.keys(RANGES) as (keyof typeof RANGES)[]) {
    const n = raw[key];
    if (typeof n === 'number' && Number.isFinite(n))
      clean[key] = Math.min(RANGES[key][1], Math.max(RANGES[key][0], n));
  }
  for (const key of ['graphics', 'fx'] as const)
    if (raw[key] === 'low' || raw[key] === 'high') clean[key] = raw[key];
  for (const key of ['shadows', 'debug'] as const)
    if (typeof raw[key] === 'boolean') clean[key] = raw[key];
  return clean;
}
/** Хранилище может быть отключено в приватном или встроенном окне. Сеанс всё равно работает. */
export function loadSettings(): Settings {
  try {
    return validateSettings(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return { ...DEFAULTS };
  }
}
export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* Память текущего сеанса уже обновлена. */
  }
}
