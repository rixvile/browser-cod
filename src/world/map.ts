/**
 * Геометрический план «Кестрела». Оси x/z лежат на земле, y растёт вверх.
 * Физика, видимость и рендер получают одни и те же коробки. Декорации за
 * периметром размещаются отдельно в render/scenery.ts. Здесь можно менять карту.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface Box {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}
export type Surface = 'sand' | 'cement' | 'charcoal' | 'rust' | 'teal';
export interface Block extends Box {
  kind: 'wall' | 'roof' | 'crate' | 'barrier' | 'step' | 'deck' | 'container';
  surface: Surface;
}
export const HALF = 29;
const blocks: Block[] = [];
/** y задаёт основание, x/z — центр. Сюда входят только твёрдые поверхности. */
function block(
  kind: Block['kind'],
  surface: Surface,
  x: number,
  z: number,
  w: number,
  h: number,
  d: number,
  y = 0,
) {
  blocks.push({ kind, surface, x, y, z, w, h, d });
}
// Периметр оставляет вид на горы и удерживает игрока внутри игровой площадки.
block('wall', 'sand', 0, -29, 58, 3.8, 1);
block('wall', 'sand', 0, 29, 58, 3.8, 1);
block('wall', 'sand', -29, 0, 1, 3.8, 58);
block('wall', 'sand', 29, 0, 1, 3.8, 58);
// Западная мастерская. Южный торец открыт, второй выход выходит в центр двора.
block('wall', 'cement', -24, -5, 0.9, 5.5, 15);
block('wall', 'cement', -18, -12.1, 13, 5.5, 0.9);
block('wall', 'cement', -11.9, -8, 0.9, 5.5, 7.3);
block('roof', 'charcoal', -18, -4.8, 13.4, 0.45, 15.6, 5.5);
// Северная диспетчерская с проходом сквозь два боковых крыла.
block('wall', 'cement', -5.8, -22, 5.2, 7.3, 6.6);
block('wall', 'cement', 5.8, -22, 5.2, 7.3, 6.6);
block('roof', 'sand', 0, -22, 17.4, 0.65, 7, 7.3);
block('wall', 'charcoal', 0, -25.1, 4.5, 2.1, 0.5, 4.9);
// Восточная терраса и лестница. Подъём одной ступени меньше PLAYER.step.
block('deck', 'cement', 18, -7, 11, 2.4, 11);
for (let i = 0; i < 10; i++) block('step', 'sand', 18, 4.2 - i * 0.61, 4.7, (i + 1) * 0.24, 0.63);
block('wall', 'cement', 22.9, -7, 0.6, 1.05, 10.8, 2.4);
block('wall', 'sand', 18, -12.2, 10.6, 1.05, 0.55, 2.4);
// Линии укрытий оставляют центральный прострел и несколько обходных путей.
block('container', 'rust', -15, 12, 9.5, 3.2, 3.5);
block('container', 'teal', 15, 12, 8.4, 3.2, 3.7);
block('container', 'rust', -20, -18, 8.5, 3.15, 3.3);
block('barrier', 'cement', -4.9, 5.5, 4.4, 1.45, 1.25);
block('barrier', 'cement', 5.2, -4.3, 5.2, 1.38, 1.2);
block('crate', 'rust', -8.3, -4.5, 2.8, 2.3, 2.6);
block('crate', 'sand', -8.45, -4.5, 2.2, 1.7, 2, 2.3);
block('crate', 'teal', 9, 17, 2.8, 2.5, 2.5);
block('crate', 'sand', 11.8, 17.1, 2.4, 1.65, 2.2);
block('barrier', 'sand', -18, 21.5, 4.8, 1.3, 1.2);
block('barrier', 'cement', 24, 1, 1.2, 1.5, 5);
block('crate', 'teal', 8.4, -15.4, 2.5, 2, 2.7);
block('barrier', 'sand', -2, -14, 4.2, 1.2, 1.1);
export const BLOCKS: readonly Block[] = blocks;
export const PLAYER_SPAWNS: readonly Vec3[] = [
  { x: 0, y: 0, z: 22 },
  { x: -22, y: 0, z: 16 },
  { x: 23, y: 0, z: 20 },
  { x: 0, y: 0, z: -17 },
];
export const BOT_SPAWNS: readonly Vec3[] = [
  { x: 0, y: 0, z: 2 },
  { x: 8, y: 0, z: 3 },
  { x: -14, y: 0, z: -1 },
  { x: 18, y: 2.4, z: -7 },
  { x: -9, y: 0, z: 17 },
  { x: 1, y: 0, z: -10 },
  { x: 21, y: 0, z: 19 },
];
export const PATROL: readonly Vec3[] = [
  BOT_SPAWNS[0],
  { x: -18, y: 0, z: 4 },
  { x: 1, y: 0, z: -18 },
  { x: 18, y: 2.4, z: -7 },
  { x: 22, y: 0, z: 16 },
  { x: -9, y: 0, z: 20 },
  { x: 7, y: 0, z: 8 },
];
