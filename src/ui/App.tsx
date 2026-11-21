/**
 * Экраны главного меню, паузы и результата. React подписывается на GameClient.
 * === UI INTEGRATION POINT === Здесь изменяются навигация, композиция и текст.
 * Компонент не импортирует симуляцию, рендерер или менеджер снаряжения.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { GameClient } from '../core/contract.ts';
import { HUD } from './HUD.tsx';
import { counted, timecode } from './format.ts';
import { SettingsPanel } from './SettingsPanel.tsx';
import { Icon, Logo, type IconName } from './Icons.tsx';
type Tab = 'play' | 'controls' | 'settings' | 'about';
const tabs: readonly [Tab, string][] = [
  ['play', 'Полигон'],
  ['controls', 'Управление'],
  ['settings', 'Настройки'],
  ['about', 'Об игре'],
];
const keys = [
  ['W A S D', 'Перемещение'],
  ['Мышь / ← →', 'Обзор'],
  ['Shift', 'Бег вперёд'],
  ['Пробел', 'Прыжок'],
  ['C / Ctrl', 'Присесть (удерживать)'],
  ['ЛКМ', 'Огонь'],
  ['ПКМ', 'Прицелиться'],
  ['R', 'Перезарядить'],
  ['1 / 2 / 3', 'Выбрать оружие'],
  ['Колесо', 'Следующее оружие'],
  ['Esc / P', 'Пауза'],
];
function ControlGuide() {
  return (
    <div className="controls-list">
      {keys.map(([k, label]) => (
        <div key={k}>
          <span>{label}</span>
          <kbd>{k}</kbd>
        </div>
      ))}
    </div>
  );
}
function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="fact">
      <Icon name={icon} size={22} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
export function App({ client }: { client: GameClient }) {
  const s = useSyncExternalStore(client.subscribe, client.getSnapshot),
    a = client.actions;
  const [tab, setTab] = useState<Tab>('play');
  const lastVolume = useRef(0.65);
  const back = () => setTab('play');
  useEffect(() => {
    setTab('play');
  }, [s.mode]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && tab !== 'play') {
        e.preventDefault();
        e.stopImmediatePropagation();
        back();
      }
    };
    window.addEventListener('keydown', on, true);
    return () => window.removeEventListener('keydown', on, true);
  }, [tab]);
  if (s.mode === 'playing') return <HUD s={s} a={a} />;
  const toggleSound = () => {
    if (s.settings.master > 0) {
      lastVolume.current = s.settings.master;
      a.updateSetting('master', 0);
    } else a.updateSetting('master', lastVolume.current || 0.65);
  };
  const page = tab !== 'play';
  return (
    <main className={'shell ' + (s.mode === 'menu' && !page ? 'landing' : 'overlaid')}>
      <header className="header">
        <div className="brand">
          <Logo />
          <span>
            RELAY<span className="brand-light">SHIFT</span>
          </span>
        </div>
        {s.mode === 'menu' && (
          <nav aria-label="Главное меню">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                className={tab === id ? 'active' : ''}
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
        )}
        <div className="header-end">
          <span className="session">
            <i /> Соло
          </span>
          <span className="separator" />
          <button
            className="icon-btn"
            aria-label={s.settings.master > 0 ? 'Выключить звук' : 'Включить звук'}
            onClick={toggleSound}
          >
            <Icon name={s.settings.master > 0 ? 'sound' : 'mute'} size={18} />
          </button>
        </div>
      </header>
      {page ? (
        <section className="panel page-panel">
          <button className="back" onClick={back}>
            <Icon name="back" size={15} />
            Назад
          </button>
          <h2>{tabs.find((x) => x[0] === tab)?.[1]}</h2>
          {tab === 'settings' ? (
            <SettingsPanel settings={s.settings} actions={a} />
          ) : tab === 'controls' ? (
            <ControlGuide />
          ) : (
            <div className="about">
              <p>
                <b>Relay Shift</b> — одиночный FPS на станции связи «Кестрел». Для досрочной победы
                набери {counted(s.goal, 'устранение', 'устранения', 'устранений')}. Лимит времени —{' '}
                {timecode(s.limitSeconds)}.
              </p>
              <p>
                Автомат, пистолет и дробовик доступны с начала матча. Попадание в оптический модуль дрона
                приносит дополнительные очки.
              </p>
              <small>Browser COD · версия 0.1.2</small>
              <details>
                <summary>Авторы записей выстрелов</summary>
                <p>Винтовка — qubodup. Дробовик — michorvath. Обе записи под лицензией CC0.</p>
                <p>
                  <a href="https://freesound.org/people/Astronaut77890/sounds/714332/" target="_blank" rel="noreferrer">P226- Suppressed Gunshot</a>
                  {' '}— Astronaut77890,{' '}
                  <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.
                  Для игры выстрел обрезан, сведён в моно и обработан по громкости.
                </p>
              </details>
            </div>
          )}
        </section>
      ) : s.mode === 'menu' ? (
        <>
          <section className="hero">
            <div className="eyebrow">
              <span />
              ТРЕНИРОВОЧНЫЙ ПОЛИГОН
            </div>
            <h1>
              RELAY
              <br />
              SHIFT<span className="title-dot">.</span>
            </h1>
            <p>
              Одиночная тренировка на заброшенной станции связи. Отключи{' '}
              {counted(s.goal, 'дрона', 'дронов', 'дронов')} до конца сеанса.
            </p>
            <button className="launch" onClick={a.start} disabled={!s.ready}>
              <Icon name="play" size={19} />
              Начать тренировку
              <Icon name="arrow" size={20} />
            </button>
            {s.error && (
              <p className="error" role="alert">
                {s.error}
              </p>
            )}
          </section>
          <div className="station-tag" aria-hidden="true">
            <i />
            <span>СТАНЦИЯ СВЯЗИ</span>
            <b>КЕСТРЕЛ</b>
          </div>
          <footer className="brief">
            <Fact icon="map" label="Карта" value="Станция «Кестрел»" />
            <Fact icon="bot" label="Противники" value={counted(s.enemies, 'дрон', 'дрона', 'дронов')} />
            <Fact
              icon="target"
              label="Цель"
              value={counted(s.goal, 'устранение', 'устранения', 'устранений')}
            />
            <Fact icon="clock" label="Лимит времени" value={timecode(s.limitSeconds)} />
          </footer>
        </>
      ) : s.mode === 'paused' ? (
        <section className="panel action-panel">
          <div className="eyebrow">
            <span />
            СЕАНС ПРИОСТАНОВЛЕН
          </div>
          <h2>Пауза</h2>
          <p>
            Кестрел · {s.kills} из {s.goal} целей · {s.score} очков
          </p>
          {s.error && <p role="alert">{s.error}</p>}
          <button className="launch" disabled={!s.ready} onClick={a.resume}>
            <Icon name="play" size={18} />
            Продолжить
          </button>
          <button className="row-btn" onClick={() => setTab('settings')}>
            Настройки
            <Icon name="settings" size={17} />
          </button>
          <button className="row-btn" onClick={a.restart}>
            Начать заново
            <Icon name="arrow" size={17} />
          </button>
          <button className="row-btn" onClick={a.mainMenu}>
            Главное меню
            <Icon name="back" size={17} />
          </button>
        </section>
      ) : (
        <section className="panel action-panel">
          <div className="eyebrow">
            <span />
            ИТОГ ТРЕНИРОВКИ
          </div>
          <h2>{s.kills >= s.goal ? 'Цель достигнута' : 'Время вышло'}</h2>
          <dl className="result-grid">
            {[
              ['Очки', s.score],
              ['Устранения', s.kills],
              ['Потери', s.deaths],
              ['Точность', s.accuracy + '%'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <button className="launch" onClick={a.restart}>
            <Icon name="play" size={18} />
            Ещё одна тренировка
          </button>
          <button className="row-btn" onClick={a.mainMenu}>
            Главное меню
            <Icon name="back" size={17} />
          </button>
        </section>
      )}
    </main>
  );
}
