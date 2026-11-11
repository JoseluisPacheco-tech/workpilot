import DxfParser from 'dxf-parser';
import { CATALOGO, capacidadDeTexto, claveDeTexto } from './cedula';
import {
  ALTO, Fondo, GROSOR, Local, Muro, Nivel, Plano, Punto, areaPoligono, cedulaVacia, centroide, dentroDe, dist, nuevoId, ordenar,
} from './modelo';

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

// Contenido de un archivo CAD antes de decidir que capa es cada cosa.
// Coordenadas originales del archivo (eje Y hacia arriba).
export type Dibujo = {
  segs: Seg[];
  polis: { pts: Punto[]; capa: string }[]; // polilineas cerradas
  textos: { p: Punto; t: string }[];
  capas: { nombre: string; lineas: number; cerradas: number }[];
  unidad: number; // metros por unidad de dibujo
};

export type Opciones = { muros: string[]; areas: string; calco: boolean };

// Convierte segmentos (ya en metros) en muros. Las paredes dibujadas con doble
// linea se funden en un solo muro con el grosor que las separa.
function murosDeLineas(lineas: { a: Punto; b: Punto }[]): { muros: Muro[]; pares: number } {
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

  return { muros: ordenar(muros, pares ? 0.22 : 0.05, false), pares };
}

function resumirCapas(d: Pick<Dibujo, 'segs' | 'polis'>) {
  const m = new Map<string, { nombre: string; lineas: number; cerradas: number }>();
  const de = (n: string) => m.get(n) ?? m.set(n, { nombre: n, lineas: 0, cerradas: 0 }).get(n)!;
  for (const s of d.segs) de(s.capa).lineas++;
  for (const p of d.polis) de(p.capa).cerradas++;
  return [...m.values()].sort((a, b) => b.lineas - a.lineas);
}

function unidadDe(insunits: unknown, segs: Seg[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of segs) for (const p of [s.a, s.b]) {
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  const tam = Math.max(x1 - x0, y1 - y0);
  const u = UNIDADES[insunits as number];
  if (u && tam * u >= 2 && tam * u <= 800) return u;
  return tam > 5000 ? 0.001 : tam > 800 ? 0.01 : 1;
}

// Un tramo curvo de polilinea (bulge) como varios puntos intermedios.
function arco(p: Punto, q: Punto, bulge: number): Punto[] {
  const ang = 4 * Math.atan(bulge);
  const cuerda = Math.hypot(q.x - p.x, q.y - p.y);
  if (!bulge || cuerda < 1e-9) return [];
  const r = cuerda / (2 * Math.sin(ang / 2));
  const medio = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  const h = r * Math.cos(ang / 2);
  const c = { x: medio.x - ((q.y - p.y) / cuerda) * h, y: medio.y + ((q.x - p.x) / cuerda) * h };
  const a0 = Math.atan2(p.y - c.y, p.x - c.x);
  const n = Math.max(2, Math.ceil(Math.abs(ang) / 0.2));
  const pts: Punto[] = [];
  for (let i = 1; i < n; i++) {
    const a = a0 + (ang * i) / n;
    pts.push({ x: c.x + Math.abs(r) * Math.cos(a), y: c.y + Math.abs(r) * Math.sin(a) });
  }
  return pts;
}

const limpiarTexto = (t: unknown): string => {
  const crudo = typeof t === 'object' && t ? (t as { text?: string }).text ?? '' : String(t ?? '');
  return crudo.replace(/\\P/g, ' ').replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
};

// Reune lineas, polilineas y textos de las entidades de un DXF o DWG ya leido.
function reunir(entidades: any[], insunits: unknown): Dibujo {
  const segs: Seg[] = [];
  const polis: Dibujo['polis'] = [];
  const textos: Dibujo['textos'] = [];
  for (const e of entidades) {
    const capa: string = e.layer ?? '';
    if (e.type === 'LINE') {
      const a = e.startPoint ?? e.vertices?.[0], b = e.endPoint ?? e.vertices?.[1];
      if (a && b) segs.push({ a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, capa });
    } else if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
      const v: (Punto & { bulge?: number })[] = e.vertices ?? [];
      if (v.length < 2) continue;
      // dxf-parser marca las cerradas con shape; libredwg con el bit 512 de flag.
      const cerrada = Boolean(e.shape) || ((e.flag ?? 0) & 513) !== 0;
      const pts: Punto[] = [];
      const n = cerrada ? v.length : v.length - 1;
      for (let i = 0; i < n; i++) {
        const p = v[i], q = v[(i + 1) % v.length];
        pts.push({ x: p.x, y: p.y }, ...arco(p, q, p.bulge ?? 0));
      }
      if (!cerrada) pts.push({ x: v[v.length - 1].x, y: v[v.length - 1].y });
      for (let i = 0; i + 1 < pts.length; i++) segs.push({ a: pts[i], b: pts[i + 1], capa });
      if (cerrada && pts.length >= 3) {
        segs.push({ a: pts[pts.length - 1], b: pts[0], capa });
        polis.push({ pts, capa });
      }
    } else if (e.type === 'TEXT' || e.type === 'MTEXT') {
      const p = e.insertionPoint ?? e.startPoint ?? e.position;
      const t = limpiarTexto(e.text);
      if (p && t) textos.push({ p: { x: p.x, y: p.y }, t });
    }
  }
  const d = { segs, polis, textos };
  return { ...d, capas: resumirCapas(d), unidad: unidadDe(insunits, segs) };
}

