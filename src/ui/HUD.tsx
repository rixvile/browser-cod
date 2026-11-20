/**
 * Игровой интерфейс от первого лица. Показания выводятся из публичного снимка,
 * взаимодействие с симуляцией ограничено командами. Можно полностью заменить
 * в Figma-редизайне, сохранив пропсы. Перекрестие привязано к центру canvas.
 */
import type { GameActions, GameUIState } from '../core/contract.ts';
import { Icon } from './Icons.tsx';
import { timecode } from './format.ts';
export function HUD({ s, a }: { s: GameUIState; a: GameActions }) {
  return (
    <main className={'hud' + (s.hurt ? ' hurt' : '')} aria-label="Интерфейс матча">
      <div className="hud-top">
        <div className="mission">
          <i />
          КЕСТРЕЛ <b>/</b> ТРЕНИРОВКА
        </div>
        <div className="match">
          <Icon name="target" size={16} />{' '}
          <strong data-testid="kills">
            {s.kills} / {s.goal}
          </strong>
          <i />
          <span data-testid="timer">{timecode(s.seconds)}</span>
        </div>
        <button className="hud-pause icon-btn" aria-label="Пауза" onClick={a.pause}>
          <Icon name="pause" size={15} />
        </button>
      </div>
      {s.settings.debug && (
        <output className="perf">
          {s.fps} FPS · {s.frameMs} мс · {s.draws} выз. · {s.enemies} бота
        </output>
      )}
      {s.fallback && (
        <div className="fallback">
          <span>Стрелки ← → поворачивают камеру</span>
          <button onClick={a.capture}>Захватить мышь</button>
        </div>
      )}
      {s.health > 0 ? (
        <>
          <div className={'crosshair' + (s.ads ? ' ads' : '') + (s.sprinting ? ' wide' : '')}>
            <i />
            <i />
            <i />
            <i />
            <b />
          </div>
          {s.hit && <div className="hitmark">×</div>}
          {s.killMessage && <div className="kill-msg">{s.killMessage}</div>}
          {s.reloading && (
            <div className="reload">
              Перезарядка <progress value={s.reloadProgress} max="100" />
            </div>
          )}
          {s.ammo === 0 && !s.reloading && (
            <div className="reload">
              Магазин пуст · <kbd>R</kbd>
            </div>
          )}
        </>
      ) : (
        <div className="down">
          <span>Сигнал потерян</span>
          <h2>Возрождение через {s.respawn}</h2>
        </div>
      )}
      <div className="hud-bottom">
        <div className="health-panel">
          <span className="micro">ПРОЧНОСТЬ</span>
          <div className="health-value">
            <b>+</b>
            <strong data-testid="health">{s.health}</strong>
            <small> / {s.maxHealth}</small>
          </div>
          <div className="hp-track">
            <i style={{ width: s.health + '%' }} />
          </div>
          {s.shield && s.health > 0 && <em>Защита возрождения</em>}
        </div>
        <div className="score-panel">
          <b data-testid="score">{s.score}</b>
          <span>ОЧКИ</span>
        </div>
        <div className="ammo-panel">
          <span className="micro">
            {s.weaponKind} · {s.weapon}
          </span>
          <div>
            <strong data-testid="ammo">{s.ammo.toString().padStart(2, '0')}</strong>
            <b> / </b>
            <small>{s.reserve}</small>
          </div>
          <span className="slots">
            {Array.from({ length: s.weaponCount }, (_, n) => (
              <i key={n} className={s.slot === n ? 'chosen' : ''}>
                {n + 1}
              </i>
            ))}
          </span>
        </div>
      </div>
    </main>
  );
}
