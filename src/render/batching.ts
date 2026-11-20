/**
 * Оптимизация статических примитивов. Преобразования сохраняются в системе
 * координат общего родителя. Отдельная модель остаётся подвижной целиком.
 * === PERFORMANCE SENSITIVE === Вызывать после создания, до игрового цикла.
 */
import * as T from 'three';
export function batchStatics(root: T.Object3D) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert(),
    groups = new Map<string, T.Mesh[]>();
  root.traverse((obj) => {
    if (!(obj instanceof T.Mesh) || obj instanceof T.InstancedMesh || Array.isArray(obj.material))
      return;
    const k = obj.geometry.uuid + obj.material.uuid;
    const list = groups.get(k) ?? [];
    list.push(obj);
    groups.set(k, list);
  });
  const matrix = new T.Matrix4();
  for (const list of groups.values()) {
    if (list.length < 3) continue;
    const batch = new T.InstancedMesh(list[0].geometry, list[0].material, list.length);
    list.forEach((item, i) => {
      matrix.multiplyMatrices(inverse, item.matrixWorld);
      batch.setMatrixAt(i, matrix);
      item.removeFromParent();
    });
    batch.castShadow = list[0].castShadow;
    batch.receiveShadow = list[0].receiveShadow;
    root.add(batch);
  }
}
/** Объединяет неподвижные детали одного робота или инструмента в цветной меш.
 * Дочерние группы ног остаются самостоятельными и могут анимироваться. */
export function bakeModel(group: T.Group) {
  const bins = new Map<boolean, T.Mesh[]>();
  for (const o of group.children) {
    if (!(o instanceof T.Mesh) || !(o.material instanceof T.MeshStandardMaterial)) continue;
    const lit = o.material.emissiveIntensity > 0 && o.material.emissive.getHex() !== 0;
    const list = bins.get(lit) ?? [];
    list.push(o);
    bins.set(lit, list);
  }
  for (const [lit, meshes] of bins) {
    const points: number[] = [],
      normals: number[] = [],
      colors: number[] = [],
      indices: number[] = [];
    const pos = new T.Vector3(),
      normal = new T.Vector3(),
      matrix = new T.Matrix3();
    for (const mesh of meshes) {
      mesh.updateMatrix();
      matrix.getNormalMatrix(mesh.matrix);
      const p = mesh.geometry.attributes.position,
        n = mesh.geometry.attributes.normal,
        index = mesh.geometry.index,
        offset = points.length / 3;
      const col = (mesh.material as T.MeshStandardMaterial).color;
      for (let i = 0; i < p.count; i++) {
        pos.fromBufferAttribute(p, i).applyMatrix4(mesh.matrix);
        normal.fromBufferAttribute(n, i).applyMatrix3(matrix).normalize();
        points.push(pos.x, pos.y, pos.z);
        normals.push(normal.x, normal.y, normal.z);
        colors.push(col.r, col.g, col.b);
      }
      for (let i = 0; i < (index?.count ?? p.count); i++)
        indices.push(offset + (index ? index.getX(i) : i));
      mesh.removeFromParent();
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(points, 3));
    geo.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    const mat = lit
      ? new T.MeshBasicMaterial({ vertexColors: true })
      : new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.18 });
    const result = new T.Mesh(geo, mat);
    result.castShadow = true;
    result.receiveShadow = true;
    group.add(result);
  }
}
