/** Проверки движения и переходов ИИ без рендера. Фиксированный генератор
 * делает смену поведения воспроизводимой на Linux, Windows и в браузере. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { BOT, PLAYER, RULES } from '../src/config/gameplay.ts';
import { Bots } from '../src/ai/Bots.ts';
import { Navigation } from '../src/ai/Navigation.ts';
import { Simulation } from '../src/core/Simulation.ts';
import { Player, NEUTRAL } from '../src/player/Player.ts';
import { BOT_SPAWNS, PLAYER_SPAWNS } from '../src/world/map.ts';
import { fits } from '../src/world/physics.ts';
const nav = new Navigation();
const tick = (obj, seconds, frame = NEUTRAL) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) obj.step(1 / 60, frame);
};
test('спавны всех тел свободны', () => {
  for (const p of BOT_SPAWNS) assert.ok(fits(p, BOT.radius, BOT.height));
  for (const p of PLAYER_SPAWNS) assert.ok(fits(p, PLAYER.radius, PLAYER.height));
});
test('диагональная скорость равна прямой; мышь ограничена по вертикали', () => {
  const a = new Player({ x: 0, y: 0, z: 16 }),
    b = new Player({ x: 0, y: 0, z: 16 });
  tick(a, 0.25, { ...NEUTRAL, forward: 1 });
  tick(b, 0.25, { ...NEUTRAL, forward: 1, side: 1 });
  assert.ok(Math.abs(16 - a.pos.z - Math.hypot(b.pos.x, 16 - b.pos.z)) < 1e-5);
  a.look(0, 100000, 1);
  assert.ok(a.pitch > -Math.PI / 2);
});
test('пистолет расходует патрон только на новое нажатие', () => {
  const s = new Simulation(nav);
  s.equip(1);
  tick(s, 0.25);
  tick(s, 0.4, { ...NEUTRAL, fire: true });
  assert.equal(s.armory.ammo, 12);
  s.step(1 / 60, { ...NEUTRAL, pressed: true, fire: true });
  tick(s, 0.5, { ...NEUTRAL, fire: true });
  assert.equal(s.armory.ammo, 11);
});
test('бот проходит IDLE, CHASE, ATTACK, DEAD и возвращается', () => {
  const bots = new Bots(nav, () => 0.5),
    b = bots.units[0],
    p = new Player({ x: 0, y: 0, z: 22 });
  assert.equal(b.state, 'IDLE');
  bots.update(0.8, p, () => {});
  assert.equal(b.state, 'CHASE');
  p.pos.z = 8;
  bots.update(0.6, p, () => {});
  assert.equal(b.state, 'ATTACK');
  assert.ok(bots.damage(b, 999));
  assert.equal(b.state, 'DEAD');
  assert.equal(bots.damage(b, 999), false);
  bots.update(BOT.respawn + 0.01, p, () => {});
  assert.equal(b.state, 'IDLE');
  assert.equal(b.hp, BOT.health);
});
test('закрытый контейнер ведёт к PATROL и блокирует повторную проверку выстрела', () => {
  const bots = new Bots(nav, () => 0.5),
    b = bots.units[0],
    p = new Player({ x: 15, y: 0, z: 18 });
  b.pos = { x: 15, y: 0, z: 7 };
  let count = 0;
  bots.update(0.9, p, (who) => {
    if (who === b) count++;
  });
  assert.equal(b.state, 'PATROL');
  b.state = 'ATTACK';
  b.think = 10;
  b.shot = 0;
  bots.update(0.1, p, (who) => {
    if (who === b) count++;
  });
  assert.equal(count, 0);
});
test('новая тренировка получает независимые магазины и сбрасывает таймеры', () => {
  const previous = new Simulation(nav);
  previous.step(1 / 60, { ...NEUTRAL, pressed: true });
  previous.reload();
  const fresh = new Simulation(nav);
  assert.equal(fresh.remaining, RULES.duration);
  assert.equal(fresh.kills, 0);
  assert.equal(fresh.armory.ammo, 30);
  assert.equal(fresh.armory.reloadLeft, 0);
  assert.equal(previous.armory.ammo, 29);
  assert.ok(previous.armory.reloadLeft > 0);
  assert.notStrictEqual(previous.armory.magazines, fresh.armory.magazines);
});

test('ранний клик пистолета даёт один следующий выстрел, без автоповтора', () => {
  const s = new Simulation(nav);
  s.equip(1);
  tick(s, 0.25);
  const tap = { ...NEUTRAL, pressed: true };
  s.step(1 / 60, tap);
  s.step(1 / 60, tap); // Слишком рано для второго выстрела.
  tick(s, 10 / 60);
  assert.equal(s.shots, 1);
  s.step(1 / 60, tap);
  assert.equal(s.shots, 1);
  tick(s, 3 / 60);
  assert.equal(s.shots, 2);
  tick(s, 0.4, { ...NEUTRAL, fire: true });
  assert.equal(s.shots, 2);
});

test('последующие лучи следуют отдаче, мышь задаёт точку возврата', () => {
  const shots = [];
  const s = new Simulation(nav, e => { if (e.type === 'shot') shots.push(e); }, () => 0);
  const tap = { ...NEUTRAL, pressed: true };
  s.step(1 / 60, tap);
  tick(s, 0.14);
  assert.ok(s.player.aimPitch > s.player.pitch);
  s.step(1 / 60, tap);
  const shot = shots[1];
  const distance = Math.hypot(shot.to.x-shot.from.x, shot.to.z-shot.from.z);
  assert.ok(Math.abs(Math.atan2(shot.to.y-shot.from.y, distance) - s.player.aimPitch) < 1e-6);
  s.player.look(30, -40, 1);
  tick(s, 1.5);
  assert.ok(Math.abs(s.player.aimPitch - s.player.pitch) < 1e-5);
  assert.ok(Math.abs(s.player.aimYaw - s.player.yaw) < 1e-5);
});

test('дробовик можно прервать после первого патрона, пауза между шагами не добавляет боезапас', () => {
  const log = [];
  const s = new Simulation(nav, e => log.push(e.type));
  s.equip(2);
  s.armory.magazines[2] = 0;
  s.reload();
  tick(s, 0.3);
  s.step(1 / 60, { ...NEUTRAL, pressed: true });
  assert.equal(s.shots, 0);
  tick(s, 0.39);
  assert.equal(s.armory.ammo, 1);
  assert.equal(s.armory.spare, 35);
  assert.ok(s.armory.reloadLeft > 0);
  s.step(1 / 60, { ...NEUTRAL, pressed: true });
  assert.equal(s.shots, 1);
  assert.equal(s.armory.reloadLeft, 0);
  tick(s, 0.9);
  assert.equal(s.armory.ammo, 0);
  assert.equal(log.filter(t => t === 'load').length, 1);
  s.step(1 / 60, { ...NEUTRAL, pressed: true, fire: true });
  tick(s, 0.3, { ...NEUTRAL, fire: true });
  assert.equal(log.filter(t => t === 'empty').length, 1);
});