export function leerDxf(texto: string): Dibujo {
  let dxf: any;
  try {
    dxf = new DxfParser().parseSync(texto);
  } catch {
    throw new Error('El archivo DXF no se pudo interpretar.');
  }
  const d = reunir(dxf?.entities ?? [], dxf?.header?.$INSUNITS);
  if (!d.segs.length) throw new Error('El DXF no contiene lineas ni polilineas en el espacio modelo.');
  return d;
}

export async function leerDwg(archivo: File): Promise<Dibujo> {
  const { Dwg_File_Type, LibreDwg } = await import('@mlightcad/libredwg-web');
  const lib = await LibreDwg.create(import.meta.env.BASE_URL + 'dwg');
  const datos = lib.dwg_read_data(await archivo.arrayBuffer(), Dwg_File_Type.DWG);
  if (!datos) throw new Error('El archivo DWG no se pudo interpretar. Prueba guardarlo como DXF.');
  const db = lib.convert(datos);
  lib.dwg_free(datos);
  const d = reunir(db.entities as any[], (db.header as any)?.INSUNITS);
  if (!d.segs.length) throw new Error('El DWG no contiene lineas ni polilineas en el espacio modelo.');
  return d;
}

// Capas que se proponen por su nombre.
export function sugerir(d: Dibujo): Opciones {
  const muros = d.capas.filter((c) => /mur|wall|pared|tabique/i.test(c.nombre) && c.lineas >= 3).map((c) => c.nombre);
  const areas = d.capas.find((c) => /pol[ií]gon|area|superf/i.test(c.nombre) && c.cerradas >= 2)?.nombre ?? '';
  return { muros, areas, calco: true };
}

