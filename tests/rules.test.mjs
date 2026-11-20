/** Чистые проверки игровой логики. Node.js запускает TypeScript без WebGL и сети. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Armory } from '../src/weapons/Armory.ts';
import { validateSettings } from '../src/config/settings.ts';
import { RULES, WEAPONS } from '../src/config/gameplay.ts';
import { visible, slide, rayBox, direction, fits } from '../src/world/physics.ts';
import { Navigation } from '../src/ai/Navigation.ts';
import { Simulation } from '../src/core/Simulation.ts';
import { trace } from '../src/combat/hitscan.ts';
import { NEUTRAL, Player } from '../src/player/Player.ts';
const nav = new Navigation();
const fresh = () =>
  new Simulation(
    nav,
    () => {},
    () => 0.5,
  );
test('темп и вместимость всех трёх магазинов', () => {
  WEAPONS.forEach((w, i) => {
    const a = new Armory();
    a.slot = i;
    for (let n = 0; n < w.magazine; n++) {
      assert.ok(a.fire());
      assert.equal(a.fire(), false);
      a.tick(w.interval + 0.001);
    }
    assert.equal(a.ammo, 0);
    assert.equal(a.fire(), false);
  });
});
test('смена отменяет перезарядку без дублирования патронов', () => {
  const a = new Armory();
  a.fire();
  a.reload();
  a.tick(0.2);
  a.equip(1);
  a.tick(4);
  a.equip(0);
  assert.equal(a.ammo, 29);
  assert.equal(a.spare, 150);
  a.reload();
  a.tick(4);
  assert.equal(a.ammo, 30);
  assert.equal(a.spare, 149);
});
test('остаток резерва переносится точно', () => {
  const a = new Armory();
  a.magazines[0] = 0;
  a.reserves[0] = 3;
  a.reload();
  a.tick(3);
  assert.equal(a.ammo, 3);
  assert.equal(a.spare, 0);
});
test('неполные и повреждённые настройки нормализуются', () => {
  const s = validateSettings({ master: 0, debug: true, fov: 999, fx: 'broken', sensitivity: NaN });
  assert.equal(s.master, 0);
  assert.equal(s.debug, true);
  assert.equal(s.fov, 100);
  assert.equal(s.fx, 'high');
  assert.equal(s.sensitivity, 1);
});
test('стена блокирует видимость и движение, параллельный луч не попадает', () => {
  assert.equal(visible({ x: 15, y: 1, z: 18 }, { x: 15, y: 1, z: 8 }), false);
  const p = { x: 15, y: 0, z: 16 };
  for (let i = 0; i < 50; i++) slide(p, 0, -0.12, 0.34, 1.85, 0.31);
  assert.ok(p.z > 13.8);
  assert.ok(fits(p, 0.34, 1.85));
  assert.equal(
    rayBox({ x: 4, y: 1, z: 2 }, { x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 0, w: 1, h: 2, d: 1 }),
    Infinity,
  );
});
test('лестница даёт доступ на террасу', () => {
  const p = new Player({ x: 18, y: 0, z: 6 });
  for (let i = 0; i < 155; i++) p.step({ ...NEUTRAL, forward: 1 }, 1 / 60);
  assert.ok(Math.abs(p.pos.y - 2.4) < 0.02);
  assert.ok(p.pos.z < 0);
});
test('навигация ведёт в обход контейнера', () => {
  const path = nav.path({ x: 14, y: 0, z: 18 }, { x: 14, y: 0, z: 6 });
  assert.ok(path.length > 4);
  assert.ok(path.every((p) => fits(p, 0.39, 1.79)));
});
test('сенсор и корпус имеют разные зоны попадания', () => {
  const s = fresh(),
    b = s.bots.units[0];
  b.pos = { x: 0, y: 0, z: 0 };
  assert.ok(trace({ x: 0, y: 1.62, z: 4 }, direction(0, 0), [b]).head);
  assert.equal(trace({ x: 0, y: 1, z: 4 }, direction(0, 0), [b]).head, false);
});
test('укрытие перехватывает луч до бота', () => {
  const s = fresh(),
    b = s.bots.units[0];
  b.pos = { x: 15, y: 0, z: 8 };
  assert.equal(trace({ x: 15, y: 1, z: 17 }, direction(0, 0), [b]).target, undefined);
});
test('щит, одна смерть и автоматическое возрождение', () => {
  const s = fresh();
  s.hurt(500);
  assert.equal(s.player.health, 100);
  s.player.shield = 0;
  s.hurt(500);
  s.hurt(500);
  assert.equal(s.deaths, 1);
  for (let i = 0; i < 160; i++) s.step(1 / 60, NEUTRAL);
  assert.equal(s.player.health, 100);
  assert.ok(s.player.shield > 0);
});
test('попадание, точное устранение, счёт и победа проходят через спуск', () => {
  const s = fresh();
  s.kills = RULES.goal - 1;
  s.bots.units[0].hp = 1;
  s.step(1 / 60, { ...NEUTRAL, pressed: true });
  assert.equal(s.ended, true);
  assert.equal(s.kills, RULES.goal);
  assert.equal(s.score, RULES.killPoints + RULES.precisionBonus);
});
test('по истечении времени состояние замораживается', () => {
  const s = fresh();
  s.remaining = 0.005;
  s.step(1 / 60, NEUTRAL);
  assert.equal(s.ended, true);
  s.step(1, { ...NEUTRAL, pressed: true });
  assert.equal(s.armory.ammo, 30);
});
