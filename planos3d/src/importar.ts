import DxfParser from 'dxf-parser';
import { ALTO, Fondo, GROSOR, Muro, Plano, Punto, dist, nuevoId, ordenar } from './modelo';

const LADO = 2400; // tamano maximo del lado mayor de la imagen de fondo

function cargarImagen(src: string) {
  return new Promise<HTMLImageElement>((ok, mal) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => mal(new Error('No se pudo leer la imagen.'));
    img.src = src;
  });
}

function comoFondo(lienzo: HTMLCanvasElement): Fondo {
  // Sin escala conocida se supone que el plano mide 15 m en su lado mayor.
  const ppm = Math.max(lienzo.width, lienzo.height) / 15;
  return {
    src: lienzo.toDataURL('image/jpeg', 0.9),
    w: lienzo.width,
    h: lienzo.height,
    ppm,
    opacidad: 0.6,
    calibrado: false,
  };
}

export async function leerImagen(archivo: File): Promise<Fondo> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await cargarImagen(url);
    const f = Math.min(1, LADO / Math.max(img.naturalWidth, img.naturalHeight));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(img.naturalWidth * f);
    lienzo.height = Math.round(img.naturalHeight * f);
    const ctx = lienzo.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
    return comoFondo(lienzo);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function leerPdf(archivo: File): Promise<{ fondo: Fondo; paginas: number }> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await archivo.arrayBuffer() }).promise;
  const pagina = await doc.getPage(1);
  const base = pagina.getViewport({ scale: 1 });
  const viewport = pagina.getViewport({ scale: LADO / Math.max(base.width, base.height) });
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(viewport.width);
  lienzo.height = Math.round(viewport.height);
  const ctx = lienzo.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  await pagina.render({ canvas: lienzo, canvasContext: ctx, viewport } as never).promise;
  return { fondo: comoFondo(lienzo), paginas: doc.numPages };
}

type Seg = { a: Punto; b: Punto; capa: string };

const UNIDADES: Record<number, number> = { 1: 0.0254, 2: 0.3048, 4: 0.001, 5: 0.01, 6: 1 };

