/**
 * Баланс полигона в мировых единицах. Одна единица равна одному игровому метру,
 * интервалы заданы в секундах. Эти значения читают движение, оружие, боты и HUD.
 * === GAMEPLAY CONFIGURATION === Меняй темп здесь и проверяй тесты баланса.
 */
export const RULES = {
  /** Длительность активного сеанса. Время в меню и на паузе не считается. */
  duration: 180,
  /** Завершает тренировку досрочно. */ goal: 10,
  /** Время охлаждения корпуса перед автоматическим возрождением игрока. */ respawn: 2.5,
  /** Безопасный промежуток для ориентации после появления. */ spawnShield: 2.2,
  /** Базовые очки за дрона и дополнительная награда за точное попадание. */
  killPoints: 100,
  precisionBonus: 50,
};
export const PLAYER = {
  /** Запас прочности, радиус и высота коллайдера стоя/сидя. */
  health: 100,
  radius: 0.34,
  height: 1.85,
  crouchHeight: 1.14,
  /** Скорости ходьбы, спринта и движения сидя, метров в секунду. */
  walk: 5.2,
  sprint: 8.5,
  crouch: 2.8,
  /** Высота ступени, начальная скорость прыжка и ускорение свободного падения. */
  step: 0.31,
  jump: 6.7,
  gravity: 18.5,
  /** Базовый перевод физического смещения мыши в радианы. */ lookRate: 0.002,
};
export const BOT = {
  /** Четыре независимых тренировочных дрона делят единый мир и навигационную сетку. */
  count: 4,
  health: 100,
  radius: 0.39,
  height: 1.79,
  /** Дальности обнаружения и перехода к атаке в игровом пространстве. */
  sight: 35,
  attackRange: 18,
  speed: 2.05,
  /** Дискретность сетки и частота повторной проверки пути. */ cell: 2,
  think: 0.3,
  /** Интервал между импульсами и урон одного успешного попадания. */
  fireDelay: 1.55,
  damage: 9,
  respawn: 3.2,
};
export interface WeaponSpec {
  id: string;
  name: string;
  kind: string;
  damage: number;
  interval: number;
  magazine: number;
  reserve: number;
  reload: number;
  reloadStyle: 'magazine' | 'single';
  pellets: number;
  spread: number;
  adsSpread: number;
  recoil: number;
  zoom: number;
  automatic: boolean;
  soundHz: number;
  flash: number;
  color: string;
}
/** Порядок определяет горячие клавиши. Угол разброса и отдачи указан в радианах.
 * interval — задержка между выстрелами, zoom — доля поля зрения при прицеливании.
 * Параметры звука и вспышки используются только презентационным слоем. */
export const WEAPONS: readonly WeaponSpec[] = [
  {
    id: 'vector',
    name: 'K-11 Vektor',
    kind: 'Автомат',
    damage: 31,
    interval: 0.12,
    magazine: 30,
    reserve: 150,
    reload: 1.55,
    reloadStyle: 'magazine',
    pellets: 1,
    spread: 0.01,
    adsSpread: 0.3,
    recoil: 0.011,
    zoom: 0.73,
    automatic: true,
    soundHz: 155,
    flash: 1,
    color: '#67736b',
  },
  {
    id: 'spark',
    name: 'S-4 Spark',
    kind: 'Пистолет',
    damage: 49,
    interval: 0.23,
    magazine: 12,
    reserve: 72,
    reload: 1.1,
    reloadStyle: 'magazine',
    pellets: 1,
    spread: 0.007,
    adsSpread: 0.34,
    recoil: 0.02,
    zoom: 0.83,
    automatic: false,
    soundHz: 235,
    flash: 0.72,
    color: '#69868a',
  },
  {
    id: 'kiln',
    name: 'M-8 Kiln',
    kind: 'Дробовик',
    damage: 17,
    interval: 0.77,
    magazine: 6,
    reserve: 36,
    reload: 0.46,
    reloadStyle: 'single',
    pellets: 8,
    spread: 0.072,
    adsSpread: 0.66,
    recoil: 0.044,
    zoom: 0.88,
    automatic: false,
    soundHz: 85,
    flash: 1.55,
    color: '#a06344',
  },
];
/** Множитель попадания в оптический модуль дрона. */ export const HEAD_FACTOR = 1.8;