// Arma el plano con las capas elegidas: muros, poligonos de area util y calco.
export function armar(d: Dibujo, op: Opciones): { plano: Plano; nota: string } {
  const u = d.unidad;
  const deMuros = d.segs.filter((s) => op.muros.includes(s.capa));
  const deAreas = d.polis.filter((p) => p.capa === op.areas && Math.abs(areaPoligono(p.pts)) * u * u > 0.3);
  if (deMuros.length > 9000) {
    throw new Error('Las capas de muros elegidas tienen demasiadas lineas. Elige solo la capa de muros.');
  }
  // El encuadre lo dan los muros y las areas elegidas; sin ellos, todo el dibujo.
  // Con capa de areas el encuadre son las plantas (deja fuera cortes y fachadas).
  let base = deAreas.flatMap((p) => p.pts);
  if (!base.length) base = deMuros.flatMap((s) => [s.a, s.b]);
  if (!base.length) base = d.segs.flatMap((s) => [s.a, s.b]);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of base) {
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  // A metros, con el eje Y hacia abajo y el origen en la esquina superior izquierda.
  const pt = (p: Punto) => ({ x: (p.x - x0) * u, y: (y1 - p.y) * u });
  const notas: string[] = [`unidades: ${u === 0.001 ? 'mm' : u === 0.01 ? 'cm' : u === 1 ? 'm' : u === 0.0254 ? 'pulgadas' : 'pies'}`];

  const w = (x1 - x0) * u, h = (y1 - y0) * u, margen = 2;
  const fuera = (p: Punto) => p.x < -margen || p.y < -margen || p.x > w + margen || p.y > h + margen;
  const lineas = deMuros.map((s) => ({ a: pt(s.a), b: pt(s.b) }))
    .filter((s) => dist(s.a, s.b) > 0.03 && !fuera(s.a) && !fuera(s.b));
  const { muros, pares } = murosDeLineas(lineas);
  if (muros.length) notas.unshift(`${muros.length} muros${pares ? ` (${pares} de doble linea)` : ''}`);

  // Cada poligono de area toma los rotulos que caen dentro de el y de ningun otro mas chico.
  const polis = deAreas
    .map((p) => ({ pts: p.pts.map(pt), area: Math.abs(areaPoligono(p.pts)) * u * u, rotulos: [] as { p: Punto; t: string }[] }))
    .sort((a, b) => a.area - b.area);
  for (const t of d.textos) {
    const p = pt(t.p);
    polis.find((q) => dentroDe(p, q.pts))?.rotulos.push({ p, t: t.t });
  }
  let locales: Local[] = polis.map((q) => {
    q.rotulos.sort((a, b) => a.p.y - b.p.y || a.p.x - b.p.x);
    const rotulo = q.rotulos.map((r) => r.t).join(' ');
    return {
      id: nuevoId(),
      clave: claveDeTexto(rotulo),
      capacidad: capacidadDeTexto(rotulo),
      nivel: 'PB' as const,
      punto: centroide(q.pts),
      poligono: q.pts,
    };
  });
  // Si un local tiene dos contornos, uno dentro del otro, vale el interior (area util neta).
  locales = locales.filter((l) => !l.clave || !locales.some((o) =>
    o !== l && o.clave === l.clave && dentroDe(o.punto, l.poligono!) &&
    Math.abs(areaPoligono(o.poligono!)) < Math.abs(areaPoligono(l.poligono!))));
  if (locales.length) {
    notas.unshift(`${locales.length} poligonos de area (${locales.filter((l) => l.clave).length} reconocidos por su rotulo)`);
  }

  const calco: number[] = [];
  if (op.calco) {
    for (const s of d.segs) {
      if (op.muros.includes(s.capa) || s.capa === op.areas) continue;
      const a = pt(s.a), b = pt(s.b);
      if (fuera(a) || fuera(b)) continue;
      calco.push(a.x, a.y, b.x, b.y);
      if (calco.length >= 120000) break;
    }
  }

  return {
    plano: { muros, huecos: [], fondo: null, locales, calco: calco.map((v) => Math.round(v * 1000) / 1000), cedula: cedulaVacia() },
    nota: notas.join(', '),
  };
}

export function leerProyecto(texto: string): Plano {
  const datos = JSON.parse(texto);
  const plano = datos?.plano ?? datos;
  if (!Array.isArray(plano?.muros) || !Array.isArray(plano?.huecos)) {
    throw new Error('El archivo no es un proyecto de Planos 3D.');
  }
  return {
    muros: plano.muros,
    huecos: plano.huecos,
    fondo: plano.fondo ?? null,
    locales: plano.locales ?? [],
    calco: plano.calco ?? [],
    cedula: { respuestas: plano.cedula?.respuestas ?? {}, declarado: plano.cedula?.declarado ?? {} },
  };
}

type Declarado = { declarado: Record<string, number>; respuestas: Record<string, string>; niveles: Record<string, Nivel>; ambiente: Record<string, { vent: string; ilum: string }> };

const plano2 = (t: string) => t.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

