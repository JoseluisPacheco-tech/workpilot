import { useEffect, useRef, useState } from 'react';
import { Cuarto } from './cuartos';
import {
  Hueco, Muro, Plano, Punto, TipoHueco, dist, escalar, largo, limitarPos, limites, nuevoHueco, nuevoId,
  proyectar, tramoHueco,
} from './modelo';

export type Herramienta = 'sel' | 'muro' | 'puerta' | 'ventana' | 'escala';
export type Seleccion = { tipo: 'muro' | 'hueco'; id: string } | null;

type Props = {
  plano: Plano;
  cuartos: Cuarto[];
  herramienta: Herramienta;
  sel: Seleccion;
  setSel: (s: Seleccion) => void;
  cambiar: (p: Plano) => void;
  marcar: () => void;
  reemplazar: (p: Plano) => void;
  grosor: number;
  alto: number;
  encuadre: number;
};

type Arrastre =
  | { tipo: 'vista'; sx: number; sy: number; cx: number; cy: number }
  | { tipo: 'vertice'; refs: { id: string; k: 'a' | 'b' }[]; ancla: Punto | null; marcado: boolean }
  | { tipo: 'hueco'; id: string; marcado: boolean };

const C = { muro: '#c9d1e0', sel: '#5b8af5', puerta: '#e0a868', ventana: '#6cc5ff', guia: '#34c97b', fondo: '#12151c' };

