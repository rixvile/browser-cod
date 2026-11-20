/**
 * Небольшая графовая карта для обхода укрытий. Строится один раз по коллайдерам,
 * затем боты делят готовые узлы. BFS достаточно для равных рёбер маленькой арены.
 * Смена внешнего вида станции не влияет на маршруты.
 */
import { BOT, PLAYER } from '../config/gameplay.ts';
import { BLOCKS, type Vec3 } from '../world/map.ts';
import { distance, fits } from '../world/physics.ts';
interface Node {
  p: Vec3;
  links: number[];
}
const terraces = BLOCKS.filter((b) => b.kind === 'step' || b.kind === 'deck');
function standingPoint(x: number, z: number): Vec3 {
  let y = 0;
  for (const b of terraces)
    if (Math.abs(x - b.x) <= b.w / 2 && Math.abs(z - b.z) <= b.d / 2) y = Math.max(y, b.y + b.h);
  return { x, y, z };
}
/** Тестируем промежуточные точки ребра: уровни по обе стороны узкой стенки
 * могут совпадать, однако проход для корпуса между ними должен быть свободен. */
function connected(a: Vec3, b: Vec3): boolean {
  let last = a;
  for (let i = 1; i <= 10; i++) {
    const u = i / 10,
      p = standingPoint(a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u);
    if (Math.abs(p.y - last.y) > PLAYER.step + 0.01 || !fits(p, BOT.radius, BOT.height)) return false;
    last = p;
  }
  return true;
}
export class Navigation {
  private nodes: Node[] = [];
  constructor() {
    const lookup = new Map<string, number>();
    for (let z = -26; z <= 26; z += BOT.cell)
      for (let x = -26; x <= 26; x += BOT.cell) {
        const p = standingPoint(x, z);
        if (!fits(p, BOT.radius + 0.06, BOT.height)) continue;
        const id = this.nodes.length,
          node: Node = { p, links: [] };
        this.nodes.push(node);
        lookup.set(x + ',' + z, id);
        for (const [nx, nz] of [
          [x - BOT.cell, z],
          [x, z - BOT.cell],
        ]) {
          const prev = lookup.get(nx + ',' + nz);
          if (prev !== undefined && connected(this.nodes[prev].p, p)) {
            node.links.push(prev);
            this.nodes[prev].links.push(id);
          }
        }
      }
  }
  private nearest(p: Vec3): number {
    let best = 0,
      dist = Infinity;
    this.nodes.forEach((n, i) => {
      const d = distance(n.p, p) + Math.abs(n.p.y - p.y);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    return best;
  }
  /** Возвращает очередь точек от ближайшей проходимой клетки к цели. */
  path(from: Vec3, to: Vec3): Vec3[] {
    const start = this.nearest(from),
      end = this.nearest(to);
    if (start === end) return [this.nodes[end].p];
    const parent = new Int16Array(this.nodes.length).fill(-1),
      queue = [start];
    parent[start] = start;
    for (let i = 0; i < queue.length && parent[end] < 0; i++) {
      const id = queue[i];
      for (const next of this.nodes[id].links)
        if (parent[next] < 0) {
          parent[next] = id;
          queue.push(next);
        }
    }
    if (parent[end] < 0) return [];
    const result: Vec3[] = [];
    for (let id = end; id !== start; id = parent[id]) result.push(this.nodes[id].p);
    return result.reverse();
  }
}