// Lee una Cedula de Evaluacion del Inmueble en PDF y saca lo declarado en ella:
// areas, capacidades, vanos, niveles y respuestas, para compararlo con el plano.
export async function leerCedula(archivo: File): Promise<Declarado> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await archivo.arrayBuffer() }).promise;

  // Reconstruye los renglones juntando los textos que comparten altura.
  const renglones: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const items = (await (await doc.getPage(n)).getTextContent()).items as { str: string; transform: number[] }[];
    const filas = new Map<number, { x: number; t: string }[]>();
    for (const it of items) {
      if (!it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3);
      const fila = filas.get(y) ?? filas.get(y - 1) ?? filas.get(y + 1) ?? filas.set(y, []).get(y)!;
      fila.push({ x: it.transform[4], t: it.str });
    }
    for (const y of [...filas.keys()].sort((a, b) => b - a)) {
      renglones.push(plano2(filas.get(y)!.sort((a, b) => a.x - b.x).map((i) => i.t).join(' ')));
    }
  }
  if (!renglones.some((r) => r.includes('CEDULA DE EVALUACION'))) {
    throw new Error('El PDF no parece una Cedula de Evaluacion del Inmueble.');
  }

  const r: Declarado = { declarado: {}, respuestas: {}, niveles: {}, ambiente: {} };
  const filasCat = CATALOGO.filter((e) => e.fila).sort((a, b) => b.fila!.length - a.fila!.length);
  const sumVistas = new Set<string>();
  for (const linea of renglones) {
    // Tabla de capacidad: "LACTANTES A (MAX 24) 20"
    const cap = /^(LACTANTES [ABC]|MATERNAL (?:A|B1|B2|C1|C2|CI)) \(MAX \d+\) (\d+)/.exec(linea);
    if (cap) {
      // El formato oficial escribe "MATERNAL CI" por C1.
      const e = filasCat.find((x) => x.fila === cap[1]!.replace('CI', 'C1'));
      if (e) r.declarado['cap:' + e.clave] = Number(cap[2]);
      continue;
    }
    for (const [k, patron] of [['u1', /SALAS DE ATENCION SE ENCUENTRAN SOLO EN PLANTA BAJA\? (SI|NO)/], ['u2', /SALAS DE ATENCION SE ENCUENTRAN EN PLANTA ALTA\? (SI|NO)/], ['u3', /EN PLANTA BAJA Y PLANTA ALTA\? (SI|NO)/]] as const) {
      const m = patron.exec(linea);
      if (m) r.respuestas[k] = m[1];
    }
    const e = filasCat.find((x) => linea.startsWith(x.fila!) && /^ ?(\(\dT\) )?(SI|NO|-)( |$)/.test(linea.slice(x.fila!.length).trimStart()));
    if (!e) continue;
    // La cedula repite el renglon de SUM Lactantes C; vale el que dice SI.
    const resto = linea.slice(e.fila!.length);
    const existe = /^ ?(\(\dT\) )?SI\b/.test(resto.trimStart());
    if (e.seccion === 'sum' && sumVistas.has(e.clave) && !existe) continue;
    sumVistas.add(e.clave);
    const nums = (resto.match(/\d+\.\d{2}/g) ?? []).map(Number);
    if (!existe) continue;
    if (nums.length) r.declarado['area:' + e.clave] = nums[0];
    if (nums.length > 1) r.declarado['vano:' + e.clave] = nums[nums.length - 1];
    if (/PLANTA ALTA|\bPA\b/.test(resto) && !/PLANTA BAJA|\bPB\b/.test(resto)) r.niveles[e.clave] = 'PA';
    else if (/PLANTA BAJA|\bPB\b/.test(resto)) r.niveles[e.clave] = 'PB';
    const amb = resto.match(/NATURAL|MECANICA|ARTIFICIAL|NO TIENE/g) ?? [];
    if (amb.length >= 2) r.ambiente[e.clave] = { vent: amb[0]!, ilum: amb[1]! };
  }
  if (!Object.keys(r.declarado).length) throw new Error('No se pudieron leer los renglones de la cedula.');
  return r;
}