export default function Editor(props: Props) {
  const { plano, cuartos, herramienta, sel, setSel, cambiar, marcar, reemplazar } = props;
  const svg = useRef<SVGSVGElement>(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const [vista, setVista] = useState({ cx: 5, cy: 4, zoom: 60 });
  const [cursor, setCursor] = useState<{ p: Punto; iman: boolean } | null>(null);
  const [inicio, setInicio] = useState<Punto | null>(null);
  const [medida, setMedida] = useState<Punto[]>([]);
  const [real, setReal] = useState('');
  const arrastre = useRef<Arrastre | null>(null);
  const vistaRef = useRef(vista);
  vistaRef.current = vista;

  const px = (n: number) => n / vista.zoom; // pixeles de pantalla a metros

  useEffect(() => {
    const el = svg.current!;
    const obs = new ResizeObserver(() => setTam({ w: el.clientWidth, h: el.clientHeight }));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Encuadra todo el plano cuando se pide o cuando cambia el tamano inicial.
  useEffect(() => {
    if (!tam.w || !tam.h) return;
    const l = limites(plano);
    const w = Math.max(l.x1 - l.x0, 1), h = Math.max(l.y1 - l.y0, 1);
    setVista({
      cx: (l.x0 + l.x1) / 2,
      cy: (l.y0 + l.y1) / 2,
      zoom: Math.min((tam.w - 80) / w, (tam.h - 80) / h, 400),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.encuadre, tam.w > 0 && tam.h > 0]);

  // La rueda acerca o aleja alrededor del puntero.
  useEffect(() => {
    const el = svg.current!;
    const rueda = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const v = vistaRef.current;
      const sx = e.clientX - r.left - r.width / 2, sy = e.clientY - r.top - r.height / 2;
      const zoom = Math.max(5, Math.min(1500, v.zoom * Math.exp(-e.deltaY * 0.0015)));
      setVista({ zoom, cx: v.cx + sx / v.zoom - sx / zoom, cy: v.cy + sy / v.zoom - sy / zoom });
    };
    el.addEventListener('wheel', rueda, { passive: false });
    return () => el.removeEventListener('wheel', rueda);
  }, []);

  useEffect(() => {
    setInicio(null);
    setMedida([]);
  }, [herramienta]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'Escape') {
        if (inicio || medida.length) { setInicio(null); setMedida([]); }
        else setSel(null);
      }
      if (e.key === 'Enter') setInicio(null);
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        e.preventDefault();
        if (sel.tipo === 'muro') {
          cambiar({
            ...plano,
            muros: plano.muros.filter((m) => m.id !== sel.id),
            huecos: plano.huecos.filter((h) => h.muro !== sel.id),
          });
        } else cambiar({ ...plano, huecos: plano.huecos.filter((h) => h.id !== sel.id) });
        setSel(null);
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  const aMundo = (e: { clientX: number; clientY: number }): Punto => {
    const r = svg.current!.getBoundingClientRect();
    return {
      x: (e.clientX - r.left - r.width / 2) / vista.zoom + vista.cx,
      y: (e.clientY - r.top - r.height / 2) / vista.zoom + vista.cy,
    };
  };

  // Iman: primero a extremos, luego sobre muros, luego a horizontal/vertical.
  const imantar = (p: Punto, ancla: Punto | null, libre: boolean, omitir: string[] = []) => {
    const muros = plano.muros.filter((m) => !omitir.includes(m.id));
    let mejor: Punto | null = null, d = px(12);
    for (const m of muros) for (const q of [m.a, m.b]) {
      const dq = dist(p, q);
      if (dq < d) { mejor = q; d = dq; }
    }
    if (mejor) return { p: { ...mejor }, iman: true };

    let q = { ...p };
    if (ancla && !libre) {
      const dx = Math.abs(q.x - ancla.x), dy = Math.abs(q.y - ancla.y);
      if (dx < dy * 0.14) q.x = ancla.x;
      else if (dy < dx * 0.14) q.y = ancla.y;
    }
    d = px(9);
    let sobre: Punto | null = null;
    for (const m of muros) {
      const pr = proyectar(q, m.a, m.b);
      if (pr.d < d) { sobre = pr.punto; d = pr.d; }
    }
    if (sobre) return { p: sobre, iman: true };
    return { p: { x: Math.round(q.x * 100) / 100, y: Math.round(q.y * 100) / 100 }, iman: false };
  };

  const muroCerca = (p: Punto, radio: number) => {
    let mejor: { m: Muro; t: number } | null = null, d = Infinity;
    for (const m of plano.muros) {
      const pr = proyectar(p, m.a, m.b);
      if (pr.d - m.grosor / 2 < radio && pr.d < d) { mejor = { m, t: pr.t }; d = pr.d; }
    }
    return mejor;
  };

  const huecoCerca = (p: Punto) => {
    for (const h of plano.huecos) {
      const m = plano.muros.find((w) => w.id === h.muro);
      if (!m) continue;
      const t = tramoHueco(h, m);
      if (proyectar(p, t.p0, t.p1).d < Math.max(px(8), m.grosor / 2)) return h;
    }
    return null;
  };

  const alBajar = (e: React.PointerEvent) => {
    svg.current!.setPointerCapture(e.pointerId);
    const p = aMundo(e);
    const mover = () => {
      arrastre.current = { tipo: 'vista', sx: e.clientX, sy: e.clientY, cx: vista.cx, cy: vista.cy };
    };
    if (e.button !== 0) return mover();

    if (herramienta === 'muro') {
      const q = imantar(p, inicio, e.shiftKey);
      if (!inicio) return setInicio(q.p);
      if (dist(inicio, q.p) < 0.05) return;
      cambiar({
        ...plano,
        muros: [...plano.muros, { id: nuevoId(), a: inicio, b: q.p, grosor: props.grosor, alto: props.alto }],
      });
      // Al cerrar contra un muro existente termina la cadena.
      setInicio(q.iman ? null : q.p);
      return;
    }

    if (herramienta === 'puerta' || herramienta === 'ventana') {
      const cerca = muroCerca(p, px(16));
      if (!cerca) return mover();
      const h = nuevoHueco(herramienta as TipoHueco, cerca.m.id, cerca.t);
      const L = largo(cerca.m);
      h.ancho = Math.min(h.ancho, Math.max(0.4, L - 0.2));
      h.alto = Math.min(h.alto, cerca.m.alto - h.base - 0.1);
      h.pos = limitarPos(h.pos, h.ancho, L);
      cambiar({ ...plano, huecos: [...plano.huecos, h] });
      setSel({ tipo: 'hueco', id: h.id });
      return;
    }

    if (herramienta === 'escala') {
      if (medida.length >= 2) return;
      const q = imantar(p, null, true);
      setMedida([...medida, q.p]);
      setReal('');
      return;
    }

    // Seleccion: extremos, huecos y muros, en ese orden.
    let vertice: Punto | null = null, d = px(10);
    for (const m of plano.muros) for (const q of [m.a, m.b]) {
      if (dist(p, q) < d) { vertice = q; d = dist(p, q); }
    }
    if (vertice) {
      const v = vertice;
      const refs = plano.muros.flatMap((m) =>
        (['a', 'b'] as const).filter((k) => dist(m[k], v) < 0.03).map((k) => ({ id: m.id, k })),
      );
      const yaSel = sel?.tipo === 'muro' && refs.some((r) => r.id === sel.id);
      if (!yaSel) setSel({ tipo: 'muro', id: refs[0].id });
      const propio = plano.muros.find((m) => m.id === refs[0].id)!;
      const ancla = refs.length === 1 ? (refs[0].k === 'a' ? propio.b : propio.a) : null;
      arrastre.current = { tipo: 'vertice', refs, ancla, marcado: false };
      return;
    }
    const h = huecoCerca(p);
    if (h) {
      setSel({ tipo: 'hueco', id: h.id });
      arrastre.current = { tipo: 'hueco', id: h.id, marcado: false };
      return;
    }
    const cerca = muroCerca(p, px(8));
    if (cerca) return setSel({ tipo: 'muro', id: cerca.m.id });
    setSel(null);
    mover();
  };

  const alMover = (e: React.PointerEvent) => {
    const p = aMundo(e);
    const a = arrastre.current;
    if (a?.tipo === 'vista') {
      setVista({ ...vista, cx: a.cx - (e.clientX - a.sx) / vista.zoom, cy: a.cy - (e.clientY - a.sy) / vista.zoom });
      return;
    }
    if (a?.tipo === 'vertice') {
      if (!a.marcado) { marcar(); a.marcado = true; }
      const q = imantar(p, a.ancla, e.shiftKey, a.refs.map((r) => r.id)).p;
      reemplazar({
        ...plano,
        muros: plano.muros.map((m) => {
          const mios = a.refs.filter((r) => r.id === m.id);
          if (!mios.length) return m;
          const n = { ...m };
          for (const r of mios) n[r.k] = q;
          return n;
        }),
      });
      return;
    }
    if (a?.tipo === 'hueco') {
      const h = plano.huecos.find((x) => x.id === a.id);
      const m = h && plano.muros.find((w) => w.id === h.muro);
      if (!h || !m) return;
      if (!a.marcado) { marcar(); a.marcado = true; }
      const pos = limitarPos(proyectar(p, m.a, m.b).t, h.ancho, largo(m));
      reemplazar({ ...plano, huecos: plano.huecos.map((x) => (x.id === h.id ? { ...x, pos } : x)) });
      return;
    }
    if (herramienta === 'muro') setCursor(imantar(p, inicio, e.shiftKey));
    else if (herramienta === 'escala') setCursor(imantar(p, null, true));
    else setCursor({ p, iman: false });
  };

  const alSoltar = (e: React.PointerEvent) => {
    arrastre.current = null;
    svg.current?.releasePointerCapture(e.pointerId);
  };

  const aplicarEscala = () => {
    const valor = parseFloat(real.replace(',', '.'));
    const actual = dist(medida[0], medida[1]);
    if (!(valor > 0) || actual < 1e-6) return;
    const f = valor / actual;
    cambiar(escalar(plano, f));
    setVista({ cx: vista.cx * f, cy: vista.cy * f, zoom: vista.zoom / f });
    setMedida([]);
  };

  const muroDe = (h: Hueco) => plano.muros.find((m) => m.id === h.muro);
  const f = plano.fondo;
  const previo = herramienta === 'puerta' || herramienta === 'ventana' ? cursor && muroCerca(cursor.p, px(16)) : null;

  return (
    <div className="editor">
      <svg
        ref={svg}
        className={'lienzo ' + herramienta}
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerLeave={() => setCursor(null)}
        onDoubleClick={() => setInicio(null)}
        onContextMenu={(e) => { e.preventDefault(); setInicio(null); }}
      >
        <defs>
          <pattern id="malla" width="1" height="1" patternUnits="userSpaceOnUse">
            <path d="M1 0H0V1" fill="none" stroke="#232936" strokeWidth={px(1)} />
          </pattern>
        </defs>
        <g transform={`translate(${tam.w / 2} ${tam.h / 2}) scale(${vista.zoom}) translate(${-vista.cx} ${-vista.cy})`}>
          <rect x={vista.cx - px(tam.w)} y={vista.cy - px(tam.h)} width={px(tam.w) * 2} height={px(tam.h) * 2} fill="url(#malla)" />
          {f && <image href={f.src} x={0} y={0} width={f.w / f.ppm} height={f.h / f.ppm} opacity={f.opacidad} preserveAspectRatio="none" />}

          {cuartos.map((c, i) => (
            <g key={i}>
              <polygon points={c.puntos.map((p) => `${p.x},${p.y}`).join(' ')} fill="#5b8af5" opacity={0.08} />
              {Math.sqrt(c.area) * vista.zoom > 60 && (
                <text x={c.centro.x} y={c.centro.y} fontSize={px(12)} className="rotulo area">
                  {c.area.toFixed(1)} m²
                </text>
              )}
            </g>
          ))}

          {plano.muros.map((m) => (
            <line
              key={m.id} x1={m.a.x} y1={m.a.y} x2={m.b.x} y2={m.b.y}
              stroke={sel?.tipo === 'muro' && sel.id === m.id ? C.sel : C.muro}
              strokeWidth={Math.max(m.grosor, px(2))} strokeLinecap="square" opacity={f ? 0.8 : 1}
            />
          ))}

          {plano.huecos.map((h) => {
            const m = muroDe(h);
            if (!m) return null;
            const t = tramoHueco(h, m);
            const activo = sel?.tipo === 'hueco' && sel.id === h.id;
            const color = activo ? C.sel : h.tipo === 'puerta' ? C.puerta : C.ventana;
            const fin = { x: t.p0.x + t.normal.x * h.ancho, y: t.p0.y + t.normal.y * h.ancho };
            return (
              <g key={h.id}>
                <line x1={t.p0.x} y1={t.p0.y} x2={t.p1.x} y2={t.p1.y} stroke={C.fondo} strokeWidth={m.grosor + px(1.5)} />
                {h.tipo === 'ventana' ? (
                  <line x1={t.p0.x} y1={t.p0.y} x2={t.p1.x} y2={t.p1.y} stroke={color} strokeWidth={Math.max(m.grosor * 0.35, px(2.5))} />
                ) : (
                  <path
                    d={`M${t.p0.x} ${t.p0.y}L${fin.x} ${fin.y}A${h.ancho} ${h.ancho} 0 0 0 ${t.p1.x} ${t.p1.y}`}
                    fill="none" stroke={color} strokeWidth={px(1.6)}
                  />
                )}
              </g>
            );
          })}

          {plano.muros.map((m) => {
            const L = largo(m);
            if (L * vista.zoom < 55) return null;
            const sep = m.grosor / 2 + px(14);
            const nx = -(m.b.y - m.a.y) / L, ny = (m.b.x - m.a.x) / L;
            return (
              <text
                key={m.id} x={(m.a.x + m.b.x) / 2 + nx * sep} y={(m.a.y + m.b.y) / 2 + ny * sep}
                fontSize={px(10.5)} className="rotulo" stroke={C.fondo} strokeWidth={px(3)} paintOrder="stroke"
              >
                {L.toFixed(2)}
              </text>
            );
          })}

          {sel?.tipo === 'muro' && plano.muros.filter((m) => m.id === sel.id).map((m) =>
            [m.a, m.b].map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={px(6)} fill="#fff" stroke={C.sel} strokeWidth={px(2)} />
            )),
          )}

          {previo && herramienta !== 'sel' && (() => {
            const fantasma = nuevoHueco(herramienta as TipoHueco, previo.m.id, previo.t);
            const t = tramoHueco({ ...fantasma, pos: limitarPos(previo.t, fantasma.ancho, largo(previo.m)) }, previo.m);
            return <line x1={t.p0.x} y1={t.p0.y} x2={t.p1.x} y2={t.p1.y} stroke={C.guia} strokeWidth={previo.m.grosor} opacity={0.8} />;
          })()}

          {herramienta === 'muro' && inicio && cursor && (
            <g>
              <line x1={inicio.x} y1={inicio.y} x2={cursor.p.x} y2={cursor.p.y} stroke={C.guia} strokeWidth={props.grosor} opacity={0.55} />
              <text x={(inicio.x + cursor.p.x) / 2} y={(inicio.y + cursor.p.y) / 2 - px(12)} fontSize={px(12)} className="rotulo guia">
                {dist(inicio, cursor.p).toFixed(2)} m
              </text>
            </g>
          )}
          {(herramienta === 'muro' || herramienta === 'escala') && cursor && (
            <circle cx={cursor.p.x} cy={cursor.p.y} r={px(cursor.iman ? 6 : 3.5)} fill={cursor.iman ? 'none' : C.guia} stroke={C.guia} strokeWidth={px(2)} />
          )}

          {herramienta === 'escala' && medida.length > 0 && (
            <g>
              <line
                x1={medida[0].x} y1={medida[0].y}
                x2={(medida[1] ?? cursor?.p ?? medida[0]).x} y2={(medida[1] ?? cursor?.p ?? medida[0]).y}
                stroke="#f5a623" strokeWidth={px(2)} strokeDasharray={`${px(6)} ${px(4)}`}
              />
              {medida.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={px(4)} fill="#f5a623" />)}
            </g>
          )}
        </g>
      </svg>

      {herramienta === 'escala' && medida.length === 2 && (
        <form className="flotante" onSubmit={(e) => { e.preventDefault(); aplicarEscala(); }}>
          <label>Distancia real entre los dos puntos</label>
          <input autoFocus value={real} onChange={(e) => setReal(e.target.value)} placeholder="ej. 4.50" inputMode="decimal" />
          <span>m</span>
          <button className="primario" type="submit">Aplicar</button>
          <button type="button" onClick={() => setMedida([])}>Cancelar</button>
        </form>
      )}
    </div>
  );
}