// Convierte un DXF en muros. Las paredes dibujadas con doble linea se
// funden en un solo muro con el grosor que las separa.
export function leerDxf(texto: string): { muros: Muro[]; nota: string } {
  let dxf: any;
  try {
    dxf = new DxfParser().parseSync(texto);
  } catch {
    throw new Error('El archivo DXF no se pudo interpretar.');
  }
  let segs: Seg[] = [];
  for (const e of dxf?.entities ?? []) {
    const v: Punto[] = e.vertices ?? [];
    if (e.type === 'LINE' && v.length >= 2) segs.push({ a: v[0], b: v[1], capa: e.layer ?? '' });
    if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && v.length >= 2) {
      for (let i = 0; i + 1 < v.length; i++) segs.push({ a: v[i], b: v[i + 1], capa: e.layer ?? '' });
      if (e.shape) segs.push({ a: v[v.length - 1], b: v[0], capa: e.layer ?? '' });
    }
  }
  if (!segs.length) throw new Error('El DXF no contiene lineas ni polilineas en el espacio modelo.');

  const notas: string[] = [];
  const deMuros = segs.filter((s) => /mur|wall|pared|tabique/i.test(s.capa));
  if (deMuros.length >= 3) {
    segs = deMuros;
    notas.push('se usaron solo las capas de muros');
  }
  if (segs.length > 6000) {
    throw new Error('El DXF tiene demasiadas lineas. Exporta solo la capa de muros e intenta de nuevo.');
  }

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of segs) for (const p of [s.a, s.b]) {
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  const tam = Math.max(x1 - x0, y1 - y0);
  let u = UNIDADES[dxf.header?.$INSUNITS as number];
  if (!u || tam * u < 2 || tam * u > 500) u = tam > 2000 ? 0.001 : tam > 200 ? 0.01 : 1;
  notas.push(`unidades: ${u === 0.001 ? 'mm' : u === 0.01 ? 'cm' : u === 1 ? 'm' : u === 0.0254 ? 'pulgadas' : 'pies'}`);

  // A metros, con el eje Y hacia abajo y el origen en la esquina superior izquierda.
  const pt = (p: Punto) => ({ x: (p.x - x0) * u, y: (y1 - p.y) * u });
  const lineas = segs.map((s) => ({ a: pt(s.a), b: pt(s.b) })).filter((s) => dist(s.a, s.b) > 0.03);

  // Empareja lineas paralelas cercanas (las dos caras de un muro). Se parte de
  // las mas largas porque la cara opuesta suele venir cortada en varios tramos.
  lineas.sort((p, q) => dist(q.a, q.b) - dist(p.a, p.b));
  const usado = new Array(lineas.length).fill(false);
  const muros: Muro[] = [];
  let pares = 0;
  for (let i = 0; i < lineas.length; i++) {
    if (usado[i]) continue;
    const s = lineas[i];
    const L = dist(s.a, s.b);
    const d = { x: (s.b.x - s.a.x) / L, y: (s.b.y - s.a.y) / L };
    const cand: { j: number; sep: number; t0: number; t1: number; traslape: number }[] = [];
    for (let j = i + 1; j < lineas.length; j++) {
      if (usado[j]) continue;
      const o = lineas[j];
      const Lo = dist(o.a, o.b);
      const cruz = (d.x * (o.b.y - o.a.y) - d.y * (o.b.x - o.a.x)) / Lo;
      if (Math.abs(cruz) > 0.02) continue;
      const sep = (o.a.x - s.a.x) * -d.y + (o.a.y - s.a.y) * d.x;
      if (Math.abs(sep) < 0.04 || Math.abs(sep) > 0.45) continue;
      const ta = (o.a.x - s.a.x) * d.x + (o.a.y - s.a.y) * d.y;
      const tb = (o.b.x - s.a.x) * d.x + (o.b.y - s.a.y) * d.y;
      const t0 = Math.min(ta, tb), t1 = Math.max(ta, tb);
      const traslape = Math.min(L, t1) - Math.max(0, t0);
      if (traslape < 0.2 || traslape < Lo * 0.6) continue;
      cand.push({ j, sep, t0, t1, traslape });
    }
    if (!cand.length) continue;
    // La cara opuesta es el grupo de tramos a una misma separacion con mas traslape.
    let grupo: typeof cand = [], total = 0;
    for (const c of cand) {
      const g = cand.filter((o) => Math.abs(o.sep - c.sep) < 0.03);
      const suma = g.reduce((n, o) => n + o.traslape, 0);
      if (suma > total) { grupo = g; total = suma; }
    }
    if (total < Math.min(0.3, L * 0.5)) continue;
    usado[i] = true;
    for (const c of grupo) usado[c.j] = true;
    pares++;
    const sep = grupo.reduce((n, o) => n + o.sep, 0) / grupo.length;
    const ini = Math.min(...grupo.map((o) => o.t0)) / 2;
    const fin = (L + Math.max(...grupo.map((o) => o.t1))) / 2;
    const ox = (-d.y * sep) / 2, oy = (d.x * sep) / 2;
    muros.push({
      id: nuevoId(),
      a: { x: s.a.x + d.x * ini + ox, y: s.a.y + d.y * ini + oy },
      b: { x: s.a.x + d.x * fin + ox, y: s.a.y + d.y * fin + oy },
      grosor: Math.round(Math.abs(sep) * 100) / 100,
      alto: ALTO,
    });
  }
  // Las lineas sin pareja se toman como ejes de muro; si hubo parejas,
  // los trazos cortos sobrantes son remates y se descartan.
  lineas.forEach((s, i) => {
    if (usado[i]) return;
    if (pares > 0 && dist(s.a, s.b) < 0.5) return;
    muros.push({ id: nuevoId(), a: s.a, b: s.b, grosor: GROSOR, alto: ALTO });
  });
  if (pares) notas.push(`${pares} muros de doble linea unidos`);

  return { muros: ordenar(muros, pares ? 0.22 : 0.05, false), nota: notas.join(', ') };
}

export function leerProyecto(texto: string): Plano {
  const datos = JSON.parse(texto);
  const plano = datos?.plano ?? datos;
  if (!Array.isArray(plano?.muros) || !Array.isArray(plano?.huecos)) {
    throw new Error('El archivo no es un proyecto de Planos 3D.');
  }
  return { muros: plano.muros, huecos: plano.huecos, fondo: plano.fondo ?? null };
}
