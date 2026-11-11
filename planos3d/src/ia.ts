import { claveDeTexto } from './cedula';
import {
  ALTO, Fondo, GROSOR, Hueco, Local, Muro, Plano, cedulaVacia, largo, limitarPos, nuevoHueco, nuevoId, ordenar, proyectar,
} from './modelo';

type Lectura = {
  muros: { x1: number; y1: number; x2: number; y2: number; grosor: number }[];
  huecos: { tipo: 'puerta' | 'ventana'; x: number; y: number; ancho: number }[];
  escala: { x1: number; y1: number; x2: number; y2: number; metros: number } | null;
  locales?: { nombre: string; x: number; y: number }[];
  notas: string;
};

export async function iaDisponible() {
  try {
    const r = await fetch('/api/estado');
    return r.ok && Boolean((await r.json()).ia);
  } catch {
    return false;
  }
}

// La imagen se manda sobre un lienzo cuadrado para que las coordenadas
// 0-1000 que devuelve el modelo midan lo mismo en ambos ejes.
async function imagenCuadrada(fondo: Fondo) {
  const img = new Image();
  await new Promise((ok, mal) => {
    img.onload = ok;
    img.onerror = mal;
    img.src = fondo.src;
  });
  const lado = Math.max(fondo.w, fondo.h);
  const f = Math.min(1, 2000 / lado);
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = Math.round(lado * f);
  const ctx = lienzo.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.drawImage(img, 0, 0, fondo.w * f, fondo.h * f);
  return lienzo.toDataURL('image/jpeg', 0.92);
}

// Pasa la lectura del modelo (0-1000 sobre el lado mayor) a un plano en metros.
export function aplicarLectura(lectura: Lectura, fondo: Fondo): Plano {
  const lado = Math.max(fondo.w, fondo.h);
  let ppm = fondo.ppm;
  let calibrado = fondo.calibrado;
  const e = lectura.escala;
  if (e && e.metros > 0 && !fondo.calibrado) {
    const px = (Math.hypot(e.x2 - e.x1, e.y2 - e.y1) / 1000) * lado;
    if (px > 10) {
      ppm = px / e.metros;
      calibrado = true;
    }
  }
  const m = (v: number) => ((v / 1000) * lado) / ppm;

  const muros: Muro[] = ordenar(
    lectura.muros.map((w) => ({
      id: nuevoId(),
      a: { x: m(w.x1), y: m(w.y1) },
      b: { x: m(w.x2), y: m(w.y2) },
      grosor: Math.min(0.5, Math.max(0.08, Math.round(m(w.grosor) * 100) / 100 || GROSOR)),
      alto: ALTO,
    })),
    0.12,
  );

  const huecos: Hueco[] = [];
  for (const h of lectura.huecos) {
    const p = { x: m(h.x), y: m(h.y) };
    let mejor: Muro | null = null, t = 0, d = 0.6;
    for (const w of muros) {
      const pr = proyectar(p, w.a, w.b);
      if (pr.d < d) { mejor = w; t = pr.t; d = pr.d; }
    }
    if (!mejor) continue;
    const base = nuevoHueco(h.tipo, mejor.id, t);
    const ancho = Math.min(Math.max(m(h.ancho) || base.ancho, 0.5), Math.max(0.5, largo(mejor) - 0.1));
    huecos.push({ ...base, ancho: Math.round(ancho * 100) / 100, pos: limitarPos(t, ancho, largo(mejor)) });
  }

  // Los rotulos de cada local se guardan para armar la cedula.
  const locales: Local[] = (lectura.locales ?? []).map((l) => ({
    id: nuevoId(), clave: claveDeTexto(l.nombre), nivel: 'PB' as const, punto: { x: m(l.x), y: m(l.y) },
  })).filter((l) => l.clave);

  return { muros, huecos, fondo: { ...fondo, ppm, calibrado }, locales, calco: [], cedula: cedulaVacia() };
}

export async function analizarPlano(fondo: Fondo): Promise<{ plano: Plano; notas: string; conEscala: boolean }> {
  const r = await fetch('/api/analizar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagen: await imagenCuadrada(fondo) }),
  }).catch(() => null);
  if (!r) throw new Error('No hay conexion con el servidor de analisis.');
  const datos = await r.json().catch(() => null);
  if (!r.ok || !datos) throw new Error(datos?.error ?? `El servidor respondio con error ${r.status}.`);
  const plano = aplicarLectura(datos as Lectura, fondo);
  return { plano, notas: datos.notas ?? '', conEscala: Boolean(plano.fondo?.calibrado) };
}
