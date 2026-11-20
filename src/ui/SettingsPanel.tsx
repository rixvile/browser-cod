/**
 * Форма настроек работает только с контрактом GameActions. Диапазоны берутся из
 * схемы настроек, чтобы клавиатурный ввод, сохранение и ползунки совпадали.
 */
import type { GameActions } from '../core/contract.ts';
import { RANGES, type Settings } from '../config/settings.ts';
export function SettingsPanel({
  settings: s,
  actions: a,
}: {
  settings: Settings;
  actions: GameActions;
}) {
  const range = (key: keyof typeof RANGES, label: string, format: (v: number) => string) => {
    const [min, max, step] = RANGES[key];
    return (
      <label className="setting" key={key}>
        <span>{label}</span>
        <input
          aria-label={label}
          type="range"
          min={min}
          max={max}
          step={step}
          value={s[key]}
          onChange={(e) => a.updateSetting(key, Number(e.target.value))}
        />
        <output>{format(s[key])}</output>
      </label>
    );
  };
  const quality = (key: 'graphics' | 'fx', label: string) => (
    <label className="setting" key={key}>
      <span>{label}</span>
      <select
        value={s[key]}
        onChange={(e) => a.updateSetting(key, e.target.value as Settings[typeof key])}
      >
        <option value="high">Высокое</option>
        <option value="low">Низкое</option>
      </select>
    </label>
  );
  const toggle = (key: 'shadows' | 'debug', label: string) => (
    <label className="setting toggle" key={key}>
      <span>{label}</span>
      <input
        aria-label={label}
        type="checkbox"
        checked={s[key]}
        onChange={(e) => a.updateSetting(key, e.target.checked)}
      />
    </label>
  );
  const pct = (v: number) => Math.round(v * 100) + '%';
  return (
    <div className="settings-grid">
      <section>
        <h3>Управление</h3>
        {range('sensitivity', 'Чувствительность мыши', (v) => v.toFixed(2) + '×')}
        {range('fov', 'Поле зрения', (v) => v + '°')}
      </section>
      <section>
        <h3>Звук</h3>
        {range('master', 'Общая громкость', pct)}
        {range('effects', 'Громкость эффектов', pct)}
        {range('music', 'Фоновый звук', pct)}
      </section>
      <section>
        <h3>Графика</h3>
        {quality('graphics', 'Качество графики')}
        {quality('fx', 'Качество эффектов')}
        {toggle('shadows', 'Тени')}
        {toggle('debug', 'Счётчик FPS и статистика')}
      </section>
    </div>
  );
}
