// Modelo de datos del plano. Todas las medidas estan en metros;
// x crece a la derecha, y hacia abajo (igual que en la imagen del plano).

export type Punto = { x: number; y: number };

export type Muro = { id: string; a: Punto; b: Punto; grosor: number; alto: number };

export type TipoHueco = 'puerta' | 'ventana';

// pos: posicion del centro a lo largo del muro (0 = extremo a, 1 = extremo b)
// base: altura sobre el piso a la que empieza el hueco
export type Hueco = {
  id: string;
  muro: string;
  tipo: TipoHueco;
  pos: number;
  ancho: number;
  alto: number;
  base: number;
};

// ppm: pixeles de la imagen por cada metro real
export type Fondo = {
  src: string;
  w: number;
  h: number;
  ppm: number;
  opacidad: number;
  calibrado: boolean;
};

export type Plano = { muros: Muro[]; huecos: Hueco[]; fondo: Fondo | null };

export const ALTO = 2.6;
export const GROSOR = 0.15;

export const planoVacio = (): Plano => ({ muros: [], huecos: [], fondo: null });

export const nuevoId = () => Math.random().toString(36).slice(2, 10);

export const dist = (p: Punto, q: Punto) => Math.hypot(p.x - q.x, p.y - q.y);

export const largo = (m: Muro) => dist(m.a, m.b);

// Proyecta p sobre el segmento ab. t queda limitado a [0, 1].
export function proyectar(p: Punto, a: Punto, b: Punto) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  const punto = { x: a.x + dx * t, y: a.y + dy * t };
  return { t, punto, d: dist(p, punto) };
}

export function nuevoHueco(tipo: TipoHueco, muro: string, pos: number): Hueco {
  return tipo === 'puerta'
    ? { id: nuevoId(), muro, tipo, pos, ancho: 0.9, alto: 2.1, base: 0 }
    : { id: nuevoId(), muro, tipo, pos, ancho: 1.2, alto: 1.2, base: 0.9 };
}

// Mantiene el hueco completo dentro del muro.
export function limitarPos(pos: number, ancho: number, L: number) {
  if (L <= ancho) return 0.5;
  const margen = ancho / 2 / L;
  return Math.max(margen, Math.min(1 - margen, pos));
}

export function tramoHueco(h: Hueco, m: Muro) {
  const L = largo(m) || 1;
  const dir = { x: (m.b.x - m.a.x) / L, y: (m.b.y - m.a.y) / L };
  const c = { x: m.a.x + (m.b.x - m.a.x) * h.pos, y: m.a.y + (m.b.y - m.a.y) * h.pos };
  const mitad = Math.min(h.ancho, L) / 2;
  return {
    c,
    dir,
    normal: { x: -dir.y, y: dir.x },
    p0: { x: c.x - dir.x * mitad, y: c.y - dir.y * mitad },
    p1: { x: c.x + dir.x * mitad, y: c.y + dir.y * mitad },
  };
}

// Multiplica todas las coordenadas por f (se usa al calibrar la escala).
export function escalar(plano: Plano, f: number): Plano {
  return {
    muros: plano.muros.map((m) => ({
      ...m,
      a: { x: m.a.x * f, y: m.a.y * f },
      b: { x: m.b.x * f, y: m.b.y * f },
    })),
    huecos: plano.huecos,
    fondo: plano.fondo ? { ...plano.fondo, ppm: plano.fondo.ppm / f, calibrado: true } : null,
  };
}

export function limites(plano: Plano) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const ver = (x: number, y: number) => {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  };
  for (const m of plano.muros) { ver(m.a.x, m.a.y); ver(m.b.x, m.b.y); }
  if (plano.fondo) { ver(0, 0); ver(plano.fondo.w / plano.fondo.ppm, plano.fondo.h / plano.fondo.ppm); }
  if (x0 === Infinity) return { x0: 0, y0: 0, x1: 10, y1: 8 };
  return { x0, y0, x1, y1 };
}

// Limpieza de trazos automaticos (IA o DXF): endereza muros casi rectos,
// alinea coordenadas cercanas a un mismo eje y une extremos proximos.
export function ordenar(muros: Muro[], tol: number, enderezar = true): Muro[] {
  let ms = muros.map((m) => ({ ...m, a: { ...m.a }, b: { ...m.b } }));

  for (const m of enderezar ? ms : []) {
    const dx = Math.abs(m.b.x - m.a.x);
    const dy = Math.abs(m.b.y - m.a.y);
    if (dx < dy * 0.07) m.a.x = m.b.x = (m.a.x + m.b.x) / 2;
    else if (dy < dx * 0.07) m.a.y = m.b.y = (m.a.y + m.b.y) / 2;
  }

  // Agrupa valores cercanos de cada eje y los lleva al promedio del grupo.
  const alinear = (eje: 'x' | 'y') => {
    const pts = ms.flatMap((m) => [m.a, m.b]).sort((p, q) => p[eje] - q[eje]);
    let grupo: Punto[] = [];
    const cerrar = () => {
      const media = grupo.reduce((s, p) => s + p[eje], 0) / grupo.length;
      for (const p of grupo) p[eje] = media;
    };
    for (const p of pts) {
      if (grupo.length && p[eje] - grupo[0][eje] > tol) { cerrar(); grupo = []; }
      grupo.push(p);
    }
    if (grupo.length) cerrar();
  };
  if (enderezar) {
    alinear('x');
    alinear('y');
  }

  // Une extremos que quedaron a menos de la tolerancia.
  const nodos: Punto[] = [];
  const nodo = (p: Punto) => {
    const n = nodos.find((q) => dist(p, q) < tol);
    if (n) return { ...n };
    nodos.push({ ...p });
    return p;
  };
  for (const m of ms) { m.a = nodo(m.a); m.b = nodo(m.b); }

  // Lleva los extremos sueltos hasta el muro vecino (uniones en T).
  for (const m of ms) {
    for (const k of ['a', 'b'] as const) {
      for (const otro of ms) {
        if (otro === m) continue;
        const pr = proyectar(m[k], otro.a, otro.b);
        if (pr.d > 1e-6 && pr.d < tol) { m[k] = pr.punto; break; }
      }
    }
  }

  ms = ms.filter((m) => largo(m) > 0.05);
  return ms;
}

export const planoEjemplo = (): Plano => {
  const m = (x1: number, y1: number, x2: number, y2: number, grosor = GROSOR): Muro => ({
    id: nuevoId(), a: { x: x1, y: y1 }, b: { x: x2, y: y2 }, grosor, alto: ALTO,
  });
  const muros = [
    m(0, 0, 9, 0, 0.2), m(9, 0, 9, 7, 0.2), m(9, 7, 0, 7, 0.2), m(0, 7, 0, 0, 0.2),
    m(5, 0, 5, 4), m(5, 4, 9, 4), m(0, 4, 3, 4), m(3, 4, 3, 7),
  ];
  const h = (i: number, tipo: TipoHueco, pos: number, ancho?: number): Hueco => {
    const base = nuevoHueco(tipo, muros[i].id, pos);
    return ancho ? { ...base, ancho } : base;
  };
  return {
    muros,
    huecos: [
      h(2, 'puerta', 0.5, 1), h(0, 'ventana', 0.28, 1.8), h(0, 'ventana', 0.78, 1.4),
      h(1, 'ventana', 0.8), h(3, 'ventana', 0.75), h(4, 'puerta', 0.75),
      h(5, 'puerta', 0.3), h(6, 'puerta', 0.5), h(3, 'ventana', 0.22, 0.8),
    ],
    fondo: null,
  };
};
