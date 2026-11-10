import { Muro, Punto, dist, proyectar } from './modelo';

export type Cuarto = { puntos: Punto[]; area: number; centro: Punto };

const TOL = 0.06;

// Encuentra las habitaciones: los recintos cerrados que forman los ejes de los muros.
export function detectarCuartos(muros: Muro[]): Cuarto[] {
  if (muros.length < 3 || muros.length > 1500) return [];

  const nodos: Punto[] = [];
  const nodo = (p: Punto) => {
    const i = nodos.findIndex((q) => dist(p, q) < TOL);
    if (i >= 0) return i;
    nodos.push({ x: p.x, y: p.y });
    return nodos.length - 1;
  };

  const segs = muros.map((m) => [nodo(m.a), nodo(m.b)] as const).filter(([a, b]) => a !== b);

  // Cruces entre muros que se atraviesan.
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const p = nodos[segs[i][0]], r = nodos[segs[i][1]];
      const q = nodos[segs[j][0]], s = nodos[segs[j][1]];
      const d = (r.x - p.x) * (s.y - q.y) - (r.y - p.y) * (s.x - q.x);
      if (Math.abs(d) < 1e-9) continue;
      const t = ((q.x - p.x) * (s.y - q.y) - (q.y - p.y) * (s.x - q.x)) / d;
      const u = ((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)) / d;
      if (t > 0 && t < 1 && u > 0 && u < 1) nodo({ x: p.x + (r.x - p.x) * t, y: p.y + (r.y - p.y) * t });
    }
  }

  // Parte cada muro en los nodos que caen sobre el.
  const vecinos = new Map<number, Set<number>>();
  const unir = (a: number, b: number) => {
    if (a === b) return;
    if (!vecinos.has(a)) vecinos.set(a, new Set());
    if (!vecinos.has(b)) vecinos.set(b, new Set());
    vecinos.get(a)!.add(b);
    vecinos.get(b)!.add(a);
  };
  for (const [a, b] of segs) {
    const sobre: { i: number; t: number }[] = [];
    nodos.forEach((n, i) => {
      const pr = proyectar(n, nodos[a], nodos[b]);
      if (pr.d < TOL) sobre.push({ i, t: i === a ? 0 : i === b ? 1 : pr.t });
    });
    sobre.sort((p, q) => p.t - q.t);
    for (let k = 0; k + 1 < sobre.length; k++) unir(sobre[k].i, sobre[k + 1].i);
  }

  // Quita los tramos sueltos (muros que no cierran ningun recinto).
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const [n, vs] of vecinos) {
      if (vs.size === 1) {
        const [v] = vs;
        vecinos.get(v)!.delete(n);
        vecinos.delete(n);
        cambio = true;
      } else if (vs.size === 0) vecinos.delete(n);
    }
  }

  const ang = (a: number, b: number) => Math.atan2(nodos[b].y - nodos[a].y, nodos[b].x - nodos[a].x);
  const orden = new Map<number, number[]>();
  for (const [n, vs] of vecinos) orden.set(n, [...vs].sort((p, q) => ang(n, p) - ang(n, q)));

  // Recorre cada cara del grafo girando siempre hacia el mismo lado.
  const vistos = new Set<string>();
  const cuartos: Cuarto[] = [];
  for (const [inicio, vs] of orden) {
    for (const sig of vs) {
      if (vistos.has(inicio + '>' + sig)) continue;
      const cara: number[] = [];
      let u = inicio, v = sig, pasos = 0;
      while (!vistos.has(u + '>' + v) && pasos++ < 5000) {
        vistos.add(u + '>' + v);
        cara.push(u);
        const sal = orden.get(v)!;
        const k = sal.indexOf(u);
        const w = sal[(k - 1 + sal.length) % sal.length];
        u = v;
        v = w;
      }
      const pts = cara.map((i) => nodos[i]);
      let area = 0, cx = 0, cy = 0;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length];
        const c = p.x * q.y - q.x * p.y;
        area += c;
        cx += (p.x + q.x) * c;
        cy += (p.y + q.y) * c;
      }
      area /= 2;
      // La cara exterior sale con area negativa; se descarta.
      if (area > 0.3) cuartos.push({ puntos: pts, area, centro: { x: cx / (6 * area), y: cy / (6 * area) } });
    }
  }
  return cuartos;
}
